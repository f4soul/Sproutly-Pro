import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Info, X, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Toast } from '../../types';

export const ToastContainer = ({ toasts, removeToast }: { toasts: Toast[], removeToast: (id: string) => void }) => {
  return (
    <div className="fixed left-4 right-4 top-4 sm:left-auto sm:top-auto sm:bottom-4 sm:right-4 z-[9999] flex flex-col items-center sm:items-end gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map(toast => {
          const isError = toast.type === 'error';
          const isLoading = toast.type === 'loading';
          const isSuccess = toast.type === 'success';

          return (
            <motion.div
              layout
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
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

