import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { ToastProvider } from './hooks/useToast.jsx';

/* Cascade (Phase 1): tokens → components → features → utils → polish → rail last */
import './styles/tokens.css';
import './index.css';
import './styles/trello.css';
import './styles/workspaces.css';
import './styles/archive.css';
import './styles/break-space.css';
import './styles/task-notes.css';
import './styles/notepad.css';
import './styles/nav-data.css';
import './styles/design-system.css';
import './styles/visual-polish.css';
import './styles/sidebar-rail.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </React.StrictMode>
);
