import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trash2, X } from 'lucide-react';

interface DeleteYearModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  year: number;
}

export const DeleteYearModal = ({ isOpen, onClose, onConfirm, year }: DeleteYearModalProps) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="apple-card p-6 max-w-md w-full"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
                <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-full">
                  <Trash2 size={24} />
                </div>
                <h3 className="text-xl font-bold text-light-text-primary dark:text-dark-text-primary">Удалить год?</h3>
              </div>
              <button onClick={onClose} className="text-light-text-secondary hover:text-light-text-primary dark:hover:text-dark-text-primary cursor-pointer transition-colors">
                <X size={20} />
              </button>
            </div>
            <p className="text-light-text-secondary dark:text-dark-text-secondary mb-6">
              Вы уверены, что хотите полностью удалить вкладку и данные за <strong>{year} год</strong>? Это действие нельзя отменить.
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={onClose}
                className="apple-button bg-[#F5F5F7] dark:bg-white/5 text-light-text-primary dark:text-dark-text-primary hover:bg-black/5 dark:hover:bg-white/10"
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
                Да, удалить
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
