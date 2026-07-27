import { supabase } from './supabaseClient';
import { normalizeTaskContext } from '../utils/taskMeta';

/**
 * يحفظ جلسة بومودورو مكتملة (أو ملغاة) في Supabase.
 * لا يرمي خطأ للمستخدم — يسجّل في console عند الفشل.
 */
export async function recordPomodoroSession({
  taskId = null,
  taskTitle = null,
  context = 'work',
  mode = 'work',
  plannedSeconds = 1500,
  elapsedSeconds = 0,
  completed = true,
  startedAt = null,
  endedAt = null,
} = {}) {
  const started = startedAt ? new Date(startedAt).toISOString() : new Date().toISOString();
  const ended = endedAt ? new Date(endedAt).toISOString() : new Date().toISOString();

  const row = {
    task_id: taskId != null && !String(taskId).startsWith('temp-') ? Number(taskId) : null,
    task_title: taskTitle || null,
    context: normalizeTaskContext(context),
    mode: mode === 'break' ? 'break' : 'work',
    planned_seconds: Math.max(0, Math.round(plannedSeconds || 0)),
    elapsed_seconds: Math.max(0, Math.round(elapsedSeconds || 0)),
    completed: Boolean(completed),
    started_at: started,
    ended_at: ended,
  };

  const { error } = await supabase.from('pomodoro_sessions').insert(row);
  if (error) {
    console.error('[pomodoro_sessions]', error);
    return { ok: false, error };
  }
  return { ok: true };
}
