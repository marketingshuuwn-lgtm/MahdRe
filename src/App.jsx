import { useEffect, useMemo, useState } from 'react';
import Sidebar from './components/Sidebar';
import FloatingSmartBar from './components/QuickAdd';
import QuadrantBoard from './components/QuadrantBoard';
import TimelineView from './components/TimelineView';
import GanttView from './components/GanttView';
import PendingView from './components/PendingView';
import KpiView from './components/KpiView';
import MotivationView from './components/MotivationView';
import FloatingTimer from './components/FloatingTimer';
import TrelloView from './components/TrelloView';
import SettingsView from './components/SettingsView';
import TaskModal from './components/TaskModal';
import ViewSwitcher from './components/ViewSwitcher';
import WorkspaceSwitcher from './components/WorkspaceSwitcher';
import { useTasks } from './hooks/useTasks';
import { sendNotificationPreview, useLocalNotifications } from './hooks/useLocalNotifications';
import { useTrello } from './hooks/useTrello';
import { useToast } from './hooks/useToast';
import { useWorkDaysSetting } from './hooks/useWorkDaysSetting';
import { useWorkspaces } from './hooks/useWorkspaces';
import { exportTasksAsCsv, exportTasksAsXlsx, readImportFile } from './utils/importExport';
import { DEFAULT_WORK_DAYS, normalizeTaskContext, normalizeWorkDays } from './utils/taskMeta';

const THEME_KEY = 'mahd_theme_react_v1';
const SIDEBAR_KEY = 'mahd_sidebar_compact';
const NOTIFICATION_SETTINGS_KEY = 'mahd_notification_settings_v1';

const DEFAULT_NOTIFICATION_SETTINGS = {
  enabled: false,
  morningSummary: true,
  morningTime: '10:00',
  eveningReview: true,
  eveningTime: '20:00',
  activeDays: DEFAULT_WORK_DAYS,
};

function normalizeNotificationSettings(value) {
  return {
    ...DEFAULT_NOTIFICATION_SETTINGS,
    ...(value || {}),
    activeDays: normalizeWorkDays(value?.activeDays || DEFAULT_NOTIFICATION_SETTINGS.activeDays),
  };
}

function readSavedNotificationSettings() {
  try {
    const raw = localStorage.getItem(NOTIFICATION_SETTINGS_KEY);
    if (!raw) return DEFAULT_NOTIFICATION_SETTINGS;
    return normalizeNotificationSettings(JSON.parse(raw));
  } catch {
    return DEFAULT_NOTIFICATION_SETTINGS;
  }
}

function getNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

/** إيقاف مؤقت لمزامنة تريلو التلقائية — الكود والواجهة يبقيان */
const TRELLO_SYNC_ENABLED = false;

export default function App() {
  const showToast = useToast();
  const {
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
    replaceTasksInContext,
    refetch,
  } = useTasks(showToast);

  const trello = useTrello(showToast, () => refetch());
  const {
    workspaces,
    activeWorkspaceId,
    activeWorkspace,
    setActiveWorkspaceId,
    addWorkspace,
  } = useWorkspaces();

  const [view, setView] = useState('Matrix');
  const [subview, setSubview] = useState('Board');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCompact, setSidebarCompact] = useState(
    () => localStorage.getItem(SIDEBAR_KEY) === '1'
  );
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || 'light');
  const { workDays, setWorkDays } = useWorkDaysSetting(showToast);
  const [notificationSettings, setNotificationSettings] = useState(readSavedNotificationSettings);
  const [notificationPermission, setNotificationPermission] = useState(getNotificationPermission);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState(null);

  const visibleTasks = useMemo(
    () => tasks.filter((t) => normalizeTaskContext(t.context) === activeWorkspaceId),
    [tasks, activeWorkspaceId]
  );

  useEffect(() => {
    if (theme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.removeAttribute('data-theme');
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_KEY, sidebarCompact ? '1' : '0');
  }, [sidebarCompact]);

  useEffect(() => {
    localStorage.setItem(
      NOTIFICATION_SETTINGS_KEY,
      JSON.stringify(normalizeNotificationSettings(notificationSettings))
    );
  }, [notificationSettings]);

  useLocalNotifications(visibleTasks, workDays, notificationSettings);

  useEffect(() => {
    if (!TRELLO_SYNC_ENABLED) return;
    if (trello.isConnected && !trello.loading) {
      trello.syncNow();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trello.isConnected, trello.loading]);

  const editingTask = useMemo(
    () => tasks.find((t) => t.id === editingTaskId) || null,
    [tasks, editingTaskId]
  );

  const pendingCount = visibleTasks.filter((t) => !t.completed).length;
  const trelloCount = visibleTasks.filter((t) => t.externalSource === 'trello' && !t.completed).length;

  const openAddModal = () => {
    setEditingTaskId(null);
    setModalOpen(true);
  };
  const openEditModal = (id) => {
    setEditingTaskId(id);
    setModalOpen(true);
  };
  const closeModal = () => setModalOpen(false);

  const handleSaveTask = (form, id) => {
    const extra = {
      recurrence: form.recurrence || null,
      recurrenceDays: form.recurrenceDays || [],
      context: form.context || activeWorkspaceId,
      subtasks: form.subtasks || [],
    };
    if (id) {
      updateTask(id, form.title, form.quadrant, form.dueDate, form.notes, form.duration, extra);
    } else {
      addTask(form.title, form.quadrant, form.dueDate, form.notes, form.duration, extra);
    }
    closeModal();
  };

  const handleCreateWorkspace = ({ name, icon, colorIndex }) => {
    const created = addWorkspace({ name, icon, colorIndex });
    if (created) {
      showToast(`أُنشئت مساحة "${created.label}"`, 'ph-folder-plus');
    }
    return created;
  };

  const requestNotificationPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setNotificationPermission('unsupported');
      showToast('المتصفح لا يدعم إشعارات سطح المكتب', 'ph-warning', 'error');
      return 'unsupported';
    }

    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    if (permission === 'granted') {
      showToast('تم تفعيل إذن التنبيهات', 'ph-bell-ringing');
      setNotificationSettings((prev) => ({ ...prev, enabled: true }));
    } else {
      showToast('لم يتم منح إذن التنبيهات', 'ph-warning', 'error');
    }
    return permission;
  };

  const sendTestNotification = () => {
    const ok = sendNotificationPreview();
    if (!ok) showToast('فعّل إذن التنبيهات أولاً', 'ph-warning', 'error');
  };

  const handleExport = (format) => {
    if (format === 'csv') exportTasksAsCsv(visibleTasks);
    else exportTasksAsXlsx(visibleTasks);
  };

  const handleImportFile = async (file) => {
    try {
      const imported = await readImportFile(file);
      if (imported.length === 0) {
        showToast('الملف فارغ أو غير صالح', 'ph-warning', 'error');
        return;
      }
      const spaceLabel = activeWorkspace?.label || activeWorkspaceId;
      const currentCount = visibleTasks.length;
      const confirmed = window.confirm(
        `سيتم استبدال مهام مساحة «${spaceLabel}» فقط (${currentCount} مهمة) بـ ${imported.length} مهمة.\n\nالمساحات الأخرى لن تتأثر.\n\nهل أنت متأكد؟`
      );
      if (!confirmed) return;
      await replaceTasksInContext(activeWorkspaceId, imported);
    } catch (err) {
      console.error(err);
      showToast('حدث خطأ أثناء قراءة الملف', 'ph-x-circle', 'error');
    }
  };

  if (loading) {
    return (
      <div className="full-center">
        <div className="loading-spinner" />
        <p style={{ color: 'var(--text-secondary)' }}>جاري تحميل المهام…</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}} .loading-spinner{width:48px;height:48px;border:4px solid var(--border-color);border-top-color:var(--accent);border-radius:50%;animation:spin .75s linear infinite;margin:0 auto 16px}`}</style>
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="full-center" style={{ padding: 24 }}>
        <div className="card" style={{ maxWidth: 440, textAlign: 'center', padding: 36 }}>
          <h2 style={{ marginBottom: 12 }}>غير متصل بقاعدة البيانات</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>
            تأكد من ملف .env ثم أعد تشغيل npm run dev
          </p>
          <button type="button" className="btn-primary" onClick={() => refetch()} style={{ margin: '0 auto' }}>
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`app-container ${sidebarCompact ? 'sidebar-is-compact' : ''}`}>
      <div className="mobile-header">
        <div className="logo-area" style={{ marginBottom: 0 }}>
          <div className="logo-icon" style={{ width: 36, height: 36, fontSize: 18 }}>
            <i className="ph ph-tree-evergreen"></i>
          </div>
          <div className="logo-text" style={{ fontSize: 20 }}>
            مهد
          </div>
        </div>
        <button type="button" className="btn-icon" onClick={() => setSidebarOpen(true)}>
          <i className="ph ph-list" style={{ fontSize: 24 }}></i>
        </button>
      </div>

      <Sidebar
        view={view}
        onSwitchView={setView}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
        pendingCount={pendingCount}
        trelloCount={trelloCount}
        totalCount={visibleTasks.length}
        connected={connected}
        onExport={handleExport}
        onImportFile={handleImportFile}
        compact={sidebarCompact}
        onToggleCompact={() => setSidebarCompact((v) => !v)}
      />

      <main className="main-content">
        <WorkspaceSwitcher
          workspaces={workspaces}
          activeWorkspaceId={activeWorkspaceId}
          onSwitch={setActiveWorkspaceId}
          onCreate={handleCreateWorkspace}
        />

        {view === 'Matrix' && (
          <div id="viewMatrix">
            <div className="matrix-topbar">
              <ViewSwitcher subview={subview} onSwitch={setSubview} />
            </div>

            {subview === 'Board' && (
              <QuadrantBoard
                tasks={visibleTasks}
                onToggleComplete={toggleComplete}
                onToggleSubtask={toggleSubtask}
                onEdit={openEditModal}
                onDelete={deleteTask}
                onMoveTask={moveTask}
                onReorderInQuadrant={reorderInQuadrant}
                workDays={workDays}
              />
            )}
            {subview === 'Timeline' && (
              <TimelineView
                tasks={visibleTasks}
                onToggleComplete={toggleComplete}
                onToggleSubtask={toggleSubtask}
                onEdit={openEditModal}
                onDelete={deleteTask}
                onReschedule={rescheduleTask}
                workDays={workDays}
              />
            )}
            {subview === 'Gantt' && (
              <GanttView
                tasks={visibleTasks}
                onToggleComplete={toggleComplete}
                onEdit={openEditModal}
                onReschedule={rescheduleTask}
                workDays={workDays}
              />
            )}
          </div>
        )}

        {view === 'Pending' && (
          <PendingView
            tasks={visibleTasks}
            onToggleComplete={toggleComplete}
            onToggleSubtask={toggleSubtask}
            onEdit={openEditModal}
            onDelete={deleteTask}
            workDays={workDays}
          />
        )}

        {view === 'Trello' && (
          <TrelloView
            tasks={visibleTasks}
            trello={{
              ...trello,
              syncNow: TRELLO_SYNC_ENABLED
                ? trello.syncNow
                : async () => {
                    showToast('مزامنة تريلو متوقفة مؤقتاً', 'ph-pause');
                    return { created: 0, updated: 0 };
                  },
            }}
            onToggleComplete={toggleComplete}
            onToggleSubtask={toggleSubtask}
            onEdit={openEditModal}
            onDelete={deleteTask}
            onMoveTask={moveTask}
            workDays={workDays}
          />
        )}

        {view === 'Kpi' && <KpiView tasks={visibleTasks} />}

        {view === 'Motivation' && <MotivationView tasks={visibleTasks} />}

        {view === 'Settings' && (
          <SettingsView
            workDays={workDays}
            onChangeWorkDays={(days) => setWorkDays(days)}
            notificationSettings={notificationSettings}
            onChangeNotificationSettings={(next) =>
              setNotificationSettings((prev) => normalizeNotificationSettings({ ...prev, ...next }))
            }
            notificationPermission={notificationPermission}
            onRequestNotificationPermission={requestNotificationPermission}
            onSendTestNotification={sendTestNotification}
          />
        )}
      </main>

      <FloatingSmartBar
        onAddTask={addTask}
        onOpenAdvanced={openAddModal}
        activeContext={activeWorkspaceId}
      />

      <TaskModal
        isOpen={modalOpen}
        task={editingTask}
        onClose={closeModal}
        onSave={handleSaveTask}
        workDays={workDays}
        defaultContext={activeWorkspaceId}
        workspaces={workspaces}
      />

      <FloatingTimer />
    </div>
  );
}
