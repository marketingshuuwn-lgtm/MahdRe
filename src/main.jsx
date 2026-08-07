import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { ToastProvider } from './hooks/useToast.jsx';
import './index.css';
import './styles/trello.css';
import './styles/workspaces.css';
import './styles/archive.css';
import './styles/layout-1400.css';
import './styles/design-system.css';
import './styles/break-space.css';
import './styles/task-notes.css';
import './styles/sidebar-collapse.css';
import './styles/notepad.css';
import './styles/nav-data.css';
import './styles/visual-polish.css';
import './styles/sidebar-rail.css';
import './styles/matrix-stack.css';
import './styles/settings-tabs.css';
import './styles/kpi-motion.css';
import './styles/shortcuts-help.css';
import './styles/ux-motion.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </React.StrictMode>
);
