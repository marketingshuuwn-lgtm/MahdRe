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
const ACTIVE_KEY = 'mahd_active_workspace_v1';
const LEGACY_KEY = 'mahd_workspaces_v1';
const MIGRATED_KEY = 'mahd_workspaces_migrated_v1';

function fromRow(row) {
  return {
    id: normalizeTaskContext(row.id),
    label: String(row.label || row.id).trim() || row.id,
    icon: row.icon || 'ph-folder',
    color: row.color || 'var(--accent)',
    bg: row.bg || 'var(--accent-light)',
    isDefault: Boolean(row.is_default),
    archived: Boolean(row.archived),
    trait: typeof row.trait === 'string' ? row.trait : '',
    sortOrder: row.sort_order ?? 0,
  };
}

function toRow(ws, sortOrder) {
  return {
    id: ws.id,
    label: ws.label,
    icon: ws.icon || 'ph-folder',
    color: ws.color || 'var(--accent)',
    bg: ws.bg || 'var(--accent-light)',
    is_default: Boolean(ws.isDefault),
    archived: Boolean(ws.archived),
    trait: ws.trait || '',
    sort_order: sortOrder ?? ws.sortOrder ?? 0,
    updated_at: new Date().toISOString(),
  };
}

function readLegacyLocal() {
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
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
    return [];
  }
}

function readActiveId(list) {
  try {
    const raw = localStorage.getItem(ACTIVE_KEY);
    if (raw === ALL_WORKSPACES_ID) return ALL_WORKSPACES_ID;
    if (raw && list.some((w) => w.id === raw && !w.archived)) return raw;
  } catch {
    /* ignore */
  }
  const first = list.find((w) => !w.archived);
  return first?.id || 'work';
}

function ensureDefaults(list) {
  const ids = new Set(list.map((w) => w.id));
  const next = [...list];
  for (const def of DEFAULT_WORKSPACES) {
    if (!ids.has(def.id)) {
      next.unshift({ ...def, archived: false, trait: '', sortOrder: 0 });
    }
  }
  return next;
}

export function useWorkspaces() {
  const [workspaces, setWorkspaces] = useState(() =>
    ensureDefaults(
      DEFAULT_WORKSPACES.map((w, i) => ({ ...w, archived: false, trait: '', sortOrder: i }))
    )
  );
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState(ALL_WORKSPACES_ID);
  const [loading, setLoading] = useState(true);
  const [cloudReady, setCloudReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from(TABLE)
          .select('*')
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: true });

        if (error) throw error;

        let list = (data ?? []).map(fromRow);

        if (list.length === 0) {
          const legacy = readLegacyLocal();
          const seed =
            legacy.length > 0
              ? ensureDefaults(legacy)
              : DEFAULT_WORKSPACES.map((w, i) => ({
                  ...w,
                  archived: false,
                  trait: '',
                  sortOrder: i,
                }));

          const rows = seed.map((w, i) => toRow(w, i));
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
        } else {
          // دمج مساحات محلية قديمة غير موجودة في السحابة (مرة واحدة)
          try {
            if (!localStorage.getItem(MIGRATED_KEY)) {
              const legacy = readLegacyLocal();
              const existing = new Set(list.map((w) => w.id));
              const missing = legacy.filter((w) => !existing.has(w.id));
              if (missing.length > 0) {
                const baseOrder = list.length;
                const rows = missing.map((w, i) => toRow(w, baseOrder + i));
                const { data: extra } = await supabase
                  .from(TABLE)
                  .upsert(rows, { onConflict: 'id' })
                  .select();
                if (extra?.length) list = [...list, ...extra.map(fromRow)];
              }
              localStorage.setItem(MIGRATED_KEY, '1');
            }
          } catch {
            /* ignore migration soft-fail */
          }
        }

        list = ensureDefaults(list).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

        if (!cancelled) {
          setWorkspaces(list);
          setActiveWorkspaceIdState(readActiveId(list));
          setCloudReady(true);
        }
      } catch (err) {
        console.error('[workspaces]', err);
        // سقوط آمن: محلي + افتراضي
        const legacy = ensureDefaults(readLegacyLocal());
        const fallback =
          legacy.length > 0
            ? legacy
            : DEFAULT_WORKSPACES.map((w, i) => ({
                ...w,
                archived: false,
                trait: '',
                sortOrder: i,
              }));
        if (!cancelled) {
          setWorkspaces(fallback);
          setActiveWorkspaceIdState(readActiveId(fallback));
          setCloudReady(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    boot();

    const channel = supabase
      .channel('workspaces-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLE }, () => {
        supabase
          .from(TABLE)
          .select('*')
          .order('sort_order', { ascending: true })
          .then(({ data, error }) => {
            if (error || cancelled) return;
            const list = ensureDefaults((data ?? []).map(fromRow));
            setWorkspaces(list);
          });
      })
      .subscribe();

    return () => {
      cancelled = true;
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

  const addWorkspace = useCallback(async ({ name, icon, colorIndex, trait }) => {
    const label = String(name || '').trim();
    if (!label) return null;

    let id = slugifyWorkspaceName(label);
    const existingIds = new Set(workspaces.map((w) => w.id));
    if (existingIds.has(id)) {
      id = id + '-' + Date.now().toString(36).slice(-4);
    }

    const palette = WORKSPACE_COLORS[(colorIndex ?? workspaces.length) % WORKSPACE_COLORS.length];
    const next = {
      id,
      label,
      icon: icon || WORKSPACE_ICONS[workspaces.length % WORKSPACE_ICONS.length],
      color: palette.color,
      bg: palette.bg,
      isDefault: false,
      archived: false,
      trait: typeof trait === 'string' ? trait.trim() : '',
      sortOrder: workspaces.length,
    };

    setWorkspaces((prev) => [...prev, next]);
    setActiveWorkspaceIdState(id);

    const { error } = await supabase.from(TABLE).upsert(toRow(next, next.sortOrder));
    if (error) {
      console.error(error);
      setWorkspaces((prev) => prev.filter((w) => w.id !== id));
      return null;
    }
    return { id, label };
  }, [workspaces]);

  const updateWorkspace = useCallback(async (id, patch) => {
    let updated = null;
    setWorkspaces((prev) =>
      prev.map((w) => {
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
      })
    );

    if (updated) {
      const { error } = await supabase.from(TABLE).upsert(toRow(updated, updated.sortOrder));
      if (error) console.error(error);
    }
  }, []);

  const archiveWorkspace = useCallback(
    async (id) => {
      if (id === 'work' || id === 'personal') return false;
      setWorkspaces((prev) =>
        prev.map((w) => (w.id === id ? { ...w, archived: true } : w))
      );
      setActiveWorkspaceIdState((cur) => (cur === id ? ALL_WORKSPACES_ID : cur));

      const { error } = await supabase
        .from(TABLE)
        .update({ archived: true, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) {
        console.error(error);
        return false;
      }
      return true;
    },
    []
  );

  const restoreWorkspace = useCallback(async (id) => {
    setWorkspaces((prev) =>
      prev.map((w) => (w.id === id ? { ...w, archived: false } : w))
    );
    const { error } = await supabase
      .from(TABLE)
      .update({ archived: false, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) console.error(error);
  }, []);

  const reorderWorkspaces = useCallback(async (draggedId, targetId) => {
    if (draggedId === targetId) return;

    let nextList = null;
    setWorkspaces((prev) => {
      const list = [...prev];
      const fromIdx = list.findIndex((w) => w.id === draggedId);
      const toIdx = list.findIndex((w) => w.id === targetId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const [moved] = list.splice(fromIdx, 1);
      const insertAt = list.findIndex((w) => w.id === targetId);
      list.splice(insertAt, 0, moved);
      nextList = list.map((w, i) => ({ ...w, sortOrder: i }));
      return nextList;
    });

    if (nextList) {
      await Promise.all(
        nextList.map((w, i) =>
          supabase.from(TABLE).update({ sort_order: i, updated_at: new Date().toISOString() }).eq('id', w.id)
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
    setActiveWorkspaceId,
    addWorkspace,
    updateWorkspace,
    archiveWorkspace,
    restoreWorkspace,
    reorderWorkspaces,
    loading,
    cloudReady,
  };
}
