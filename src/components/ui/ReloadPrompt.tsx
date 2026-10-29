import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, RefreshCw, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  usePwaUpdate,
  triggerPwaUpdate,
  dismissPwaUpdate,
} from '../../lib/pwaUpdate';

/**
 * Единый тост обновления PWA для всех типов устройств:
 * - Изящная компактная ширина по максимальному содержимому контента (w-[240px]) — никаких лишних пустых пространств.
 * - Вся плашка кликабельна: одно нажатие запускает обновление Service Worker.
 * - Резервированный слот под кнопку закрытия (24×24px) предотвращает сдвиг контента при переключении состояний.
 * - Вся динамика изолирована строго внутри блока, внешняя карточка сохраняет идеальную стабильность.
 */
export const PwaUpdateToast = React.forwardRef<HTMLDivElement, { isMobile: boolean }>(
  function PwaUpdateToast({ isMobile }, ref) {
    const { isUpdating } = usePwaUpdate();

    const initialAnim = isMobile
      ? { opacity: 0, y: -24, scale: 0.95 }
      : { opacity: 0, y: 24, scale: 0.95 };
    const exitAnim = isMobile
      ? { opacity: 0, y: -16, scale: 0.95 }
      : { opacity: 0, y: 16, scale: 0.95 };

    return (
      <motion.div
        ref={ref}
        layout="position"
        initial={initialAnim}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ ...exitAnim, transition: { duration: 0.18, ease: 'easeInOut' } }}
        transition={{ type: 'spring', stiffness: 450, damping: 32, mass: 0.8 }}
        whileTap={!isUpdating ? { scale: 0.98 } : undefined}
        onClick={() => {
          if (!isUpdating) triggerPwaUpdate();
        }}
        role="alert"
        aria-live="polite"
        className={cn(
          'w-[240px] max-w-[calc(100vw-2rem)] rounded-2xl border px-3 py-2.5 flex items-center gap-2.5 pointer-events-auto backdrop-blur-2xl backdrop-saturate-150 transform-gpu will-change-[transform,opacity] select-none',
          'bg-white/90 dark:bg-slate-900/90 border-primary-500/25 dark:border-primary-500/25 text-slate-900 dark:text-white',
          'shadow-[0_12px_32px_rgba(15,23,42,0.1),inset_0_1px_0_0_rgba(255,255,255,0.6)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.06)]',
          isUpdating
            ? 'cursor-default'
            : 'cursor-pointer group transition-colors',
        )}
      >
        {/* Иконка Sparkles / RefreshCw */}
        <div className="w-8 h-8 rounded-xl bg-primary-500/15 flex items-center justify-center shrink-0">
          {isUpdating ? (
            <RefreshCw className="w-4 h-4 text-primary-600 dark:text-primary-400 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4 text-primary-600 dark:text-primary-400 transition-transform duration-300 group-hover:scale-110" />
          )}
        </div>

        {/* Текстовый блок со стабильной геометрией */}
        <div className="flex flex-col min-w-0 flex-1 leading-tight text-left">
          <span className="text-[12px] font-bold text-slate-950 dark:text-white truncate">
            {isUpdating ? 'Обновление…' : 'Доступно обновление'}
          </span>
          <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate">
            {isUpdating ? 'Активация новой версии' : 'Нажмите, чтобы обновить'}
          </span>
        </div>

        {/* Фиксированный слот закрытия (сохраняет 24px ширины при скрытии кнопки) */}
        <div className="w-6 h-6 flex items-center justify-center shrink-0">
          {!isUpdating && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                dismissPwaUpdate();
              }}
              className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 active:scale-90 transition-all cursor-pointer"
              title="Скрыть уведомление"
              aria-label="Скрыть уведомление об обновлении"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </motion.div>
    );
  },
);

// Заглушки обратной совместимости
export const ReloadPrompt = PwaUpdateToast;
export const MobileUpdatePrompt: React.FC<{ hidden?: boolean }> = () => null;
export const SidebarUpdatePrompt: React.FC = () => null;
