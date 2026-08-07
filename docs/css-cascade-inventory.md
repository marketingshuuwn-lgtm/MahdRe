# CSS Cascade Inventory — MahdRe (Phase 1)

**Branch:** `chore/css-unify-phase1`  
**Base:** `main` @ matrix-collapse + sidebar-rail  
**Import order (before):** see historical `src/main.jsx`  
**Import order (after this commit):** tokens → index → feature CSS → design-system (utils) → visual-polish → sidebar-rail

## Winner table (who wins *before* neutralization)

| Rule group | Defined in | Final winner (last import) | Notes |
|------------|------------|----------------------------|--------|
| Color / theme tokens (`--accent`, clay, dark) | `index.css` | `index.css` | design-system only overrides spacing vars |
| `--page-pad-*` | layout-1400, design-system | design-system (later) | layout-1400 loaded earlier |
| `.main-content` padding | index, layout-1400, design-system | design-system | triple definition |
| `.matrix-grid` gap | index (20px), layout-1400, design-system, visual-polish (16px) | **visual-polish** | noisy |
| `.quadrant-card.collapsed` / min-height / no nested scroll | **index.css** (fix commit) | index | **must stay single source** |
| `.drop-zone` max-height | layout-1400, design-system | design-system | **conflicts** with index (no max-height — page scroll) |
| `.task-item` shell | index (clay shadow) | visual-polish overrides bg/border | accent bar intentional |
| Old `.sidebar` / compact | index, design-system, visual-polish, sidebar-collapse | dead UI | App uses **`.sidebar-rail` only** |
| `.sidebar-rail` / `.rail-btn` | **sidebar-rail.css** | sidebar-rail (last) | **canonical nav** |
| Settings grid | index (2-col), visual-polish | visual-polish | keep polish |
| Floating bars | index, layout-1400, design-system | design-system / layout | minor drift |

## Canonical sources after Phase 1

| Concern | Source of truth |
|---------|-----------------|
| Tokens (color, type, space, radius) | `src/styles/tokens.css` |
| Components + matrix collapse behavior | `src/index.css` |
| Icon rail + view transition | `src/styles/sidebar-rail.css` |
| Task priority edge + settings density | `src/styles/visual-polish.css` |
| Focus rings, control heights, workspace chips | `src/styles/design-system.css` (no matrix/sidebar) |
| Feature islands | trello / workspaces / archive / break-space / task-notes / notepad / nav-data |
| Removed from cascade | `layout-1400.css`, `sidebar-collapse.css` (no longer imported) |

## Test checklist (3 min)

1. Matrix: collapse Q1 + Q4 — no dead empty rectangle.
2. Rail: icons, tooltips, active state, export menu.
3. Task card: colored edge + workspace badge.
4. Light / dark theme.
5. Viewport ≤900px: rail open/close.
