import React, { Fragment, useEffect, useRef } from 'react';
import { Dialog } from '@headlessui/react';
import { Trash2 } from 'lucide-react';
import { Deposit } from '../../types';
import { motion, AnimatePresence } from 'motion/react';

interface DeleteConfirmModalProps {
  deposit: Deposit;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  deposit,
  onConfirm,
  onCancel
}) => {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  return (
    <Dialog as="div" className="relative z-[9999]" open={true} onClose={onCancel} initialFocus={cancelButtonRef} static>
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
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="bg-white/90 dark:bg-[#0B0F19]/95 backdrop-blur-3xl rounded-t-[2rem] sm:rounded-[2.5rem] shadow-[0_24px_60px_rgba(37,99,235,0.06)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.8)] border border-slate-200/60 dark:border-white/[0.05] flex flex-col pointer-events-auto p-6 sm:p-8 max-w-sm w-full"
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center mb-6 self-center">
              <Trash2 className="w-6 h-6 text-rose-500 stroke-[1.5px]" />
            </div>
            <h3 className="text-xl font-bold text-slate-950 dark:text-white mb-2 tracking-tight text-center">Удалить вклад?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 leading-relaxed text-center">
              Вы уверены, что хотите удалить вклад в банке <strong className="text-slate-950 dark:text-white">{deposit.bank}</strong>? Восстановить запись можно будет в архиве.
            </p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                ref={cancelButtonRef}
                onClick={onCancel}
                className="flex-1 px-4 py-3 rounded-2xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold transition-all border border-slate-200/60 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600 active:scale-95 shadow-sm text-sm uppercase tracking-wide flex items-center justify-center"
              >
                Отмена
              </button>
              <button
                onClick={onConfirm}
                className="flex-1 px-4 py-3 rounded-2xl bg-rose-500 hover:bg-rose-600 active:scale-95 text-white font-bold transition-all shadow-[0_4px_16px_rgba(244,63,94,0.3)] hover:shadow-[0_4px_20px_rgba(244,63,94,0.4)] flex items-center justify-center text-sm uppercase tracking-wide"
              >
                Удалить
              </button>
            </div>
          </motion.div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};
