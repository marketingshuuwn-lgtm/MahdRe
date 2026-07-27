import { useMemo, useState } from 'react';
import { ALL_WORKSPACES_ID, WORKSPACE_COLORS, WORKSPACE_ICONS } from '../utils/taskMeta';

export default function WorkspaceSwitcher({
  workspaces,
  activeWorkspaceId,
  onSwitch,
  onCreate,
  onUpdate,
  onArchiveSpace,
  isAllMode,
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [editId, setEditId] = useState(null);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState(WORKSPACE_ICONS[2]);
  const [colorIndex, setColorIndex] = useState(2);

  const editing = useMemo(
    () => workspaces.find((w) => w.id === editId) || null,
    [workspaces, editId]
  );

  const openEdit = (ws) => {
    setEditId(ws.id);
    setName(ws.label);
    setIcon(ws.icon || WORKSPACE_ICONS[0]);
    const idx = WORKSPACE_COLORS.findIndex(
      (c) => c.color === ws.color || c.bg === ws.bg
    );
    setColorIndex(idx >= 0 ? idx : 0);
  };

  const submitCreate = (e) => {
    e?.preventDefault?.();
    const created = onCreate?.({ name, icon, colorIndex });
    if (created) {
      setName('');
      setShowCreate(false);
    }
  };

  const submitEdit = (e) => {
    e?.preventDefault?.();
    if (!editId || !name.trim()) return;
    onUpdate?.(editId, { label: name.trim(), icon, colorIndex });
    setEditId(null);
  };

  const handleArchive = () => {
    if (!editing) return;
    if (editing.isDefault || editing.id === 'work' || editing.id === 'personal') {
      return;
    }
    const ok = window.confirm(
      `أرشفة مساحة «${editing.label}»؟\n\nستُخفى من الشريط وتُؤرشف مهامها النشطة.\nلا يُحذف شيء من قاعدة البيانات.`
    );
    if (!ok) return;
    onArchiveSpace?.(editing.id);
    setEditId(null);
  };

  return (
    <div className="workspace-switcher">
      <div className="workspace-tabs" role="tablist" aria-label="المساحات">
        <button
          type="button"
          role="tab"
          aria-selected={isAllMode}
          className={`workspace-tab workspace-all-tab ${isAllMode ? 'active' : ''}`}
          onClick={() => onSwitch(ALL_WORKSPACES_ID)}
          title="كل المساحات — عرض وتقارير شاملة"
        >
          <i className="ph ph-squares-four"></i>
          <span>الكل</span>
        </button>

        {workspaces.map((ws) => (
          <div key={ws.id} className="workspace-tab-wrap">
            <button
              type="button"
              role="tab"
              aria-selected={!isAllMode && ws.id === activeWorkspaceId}
              className={`workspace-tab ${!isAllMode && ws.id === activeWorkspaceId ? 'active' : ''}`}
              style={{ '--ws-color': ws.color, '--ws-bg': ws.bg }}
              onClick={() => onSwitch(ws.id)}
              title={ws.label}
            >
              <i className={`ph ${ws.icon}`}></i>
              <span>{ws.label}</span>
            </button>
            <button
              type="button"
              className="workspace-tab-gear"
              title="تحرير المساحة"
              onClick={(e) => {
                e.stopPropagation();
                openEdit(ws);
              }}
            >
              <i className="ph ph-gear"></i>
            </button>
          </div>
        ))}

        <button
          type="button"
          className="workspace-tab workspace-add-tab"
          onClick={() => {
            setName('');
            setIcon(WORKSPACE_ICONS[2]);
            setColorIndex(2);
            setShowCreate(true);
          }}
          title="مساحة جديدة"
        >
          <i className="ph ph-plus"></i>
          <span>جديد</span>
        </button>
      </div>

      {isAllMode && (
        <p className="workspace-all-hint">
          عرض شامل لكل المهام النشطة — التقارير هنا للمنصة كاملة. الإضافة تُسجَّل في أول مساحة نشطة.
        </p>
      )}

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
            <form onSubmit={submitCreate}>
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

      {editing && (
        <div
          className="modal-overlay open workspace-create-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditId(null);
          }}
        >
          <div className="modal-box card workspace-create-modal">
            <div className="modal-header">
              <h3>تحرير المساحة</h3>
              <button type="button" className="btn-icon" onClick={() => setEditId(null)}>
                <i className="ph ph-x" style={{ fontSize: 20 }}></i>
              </button>
            </div>
            <form onSubmit={submitEdit}>
              <div className="form-field">
                <label>الاسم</label>
                <input
                  type="text"
                  className="form-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
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
                    />
                  ))}
                </div>
              </div>
              <div className="modal-footer" style={{ flexWrap: 'wrap' }}>
                <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={!name.trim()}>
                  حفظ
                </button>
                <button type="button" className="btn-secondary" onClick={() => setEditId(null)}>
                  إلغاء
                </button>
                {!editing.isDefault && editing.id !== 'work' && editing.id !== 'personal' && (
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ flex: '1 1 100%', color: 'var(--danger)', borderColor: 'var(--danger)' }}
                    onClick={handleArchive}
                  >
                    <i className="ph ph-archive"></i> أرشفة المساحة
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
