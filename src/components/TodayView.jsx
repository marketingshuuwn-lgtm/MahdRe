import { useMemo } from 'react';
import TaskRow from './TaskRow';
import EmptyState from './EmptyState';
import {
  compareTasksBySchedule,
  getOccurrenceDates,
  getTaskStartDate,
  isTaskOverdue,
  startOfToday,
  toLocalISO,
} from '../utils/dateUtils';
import { isEffectivelyOpen } from '../utils/taskStatus';

function hasOccurrenceToday(task, today, workDays) {
  return getOccurrenceDates(task, today, today, { workDays }).length > 0;
}

function isCompletedToday(task, todayIso) {
  if (!task.completed) return false;
  const raw = task.completedAt || task.completed_at;
  if (!raw) return false;
  const date = new Date(raw);
  return !Number.isNaN(date.getTime()) && toLocalISO(date) === todayIso;
}

function sortTasks(tasks, workDays) {
  return [...tasks].sort((a, b) => compareTasksBySchedule(a, b, { workDays }));
}

export default function TodayView({
  tasks,
  onToggleComplete,
  onSetStatus,
  onToggleSubtask,
  onEdit,
  onDelete,
  onAddTask,
  onReschedule,
  onOpenAllTasks,
  workDays,
  workspaces = null,
}) {
  const today = useMemo(() => startOfToday(), []);
  const todayIso = toLocalISO(today);
  const dateLabel = today.toLocaleDateString('ar-EG', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const daily = useMemo(() => {
    const open = tasks.filter((task) => isEffectivelyOpen(task));
    const overdue = sortTasks(
      open.filter((task) => isTaskOverdue(task, { workDays })),
      workDays
    );
    const scheduled = sortTasks(
      open.filter(
        (task) =>
          !isTaskOverdue(task, { workDays }) && hasOccurrenceToday(task, today, workDays)
      ),
      workDays
    );
    const unscheduled = sortTasks(
      open.filter((task) => !getTaskStartDate(task) && !task.recurrence),
      workDays
    );
    const completed = tasks.filter((task) => isCompletedToday(task, todayIso));

    return {
      overdue,
      scheduled,
      unscheduled,
      completed,
      focus: [...overdue, ...scheduled],
    };
  }, [tasks, today, todayIso, workDays]);

  const totalFocus = daily.focus.length;
  const firstTask = daily.focus[0];

  return (
    <div className="today-view">
      <section className="today-hero" aria-labelledby="today-title">
        <div>
          <p className="today-eyebrow">مساحة القرار اليومية</p>
          <h1 id="today-title">ماذا ستنجز اليوم؟</h1>
          <p className="today-date">{dateLabel}</p>
        </div>
        <div className="today-hero-actions">
          {firstTask && (
            <button
              type="button"
              className="btn-primary today-start-btn"
              onClick={() => onSetStatus?.(firstTask.id, 'in_progress')}
            >
              <i className="ph ph-play" aria-hidden="true" />
              ابدأ بالأولى
            </button>
          )}
          <button type="button" className="btn-secondary" onClick={onAddTask}>
            <i className="ph ph-plus" aria-hidden="true" />
            مهمة جديدة
          </button>
        </div>
      </section>

      <section className="today-summary" aria-label="ملخص اليوم">
        <div className={`today-summary-card ${daily.overdue.length ? 'is-danger' : ''}`}>
          <span className="today-summary-value">{daily.overdue.length}</span>
          <span className="today-summary-label">تحتاج انتباهًا</span>
          <span className="today-summary-help">مهام متأخرة</span>
        </div>
        <div className="today-summary-card is-accent">
          <span className="today-summary-value">{daily.scheduled.length}</span>
          <span className="today-summary-label">مجدولة اليوم</span>
          <span className="today-summary-help">العمل الأساسي</span>
        </div>
        <div className="today-summary-card is-success">
          <span className="today-summary-value">{daily.completed.length}</span>
          <span className="today-summary-label">أُنجزت اليوم</span>
          <span className="today-summary-help">تقدمك حتى الآن</span>
        </div>
      </section>

      {totalFocus === 0 ? (
        <section className="today-clear-state">
          <EmptyState
            icon="ph-sparkle"
            title="لا توجد مهام مجدولة عليك اليوم"
            hint={daily.unscheduled.length ? 'لديك مهام بلا موعد. اختر واحدة وحدد لها موعدًا لتظهر في يوم واضح.' : 'أضف أول مهمة أو خطط ليوم آخر من قائمة المهام.'}
            actionLabel={daily.unscheduled.length ? 'عرض المهام بلا موعد' : 'إضافة مهمة'}
            onAction={daily.unscheduled.length ? onOpenAllTasks : onAddTask}
          />
        </section>
      ) : (
        <section className="today-focus-section" aria-labelledby="today-focus-title">
          <div className="today-section-heading">
            <div>
              <p className="today-section-kicker">الخطوة التالية</p>
              <h2 id="today-focus-title">ابدأ من هنا</h2>
            </div>
            <span className="today-focus-count">{totalFocus} مهمة</span>
          </div>
          <div className="today-task-list">
            {daily.focus.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onToggleComplete={onToggleComplete}
                onSetStatus={onSetStatus}
                onToggleSubtask={onToggleSubtask}
                onEdit={onEdit}
                onDelete={onDelete}
                onReschedule={onReschedule}
                draggable={false}
                workDays={workDays}
                workspaces={workspaces}
              />
            ))}
          </div>
        </section>
      )}

      {daily.unscheduled.length > 0 && (
        <section className="today-plan-section" aria-labelledby="today-plan-title">
          <div className="today-section-heading compact">
            <div>
              <p className="today-section-kicker">يحتاج قرارًا</p>
              <h2 id="today-plan-title">مهام بلا موعد</h2>
            </div>
            <button type="button" className="text-button" onClick={onOpenAllTasks}>
              تخطيط الكل
              <i className="ph ph-arrow-left" aria-hidden="true" />
            </button>
          </div>
          <div className="today-task-list today-unscheduled-list">
            {daily.unscheduled.slice(0, 3).map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onToggleComplete={onToggleComplete}
                onSetStatus={onSetStatus}
                onToggleSubtask={onToggleSubtask}
                onEdit={onEdit}
                onDelete={onDelete}
                onReschedule={onReschedule}
                draggable={false}
                workDays={workDays}
                workspaces={workspaces}
              />
            ))}
          </div>
        </section>
      )}

      {totalFocus > 0 && (
        <button type="button" className="today-all-link" onClick={onOpenAllTasks}>
          <i className="ph ph-squares-four" aria-hidden="true" />
          فتح كل المهام والفلاتر
        </button>
      )}
    </div>
  );
}
