import React, { useState, Fragment } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, syncWithFirebase } from '../db';
import { Archive as ArchiveIcon, RefreshCcw, Trash2, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { Dialog, Transition } from '@headlessui/react';

export const Archive: React.FC = () => {
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const archivedDeposits = useLiveQuery(async () => {
    const deposits = await db.deposits.where('isArchived').equals(1).toArray();
    return deposits.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  });

  const handleRestore = async (id: string | number) => {
    await db.deposits.update(id as any, { isArchived: 0, updatedAt: Date.now() });
    syncWithFirebase();
  };

  const handlePermanentDelete = async (id: string | number) => {
    await db.deposits.delete(id as any);
    
    // Also delete from Firebase if user is logged in
    const { auth, db: firestoreDb } = await import('../firebase');
    const user = auth.currentUser;
    if (user) {
      const { doc, deleteDoc } = await import('firebase/firestore');
      const firestoreDocId = typeof id === 'number' ? `${user.uid}_${id}` : String(id);
      try {
        await deleteDoc(doc(firestoreDb, 'deposits', firestoreDocId));
      } catch (e) {
        console.error('Failed to delete from Firebase', e);
      }
    }
    
    syncWithFirebase();
  };

  const handleClearArchive = async () => {
    if (!archivedDeposits) return;
    const ids = archivedDeposits.map(d => d.id as any);
    await db.deposits.bulkDelete(ids);
    
    // Also delete from Firebase if user is logged in
    const { auth, db: firestoreDb } = await import('../firebase');
    const user = auth.currentUser;
    if (user) {
      const { doc, deleteDoc } = await import('firebase/firestore');
      for (const deposit of archivedDeposits) {
        if (deposit.id) {
          const firestoreDocId = typeof deposit.id === 'number' ? `${user.uid}_${deposit.id}` : String(deposit.id);
          try {
            await deleteDoc(doc(firestoreDb, 'deposits', firestoreDocId));
          } catch (e) {
            console.error('Failed to delete from Firebase', e);
          }
        }
      }
    }
    
    syncWithFirebase();
    setIsClearModalOpen(false);
  };

  if (!archivedDeposits || archivedDeposits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-light-text-secondary dark:text-dark-text-secondary">
        <ArchiveIcon className="w-16 h-16 mb-6 opacity-10 stroke-[1px]" />
        <p className="text-lg font-bold tracking-tight">Архив пуст</p>
        <p className="text-sm font-medium mt-1">Здесь будут отображаться удаленные вклады</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setIsClearModalOpen(true)}
          className="apple-button flex items-center gap-2 px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-[10px] uppercase tracking-widest border border-rose-500/20"
        >
          <Trash2 className="w-3.5 h-3.5 stroke-[2px]" />
          Очистить архив
        </button>
      </div>

      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {archivedDeposits.map((deposit) => (
            <motion.div
              key={deposit.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#F5F5F7] dark:bg-white/5 border border-light-border dark:border-dark-border rounded-2xl p-3 sm:p-4 shadow-sm hover:shadow-md transition-all group flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-xl bg-[#F5F5F7] dark:bg-white/5 border border-light-border dark:border-dark-border flex items-center justify-center shrink-0">
                  <ArchiveIcon className="w-5 h-5 text-slate-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-sm text-light-text-primary dark:text-dark-text-primary truncate">
                      {deposit.bank}
                    </h3>
                    <span className="text-[10px] font-bold text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-widest bg-[#F5F5F7] dark:bg-white/5 px-2 py-0.5 rounded-md">
                      {deposit.rate}%
                    </span>
                  </div>
                  <p className="text-[10px] font-medium text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wider mt-0.5">
                    Удален: {format(deposit.updatedAt || Date.now(), 'dd.MM.yyyy')}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-6 shrink-0">
                <div className="text-right">
                  <p className="text-[10px] font-bold text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-widest mb-0.5">Сумма</p>
                  <p className="font-bold text-sm text-light-text-primary dark:text-dark-text-primary font-mono whitespace-nowrap">
                    {deposit.amount.toLocaleString()} {deposit.currency}
                  </p>
                </div>
                
                <div className="flex gap-1">
                  <button
                    onClick={() => handleRestore(deposit.id!)}
                    className="p-2.5 text-emerald-600 hover:bg-emerald-500/10 rounded-xl transition-all cursor-pointer"
                    title="Восстановить"
                  >
                    <RefreshCcw className="w-4 h-4 stroke-[2px]" />
                  </button>
                  <button
                    onClick={() => handlePermanentDelete(deposit.id!)}
                    className="p-2.5 text-rose-600 hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer"
                    title="Удалить навсегда"
                  >
                    <Trash2 className="w-4 h-4 stroke-[2px]" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Clear Archive Confirmation Modal */}
      <Transition show={isClearModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-[150]" onClose={() => setIsClearModalOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-end sm:items-center justify-center p-0 sm:p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 translate-y-full sm:translate-y-0 sm:scale-95"
                enterTo="opacity-100 translate-y-0 sm:scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                leaveTo="opacity-0 translate-y-full sm:translate-y-0 sm:scale-95"
              >
                <Dialog.Panel className="w-full max-w-sm transform overflow-hidden rounded-t-[32px] sm:rounded-[32px] bg-white dark:bg-dark-card p-6 sm:p-8 text-center align-middle shadow-2xl transition-all border border-light-border dark:border-dark-border">
                  <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500">
                      <AlertTriangle className="w-8 h-8 stroke-[1.5px]" />
                    </div>
                  </div>
                  
                  <Dialog.Title as="h3" className="text-xl font-bold tracking-tight text-light-text-primary dark:text-dark-text-primary mb-2">
                    Очистить архив?
                  </Dialog.Title>
                  
                  <p className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-8">
                    Это действие безвозвратно удалит все записи из архива. Вы не сможете их восстановить.
                  </p>

                  <div className="flex flex-col gap-3">
                    <button
                      type="button"
                      className="apple-button w-full bg-rose-600 text-white shadow-lg shadow-rose-600/20 text-sm sm:text-base"
                      onClick={handleClearArchive}
                    >
                      Да, удалить всё
                    </button>
                    <button
                      type="button"
                      className="apple-button w-full bg-white dark:bg-dark-card text-light-text-primary dark:text-dark-text-primary border border-light-border dark:border-dark-border text-sm sm:text-base"
                      onClick={() => setIsClearModalOpen(false)}
                    >
                      Отмена
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
};
