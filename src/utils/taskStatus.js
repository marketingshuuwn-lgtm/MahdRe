/** حالات المهمة — مصدر واحد للواجهة والمنطق */

export const TASK_STATUSES = [
  { id: 'not_started', label: 'لم تبدأ', icon: 'ph-circle', cycle: true },
  { id: 'in_progress', label: 'قيد التنفيذ', icon: 'ph-circle-half', cycle: true },
  { id: 'completed', label: 'مكتملة', icon: 'ph-check-circle', cycle: true },
  { id: 'deferred', label: 'مؤجلة', icon: 'ph-clock-countdown', cycle: false },
  { id: 'cancelled', label: 'ملغاة', icon: 'ph-x-circle', cycle: false },
];

export const CYCLE_STATUSES = ['not_started', 'in_progress', 'completed'];

export function normalizeTaskStatus(taskOrStatus) {
  if (typeof taskOrStatus === 'string') {
    const s = taskOrStatus.trim();
    if (TASK_STATUSES.some((x) => x.id === s)) return s;
    return 'not_started';
  }
  const t = taskOrStatus || {};
  if (t.status && TASK_STATUSES.some((x) => x.id === t.status)) return t.status;
  if (t.completed) return 'completed';
  return 'not_started';
}

export function statusMeta(status) {
  return TASK_STATUSES.find((s) => s.id === status) || TASK_STATUSES[0];
}

/** مكتملة فعلياً لليوم (للمهام الدورية: إنجاز الأمس لا يغلق اليوم) */
export function isCompletedToday(task, todayIso, toLocalISOFn, startOfTodayFn) {
  if (!task?.completed && normalizeTaskStatus(task) !== 'completed') return false;
  const isRecurring = task.recurrence === 'daily' || task.recurrence === 'weekly';
  if (!isRecurring) return true;
  const raw = task.completedAt || task.completed_at;
  if (!raw) return false;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return false;
  const iso = toLocalISOFn(d);
  const today = todayIso || toLocalISOFn(startOfTodayFn());
  return iso === today;
}

/** هل المهمة «مفتوحة» في اللوحات النشطة؟ */
export function isTaskOpen(task, opts = {}) {
  if (!task || task.archived) return false;
  const status = normalizeTaskStatus(task);
  if (status === 'cancelled') return false;
  if (status === 'deferred') return false;
  if (status === 'completed' || task.completed) {
    const isRecurring = task.recurrence === 'daily' || task.recurrence === 'weekly';
    if (!isRecurring) return false;
    // دورية: تبقى مفتوحة إن لم تُنجز اليوم
    if (opts.isCompletedToday) return !opts.isCompletedToday(task);
    return true;
  }
  return true;
}

export function nextCycleStatus(current) {
  const s = normalizeTaskStatus(current);
  const idx = CYCLE_STATUSES.indexOf(s);
  const i = idx >= 0 ? idx : 0;
  return CYCLE_STATUSES[(i + 1) % CYCLE_STATUSES.length];
}
