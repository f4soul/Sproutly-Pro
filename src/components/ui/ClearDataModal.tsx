import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trash2, X } from 'lucide-react';

interface ClearDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  year: number;
}

export const ClearDataModal = ({ isOpen, onClose, onConfirm, year }: ClearDataModalProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          key="clear-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed top-0 left-0 w-full h-[100dvh] z-50 flex items-center justify-center p-4 bg-black/60"
          onClick={onClose}
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="apple-card p-6 max-w-md w-full relative z-10"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
                <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-full">
                  <Trash2 size={24} />
                </div>
                <h3 className="text-xl font-bold text-slate-950 dark:text-white">Очистить данные?</h3>
              </div>
              <button onClick={onClose} className="text-slate-500 hover:text-slate-950 dark:hover:text-white cursor-pointer transition-colors">
                <X size={20} />
              </button>
            </div>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
              Вы уверены, что хотите очистить все введенные данные (оклады, премии) за <strong>{year} год</strong>? Это действие нельзя отменить.
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={onClose}
                className="apple-button bg-slate-50 dark:bg-slate-800/50 text-slate-950 dark:text-white hover:bg-black/5 dark:hover:bg-white/10"
              >
                Отмена
              </button>
              <button 
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className="apple-button bg-rose-600 text-white shadow-sm"
              >
                Да, очистить
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
