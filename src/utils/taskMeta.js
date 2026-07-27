export const WEEK_DAYS = [
  { id: 0, label: 'أحد', longLabel: 'الأحد' },
  { id: 1, label: 'إثنين', longLabel: 'الإثنين' },
  { id: 2, label: 'ثلاثاء', longLabel: 'الثلاثاء' },
  { id: 3, label: 'أربعاء', longLabel: 'الأربعاء' },
  { id: 4, label: 'خميس', longLabel: 'الخميس' },
  { id: 5, label: 'جمعة', longLabel: 'الجمعة' },
  { id: 6, label: 'سبت', longLabel: 'السبت' },
];

export const DEFAULT_WORK_DAYS = [0, 1, 2, 3, 4];
export const ALL_WEEK_DAYS = [0, 1, 2, 3, 4, 5, 6];

/** المساحات الافتراضية — يمكن للمستخدم إضافة مساحات أخرى محلياً */
export const DEFAULT_WORKSPACES = [
  {
    id: 'work',
    label: 'عمل',
    icon: 'ph-briefcase',
    color: 'var(--accent)',
    bg: 'var(--accent-light)',
    isDefault: true,
  },
  {
    id: 'personal',
    label: 'شخصي',
    icon: 'ph-house-line',
    color: 'var(--success)',
    bg: 'var(--success-light)',
    isDefault: true,
  },
];

/** للتوافق مع الكود القديم */
export const TASK_CONTEXTS = DEFAULT_WORKSPACES;

export const WORKSPACE_COLORS = [
  { color: 'var(--accent)', bg: 'var(--accent-light)' },
  { color: 'var(--success)', bg: 'var(--success-light)' },
  { color: 'var(--warning)', bg: 'var(--warning-light)' },
  { color: 'var(--danger)', bg: 'var(--danger-light)' },
  { color: '#7c3aed', bg: 'rgba(124, 58, 237, 0.12)' },
  { color: '#0891b2', bg: 'rgba(8, 145, 178, 0.12)' },
  { color: '#db2777', bg: 'rgba(219, 39, 119, 0.12)' },
  { color: '#ea580c', bg: 'rgba(234, 88, 12, 0.12)' },
];

export const WORKSPACE_ICONS = [
  'ph-briefcase',
  'ph-house-line',
  'ph-book-open',
  'ph-folder',
  'ph-star',
  'ph-heart',
  'ph-target',
  'ph-lightbulb',
  'ph-users',
  'ph-code',
];

export function normalizeWorkDays(days) {
  const source = Array.isArray(days) ? days : DEFAULT_WORK_DAYS;
  const unique = [...new Set(source.map(Number).filter((n) => n >= 0 && n <= 6))].sort((a, b) => a - b);
  return unique.length > 0 ? unique : DEFAULT_WORK_DAYS;
}

export function formatWorkDays(days, { long = false } = {}) {
  const normalized = normalizeWorkDays(days);
  return normalized
    .map((dayId) => {
      const day = WEEK_DAYS.find((d) => d.id === dayId);
      return long ? day?.longLabel : day?.label;
    })
    .filter(Boolean)
    .join('، ');
}

/** أي نص غير فارغ = معرف مساحة صالح؛ الفارغ/null → work */
export function normalizeTaskContext(context) {
  if (typeof context === 'string' && context.trim()) return context.trim();
  return 'work';
}

export function getTaskContextMeta(context, workspaces = null) {
  const id = normalizeTaskContext(context);
  const list = Array.isArray(workspaces) && workspaces.length > 0 ? workspaces : DEFAULT_WORKSPACES;
  const found = list.find((item) => item.id === id);
  if (found) return found;
  return {
    id,
    label: id,
    icon: 'ph-folder',
    color: 'var(--accent)',
    bg: 'var(--accent-light)',
  };
}

export function slugifyWorkspaceName(name) {
  const base = String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\u0600-\u06FF-]/g, '')
    .slice(0, 40);
  return base || `ws-${Date.now().toString(36)}`;
}
