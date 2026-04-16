import React from 'react';
import { Trash2 } from 'lucide-react';
import { Deposit } from '../../types';

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
  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white dark:bg-dark-card rounded-t-[32px] sm:rounded-[32px] shadow-2xl max-w-sm w-full p-6 sm:p-8 animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300 border border-light-border dark:border-dark-border">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center mb-6">
          <Trash2 className="w-6 h-6 text-rose-500 stroke-[1.5px]" />
        </div>
        <h3 className="text-xl font-bold text-light-text-primary dark:text-dark-text-primary mb-2 tracking-tight">Удалить вклад?</h3>
        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-8 leading-relaxed">
          Вы уверены, что хотите удалить вклад в банке <strong className="text-light-text-primary dark:text-dark-text-primary">{deposit.bank}</strong>? Восстановить запись можно будет в архиве.
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="flex-1 apple-button bg-[#F5F5F7] dark:bg-white/5 text-light-text-primary dark:text-dark-text-primary hover:bg-[#E5E5E7] dark:hover:bg-white/10 text-sm sm:text-base"
          >
            Отмена
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 apple-button bg-rose-500 text-white shadow-lg shadow-rose-500/20 text-sm sm:text-base"
          >
            Удалить
          </button>
        </div>
      </div>
    </div>
  );
};
