import { useEffect, useState } from 'react';
import {
  formatTaskSchedule,
  isTaskOverdue,
  isRecurringTask,
  toLocalISO,
  startOfToday,
} from '../utils/dateUtils';
import { getSubtaskStats, normalizeSubtasks } from '../utils/subtasks';
import { getTaskContextMeta } from '../utils/taskMeta';
import {
  isCompletedToday,
  nextCycleStatus,
  normalizeTaskStatus,
} from '../utils/taskStatus';

const QUADRANT_COLORS = {
  'important-urgent': 'var(--danger)',
  'important-not-urgent': 'var(--accent)',
  'not-important-urgent': 'var(--warning)',
  'not-important-not-urgent': 'var(--q4)',
};

function formatSpent(seconds) {
  if (!seconds || seconds <= 0) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}س ${m}د`;
  return `${m}د`;
}

export default function TaskRow({
  task,
  onToggleComplete,
  onSetStatus,
  onToggleSubtask,
  onEdit,
  onDelete,
  onRestore,
  variant = 'default',
  draggable = true,
  workDays,
  workspaces = null,
  exiting = false,
}) {
  const isArchive = variant === 'archive';
  const status = normalizeTaskStatus(task);
  const doneToday = isCompletedToday(task, null, toLocalISO, startOfToday);
  const showAsCompleted =
    status === 'completed' && (!isRecurringTask(task) || doneToday);
  const overdue = !isArchive && status !== 'deferred' && isTaskOverdue(task, { workDays });
  const contextMeta = getTaskContextMeta(task.context, workspaces);
  const subtasks = normalizeSubtasks(task.subtasks);
  const subtaskStats = getSubtaskStats(subtasks);
  const qColor = QUADRANT_COLORS[task.quadrant] || 'var(--accent)';
  const spent = formatSpent(task.timeSpentSeconds);

  const [trackingState, setTrackingState] = useState({ activeTaskId: null, label: '0:00' });

  useEffect(() => {
    const handler = (e) => setTrackingState(e.detail);
    window.addEventListener('time-tracking-state', handler);
    return () => window.removeEventListener('time-tracking-state', handler);
  }, []);

  const isTracking = trackingState.activeTaskId === task.id;

  return (
    <div
      className={`task-row task-row-enter ${showAsCompleted ? 'is-completed' : ''} ${overdue ? 'is-overdue' : ''} ${status === 'deferred' ? 'is-deferred' : ''} ${isArchive ? 'is-archive' : ''} ${exiting ? 'is-exiting' : ''}`}
      style={{ '--q-color': qColor, '--ctx-color': contextMeta.color, '--ctx-bg': contextMeta.bg }}
      draggable={draggable && !isArchive && !exiting && status !== 'deferred'}
      onDragStart={(e) => {
        if (isArchive || exiting) return;
        e.dataTransfer.setData('text/plain', String(task.id));
        e.dataTransfer.effectAllowed = 'move';
        e.currentTarget.classList.add('is-dragging');
      }}
      onDragEnd={(e) => e.currentTarget.classList.remove('is-dragging')}
    >
      {!isArchive ? (
        <button
          type="button"
          className={`task-row-status status-${status}`}
          onClick={(e) => {
            e.stopPropagation();
            if (status === 'deferred' || status === 'cancelled') {
              onSetStatus?.(task.id, 'not_started');
              return;
            }
            const next = nextCycleStatus(status);
            if (onSetStatus) onSetStatus(task.id, next);
            else onToggleComplete?.(task.id);
          }}
          title={
            {
              not_started: 'لم تبدأ — اضغط للبدء',
              in_progress: 'قيد التنفيذ — اضغط للإكمال',
              completed: 'مكتملة — اضغط لإعادة الفتح',
              deferred: 'مؤجلة — اضغط لإعادة التنشيط',
              cancelled: 'ملغاة',
            }[status]
          }
          aria-label="حالة المهمة"
        >
          {showAsCompleted && <i className="ph ph-check" />}
          {status === 'in_progress' && <span className="status-dot" />}
          {status === 'deferred' && <i className="ph ph-clock" />}
        </button>
      ) : (
        <span
          className={`task-row-status status-archived ${status === 'cancelled' ? 'status-cancelled' : ''}`}
          title={status === 'cancelled' ? 'ملغاة ومؤرشفة' : 'مؤرشفة'}
          aria-hidden
        >
          <i className={`ph ${status === 'cancelled' ? 'ph-x' : 'ph-archive'}`} />
        </span>
      )}

      <div
        className="task-row-body"
        onClick={() => onEdit?.(task.id)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onEdit?.(task.id);
        }}
      >
        <div className="task-row-main">
          <span className="task-row-title">{task.title}</span>
          <div className="task-row-chips">
            <span
              className="task-row-chip context"
              title={`المساحة: ${contextMeta.label} (${contextMeta.id})`}
            >
              <i className={`ph ${contextMeta.icon}`} />
              {contextMeta.label}
            </span>
            {status === 'deferred' && (
              <span className="task-row-chip deferred" title="مؤجلة">
                <i className="ph ph-clock-countdown" />
                مؤجلة
              </span>
            )}
            {status === 'cancelled' && isArchive && (
              <span className="task-row-chip cancelled" title="ملغاة">
                <i className="ph ph-x-circle" />
                ملغاة
              </span>
            )}
            {task.externalSource === 'trello' && (
              <span className="task-row-chip source" title="من تريلو">
                <i className="ph ph-kanban" />
              </span>
            )}
            {task.recurrence && (
              <span className="task-row-chip mute" title="متكررة">
                <i className="ph ph-arrows-clockwise" />
              </span>
            )}
            {spent && (
              <span className="task-row-chip mute" title="وقت مصروف">
                <i className="ph ph-hourglass-medium" />
                {spent}
              </span>
            )}
            {subtaskStats.total > 0 && (
              <span className="task-row-chip mute">
                <i className="ph ph-check-square-offset" />
                {subtaskStats.completed}/{subtaskStats.total}
              </span>
            )}
            {isArchive && task.completed && status !== 'cancelled' && (
              <span className="task-row-chip mute">كانت مكتملة</span>
            )}
          </div>
        </div>
        <div className={`task-row-date ${overdue ? 'overdue' : ''}`}>
          <i className="ph ph-calendar-blank" />
          <span>{formatTaskSchedule(task, { workDays })}</span>
          {overdue && <span className="overdue-tag">متأخرة</span>}
        </div>
        {!isArchive && subtaskStats.total > 0 && (
          <div className="task-row-subtasks" onClick={(e) => e.stopPropagation()}>
            {subtasks.slice(0, 3).map((item) => (
              <button
                key={item.id}
                type="button"
                className={`task-row-sub ${item.completed ? 'done' : ''}`}
                onClick={() => onToggleSubtask?.(task.id, item.id)}
              >
                <span className={`mini-check ${item.completed ? 'checked' : ''}`}>
                  {item.completed && <i className="ph ph-check" />}
                </span>
                {item.title}
              </button>
            ))}
            {subtasks.length > 3 && <span className="task-row-more">+{subtasks.length - 3}</span>}
          </div>
        )}
      </div>

      <div className="task-row-actions" onMouseDown={(e) => e.stopPropagation()}>
        {isArchive ? (
          <>
            <button
              type="button"
              className="btn-icon"
              title="استرجاع"
              onClick={(e) => {
                e.stopPropagation();
                onRestore?.(task.id);
              }}
            >
              <i className="ph ph-arrow-counter-clockwise" />
            </button>
            <button
              type="button"
              className="btn-icon"
              title="عرض / تعديل"
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.(task.id);
              }}
            >
              <i className="ph ph-pencil-simple" />
            </button>
          </>
        ) : (
          <>
            {status !== 'deferred' && (
              <button
                type="button"
                className="btn-icon"
                title="تأجيل"
                onClick={(e) => {
                  e.stopPropagation();
                  onSetStatus?.(task.id, 'deferred');
                }}
              >
                <i className="ph ph-clock-countdown" />
              </button>
            )}
            <button
              type="button"
              className="btn-icon danger"
              title="إلغاء → أرشيف"
              onClick={(e) => {
                e.stopPropagation();
                onSetStatus?.(task.id, 'cancelled');
              }}
            >
              <i className="ph ph-x-circle" />
            </button>
            {task.externalUrl && (
              <a
                href={task.externalUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-icon"
                title="فتح في تريلو"
                onClick={(e) => e.stopPropagation()}
              >
                <i className="ph ph-arrow-square-out" />
              </a>
            )}
            <button
              type="button"
              className={`btn-icon ${isTracking ? 'time-tracking-active' : ''}`}
              title={isTracking ? 'إيقاف التتبع' : 'تتبع الوقت'}
              onClick={(e) => {
                e.stopPropagation();
                window.dispatchEvent(
                  new CustomEvent('toggle-time-tracking', {
                    detail: { taskId: task.id, title: task.title },
                  })
                );
              }}
            >
              <i className={`ph ${isTracking ? 'ph-pause-circle' : 'ph-clock-countdown'}`} />
            </button>
            {isTracking && <span className="time-tracking-badge">{trackingState.label}</span>}
            <button
              type="button"
              className="btn-icon"
              title="بومودورو"
              onClick={(e) => {
                e.stopPropagation();
                window.dispatchEvent(
                  new CustomEvent('start-pomodoro-task', {
                    detail: { taskId: task.id, title: task.title, context: task.context },
                  })
                );
              }}
            >
              <i className="ph ph-play-circle" />
            </button>
            <button
              type="button"
              className="btn-icon"
              title="مسودات"
              onClick={(e) => {
                e.stopPropagation();
                window.dispatchEvent(
                  new CustomEvent('open-task-notes', {
                    detail: { taskId: task.id, title: task.title },
                  })
                );
              }}
            >
              <i className="ph ph-note-pencil" />
            </button>
            <button
              type="button"
              className="btn-icon"
              title="تعديل"
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.(task.id);
              }}
            >
              <i className="ph ph-pencil-simple" />
            </button>
            <button
              type="button"
              className="btn-icon danger"
              title="أرشفة"
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.(task.id);
              }}
            >
              <i className="ph ph-archive" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
