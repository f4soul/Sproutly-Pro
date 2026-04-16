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
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6 max-w-md w-full"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                  <Trash2 size={24} />
                </div>
                <h3 className="text-xl font-bold">Удалить год?</h3>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer">
                <X size={20} />
              </button>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Вы уверены, что хотите полностью удалить вкладку и данные за <strong>{year} год</strong>? Это действие нельзя отменить.
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={onClose}
                className="px-4 py-2 font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition-colors cursor-pointer"
              >
                Отмена
              </button>
              <button 
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className="px-4 py-2 font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors cursor-pointer"
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
