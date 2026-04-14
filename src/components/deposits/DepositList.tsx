import React, { useState, useMemo } from 'react';
import { Landmark, Plus } from 'lucide-react';
import { motion } from 'motion/react';
import { Deposit } from '../../types';
import { db } from '../../db';
import { DepositForm } from './DepositForm';
import { calculateIncome } from '../../lib/depositCalculations';
import { SmartActionBar } from './SmartActionBar';
import { DepositRow } from './DepositRow';
import { DepositCard } from './DepositCard';
import { DeleteConfirmModal } from './DeleteConfirmModal';

interface DepositListProps {
  deposits: Deposit[];
  selectedYear: number;
}

export function DepositList({ deposits }: DepositListProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDeposit, setEditingDeposit] = useState<Deposit | undefined>();
  const [depositToDelete, setDepositToDelete] = useState<Deposit | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'closed'>('all');
  const [sortConfig, setSortConfigState] = useState<{ key: 'bank' | 'rate' | 'startDate' | 'endDate' | 'amount' | 'income' | 'total'; direction: 'asc' | 'desc' } | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimer = React.useRef<NodeJS.Timeout | null>(null);

  // Track scroll for sticky header effect and interaction transparency
  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100);
      setIsScrolling(true);
      if (scrollTimer.current) clearTimeout(scrollTimer.current);
      scrollTimer.current = setTimeout(() => setIsScrolling(false), 1500);
    };
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimer.current) clearTimeout(scrollTimer.current);
    };
  }, []);

  const filteredDeposits = useMemo(() => {
    const sorted = deposits.filter(d => {
      if (d.isArchived) return false;

      const matchesSearch = d.bank.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           (d.comment?.toLowerCase().includes(searchQuery.toLowerCase())) ||
                           (d.sourceNote?.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesStatus = filterStatus === 'all' || 
                           (filterStatus === 'active' && !d.isClosed) || 
                           (filterStatus === 'closed' && d.isClosed);
      
      return matchesSearch && matchesStatus;
    });

    if (sortConfig !== null) {
      sorted.sort((a, b) => {
        let aVal: any = a[sortConfig.key as keyof Deposit];
        let bVal: any = b[sortConfig.key as keyof Deposit];

        if (sortConfig.key === 'bank') {
          aVal = (a.bank || '').toLowerCase();
          bVal = (b.bank || '').toLowerCase();
        } else if (sortConfig.key === 'startDate') {
          aVal = a.startDate ? new Date(a.startDate).getTime() : 0;
          bVal = b.startDate ? new Date(b.startDate).getTime() : 0;
        } else if (sortConfig.key === 'endDate') {
          aVal = a.endDate ? new Date(a.endDate).getTime() : 0;
          bVal = b.endDate ? new Date(b.endDate).getTime() : 0;
        } else if (sortConfig.key === 'income') {
          aVal = calculateIncome(a);
          bVal = calculateIncome(b);
        } else if (sortConfig.key === 'total') {
          aVal = (Number(a.amount) || 0) + calculateIncome(a);
          bVal = (Number(b.amount) || 0) + calculateIncome(b);
        } else if (sortConfig.key === 'amount' || sortConfig.key === 'rate') {
          aVal = Number(aVal) || 0;
          bVal = Number(bVal) || 0;
        }

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    } else {
      sorted.sort((a, b) => {
        const aVal = a.startDate ? new Date(a.startDate).getTime() : 0;
        const bVal = b.startDate ? new Date(b.startDate).getTime() : 0;
        return bVal - aVal;
      });
    }
    return sorted;
  }, [deposits, searchQuery, filterStatus, sortConfig]);

  const requestSort = (key: 'bank' | 'rate' | 'startDate' | 'endDate' | 'amount' | 'income' | 'total') => {
    let direction: 'asc' | 'desc' = 'desc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfigState({ key, direction });
  };

  const resetSort = () => setSortConfigState(null);

  const confirmDelete = async () => {
    if (depositToDelete && depositToDelete.id) {
      await db.deposits.update(depositToDelete.id as any, { isArchived: 1, updatedAt: Date.now() });
      setDepositToDelete(null);
    }
  };

  const handleEdit = (deposit: Deposit) => {
    setEditingDeposit(deposit);
    setIsFormOpen(true);
  };

  return (
    <div className="space-y-6 md:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-5xl mx-auto px-1 sm:px-0 pb-24 lg:pb-0">
      <SmartActionBar 
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        sortConfig={sortConfig}
        requestSort={requestSort}
        resetSort={resetSort}
        filteredDeposits={filteredDeposits}
        onAddClick={() => { setEditingDeposit(undefined); setIsFormOpen(true); }}
        isScrolled={isScrolled}
      />

      {/* Floating Action Button for Mobile */}
      <div className="lg:hidden fixed bottom-15 right-6 z-50">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          animate={{ 
            opacity: isScrolling ? 0.4 : 1,
            scale: isScrolling ? 0.9 : 1
          }}
          onClick={() => { setEditingDeposit(undefined); setIsFormOpen(true); }}
          className="w-14 h-14 rounded-full bg-[#007AFF] text-white flex items-center justify-center shadow-2xl shadow-blue-500/40 transition-opacity duration-300"
        >
          <Plus className="w-6 h-6 stroke-[3px]" />
        </motion.button>
      </div>

      <div id="deposits-list" className="apple-card overflow-hidden">
        {/* Desktop & Landscape Tablet Table */}
        <div className="hidden lg:block w-full overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-separate border-spacing-0 min-w-[700px] xl:min-w-[800px]">
            <thead>
              <tr className="bg-[#F5F5F7]/50 dark:bg-white/5">
                <th className="pl-4 xl:pl-6 pr-2 py-3 font-bold text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-widest text-[9px] border-b border-light-border dark:border-dark-border w-[28%] xl:w-[24%]">Банк</th>
                <th className="px-2 py-3 font-bold text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-widest text-[9px] cursor-pointer hover:text-blue-600 transition-colors text-center border-b border-light-border dark:border-dark-border w-[12%] xl:w-[10%]" onClick={() => requestSort('rate')}>СТАВКА</th>
                <th className="hidden xl:table-cell px-2 py-3 font-bold text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-widest text-[9px] cursor-pointer hover:text-blue-600 transition-colors text-center border-b border-light-border dark:border-dark-border w-[10%]" onClick={() => requestSort('startDate')}>ОТКРЫТ</th>
                <th className="hidden xl:table-cell px-2 py-3 font-bold text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-widest text-[9px] cursor-pointer hover:text-blue-600 transition-colors text-center border-b border-light-border dark:border-dark-border w-[10%]" onClick={() => requestSort('endDate')}>ЗАКРЫТ</th>
                <th className="table-cell xl:hidden px-2 py-3 font-bold text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-widest text-[9px] cursor-pointer hover:text-blue-600 transition-colors text-center border-b border-light-border dark:border-dark-border w-[15%]" onClick={() => requestSort('startDate')}>ПЕРИОД</th>
                <th className="px-2 py-3 font-bold text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-widest text-[9px] cursor-pointer hover:text-blue-600 transition-colors border-b border-light-border dark:border-dark-border w-[20%] xl:w-[14%]" onClick={() => requestSort('amount')}>СУММА</th>
                <th className="hidden xl:table-cell px-2 py-3 font-bold text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-widest text-[9px] cursor-pointer hover:text-blue-600 transition-colors border-b border-light-border dark:border-dark-border w-[12%]" onClick={() => requestSort('income')}>ДОХОД</th>
                <th className="px-2 py-3 font-bold text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-widest text-[9px] cursor-pointer hover:text-blue-600 transition-colors border-b border-light-border dark:border-dark-border w-[20%] xl:w-[12%]" onClick={() => requestSort('total')}>ИТОГО</th>
                <th className="px-2 xl:px-4 py-3 border-b border-light-border dark:border-dark-border w-[60px] xl:w-[80px]"></th>
              </tr>
            </thead>
            <tbody>
              {filteredDeposits.length > 0 ? filteredDeposits.map((deposit, index) => (
                <DepositRow 
                  key={deposit.id || `deposit-${index}`} 
                  deposit={deposit} 
                  onEdit={() => handleEdit(deposit)}
                  onDelete={() => setDepositToDelete(deposit)}
                />
              )) : (
                <tr>
                  <td colSpan={9} className="py-24 text-center">
                    <Landmark className="w-16 h-16 text-slate-200 dark:text-slate-800 mx-auto mb-4" />
                    <p className="text-slate-400 font-bold text-lg">Вклады не найдены</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile & Portrait Tablet Cards */}
        <div className="block lg:hidden">
          <div className="flex flex-col divide-y divide-light-border dark:divide-dark-border">
            {filteredDeposits.length > 0 ? filteredDeposits.map((deposit, index) => (
              <DepositCard 
                key={deposit.id || `deposit-card-${index}`} 
                deposit={deposit} 
                onEdit={() => handleEdit(deposit)} 
                onDelete={() => setDepositToDelete(deposit)} 
              />
            )) : (
              <div className="py-24 text-center">
                <Landmark className="w-16 h-16 text-slate-200 dark:text-slate-800 mx-auto mb-4" />
                <p className="text-slate-400 font-bold text-lg">Вклады не найдены</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {isFormOpen && (
        <DepositForm 
          deposit={editingDeposit} 
          onClose={() => setIsFormOpen(false)} 
        />
      )}

      {depositToDelete && (
        <DeleteConfirmModal 
          deposit={depositToDelete}
          onConfirm={confirmDelete}
          onCancel={() => setDepositToDelete(null)}
        />
      )}
    </div>
  );
}
