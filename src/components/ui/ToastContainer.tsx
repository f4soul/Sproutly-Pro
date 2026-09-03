import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Info, X, Loader2, AlertCircle } from 'lucide-react';
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
      <AnimatePresence mode="popLayout">
        {toasts.map(toast => {
          const isError = toast.type === 'error';
          const isLoading = toast.type === 'loading';
          const isSuccess = toast.type === 'success';

          const initialAnim = isMobile ? { opacity: 0, y: -30, scale: 0.95 } : { opacity: 0, y: 30, scale: 0.95 };
          const exitAnim = isMobile ? { opacity: 0, y: -20, scale: 0.95 } : { opacity: 0, y: 20, scale: 0.95 };

          return (
            <motion.div
              layout="position"
              key={toast.id}
              initial={initialAnim}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ ...exitAnim, transition: { duration: 0.15, ease: "easeIn" } }}
              transition={{ type: "spring", stiffness: 600, damping: 35, mass: 0.8 }}
              className={cn(
                "apple-card px-4 py-3 flex items-center gap-3 pointer-events-auto backdrop-blur-xl shadow-xl",
                isError
                  ? "bg-red-50/90 dark:bg-red-950/90 border-red-200 dark:border-red-900 text-red-800 dark:text-red-200"
                  : "bg-white/90 dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200"
              )}
            >
              {isError ? (
                <AlertCircle size={18} className="text-red-500 shrink-0" />
              ) : isLoading ? (
                <Loader2 size={18} className="text-primary-500 animate-spin shrink-0" />
              ) : isSuccess ? (
                <Check size={18} className="text-deposit-500 shrink-0" />
              ) : (
                <Info size={18} className="text-primary-500 shrink-0" />
              )}
              <span className="font-bold text-sm tracking-tight">{toast.message}</span>
              <button 
                onClick={() => removeToast(toast.id)}
                className="ml-2 opacity-40 hover:opacity-100 transition-opacity cursor-pointer shrink-0"
              >
                <X size={16} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

