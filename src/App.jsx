import { useEffect, useMemo, useRef, useState } from 'react';
import Sidebar from './components/Sidebar';
import FloatingSmartBar from './components/QuickAdd';
import QuadrantBoard from './components/QuadrantBoard';
import TimelineView from './components/TimelineView';
import GanttView from './components/GanttView';
import PendingView from './components/PendingView';
import KpiView from './components/KpiView';
import BreakSpace from './components/BreakSpace';
import FloatingTimer from './components/FloatingTimer';
import TimeTrackingSync from './components/TimeTrackingSync';
import SettingsView from './components/SettingsView';
import ArchiveView from './components/ArchiveView';
import NotepadView from './components/NotepadView';
import TaskModal from './components/TaskModal';
import NotesModal from './components/NotesModal';
import ShortcutsHelp from './components/ShortcutsHelp';
import LoadingSkeleton from './components/LoadingSkeleton';
import ViewSwitcher from './components/ViewSwitcher';
import WorkspaceSwitcher from './components/WorkspaceSwitcher';
import { useTasks } from './hooks/useTasks';
import { sendNotificationPreview, useLocalNotifications } from './hooks/useLocalNotifications';
import { useTrello } from './hooks/useTrello';
import { useToast } from './hooks/useToast';
import { useWorkDaysSetting } from './hooks/useWorkDaysSetting';
import { usePushNotifications } from './hooks/usePushNotifications';
import { useWorkspaces } from './hooks/useWorkspaces';
import { exportTasksAsCsv, exportTasksAsXlsx, readImportFile } from './utils/importExport';
import {
  ALL_WORKSPACES_ID,
  DEFAULT_WORK_DAYS,
  normalizeTaskContext,
  normalizeWorkDays,
} from './utils/taskMeta';

const THEME_KEY = 'mahd_theme_react_v1';
const NOTIFICATION_SETTINGS_KEY = 'mahd_notification_settings_v1';

const NAV_BY_DIGIT = {
  '1': 'Matrix',
  '2': 'Pending',
  '3': 'Kpi',
  '4': 'Motivation',
  '5': 'Notepad',
  '6': 'Archive',
  '7': 'Settings',
};

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

function isTypingTarget(el) {
  if (!el || !(el instanceof Element)) return false;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (el.isContentEditable) return true;
  return Boolean(el.closest?.('[contenteditable="true"]'));
}

const TRELLO_SYNC_ENABLED = true;

export default function App() {
  const showToast = useToast();
  const {
    tasks,
    loading,
    connected,
    addTask,
    updateTask,
    archiveTask,
    archiveTasksInContext,
    restoreTask,
    toggleComplete,
    setTaskStatus,
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
    visibleWorkspaces,
    activeWorkspaceId,
    activeWorkspace,
    isAllMode,
    writeContextId,
    setActiveWorkspaceId,
    addWorkspace,
    updateWorkspace,
    archiveWorkspace,
    reorderWorkspaces,
    ensureContextsFromTasks,
  } = useWorkspaces();

  const [view, setView] = useState('Matrix');
  const [subview, setSubview] = useState('Board');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || 'light');
  const { workDays, setWorkDays } = useWorkDaysSetting(showToast);
  const [notificationSettings, setNotificationSettings] = useState(readSavedNotificationSettings);
  const [notificationPermission, setNotificationPermission] = useState(getNotificationPermission);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [notesTarget, setNotesTarget] = useState(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const trelloAutoSynced = useRef(false);

  const openAddModal = () => {
    setEditingTaskId(null);
    setModalOpen(true);
  };
  const openEditModal = (id) => {
    setEditingTaskId(id);
    setModalOpen(true);
  };
  const closeModal = () => setModalOpen(false);

  useEffect(() => {
    if (!tasks.length) return;
    ensureContextsFromTasks(tasks.map((t) => t.context));
  }, [tasks, ensureContextsFromTasks]);

  useEffect(() => {
    const handler = (e) => setNotesTarget(e.detail);
    window.addEventListener('open-task-notes', handler);
    return () => window.removeEventListener('open-task-notes', handler);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (shortcutsOpen) {
          e.preventDefault();
          setShortcutsOpen(false);
          return;
        }
        if (notesTarget) {
          e.preventDefault();
          setNotesTarget(null);
          return;
        }
        if (modalOpen) {
          e.preventDefault();
          setModalOpen(false);
          return;
        }
        if (sidebarOpen) {
          e.preventDefault();
          setSidebarOpen(false);
        }
        return;
      }

      if (!e.altKey && !e.ctrlKey && !e.metaKey && (e.key === '?' || e.key === '/')) {
        if (isTypingTarget(e.target)) return;
        e.preventDefault();
        setShortcutsOpen((v) => !v);
        return;
      }

      if (!e.altKey || e.ctrlKey || e.metaKey) return;
      if (isTypingTarget(e.target) && e.key !== 'Escape') return;

      const k = e.key;

      if (k === 'g' || k === 'G' || k === '4') {
        e.preventDefault();
        setView('Motivation');
        setSidebarOpen(false);
        return;
      }

      if (k === 'n' || k === 'N') {
        e.preventDefault();
        openAddModal();
        return;
      }

      if (NAV_BY_DIGIT[k]) {
        e.preventDefault();
        setView(NAV_BY_DIGIT[k]);
        setSidebarOpen(false);
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [shortcutsOpen, notesTarget, modalOpen, sidebarOpen]);

  useEffect(() => {
    if (view === 'Trello') setView('Settings');
  }, [view]);

  const spaceTasks = useMemo(() => {
    if (isAllMode) return tasks;
    return tasks.filter((t) => normalizeTaskContext(t.context) === activeWorkspaceId);
  }, [tasks, activeWorkspaceId, isAllMode]);

  const visibleTasks = useMemo(
    () => spaceTasks.filter((t) => !t.archived),
    [spaceTasks]
  );

  const trelloPageTasks = useMemo(
    () => tasks.filter((t) => !t.archived && t.externalSource === 'trello'),
    [tasks]
  );

  const archivedTasks = useMemo(
    () => spaceTasks.filter((t) => t.archived),
    [spaceTasks]
  );

  useEffect(() => {
    if (theme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.removeAttribute('data-theme');
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(
      NOTIFICATION_SETTINGS_KEY,
      JSON.stringify(normalizeNotificationSettings(notificationSettings))
    );
  }, [notificationSettings]);

  useLocalNotifications(visibleTasks, workDays, notificationSettings);
  const push = usePushNotifications(showToast);

  useEffect(() => {
    if (!TRELLO_SYNC_ENABLED) return;
    if (!trello.isConnected || trello.loading) return;
    if (trelloAutoSynced.current) return;
    trelloAutoSynced.current = true;
    trello.syncNow({ silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trello.isConnected, trello.loading]);

  const editingTask = useMemo(
    () => tasks.find((t) => t.id === editingTaskId) || null,
    [tasks, editingTaskId]
  );

  const pendingCount = visibleTasks.filter((t) => !t.completed).length;
  const trelloCount = trelloPageTasks.filter((t) => !t.completed).length;
  const archiveCount = archivedTasks.length;

  const trelloForUi = {
    ...trello,
    syncNow: TRELLO_SYNC_ENABLED
      ? trello.syncNow
      : async () => {
          showToast('مزامنة تريلو متوقفة مؤقتاً', 'ph-pause');
          return { created: 0, updated: 0 };
        },
  };

  const handleSaveTask = (form, id) => {
    const extra = {
      recurrence: form.recurrence || null,
      recurrenceDays: form.recurrenceDays || [],
      context: form.context || writeContextId,
      subtasks: form.subtasks || [],
      status: form.status || 'not_started',
    };
    if (id) {
      updateTask(id, form.title, form.quadrant, form.dueDate, form.notes, form.duration, extra);
    } else {
      addTask(form.title, form.quadrant, form.dueDate, form.notes, form.duration, extra);
    }
    closeModal();
  };

  const handleCreateWorkspace = ({ name, icon, colorIndex, trait }) => {
    const created = addWorkspace({ name, icon, colorIndex, trait });
    if (created) {
      showToast(`أُنشئت مساحة "${created.label}"`, 'ph-folder-plus');
    }
    return created;
  };

  const handleUpdateWorkspace = (id, patch) => {
    updateWorkspace(id, patch);
    showToast('تم تحديث المساحة', 'ph-pencil-simple');
  };

  const handleArchiveSpace = async (id) => {
    const okTasks = await archiveTasksInContext(id);
    if (!okTasks) return;
    const okSpace = archiveWorkspace(id);
    if (okSpace) {
      showToast('أُرشفت المساحة ومهامها النشطة', 'ph-archive');
    }
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
    if (isAllMode || activeWorkspaceId === ALL_WORKSPACES_ID) {
      showToast('اختر مساحة محددة للاستيراد', 'ph-warning', 'error');
      return;
    }
    try {
      const imported = await readImportFile(file);
      if (imported.length === 0) {
        showToast('الملف فارغ أو غير صالح', 'ph-warning', 'error');
        return;
      }
      const spaceLabel = activeWorkspace?.label || activeWorkspaceId;
      const currentCount = visibleTasks.length;
      const confirmed = window.confirm(
        `سيتم أرشفة مهام مساحة «${spaceLabel}» النشطة (${currentCount}) وإضافة ${imported.length} مهمة جديدة.\n\nلا يُحذف شيء من قاعدة البيانات.\n\nهل أنت متأكد؟`
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
      <div className="full-center" style={{ padding: 24 }}>
        <LoadingSkeleton />
        <p style={{ color: 'var(--text-secondary)', marginTop: 12, textAlign: 'center' }}>
          جاري تحميل المهام…
        </p>
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
    <div className="app-container">
      <div className="mobile-header">
        <div className="logo-area" style={{ marginBottom: 0 }}>
          <div className="logo-icon" style={{ width: 36, height: 36 }}>
            <img src="/logo.svg" alt="مهد" className="logo-icon-img" />
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
        archiveCount={archiveCount}
        totalCount={visibleTasks.length}
        connected={connected}
        onExport={handleExport}
        onImportFile={handleImportFile}
      />

      <main className="main-content">
        <WorkspaceSwitcher
          workspaces={visibleWorkspaces}
          activeWorkspaceId={activeWorkspaceId}
          onSwitch={setActiveWorkspaceId}
          onCreate={handleCreateWorkspace}
          onUpdate={handleUpdateWorkspace}
          onArchiveSpace={handleArchiveSpace}
          onReorder={reorderWorkspaces}
          isAllMode={isAllMode}
        />

        <div className="view-transition" key={view}>
        {view === 'Matrix' && (
          <div id="viewMatrix">
            <div className="matrix-topbar">
              <ViewSwitcher subview={subview} onSwitch={setSubview} />
            </div>

            {subview === 'Board' && (
              <QuadrantBoard
                tasks={visibleTasks}
                onToggleComplete={toggleComplete}
                onSetStatus={setTaskStatus}
                onToggleSubtask={toggleSubtask}
                onEdit={openEditModal}
                onDelete={archiveTask}
                onMoveTask={moveTask}
                onReorderInQuadrant={reorderInQuadrant}
                onAddTask={openAddModal}
                workDays={workDays}
                workspaces={workspaces}
              />
            )}
            {subview === 'Timeline' && (
              <TimelineView
                tasks={visibleTasks}
                onToggleComplete={toggleComplete}
                onSetStatus={setTaskStatus}
                onToggleSubtask={toggleSubtask}
                onEdit={openEditModal}
                onDelete={archiveTask}
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
            onSetStatus={setTaskStatus}
            onToggleSubtask={toggleSubtask}
            onEdit={openEditModal}
            onDelete={archiveTask}
            onAddTask={openAddModal}
            workDays={workDays}
            workspaces={workspaces}
          />
        )}

        {view === 'Kpi' && (
          <KpiView tasks={visibleTasks} workspaces={visibleWorkspaces} />
        )}

        {view === 'Motivation' && <BreakSpace tasks={visibleTasks} showToast={showToast} />}

        {view === 'Notepad' && <NotepadView showToast={showToast} />}

        {view === 'Archive' && (
          <ArchiveView
            tasks={archivedTasks}
            onRestore={restoreTask}
            onEdit={openEditModal}
            workDays={workDays}
            workspaces={workspaces}
            workspaceLabel={isAllMode ? 'كل المساحات' : activeWorkspace?.label || activeWorkspaceId}
          />
        )}

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
            pushSupported={push.supported}
            pushSubscribed={push.subscribed}
            pushLoading={push.loading}
            onSubscribePush={push.subscribe}
            onUnsubscribePush={push.unsubscribe}
            onSendTestPush={push.sendTestPush}
            trello={trelloForUi}
            trelloTasks={trelloPageTasks}
            onToggleComplete={toggleComplete}
            onSetStatus={setTaskStatus}
            onToggleSubtask={toggleSubtask}
            onEdit={openEditModal}
            onDelete={archiveTask}
            onMoveTask={moveTask}
            workDaysForTrello={workDays}
            onExport={handleExport}
            onImportFile={handleImportFile}
          />
        )}
        </div>
      </main>

      <FloatingSmartBar
        onAddTask={addTask}
        onOpenAdvanced={openAddModal}
        activeContext={writeContextId}
      />

      <TaskModal
        isOpen={modalOpen}
        task={editingTask}
        onClose={closeModal}
        onSave={handleSaveTask}
        workDays={workDays}
        defaultContext={writeContextId}
        workspaces={visibleWorkspaces}
      />

      <FloatingTimer />
      <TimeTrackingSync />
      <NotesModal
        isOpen={Boolean(notesTarget)}
        taskId={notesTarget?.taskId}
        taskTitle={notesTarget?.title}
        onClose={() => setNotesTarget(null)}
        showToast={showToast}
      />
      <ShortcutsHelp isOpen={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </div>
  );
}
