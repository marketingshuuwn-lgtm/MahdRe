import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { normalizeSubtasks } from '../utils/subtasks';
import { normalizeTaskContext } from '../utils/taskMeta';

const TABLE = 'tasks';

function fromRow(row) {
  return {
    id: row.id,
    title: row.title,
    quadrant: row.quadrant,
    context: normalizeTaskContext(row.context),
    subtasks: normalizeSubtasks(row.subtasks),
    completed: row.completed,
    notes: row.notes ?? '',
    dueDate: row.due_date ?? '',
    duration: row.duration ?? 1,
    sortOrder: row.sort_order ?? 0,
    recurrence: row.recurrence ?? null,
    recurrenceDays: row.recurrence_days ?? [],
    externalSource: row.external_source ?? null,
    externalId: row.external_id ?? null,
    externalUrl: row.external_url ?? null,
    externalMeta: row.external_meta ?? null,
    lastSyncedAt: row.last_synced_at ?? null,
    createdAt: row.created_at,
    completedAt: row.completed_at,
  };
}

export function useTasks(showToast) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(true);

  const fetchTasks = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);

    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
      setConnected(false);
      showToast?.('تعذّر الاتصال بقاعدة البيانات', 'ph-x-circle', 'error');
    } else {
      setConnected(true);
      setTasks((data ?? []).map(fromRow));
    }

    if (isInitial) setLoading(false);
  }, [showToast]);

  useEffect(() => {
    fetchTasks(true);

    const channel = supabase
      .channel('tasks-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: TABLE }, (payload) => {
        const newTask = fromRow(payload.new);
        setTasks((prev) => {
          if (prev.some((t) => t.id === newTask.id)) return prev;
          const withoutTemp = prev.filter((t) => !String(t.id).startsWith('temp-'));
          return [newTask, ...withoutTemp];
        });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: TABLE }, (payload) => {
        const updated = fromRow(payload.new);
        setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: TABLE }, (payload) => {
        const deletedId = payload.old.id;
        setTasks((prev) => prev.filter((t) => t.id !== deletedId));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTasks]);

  const addTask = useCallback(
    async (title, quadrant, dueDate, notes, duration = 1, extra = {}) => {
      const tempId = `temp-${Date.now()}`;
      const recurrence = extra.recurrence || null;
      const recurrenceDays = extra.recurrenceDays || [];
      const context = normalizeTaskContext(extra.context);
      const subtasks = normalizeSubtasks(extra.subtasks);
      const optimisticTask = {
        id: tempId,
        title,
        quadrant,
        context,
        subtasks,
        completed: false,
        notes: notes || '',
        dueDate: dueDate || '',
        duration: duration || 1,
        sortOrder: 0,
        recurrence,
        recurrenceDays,
        externalSource: null,
        externalId: null,
        externalUrl: null,
        createdAt: new Date().toISOString(),
        completedAt: null,
      };

      setTasks((prev) => [optimisticTask, ...prev]);

      const payload = {
        title,
        quadrant,
        context,
        subtasks,
        due_date: dueDate || null,
        notes: notes || '',
        duration: duration || 1,
        sort_order: 0,
        recurrence,
        recurrence_days: recurrence === 'weekly' ? recurrenceDays : null,
      };

      const { data, error } = await supabase.from(TABLE).insert(payload).select().single();

      if (error) {
        console.error(error);
        setTasks((prev) => prev.filter((t) => t.id !== tempId));
        showToast?.('تعذّرت إضافة المهمة', 'ph-x-circle', 'error');
        return;
      }

      setTasks((prev) => prev.map((t) => (t.id === tempId ? fromRow(data) : t)));
      showToast?.(`أُضيفت "${title}"`, 'ph-plus-circle');
    },
    [showToast]
  );

  const updateTask = useCallback(
    async (id, title, quadrant, dueDate, notes, duration, extra = {}) => {
      const previous = tasks.find((t) => t.id === id);
      if (!previous) return;

      const recurrence = extra.recurrence !== undefined ? extra.recurrence : previous.recurrence;
      const recurrenceDays =
        extra.recurrenceDays !== undefined ? extra.recurrenceDays : previous.recurrenceDays;
      const context = normalizeTaskContext(
        extra.context !== undefined ? extra.context : previous.context
      );
      const subtasks =
        extra.subtasks !== undefined ? normalizeSubtasks(extra.subtasks) : normalizeSubtasks(previous.subtasks);

      setTasks((prev) =>
        prev.map((t) =>
          t.id === id
            ? {
                ...t,
                title,
                quadrant,
                context,
                subtasks,
                dueDate: dueDate || '',
                notes: notes || '',
                duration: duration || 1,
                recurrence,
                recurrenceDays: recurrenceDays || [],
              }
            : t
        )
      );

      const { error } = await supabase
        .from(TABLE)
        .update({
          title,
          quadrant,
          context,
          subtasks,
          due_date: dueDate || null,
          notes: notes || '',
          duration: duration || 1,
          recurrence: recurrence || null,
          recurrence_days: recurrence === 'weekly' ? recurrenceDays : null,
        })
        .eq('id', id);

      if (error) {
        console.error(error);
        setTasks((prev) => prev.map((t) => (t.id === id ? previous : t)));
        showToast?.('تعذّر تعديل المهمة', 'ph-x-circle', 'error');
        return;
      }

      showToast?.(`تم تعديل "${title}"`, 'ph-pencil-simple');
    },
    [tasks, showToast]
  );

  const deleteTask = useCallback(
    async (id) => {
      const task = tasks.find((t) => t.id === id);
      if (!task) return;

      setTasks((prev) => prev.filter((t) => t.id !== id));

      const { error } = await supabase.from(TABLE).delete().eq('id', id);

      if (error) {
        console.error(error);
        setTasks((prev) => [task, ...prev]);
        showToast?.('تعذّر حذف المهمة', 'ph-x-circle', 'error');
        return;
      }

      showToast?.(`تم حذف "${task.title}"`, 'ph-trash');
    },
    [tasks, showToast]
  );

  const toggleComplete = useCallback(
    async (id) => {
      const task = tasks.find((t) => t.id === id);
      if (!task) return;

      const completed = !task.completed;
      const completedAt = completed ? new Date().toISOString() : null;

      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, completed, completedAt } : t))
      );

      const { error } = await supabase
        .from(TABLE)
        .update({ completed, completed_at: completedAt })
        .eq('id', id);

      if (error) {
        console.error(error);
        setTasks((prev) =>
          prev.map((t) =>
            t.id === id ? { ...t, completed: task.completed, completedAt: task.completedAt } : t
          )
        );
        showToast?.('تعذّر تحديث حالة المهمة', 'ph-x-circle', 'error');
        return;
      }

      if (completed) showToast?.(`✓ "${task.title}" مكتملة`, 'ph-check-circle');
    },
    [tasks, showToast]
  );

  const toggleSubtask = useCallback(
    async (taskId, subtaskId) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      const previousSubtasks = normalizeSubtasks(task.subtasks);
      const subtasks = previousSubtasks.map((item) =>
        String(item.id) === String(subtaskId) ? { ...item, completed: !item.completed } : item
      );

      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, subtasks } : t))
      );

      const { error } = await supabase.from(TABLE).update({ subtasks }).eq('id', taskId);

      if (error) {
        console.error(error);
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, subtasks: previousSubtasks } : t))
        );
        showToast?.('تعذّر تحديث المهمة الفرعية', 'ph-x-circle', 'error');
      }
    },
    [tasks, showToast]
  );

  const moveTask = useCallback(
    async (id, newQuadrant) => {
      const task = tasks.find((t) => t.id === id);
      if (!task || task.quadrant === newQuadrant) return;

      const previousQuadrant = task.quadrant;

      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, quadrant: newQuadrant } : t))
      );

      const { error } = await supabase
        .from(TABLE)
        .update({ quadrant: newQuadrant })
        .eq('id', id);

      if (error) {
        console.error(error);
        setTasks((prev) =>
          prev.map((t) => (t.id === id ? { ...t, quadrant: previousQuadrant } : t))
        );
        showToast?.('تعذّر نقل المهمة', 'ph-x-circle', 'error');
        return;
      }

      showToast?.('نُقلت المهمة', 'ph-arrows-out-card-horizontal');
    },
    [tasks, showToast]
  );

  const rescheduleTask = useCallback(
    async (id, newDate) => {
      const task = tasks.find((t) => String(t.id) === String(id));
      if (!task) return;

      const previousDate = task.dueDate;

      setTasks((prev) =>
        prev.map((t) => (String(t.id) === String(id) ? { ...t, dueDate: newDate } : t))
      );

      const { error } = await supabase
        .from(TABLE)
        .update({ due_date: newDate })
        .eq('id', task.id);

      if (error) {
        console.error(error);
        setTasks((prev) =>
          prev.map((t) => (String(t.id) === String(id) ? { ...t, dueDate: previousDate } : t))
        );
        showToast?.('تعذّر تحديث الموعد', 'ph-x-circle', 'error');
        return;
      }

      showToast?.('تم تحديث موعد المهمة', 'ph-calendar-check');
    },
    [tasks, showToast]
  );

  const reorderInQuadrant = useCallback(async (quadrant, orderedIds) => {
    setTasks((prev) => {
      const map = new Map(orderedIds.map((id, i) => [String(id), i]));
      return prev.map((t) =>
        t.quadrant === quadrant && map.has(String(t.id))
          ? { ...t, sortOrder: map.get(String(t.id)) }
          : t
      );
    });

    await Promise.all(
      orderedIds.map((id, i) => supabase.from(TABLE).update({ sort_order: i }).eq('id', id))
    );
  }, []);

  const replaceAllTasks = useCallback(
    async (importedTasks) => {
      const { error: deleteError } = await supabase.from(TABLE).delete().not('id', 'is', null);
      if (deleteError) {
        console.error(deleteError);
        showToast?.('حدث خطأ أثناء استبدال المهام', 'ph-x-circle', 'error');
        return;
      }

      const rows = importedTasks.map((t, i) => ({
        title: t.title,
        quadrant: t.quadrant,
        context: normalizeTaskContext(t.context),
        subtasks: normalizeSubtasks(t.subtasks),
        completed: t.completed,
        notes: t.notes || '',
        due_date: t.dueDate || null,
        duration: t.duration || 1,
        sort_order: i,
        recurrence: t.recurrence || null,
        recurrence_days: t.recurrence === 'weekly' ? t.recurrenceDays || [] : null,
        completed_at: t.completed ? new Date().toISOString() : null,
      }));

      const { data, error: insertError } = await supabase.from(TABLE).insert(rows).select();
      if (insertError) {
        console.error(insertError);
        showToast?.('حدث خطأ أثناء استيراد المهام', 'ph-x-circle', 'error');
        return;
      }

      setTasks((data ?? []).map(fromRow));
      showToast?.(`تم استيراد ${rows.length} مهمة بنجاح`, 'ph-upload-simple');
    },
    [showToast]
  );

  /**
   * يستبدل مهام مساحة واحدة فقط — لا يمس باقي المساحات.
   * ملاحظة: لا يزال يستخدم delete على مستوى المساحة حتى تُفعَّل الأرشفة لاحقاً.
   */
  const replaceTasksInContext = useCallback(
    async (context, importedTasks) => {
      const ctx = normalizeTaskContext(context);

      const { error: deleteError } = await supabase.from(TABLE).delete().eq('context', ctx);
      if (deleteError) {
        console.error(deleteError);
        showToast?.('حدث خطأ أثناء استبدال مهام المساحة', 'ph-x-circle', 'error');
        return;
      }

      const rows = importedTasks.map((t, i) => ({
        title: t.title,
        quadrant: t.quadrant,
        context: ctx,
        subtasks: normalizeSubtasks(t.subtasks),
        completed: !!t.completed,
        notes: t.notes || '',
        due_date: t.dueDate || null,
        duration: t.duration || 1,
        sort_order: i,
        recurrence: t.recurrence || null,
        recurrence_days: t.recurrence === 'weekly' ? t.recurrenceDays || [] : null,
        completed_at: t.completed ? new Date().toISOString() : null,
      }));

      if (rows.length === 0) {
        setTasks((prev) => prev.filter((t) => normalizeTaskContext(t.context) !== ctx));
        showToast?.('تم تفريغ مهام المساحة الحالية', 'ph-upload-simple');
        return;
      }

      const { data, error: insertError } = await supabase.from(TABLE).insert(rows).select();
      if (insertError) {
        console.error(insertError);
        showToast?.('حدث خطأ أثناء استيراد المهام', 'ph-x-circle', 'error');
        await fetchTasks(false);
        return;
      }

      const inserted = (data ?? []).map(fromRow);
      setTasks((prev) => [
        ...prev.filter((t) => normalizeTaskContext(t.context) !== ctx),
        ...inserted,
      ]);
      showToast?.(`تم استيراد ${rows.length} مهمة في المساحة الحالية`, 'ph-upload-simple');
    },
    [showToast, fetchTasks]
  );

  return {
    tasks,
    loading,
    connected,
    addTask,
    updateTask,
    deleteTask,
    toggleComplete,
    toggleSubtask,
    moveTask,
    rescheduleTask,
    reorderInQuadrant,
    replaceAllTasks,
    replaceTasksInContext,
    refetch: () => fetchTasks(false),
  };
}
