import React, { useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { Deposit } from '../../types';
import { motion } from 'motion/react';

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
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  return (
    <>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 bg-slate-950/60 z-[100] backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-none">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 100 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 100 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-white dark:bg-slate-950 rounded-t-[32px] sm:rounded-[32px] shadow-2xl max-w-sm w-full p-6 sm:p-8 border border-slate-200 dark:border-slate-800 pointer-events-auto"
        >
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center mb-6">
            <Trash2 className="w-6 h-6 text-rose-500 stroke-[1.5px]" />
          </div>
          <h3 className="text-xl font-bold text-slate-950 dark:text-white mb-2 tracking-tight">Удалить вклад?</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
            Вы уверены, что хотите удалить вклад в банке <strong className="text-slate-950 dark:text-white">{deposit.bank}</strong>? Восстановить запись можно будет в архиве.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={onCancel}
              className="flex-1 apple-button bg-slate-50 dark:bg-slate-800/50 text-slate-950 dark:text-white hover:bg-[#E5E5E7] dark:hover:bg-white/10 text-sm sm:text-base cursor-pointer"
            >
              Отмена
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 apple-button bg-rose-500 text-white shadow-lg shadow-rose-500/20 text-sm sm:text-base cursor-pointer"
            >
              Удалить
            </button>
          </div>
        </motion.div>
      </div>
    </>
  );
};
