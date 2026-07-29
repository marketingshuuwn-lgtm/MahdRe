import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { ToastProvider } from './hooks/useToast.jsx';
import './index.css';
import './styles/trello.css';
import './styles/workspaces.css';
import './styles/archive.css';
import './styles/today.css';
import './styles/layout-1400.css';
import './styles/design-system.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </React.StrictMode>
);
