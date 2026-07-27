import { useRef, useState } from 'react';

const NAV_ITEMS = [
  { id: 'Matrix', label: 'مصفوفة الأولويات', icon: 'ph-squares-four' },
  { id: 'Pending', label: 'المهام المعلقة', icon: 'ph-hourglass' },
  { id: 'Trello', label: 'تريلو', icon: 'ph-kanban' },
  { id: 'Kpi', label: 'التقارير', icon: 'ph-chart-bar' },
  { id: 'Motivation', label: 'مساحة التحفيز', icon: 'ph-rocket-launch' },
  { id: 'Archive', label: 'الأرشيف', icon: 'ph-archive' },
  { id: 'Settings', label: 'الإعدادات', icon: 'ph-gear-six' },
];

export default function Sidebar({
  view,
  onSwitchView,
  isOpen,
  onClose,
  theme,
  onToggleTheme,
  pendingCount,
  trelloCount,
  archiveCount = 0,
  totalCount,
  connected,
  onExport,
  onImportFile,
  compact,
  onToggleCompact,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const fileInputRef = useRef(null);

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''} ${compact ? 'compact' : ''}`}>
      <div className="logo-area">
        <div className="logo-icon">
          <i className="ph ph-tree-evergreen"></i>
        </div>
        {!compact && <div className="logo-text">مهد</div>}
        <button
          type="button"
          className="sidebar-pin-btn"
          title={compact ? 'إظهار النص' : 'أيقونات فقط'}
          onClick={onToggleCompact}
        >
          <i className={`ph ${compact ? 'ph-sidebar-simple' : 'ph-sidebar'}`}></i>
        </button>
      </div>

      <nav>
        {NAV_ITEMS.map((item) => {
          let badge = null;
          if (item.id === 'Pending' && pendingCount > 0) badge = pendingCount;
          else if (item.id === 'Trello' && trelloCount > 0) badge = trelloCount;
          else if (item.id === 'Archive' && archiveCount > 0) badge = archiveCount;
          return (
            <button
              key={item.id}
              type="button"
              className={`nav-item ${view === item.id ? 'active' : ''}`}
              title={item.label}
              onClick={() => {
                onSwitchView(item.id);
                onClose();
              }}
            >
              <i className={`ph ${item.icon}`}></i>
              {!compact && <span className="nav-label">{item.label}</span>}
              {badge != null && <span className="nav-badge">{badge}</span>}
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="connection-status" title={connected ? 'متصل' : 'غير متصل'}>
          <span className={`connection-dot ${connected ? '' : 'offline'}`}></span>
          {!compact && (connected ? 'متصل' : 'غير متصل')}
        </div>

        <button
          type="button"
          className="theme-toggle-btn"
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'نهاري' : 'ليلي'}
        >
          {!compact && <span>{theme === 'dark' ? 'نهاري' : 'ليلي'}</span>}
          <i className={`ph ${theme === 'dark' ? 'ph-sun' : 'ph-moon'}`}></i>
        </button>

        <div className="data-actions">
          <button type="button" className="data-btn" title="تصدير" onClick={() => setMenuOpen((v) => !v)}>
            <i className="ph ph-download-simple"></i>
            {!compact && 'تصدير'}
          </button>
          <button
            type="button"
            className="data-btn"
            title="استيراد"
            onClick={() => fileInputRef.current?.click()}
          >
            <i className="ph ph-upload-simple"></i>
            {!compact && 'استيراد'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx"
            style={{ display: 'none' }}
            tabIndex={-1}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onImportFile(file);
              e.target.value = '';
            }}
          />
          {menuOpen && (
            <div className="dropdown-menu">
              <button type="button" onClick={() => { onExport('csv'); setMenuOpen(false); }}>CSV</button>
              <button type="button" onClick={() => { onExport('xlsx'); setMenuOpen(false); }}>Excel</button>
            </div>
          )}
        </div>

        {!compact && <div className="sidebar-total">إجمالي: {totalCount}</div>}
      </div>
    </aside>
  );
}
