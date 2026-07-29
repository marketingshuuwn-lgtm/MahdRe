import { useMemo } from 'react';
import TaskCard from './TaskCard';
import {
  getOccurrenceDates,
  getTaskEndDate,
  getTaskStartDate,
  isTaskOverdue,
  startOfToday,
  toLocalISO,
} from '../utils/dateUtils';

const QUADRANT_RANK = {
  'important-urgent': 0,
  'important-not-urgent': 1,
  'not-important-urgent': 2,
  'not-important-not-urgent': 3,
};

function isActiveOnDay(task, dayDate, workDays) {
  if (!task || task.completed) return false;
  const start = getTaskStartDate(task);
  if (!start) return false;

  const day = new Date(dayDate);
  day.setHours(12, 0, 0, 0);
  const iso = toLocalISO(day);

  if (task.recurrence === 'daily' || task.recurrence === 'weekly') {
    const occ = getOccurrenceDates(task, day, day, { workDays });
    return occ.includes(iso);
  }

  const end = getTaskEndDate(task);
  if (!end) return false;
  return start <= day && day <= end;
}

function rankTask(a, b) {
  const ra = QUADRANT_RANK[a.quadrant] ?? 9;
  const rb = QUADRANT_RANK[b.quadrant] ?? 9;
  if (ra !== rb) return ra - rb;
  return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
}

export default function TodayView({
  tasks,
  onToggleComplete,
  onToggleSubtask,
  onEdit,
  onDelete,
  workDays,
  onGoMatrix,
}) {
  const today = startOfToday();
  const todayISO = toLocalISO(today);

  const { overdue, todayList, completedToday, suggested, pendingCount } = useMemo(() => {
    const active = (tasks || []).filter((t) => !t.archived);
    const overdueList = active.filter((t) => isTaskOverdue(t)).sort(rankTask);
    const onToday = active
      .filter((t) => !t.completed && !isTaskOverdue(t) && isActiveOnDay(t, today, workDays))
      .sort(rankTask);
    const doneToday = active.filter(
      (t) =>
        t.completed &&
        t.completedAt &&
        String(t.completedAt).slice(0, 10) === todayISO
    );
    const suggestedTask = overdueList[0] || onToday[0] || null;
    const pending = active.filter((t) => !t.completed).length;
    return {
      overdue: overdueList,
      todayList: onToday,
      completedToday: doneToday,
      suggested: suggestedTask,
      pendingCount: pending,
    };
  }, [tasks, workDays, today, todayISO]);

  const focusCount = overdue.length + todayList.length;

  return (
    <div className="today-view">
      <div className="page-header today-header">
        <div>
          <div className="page-title">اليوم</div>
          <div className="page-desc">
            تركيز يومي — متأخر + ما يجب إنجازه الآن
          </div>
        </div>
        <div className="today-stats">
          <div className="today-stat">
            <span className="today-stat-num">{focusCount}</span>
            <span className="today-stat-label">للتركيز</span>
          </div>
          <div className="today-stat">
            <span className="today-stat-num">{completedToday.length}</span>
            <span className="today-stat-label">أُنجز اليوم</span>
          </div>
          <div className="today-stat">
            <span className="today-stat-num">{pendingCount}</span>
            <span className="today-stat-label">معلّق إجمالي</span>
          </div>
        </div>
      </div>

      {suggested && (
        <section className="card today-suggested">
          <div className="today-section-label">
            <i className="ph ph-target"></i> مقترح الآن
          </div>
          <TaskCard
            task={suggested}
            onToggleComplete={onToggleComplete}
            onToggleSubtask={onToggleSubtask}
            onEdit={onEdit}
            onDelete={onDelete}
            workDays={workDays}
            draggable={false}
          />
        </section>
      )}

      {!suggested && focusCount === 0 && (
        <section className="card today-empty">
          <i className="ph ph-confetti" style={{ fontSize: 32 }}></i>
          <h3>لا مهام ملحة اليوم</h3>
          <p>يمكنك التخطيط من مصفوفة الأولويات أو إضافة مهمة جديدة.</p>
          {onGoMatrix && (
            <button type="button" className="btn-secondary" onClick={onGoMatrix}>
              <i className="ph ph-squares-four"></i> فتح المصفوفة
            </button>
          )}
        </section>
      )}

      {overdue.length > 0 && (
        <section className="today-section">
          <div className="today-section-label danger">
            <i className="ph ph-warning"></i> متأخرة ({overdue.length})
          </div>
          <div className="today-list">
            {overdue.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onToggleComplete={onToggleComplete}
                onToggleSubtask={onToggleSubtask}
                onEdit={onEdit}
                onDelete={onDelete}
                workDays={workDays}
                draggable={false}
              />
            ))}
          </div>
        </section>
      )}

      {todayList.length > 0 && (
        <section className="today-section">
          <div className="today-section-label">
            <i className="ph ph-sun"></i> مهام اليوم ({todayList.length})
          </div>
          <div className="today-list">
            {todayList.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onToggleComplete={onToggleComplete}
                onToggleSubtask={onToggleSubtask}
                onEdit={onEdit}
                onDelete={onDelete}
                workDays={workDays}
                draggable={false}
              />
            ))}
          </div>
        </section>
      )}

      {completedToday.length > 0 && (
        <section className="today-section">
          <div className="today-section-label muted">
            <i className="ph ph-check-circle"></i> أُنجز اليوم ({completedToday.length})
          </div>
          <div className="today-list today-list-done">
            {completedToday.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onToggleComplete={onToggleComplete}
                onToggleSubtask={onToggleSubtask}
                onEdit={onEdit}
                onDelete={onDelete}
                workDays={workDays}
                draggable={false}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
