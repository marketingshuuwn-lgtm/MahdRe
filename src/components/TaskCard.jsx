import { formatTaskSchedule, isTaskOverdue } from '../utils/dateUtils';
import { getSubtaskStats, normalizeSubtasks } from '../utils/subtasks';
import { getTaskContextMeta } from '../utils/taskMeta';

export default function TaskCard({
  task,
  onToggleComplete,
  onToggleSubtask,
  onEdit,
  onDelete,
  draggable = true,
  workDays,
}) {
  const overdue = isTaskOverdue(task);
  const contextMeta = getTaskContextMeta(task.context);
  const subtasks = normalizeSubtasks(task.subtasks);
  const subtaskStats = getSubtaskStats(subtasks);

  return (
    <div
      className={`task-item ${task.completed ? 'completed' : ''} ${overdue ? 'overdue' : ''}`}
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', String(task.id));
        e.dataTransfer.effectAllowed = 'move';
        e.currentTarget.classList.add('dragging');
      }}
      onDragEnd={(e) => e.currentTarget.classList.remove('dragging')}
    >
      <div
        className={`task-checkbox ${task.completed ? 'checked' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          onToggleComplete(task.id);
        }}
      >
        {task.completed && <i className="ph ph-check" style={{ fontSize: 14 }}></i>}
      </div>
      <div className="task-content" onClick={() => onEdit(task.id)}>
        <div className="task-title-row">
          <div className="task-title">{task.title}</div>
          <span
            className="task-context-badge"
            style={{ '--ctx-color': contextMeta.color, '--ctx-bg': contextMeta.bg }}
            title={`المساحة: ${contextMeta.label}`}
          >
            <i className={`ph ${contextMeta.icon}`}></i>
            {contextMeta.label}
          </span>
        </div>
        <div className={`task-deadline ${overdue ? 'is-overdue' : ''}`}>
          <i className="ph ph-calendar-blank"></i> {formatTaskSchedule(task, { workDays })}
          {overdue && <span className="overdue-tag">متأخرة</span>}
        </div>
        {subtaskStats.total > 0 && (
          <div className="task-subtasks" onClick={(e) => e.stopPropagation()}>
            <div className="subtask-progress-row">
              <span>
                <i className="ph ph-check-square-offset"></i>
                {subtaskStats.completed}/{subtaskStats.total}
              </span>
              <div className="subtask-progress-bg">
                <div className="subtask-progress-fill" style={{ width: `${subtaskStats.percent}%` }} />
              </div>
            </div>
            <div className="task-subtask-preview-list">
              {subtasks.slice(0, 3).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`task-subtask-preview ${item.completed ? 'done' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleSubtask?.(task.id, item.id);
                  }}
                  title={item.completed ? 'إلغاء إنجاز المهمة الفرعية' : 'إنجاز المهمة الفرعية'}
                >
                  <span className={`mini-check ${item.completed ? 'checked' : ''}`}>
                    {item.completed && <i className="ph ph-check"></i>}
                  </span>
                  <span>{item.title}</span>
                </button>
              ))}
              {subtasks.length > 3 && (
                <span className="subtask-more">+{subtasks.length - 3}</span>
              )}
            </div>
          </div>
        )}
        {task.notes && (
          <div className="task-notes">
            <i className="ph ph-note-pencil"></i> {task.notes}
          </div>
        )}
      </div>
      <div className="task-actions" onMouseDown={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="btn-icon"
          onClick={(e) => {
            e.stopPropagation();
            const event = new CustomEvent('start-pomodoro-task', {
              detail: { taskId: task.id, title: task.title, context: task.context },
            });
            window.dispatchEvent(event);
          }}
          title="تشغيل بومودورو"
        >
          <i className="ph ph-play-circle" style={{ fontSize: 16 }}></i>
        </button>
        <button
          type="button"
          className="btn-icon"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(task.id);
          }}
          title="تعديل"
        >
          <i className="ph ph-pencil-simple"></i>
        </button>
        <button
          type="button"
          className="btn-icon danger"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(task.id);
          }}
          title="أرشفة المهمة"
        >
          <i className="ph ph-archive"></i>
        </button>
      </div>
    </div>
  );
}
