import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Info, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Toast } from '../../types';

export const ToastContainer = ({ toasts, removeToast }: { toasts: Toast[], removeToast: (id: string) => void }) => {
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 640 : false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="fixed left-4 right-4 top-[calc(env(safe-area-inset-top)+1rem)] sm:left-auto sm:top-auto sm:bottom-4 sm:right-4 z-[9999] flex flex-col items-center sm:items-end gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map(toast => {
          const isError = toast.type === 'error';
          const isLoading = toast.type === 'loading';
          const isSuccess = toast.type === 'success';

          const initialAnim = isMobile ? { opacity: 0, y: -24, scale: 0.95 } : { opacity: 0, y: 24, scale: 0.95 };
          const exitAnim = isMobile ? { opacity: 0, y: -16, scale: 0.95 } : { opacity: 0, y: 16, scale: 0.95 };

          return (
            <motion.div
              key={toast.id}
              layout="position"
              initial={initialAnim}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ ...exitAnim, transition: { duration: 0.18, ease: "easeInOut" } }}
              transition={{ type: "spring", stiffness: 450, damping: 32, mass: 0.8 }}
              drag
              dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
              dragElastic={0.6}
              onDragEnd={(e, { offset, velocity }) => {
                if (
                  Math.abs(offset.x) > 60 || 
                  offset.y < -40 || 
                  Math.abs(velocity.x) > 500 || 
                  velocity.y < -500
                ) {
                  removeToast(toast.id);
                }
              }}
              className={cn(
                "rounded-2xl border px-4 py-3 flex items-center gap-3 pointer-events-auto backdrop-blur-2xl backdrop-saturate-150 transform-gpu will-change-[transform,opacity] max-w-[calc(100vw-2rem)] sm:max-w-md",
                "bg-white/70 dark:bg-slate-900/80 border-slate-200/50 dark:border-white/[0.08] text-slate-900 dark:text-white cursor-grab active:cursor-grabbing touch-none",
                "shadow-[0_16px_40px_rgba(15,23,42,0.1),inset_0_1px_0_0_rgba(255,255,255,0.5)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.6)]"
              )}
            >
              {isError ? (
                <AlertCircle size={20} className="text-rose-500 dark:text-rose-400 shrink-0" />
              ) : isLoading ? (
                <Loader2 size={20} className="text-primary-500 dark:text-primary-400 animate-spin shrink-0" />
              ) : isSuccess ? (
                <Check size={20} className="text-emerald-500 dark:text-emerald-400 shrink-0" />
              ) : (
                <Info size={20} className="text-primary-500 dark:text-primary-400 shrink-0" />
              )}
              <span className="font-medium text-sm tracking-tight text-left flex-1 leading-snug break-words">
                {toast.message}
              </span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

