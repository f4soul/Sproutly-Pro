import React, { useState, useEffect } from 'react';
import { Bell, BellRing, Info } from 'lucide-react';
import { requestNotificationPermission } from '../../services/notifications';
import { showToast } from '../../lib/toast';

export function NotificationsSettings() {
  const [permissionState, setPermissionState] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setPermissionState(Notification.permission);
    }
  }, []);

  const handleEnableNotifications = async () => {
    if (!('Notification' in window)) {
      showToast('Ваш браузер не поддерживает уведомления', 'error');
      return;
    }

    try {
      const success = await requestNotificationPermission();
      setPermissionState(Notification.permission);
      
      if (success) {
        showToast('Уведомления успешно включены', 'success');
      } else if (Notification.permission === 'denied') {
        showToast('Вы заблокировали уведомления в браузере', 'error');
      } else {
        showToast('Не удалось настроить уведомления (проверьте конфигурацию Firebase)', 'error');
      }
    } catch (error) {
      console.error(error);
      showToast('Ошибка при включении уведомлений', 'error');
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
            <span className="leading-relaxed">Включите Push-уведомления, чтобы своевременно получать напоминания об истекающих вкладах и других важных событиях.</span>
          </p>
          
          <div className="pt-4 border-t border-slate-200/50 dark:border-white/[0.05] flex items-center justify-between gap-4">
            <div>
              <p className="font-bold text-slate-900 dark:text-white">Статус уведомлений</p>
              <p className="text-[10px] text-slate-500 mt-1">
                {permissionState === 'granted' && <span className="text-emerald-500 font-medium">Разрешены</span>}
                {permissionState === 'denied' && <span className="text-rose-500 font-medium">Заблокированы в браузере</span>}
                {permissionState === 'default' && <span>Не настроены</span>}
              </p>
            </div>
            <button
              onClick={handleEnableNotifications}
              disabled={permissionState === 'granted'}
              className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-500/50 text-white rounded-lg font-medium text-xs transition-colors flex items-center gap-2"
            >
              {permissionState === 'granted' ? (
                <>
                  <BellRing className="w-4 h-4" />
                  Включены
                </>
              ) : (
                <>Включить</>
              )}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
