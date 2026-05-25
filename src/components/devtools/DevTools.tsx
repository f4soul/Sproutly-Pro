import React from 'react';
import { auth } from '../../config/firebase';
import { db, syncWithFirebase } from '../../config/db';
import { getAllBanks } from '../../lib/banks';
import { Plus, Trash2, ShieldCheck, X } from 'lucide-react';
import { Deposit } from '../../types';
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

    await db.deposits.bulkPut(testDeposits);
    // DO NOT call syncWithFirebase here
  };

  const clearTestData = async () => {
    const all = await db.deposits.toArray();
    const testRecords = all.filter(d => d.isTest);
    const testIds = testRecords.map(d => d.id as any);
    
    if (testIds.length > 0) {
      await db.deposits.bulkDelete(testIds);
    }

    const allBanks = await db.banks.toArray();
    const testBankIds = allBanks.filter(b => b.isTest).map(b => b.id as any);
    if (testBankIds.length > 0) {
      await db.banks.bulkDelete(testBankIds);
    }

    // syncWithFirebase is not needed because records were never uploaded
  };

  return (
    <div className="fixed bottom-4 right-4 z-[110] flex flex-col gap-2">
      <div className="apple-card p-3 flex flex-col gap-2">
        <div className="flex items-center justify-between px-2 pb-2 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-950 dark:text-white">Dev Tools</span>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="p-1 hover:bg-slate-50 dark:hover:bg-white/10 rounded-lg transition-colors cursor-pointer text-slate-500 hover:text-slate-950 dark:hover:text-white"
            title="Отключить Dev Tools"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <button 
          onClick={addTestData}
          className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 dark:hover:bg-white/10 rounded-xl transition-colors text-xs font-bold cursor-pointer text-slate-950 dark:text-white"
        >
          <Plus className="w-3.5 h-3.5 text-primary-500" />
          Добавить записи
        </button>
        <button 
          onClick={clearTestData}
          className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 dark:hover:bg-white/10 rounded-xl transition-colors text-xs font-bold cursor-pointer text-slate-950 dark:text-white"
        >
          <Trash2 className="w-3.5 h-3.5 text-rose-500" />
          Удалить записи
        </button>
      </div>
    </div>
  );
}
