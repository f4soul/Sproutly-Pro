import React, { useState, useRef, Fragment } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, syncWithFirebase } from '../../config/db';
import { Archive as ArchiveIcon, RefreshCcw, BrushCleaning, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence, LayoutGroup } from 'motion/react';
import { Dialog } from '@headlessui/react';

export const ArchiveHeaderActions = ({ items }: { items: any[] }) => {
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  const handleClearArchive = async () => {
    if (!items) return;
    const ids = items.map(d => d.id as any);
    await db.deposits.bulkDelete(ids);
    
    const { auth } = await import('../../config/firebase');
    const user = auth.currentUser;
    if (user) {
      for (const deposit of items) {
        if (deposit.id) {
          const firestoreDocId = typeof deposit.id === 'number' ? `${user.uid}_${deposit.id}` : String(deposit.id);
          await db.deletedQueue.put({ collection: 'deposits', docId: firestoreDocId, timestamp: Date.now() });
        }
      }
    }
    
    syncWithFirebase();
    setIsClearModalOpen(false);
  };

  if (!items || items.length === 0) return null;

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
          <Dialog
            as="div"
            className="relative z-[9999]"
            open={true}
            onClose={() => setIsClearModalOpen(false)}
            initialFocus={cancelButtonRef}
            static
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 md:left-68 bg-slate-900/10 dark:bg-slate-950/80 backdrop-blur-sm"
              aria-hidden="true"
            />
            <div className="fixed inset-0 md:left-68 flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-none">
              <Dialog.Panel as={Fragment}>
                <motion.div
                  initial={{ opacity: 0, y: 48, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 32, scale: 0.98, transition: { duration: 0.18, ease: 'easeInOut' } }}
                  transition={{ type: 'spring', stiffness: 380, damping: 32, mass: 0.8 }}
                  className="bg-white/95 dark:bg-[#0B0F19]/95 backdrop-blur-3xl rounded-t-[2rem] sm:rounded-[2.5rem] shadow-[0_24px_60px_rgba(37,99,235,0.06)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.8)] border border-slate-200/60 dark:border-white/[0.08] flex flex-col pointer-events-auto px-6 pt-6 pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] sm:p-8 max-w-sm w-full transform-gpu will-change-[transform,opacity]"
                >
                  <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center mb-6 self-center">
                    <Trash2 className="w-6 h-6 text-rose-500 stroke-[1.5px]" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-950 dark:text-white mb-2 tracking-tight text-center">
                    Очистить архив?
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 leading-relaxed text-center">
                    Это действие безвозвратно удалит все записи из архива. Вы не сможете их восстановить.
                  </p>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <button
                      ref={cancelButtonRef}
                      type="button"
                      onClick={() => setIsClearModalOpen(false)}
                      className="flex-1 px-4 py-3 rounded-2xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold transition-all border border-slate-200/60 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600 active:scale-95 shadow-sm text-sm uppercase tracking-wide flex items-center justify-center cursor-pointer"
                    >
                      Отмена
                    </button>
                    <button
                      type="button"
                      onClick={handleClearArchive}
                      className="flex-1 px-4 py-3 rounded-2xl bg-rose-500 hover:bg-rose-600 active:scale-95 text-white font-bold transition-all shadow-[0_4px_16px_rgba(244,63,94,0.3)] hover:shadow-[0_4px_20px_rgba(244,63,94,0.4)] flex items-center justify-center text-sm uppercase tracking-wide cursor-pointer"
                    >
                      Очистить
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

export const Archive: React.FC<{ items: any[] }> = ({ items: items }) => {
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
    <LayoutGroup id="archive-items-group">
      <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-3 sm:gap-4 pb-2">
        <AnimatePresence>
          {items?.map((deposit) => {
            return (
              <motion.div
                key={deposit.id}
                layout="position"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ 
                  layout: { type: "spring", bounce: 0, duration: 0.3 },
                  opacity: { duration: 0.2 },
                  scale: { duration: 0.2 }
                }}
                className="flex flex-row items-center px-3.5 py-3.5 rounded-xl bg-white/45 dark:bg-slate-950/40 backdrop-blur-md border border-slate-200/50 dark:border-white/[0.05] gap-3 relative group overflow-hidden hover:border-orange-500/30 transition-colors duration-300 origin-center"
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
    </div>
  </LayoutGroup>
  );
};
