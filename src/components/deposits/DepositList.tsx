import React, { useState, useMemo } from 'react';
import { Landmark, Plus, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Deposit } from '../../types';
import { db, syncWithFirebase } from '../../config/db';
import { exportToPDF } from '../../services/ExportService';
import { DepositForm } from './DepositForm';
import { calculateIncome, isDepositClosed } from '../../lib/depositCalculations';
import { SmartActionBar } from './SmartActionBar';
import { DepositRow } from './DepositRow';
import { DepositCard } from './DepositCard';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { cn } from '../../lib/utils';

interface DepositListProps {
  deposits: Deposit[];
  selectedYear: number;
  isPrivate?: boolean;
}

export function DepositList({ deposits, isPrivate = false }: DepositListProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDeposit, setEditingDeposit] = useState<Deposit | undefined>();
  const [depositToDelete, setDepositToDelete] = useState<Deposit | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'closed'>('all');
  const [sortConfig, setSortConfigState] = useState<{ key: 'bank' | 'rate' | 'startDate' | 'endDate' | 'amount' | 'income' | 'total'; direction: 'asc' | 'desc' } | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);
  const interactTimer = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100);
      setIsInteracting(true);
      if (interactTimer.current) clearTimeout(interactTimer.current);
      interactTimer.current = setTimeout(() => setIsInteracting(false), 300);
    };
    
    // Simple interaction tracker for touches and scrolls
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('touchstart', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('touchstart', handleScroll);
      if (interactTimer.current) clearTimeout(interactTimer.current);
    };
  }, []);

  const filteredDeposits = useMemo(() => {
    const sorted = deposits.filter(d => {
      if (d.isArchived) return false;

      const matchesSearch = d.bank.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           (d.comment?.toLowerCase().includes(searchQuery.toLowerCase())) ||
                           (d.sourceNote?.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const depositClosed = isDepositClosed(d);
      const matchesStatus = filterStatus === 'all' || 
                           (filterStatus === 'active' && !depositClosed) || 
                           (filterStatus === 'closed' && depositClosed);
      
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
        // Group by status (active first)
        const aClosed = isDepositClosed(a) ? 1 : 0;
        const bClosed = isDepositClosed(b) ? 1 : 0;
        if (aClosed !== bClosed) return aClosed - bClosed;
        
        // Then sort by start date descending
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
      syncWithFirebase();
      setDepositToDelete(null);
    }
  };

  const handleEdit = (deposit: Deposit) => {
    setEditingDeposit(deposit);
    setIsFormOpen(true);
  };

  return (
    <div id="deposits-list-content" className="space-y-6 md:space-y-10 w-full max-w-6xl mx-auto pb-24 lg:pb-0">
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
      <div className={cn("lg:hidden fixed bottom-24 right-6 z-[60] transition-all duration-300", isInteracting && "pointer-events-none")}>
        <motion.button
          initial={{ opacity: 0, scale: 0.5, y: 20 }}
          animate={{ 
            opacity: isInteracting ? 0.3 : 1,
            scale: isInteracting ? 0.9 : 1,
            y: 0
          }}
          transition={{ 
            type: "tween",
            ease: "easeInOut",
            duration: 0.2
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => { setEditingDeposit(undefined); setIsFormOpen(true); }}
          className="w-14 h-14 rounded-full bg-deposit-500 hover:bg-deposit-600 dark:bg-deposit-600 dark:hover:bg-deposit-500 text-white flex items-center justify-center shadow-2xl shadow-deposit-500/40"
        >
          <Plus className="w-6 h-6 stroke-[3px]" />
        </motion.button>
      </div>

      {/* Desktop & Landscape Tablet Table */}
      <div id="deposits-list-table" className="hidden lg:block w-full overflow-x-auto scrollbar-hide bg-white dark:bg-slate-950 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <table className="w-full text-left border-separate border-spacing-0 min-w-[700px] xl:min-w-[800px]">
          <thead>
              <tr className="bg-slate-50 dark:bg-[#151b2a]">
                <th className="pl-4 xl:pl-6 pr-2 py-3 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-[9px] text-left border-b border-slate-200 dark:border-slate-800">Банк</th>
                <th className="px-2 py-3 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-[9px] cursor-pointer hover:text-primary-600 transition-colors text-center border-b border-slate-200 dark:border-slate-800" onClick={() => requestSort('rate')}>СТАВКА</th>
                <th className="hidden xl:table-cell px-2 py-3 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-[9px] cursor-pointer hover:text-primary-600 transition-colors text-center border-b border-slate-200 dark:border-slate-800" onClick={() => requestSort('startDate')}>ОТКРЫТ</th>
                <th className="hidden xl:table-cell px-2 py-3 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-[9px] cursor-pointer hover:text-primary-600 transition-colors text-center border-b border-slate-200 dark:border-slate-800" onClick={() => requestSort('endDate')}>ЗАКРЫТ</th>
                <th className="table-cell xl:hidden px-2 py-3 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-[9px] cursor-pointer hover:text-primary-600 transition-colors text-center border-b border-slate-200 dark:border-slate-800" onClick={() => requestSort('startDate')}>ПЕРИОД</th>
                <th className="px-2 py-3 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-[9px] cursor-pointer hover:text-primary-600 transition-colors text-center border-b border-slate-200 dark:border-slate-800" onClick={() => requestSort('amount')}>СУММА</th>
                <th className="hidden xl:table-cell px-2 py-3 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-[9px] cursor-pointer hover:text-primary-600 transition-colors text-center border-b border-slate-200 dark:border-slate-800" onClick={() => requestSort('income')}>ДОХОД</th>
                <th className="px-2 py-3 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-[9px] cursor-pointer hover:text-primary-600 transition-colors text-center border-b border-slate-200 dark:border-slate-800" onClick={() => requestSort('total')}>ИТОГО</th>
                <th className="pr-4 xl:pr-6 py-3 border-b border-slate-200 dark:border-slate-800 w-[84px] xl:w-[100px] sticky right-0 bg-slate-50 dark:bg-[#151b2a] z-10"></th>
              </tr>
            </thead>
            <tbody className="[&>tr>td]:border-b [&>tr:last-child>td]:border-b-0 [&>tr>td]:border-slate-200 dark:[&>tr>td]:border-slate-800">
              {filteredDeposits.length > 0 ? filteredDeposits.map((deposit, index) => (
                <DepositRow 
                  key={`deposit-row-${deposit.id || index}-${index}`} 
                  deposit={deposit} 
                  onEdit={() => handleEdit(deposit)}
                  onDelete={() => setDepositToDelete(deposit)}
                  isPrivate={isPrivate}
                  isLast={index === filteredDeposits.length - 1}
                />
              )) : (
                <tr>
                  <td colSpan={9} className="py-24 text-center">
                    <Landmark className="w-16 h-16 text-slate-200 dark:text-slate-800 mx-auto mb-4" />
                    <p className="text-slate-500 dark:text-slate-400 font-bold text-lg">Вклады не найдены</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile & Portrait Tablet Cards */}
        <div className="block lg:hidden">
          <div className="flex flex-col bg-white dark:bg-slate-950 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            {filteredDeposits.length > 0 ? filteredDeposits.map((deposit, index) => (
              <DepositCard 
                key={`deposit-card-${deposit.id || index}-${index}`} 
                deposit={deposit} 
                onEdit={() => handleEdit(deposit)} 
                onDelete={() => setDepositToDelete(deposit)} 
                isPrivate={isPrivate}
                isLast={index === filteredDeposits.length - 1}
              />
            )) : (
              <div className="py-24 text-center">
                <Landmark className="w-16 h-16 text-slate-200 dark:text-slate-800 mx-auto mb-4" />
                <p className="text-slate-500 dark:text-slate-400 font-bold text-lg">Вклады не найдены</p>
              </div>
            )}
          </div>
        </div>

      <AnimatePresence>
        {isFormOpen && (
          <DepositForm 
            deposit={editingDeposit} 
            onClose={() => setIsFormOpen(false)} 
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {depositToDelete && (
          <DeleteConfirmModal 
            deposit={depositToDelete}
            onConfirm={confirmDelete}
            onCancel={() => setDepositToDelete(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
