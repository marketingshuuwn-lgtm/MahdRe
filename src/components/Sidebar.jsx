import { useRef, useState } from 'react';

const NAV_ITEMS = [
  { id: 'Today', label: 'اليوم', icon: 'ph-sun' },
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
          <img src="/logo.svg" alt="مهد" className="logo-icon-img" />
        </div>
        {!compact && <div className="logo-text">مهد</div>}
        <button
          type="button"
          className="sidebar-pin-btn"
          title={compact ? 'إظهار النص' : 'أيقونات فقط'}
          aria-label={compact ? 'إظهار نص الشريط' : 'أيقونات فقط'}
          onClick={onToggleCompact}
        >
          <i className={`ph ${compact ? 'ph-sidebar-simple' : 'ph-sidebar'}`}></i>
        </button>
      </div>

      <nav aria-label="التنقل الرئيسي">
        {NAV_ITEMS.map((item) => {
          let badge = null;
          if (item.id === 'Pending' && pendingCount > 0) badge = pendingCount;
          else if (item.id === 'Trello' && trelloCount > 0) badge = trelloCount;
          else if (item.id === 'Archive' && archiveCount > 0) badge = archiveCount;
          const active = view === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={`nav-item ${active ? 'active' : ''}`}
              title={item.label}
              aria-current={active ? 'page' : undefined}
              onClick={() => {
                onSwitchView(item.id);
                onClose();
              }}
            >
              <i className={`ph ${item.icon}`} aria-hidden="true"></i>
              {!compact && <span className="nav-label">{item.label}</span>}
              {badge != null && (
                <span className="nav-badge" aria-label={`${badge} عنصر`}>
                  {badge}
                </span>
              )}
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
          title={theme === 'dark' ? 'الوضع النهاري' : 'الوضع الليلي'}
          aria-label={theme === 'dark' ? 'التبديل للنهاري' : 'التبديل لليلي'}
        >
          {!compact && <span>{theme === 'dark' ? 'نهاري' : 'ليلي'}</span>}
          <i className={`ph ${theme === 'dark' ? 'ph-sun' : 'ph-moon'}`} aria-hidden="true"></i>
        </button>

        <div className="data-actions">
          <button
            type="button"
            className="data-btn"
            title="تصدير"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <i className="ph ph-download-simple" aria-hidden="true"></i>
            {!compact && 'تصدير'}
          </button>
          <button
            type="button"
            className="data-btn"
            title="استيراد"
            onClick={() => fileInputRef.current?.click()}
          >
            <i className="ph ph-upload-simple" aria-hidden="true"></i>
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
            <div className="dropdown-menu" role="menu">
              <button type="button" role="menuitem" onClick={() => { onExport('csv'); setMenuOpen(false); }}>
                CSV
              </button>
              <button type="button" role="menuitem" onClick={() => { onExport('xlsx'); setMenuOpen(false); }}>
                Excel
              </button>
            </div>
          )}
        </div>

        {!compact && <div className="sidebar-total">إجمالي: {totalCount}</div>}
      </div>
    </aside>
  );
}
