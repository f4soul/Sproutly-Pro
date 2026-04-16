import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Info, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { Toast } from '../types';

export const ToastContainer = ({ toasts, removeToast }: { toasts: Toast[], removeToast: (id: string) => void }) => {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map(toast => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className={cn(
              "apple-card px-4 py-3 flex items-center gap-3 pointer-events-auto",
              toast.type === 'success' 
                ? "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
                : "bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200"
            )}
          >
            {toast.type === 'success' ? <Check size={18} className="text-emerald-500" /> : <Info size={18} className="text-blue-500" />}
            <span className="font-medium text-sm">{toast.message}</span>
            <button 
              onClick={() => removeToast(toast.id)}
              className="ml-2 opacity-50 hover:opacity-100 transition-opacity cursor-pointer"
            >
              <X size={16} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
