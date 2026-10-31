import { logger } from '../../lib/logger';
import React, { useState, useMemo, useRef, Fragment } from "react";
import { Plus, Edit3, Trash2, Lock, ShieldAlert, Vault } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Dialog } from "@headlessui/react";
import { CashAsset } from "../../types";
import { db, emitSyncEvent, syncWithFirebase } from "../../config/db";
import { auth } from "../../config/firebase";
import { CashForm } from "./CashForm";
import { cn, formatCurrency, getPlural, parseISOLocalDate } from "../../lib/utils";
import { PrivacyBlur } from "../ui/PrivacyBlur";
import {
  getExchangeRates,
  convertToRub,
  CurrencyRates,
} from "../../services/currency";
import { AssetStack } from "./stack/AssetStack";

interface CashListProps {
  cashAssets: CashAsset[];
  isPrivate?: boolean;
}

export function CashList({ cashAssets, isPrivate = false }: CashListProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<CashAsset | undefined>();
  const [deletingAsset, setDeletingAsset] = useState<CashAsset | undefined>();
  const cancelDeleteRef = useRef<HTMLButtonElement>(null);
  const [rates, setRates] = useState<CurrencyRates | null>(null);
  const [expandedGroupKey, setExpandedGroupKey] = useState<string | null>(null);

  React.useEffect(() => {
    getExchangeRates().then(setRates);
  }, []);

  const activeAssets = useMemo(() => {
    return cashAssets.filter((a) => !a.isArchived);
  }, [cashAssets]);

  const totalInRub = useMemo(() => {
    return activeAssets.reduce((sum, asset) => {
      return sum + convertToRub(asset.amount, asset.currency, rates);
    }, 0);
  }, [activeAssets, rates]);

  const groupedAssets = useMemo(() => {
    const groups: Record<string, CashAsset[]> = {};
    activeAssets.forEach(asset => {
      const key = asset.currency;
      if (!groups[key]) groups[key] = [];
      groups[key].push(asset);
    });
    
    return Object.entries(groups).map(([key, group]) => {
      const sortedGroup = group.sort((a, b) => {
        const timeA = a.purchaseDate ? new Date(a.purchaseDate).getTime() : (a.updatedAt || 0);
        const timeB = b.purchaseDate ? new Date(b.purchaseDate).getTime() : (b.updatedAt || 0);
        return timeB - timeA;
      });
      
      let totalAmount = 0;
      let totalConvertedRub = 0;
      let totalContributedRub = 0;
      let currentRate = 0;
      let hasDynamics = false;

      if (key !== "RUB" && rates) {
        const valute = rates?.Valute?.[key];
        if (valute) {
          currentRate = valute.Value / valute.Nominal;
        }
      }

      sortedGroup.forEach(asset => {
        totalAmount += asset.amount;
        const currentRub = convertToRub(asset.amount, asset.currency, rates);
        totalConvertedRub += currentRub;
        
        if (asset.currency !== "RUB" && asset.exchangeRateOnOpen && rates) {
          totalContributedRub += asset.amount * asset.exchangeRateOnOpen;
          hasDynamics = true;
        } else {
          totalContributedRub += currentRub;
        }
      });

      const profitValue = totalConvertedRub - totalContributedRub;
      const profitPercent = totalContributedRub > 0 ? (profitValue / totalContributedRub) * 100 : 0;

      return {
        key,
        items: sortedGroup,
        aggregate: { totalAmount, totalConvertedRub, totalContributedRub, currentRate, hasDynamics, profitValue, profitPercent }
      };
    }).sort((a, b) => {
        const timeA = a.items[0]?.purchaseDate ? new Date(a.items[0].purchaseDate).getTime() : (a.items[0]?.updatedAt || 0);
        const timeB = b.items[0]?.purchaseDate ? new Date(b.items[0].purchaseDate).getTime() : (b.items[0]?.updatedAt || 0);
        return timeB - timeA;
    });
  }, [activeAssets, rates]);

  // Group foreign cash assets by original currency to show breakdown in the Safe
  const currencyBreakdown = useMemo(() => {
    const totals: { [key: string]: number } = {};
    activeAssets.forEach((asset) => {
      if (asset.currency !== 'RUB') {
        totals[asset.currency] = (totals[asset.currency] || 0) + asset.amount;
      }
    });
    return Object.entries(totals).sort((a, b) => b[1] - a[1]);
  }, [activeAssets]);

  const confirmDelete = async () => {
    if (!deletingAsset || deletingAsset.id === undefined || deletingAsset.id === null) return;
    const id = deletingAsset.id;
    const currency = deletingAsset.currency;
    
    if (expandedGroupKey === currency) {
      const groupData = groupedAssets.find(g => g.key === currency);
      if (groupData && groupData.items.length === 2) {
        setExpandedGroupKey(null);
      }
    }
    
    try {
      await db.cashAssets.delete(id as any);
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
        collection: "cashAssets",
        docId: firestoreDocId,
        timestamp: Date.now(),
      };
      await db.deletedQueue.add(delRec);
      emitSyncEvent("syncing");
      syncWithFirebase().catch(logger.error);
    } catch (err) {
      logger.error("Failed to delete cash asset", err);
    } finally {
      setDeletingAsset(undefined);
    }
  };

  return (
    <div className="w-full">
      {/* Header Stats / Safe Overview Card Wrapper */}
      <div className="relative mb-8">
        {/* Header Stats / Safe Overview Card */}
        <div className="relative overflow-hidden bg-gradient-to-tr from-white/60 to-white/90 dark:from-slate-900/60 dark:to-slate-950/80 backdrop-blur-2xl rounded-[2rem] p-6 lg:p-8 border border-white/20 dark:border-[rgba(255,255,255,0.05)] shadow-[0_12px_40px_rgba(0,0,0,0.04)] z-10">
          
          {/* Background glow effects according to Sproutly.Pro Guidelines */}
        <div className="absolute top-1/2 right-1/4 w-72 h-72 bg-cash-500/15 dark:bg-cash-500/5 blur-3xl rounded-full pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-primary-500/10 dark:bg-primary-500/5 blur-2xl rounded-full pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left Column (Content) */}
          <div className="space-y-5 lg:w-[60%]">
            <div>
              <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-cash-400 mb-2 flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-cash-500 shadow-sm shrink-0 stroke-[2.5px]" />
                Всего средств
              </h2>
              <div className="text-3xl sm:text-4xl lg:text-[2.5rem] font-black uppercase tracking-tight text-slate-900 dark:text-cash-100 leading-none flex items-baseline gap-2 drop-shadow-sm dark:drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                <span className="tabular-nums"><PrivacyBlur isPrivate={isPrivate}>{formatCurrency(totalInRub)}</PrivacyBlur></span>
              </div>
            </div>

            {/* Currency Breakdown Capsule Pills (clean horizonal flow) */}
            {currencyBreakdown.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <p className="text-[9px] font-black uppercase text-slate-500 dark:text-cash-500/80 tracking-wider">Содержимое сейфа по валютам:</p>
                <div className="flex flex-wrap gap-2">
                  {currencyBreakdown.map(([currency, amount]) => (
                    <div 
                      key={currency} 
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-cash-500/20 rounded-xl text-xs font-bold tabular-nums text-slate-900 dark:text-cash-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_12px_rgba(16,185,129,0.1)]"
                    >
                      <span className="w-2 h-2 rounded-full bg-cash-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse" />
                      <PrivacyBlur isPrivate={isPrivate}>
                        {formatCurrency(amount, currency)}
                      </PrivacyBlur>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column (Actions and Meta) */}
          <div className="flex flex-col items-start lg:items-end justify-center lg:justify-between h-full gap-5 lg:w-[40%]">
            {/* Top right button with primary glow */}
            <button
              onClick={() => {
                setEditingAsset(undefined);
                setIsFormOpen(true);
              }}
              className="flex items-center justify-center gap-2 px-6 py-3.5 bg-cash-500 hover:bg-cash-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] sm:text-xs transition-all shadow-[0_4px_16px_rgba(16,185,129,0.35)] hover:shadow-[0_4px_24px_rgba(16,185,129,0.5)] active:scale-95 group shrink-0 lg:ml-auto w-full sm:w-auto"
            >
              <Plus className="w-4 h-4 stroke-[3px] group-hover:rotate-90 transition-transform shrink-0" />
              Добавить в сейф
            </button>

            {rates && (
              <p className="text-[9px] text-slate-500/80 dark:text-slate-400/60 font-bold uppercase tracking-widest max-w-[280px] lg:text-right leading-relaxed mt-auto">
                * Иностранные валюты автоматически пересчитаны по курсу ЦБ РФ
              </p>
            )}
          </div>
        </div>
      </div>
      </div>

      {/* Grid of Redesigned Safe Cards resembling Archive and Deposits List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-2 lg:gap-6 md:gap-3 sm:gap-2 items-start">
        {groupedAssets.map((groupData) => {
          const { key: groupKey, items: group, aggregate } = groupData;
          return (
            <AssetStack accentClassName="bg-cash-500"
              key={groupKey}
              items={group}
              groupTitle={groupKey}
              groupSubtitle={`${group.length} ${getPlural(group.length, ['счет', 'счета', 'счетов'])}`}
              groupIcon={
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center shrink-0 text-cash-500">
                  <Vault className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2px]" />
                </div>
              }
              isExpanded={expandedGroupKey === groupKey}
              onToggle={() => setExpandedGroupKey(prev => prev === groupKey ? null : groupKey)}
              getItemKey={(asset) => String(asset.id)}
              renderAggregate={() => {
                const { totalAmount, totalConvertedRub, currentRate, hasDynamics, profitPercent } = aggregate;
                const isPositive = profitPercent >= 0;

                return (
                  <div className="group relative flex flex-col justify-between p-5 rounded-[1.8rem] bg-white/90 dark:bg-slate-950/90 backdrop-blur-2xl border border-slate-200/60 dark:border-white/[0.08] shadow-lg transition-all duration-300 min-h-[160px] overflow-hidden">
                    <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-cash-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              
                    <div className="absolute top-5 right-4 z-20 flex flex-col items-end gap-1.5">
                      <span className="text-[10px] font-black tracking-tight px-2 py-1 rounded-lg shadow-sm uppercase border text-cash-500 dark:text-cash-400 bg-cash-500/10 border-cash-500/20 leading-none inline-flex items-center">
                        {group.length} {getPlural(group.length, ['счет', 'счета', 'счетов'])}
                      </span>
                    </div>
              
                    <div className="flex items-start gap-3.5 min-w-0 pr-24 mt-1">
                      <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700/50 flex items-center justify-center text-cash-500 shrink-0 shadow-sm overflow-hidden p-1">
                        <Vault className="w-8 h-8 stroke-[2px]" />
                      </div>
              
                      <div className="flex-1 min-w-0">
                        <h4 className="flex items-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-none mt-0.5">
                          <span className="inline-flex items-center leading-none">Наличные {groupKey}</span>
                        </h4>
                        
                        <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-2 px-0.5 tabular-nums leading-none">
                          <PrivacyBlur isPrivate={isPrivate} className="inline-flex items-center leading-none tabular-nums">
                            {formatCurrency(totalAmount, groupKey)}
                          </PrivacyBlur>
                        </div>
                      </div>
                    </div>
              
                    <div className="mt-4 pt-3 border-t border-slate-200/40 dark:border-white/[0.04] flex items-center justify-between relative z-10 gap-3">
                      <div className="flex flex-col justify-center gap-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap text-xs leading-none">
                          <span className="inline-flex items-center font-bold leading-none text-slate-400 dark:text-slate-500">В рублях:</span>
                          <PrivacyBlur
                            isPrivate={isPrivate}
                            className="inline-flex items-center font-black leading-none text-cash-500 dark:text-cash-400 tracking-tight whitespace-nowrap tabular-nums"
                          >
                            {formatCurrency(totalConvertedRub, "RUB")}
                          </PrivacyBlur>
                        </div>
                        
                        {groupKey !== "RUB" && currentRate > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-bold leading-none">
                            <span className="inline-flex items-center leading-none text-slate-400 dark:text-slate-500">Курс ЦБ:</span>
                            <span className="inline-flex items-center leading-none text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap">
                              {currentRate.toFixed(2)} ₽
                            </span>
                          </div>
                        )}
                      </div>
              
                      {hasDynamics && profitPercent !== 0 && (
                        <div className="flex items-center">
                          <span className={cn(
                            "text-[10px] font-black tracking-tight px-2 py-1 rounded-lg shadow-sm tabular-nums border leading-none inline-flex items-center",
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
                const convertedRub = convertToRub(asset.amount, asset.currency, rates);
                
                let percentageChange = 0;
                let hasDynamics = false;
                let isPositive = true;
                let currentRate = 0;
                if (asset.currency !== "RUB" && rates) {
                  const valute = rates?.Valute?.[asset.currency];
                  if (valute) {
                    currentRate = valute.Value / valute.Nominal;
                    if (asset.exchangeRateOnOpen) {
                      percentageChange = ((currentRate - asset.exchangeRateOnOpen) / asset.exchangeRateOnOpen) * 100;
                      hasDynamics = true;
                      isPositive = percentageChange >= 0;
                    }
                  }
                }

                const parsedPurchaseDate = asset.currency !== "RUB" ? parseISOLocalDate(asset.purchaseDate) : null;
                const formattedPurchaseDate = parsedPurchaseDate
                  ? `${String(parsedPurchaseDate.getDate()).padStart(2, "0")}.${String(parsedPurchaseDate.getMonth() + 1).padStart(2, "0")}.${parsedPurchaseDate.getFullYear()}`
                  : null;

                const hasPurchaseRate = asset.currency !== "RUB" && Boolean(asset.exchangeRateOnOpen && asset.exchangeRateOnOpen > 0);
                const showCbrRate = group.length === 1 && asset.currency !== "RUB" && currentRate > 0;

                return (
                  <div className={cn(
                    "group relative flex flex-col justify-between p-5 rounded-[1.8rem] border border-slate-200/50 dark:border-white/[0.05] hover:border-cash-500/30 dark:hover:border-cash-500/20 shadow-sm hover:shadow-md transition-all duration-300 min-h-[160px] overflow-hidden",
                    group.length === 1
                      ? "bg-white/45 dark:bg-slate-950/40 backdrop-blur-xl"
                      : "bg-slate-50/60 dark:bg-slate-950/40"
                  )}>
                    <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-cash-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                    {hasDynamics && percentageChange !== 0 && (
                      <div className="absolute top-5 right-4 z-20 flex items-center">
                        <span className={cn(
                          "text-[10px] font-black tracking-tight px-2 py-1 rounded-lg shadow-sm tabular-nums border leading-none inline-flex items-center",
                          isPositive 
                            ? "text-cash-500 dark:text-cash-400 bg-cash-500/10 border-cash-500/20" 
                            : "text-rose-500 bg-rose-500/10 border-rose-500/20"
                        )}>
                          {isPositive ? "+" : ""}{percentageChange.toFixed(2)}%
                        </span>
                      </div>
                    )}

                    <div className="flex items-start gap-3.5 min-w-0 pr-16 mt-1">
                      <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700/50 flex items-center justify-center text-cash-500 shrink-0 shadow-sm overflow-hidden p-1">
                        <Vault className="w-8 h-8 stroke-[2px]" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="flex items-center flex-wrap gap-x-2 gap-y-1 text-xs font-bold leading-none mt-0.5">
                          <span className="inline-flex items-center text-slate-500 dark:text-slate-400 uppercase tracking-widest -mr-[0.1em] leading-none">
                            {asset.name.trim()}
                          </span>
                          {formattedPurchaseDate && (
                            <>
                              <span className="w-1 h-1 rounded-full bg-slate-400 dark:bg-slate-600 shrink-0" />
                              <span className="inline-flex items-center text-slate-400 dark:text-slate-500 tabular-nums tracking-normal leading-none">
                                {formattedPurchaseDate}
                              </span>
                            </>
                          )}
                        </h4>
                        
                        <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-2 px-0.5 tabular-nums leading-none">
                          <PrivacyBlur isPrivate={isPrivate} className="inline-flex items-center leading-none tabular-nums">
                            {formatCurrency(asset.amount, asset.currency)}
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
                      <div className="flex flex-col justify-center gap-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap text-xs leading-none">
                          <span className="inline-flex items-center font-bold leading-none text-slate-400 dark:text-slate-500">В рублях:</span>
                          <PrivacyBlur
                            isPrivate={isPrivate}
                            className="inline-flex items-center font-black leading-none text-cash-500 dark:text-cash-400 tracking-tight whitespace-nowrap tabular-nums"
                          >
                            {formatCurrency(convertedRub, "RUB")}
                          </PrivacyBlur>
                        </div>
                        
                        {(hasPurchaseRate || showCbrRate) && (
                          <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-bold leading-none">
                            {hasPurchaseRate && showCbrRate ? (
                              <>
                                <span className="inline-flex items-center leading-none text-slate-400 dark:text-slate-500">Покупка:</span>
                                <span className="inline-flex items-center leading-none text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap">
                                  {asset.exchangeRateOnOpen!.toFixed(2)} ₽
                                </span>
                                <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600 mx-0.5 shrink-0" />
                                <span className="inline-flex items-center leading-none text-slate-400 dark:text-slate-500">ЦБ:</span>
                                <span className="inline-flex items-center leading-none text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap">
                                  {currentRate.toFixed(2)} ₽
                                </span>
                              </>
                            ) : hasPurchaseRate ? (
                              <>
                                <span className="inline-flex items-center leading-none text-slate-400 dark:text-slate-500">Курс покупки:</span>
                                <span className="inline-flex items-center leading-none text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap">
                                  {asset.exchangeRateOnOpen!.toFixed(2)} ₽
                                </span>
                              </>
                            ) : (
                              <>
                                <span className="inline-flex items-center leading-none text-slate-400 dark:text-slate-500">Курс ЦБ:</span>
                                <span className="inline-flex items-center leading-none text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap">
                                  {currentRate.toFixed(2)} ₽
                                </span>
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-0.5 opacity-70 hover:opacity-100 xl:opacity-0 xl:group-hover:opacity-100 xl:hover:!opacity-100 transition-opacity duration-200 pr-1.5 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            setEditingAsset(asset);
                            setIsFormOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-cash-500 dark:hover:text-cash-400 hover:bg-cash-500/10 rounded-xl transition-all cursor-pointer active:scale-95"
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
            <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-1">Сейф пуст</h4>
            <p className="text-xs text-slate-500">У вас нет активных записей. Нажмите кнопку «Добавить», чтобы зафиксировать валютные или рублевые средства.</p>
          </div>
        )}
      </div>

      {/* Edit Form Modal */}
      <AnimatePresence>
        {isFormOpen && (
          <CashForm
            onClose={() => {
              setIsFormOpen(false);
              setEditingAsset(undefined);
            }}
            assetToEdit={editingAsset}
          />
        )}
      </AnimatePresence>

      {/* Delete Confirmation Dialog */}
      <AnimatePresence>
        {deletingAsset && (
          <Dialog
            as="div"
            className="relative z-[9999]"
            open={true}
            onClose={() => setDeletingAsset(undefined)}
            initialFocus={cancelDeleteRef}
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
                  exit={{ opacity: 0, y: 32, scale: 0.98, transition: { duration: 0.18, ease: "easeInOut" } }}
                  transition={{ type: "spring", stiffness: 380, damping: 32, mass: 0.8 }}
                  className="bg-white/95 dark:bg-[#0B0F19]/95 backdrop-blur-3xl rounded-t-[2rem] sm:rounded-[2.5rem] shadow-[0_24px_60px_rgba(37,99,235,0.06)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.8)] border border-slate-200/60 dark:border-white/[0.08] flex flex-col pointer-events-auto px-6 pt-6 pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] sm:p-8 max-w-sm w-full transform-gpu will-change-[transform,opacity]"
                >
                  <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center mb-6 self-center">
                    <Trash2 className="w-6 h-6 text-rose-500 stroke-[1.5px]" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-950 dark:text-white mb-2 tracking-tight text-center">
                    Удалить из сейфа?
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 leading-relaxed text-center">
                    Вы уверены, что хотите навсегда удалить «<strong className="text-slate-950 dark:text-white">{deletingAsset.name}</strong>» на сумму{" "}
                    <strong className="text-slate-950 dark:text-white">
                      {formatCurrency(deletingAsset.amount, deletingAsset.currency)}
                    </strong>{" "}
                    из сейфа? Это действие нельзя отменить.
                  </p>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <button
                      ref={cancelDeleteRef}
                      type="button"
                      onClick={() => setDeletingAsset(undefined)}
                      className="flex-1 px-4 py-3 rounded-2xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold transition-all border border-slate-200/60 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600 active:scale-95 shadow-sm text-sm uppercase tracking-wide flex items-center justify-center cursor-pointer"
                    >
                      Отмена
                    </button>
                    <button
                      type="button"
                      onClick={confirmDelete}
                      className="flex-1 px-4 py-3 rounded-2xl bg-rose-500 hover:bg-rose-600 active:scale-95 text-white font-bold transition-all shadow-[0_4px_16px_rgba(244,63,94,0.3)] hover:shadow-[0_4px_20px_rgba(244,63,94,0.4)] flex items-center justify-center text-sm uppercase tracking-wide cursor-pointer"
                    >
                      Удалить
                    </button>
                  </div>
                </motion.div>
              </Dialog.Panel>
            </div>
          </Dialog>
        )}
      </AnimatePresence>
    </div>
  );
}
