import React, { useState, useMemo, Fragment } from "react";
import { Plus, Edit3, Trash2, Bitcoin, ShieldAlert } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Dialog, Transition } from "@headlessui/react";
import { CryptoAsset } from "../../types";
import { db, emitSyncEvent, syncWithFirebase } from "../../config/db";
import { auth } from "../../config/firebase";
import { CryptoForm } from "./CryptoForm";
import { CryptoLogo } from "./CryptoLogo";
import { cn, formatCurrency, getPlural } from "../../lib/utils";
import { PrivacyBlur } from "../ui/PrivacyBlur";
import { getCryptoRates, getCryptoRate, CryptoRates } from "../../services/crypto";
import { AssetStack } from "./stack/AssetStack";

interface CryptoListProps {
  cryptoAssets: CryptoAsset[];
  isPrivate?: boolean;
}

export function CryptoList({ cryptoAssets, isPrivate = false }: CryptoListProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<CryptoAsset | undefined>();
  const [deletingAsset, setDeletingAsset] = useState<CryptoAsset | undefined>();
  const [rates, setRates] = useState<CryptoRates | null>(null);
  const [expandedGroupKey, setExpandedGroupKey] = useState<string | null>(null);

  React.useEffect(() => {
    getCryptoRates().then(setRates);
  }, []);

  const activeAssets = useMemo(() => {
    return cryptoAssets ? cryptoAssets.filter((a) => !a.isArchived) : [];
  }, [cryptoAssets]);

  const stats = useMemo(() => {
    let totalContributed = 0;
    let totalCurrent = 0;

    activeAssets.forEach(asset => {
      const liveRateRub = getCryptoRate(asset.ticker, 'rub', rates);
      const currentRub = liveRateRub ? asset.quantity * liveRateRub : (asset.currentValue ?? asset.amount);
      
      totalContributed += asset.amount;
      totalCurrent += currentRub;
    });

    const profit = totalCurrent - totalContributed;
    const profitPercent = totalContributed > 0 ? (profit / totalContributed) * 100 : 0;

    return { totalContributed, totalCurrent, profit, profitPercent };
  }, [activeAssets, rates]);

  const groupedAssets = useMemo(() => {
    const groups: Record<string, CryptoAsset[]> = {};
    activeAssets.forEach(asset => {
      const key = asset.ticker;
      if (!groups[key]) groups[key] = [];
      groups[key].push(asset);
    });
    
    return Object.entries(groups).map(([key, group]) => {
      const sortedGroup = group.sort((a, b) => {
        const timeA = a.purchaseDate ? new Date(a.purchaseDate).getTime() : 0;
        const timeB = b.purchaseDate ? new Date(b.purchaseDate).getTime() : 0;
        return timeB - timeA;
      });
      
      let totalContributed = 0;
      let totalCurrent = 0;
      let totalQuantity = 0;

      sortedGroup.forEach(asset => {
        const liveRateRub = getCryptoRate(asset.ticker, 'rub', rates);
        const currentRub = liveRateRub ? asset.quantity * liveRateRub : (asset.currentValue ?? asset.amount);
        
        totalContributed += asset.amount;
        totalCurrent += currentRub;
        totalQuantity += asset.quantity;
      });

      const profitValue = totalCurrent - totalContributed;
      const profitPercent = totalContributed > 0 ? (profitValue / totalContributed) * 100 : 0;

      return {
        key,
        items: sortedGroup,
        aggregate: { totalContributed, totalCurrent, totalQuantity, profitValue, profitPercent }
      };
    }).sort((a, b) => {
        const timeA = a.items[0].purchaseDate ? new Date(a.items[0].purchaseDate).getTime() : 0;
        const timeB = b.items[0].purchaseDate ? new Date(b.items[0].purchaseDate).getTime() : 0;
        return timeB - timeA;
    });
  }, [activeAssets, rates]);

  const confirmDelete = async () => {
    if (!deletingAsset || deletingAsset.id === undefined || deletingAsset.id === null) return;
    const id = deletingAsset.id;
    const ticker = deletingAsset.ticker;
    
    if (expandedGroupKey === ticker) {
      const groupData = groupedAssets.find(g => g.key === ticker);
      if (groupData && groupData.items.length === 2) {
        setExpandedGroupKey(null);
      }
    }
    
    try {
      await db.cryptoAssets.delete(id as any);
      const user = auth.currentUser;
      
      let firestoreDocId = String(id);
      if (user) {
        if (typeof id === "number") {
          firestoreDocId = `${user.uid}_${id}`;
        } else if (typeof id === "string" && !id.startsWith(user.uid)) {
          if (!isNaN(Number(id))) {
            firestoreDocId = `${user.uid}_${id}`;
          }
        }
      }

      const delRec = {
        collection: "cryptoAssets",
        docId: firestoreDocId,
        timestamp: Date.now(),
      };
      await db.deletedQueue.add(delRec);
      emitSyncEvent("syncing");
      syncWithFirebase().catch(console.error);
    } catch (err) {
      console.error("Failed to delete crypto asset", err);
    } finally {
      setDeletingAsset(undefined);
    }
  };

  return (
    <div className="w-full pb-24">
      {/* Header Stats */}
      <div className="relative mb-8">
        <div className="relative overflow-hidden bg-gradient-to-tr from-white/60 to-white/90 dark:from-slate-900/60 dark:to-slate-950/80 backdrop-blur-2xl rounded-[2rem] p-6 lg:p-8 border border-white/20 dark:border-[rgba(255,255,255,0.05)] shadow-[0_12px_40px_rgba(0,0,0,0.04)] z-10">
          
        <div className="absolute top-1/2 right-1/4 w-72 h-72 bg-amber-500/15 dark:bg-amber-500/5 blur-3xl rounded-full pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-amber-500/10 dark:bg-amber-500/5 blur-2xl rounded-full pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-5 lg:w-[60%]">
            <div>
              <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-amber-400 mb-2 flex items-center gap-2">
                <Bitcoin className="w-3.5 h-3.5 text-amber-500 shadow-sm shrink-0 stroke-[2.5px]" />
                Криптоактивы
              </h2>
              <div className="text-3xl sm:text-4xl lg:text-[2.5rem] font-black uppercase tracking-tight text-slate-900 dark:text-amber-100 leading-none flex items-baseline gap-2 drop-shadow-sm dark:drop-shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                <PrivacyBlur isPrivate={isPrivate}>
                  {formatCurrency(stats.totalCurrent)}
                </PrivacyBlur>
              </div>
            </div>

            {activeAssets.length > 0 && (
              <div className="flex flex-wrap gap-4 pt-1">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-amber-500/20 rounded-xl">
                  <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Доходность:</span>
                  <span className={cn("text-xs font-bold font-mono tracking-tight", stats.profit >= 0 ? "text-amber-500" : "text-rose-500")}>
                    {stats.profit > 0 ? "+" : ""}{formatCurrency(stats.profit)}
                  </span>
                  <span className={cn("text-[10px] font-bold font-mono px-1.5 py-0.5 rounded-md", stats.profit >= 0 ? "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400" : "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400")}>
                    {stats.profit > 0 ? "+" : ""}{stats.profitPercent.toFixed(2)}%
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col items-start lg:items-end justify-center lg:justify-between h-full gap-5 lg:w-[40%]">
            <button
              onClick={() => {
                setEditingAsset(undefined);
                setIsFormOpen(true);
              }}
              className="flex items-center justify-center gap-2 px-6 py-3.5 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] sm:text-xs transition-all shadow-[0_4px_16px_rgba(245,158,11,0.35)] hover:shadow-[0_4px_24px_rgba(245,158,11,0.5)] active:scale-95 group shrink-0 lg:ml-auto w-full sm:w-auto"
            >
              <Plus className="w-4 h-4 stroke-[3px] group-hover:rotate-90 transition-transform shrink-0" />
              Добавить актив
            </button>
          </div>
        </div>
      </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-2 lg:gap-6 md:gap-3 sm:gap-2 items-start">
        {groupedAssets.map((groupData) => {
          const { key: groupKey, items: group, aggregate } = groupData;
          return (
            <AssetStack accentClassName="bg-amber-500"
              key={groupKey}
              items={group}
              groupTitle={groupKey}
              groupSubtitle={`${group.length} ${getPlural(group.length, ['позиция', 'позиции', 'позиций'])}`}
              groupIcon={
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center shrink-0">
                  <CryptoLogo ticker={groupKey} className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
              }
              isExpanded={expandedGroupKey === groupKey}
              onToggle={() => setExpandedGroupKey(prev => prev === groupKey ? null : groupKey)}
              getItemKey={(asset) => String(asset.id)}
              renderAggregate={() => {
                const ticker = groupKey;
                const { totalContributed, totalQuantity, totalCurrent, profitValue, profitPercent } = aggregate;
                const isPositive = profitPercent >= 0;
                const hasDynamics = Boolean(getCryptoRate(ticker, 'rub', rates));
                const currentRate = getCryptoRate(ticker, 'rub', rates);
              
                return (
                  <div className="group relative flex flex-col justify-between p-5 rounded-[1.8rem] bg-white/90 dark:bg-slate-950/90 backdrop-blur-2xl border border-slate-200/60 dark:border-white/[0.08] shadow-lg transition-all duration-300 min-h-[160px] overflow-hidden">
                    <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-amber-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              
                    <div className="absolute top-4 right-4 z-20 flex flex-col items-end gap-1.5 pt-1">
                      <span className="text-[9px] font-black tracking-tight px-2 py-1 rounded-lg shadow-sm uppercase border text-amber-500 dark:text-amber-400 bg-amber-500/10 border-amber-500/20">
                        {group.length} {getPlural(group.length, ['позиция', 'позиции', 'позиций'])}
                      </span>
                    </div>
              
                    <div className="flex items-start gap-3.5 min-w-0 pr-24 mt-1">
                      <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700/50 flex items-center justify-center shrink-0 shadow-sm overflow-hidden p-1">
                        <CryptoLogo ticker={ticker} className="w-8 h-8" />
                      </div>
              
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mt-0.5 mb-1.5">
                          <span className="font-extrabold text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-tight truncate">
                            {ticker} <span className="font-medium lowercase ml-1">({totalQuantity})</span>
                          </span>
                        </div>
                        
                        <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight px-0.5 font-mono">
                          <PrivacyBlur isPrivate={isPrivate}>
                            {formatCurrency(totalCurrent)}
                          </PrivacyBlur>
                        </div>
                      </div>
                    </div>
              
                    <div className="mt-4 pt-3 border-t border-slate-200/40 dark:border-white/[0.04] flex items-center justify-between relative z-10 gap-3">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">
                          Итого ({ticker})
                        </span>
                        <div className="flex flex-col mt-0.5 gap-1.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] sm:text-xs font-bold text-slate-400 dark:text-slate-500">Вложено:</span>
                            <span className="text-xs sm:text-sm font-black text-crypto-500 dark:text-crypto-400 tracking-tight whitespace-nowrap">
                              <PrivacyBlur isPrivate={isPrivate}>
                                {formatCurrency(totalContributed)}
                              </PrivacyBlur>
                            </span>
                          </div>
                          {hasDynamics && currentRate && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500">Курс:</span>
                              <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 font-mono whitespace-nowrap">
                                {ticker === 'USDT' 
                                  ? formatCurrency(currentRate) 
                                  : (() => {
                                      const usdRate = getCryptoRate(ticker, 'usd', rates);
                                      return usdRate ? usdRate.toLocaleString('ru-RU', { maximumFractionDigits: 2 }) + " USDT" : formatCurrency(currentRate);
                                    })()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
              
                      {hasDynamics && profitPercent !== 0 && (
                        <div className="flex items-center pt-1">
                          <span className={cn(
                            "text-[9px] font-black tracking-tight px-2 py-0.5 rounded-lg shadow-sm font-mono border",
                            isPositive 
                              ? "text-cash-500 dark:text-cash-400 bg-cash-500/10 border-cash-500/20" 
                              : "text-rose-500 bg-rose-500/10 border-rose-500/20"
                          )}>
                            {isPositive ? "+" : ""}{profitPercent.toFixed(2)}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }}
              renderItem={(asset) => {
                const contributedRub = asset.amount;
                const liveRateRub = getCryptoRate(asset.ticker, 'rub', rates);
                const currentRub = liveRateRub ? asset.quantity * liveRateRub : (asset.currentValue ?? asset.amount);
                const hasDynamics = Boolean(liveRateRub);
                
                let profitValue = currentRub - contributedRub;
                let profitPercent = hasDynamics && contributedRub > 0 ? (profitValue / contributedRub) * 100 : 0;
                let isPositive = profitPercent >= 0;

                return (
                  <div className="group relative flex flex-col justify-between p-5 rounded-[1.8rem] bg-white/45 dark:bg-slate-950/40 backdrop-blur-xl border border-slate-200/50 dark:border-white/[0.05] hover:border-amber-500/30 dark:hover:border-amber-500/20 shadow-sm hover:shadow-md transition-all duration-300 min-h-[160px] overflow-hidden">
                    <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-amber-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                    {hasDynamics && profitPercent !== 0 && (
                    <div className="absolute top-4 right-4 z-20 flex flex-col items-end gap-1.5 pt-1">
                      <span className={cn(
                        "text-[9px] font-black tracking-tight px-2 py-0.5 rounded-lg shadow-sm font-mono border",
                        isPositive 
                          ? "text-cash-500 dark:text-cash-400 bg-cash-500/10 border-cash-500/20" 
                          : "text-rose-500 bg-rose-500/10 border-rose-500/20"
                      )}>
                        {isPositive ? "+" : ""}{profitPercent.toFixed(2)}%
                      </span>
                    </div>
                  )}

                    <div className="flex items-start gap-3.5 min-w-0 pr-16 mt-1">
                      <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700/50 flex items-center justify-center shrink-0 shadow-sm overflow-hidden p-1">
                        <CryptoLogo ticker={asset.ticker} className="w-8 h-8" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mt-0.5 mb-1.5">
                          <span className="font-extrabold text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-tight truncate">
                            {asset.ticker} <span className="font-medium lowercase ml-1">({asset.quantity})</span>
                          </span>
                        </div>
                        
                        <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight px-0.5 font-mono">
                          <PrivacyBlur isPrivate={isPrivate}>
                            {formatCurrency(currentRub)}
                          </PrivacyBlur>
                        </div>

                        {asset.comment && (
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate italic mt-1 font-normal w-full" title={asset.comment}>
                            {asset.comment}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-200/40 dark:border-white/[0.04] flex items-center justify-between relative z-10 gap-3">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">
                          КРИПТОАКТИВ
                        </span>
                        <div className="flex flex-col mt-0.5 gap-1.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] sm:text-xs font-bold text-slate-400 dark:text-slate-500">Вложено:</span>
                            <span className="text-xs sm:text-sm font-black text-crypto-500 dark:text-crypto-400 tracking-tight whitespace-nowrap">
                              <PrivacyBlur isPrivate={isPrivate}>
                                {formatCurrency(asset.amount)}
                              </PrivacyBlur>
                            </span>
                          </div>
                          
                          {group.length === 1 && liveRateRub ? (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500">Курс:</span>
                              <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 font-mono whitespace-nowrap">
                                {asset.ticker === 'USDT' 
                                  ? formatCurrency(liveRateRub) 
                                  : (() => {
                                      const usdRate = getCryptoRate(asset.ticker, 'usd', rates);
                                      return usdRate ? usdRate.toLocaleString('ru-RU', { maximumFractionDigits: 2 }) + " USDT" : formatCurrency(liveRateRub);
                                    })()}
                              </span>
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex items-center gap-0.5 opacity-70 hover:opacity-100 xl:opacity-0 xl:group-hover:opacity-100 xl:hover:!opacity-100 transition-opacity duration-200 pr-1.5 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            setEditingAsset(asset);
                            setIsFormOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-amber-500/10 rounded-xl transition-all cursor-pointer active:scale-95"
                          title="Редактировать"
                        >
                          <Edit3 size={13.5} className="stroke-[2.5px]" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            setDeletingAsset(asset);
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer active:scale-95"
                          title="Удалить"
                        >
                          <Trash2 size={13.5} className="stroke-[2.5px]" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }}
            />
          );
        })}
        {activeAssets.length === 0 && (
          <div className="col-span-full py-16 text-center text-slate-500 dark:text-slate-400 bg-white/20 dark:bg-slate-950/20 backdrop-blur-sm rounded-[2rem] border border-dashed border-slate-200 dark:border-slate-800 px-6">
            <ShieldAlert className="w-10 h-10 text-slate-400/60 mx-auto mb-3 stroke-[1.5px]" />
            <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-1">Криптоактивы не добавлены</h4>
            <p className="text-xs text-slate-500">Добавьте свои криптоактивы для учета полной картины капитала.</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isFormOpen && (
          <CryptoForm
            onClose={() => {
              setIsFormOpen(false);
              setEditingAsset(undefined);
            }}
            assetToEdit={editingAsset}
          />
        )}
      </AnimatePresence>

      <Transition.Root show={!!deletingAsset} as={Fragment}>
        <Dialog as="div" className="relative z-[9999]" onClose={() => setDeletingAsset(undefined)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity" />
          </Transition.Child>

          <div className="fixed inset-0 z-10 overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                enterTo="opacity-100 translate-y-0 sm:scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              >
                <Dialog.Panel className="relative transform overflow-hidden rounded-t-[2.2rem] sm:rounded-[2.2rem] bg-white dark:bg-slate-950 p-6 text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-md border border-slate-200/50 dark:border-white/[0.05]">
                  <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center mb-5 mx-auto">
                    <Trash2 className="w-6 h-6 text-rose-500 stroke-[1.5px]" />
                  </div>
                  
                  <div className="text-center mb-6">
                    <Dialog.Title as="h3" className="text-lg font-black uppercase tracking-wider text-slate-900 dark:text-white">
                      Удалить актив?
                    </Dialog.Title>
                    <div className="mt-2">
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                        Вы действительно хотите навсегда удалить актив "{deletingAsset?.ticker}"? Это действие нельзя отменить.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      className="flex-1 px-4 py-3 bg-slate-100/80 dark:bg-slate-900/60 hover:bg-slate-200/80 dark:hover:bg-slate-800/80 text-slate-900 dark:text-white rounded-2xl font-black uppercase tracking-wider text-[10px] sm:text-xs transition-colors"
                      onClick={() => setDeletingAsset(undefined)}
                    >
                      Отмена
                    </button>
                    <button
                      type="button"
                      className="flex-1 px-4 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-black uppercase tracking-wider text-[10px] sm:text-xs transition-colors shadow-[0_4px_16px_rgba(239,68,68,0.25)] hover:shadow-[0_4px_20px_rgba(239,68,68,0.35)]"
                      onClick={confirmDelete}
                    >
                      Удалить
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition.Root>
    </div>
  );
}
