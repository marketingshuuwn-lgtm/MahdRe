const SECTIONS = [
  {
    title: 'التنقل',
    items: [
      { keys: 'Alt + 1', desc: 'المهام (المصفوفة)' },
      { keys: 'Alt + 2', desc: 'المعلقة' },
      { keys: 'Alt + 3', desc: 'التقارير' },
      { keys: 'Alt + 4', desc: 'الاستراحة' },
      { keys: 'Alt + 5', desc: 'المفكرة' },
      { keys: 'Alt + 6', desc: 'الأرشيف' },
      { keys: 'Alt + 7', desc: 'الإعدادات' },
      { keys: 'Alt + G', desc: 'الاستراحة (اختصار سريع)' },
    ],
  },
  {
    title: 'إجراءات',
    items: [
      { keys: 'Alt + N', desc: 'مهمة جديدة' },
      { keys: 'Esc', desc: 'إغلاق النافذة أو المساعدة' },
      { keys: '؟ أو /', desc: 'عرض هذه النافذة' },
    ],
  },
];

export default function ShortcutsHelp({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div
      className="shortcuts-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
      onClick={onClose}
    >
      <div
        className="shortcuts-modal card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shortcuts-header">
          <h2 id="shortcuts-title">اختصارات لوحة المفاتيح</h2>
          <button type="button" className="btn-icon" onClick={onClose} title="إغلاق" aria-label="إغلاق">
            <i className="ph ph-x" />
          </button>
        </div>
        <div className="shortcuts-body">
          {SECTIONS.map((sec) => (
            <div key={sec.title} className="shortcuts-section">
              <h3>{sec.title}</h3>
              <ul>
                {sec.items.map((item) => (
                  <li key={item.keys}>
                    <kbd>{item.keys}</kbd>
                    <span>{item.desc}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="shortcuts-foot">لا تعمل الاختصارات أثناء الكتابة في حقول الإدخال</p>
      </div>
    </div>
  );
}
