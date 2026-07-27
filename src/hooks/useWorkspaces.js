import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_WORKSPACES,
  WORKSPACE_COLORS,
  WORKSPACE_ICONS,
  ALL_WORKSPACES_ID,
  normalizeTaskContext,
  slugifyWorkspaceName,
} from '../utils/taskMeta';

const WORKSPACES_KEY = 'mahd_workspaces_v1';
const ACTIVE_KEY = 'mahd_active_workspace_v1';

function readWorkspaces() {
  try {
    const raw = localStorage.getItem(WORKSPACES_KEY);
    if (!raw) return DEFAULT_WORKSPACES.map((w) => ({ ...w, archived: false }));
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return DEFAULT_WORKSPACES.map((w) => ({ ...w, archived: false }));
    }
    const cleaned = parsed
      .filter((w) => w && typeof w.id === 'string' && w.id.trim() && w.id !== ALL_WORKSPACES_ID)
      .map((w) => ({
        id: normalizeTaskContext(w.id),
        label: String(w.label || w.id).trim() || w.id,
        icon: w.icon || 'ph-folder',
        color: w.color || 'var(--accent)',
        bg: w.bg || 'var(--accent-light)',
        isDefault: Boolean(w.isDefault),
        archived: Boolean(w.archived),
      }));
    const ids = new Set(cleaned.map((w) => w.id));
    for (const def of DEFAULT_WORKSPACES) {
      if (!ids.has(def.id)) cleaned.unshift({ ...def, archived: false });
    }
    return cleaned;
  } catch {
    return DEFAULT_WORKSPACES.map((w) => ({ ...w, archived: false }));
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

export function useWorkspaces() {
  const [workspaces, setWorkspaces] = useState(readWorkspaces);
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState(() =>
    readActiveId(readWorkspaces())
  );

  useEffect(() => {
    localStorage.setItem(WORKSPACES_KEY, JSON.stringify(workspaces));
  }, [workspaces]);

  useEffect(() => {
    localStorage.setItem(ACTIVE_KEY, activeWorkspaceId);
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
      }
    : workspaces.find((w) => w.id === activeWorkspaceId) ||
      visibleWorkspaces[0] ||
      DEFAULT_WORKSPACES[0];

  /** مساحة حقيقية للإضافة عند وضع «الكل» */
  const writeContextId = isAllMode
    ? visibleWorkspaces[0]?.id || 'work'
    : activeWorkspaceId;

  const addWorkspace = useCallback(({ name, icon, colorIndex }) => {
    const label = String(name || '').trim();
    if (!label) return null;

    let id = slugifyWorkspaceName(label);
    setWorkspaces((prev) => {
      const existingIds = new Set(prev.map((w) => w.id));
      if (existingIds.has(id)) {
        id = `${id}-${Date.now().toString(36).slice(-4)}`;
      }
      const palette = WORKSPACE_COLORS[(colorIndex ?? prev.length) % WORKSPACE_COLORS.length];
      const next = {
        id,
        label,
        icon: icon || WORKSPACE_ICONS[prev.length % WORKSPACE_ICONS.length],
        color: palette.color,
        bg: palette.bg,
        isDefault: false,
        archived: false,
      };
      return [...prev, next];
    });
    setActiveWorkspaceIdState(id);
    return { id, label };
  }, []);

  const updateWorkspace = useCallback((id, patch) => {
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
        return next;
      })
    );
  }, []);

  /** أرشفة المساحة من الواجهة فقط — لا حذف. المهام تُدار من App عبر archiveTasksInContext */
  const archiveWorkspace = useCallback(
    (id) => {
      if (id === 'work' || id === 'personal') return false;
      setWorkspaces((prev) =>
        prev.map((w) => (w.id === id ? { ...w, archived: true } : w))
      );
      setActiveWorkspaceIdState((cur) => (cur === id ? ALL_WORKSPACES_ID : cur));
      return true;
    },
    []
  );

  const restoreWorkspace = useCallback((id) => {
    setWorkspaces((prev) =>
      prev.map((w) => (w.id === id ? { ...w, archived: false } : w))
    );
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
  };
}
