import { formatTaskSchedule } from '../utils/dateUtils';
import { getTaskContextMeta } from '../utils/taskMeta';

export default function ArchiveView({
  tasks,
  onRestore,
  onEdit,
  workDays,
  workspaceLabel,
}) {
  const sorted = [...tasks].sort((a, b) => {
    const ta = a.archivedAt || a.createdAt || '';
    const tb = b.archivedAt || b.createdAt || '';
    return String(tb).localeCompare(String(ta));
  });

  return (
    <div className="archive-view">
      <div className="page-header">
        <h1 className="page-title">الأرشيف</h1>
        <p className="page-desc">
          مهام مؤرشفة في مساحة «{workspaceLabel}». لا تُحذف من المنصة — يمكن استرجاعها في أي وقت.
        </p>
      </div>

      {sorted.length === 0 ? (
        <div className="card empty-state">
          <i className="ph ph-archive" style={{ fontSize: 36, marginBottom: 8 }}></i>
          <p>لا توجد مهام مؤرشفة في هذه المساحة.</p>
        </div>
      ) : (
        <div className="archive-list">
          {sorted.map((task) => {
            const meta = getTaskContextMeta(task.context);
            return (
              <div key={task.id} className="archive-item card">
                <div className="archive-item-main">
                  <div className="archive-item-title">{task.title}</div>
                  <div className="archive-item-meta">
                    <span
                      className="task-context-badge"
                      style={{ '--ctx-color': meta.color, '--ctx-bg': meta.bg }}
                    >
                      <i className={`ph ${meta.icon}`}></i>
                      {meta.label}
                    </span>
                    <span className="task-deadline">
                      <i className="ph ph-calendar-blank"></i>{' '}
                      {formatTaskSchedule(task, { workDays })}
                    </span>
                    {task.completed && (
                      <span className="archive-completed-tag">كانت مكتملة</span>
                    )}
                  </div>
                  {task.notes && <div className="task-notes">{task.notes}</div>}
                </div>
                <div className="archive-item-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => onRestore(task.id)}
                    title="استرجاع إلى المساحة النشطة"
                  >
                    <i className="ph ph-arrow-counter-clockwise"></i>
                    استرجاع
                  </button>
                  <button
                    type="button"
                    className="btn-icon"
                    onClick={() => onEdit(task.id)}
                    title="عرض / تعديل"
                  >
                    <i className="ph ph-pencil-simple"></i>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
