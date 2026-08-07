import { useState } from 'react';
import TrelloView from './TrelloView';
import {
  ALL_WEEK_DAYS,
  DEFAULT_WORK_DAYS,
  WEEK_DAYS,
  formatWorkDays,
  normalizeWorkDays,
} from '../utils/taskMeta';

const PERMISSION_LABELS = {
  granted: 'مسموح',
  denied: 'محظور',
  default: 'لم يُطلب بعد',
  unsupported: 'غير مدعوم',
};

const TABS = [
  { id: 'general', label: 'عام', icon: 'ph-gear' },
  { id: 'workdays', label: 'أيام العمل', icon: 'ph-calendar-check' },
  { id: 'notifications', label: 'الإشعارات', icon: 'ph-bell-ringing' },
  { id: 'trello', label: 'تريلو', icon: 'ph-kanban' },
  { id: 'data', label: 'البيانات', icon: 'ph-database' },
];

export default function SettingsView({
  workDays,
  onChangeWorkDays,
  notificationSettings,
  onChangeNotificationSettings,
  notificationPermission,
  onRequestNotificationPermission,
  onSendTestNotification,
  pushSupported,
  pushSubscribed,
  pushLoading,
  onSubscribePush,
  onUnsubscribePush,
  onSendTestPush,
  trello,
  trelloTasks = [],
  onToggleComplete,
  onSetStatus,
  onToggleSubtask,
  onEdit,
  onDelete,
  onMoveTask,
  workDaysForTrello,
  onExport,
  onImportFile,
}) {
  const [tab, setTab] = useState('general');
  const normalizedWorkDays = normalizeWorkDays(workDays);
  const activeNotificationDays = normalizeWorkDays(
    notificationSettings?.activeDays || DEFAULT_WORK_DAYS
  );

  const setPreset = (days) => onChangeWorkDays(normalizeWorkDays(days));

  const toggleDay = (dayId) => {
    const hasDay = normalizedWorkDays.includes(dayId);
    const next = hasDay
      ? normalizedWorkDays.filter((d) => d !== dayId)
      : [...normalizedWorkDays, dayId].sort((a, b) => a - b);
    if (next.length === 0) return;
    onChangeWorkDays(next);
  };

  const toggleNotificationDay = (dayId) => {
    const hasDay = activeNotificationDays.includes(dayId);
    const next = hasDay
      ? activeNotificationDays.filter((d) => d !== dayId)
      : [...activeNotificationDays, dayId].sort((a, b) => a - b);
    if (next.length === 0) return;
    onChangeNotificationSettings({ activeDays: next });
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file && onImportFile) onImportFile(file);
  };

  return (
    <div className="settings-view">
      <div className="page-header">
        <div className="page-title">الإعدادات</div>
        <div className="page-desc">ضبط السلوك العام لمهد — بدون تمرير طويل فارغ</div>
      </div>

      <div className="settings-tabs" role="tablist" aria-label="أقسام الإعدادات">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`settings-tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <i className={`ph ${t.icon}`} />
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      <div className="settings-tab-panel" role="tabpanel">
        {tab === 'general' && (
          <section className="settings-panel-card">
            <h2 className="settings-panel-title">عن مهد</h2>
            <p className="settings-panel-text">
              مهد منصة إنتاجية شخصية: مصفوفة أولويات، مساحات عمل، تريلو باتجاه واحد، بومودورو،
              ومفكرة. الأرشفة بدل الحذف هي المعمارية الأساسية.
            </p>
            <ul className="settings-panel-list">
              <li>
                <i className="ph ph-squares-four" /> المساحات من الشريط العلوي (عمل / شخصي / علامة…)
              </li>
              <li>
                <i className="ph ph-keyboard" /> اختصار سريع: Alt+G لمساحة الاستراحة
              </li>
              <li>
                <i className="ph ph-palette" /> الثيم من أيقونة السكة الجانبية
              </li>
              <li>
                <i className="ph ph-archive" /> لا حذف نهائي للمهام — استخدم الأرشفة
              </li>
            </ul>
          </section>
        )}

        {tab === 'workdays' && (
          <section className="settings-panel-card">
            <h2 className="settings-panel-title">أيام العمل</h2>
            <p className="settings-panel-text">
              المهام ذات التكرار اليومي تظهر فقط في هذه الأيام. الافتراضي: الأحد إلى الخميس.
            </p>

            <div className="weekday-settings">
              {WEEK_DAYS.map((day) => (
                <button
                  key={day.id}
                  type="button"
                  className={`weekday-setting-btn ${normalizedWorkDays.includes(day.id) ? 'active' : ''}`}
                  onClick={() => toggleDay(day.id)}
                >
                  <span>{day.longLabel}</span>
                  {normalizedWorkDays.includes(day.id) && <i className="ph ph-check" />}
                </button>
              ))}
            </div>

            <div className="settings-summary">
              <i className="ph ph-info" />
              أيام العمل الحالية:{' '}
              <strong>{formatWorkDays(normalizedWorkDays, { long: true })}</strong>
            </div>

            <div className="settings-actions">
              <button type="button" className="btn-secondary" onClick={() => setPreset(DEFAULT_WORK_DAYS)}>
                الأحد–الخميس
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setPreset([0, 1, 2, 3, 4, 6])}
              >
                بدون الجمعة فقط
              </button>
              <button type="button" className="btn-secondary" onClick={() => setPreset(ALL_WEEK_DAYS)}>
                كل الأيام
              </button>
            </div>
          </section>
        )}

        {tab === 'notifications' && (
          <div className="settings-stack">
            <section className="settings-panel-card">
              <h2 className="settings-panel-title">تنبيهات محلية</h2>
              <p className="settings-panel-text">
                من المتصفح — أدق عندما يكون تبويب مهد مفتوحاً.
              </p>

              <div className="settings-summary">
                <i className="ph ph-shield-check" />
                إذن المتصفح:{' '}
                <strong>{PERMISSION_LABELS[notificationPermission] || notificationPermission}</strong>
              </div>

              <div className="notification-master-row">
                <label className="toggle-line">
                  <input
                    type="checkbox"
                    checked={!!notificationSettings?.enabled}
                    disabled={notificationPermission !== 'granted'}
                    onChange={(e) => onChangeNotificationSettings({ enabled: e.target.checked })}
                  />
                  <span>تفعيل التنبيهات المحلية</span>
                </label>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={onRequestNotificationPermission}
                  disabled={notificationPermission === 'unsupported'}
                >
                  <i className="ph ph-bell" />
                  طلب الإذن
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={onSendTestNotification}
                  disabled={notificationPermission !== 'granted'}
                >
                  تجربة
                </button>
              </div>

              <div className="notification-options">
                <label className="notification-option-row">
                  <input
                    type="checkbox"
                    checked={!!notificationSettings?.morningSummary}
                    onChange={(e) =>
                      onChangeNotificationSettings({ morningSummary: e.target.checked })
                    }
                  />
                  <span>ملخص صباحي</span>
                  <input
                    type="time"
                    className="form-input time-input"
                    value={notificationSettings?.morningTime || '10:00'}
                    onChange={(e) => onChangeNotificationSettings({ morningTime: e.target.value })}
                  />
                </label>

                <label className="notification-option-row">
                  <input
                    type="checkbox"
                    checked={!!notificationSettings?.eveningReview}
                    onChange={(e) =>
                      onChangeNotificationSettings({ eveningReview: e.target.checked })
                    }
                  />
                  <span>مراجعة مسائية</span>
                  <input
                    type="time"
                    className="form-input time-input"
                    value={notificationSettings?.eveningTime || '20:00'}
                    onChange={(e) => onChangeNotificationSettings({ eveningTime: e.target.value })}
                  />
                </label>
              </div>

              <div>
                <div className="filter-label">أيام تفعيل التنبيهات</div>
                <div className="weekday-settings compact-days">
                  {WEEK_DAYS.map((day) => (
                    <button
                      key={day.id}
                      type="button"
                      className={`weekday-setting-btn ${activeNotificationDays.includes(day.id) ? 'active' : ''}`}
                      onClick={() => toggleNotificationDay(day.id)}
                    >
                      <span>{day.label}</span>
                      {activeNotificationDays.includes(day.id) && <i className="ph ph-check" />}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <section className="settings-panel-card">
              <h2 className="settings-panel-title">إشعارات الدفع (Web Push)</h2>
              <p className="settings-panel-text">
                تصل حتى لو كان المتصفح مغلقاً — عبر Supabase Edge Function وService Worker.
              </p>

              <div className="settings-summary">
                <i className="ph ph-shield-check" />
                حالة هذا الجهاز:{' '}
                <strong>
                  {!pushSupported
                    ? 'غير مدعوم بهذا المتصفح'
                    : pushSubscribed
                      ? 'مفعّل ويستقبل الإشعارات'
                      : 'غير مفعّل'}
                </strong>
              </div>

              <div className="notification-master-row">
                {!pushSubscribed ? (
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={onSubscribePush}
                    disabled={!pushSupported || pushLoading}
                  >
                    <i className="ph ph-bell-ringing" />
                    تفعيل على هذا الجهاز
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={onUnsubscribePush}
                    disabled={pushLoading}
                  >
                    <i className="ph ph-bell-slash" />
                    إيقاف على هذا الجهاز
                  </button>
                )}
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={onSendTestPush}
                  disabled={!pushSubscribed}
                >
                  إرسال إشعار تجريبي
                </button>
              </div>
            </section>
          </div>
        )}

        {tab === 'trello' && (
          <section className="settings-panel-card settings-trello-panel">
            {trello ? (
              <TrelloView
                tasks={trelloTasks}
                trello={trello}
                onToggleComplete={onToggleComplete}
                onSetStatus={onSetStatus}
                onToggleSubtask={onToggleSubtask}
                onEdit={onEdit}
                onDelete={onDelete}
                onMoveTask={onMoveTask}
                workDays={workDaysForTrello || workDays}
              />
            ) : (
              <p className="settings-panel-text">ربط تريلو غير متاح حالياً.</p>
            )}
          </section>
        )}

        {tab === 'data' && (
          <section className="settings-panel-card">
            <h2 className="settings-panel-title">تصدير واستيراد</h2>
            <p className="settings-panel-text">
              التصدير يشمل مهام المساحة النشطة فقط. الاستيراد يؤرشف مهام المساحة الحالية ثم يضيف
              المستوردة — بلا حذف من قاعدة البيانات. وضع «الكل» لا يدعم الاستيراد.
            </p>

            <div className="settings-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => onExport?.('xlsx')}
                disabled={!onExport}
              >
                <i className="ph ph-file-xls" />
                تنزيل Excel
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => onExport?.('csv')}
                disabled={!onExport}
              >
                <i className="ph ph-file-csv" />
                تنزيل CSV
              </button>
              <label className={`btn-primary settings-import-label ${!onImportFile ? 'is-disabled' : ''}`}>
                <i className="ph ph-upload-simple" />
                رفع ملف
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  hidden
                  disabled={!onImportFile}
                  onChange={handleImport}
                />
              </label>
            </div>

            <p className="form-hint" style={{ marginTop: 14 }}>
              نفس الأوامر متاحة أيضاً من قائمة البيانات في السكة الجانبية.
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
