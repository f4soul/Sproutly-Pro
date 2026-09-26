import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, RefreshCw, X } from 'lucide-react';
import {
  initPwaUpdate,
  usePwaUpdate,
  triggerPwaUpdate,
  dismissPwaUpdate,
} from '../../lib/pwaUpdate';

/**
 * Компактная интерактивная капсула (pill) обновления в стиле Sproutly Pro:
 * - Вся плашка является кликабельной кнопкой обновления с мягким свечением при наведении
 * - Слева: светящаяся иконка Sparkles (или спиннер в момент обновления)
 * - По центру: кнопка действия «ОБНОВИТЬ ПРИЛОЖЕНИЕ» (в одну строку с многоточием при нехватке ширины)
 * - Справа: компактная кнопка «✕» для скрытия/откладывания
 */
function UpdatePill() {
  const { isUpdating } = usePwaUpdate();

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={isUpdating ? 'Обновление приложения…' : 'Обновить приложение до новой версии'}
      onClick={() => {
        if (!isUpdating) triggerPwaUpdate();
      }}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !isUpdating) {
          e.preventDefault();
          triggerPwaUpdate();
        }
      }}
      className="group relative w-full h-10 px-3 sm:px-3.5 rounded-full flex items-center justify-between gap-2 bg-primary-500/10 hover:bg-primary-500/15 dark:bg-[#0a1633]/85 dark:hover:bg-[#0e1f47] border border-primary-500/30 hover:border-primary-500/50 dark:border-primary-500/40 dark:hover:border-primary-400/60 shadow-sm hover:shadow-[0_4px_16px_rgba(59,130,246,0.18)] dark:shadow-[0_4px_20px_rgba(30,58,138,0.35)] backdrop-blur-xl transition-all duration-200 active:scale-[0.98] cursor-pointer select-none"
      title={isUpdating ? 'Идет обновление приложения…' : 'Доступно обновление: нажмите, чтобы обновить приложение'}
    >
      {/* Левая часть: иконка + текст */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <div className="shrink-0 text-primary-600 dark:text-primary-400 flex items-center justify-center">
          {isUpdating ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4 animate-pulse stroke-[2.2px] group-hover:scale-110 transition-transform" />
          )}
        </div>
        <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-primary-600 dark:text-primary-400 leading-none flex-1">
          {isUpdating ? 'Обновление…' : 'ОБНОВИТЬ ПРИЛОЖЕНИЕ'}
        </span>
      </div>

      {/* Правая часть: кнопка закрытия */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          dismissPwaUpdate();
        }}
        className="p-1 -mr-1 rounded-full text-primary-500/60 hover:text-primary-600 dark:text-primary-400/60 dark:hover:text-white hover:bg-primary-500/15 dark:hover:bg-primary-500/25 active:scale-90 transition-all cursor-pointer shrink-0"
        title="Отложить обновление"
        aria-label="Закрыть уведомление"
      >
        <X className="w-3.5 h-3.5 stroke-[2.2px]" />
      </button>
    </div>
  );
}

/**
 * Плавающее мобильное уведомление об обновлении (отображается только на экранах < md).
 * Размещается прямо над нижней панелью навигации в виде той же аккуратной капсулы.
 */
export function ReloadPrompt() {
  const { needRefresh } = usePwaUpdate();

  useEffect(() => {
    initPwaUpdate();
  }, []);

  return (
    <AnimatePresence>
      {needRefresh && (
        <motion.aside
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 14, scale: 0.95, transition: { duration: 0.16 } }}
          transition={{ type: "spring", stiffness: 450, damping: 32 }}
          role="status"
          aria-live="polite"
          className="md:hidden fixed z-[75] left-4 right-4 bottom-[calc(env(safe-area-inset-bottom,0px)+5.4rem)] max-w-sm mx-auto pointer-events-auto"
        >
          <UpdatePill />
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

/**
 * Встроенный виджет обновления для сайдбара на планшетах и ПК (отображается только внутри aside md:flex).
 * Размещается непосредственно под блоком навигации, в точности как на скриншоте.
 */
export function SidebarUpdatePrompt() {
  const { needRefresh } = usePwaUpdate();

  useEffect(() => {
    initPwaUpdate();
  }, []);

  return (
    <AnimatePresence>
      {needRefresh && (
        <motion.div
          initial={{ opacity: 0, height: 0, marginTop: 0 }}
          animate={{ opacity: 1, height: 'auto', marginTop: 14 }}
          exit={{ opacity: 0, height: 0, marginTop: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="overflow-hidden"
        >
          <UpdatePill />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
