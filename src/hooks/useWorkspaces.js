import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import {
  DEFAULT_WORKSPACES,
  WORKSPACE_COLORS,
  WORKSPACE_ICONS,
  ALL_WORKSPACES_ID,
  normalizeTaskContext,
  slugifyWorkspaceName,
} from '../utils/taskMeta';

const TABLE = 'workspaces';
const LOCAL_KEY = 'mahd_workspaces_v1';
const ACTIVE_KEY = 'mahd_active_workspace_v1';
const MIGRATED_KEY = 'mahd_workspaces_migrated_v1';

function defaultList() {
  return DEFAULT_WORKSPACES.map((w, i) => ({
    ...w,
    archived: false,
    trait: w.trait || '',
    sortOrder: i,
  }));
}

function fromRow(row) {
  return {
    id: row.id,
    label: row.label,
    icon: row.icon || 'ph-folder',
    color: row.color || 'var(--accent)',
    bg: row.bg || 'var(--accent-light)',
    isDefault: Boolean(row.is_default),
    archived: Boolean(row.archived),
    trait: typeof row.trait === 'string' ? row.trait : '',
    sortOrder: row.sort_order ?? 0,
  };
}

function toRow(w, sortOrder) {
  return {
    id: w.id,
    label: w.label,
    icon: w.icon || 'ph-folder',
    color: w.color || 'var(--accent)',
    bg: w.bg || 'var(--accent-light)',
    is_default: Boolean(w.isDefault),
    archived: Boolean(w.archived),
    trait: w.trait || '',
    sort_order: sortOrder ?? w.sortOrder ?? 0,
    updated_at: new Date().toISOString(),
  };
}

function readLocalWorkspaces() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return defaultList();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return defaultList();
    return parsed
      .filter((w) => w && typeof w.id === 'string' && w.id.trim() && w.id !== ALL_WORKSPACES_ID)
      .map((w, i) => ({
        id: normalizeTaskContext(w.id),
        label: String(w.label || w.id).trim() || w.id,
        icon: w.icon || 'ph-folder',
        color: w.color || 'var(--accent)',
        bg: w.bg || 'var(--accent-light)',
        isDefault: Boolean(w.isDefault),
        archived: Boolean(w.archived),
        trait: typeof w.trait === 'string' ? w.trait : '',
        sortOrder: i,
      }));
  } catch {
    return defaultList();
  }
}

function readActiveId(workspaces) {
  try {
    const raw = localStorage.getItem(ACTIVE_KEY);
    if (raw === ALL_WORKSPACES_ID) return ALL_WORKSPACES_ID;
    if (raw && workspaces.some((w) => w.id === raw && !w.archived)) return raw;
  } catch {
    /* ignore */
  }
  const first = workspaces.find((w) => !w.archived);
  return first?.id || 'work';
}

function mergeWithDefaults(list) {
  const ids = new Set(list.map((w) => w.id));
  const missing = DEFAULT_WORKSPACES.filter((d) => !ids.has(d.id)).map((d, i) => ({
    ...d,
    archived: false,
    trait: d.trait || '',
    sortOrder: list.length + i,
  }));
  return [...list, ...missing];
}

export function useWorkspaces() {
  const [workspaces, setWorkspaces] = useState(defaultList);
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState(() =>
    readActiveId(defaultList())
  );
  const [loading, setLoading] = useState(true);
  const [syncError, setSyncError] = useState(null);

  // تحميل من Supabase + ترحيل localStorage مرة واحدة
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setSyncError(null);
      try {
        const { data, error } = await supabase
          .from(TABLE)
          .select('*')
          .order('sort_order', { ascending: true });

        if (error) throw error;

        let list = (data ?? []).map(fromRow);

        // جدول فارغ → رحّل من localStorage إن وُجد، وإلا البذور الافتراضية
        if (list.length === 0) {
          const local = readLocalWorkspaces();
          const rows = local.map((w, i) => toRow(w, i));
          const { data: inserted, error: insertErr } = await supabase
            .from(TABLE)
            .upsert(rows, { onConflict: 'id' })
            .select();

          if (insertErr) throw insertErr;
          list = (inserted ?? []).map(fromRow);
          try {
            localStorage.setItem(MIGRATED_KEY, '1');
          } catch {
            /* ignore */
          }
        } else if (!localStorage.getItem(MIGRATED_KEY)) {
          // جدول فيه بيانات + local قديم: أضف مساحات محلية غير موجودة فقط
          const local = readLocalWorkspaces();
          const remoteIds = new Set(list.map((w) => w.id));
          const toAdd = local.filter((w) => !remoteIds.has(w.id));
          if (toAdd.length > 0) {
            const base = list.length;
            const rows = toAdd.map((w, i) => toRow(w, base + i));
            const { data: inserted, error: insertErr } = await supabase
              .from(TABLE)
              .upsert(rows, { onConflict: 'id' })
              .select();
            if (!insertErr && inserted) {
              list = [...list, ...inserted.map(fromRow)];
            }
          }
          try {
            localStorage.setItem(MIGRATED_KEY, '1');
          } catch {
            /* ignore */
          }
        }

        list = mergeWithDefaults(list).sort(
          (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
        );

        if (cancelled) return;
        setWorkspaces(list);
        setActiveWorkspaceIdState(readActiveId(list));

        // كاش محلي احتياطي للقراءة السريعة / وضع عدم الاتصال
        try {
          localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
        } catch {
          /* ignore */
        }
      } catch (err) {
        console.error('[workspaces]', err);
        if (cancelled) return;
        setSyncError(err?.message || 'workspaces load failed');
        // fallback محلي
        const local = mergeWithDefaults(readLocalWorkspaces());
        setWorkspaces(local);
        setActiveWorkspaceIdState(readActiveId(local));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel('workspaces-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLE }, async () => {
        const { data, error } = await supabase
          .from(TABLE)
          .select('*')
          .order('sort_order', { ascending: true });
        if (error || !data) return;
        const list = mergeWithDefaults(data.map(fromRow));
        setWorkspaces(list);
        try {
          localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
        } catch {
          /* ignore */
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(ACTIVE_KEY, activeWorkspaceId);
    } catch {
      /* ignore */
    }
  }, [activeWorkspaceId]);

  const visibleWorkspaces = useMemo(
    () => workspaces.filter((w) => !w.archived),
    [workspaces]
  );

  const setActiveWorkspaceId = useCallback(
    (id) => {
      if (id === ALL_WORKSPACES_ID) {
        setActiveWorkspaceIdState(ALL_WORKSPACES_ID);
        return;
      }
      const normalized = normalizeTaskContext(id);
      if (workspaces.some((w) => w.id === normalized && !w.archived)) {
        setActiveWorkspaceIdState(normalized);
      }
    },
    [workspaces]
  );

  const isAllMode = activeWorkspaceId === ALL_WORKSPACES_ID;

  const activeWorkspace = isAllMode
    ? {
        id: ALL_WORKSPACES_ID,
        label: 'الكل',
        icon: 'ph-squares-four',
        color: 'var(--text-primary)',
        bg: 'var(--border-color)',
        isDefault: false,
        archived: false,
        trait: '',
      }
    : workspaces.find((w) => w.id === activeWorkspaceId) ||
      visibleWorkspaces[0] ||
      DEFAULT_WORKSPACES[0];

  const writeContextId = isAllMode
    ? visibleWorkspaces[0]?.id || 'work'
    : activeWorkspaceId;

  const persistCache = (list) => {
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
    } catch {
      /* ignore */
    }
  };

  const addWorkspace = useCallback(async ({ name, icon, colorIndex, trait }) => {
    const label = String(name || '').trim();
    if (!label) return null;

    let id = slugifyWorkspaceName(label);
    setWorkspaces((prev) => {
      const existingIds = new Set(prev.map((w) => w.id));
      if (existingIds.has(id)) id = `${id}-${Date.now().toString(36).slice(-4)}`;
      return prev;
    });

    // إعادة حساب id بشكل متزامن
    let finalId = slugifyWorkspaceName(label);
    const existing = workspaces.map((w) => w.id);
    if (existing.includes(finalId)) {
      finalId = `${finalId}-${Date.now().toString(36).slice(-4)}`;
    }

    const palette =
      WORKSPACE_COLORS[(colorIndex ?? workspaces.length) % WORKSPACE_COLORS.length];
    const next = {
      id: finalId,
      label,
      icon: icon || WORKSPACE_ICONS[workspaces.length % WORKSPACE_ICONS.length],
      color: palette.color,
      bg: palette.bg,
      isDefault: false,
      archived: false,
      trait: typeof trait === 'string' ? trait.trim() : '',
      sortOrder: workspaces.length,
    };

    setWorkspaces((prev) => {
      const list = [...prev, next];
      persistCache(list);
      return list;
    });
    setActiveWorkspaceIdState(finalId);

    const { error } = await supabase.from(TABLE).upsert(toRow(next, next.sortOrder));
    if (error) {
      console.error(error);
      setSyncError(error.message);
    }
    return { id: finalId, label };
  }, [workspaces]);

  const updateWorkspace = useCallback(async (id, patch) => {
    let updated = null;
    setWorkspaces((prev) => {
      const list = prev.map((w) => {
        if (w.id !== id) return w;
        const next = { ...w };
        if (patch.label != null) {
          const label = String(patch.label).trim();
          if (label) next.label = label;
        }
        if (patch.icon) next.icon = patch.icon;
        if (patch.colorIndex != null) {
          const palette = WORKSPACE_COLORS[patch.colorIndex % WORKSPACE_COLORS.length];
          next.color = palette.color;
          next.bg = palette.bg;
        }
        if (patch.color) next.color = patch.color;
        if (patch.bg) next.bg = patch.bg;
        if (patch.trait !== undefined) next.trait = String(patch.trait || '').trim();
        updated = next;
        return next;
      });
      persistCache(list);
      return list;
    });

    if (updated) {
      const { error } = await supabase
        .from(TABLE)
        .update(toRow(updated, updated.sortOrder))
        .eq('id', id);
      if (error) {
        console.error(error);
        setSyncError(error.message);
      }
    }
  }, []);

  const archiveWorkspace = useCallback(async (id) => {
    if (id === 'work' || id === 'personal') return false;

    setWorkspaces((prev) => {
      const list = prev.map((w) => (w.id === id ? { ...w, archived: true } : w));
      persistCache(list);
      return list;
    });
    setActiveWorkspaceIdState((cur) => (cur === id ? ALL_WORKSPACES_ID : cur));

    const { error } = await supabase
      .from(TABLE)
      .update({ archived: true, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      console.error(error);
      setSyncError(error.message);
    }
    return true;
  }, []);

  const restoreWorkspace = useCallback(async (id) => {
    setWorkspaces((prev) => {
      const list = prev.map((w) => (w.id === id ? { ...w, archived: false } : w));
      persistCache(list);
      return list;
    });

    const { error } = await supabase
      .from(TABLE)
      .update({ archived: false, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      console.error(error);
      setSyncError(error.message);
    }
  }, []);

  const reorderWorkspaces = useCallback(async (draggedId, targetId) => {
    if (draggedId === targetId) return;

    let ordered = null;
    setWorkspaces((prev) => {
      const list = [...prev];
      const fromIdx = list.findIndex((w) => w.id === draggedId);
      const toIdx = list.findIndex((w) => w.id === targetId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const [moved] = list.splice(fromIdx, 1);
      const insertAt = list.findIndex((w) => w.id === targetId);
      list.splice(insertAt, 0, moved);
      ordered = list.map((w, i) => ({ ...w, sortOrder: i }));
      persistCache(ordered);
      return ordered;
    });

    if (ordered) {
      await Promise.all(
        ordered.map((w, i) =>
          supabase
            .from(TABLE)
            .update({ sort_order: i, updated_at: new Date().toISOString() })
            .eq('id', w.id)
        )
      );
    }
  }, []);

  return {
    workspaces,
    visibleWorkspaces,
    activeWorkspaceId,
    activeWorkspace,
    isAllMode,
    writeContextId,
    loading,
    syncError,
    setActiveWorkspaceId,
    addWorkspace,
    updateWorkspace,
    archiveWorkspace,
    restoreWorkspace,
    reorderWorkspaces,
  };
}
