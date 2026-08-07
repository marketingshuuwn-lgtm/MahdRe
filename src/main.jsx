import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { ToastProvider } from './hooks/useToast.jsx';

/* 1. Base */
import './index.css';

/* 2. Feature modules */
import './styles/trello.css';
import './styles/workspaces.css';
import './styles/archive.css';
import './styles/break-space.css';
import './styles/task-notes.css';
import './styles/notepad.css';
import './styles/nav-data.css';

/* 3. Design system (tokens + controls — no matrix layout) */
import './styles/design-system.css';

/* 4. Shell spacing + floats */
import './styles/layout-shell.css';

/* 5. Navigation rail (sole sidebar source) */
import './styles/sidebar-rail.css';

/* 6. Matrix / TaskRow — sole source for task list layout */
import './styles/matrix-stack.css';

/* 7. Feature polish */
import './styles/settings-tabs.css';
import './styles/kpi-motion.css';
import './styles/shortcuts-help.css';
import './styles/ux-motion.css';

/* Deprecated stubs kept out of cascade (empty / @import only):
   layout-1400.css, visual-polish.css, sidebar-collapse.css */

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </React.StrictMode>
);
