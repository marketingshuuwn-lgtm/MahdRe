import { useMemo } from 'react';
import TaskRow from './TaskRow';
import { startOfToday, toLocalISO } from '../utils/dateUtils';

const ARCHIVE_GROUPS = [
  { id: 'today', label: 'أُرشفت اليوم', color: 'var(--accent)' },
  { id: 'week', label: 'هذا الأسبوع', color: 'var(--warning)' },
  { id: 'older', label: 'أقدم', color: 'var(--q4)' },
];

function archiveDayIso(task) {
  const raw = task.archivedAt || task.archived_at || task.createdAt || task.created_at;
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return toLocalISO(d);
}

function assignArchiveBucket(task, todayIso, weekStartIso) {
  const iso = archiveDayIso(task);
  if (!iso) return 'older';
  if (iso === todayIso) return 'today';
  if (iso >= weekStartIso) return 'week';
  return 'older';
}

export default function ArchiveView({
  tasks,
  onRestore,
  onEdit,
  workDays,
  workspaceLabel,
}) {
  const groups = useMemo(() => {
    const today = startOfToday();
    const todayIso = toLocalISO(today);
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    weekStart.setHours(12, 0, 0, 0);
    const weekStartIso = toLocalISO(weekStart);

    const sorted = [...tasks].sort((a, b) => {
      const ta = a.archivedAt || a.archived_at || a.createdAt || '';
      const tb = b.archivedAt || b.archived_at || b.createdAt || '';
      return String(tb).localeCompare(String(ta));
    });

    const map = { today: [], week: [], older: [] };
    sorted.forEach((t) => {
      map[assignArchiveBucket(t, todayIso, weekStartIso)].push(t);
    });

    return ARCHIVE_GROUPS.map((g) => ({ ...g, items: map[g.id] })).filter((g) => g.items.length > 0);
  }, [tasks]);

  return (
    <div className="archive-view">
      <div className="page-header">
        <h1 className="page-title">الأرشيف</h1>
        <p className="page-desc">
          مساحة «{workspaceLabel}» — لا حذف من المنصة · استرجاع عند التمرير على الصف
        </p>
      </div>

      {tasks.length === 0 ? (
        <div className="matrix-empty">
          <i className="ph ph-archive" />
          <p>لا مهام مؤرشفة هنا</p>
          <span>المهام المؤرشفة تظهر في هذه القائمة ويمكن استرجاعها</span>
        </div>
      ) : (
        <div className="matrix-sections">
          {groups.map((g) => (
            <section
              key={g.id}
              className="matrix-section"
              style={{ '--section-color': g.color }}
            >
              <div className="matrix-section-header pending-group-head">
                <span className="matrix-section-edge" aria-hidden />
                <span className="matrix-section-title">{g.label}</span>
                <span className="matrix-section-count">{g.items.length}</span>
              </div>
              <div className="matrix-section-body">
                {g.items.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    variant="archive"
                    onRestore={onRestore}
                    onEdit={onEdit}
                    draggable={false}
                    workDays={workDays}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
