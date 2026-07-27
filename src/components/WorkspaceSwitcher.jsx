import { useState } from 'react';
import { WORKSPACE_COLORS, WORKSPACE_ICONS } from '../utils/taskMeta';

export default function WorkspaceSwitcher({
  workspaces,
  activeWorkspaceId,
  onSwitch,
  onCreate,
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState(WORKSPACE_ICONS[2]);
  const [colorIndex, setColorIndex] = useState(2);

  const submit = (e) => {
    e?.preventDefault?.();
    const created = onCreate?.({ name, icon, colorIndex });
    if (created) {
      setName('');
      setShowCreate(false);
    }
  };

  return (
    <div className="workspace-switcher">
      <div className="workspace-tabs" role="tablist" aria-label="المساحات">
        {workspaces.map((ws) => (
          <button
            key={ws.id}
            type="button"
            role="tab"
            aria-selected={ws.id === activeWorkspaceId}
            className={`workspace-tab ${ws.id === activeWorkspaceId ? 'active' : ''}`}
            style={{ '--ws-color': ws.color, '--ws-bg': ws.bg }}
            onClick={() => onSwitch(ws.id)}
            title={ws.label}
          >
            <i className={`ph ${ws.icon}`}></i>
            <span>{ws.label}</span>
          </button>
        ))}
        <button
          type="button"
          className="workspace-tab workspace-add-tab"
          onClick={() => setShowCreate(true)}
          title="مساحة جديدة"
        >
          <i className="ph ph-plus"></i>
          <span>جديد</span>
        </button>
      </div>

      {showCreate && (
        <div
          className="modal-overlay open workspace-create-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCreate(false);
          }}
        >
          <div className="modal-box card workspace-create-modal">
            <div className="modal-header">
              <h3>مساحة جديدة</h3>
              <button type="button" className="btn-icon" onClick={() => setShowCreate(false)}>
                <i className="ph ph-x" style={{ fontSize: 20 }}></i>
              </button>
            </div>
            <form onSubmit={submit}>
              <div className="form-field">
                <label>اسم المساحة</label>
                <input
                  type="text"
                  className="form-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: دراسة، مشروع عميل…"
                  autoFocus
                  required
                />
              </div>
              <div className="form-field">
                <label>الأيقونة</label>
                <div className="workspace-icon-picks">
                  {WORKSPACE_ICONS.map((ic) => (
                    <button
                      key={ic}
                      type="button"
                      className={`workspace-icon-pick ${icon === ic ? 'active' : ''}`}
                      onClick={() => setIcon(ic)}
                    >
                      <i className={`ph ${ic}`}></i>
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-field">
                <label>اللون</label>
                <div className="workspace-color-picks">
                  {WORKSPACE_COLORS.map((c, i) => (
                    <button
                      key={i}
                      type="button"
                      className={`workspace-color-pick ${colorIndex === i ? 'active' : ''}`}
                      style={{ background: c.color }}
                      onClick={() => setColorIndex(i)}
                      aria-label={`لون ${i + 1}`}
                    />
                  ))}
                </div>
              </div>
              <div className="modal-footer">
                <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={!name.trim()}>
                  إنشاء المساحة
                </button>
                <button type="button" className="btn-secondary" onClick={() => setShowCreate(false)}>
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
