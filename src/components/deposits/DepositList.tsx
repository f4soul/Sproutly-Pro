import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Landmark, Plus, ChevronUp, ChevronDown, BarChart3, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence, useIsPresent } from 'motion/react';
import { Deposit } from '../../types';
import { db, syncWithFirebase } from '../../config/db';
import { DepositForm } from './DepositForm';
import { calculateIncome, isDepositClosed } from '../../lib/depositCalculations';
import { SmartActionBar } from './SmartActionBar';
import { DepositRow } from './DepositRow';
import { DepositCard } from './DepositCard';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { cn, formatCurrency } from '../../lib/utils';
import { getExchangeRates, convertToRub, CurrencyRates } from '../../services/currency';
import { PrivacyBlur } from '../ui/PrivacyBlur';

interface DepositListProps {
  deposits: Deposit[];
  selectedYear: number;
  isPrivate?: boolean;
}

export function DepositList({ deposits, isPrivate = false }: DepositListProps) {
  const isPresent = useIsPresent();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDeposit, setEditingDeposit] = useState<Deposit | undefined>();
  const [depositToDelete, setDepositToDelete] = useState<Deposit | null>(null);
  const [searchQuery, setSearchQuery] = useState(() => {
    return sessionStorage.getItem('deposits_searchQuery') || '';
  });
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'closed'>(() => {
    return (sessionStorage.getItem('deposits_filterStatus') as 'all' | 'active' | 'closed') || 'active';
  });
  const [selectedBanks, setSelectedBanks] = useState<string[]>(() => {
    try {
      const stored = sessionStorage.getItem('deposits_selectedBanks');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [isAnalyticsExpanded, setIsAnalyticsExpanded] = useState(false);
  const [sortConfig, setSortConfigState] = useState<{ key: 'bank' | 'rate' | 'startDate' | 'endDate' | 'amount' | 'income' | 'total'; direction: 'asc' | 'desc' } | null>(() => {
    try {
      const stored = sessionStorage.getItem('deposits_sortConfig');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [isScrolled, setIsScrolled] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const [rates, setRates] = useState<CurrencyRates | null>(null);

  React.useEffect(() => {
    getExchangeRates().then(setRates);
  }, []);

  React.useEffect(() => {
    sessionStorage.setItem('deposits_searchQuery', searchQuery);
  }, [searchQuery]);

  React.useEffect(() => {
    sessionStorage.setItem('deposits_filterStatus', filterStatus);
  }, [filterStatus]);

  React.useEffect(() => {
    sessionStorage.setItem('deposits_selectedBanks', JSON.stringify(selectedBanks));
  }, [selectedBanks]);

  React.useEffect(() => {
    sessionStorage.setItem('deposits_sortConfig', sortConfig ? JSON.stringify(sortConfig) : '');
  }, [sortConfig]);

  const uniqueBanks = useMemo(() => {
    const names = deposits
      .filter(d => {
        if (d.isArchived) return false;
        const depositClosed = isDepositClosed(d);
        if (filterStatus === 'active' && depositClosed) return false;
        if (filterStatus === 'closed' && !depositClosed) return false;
        return true;
      })
      .map(d => d.bank.trim());
    return Array.from(new Set(names)).filter(Boolean).sort();
  }, [deposits, filterStatus]);

  const [isMounted, setIsMounted] = useState(false);

  React.useEffect(() => {
    setIsMounted(true);
    let scrollTimeout: NodeJS.Timeout;
    let isInitial = true;
    
    // Shield the scroll event from the initial mount-time/tab-change scroll reset.
    // This ensures that when the page / tab loads, the FAB does not falsely enter the
    // "scrolling/dimmed" state, synchronized with the page load.
    const initialTimeout = setTimeout(() => {
      isInitial = false;
    }, 250);

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100);
      
      if (!isInitial) {
        setIsScrolling(true);
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          setIsScrolling(false);
        }, 800);
      }
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
      clearTimeout(initialTimeout);
    };
  }, []);

  const filteredDeposits = useMemo(() => {
    const queryLower = searchQuery.toLowerCase().trim();
    const hasSelectedBanks = selectedBanks.length > 0;

    const hasBankMatch = queryLower ? deposits.some(d => d.bank.toLowerCase().includes(queryLower)) : false;

    const sorted = deposits.filter(d => {
      if (d.isArchived) return false;

      // Filter by selected bank pills if any selected
      if (hasSelectedBanks && !selectedBanks.includes(d.bank.trim())) {
        return false;
      }

      // Filter by search query if any entered
      let matchesSearch = true;
      if (queryLower) {
        if (hasBankMatch) {
          matchesSearch = d.bank.toLowerCase().includes(queryLower);
        } else {
          matchesSearch = d.bank.toLowerCase().includes(queryLower) || 
                          d.comment?.toLowerCase().includes(queryLower) ||
                          d.sourceNote?.toLowerCase().includes(queryLower);
        }
      }
      
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
          aVal = convertToRub(calculateIncome(a), a.currency || 'RUB', rates);
          bVal = convertToRub(calculateIncome(b), b.currency || 'RUB', rates);
        } else if (sortConfig.key === 'total') {
          aVal = convertToRub(Number(a.amount) || 0, a.currency || 'RUB', rates) + convertToRub(calculateIncome(a), a.currency || 'RUB', rates);
          bVal = convertToRub(Number(b.amount) || 0, b.currency || 'RUB', rates) + convertToRub(calculateIncome(b), b.currency || 'RUB', rates);
        } else if (sortConfig.key === 'amount') {
          aVal = convertToRub(Number(a.amount) || 0, a.currency || 'RUB', rates);
          bVal = convertToRub(Number(b.amount) || 0, b.currency || 'RUB', rates);
        } else if (sortConfig.key === 'rate') {
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
  }, [deposits, searchQuery, filterStatus, sortConfig, selectedBanks]);

  const filteredTotals = useMemo(() => {
    const amount = filteredDeposits.reduce((acc, d) => acc + convertToRub(Number(d.amount) || 0, d.currency || 'RUB', rates), 0);
    const income = filteredDeposits.reduce((acc, d) => acc + convertToRub(calculateIncome(d), d.currency || 'RUB', rates), 0);
    return {
      amount,
      income,
      total: amount + income,
      count: filteredDeposits.length
    };
  }, [filteredDeposits, rates]);

  const requestSort = (key: 'bank' | 'rate' | 'startDate' | 'endDate' | 'amount' | 'income' | 'total') => {
    const defaultDir = key === 'bank' ? 'asc' : 'desc';
    const nextDir = defaultDir === 'asc' ? 'desc' : 'asc';

    if (sortConfig && sortConfig.key === key) {
      if (sortConfig.direction === defaultDir) {
        setSortConfigState({ key, direction: nextDir });
      } else {
        setSortConfigState(null);
      }
    } else {
      setSortConfigState({ key, direction: defaultDir });
    }
  };

  const renderSortIndicator = (key: 'bank' | 'rate' | 'startDate' | 'endDate' | 'amount' | 'income' | 'total') => {
    if (!sortConfig || sortConfig.key !== key) return null;
    
    // Для "bank" 'asc' (А до Я) показывает стрелку вниз (↓), а 'desc' (Я до А) - вверх (↑)
    // Для остальных полей 'desc' (по убыванию) показывает стрелку вниз (↓), а 'asc' (по возрастанию) - вверх (↑)
    const isDown = key === 'bank'
      ? sortConfig.direction === 'asc'
      : sortConfig.direction === 'desc';

    return (
      <span className="absolute -right-3.5 text-primary-500 dark:text-primary-400 font-bold select-none text-[10px]">
        {isDown ? ' ↓' : ' ↑'}
      </span>
    );
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
        selectedBanks={selectedBanks}
        onSelectedBanksChange={setSelectedBanks}
        uniqueBanks={uniqueBanks}
      />

      {/* Floating Action Button for Mobile & Tablet */}
      {isMounted && typeof document !== 'undefined' && createPortal(
        <motion.div 
          className={cn(
            "lg:hidden fixed right-4 sm:right-8 z-[60] transition-all", 
            !isPresent 
              ? "duration-100 opacity-0 scale-75 pointer-events-none" 
              : (isAnalyticsExpanded 
                ? "bottom-[92px] md:bottom-[140px] opacity-0 scale-50 pointer-events-none translate-y-4 duration-300" 
                : cn(
                    "bottom-[180px] md:bottom-[140px] duration-300",
                    isScrolling
                      ? "opacity-20 scale-90 pointer-events-none"
                      : "opacity-100 scale-100"
                  )
                )
          )}
        >
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => { setEditingDeposit(undefined); setIsFormOpen(true); }}
            className="w-14 h-14 rounded-full bg-deposit-500 hover:bg-deposit-600 dark:bg-deposit-600 dark:hover:bg-deposit-500 text-white flex items-center justify-center shadow-2xl shadow-deposit-500/40 active:scale-95 transition-transform"
          >
            <Plus className="w-6 h-6 stroke-[3px]" />
          </motion.button>
        </motion.div>,
        document.body
      )}

      {/* Desktop & Landscape Tablet Table */}
      <div id="deposits-list-table" className="hidden lg:block w-full overflow-x-auto scrollbar-hide bg-white dark:bg-slate-950 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <table className="w-full text-left border-separate border-spacing-0 min-w-[700px] xl:min-w-[800px]">
          <thead>
              <tr className="bg-white dark:bg-slate-950">
                <th className="pl-4 xl:pl-6 pr-2 py-3 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-[9px] cursor-pointer hover:text-primary-600 transition-colors text-center border-b border-slate-200 dark:border-slate-800" onClick={() => requestSort('bank')}>
                  <span className="relative inline-flex items-center justify-center">
                    Банк
                    {renderSortIndicator('bank')}
                  </span>
                </th>
                <th className="px-2 py-3 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-[9px] cursor-pointer hover:text-primary-600 transition-colors text-center border-b border-slate-200 dark:border-slate-800" onClick={() => requestSort('rate')}>
                  <span className="relative inline-flex items-center justify-center">
                    СТАВКА
                    {renderSortIndicator('rate')}
                  </span>
                </th>
                <th className="hidden xl:table-cell px-2 py-3 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-[9px] cursor-pointer hover:text-primary-600 transition-colors text-center border-b border-slate-200 dark:border-slate-800" onClick={() => requestSort('startDate')}>
                  <span className="relative inline-flex items-center justify-center">
                    ОТКРЫТ
                    {renderSortIndicator('startDate')}
                  </span>
                </th>
                <th className="hidden xl:table-cell px-2 py-3 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-[9px] cursor-pointer hover:text-primary-600 transition-colors text-center border-b border-slate-200 dark:border-slate-800" onClick={() => requestSort('endDate')}>
                  <span className="relative inline-flex items-center justify-center">
                    ЗАКРЫТ
                    {renderSortIndicator('endDate')}
                  </span>
                </th>
                <th className="table-cell xl:hidden px-2 py-3 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-[9px] cursor-pointer hover:text-primary-600 transition-colors text-center border-b border-slate-200 dark:border-slate-800" onClick={() => requestSort('startDate')}>
                  <span className="relative inline-flex items-center justify-center">
                    ПЕРИОД
                    {renderSortIndicator('startDate')}
                  </span>
                </th>
                <th className="px-2 py-3 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-[9px] cursor-pointer hover:text-primary-600 transition-colors text-center border-b border-slate-200 dark:border-slate-800" onClick={() => requestSort('amount')}>
                  <span className="relative inline-flex items-center justify-center">
                    СУММА
                    {renderSortIndicator('amount')}
                  </span>
                </th>
                <th className="hidden xl:table-cell px-2 py-3 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-[9px] cursor-pointer hover:text-primary-600 transition-colors text-center border-b border-slate-200 dark:border-slate-800" onClick={() => requestSort('income')}>
                  <span className="relative inline-flex items-center justify-center">
                    ДОХОД
                    {renderSortIndicator('income')}
                  </span>
                </th>
                <th className="px-2 py-3 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-[9px] cursor-pointer hover:text-primary-600 transition-colors text-center border-b border-slate-200 dark:border-slate-800" onClick={() => requestSort('total')}>
                  <span className="relative inline-flex items-center justify-center">
                    ИТОГО
                    {renderSortIndicator('total')}
                  </span>
                </th>
                <th className="pr-4 xl:pr-6 py-3 border-b border-slate-200 dark:border-slate-800 w-[84px] xl:w-[100px] sticky right-0 bg-white dark:bg-slate-950 z-10"></th>
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
                    {searchQuery ? (
                      <div className="flex flex-col items-center gap-3">
                        <p className="text-slate-500 dark:text-slate-400 font-bold text-lg">
                          По фильтру «{filterStatus === 'active' ? 'Текущие' : filterStatus === 'closed' ? 'Закрытые' : 'Все'}» ничего не найдено
                        </p>
                        {filterStatus !== 'all' && (
                          <button
                            onClick={() => setFilterStatus('all')}
                            className="px-4 py-2 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 font-bold text-sm rounded-xl hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors"
                          >
                            Искать во всех вкладах
                          </button>
                        )}
                        <button
                          onClick={() => { setSearchQuery(''); setSelectedBanks([]); }}
                          className="text-slate-400 hover:text-slate-600 font-medium text-sm transition-colors mt-2 underline underline-offset-4 decoration-slate-300 dark:decoration-slate-700 hover:decoration-slate-500"
                        >
                          Сбросить поиск
                        </button>
                      </div>
                    ) : selectedBanks.length > 0 ? (
                      <div className="flex flex-col items-center gap-3">
                        <p className="text-slate-500 dark:text-slate-400 font-bold text-lg">Для выбранных банков нет записей</p>
                        <button
                          onClick={() => setSelectedBanks([])}
                          className="text-primary-500 hover:text-primary-600 font-semibold underline underline-offset-4 decoration-primary-500/30 hover:decoration-primary-600 transition-colors"
                        >
                          Сбросить фильтр банков
                        </button>
                      </div>
                    ) : (
                      <p className="text-slate-500 dark:text-slate-400 font-bold text-lg">Вклады не найдены</p>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
            {filteredDeposits.length > 0 && (
              <tfoot>
                <tr className="bg-white/80 dark:bg-slate-950/90 font-bold border-t border-slate-200 dark:border-slate-800">
                  <td className="pl-4 xl:pl-6 pr-2 py-4 border-slate-200 dark:border-slate-800 text-left border-b-0">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Итого выбрано</span>
                      <span className="text-[12px] font-bold text-slate-850 dark:text-slate-200">
                        {filteredTotals.count} {filteredTotals.count === 1 ? 'вклад' : filteredTotals.count < 5 ? 'вклада' : 'вкладов'}
                      </span>
                    </div>
                  </td>
                  <td className="px-2 py-4 border-slate-200 dark:border-slate-800 border-b-0"></td>
                  <td className="hidden xl:table-cell px-2 py-4 border-slate-200 dark:border-slate-800 border-b-0"></td>
                  <td className="hidden xl:table-cell px-2 py-4 border-slate-200 dark:border-slate-800 border-b-0"></td>
                  <td className="table-cell xl:hidden px-2 py-4 border-slate-200 dark:border-slate-800 border-b-0"></td>
                  <td className="px-2 py-4 text-center border-slate-200 dark:border-slate-800 font-mono text-[13px] font-semibold text-slate-950 dark:text-white border-b-0">
                    <PrivacyBlur isPrivate={isPrivate}>{formatCurrency(filteredTotals.amount)}</PrivacyBlur>
                  </td>
                  <td className="hidden xl:table-cell px-2 py-4 text-center border-slate-200 dark:border-slate-800 font-mono text-[13px] font-semibold text-deposit-600 dark:text-deposit-400 border-b-0">
                    <PrivacyBlur isPrivate={isPrivate}>+{formatCurrency(filteredTotals.income)}</PrivacyBlur>
                  </td>
                  <td className="hidden xl:table-cell px-2 py-4 text-center border-slate-200 dark:border-slate-800 font-mono text-[13px] font-black text-slate-950 dark:text-white border-b-0">
                    <PrivacyBlur isPrivate={isPrivate}>{formatCurrency(filteredTotals.total)}</PrivacyBlur>
                  </td>
                  <td className="table-cell xl:hidden px-2 py-4 text-center border-slate-200 dark:border-slate-800 border-b-0">
                    <div className="flex flex-col items-center justify-center font-mono font-semibold">
                      <span className="text-[13px] font-bold text-slate-950 dark:text-white">
                        <PrivacyBlur isPrivate={isPrivate}>{formatCurrency(filteredTotals.total)}</PrivacyBlur>
                      </span>
                      <span className="text-[11px] text-deposit-600 dark:text-deposit-400">
                        +<PrivacyBlur isPrivate={isPrivate}>{formatCurrency(filteredTotals.income)}</PrivacyBlur>
                      </span>
                    </div>
                  </td>
                  <td className="pr-4 xl:pr-6 py-4 border-slate-200 dark:border-slate-800 sticky right-0 bg-white/80 dark:bg-slate-950/90 z-10 border-b-0"></td>
                </tr>
              </tfoot>
            )}
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
              <div className="py-24 text-center px-4">
                <Landmark className="w-16 h-16 text-slate-200 dark:text-slate-800 mx-auto mb-4" />
                {searchQuery ? (
                  <div className="flex flex-col items-center gap-3">
                    <p className="text-slate-500 dark:text-slate-400 font-bold text-lg text-center leading-snug">
                      По фильтру «{filterStatus === 'active' ? 'Текущие' : filterStatus === 'closed' ? 'Закрытые' : 'Все'}» ничего не найдено
                    </p>
                    {filterStatus !== 'all' && (
                      <button
                        onClick={() => setFilterStatus('all')}
                        className="px-4 py-2 mt-2 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 font-bold inline-flex rounded-xl hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors"
                      >
                        Искать во всех
                      </button>
                    )}
                    <button
                      onClick={() => { setSearchQuery(''); setSelectedBanks([]); }}
                      className="text-slate-400 hover:text-slate-600 font-medium text-sm transition-colors mt-2 underline underline-offset-4 decoration-slate-300 dark:decoration-slate-700 hover:decoration-slate-500"
                    >
                      Сбросить поиск
                    </button>
                  </div>
                ) : selectedBanks.length > 0 ? (
                  <div className="flex flex-col items-center gap-3">
                    <p className="text-slate-500 dark:text-slate-400 font-bold text-lg">Выбранные банки пусты</p>
                    <button
                      onClick={() => setSelectedBanks([])}
                      className="text-primary-500 hover:text-primary-600 font-semibold underline underline-offset-4 decoration-primary-500/30 hover:decoration-primary-600 transition-colors"
                    >
                      Сбросить фильтр банков
                    </button>
                  </div>
                ) : (
                  <p className="text-slate-500 dark:text-slate-400 font-bold text-lg">Вклады не найдены</p>
                )}
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

      {/* Floating Holographic Analytics Panel for Mobile/Portrait Tablet */}
      {filteredDeposits.length > 0 && isMounted && typeof document !== 'undefined' && createPortal(
        <motion.div 
          className={cn(
            "block lg:hidden fixed z-[60] pointer-events-none drop-shadow-xl transition-all mx-auto",
            "bottom-[92px] inset-x-4 max-w-sm",
            "md:bottom-8 md:inset-x-auto md:left-[18.5rem] md:right-6 md:max-w-none md:max-w-6xl",
            !isPresent 
              ? "duration-100 opacity-0 scale-95 translate-y-4" 
              : "duration-300"
          )}
        >
          <div
            className={cn(
              "w-full pointer-events-auto overflow-hidden",
              "border border-slate-200/70 dark:border-white/[0.1] shadow-[0_24px_60px_rgba(0,0,0,0.35)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.75)] backdrop-blur-3xl transition-all duration-300 ease-in-out cursor-pointer",
              isAnalyticsExpanded
                ? "bg-white/98 dark:bg-slate-950/98 rounded-2xl"
                : "bg-white/98 dark:bg-slate-900/98 rounded-2xl hover:bg-white dark:hover:bg-slate-900 active:scale-[0.98]"
            )}
            onClick={() => setIsAnalyticsExpanded(!isAnalyticsExpanded)}
          >
            {/* Soft atmospheric gradient glow behind standard cashflow pattern */}
            <AnimatePresence>
              {isAnalyticsExpanded && (
                <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="absolute top-0 right-0 w-24 h-24 bg-deposit-500/10 rounded-full blur-2xl pointer-events-none -translate-y-6 translate-x-6 z-0" 
                />
              )}
            </AnimatePresence>

            <div className="relative z-10 px-5 transition-all duration-300 py-3">
              <div className="flex flex-col">
                
                {/* Header Section (always row) */}
                <div className="flex items-center justify-between w-full">
                  {/* Icon & Title */}
                  <div className="flex items-center gap-3">
                    <div className={cn("shrink-0 rounded-lg flex items-center justify-center transition-all bg-deposit-500/10 dark:bg-deposit-500/25", isAnalyticsExpanded ? "w-7 h-7" : "w-7 h-7 relative")}>
                      {!isAnalyticsExpanded && <div className="absolute inset-0 rounded-lg bg-deposit-500/10 animate-ping opacity-60" />}
                      {isAnalyticsExpanded ? (
                        <TrendingUp className="w-4 h-4 text-deposit-600 dark:text-deposit-400" />
                      ) : (
                        <BarChart3 className="w-3.5 h-3.5 text-deposit-600 dark:text-deposit-400 relative z-10" />
                      )}
                    </div>
                    
                    <div className="flex flex-col text-left">
                      <span className={cn("font-black uppercase tracking-tight leading-none mb-0.5", isAnalyticsExpanded ? "text-[10px] text-slate-900 dark:text-white" : "text-[7px] text-slate-400 dark:text-slate-500 tracking-widest mt-0.5")}>
                        {selectedBanks.length > 0 ? (isAnalyticsExpanded ? 'Аналитика фильтра' : 'Фильтр применен') : (isAnalyticsExpanded ? 'Общая аналитика' : 'Вся аналитика')}
                      </span>
                      
                      {isAnalyticsExpanded ? (
                        <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">Вклады: {filteredTotals.count}</span>
                      ) : (
                        <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-slate-850 dark:text-white leading-none">
                          <PrivacyBlur isPrivate={isPrivate}>{formatCurrency(filteredTotals.total)}</PrivacyBlur>
                          <span className="text-[9px] font-medium text-deposit-600 dark:text-deposit-400">
                            (+<PrivacyBlur isPrivate={isPrivate}>{formatCurrency(filteredTotals.income)}</PrivacyBlur>)
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right side Actions / Indicators */}
                  <div className="flex items-center justify-end shrink-0 pl-4">
                    <div className={cn(
                      "flex items-center justify-center transition-all", 
                      isAnalyticsExpanded ? "w-7 h-7 rounded-full bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400" : "w-4 h-4 text-slate-400"
                    )}>
                      {isAnalyticsExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Card Metrics */}
                <AnimatePresence initial={false}>
                  {isAnalyticsExpanded && (
                    <motion.div 
                      key="card-metrics"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="pt-2 grid grid-cols-2 gap-4 pb-2">
                        <div className="flex flex-col text-left">
                          <span className="text-[9px] text-slate-500 dark:text-slate-400 uppercase tracking-widest font-black mb-1">Сумма вкладов</span>
                          <span className="text-sm font-black text-slate-900 dark:text-white tracking-tight leading-none font-mono">
                            <PrivacyBlur isPrivate={isPrivate}>{formatCurrency(filteredTotals.amount)}</PrivacyBlur>
                          </span>
                        </div>
                        
                        <div className="flex flex-col text-right">
                          <span className="text-[9px] text-slate-500 dark:text-slate-400 uppercase tracking-widest font-black mb-1">Ожидаемый доход</span>
                          <span className="text-sm font-black text-deposit-600 dark:text-deposit-400 tracking-tight leading-none font-mono">
                            +<PrivacyBlur isPrivate={isPrivate}>{formatCurrency(filteredTotals.income)}</PrivacyBlur>
                          </span>
                        </div>

                        <div className="col-span-2 pt-3.5 mt-1 border-t border-slate-200/50 dark:border-white/[0.05] flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Итоговая сумма</span>
                          <span className="text-base font-black text-slate-950 dark:text-white tracking-tight font-mono">
                            <PrivacyBlur isPrivate={isPrivate}>{formatCurrency(filteredTotals.total)}</PrivacyBlur>
                          </span>
                        </div>
                      </div>

                      {/* Tags */}
                      {(selectedBanks.length > 0 || filterStatus !== 'active') && (
                        <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-slate-100 dark:border-white/[0.03] w-full">
                          {selectedBanks.map(b => (
                            <span key={b} className="px-2 py-0.5 bg-deposit-500/10 text-deposit-600 dark:text-deposit-400 text-[8px] font-bold rounded-md uppercase tracking-tight">
                              {b}
                            </span>
                          ))}
                          {filterStatus !== 'active' && (
                            <span className="px-2 py-0.5 bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 text-[8px] font-bold rounded-md uppercase tracking-tight">
                              {filterStatus === 'all' ? 'Все' : 'Закрытые'}
                            </span>
                          )}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </motion.div>,
        document.body
      )}
    </div>
  );
}
