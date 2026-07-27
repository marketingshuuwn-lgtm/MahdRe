import { useEffect } from 'react';
import { usePomodoro } from '../hooks/usePomodoro';
import { notify } from '../hooks/useLocalNotifications';

export default function FloatingTimer() {
  const { running, mode, remaining, taskTitle, start, toggle, reset } = usePomodoro();

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const label = mode === 'work' ? 'تركيز' : 'راحة';

  useEffect(() => {
    const handle = (e) => {
      const { taskId, title, context } = e.detail || {};
      start({
        taskId: taskId ?? null,
        taskTitle: title || null,
        context: context || 'work',
      });
      notify(
        'بومودورو — مهد',
        `بدأت جلسة تركيز${title ? `: ${title}` : ''}`
      );
    };
    window.addEventListener('start-pomodoro-task', handle);
    return () => window.removeEventListener('start-pomodoro-task', handle);
  }, [start]);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 100,
        background: 'var(--card-bg)',
        border: '1px solid var(--border-color)',
        borderRadius: 16,
        padding: '14px 20px',
        boxShadow: 'var(--shadow-hover)',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        minWidth: 180,
        maxWidth: 280,
        direction: 'rtl',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>
          {label} — بومودورو
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </div>
        {taskTitle && (
          <div
            style={{
              fontSize: 11,
              color: 'var(--text-secondary)',
              marginTop: 4,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={taskTitle}
          >
            {taskTitle}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          type="button"
          className="btn-icon"
          onClick={toggle}
          title={running ? 'إيقاف مؤقت' : 'تشغيل'}
          style={{ fontSize: 16 }}
        >
          <i className={`ph ${running ? 'ph-pause' : 'ph-play'}`}></i>
        </button>
        <button
          type="button"
          className="btn-icon danger"
          onClick={reset}
          title="إعادة ضبط"
          style={{ fontSize: 16 }}
        >
          <i className="ph ph-arrow-counter-clockwise"></i>
        </button>
      </div>
    </div>
  );
}
