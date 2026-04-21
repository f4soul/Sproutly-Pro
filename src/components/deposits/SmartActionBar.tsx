import React, { Fragment } from 'react';
import { Search, X, SlidersHorizontal, Download, ChevronDown, FileText, Image as ImageIcon, FileSpreadsheet, Plus } from 'lucide-react';
import { Menu, Transition, Popover } from '@headlessui/react';
import { cn } from '../../lib/utils';
import { Deposit } from '../../types';
import { exportToPDF, exportToImage, exportToXLSX } from '../../services/ExportService';

interface SmartActionBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filterStatus: 'all' | 'active' | 'closed';
  setFilterStatus: (status: 'all' | 'active' | 'closed') => void;
  sortConfig: { key: string; direction: 'asc' | 'desc' } | null;
  requestSort: (key: any) => void;
  resetSort: () => void;
  filteredDeposits: Deposit[];
  onAddClick: () => void;
  isScrolled: boolean;
}

export const SmartActionBar: React.FC<SmartActionBarProps> = ({
  searchQuery,
  setSearchQuery,
  filterStatus,
  setFilterStatus,
  sortConfig,
  requestSort,
  resetSort,
  filteredDeposits,
  onAddClick,
  isScrolled
}) => {
  return (
    <div className="sticky top-0 z-40 py-3 mb-2 bg-[#F5F5F7]/95 dark:bg-[#1C1C1E]/95 backdrop-blur-xl border-b border-light-border/50 dark:border-dark-border/50 w-full overflow-hidden">
      <div className="flex flex-col lg:flex-row gap-4 items-center">
        {/* Search & Integrated Controls */}
        <div className="relative w-full lg:flex-1 group">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-light-text-secondary dark:text-dark-text-secondary transition-colors group-focus-within:text-blue-500">
            <Search className="w-full h-full stroke-[2px]" />
          </div>
          <input 
            type="text" 
            placeholder="Поиск..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="apple-input !pl-12 pr-32 py-3.5 text-sm w-full bg-white dark:bg-white/5 border-transparent focus:bg-white dark:focus:bg-dark-card focus:border-blue-500/50 shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
          />
          
          {/* Integrated Mobile Icons */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')} 
                className="p-2 text-light-text-secondary hover:text-rose-500 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4 stroke-[2px]" />
              </button>
            )}
            
            <div className="w-px h-6 bg-light-border dark:bg-dark-border mx-1" />
            
            <Popover className="relative">
              <Popover.Button className="p-2 text-light-text-secondary dark:text-dark-text-secondary hover:bg-white dark:hover:bg-white/10 rounded-xl transition-all cursor-pointer">
                <SlidersHorizontal className={cn("w-5 h-5 stroke-[1.5px]", filterStatus !== 'all' ? "text-blue-500" : "")} />
              </Popover.Button>
              <Transition
                as={Fragment}
                enter="transition ease-out duration-200"
                enterFrom="opacity-0 translate-y-1"
                enterTo="opacity-100 translate-y-0"
                leave="transition ease-in duration-150"
                leaveFrom="opacity-100 translate-y-0"
                leaveTo="opacity-0 translate-y-1"
              >
                <Popover.Panel className="absolute right-0 mt-2 w-64 bg-white/95 dark:bg-dark-card/95 backdrop-blur-xl border border-light-border dark:border-dark-border rounded-2xl shadow-2xl z-50 p-4">
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-[10px] font-bold text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-widest mb-3">Статус вклада</h4>
                      <div className="flex bg-[#F5F5F7] dark:bg-white/5 rounded-xl p-1">
                        <button 
                          onClick={() => setFilterStatus('all')}
                          className={cn("flex-1 py-1.5 text-xs font-bold rounded-lg transition-all", filterStatus === 'all' ? "bg-white dark:bg-white/10 shadow-sm text-blue-600" : "text-light-text-secondary")}
                        >Все</button>
                        <button 
                          onClick={() => setFilterStatus('active')}
                          className={cn("flex-1 py-1.5 text-xs font-bold rounded-lg transition-all", filterStatus === 'active' ? "bg-white dark:bg-white/10 shadow-sm text-blue-600" : "text-light-text-secondary")}
                        >Актив</button>
                        <button 
                          onClick={() => setFilterStatus('closed')}
                          className={cn("flex-1 py-1.5 text-xs font-bold rounded-lg transition-all", filterStatus === 'closed' ? "bg-white dark:bg-white/10 shadow-sm text-blue-600" : "text-light-text-secondary")}
                        >Закрыт</button>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-[10px] font-bold text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-widest mb-3">Сортировка</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { key: 'startDate', label: 'Дата' },
                          { key: 'rate', label: 'Ставка' },
                          { key: 'amount', label: 'Сумма' },
                          { key: 'total', label: 'Итог' }
                        ].map((item) => (
                          <button
                            key={item.key}
                            onClick={() => requestSort(item.key as any)}
                            className={cn(
                              "py-2 px-3 text-[10px] font-bold rounded-xl border transition-all text-center",
                              sortConfig?.key === item.key 
                                ? "bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-500/10 dark:border-blue-500/20" 
                                : "bg-transparent border-light-border dark:border-dark-border text-light-text-secondary"
                            )}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    {sortConfig && (
                      <button 
                        onClick={resetSort}
                        className="w-full py-2 text-[10px] font-black uppercase tracking-widest text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all flex items-center justify-center gap-1.5"
                      >
                        <X className="w-3.5 h-3.5 stroke-[2.5px]" />
                        Сбросить всё
                      </button>
                    )}

                    <div className="pt-4 border-t border-light-border dark:border-dark-border">
                      <h4 className="text-[10px] font-bold text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-widest mb-3">Экспорт данных</h4>
                      <div className="grid grid-cols-3 gap-2">
                        <button 
                          onClick={() => exportToPDF('deposits-list', filteredDeposits)}
                          className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-[#F5F5F7] dark:hover:bg-white/5 transition-all"
                        >
                          <FileText className="w-5 h-5 text-rose-500" />
                          <span className="text-[8px] font-bold uppercase">PDF</span>
                        </button>
                        <button 
                          onClick={() => exportToImage('deposits-list', filteredDeposits)}
                          className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-[#F5F5F7] dark:hover:bg-white/5 transition-all"
                        >
                          <ImageIcon className="w-5 h-5 text-indigo-500" />
                          <span className="text-[8px] font-bold uppercase">PNG</span>
                        </button>
                        <button 
                          onClick={() => exportToXLSX(filteredDeposits)}
                          className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-[#F5F5F7] dark:hover:bg-white/5 transition-all"
                        >
                          <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
                          <span className="text-[8px] font-bold uppercase">XLSX</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </Popover.Panel>
              </Transition>
            </Popover>
          </div>
        </div>

        {/* Desktop Controls (hidden on mobile/tablet) */}
        <div className="hidden lg:flex items-center gap-3">
          <Menu as="div" className="relative">
            <Menu.Button className="apple-button bg-[#F5F5F7] dark:bg-white/5 text-light-text-primary dark:text-dark-text-primary flex items-center justify-center gap-2 text-sm px-5 py-3 border border-light-border dark:border-dark-border shadow-sm">
              <Download className="w-4 h-4 stroke-[1.5px]" />
              Экспорт
              <ChevronDown className="w-4 h-4 opacity-40" />
            </Menu.Button>
            
            <Transition
              as={Fragment}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <Menu.Items className="absolute right-0 mt-2 w-48 bg-white/90 dark:bg-dark-card/90 backdrop-blur-xl border border-light-border dark:border-dark-border rounded-2xl shadow-2xl z-[100] overflow-hidden focus:outline-none p-1">
                <Menu.Item>
                  {({ active }) => (
                    <button 
                      onClick={() => exportToPDF('deposits-list', filteredDeposits)} 
                      className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors cursor-pointer text-left", active ? "bg-[#F5F5F7] dark:bg-white/10" : "")}
                    >
                      <FileText className="w-4 h-4 text-rose-500 stroke-[1.5px]" />
                      <span className="text-sm font-medium">PDF Document</span>
                    </button>
                  )}
                </Menu.Item>
                <Menu.Item>
                  {({ active }) => (
                    <button 
                      onClick={() => exportToImage('deposits-list', filteredDeposits)} 
                      className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors cursor-pointer text-left", active ? "bg-[#F5F5F7] dark:bg-white/10" : "")}
                    >
                      <ImageIcon className="w-4 h-4 text-indigo-500 stroke-[1.5px]" />
                      <span className="text-sm font-medium">PNG Image</span>
                    </button>
                  )}
                </Menu.Item>
                <Menu.Item>
                  {({ active }) => (
                    <button 
                      onClick={() => exportToXLSX(filteredDeposits)} 
                      className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors cursor-pointer text-left", active ? "bg-[#F5F5F7] dark:bg-white/10" : "")}
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-500 stroke-[1.5px]" />
                      <span className="text-sm font-medium">Excel Sheet</span>
                    </button>
                  )}
                </Menu.Item>
              </Menu.Items>
            </Transition>
          </Menu>
          
          <button 
            onClick={onAddClick}
            className="apple-button bg-[#007AFF] hover:bg-[#0062CC] text-white flex items-center justify-center gap-2 text-sm px-6 py-3 shadow-lg shadow-blue-500/25 active:scale-[0.98] transition-all"
          >
            <Plus className="w-4 h-4 stroke-[2.5px]" />
            Добавить вклад
          </button>
        </div>
      </div>
    </div>
  );
};
