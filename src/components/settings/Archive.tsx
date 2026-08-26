import React, { useState, Fragment } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, syncWithFirebase } from '../../config/db';
import { Archive as ArchiveIcon, RefreshCcw, BrushCleaning, AlertTriangle, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { Dialog } from '@headlessui/react';

export const ArchiveHeaderActions = () => {
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const archivedDeposits = useLiveQuery(async () => {
    return await db.deposits.where('isArchived').equals(1).toArray();
  });

  const handleClearArchive = async () => {
    if (!archivedDeposits) return;
    const ids = archivedDeposits.map(d => d.id as any);
    await db.deposits.bulkDelete(ids);
    
    const { auth } = await import('../../config/firebase');
    const user = auth.currentUser;
    if (user) {
      for (const deposit of archivedDeposits) {
        if (deposit.id) {
          const firestoreDocId = typeof deposit.id === 'number' ? `${user.uid}_${deposit.id}` : String(deposit.id);
          await db.deletedQueue.put({ collection: 'deposits', docId: firestoreDocId, timestamp: Date.now() });
        }
      }
    }
    
    syncWithFirebase();
    setIsClearModalOpen(false);
  };

  if (!archivedDeposits || archivedDeposits.length === 0) return null;

  return (
    <>
      <button
        onClick={() => setIsClearModalOpen(true)}
        className="apple-button flex items-center justify-center p-2 lg:p-2.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 rounded-xl transition-all"
        title="Очистить"
      >
        <BrushCleaning className="w-4 h-4 text-orange-600 md:w-5 md:h-5 stroke-[1.5px]" />
      </button>

      {/* Clear Archive Confirmation Modal */}
      <AnimatePresence>
        {isClearModalOpen && (
          <Dialog as="div" className="relative z-[150]" open={true} onClose={() => setIsClearModalOpen(false)} static>
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
                  className="w-full max-w-sm rounded-t-[32px] sm:rounded-[32px] bg-white dark:bg-slate-950 p-6 sm:p-8 text-center shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 pointer-events-auto"
                >
                  <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500">
                      <AlertTriangle className="w-8 h-8 stroke-[1.5px]" />
                    </div>
                  </div>
                  
                  <Dialog.Title as="h3" className="text-xl font-bold tracking-tight text-slate-950 dark:text-white mb-2">
                    Очистить архив?
                  </Dialog.Title>
                  
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-8">
                    Это действие безвозвратно удалит все записи из архива. Вы не сможете их восстановить.
                  </p>

                  <div className="flex flex-col gap-3">
                    <button
                      type="button"
                      className="apple-button w-full bg-rose-600 text-white shadow-lg shadow-rose-600/20 text-sm sm:text-base cursor-pointer"
                      onClick={handleClearArchive}
                    >
                      Да, удалить всё
                    </button>
                    <button
                      type="button"
                      className="apple-button w-full bg-white dark:bg-slate-950 text-slate-950 dark:text-white border border-slate-200 dark:border-slate-800 text-sm sm:text-base cursor-pointer"
                      onClick={() => setIsClearModalOpen(false)}
                    >
                      Отмена
                    </button>
                  </div>
                </motion.div>
              </Dialog.Panel>
            </div>
          </Dialog>
        )}
      </AnimatePresence>
    </>
  );
};

export const Archive: React.FC = () => {
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
    
    // Also mark as deleted in Firebase if user is logged in
    const { auth } = await import('../../config/firebase');
    const user = auth.currentUser;
    if (user) {
      const firestoreDocId = typeof id === 'number' ? `${user.uid}_${id}` : String(id);
      await db.deletedQueue.put({ collection: 'deposits', docId: firestoreDocId, timestamp: Date.now() });
    }
    
    syncWithFirebase();
  };

  return (
    <AnimatePresence mode="wait">
      {(!archivedDeposits || archivedDeposits.length === 0) ? (
        <motion.div
          key="empty"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex flex-col items-center justify-center py-12 text-slate-500 dark:text-slate-400"
        >
          <ArchiveIcon className="w-12 h-12 mb-4 opacity-20 stroke-[1px]" />
          <p className="text-base font-bold tracking-tight">Архив пуст</p>
        </motion.div>
      ) : (
        <motion.div
          key="grid"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-3 sm:gap-4 pb-2"
        >
          <AnimatePresence mode="popLayout">
            {archivedDeposits.map((deposit) => {
              return (
                <motion.div
                  key={deposit.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex flex-row items-center px-3.5 py-3.5 rounded-xl bg-white/45 dark:bg-slate-950/40 backdrop-blur-md border border-slate-200/50 dark:border-white/[0.05] gap-3 relative group overflow-hidden hover:border-orange-500/30 transition-all duration-300"
                >
                {/* Deletion Date Badge in Top Right */}
                <div className="absolute top-1.5 right-2 text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pointer-events-none select-none">
                  {format(deposit.updatedAt || Date.now(), 'dd.MM.yy')}
                </div>

                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-orange-500/10 dark:bg-orange-500/5 flex items-center justify-center shrink-0">
                    <ArchiveIcon className="w-4 h-4 text-orange-500 dark:text-orange-400/95 stroke-[2.5px]" />
                  </div>
                  <div className="flex-1 min-w-0 pr-1">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="font-bold text-xs text-slate-950 dark:text-white truncate">{deposit.bank}</span>
                      <span className="text-[10px] font-black text-deposit-500 dark:text-deposit-400 shrink-0">+{deposit.rate}%</span>
                    </div>
                    <div className="flex items-center text-[10px] text-slate-500 dark:text-slate-400 truncate gap-2 mt-0.5">
                       <span className="font-semibold text-slate-900 dark:text-slate-100">
                         {deposit.amount.toLocaleString('ru-RU')} {(!deposit.currency || deposit.currency === 'RUB') ? '₽' : deposit.currency}
                       </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-0.5 shrink-0 mt-1">
                  <button
                    onClick={() => handleRestore(deposit.id!)}
                    className="p-1.5 text-primary-600 hover:bg-primary-500/10 active:scale-95 rounded-xl transition-all cursor-pointer flex justify-center"
                    title="Восстановить"
                  >
                    <RefreshCcw className="w-4 h-4 stroke-[2px]" />
                  </button>
                  <button
                    onClick={() => handlePermanentDelete(deposit.id!)}
                    className="p-1.5 text-rose-600 hover:bg-rose-500/10 active:scale-95 rounded-xl transition-all cursor-pointer flex justify-center"
                    title="Удалить навсегда"
                  >
                    <Trash2 className="w-4 h-4 stroke-[2px]" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>
      )}
    </AnimatePresence>
  );
};
