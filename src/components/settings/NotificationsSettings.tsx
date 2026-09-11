import React, { useState, useEffect, useCallback } from 'react';
import { Bell, BellRing, Info, RefreshCw, CheckCircle2, AlertCircle, ShieldAlert } from 'lucide-react';
import { requestNotificationPermission, syncFcmToken, checkDeviceTokenStatus } from '../../services/notifications';
import { showToast } from '../../lib/toast';
import { useAuthSync } from '../../context/AuthSyncContext';
import { logger } from '../../lib/logger';

function formatDevicesCount(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 19) {
    return `${count} устройств`;
  }
  if (mod10 === 1) {
    return `${count} устройство`;
  }
  if (mod10 >= 2 && mod10 <= 4) {
    return `${count} устройства`;
  }
  return `${count} устройств`;
}

export function NotificationsSettings() {
  const { user } = useAuthSync();
  const [permissionState, setPermissionState] = useState<NotificationPermission>('default');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRegisteredInDb, setIsRegisteredInDb] = useState(false);
  const [tokensCount, setTokensCount] = useState(0);

  const refreshStatus = useCallback(async () => {
    if (!('Notification' in window)) return;
    setPermissionState(Notification.permission);

    if (Notification.permission === 'granted' && user) {
      try {
        const status = await checkDeviceTokenStatus();
        setIsRegisteredInDb(status.isRegisteredInDb);
        setTokensCount(status.tokensCount);
      } catch (err) {
        logger.error("Error refreshing notification status:", err);
      }
    } else {
      setIsRegisteredInDb(false);
      setTokensCount(0);
    }
  }, [user]);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  const handleEnableNotifications = async () => {
    if (!('Notification' in window)) {
      showToast('Ваш браузер не поддерживает уведомления', 'error');
      return;
    }

    if (!user) {
      showToast('Сначала войдите в Google аккаунт для привязки уведомлений', 'info');
      return;
    }

    setIsSyncing(true);
    try {
      const res = await requestNotificationPermission();
      setPermissionState(Notification.permission);
      
      if (res.success) {
        await refreshStatus();
        showToast('Уведомления успешно включены и токен сохранен в базе!', 'success');
      } else if (Notification.permission === 'denied') {
        showToast('Вы заблокировали уведомления в настройках браузера', 'error');
      } else {
        showToast(res.error || 'Не удалось зарегистрировать токен', 'error');
      }
    } catch (error: any) {
      logger.error(error);
      showToast(error?.message || 'Ошибка при включении уведомлений', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleResyncToken = async () => {
    if (!user) {
      showToast('Авторизуйтесь в аккаунте для синхронизации токена', 'error');
      return;
    }

    setIsSyncing(true);
    try {
      const res = await syncFcmToken();
      if (res.success) {
        await refreshStatus();
        showToast('FCM токен успешно сохранен в базе данных!', 'success');
      } else {
        showToast(res.error || 'Не удалось сохранить токен в базе данных', 'error');
      }
    } catch (error: any) {
      logger.error(error);
      showToast(error?.message || 'Ошибка при синхронизации токена', 'error');
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
          
          <div className="pt-4 border-t border-slate-200/50 dark:border-white/[0.05] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="min-w-0 space-y-1">
              <p className="font-bold text-slate-900 dark:text-white truncate">Статус Push-уведомлений</p>
              
              {permissionState === 'granted' && isRegisteredInDb ? (
                tokensCount > 1 ? (
                  <div className="space-y-1 text-xs">
                    <div className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5 whitespace-nowrap">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>Активно • {formatDevicesCount(tokensCount)}</span>
                    </div>
                    {user?.email && (
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 border-l border-slate-200 dark:border-slate-700 pl-2 truncate max-w-[220px]">
                        {user.email}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-xs flex items-center gap-2 flex-wrap">
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5 whitespace-nowrap">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>Активно</span>
                    </span>
                    {user?.email && (
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 border-l border-slate-200 dark:border-slate-700 pl-2 truncate max-w-[180px]">
                        {user.email}
                      </span>
                    )}
                  </div>
                )
              ) : (
                <div className="text-xs flex items-center gap-2 flex-wrap">
                  {permissionState === 'granted' && !isRegisteredInDb && (
                    <span className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1.5 whitespace-nowrap">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>Разрешено в браузере • Токен не в базе</span>
                    </span>
                  )}

                  {permissionState === 'denied' && (
                    <span className="text-rose-500 font-medium flex items-center gap-1.5 whitespace-nowrap">
                      <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                      <span>Заблокированы в браузере</span>
                    </span>
                  )}

                  {permissionState === 'default' && (
                    <span className="text-slate-500 font-medium">Не включены</span>
                  )}

                  {user?.email && (
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 border-l border-slate-200 dark:border-slate-700 pl-2 truncate max-w-[180px]">
                      {user.email}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {permissionState === 'granted' ? (
                <button
                  type="button"
                  onClick={handleResyncToken}
                  disabled={isSyncing}
                  className={`px-3.5 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50 ${
                    !isRegisteredInDb
                      ? 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                      : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white'
                  }`}
                  title="Обновить или добавить регистрацию устройства в Firestore"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Сохранение...' : !isRegisteredInDb ? 'Привязать к базе' : 'Обновить'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleEnableNotifications}
                  disabled={isSyncing || permissionState === 'denied'}
                  className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer active:scale-95 shadow-md shadow-indigo-500/20"
                >
                  <BellRing className="w-3.5 h-3.5" />
                  <span>{isSyncing ? 'Запрос...' : 'Включить'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
