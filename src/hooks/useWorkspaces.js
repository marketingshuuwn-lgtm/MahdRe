import { useCallback, useEffect, useState } from 'react';
import {
  DEFAULT_WORKSPACES,
  WORKSPACE_COLORS,
  WORKSPACE_ICONS,
  normalizeTaskContext,
  slugifyWorkspaceName,
} from '../utils/taskMeta';

const WORKSPACES_KEY = 'mahd_workspaces_v1';
const ACTIVE_KEY = 'mahd_active_workspace_v1';

function readWorkspaces() {
  try {
    const raw = localStorage.getItem(WORKSPACES_KEY);
    if (!raw) return DEFAULT_WORKSPACES.map((w) => ({ ...w }));
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return DEFAULT_WORKSPACES.map((w) => ({ ...w }));
    }
    const cleaned = parsed
      .filter((w) => w && typeof w.id === 'string' && w.id.trim())
      .map((w) => ({
        id: normalizeTaskContext(w.id),
        label: String(w.label || w.id).trim() || w.id,
        icon: w.icon || 'ph-folder',
        color: w.color || 'var(--accent)',
        bg: w.bg || 'var(--accent-light)',
        isDefault: Boolean(w.isDefault),
      }));
    // ضمان وجود work و personal
    const ids = new Set(cleaned.map((w) => w.id));
    for (const def of DEFAULT_WORKSPACES) {
      if (!ids.has(def.id)) cleaned.unshift({ ...def });
    }
    return cleaned;
  } catch {
    return DEFAULT_WORKSPACES.map((w) => ({ ...w }));
  }
}

function readActiveId(workspaces) {
  try {
    const raw = localStorage.getItem(ACTIVE_KEY);
    if (raw && workspaces.some((w) => w.id === raw)) return raw;
  } catch {
    /* ignore */
  }
  return 'work';
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

  const setActiveWorkspaceId = useCallback(
    (id) => {
      const normalized = normalizeTaskContext(id);
      if (workspaces.some((w) => w.id === normalized)) {
        setActiveWorkspaceIdState(normalized);
      }
    },
    [workspaces]
  );

  const activeWorkspace =
    workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0] || DEFAULT_WORKSPACES[0];

  const addWorkspace = useCallback(
    ({ name, icon, colorIndex }) => {
      const label = String(name || '').trim();
      if (!label) return null;

      let id = slugifyWorkspaceName(label);
      const existingIds = new Set(workspaces.map((w) => w.id));
      if (existingIds.has(id)) {
        id = `${id}-${Date.now().toString(36).slice(-4)}`;
      }

      const palette = WORKSPACE_COLORS[(colorIndex ?? workspaces.length) % WORKSPACE_COLORS.length];
      const next = {
        id,
        label,
        icon: icon || WORKSPACE_ICONS[workspaces.length % WORKSPACE_ICONS.length],
        color: palette.color,
        bg: palette.bg,
        isDefault: false,
      };

      setWorkspaces((prev) => [...prev, next]);
      setActiveWorkspaceIdState(id);
      return next;
    },
    [workspaces]
  );

  const renameWorkspace = useCallback((id, name) => {
    const label = String(name || '').trim();
    if (!label) return;
    setWorkspaces((prev) => prev.map((w) => (w.id === id ? { ...w, label } : w)));
  }, []);

  return {
    workspaces,
    activeWorkspaceId,
    activeWorkspace,
    setActiveWorkspaceId,
    addWorkspace,
    renameWorkspace,
  };
}
