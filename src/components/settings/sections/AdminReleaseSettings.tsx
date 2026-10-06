import React, { useState, useRef, Fragment } from 'react';
import { Rocket, Send, Sparkles, RefreshCw, CheckCircle2, Crown, Smartphone, RotateCcw, X } from 'lucide-react';
import { Dialog } from '@headlessui/react';
import { motion, AnimatePresence } from 'motion/react';
import { showToast } from '../../../lib/toast';
import { useAuthSync } from '../../../context/AuthSyncContext';
import { logger } from '../../../lib/logger';
import { changelog } from '../../../data/changelog';
import { getDeviceFcmToken } from '../../../services/notifications';
import { cn } from '../../../lib/utils';

/**
 * Умные окончания для личных устройств пользователя:
 * 1 ваше устройство, 2 ваших устройства, 5 ваших устройств, 21 ваше устройство
 */
function formatUserDevicesCount(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 19) {
    return `${count} ваших устройств`;
  }
  if (mod10 === 1) {
    return `${count} ваше устройство`;
  }
  if (mod10 >= 2 && mod10 <= 4) {
    return `${count} ваших устройства`;
  }
  return `${count} ваших устройств`;
}

/**
 * Умные окончания для общего количества устройств:
 * 1 устройство, 2 устройства, 5 устройств, 21 устройство
 */
function formatTotalDevicesCount(count: number): string {
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

export function AdminReleaseSettings() {
  const { user } = useAuthSync();
  const latestRelease = changelog[0];
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [isSendingAll, setIsSendingAll] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const [lastResult, setLastResult] = useState<{
    successCount: number;
    failureCount: number;
    cleanedTokensCount?: number;
    totalTokens: number;
    isTest?: boolean;
    message?: string;
  } | null>(null);

  const defaultPushTitle = `✨ v${latestRelease.version} уже здесь!`;
  const defaultPushBody = `Промо-периоды для накопительных счетов, расчет ежедневного дохода и умные напоминания. Загляните оценить!`;

  const [pushTitle, setPushTitle] = useState(defaultPushTitle);
  const [pushBody, setPushBody] = useState(defaultPushBody);

  // Security guard: only visible to admin
  if (user?.email !== 'filimlive@gmail.com') {
    return null;
  }

  const isCustomized = pushTitle.trim() !== defaultPushTitle || pushBody.trim() !== defaultPushBody;

  const handleResetToDefault = () => {
    setPushTitle(defaultPushTitle);
    setPushBody(defaultPushBody);
  };

  const handleSendReleasePush = async (testOnly: boolean = false) => {
    if (!user) return;
    if (testOnly) {
      setIsSendingTest(true);
    } else {
      setIsSendingAll(true);
      setShowConfirm(false);
    }

    try {
      const idToken = await user.getIdToken();
      let currentDeviceToken: string | null = null;
      if (testOnly) {
        try {
          currentDeviceToken = await getDeviceFcmToken();
        } catch {
          // ignore
        }
      }

      const res = await fetch('/api/notify-release', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          version: latestRelease.version,
          title: pushTitle.trim() || defaultPushTitle,
          body: pushBody.trim() || defaultPushBody,
          testOnly,
          deviceToken: currentDeviceToken,
        }),
      });

      const text = await res.text();
      let data: any = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = {
          error: res.status === 404
            ? 'В среде разработки API отключено. Рассылка активна в продакшене (Vercel).'
            : text.includes('FUNCTION_INVOCATION_FAILED')
              ? 'Ошибка выполнения функции на Vercel (проверьте FIREBASE_SERVICE_ACCOUNT в настройках проекта).'
              : `Ошибка сервера (${res.status}): ${text.slice(0, 100) || 'Пустой ответ'}`
        };
      }

      if (res.ok && data.success) {
        setLastResult(data);

        if (data.isTest) {
          if (data.totalTokens === 0) {
            showToast(data.message || 'На вашем аккаунте нет токенов. Включите Push в блоке выше!', 'info');
          } else {
            showToast(`Тестовый Push отправлен (${formatUserDevicesCount(data.successCount)})`, 'success');
          }
        } else {
          showToast(`Рассылка завершена: доставлено на ${formatTotalDevicesCount(data.successCount)}`, 'success');
        }
      } else {
        showToast(data.message || data.error || 'Ошибка при отправке push', 'error');
      }
    } catch (err: any) {
      logger.error('Failed to send release push:', err);
      showToast(err.message || 'Ошибка сети при отправке', 'error');
    } finally {
      setIsSendingTest(false);
      setIsSendingAll(false);
    }
  };

  const isBusy = isSendingTest || isSendingAll;

  return (
    <section className="apple-card p-4 sm:p-5 xl:p-6 flex flex-col mb-6 lg:mb-8">
      {/* Header */}
      <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6 min-w-0">
        {/* Rocket Icon with Crown adjusted tightly to the top-left corner */}
        <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
          <Rocket className="w-5 h-5 sm:w-6 sm:h-6 stroke-[1.8px]" />
          <div 
            className="absolute -top-1.5 -left-1 sm:-top-2 sm:-left-1.5 transform -rotate-[18deg] sm:-rotate-[20deg] text-amber-500 drop-shadow-[0_2px_6px_rgba(245,158,11,0.45)] pointer-events-none"
            title="Панель администратора"
          >
            <Crown className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 fill-amber-400/25 stroke-[2.2px]" />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="text-sm sm:text-base font-bold tracking-tight text-slate-950 dark:text-white truncate">
            Управление релизами
          </h3>
          <p className="text-[10px] sm:text-[11px] lg:text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5 truncate">
            Рассылка Push-уведомлений о новой версии
          </p>
        </div>
      </div>

      {/* Main Content:
          - Mobile & Tablet portrait (< lg): Single column stacked layout (Editor -> Preview & Actions)
          - Desktop & Tablet landscape (>= lg): Balanced 2-column studio layout (Left: Editor, Right: Preview + Actions)
      */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6 items-stretch">
        {/* Left Column: Notification editor */}
        <div className="w-full p-3.5 sm:p-4 bg-slate-50/80 dark:bg-slate-900/50 rounded-2xl border border-slate-200/60 dark:border-white/[0.06] flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Текст уведомления
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 leading-none">
                Заголовок
              </label>
            </div>
            <div className="relative">
              <input
                type="text"
                value={pushTitle}
                onChange={(e) => setPushTitle(e.target.value)}
                placeholder="Заголовок пуш-уведомления..."
                className="w-full pl-3 pr-8 py-2 text-xs font-bold rounded-xl bg-white dark:bg-slate-950/80 border border-slate-200/80 dark:border-white/[0.08] text-slate-950 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 transition-all"
              />
              {pushTitle.length > 0 && (
                <button
                  type="button"
                  onClick={() => setPushTitle('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-rose-500 dark:text-slate-500 dark:hover:text-rose-400 transition-colors cursor-pointer"
                  title="Очистить заголовок"
                >
                  <X className="w-3 h-3 stroke-[2.2]" />
                </button>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 leading-none">
                Сообщение
              </label>
              <span className="text-[8px] text-slate-400 dark:text-slate-500 font-bold tabular-nums">
                {pushBody.length} симв.
              </span>
            </div>
            <div className="relative">
              <textarea
                value={pushBody}
                onChange={(e) => setPushBody(e.target.value)}
                rows={3}
                placeholder="Текст для рассылки..."
                className="w-full pl-3 pr-8 py-2 text-xs font-medium rounded-xl bg-white dark:bg-slate-950/80 border border-slate-200/80 dark:border-white/[0.08] text-slate-950 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 transition-all resize-none leading-relaxed"
              />
              {pushBody.length > 0 && (
                <button
                  type="button"
                  onClick={() => setPushBody('')}
                  className="absolute right-2 top-2 p-1 text-slate-400 hover:text-rose-500 dark:text-slate-500 dark:hover:text-rose-400 transition-colors cursor-pointer"
                  title="Очистить текст сообщения"
                >
                  <X className="w-3 h-3 stroke-[2.2]" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Phone preview & Action buttons */}
        <div className="w-full p-3.5 sm:p-4 bg-slate-50/80 dark:bg-slate-900/50 rounded-2xl border border-slate-200/60 dark:border-white/[0.06] flex flex-col justify-between gap-3">
          {/* Top: Phone Preview */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              <span>Превью на смартфоне</span>
              <span>Сейчас</span>
            </div>

            <div className="min-h-[64px] p-3 sm:p-3.5 bg-white dark:bg-slate-950/80 rounded-xl border border-slate-200/80 dark:border-white/[0.08] shadow-sm flex items-start gap-3 transition-colors duration-200">
              <div className="w-8 h-8 rounded-lg bg-deposit-500/15 text-deposit-600 dark:text-deposit-400 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-slate-900 dark:text-white leading-snug break-words">
                  {pushTitle.trim() || 'Без заголовка'}
                </div>
                {/* True AnimatePresence accordion: retains exiting text during smooth collapse, zero instant flash */}
                <AnimatePresence initial={false}>
                  {pushBody.trim() ? (
                    <motion.div
                      key="push-body-preview"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug mt-0.5 break-words line-clamp-3">
                        {pushBody.trim()}
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Bottom: Target Release Meta & Action Buttons */}
          <div className="flex flex-col gap-0.5 pt-2.5 border-t border-slate-200/60 dark:border-white/[0.06]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Целевой релиз:
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-deposit-500/10 text-deposit-600 dark:text-deposit-400 text-[10px] font-black">
                  v{latestRelease.version}
                </span>
              </div>
            </div>

            {/* Reserved fixed-height slot: eliminates layout shift (zero CLS) */}
            <div className="h-4 flex items-center min-w-0">
              <AnimatePresence mode="wait">
                {lastResult && (
                  <motion.div
                    key={lastResult.isTest ? 'test' : 'all'}
                    initial={{ opacity: 0, y: -3 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -3 }}
                    transition={{ duration: 0.2 }}
                    className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5 truncate"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">
                      {lastResult.isTest
                        ? `Тест доставлен: ${formatUserDevicesCount(lastResult.successCount)}`
                        : `Доставлено: ${lastResult.successCount} из ${formatTotalDevicesCount(lastResult.totalTokens)}`}
                    </span>
                    {!!lastResult.cleanedTokensCount && (
                      <span className="text-slate-400 font-normal text-[10px] shrink-0">
                        (очищено {formatTotalDevicesCount(lastResult.cleanedTokensCount)})
                      </span>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Two Action Buttons: Compact labels, equal height (h-10 sm:h-11), no awkward wraps */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleSendReleasePush(true)}
                disabled={isBusy}
                className="h-10 sm:h-11 px-3 rounded-xl font-bold text-xs bg-slate-100/90 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-slate-200/70 dark:border-white/[0.08] transition-all active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 shadow-xs whitespace-nowrap"
                title="Отправить пуш только на устройства вашего аккаунта"
              >
                {isSendingTest ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Отправка...</span>
                  </>
                ) : (
                  <>
                    <Smartphone className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="truncate">Тест</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowConfirm(true)}
                disabled={isBusy}
                className="h-10 sm:h-11 px-3 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-600 text-white transition-all shadow-[0_4px_16px_rgba(245,158,11,0.25)] hover:shadow-[0_4px_20px_rgba(245,158,11,0.35)] active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
                title="Разослать Push всем зарегистрированным пользователям"
              >
                {isSendingAll ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Рассылка...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">В релиз!</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal — pixel-perfect matching DeleteConfirmModal */}
      <AnimatePresence>
        {showConfirm && (
          <Dialog
            as="div"
            className="relative z-[9999]"
            open={true}
            onClose={() => setShowConfirm(false)}
            initialFocus={cancelButtonRef}
            static
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-slate-900/10 dark:bg-slate-950/80 backdrop-blur-sm"
              aria-hidden="true"
            />
            <div className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-none">
              <Dialog.Panel as={Fragment}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                  className="bg-white/90 dark:bg-[#0B0F19]/95 backdrop-blur-3xl rounded-t-[2rem] sm:rounded-[2.5rem] shadow-[0_24px_60px_rgba(37,99,235,0.06)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.8)] border border-slate-200/60 dark:border-white/[0.05] flex flex-col pointer-events-auto px-6 pt-6 pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] sm:p-8 max-w-sm w-full"
                >
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-6 self-center">
                    <Send className="w-6 h-6 text-amber-500 stroke-[1.5px]" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-950 dark:text-white mb-2 tracking-tight text-center">
                    {isCustomized ? 'Отправить Push-рассылку?' : 'Отправить Push о релизе?'}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 leading-relaxed text-center">
                    Вы уверены, что хотите отправить Push-уведомление «<strong className="text-slate-950 dark:text-white">{pushTitle.trim() || 'Без заголовка'}</strong>» на все зарегистрированные устройства?
                  </p>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <button
                      ref={cancelButtonRef}
                      type="button"
                      onClick={() => setShowConfirm(false)}
                      className="flex-1 px-4 py-3 rounded-2xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold transition-all border border-slate-200/60 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600 active:scale-95 shadow-sm text-sm uppercase tracking-wide flex items-center justify-center cursor-pointer"
                    >
                      Отмена
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSendReleasePush(false)}
                      className="flex-1 px-4 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold transition-all shadow-[0_4px_16px_rgba(245,158,11,0.3)] hover:shadow-[0_4px_20px_rgba(245,158,11,0.4)] flex items-center justify-center text-sm uppercase tracking-wide cursor-pointer"
                    >
                      Отправить
                    </button>
                  </div>
                </motion.div>
              </Dialog.Panel>
            </div>
          </Dialog>
        )}
      </AnimatePresence>
    </section>
  );
}
