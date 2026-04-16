import React from 'react';
import { auth } from '../firebase';
import { db, syncWithFirebase } from '../db';
import { getAllBanks } from '../lib/banks';
import { Plus, Trash2, ShieldCheck, X } from 'lucide-react';
import { Deposit } from '../types';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useLiveQuery } from 'dexie-react-hooks';

export function DevTools() {
  const [user] = useAuthState(auth);
  const appSettings = useLiveQuery(() => db.appSettings.get('main'));
  const isAdmin = user?.email === 'filimlive@gmail.com';
  const isOpen = appSettings?.showDevTools ?? false;

  if (!isAdmin || !isOpen) return null;

  const setIsOpen = async (open: boolean) => {
    await db.appSettings.update('main', { showDevTools: open });
  };

  const addTestData = async () => {
    const allBanks = await getAllBanks();
    if (allBanks.length === 0) return;
    
    const currentYear = new Date().getFullYear();
    
    const getRandomBank = () => {
      const idx = Math.floor(Math.random() * allBanks.length);
      return allBanks[idx].name;
    };

    const testDeposits: Deposit[] = [
      {
        bank: getRandomBank(),
        startDate: new Date(currentYear, 0, 15),
        endDate: new Date(currentYear, 6, 15),
        amount: 2500000,
        currency: '₽',
        rate: 21,
        formula: 'simple_days',
        sourceNote: 'Тестовый вклад 1',
        isClosed: false,
        splitIncome: true,
        updatedAt: Date.now(),
        userId: user?.uid,
        isTest: true
      },
      {
        bank: getRandomBank(),
        startDate: new Date(currentYear, 1, 1),
        endDate: new Date(currentYear + 1, 1, 1),
        amount: 1500000,
        currency: '₽',
        rate: 19.5,
        formula: 'compound_monthly',
        sourceNote: 'Тестовый вклад 2',
        isClosed: false,
        splitIncome: true,
        updatedAt: Date.now(),
        userId: user?.uid,
        isTest: true
      }
    ];

    await db.deposits.bulkAdd(testDeposits);
    syncWithFirebase();
  };

  const clearTestData = async () => {
    const all = await db.deposits.toArray();
    const testRecords = all.filter(d => d.isTest);
    const testIds = testRecords.map(d => d.id as any);
    
    if (testIds.length > 0) {
      await db.deposits.bulkDelete(testIds);
      
      // Also delete from Firebase if user is logged in
      if (user) {
        const { doc, deleteDoc } = await import('firebase/firestore');
        const { db: firestoreDb } = await import('../firebase');
        for (const record of testRecords) {
          if (record.id) {
            const firestoreDocId = typeof record.id === 'number' ? `${user.uid}_${record.id}` : String(record.id);
            await deleteDoc(doc(firestoreDb, 'deposits', firestoreDocId));
          }
        }
      }
      
      syncWithFirebase();
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-[110] flex flex-col gap-2">
      <div className="apple-card p-3 flex flex-col gap-2">
        <div className="flex items-center justify-between px-2 pb-2 border-b border-light-border dark:border-dark-border">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-light-text-primary dark:text-dark-text-primary">Dev Tools</span>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="p-1 hover:bg-[#F5F5F7] dark:hover:bg-white/10 rounded-lg transition-colors cursor-pointer text-light-text-secondary hover:text-light-text-primary dark:hover:text-dark-text-primary"
            title="Отключить Dev Tools"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <button 
          onClick={addTestData}
          className="flex items-center gap-2 px-3 py-2 hover:bg-[#F5F5F7] dark:hover:bg-white/10 rounded-xl transition-colors text-xs font-bold cursor-pointer text-light-text-primary dark:text-dark-text-primary"
        >
          <Plus className="w-3.5 h-3.5 text-emerald-500" />
          Добавить записи
        </button>
        <button 
          onClick={clearTestData}
          className="flex items-center gap-2 px-3 py-2 hover:bg-[#F5F5F7] dark:hover:bg-white/10 rounded-xl transition-colors text-xs font-bold cursor-pointer text-light-text-primary dark:text-dark-text-primary"
        >
          <Trash2 className="w-3.5 h-3.5 text-rose-500" />
          Удалить записи
        </button>
      </div>
    </div>
  );
}
