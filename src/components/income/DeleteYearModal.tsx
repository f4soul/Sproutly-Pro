import React, { Fragment } from 'react';
import { Dialog } from '@headlessui/react';
import { motion, AnimatePresence } from 'motion/react';
import { Trash2, X } from 'lucide-react';

interface DeleteYearModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  year: number;
}

export const DeleteYearModal = ({ isOpen, onClose, onConfirm, year }: DeleteYearModalProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog as="div" className="relative z-[100]" open={true} onClose={onClose} static>
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
                initial={{ opacity: 0, scale: 0.95, y: 100 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 100 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="bg-white dark:bg-slate-950 w-full max-w-md rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800/50 flex flex-col pointer-events-auto p-6"
              >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
                <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-full">
                  <Trash2 size={24} />
                </div>
                <h3 className="text-xl font-bold tracking-tight text-slate-950 dark:text-white">Удалить год?</h3>
              </div>
              <button 
                onClick={onClose} 
                className="p-2 hover:bg-slate-50 dark:hover:bg-white/5 rounded-full transition-all active:scale-90 cursor-pointer -mt-2 -mr-2"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
              Вы уверены, что хотите полностью удалить вкладку и данные за <strong>{year} год</strong>? Это действие нельзя отменить.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={onClose}
                className="flex-1 apple-button bg-slate-50 dark:bg-slate-800/50 text-slate-950 dark:text-white hover:bg-[#E5E5E7] dark:hover:bg-white/10 text-sm sm:text-base cursor-pointer"
              >
                Отмена
              </button>
              <button 
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className="flex-1 apple-button bg-rose-500 text-white shadow-lg shadow-rose-500/20 text-sm sm:text-base cursor-pointer"
              >
                Удалить
              </button>
            </div>
              </motion.div>
            </Dialog.Panel>
          </div>
        </Dialog>
      )}
    </AnimatePresence>
  );
};
