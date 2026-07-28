import { useEffect, useState } from 'react';
import { createSubtask, normalizeSubtasks } from '../utils/subtasks';
import {
  DEFAULT_WORKSPACES,
  WEEK_DAYS,
  formatWorkDays,
  normalizeTaskContext,
} from '../utils/taskMeta';

const DEFAULT_RECURRENCE_LIFETIME_DAYS = 365;

const EMPTY_FORM = {
  title: '',
  quadrant: 'important-urgent',
  context: 'work',
  subtasks: [],
  dueDate: '',
  notes: '',
  duration: 1,
  recurrence: null,
  recurrenceDays: [],
};

function normalizeDraftSeed(seed) {
  if (!seed || typeof seed !== 'object') return null;
  // تجاهل أحداث React إن وصلت بالخطأ
  if (typeof seed.preventDefault === 'function' || seed.nativeEvent) return null;
  return {
    title: typeof seed.title === 'string' ? seed.title.trim() : '',
    dueDate: typeof seed.dueDate === 'string' ? seed.dueDate : '',
    quadrant: typeof seed.quadrant === 'string' ? seed.quadrant : 'important-urgent',
  };
}

export default function TaskModal({
  isOpen,
  task,
  onClose,
  onSave,
  workDays,
  defaultContext = 'work',
  workspaces = DEFAULT_WORKSPACES,
  draftSeed = null,
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  const seed = normalizeDraftSeed(draftSeed);
  const seedKey = seed ? `${seed.title}|${seed.dueDate}|${seed.quadrant}` : '';

  useEffect(() => {
    if (!isOpen) return;

    if (task) {
      setForm({
        title: task.title,
        quadrant: task.quadrant,
        context: normalizeTaskContext(task.context),
        subtasks: normalizeSubtasks(task.subtasks),
        dueDate: task.dueDate || '',
        notes: task.notes || '',
        duration: task.duration || 1,
        recurrence: task.recurrence || null,
        recurrenceDays: task.recurrenceDays || [],
      });
    } else {
      setForm({
        ...EMPTY_FORM,
        context: normalizeTaskContext(defaultContext),
        title: seed?.title || '',
        dueDate: seed?.dueDate || '',
        quadrant: seed?.quadrant || 'important-urgent',
      });
    }
    setNewSubtaskTitle('');
    // seedKey يثبّت الاعتماد بدل كائن draftSeed
  }, [task, isOpen, defaultContext, seedKey]);

  if (!isOpen) return null;

  const toggleDay = (dayId) => {
    setForm((f) => {
      const has = f.recurrenceDays.includes(dayId);
      const recurrenceDays = has
        ? f.recurrenceDays.filter((d) => d !== dayId)
        : [...f.recurrenceDays, dayId].sort();
      return { ...f, recurrenceDays };
    });
  };

  const addSubtask = () => {
    const title = newSubtaskTitle.trim();
    if (!title) return;
    setForm((f) => {
      const current = normalizeSubtasks(f.subtasks);
      return {
        ...f,
        subtasks: [...current, { ...createSubtask(title), sortOrder: current.length }],
      };
    });
    setNewSubtaskTitle('');
  };

  const updateSubtask = (subtaskId, patch) => {
    setForm((f) => ({
      ...f,
      subtasks: normalizeSubtasks(f.subtasks).map((item) =>
        String(item.id) === String(subtaskId) ? { ...item, ...patch } : item
      ),
    }));
  };

  const removeSubtask = (subtaskId) => {
    setForm((f) => ({
      ...f,
      subtasks: normalizeSubtasks(f.subtasks).filter((item) => String(item.id) !== String(subtaskId)),
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const title = form.title.trim();
    if (!title) return;
    const duration = Math.max(1, parseInt(form.duration, 10) || 1);
    onSave(
      {
        ...form,
        title,
        duration,
        context: normalizeTaskContext(form.context),
        subtasks: normalizeSubtasks(form.subtasks),
        recurrence: form.recurrence || null,
        recurrenceDays: form.recurrence === 'weekly' ? form.recurrenceDays : [],
      },
      task?.id ?? null
    );
  };

  const isRecurring = form.recurrence === 'daily' || form.recurrence === 'weekly';
  const spaceOptions = workspaces?.length ? workspaces : DEFAULT_WORKSPACES;

  return (
    <div className="modal-overlay open" role="presentation">
      <div
        className="modal-box card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3 id="task-modal-title">{task ? 'تعديل المهمة' : 'إضافة مهمة جديدة'}</h3>
          <button type="button" className="btn-icon" onClick={onClose} title="إغلاق" aria-label="إغلاق">
            <i className="ph ph-x" style={{ fontSize: 20 }}></i>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label>عنوان المهمة</label>
            <input
              type="text"
              className="form-input"
              required
              autoFocus
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>

          <div className="form-row">
            <div className="form-field" style={{ flex: 1 }}>
              <label>الأولوية</label>
              <select
                className="form-input"
                value={form.quadrant}
                onChange={(e) => setForm({ ...form, quadrant: e.target.value })}
              >
                <option value="important-urgent">مهم ومستعجل</option>
                <option value="important-not-urgent">مهم غير مستعجل</option>
                <option value="not-important-urgent">غير مهم ومستعجل</option>
                <option value="not-important-not-urgent">غير مهم غير مستعجل</option>
              </select>
            </div>
            <div className="form-field" style={{ flex: 1 }}>
              <label>المساحة</label>
              <select
                className="form-input"
                value={form.context}
                onChange={(e) => setForm({ ...form, context: e.target.value })}
              >
                {spaceOptions.map((ctx) => (
                  <option key={ctx.id} value={ctx.id}>
                    {ctx.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-field">
            <label>التكرار</label>
            <div className="recurrence-options">
              {[
                { id: null, label: 'مرة واحدة' },
                { id: 'daily', label: 'يومياً' },
                { id: 'weekly', label: 'أيام محددة أسبوعياً' },
              ].map((opt) => (
                <button
                  key={String(opt.id)}
                  type="button"
                  className={`chip-btn ${(form.recurrence || null) === opt.id ? 'active' : ''}`}
                  onClick={() => {
                    const wasRecurring = form.recurrence === 'daily' || form.recurrence === 'weekly';
                    const willBeRecurring = opt.id === 'daily' || opt.id === 'weekly';
                    const nextDuration =
                      !wasRecurring && willBeRecurring && Number(form.duration) <= 1
                        ? DEFAULT_RECURRENCE_LIFETIME_DAYS
                        : form.duration;
                    setForm({ ...form, recurrence: opt.id, duration: nextDuration });
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {form.recurrence === 'weekly' && (
              <div className="weekday-picks">
                {WEEK_DAYS.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    className={`chip-btn ${form.recurrenceDays.includes(d.id) ? 'active' : ''}`}
                    onClick={() => toggleDay(d.id)}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            )}
            {form.recurrence === 'daily' && (
              <p className="form-hint">
                تظهر يومياً في أيام العمل المحددة من الإعدادات: {formatWorkDays(workDays)}
              </p>
            )}
            {form.recurrence === 'weekly' && (
              <p className="form-hint">
                تظهر فقط في الأيام المحددة، وخلال مدة العمر فقط — لا تكرار بلا نهاية
              </p>
            )}
          </div>

          <div className="form-row">
            <div className="form-field" style={{ flex: 1 }}>
              <label>{isRecurring ? 'تاريخ بداية السلسلة' : 'تاريخ البداية'}</label>
              <input
                type="date"
                className="form-input"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              />
            </div>
            <div className="form-field" style={{ flex: 1 }}>
              <label>{isRecurring ? 'عمر التكرار (أيام)' : 'مدة المشروع (أيام متصلة)'}</label>
              <input
                type="number"
                min="1"
                className="form-input"
                value={form.duration}
                onChange={(e) => setForm({ ...form, duration: e.target.value })}
              />
              <p className="form-hint">
                {isRecurring
                  ? 'مثال: 40 = تنزل في الأيام المحددة لمدة 40 يوماً من البداية ثم تتوقف'
                  : 'أيام متصلة لمشروع واحد'}
              </p>
              {isRecurring && Number(form.duration) <= 1 && (
                <p className="form-hint" style={{ color: 'var(--danger)', fontWeight: 700 }}>
                  تنبيه: بقيمة يوم واحد لن يتكرر فعلياً — ارفع الرقم (مثلاً 365).
                </p>
              )}
            </div>
          </div>

          <div className="form-field">
            <label>ملاحظات</label>
            <textarea
              className="form-input"
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>

          <div className="form-field">
            <label>مهام فرعية / Checklist</label>
            <div className="subtask-editor-list">
              {normalizeSubtasks(form.subtasks).length === 0 ? (
                <div className="subtask-empty-hint">أضف خطوات صغيرة لتوضيح الإنجاز.</div>
              ) : (
                normalizeSubtasks(form.subtasks).map((item) => (
                  <div key={item.id} className="subtask-editor-row">
                    <button
                      type="button"
                      className={`mini-check ${item.completed ? 'checked' : ''}`}
                      onClick={() => updateSubtask(item.id, { completed: !item.completed })}
                      title={item.completed ? 'إلغاء الإنجاز' : 'تحديد كمنجز'}
                    >
                      {item.completed && <i className="ph ph-check"></i>}
                    </button>
                    <input
                      type="text"
                      className="form-input subtask-input"
                      value={item.title}
                      onChange={(e) => updateSubtask(item.id, { title: e.target.value })}
                      placeholder="عنوان المهمة الفرعية"
                    />
                    <button
                      type="button"
                      className="btn-icon danger"
                      onClick={() => removeSubtask(item.id)}
                      title="إزالة من القائمة"
                    >
                      <i className="ph ph-trash"></i>
                    </button>
                  </div>
                ))
              )}
            </div>
            <div className="subtask-add-row">
              <input
                type="text"
                className="form-input"
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addSubtask();
                  }
                }}
                placeholder="مثال: تجهيز العرض"
              />
              <button type="button" className="btn-secondary" onClick={addSubtask}>
                إضافة
              </button>
            </div>
          </div>

          <div className="modal-footer">
            <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
              حفظ
            </button>
            <button type="button" className="btn-secondary" onClick={onClose}>
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
