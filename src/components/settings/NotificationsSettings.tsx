import React, { useState, useEffect } from 'react';
import { Bell, BellRing, Info, RefreshCw, CheckCircle2 } from 'lucide-react';
import { requestNotificationPermission, syncFcmToken } from '../../services/notifications';
import { showToast } from '../../lib/toast';
import { auth } from '../../config/firebase';

export function NotificationsSettings() {
  const [permissionState, setPermissionState] = useState<NotificationPermission>('default');
  const [isSyncing, setIsSyncing] = useState(false);
  const [tokenSynced, setTokenSynced] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      setPermissionState(Notification.permission);
      if (Notification.permission === 'granted' && auth.currentUser) {
        syncFcmToken().then((success) => {
          if (success) setTokenSynced(true);
        }).catch(console.error);
      }
    }
  }, []);

  const handleEnableNotifications = async () => {
    if (!('Notification' in window)) {
      showToast('Ваш браузер не поддерживает уведомления', 'error');
      return;
    }

    setIsSyncing(true);
    try {
      const success = await requestNotificationPermission();
      setPermissionState(Notification.permission);
      
      if (success) {
        setTokenSynced(true);
        showToast('Уведомления успешно включены и синхронизированы', 'success');
      } else if (Notification.permission === 'denied') {
        showToast('Вы заблокировали уведомления в браузере', 'error');
      } else {
        showToast('Токен получен, но убедитесь, что вы авторизованы в аккаунте', 'info');
      }
    } catch (error) {
      console.error(error);
      showToast('Ошибка при включении уведомлений', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleResyncToken = async () => {
    setIsSyncing(true);
    try {
      const success = await syncFcmToken();
      if (success) {
        setTokenSynced(true);
        showToast('FCM токен обновлен в базе данных', 'success');
      } else {
        showToast('Не удалось обновить токен. Проверьте авторизацию.', 'error');
      }
    } catch (error) {
      console.error(error);
      showToast('Ошибка при синхронизации токена', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <section className="apple-card p-4 sm:p-5 xl:p-6 space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between h-12 mb-4 shrink-0">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center shrink-0">
            <Bell className="w-6 h-6 text-indigo-500 stroke-[1.5px]" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-bold tracking-tight text-slate-950 dark:text-white truncate">Уведомления</h3>
            <p className="text-[11px] lg:text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5 truncate">Push-напоминания о событиях</p>
          </div>
        </div>
      </div>

      <div className="space-y-4 flex-1 flex flex-col justify-center">
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-white/[0.05] space-y-4 text-sm text-slate-700 dark:text-slate-300">
          <p className="flex items-start gap-3">
            <Info className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
            <span className="leading-relaxed">Включите Push-уведомления, чтобы своевременно получать напоминания об истекающих вкладах (в день окончания, за 1 и 3 дня) и других важных событиях.</span>
          </p>
          
          <div className="pt-4 border-t border-slate-200/50 dark:border-white/[0.05] flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="font-bold text-slate-900 dark:text-white truncate">Статус Push-уведомлений</p>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 truncate">
                {permissionState === 'granted' && (
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 truncate">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Разрешены {tokenSynced && '• В базе'}</span>
                  </span>
                )}
                {permissionState === 'denied' && <span className="text-rose-500 font-medium truncate">Заблокированы</span>}
                {permissionState === 'default' && <span className="truncate">Не включены</span>}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {permissionState === 'granted' ? (
                <button
                  type="button"
                  onClick={handleResyncToken}
                  disabled={isSyncing}
                  className="px-3.5 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white rounded-xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                  title="Обновить регистрацию устройства в Firestore"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? '...' : 'Обновить'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleEnableNotifications}
                  disabled={isSyncing || permissionState === 'denied'}
                  className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer active:scale-95 shadow-md shadow-indigo-500/20"
                >
                  <BellRing className="w-3.5 h-3.5" />
                  {isSyncing ? '...' : 'Включить'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
