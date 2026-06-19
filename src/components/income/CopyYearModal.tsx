import React, { Fragment } from 'react';
import { Dialog } from '@headlessui/react';
import { motion, AnimatePresence } from 'motion/react';
import { Copy, X } from 'lucide-react';

interface CopyYearModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  prevYear: number;
}

export const CopyYearModal = ({ isOpen, onClose, onConfirm, prevYear }: CopyYearModalProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog as="div" className="relative z-[150]" open={true} onClose={onClose} static>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
            aria-hidden="true"
          />
          <div className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-none">
            <Dialog.Panel as={Fragment}>
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 100 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 100 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="bg-white dark:bg-slate-950 rounded-t-[32px] sm:rounded-[32px] shadow-2xl max-w-md w-full p-6 sm:p-8 border border-slate-200 dark:border-slate-800 pointer-events-auto"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-3 text-primary-500">
                    <div className="p-3 bg-primary-500/10 rounded-2xl">
                      <Copy size={24} className="stroke-[1.5px]" />
                    </div>
                    <h3 className="text-xl font-bold tracking-tight text-slate-950 dark:text-white">Скопировать данные?</h3>
                  </div>
                  <button onClick={onClose} className="p-2 hover:bg-slate-50 dark:hover:bg-white/5 rounded-full transition-all text-slate-500 cursor-pointer -mt-2 -mr-2">
                    <X size={20} />
                  </button>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
                  Вы уверены, что хотите скопировать данные за <strong>{prevYear} год</strong>? Это действие перезапишет все текущие введенные значения.
                </p>
                <div className="flex items-center gap-3">
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
                    className="flex-1 apple-button bg-primary-500 text-white shadow-lg shadow-primary-500/20 text-sm sm:text-base cursor-pointer"
                  >
                    Да, скопировать
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
