import { useEffect, useRef, useState } from 'react';

/** ترتيب: مهام → معلقة → تقارير → استراحة → مفكرة → أرشيف → إعدادات */
const NAV_ITEMS = [
  { id: 'Matrix', label: 'المهام', icon: 'ph-squares-four', hint: 'Alt+1' },
  { id: 'Pending', label: 'المعلقة', icon: 'ph-hourglass', hint: 'Alt+2' },
  { id: 'Kpi', label: 'التقارير', icon: 'ph-chart-bar', hint: 'Alt+3' },
  { id: 'Motivation', label: 'استراحة', icon: 'ph-coffee', hint: 'Alt+4 / Alt+G' },
  { id: 'Notepad', label: 'المفكرة', icon: 'ph-notebook', hint: 'Alt+5' },
  { id: 'Archive', label: 'الأرشيف', icon: 'ph-archive', hint: 'Alt+6' },
  { id: 'Settings', label: 'الإعدادات', icon: 'ph-gear-six', hint: 'Alt+7' },
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
}) {
  const [dataMenuOpen, setDataMenuOpen] = useState(false);
  const fileInputRef = useRef(null);
  const dataMenuRef = useRef(null);

  useEffect(() => {
    if (!dataMenuOpen) return;
    const close = (e) => {
      if (dataMenuRef.current && !dataMenuRef.current.contains(e.target)) {
        setDataMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [dataMenuOpen]);

  return (
    <aside className={`sidebar-rail ${isOpen ? 'open' : ''}`}>
      <button type="button" className="rail-logo-btn" title="مهد" onClick={() => onSwitchView('Matrix')}>
        <img src="/logo.svg" alt="مهد" className="rail-logo-img" />
      </button>

      <nav className="rail-nav" aria-label="التنقل الرئيسي">
        {NAV_ITEMS.map((item) => {
          let badge = null;
          if (item.id === 'Pending' && pendingCount > 0) badge = pendingCount;
          else if (item.id === 'Settings' && trelloCount > 0) badge = trelloCount;
          else if (item.id === 'Archive' && archiveCount > 0) badge = archiveCount;
          const active = view === item.id;
          const title = item.hint ? `${item.label} (${item.hint})` : item.label;
          return (
            <button
              key={item.id}
              type="button"
              className={`rail-btn ${active ? 'active' : ''}`}
              title={title}
              aria-current={active ? 'page' : undefined}
              aria-label={item.label}
              onClick={() => {
                onSwitchView(item.id);
                onClose();
              }}
            >
              <i className={`ph ${item.icon}`} aria-hidden="true"></i>
              {badge != null && (
                <span className="rail-badge" aria-label={`${badge} عنصر`}>
                  {badge > 9 ? '9+' : badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="rail-footer">
        <button
          type="button"
          className="rail-btn"
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'الوضع النهاري' : 'الوضع الليلي'}
          aria-label={theme === 'dark' ? 'التبديل للنهاري' : 'التبديل لليلي'}
        >
          <i className={`ph ${theme === 'dark' ? 'ph-sun' : 'ph-moon'}`} aria-hidden="true"></i>
        </button>

        <div className="rail-data-menu" ref={dataMenuRef}>
          <button
            type="button"
            className="rail-btn"
            title="تنزيل أو رفع بيانات المساحة"
            aria-expanded={dataMenuOpen}
            aria-label="تنزيل أو رفع بيانات"
            onClick={() => setDataMenuOpen((v) => !v)}
          >
            <i className="ph ph-arrows-down-up" aria-hidden="true"></i>
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
              setDataMenuOpen(false);
            }}
          />
          {dataMenuOpen && (
            <div className="rail-dropdown-menu" role="menu">
              <div className="rail-dropdown-title">إجمالي المهام: {totalCount}</div>
              <button type="button" role="menuitem" onClick={() => { onExport('csv'); setDataMenuOpen(false); }}>
                <i className="ph ph-download-simple"></i> تنزيل CSV
              </button>
              <button type="button" role="menuitem" onClick={() => { onExport('xlsx'); setDataMenuOpen(false); }}>
                <i className="ph ph-download-simple"></i> تنزيل Excel
              </button>
              <button type="button" role="menuitem" onClick={() => fileInputRef.current?.click()}>
                <i className="ph ph-upload-simple"></i> رفع ملف…
              </button>
            </div>
          )}
        </div>

        <div
          className={`rail-connection-dot ${connected ? '' : 'offline'}`}
          title={connected ? 'متصل بقاعدة البيانات' : 'غير متصل'}
          aria-label={connected ? 'متصل' : 'غير متصل'}
        ></div>
      </div>
    </aside>
  );
}
