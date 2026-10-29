import { logger } from '../../lib/logger';
import React, { useState, useMemo, useRef, Fragment } from "react";
import { Plus, Edit3, Trash2, ChartNoAxesCombined, ShieldAlert } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Dialog } from "@headlessui/react";
import { InvestmentAsset } from "../../types";
import { db, emitSyncEvent, syncWithFirebase } from "../../config/db";
import { auth } from "../../config/firebase";
import { InvestmentForm, getBrokerLogoUrl } from "./InvestmentForm";
import { cn, formatCurrency, getPlural } from "../../lib/utils";
import { PrivacyBlur } from "../ui/PrivacyBlur";
import { getExchangeRates, convertToRub, CurrencyRates } from "../../services/currency";
import { BankLogo } from "../deposits/BankLogo";
import { AssetStack } from "./stack/AssetStack";

interface InvestmentListProps {
  investmentAssets: InvestmentAsset[];
  isPrivate?: boolean;
}

export function InvestmentList({ investmentAssets, isPrivate = false }: InvestmentListProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<InvestmentAsset | undefined>();
  const [deletingAsset, setDeletingAsset] = useState<InvestmentAsset | undefined>();
  const cancelDeleteRef = useRef<HTMLButtonElement>(null);
  const [rates, setRates] = useState<CurrencyRates | null>(null);
  const [expandedGroupKey, setExpandedGroupKey] = useState<string | null>(null);

  React.useEffect(() => {
    getExchangeRates().then(setRates);
  }, []);

  const activeAssets = useMemo(() => {
    return investmentAssets ? investmentAssets.filter((a) => !a.isArchived) : [];
  }, [investmentAssets]);

  const stats = useMemo(() => {
    let totalContributed = 0;
    let totalCurrent = 0;
    let totalDeductions = 0;

    activeAssets.forEach(asset => {
      const contribRub = convertToRub(asset.amount, asset.currency, rates);
      const currentRub = convertToRub(asset.currentValue, asset.currency, rates);
      const deductedRub = convertToRub(asset.deductionsReceived || 0, asset.currency, rates);
      
      totalContributed += contribRub;
      totalCurrent += currentRub;
      totalDeductions += deductedRub;
    });

    const profit = totalCurrent - totalContributed;
    const profitPercent = totalContributed > 0 ? (profit / totalContributed) * 100 : 0;

    return { totalContributed, totalCurrent, totalDeductions, profit, profitPercent };
  }, [activeAssets, rates]);

  const groupedAssets = useMemo(() => {
    const groups: Record<string, InvestmentAsset[]> = {};
    activeAssets.forEach(asset => {
      const key = `${asset.name}-${asset.type}-${asset.iisType || ''}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(asset);
    });
    
    return Object.entries(groups).map(([key, group]) => {
      const sortedGroup = group.sort((a, b) => {
        const timeA = a.startDate ? new Date(a.startDate).getTime() : 0;
        const timeB = b.startDate ? new Date(b.startDate).getTime() : 0;
        return timeB - timeA;
      });
      
      let totalContributed = 0;
      let totalCurrent = 0;
      let totalDeductions = 0;

      sortedGroup.forEach(asset => {
        totalContributed += convertToRub(asset.amount, asset.currency, rates);
        totalCurrent += convertToRub(asset.currentValue, asset.currency, rates);
        totalDeductions += convertToRub(asset.deductionsReceived || 0, asset.currency, rates);
      });

      const profitValue = totalCurrent - totalContributed;
      const profitPercent = totalContributed > 0 ? (profitValue / totalContributed) * 100 : 0;

      return {
        key,
        items: sortedGroup,
        aggregate: { totalContributed, totalCurrent, totalDeductions, profitValue, profitPercent }
      };
    }).sort((a, b) => {
        const timeA = a.items[0].startDate ? new Date(a.items[0].startDate).getTime() : 0;
        const timeB = b.items[0].startDate ? new Date(b.items[0].startDate).getTime() : 0;
        return timeB - timeA;
    });
  }, [activeAssets, rates]);

  const confirmDelete = async () => {
    if (!deletingAsset || deletingAsset.id === undefined || deletingAsset.id === null) return;
    const id = deletingAsset.id;
    const key = `${deletingAsset.name}-${deletingAsset.type}-${deletingAsset.iisType || ''}`;
    
    if (expandedGroupKey === key) {
      const groupData = groupedAssets.find(g => g.key === key);
      if (groupData && groupData.items.length === 2) {
        setExpandedGroupKey(null);
      }
    }
    
    try {
      await db.investmentAssets.delete(id as any);
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
        collection: "investmentAssets",
        docId: firestoreDocId,
        timestamp: Date.now(),
      };
      await db.deletedQueue.add(delRec);
      emitSyncEvent("syncing");
      syncWithFirebase().catch(logger.error);
    } catch (err) {
      logger.error("Failed to delete investment asset", err);
    } finally {
      setDeletingAsset(undefined);
    }
  };

  return (
    <div className="w-full">
      {/* Header Stats */}
      <div className="relative mb-8">
        <div className="relative overflow-hidden bg-gradient-to-tr from-white/60 to-white/90 dark:from-slate-900/60 dark:to-slate-950/80 backdrop-blur-2xl rounded-[2rem] p-6 lg:p-8 border border-white/20 dark:border-[rgba(255,255,255,0.05)] shadow-[0_12px_40px_rgba(0,0,0,0.04)] z-10">
          
        <div className="absolute top-1/2 right-1/4 w-72 h-72 bg-invest-500/15 dark:bg-invest-500/5 blur-3xl rounded-full pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-primary-500/10 dark:bg-primary-500/5 blur-2xl rounded-full pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-5 lg:w-[60%]">
            <div>
              <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-invest-400 mb-2 flex items-center gap-2">
                <ChartNoAxesCombined className="w-3.5 h-3.5 text-invest-500 shadow-sm shrink-0 stroke-[2.5px]" />
                Биржевые активы
              </h2>
              <div className="text-3xl sm:text-4xl lg:text-[2.5rem] font-black uppercase tracking-tight text-slate-900 dark:text-invest-100 leading-none flex items-baseline gap-2 drop-shadow-sm dark:drop-shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                <span className="tabular-nums"><PrivacyBlur isPrivate={isPrivate}>{formatCurrency(stats.totalCurrent)}</PrivacyBlur></span>
              </div>
            </div>

            {activeAssets.length > 0 && (
              <div className="flex flex-wrap gap-4 pt-1">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-invest-500/20 rounded-xl">
                  <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Доходность:</span>
                  <span className={cn("text-xs font-bold tabular-nums tracking-tight", stats.profit >= 0 ? "text-invest-500" : "text-rose-500")}>
                    <span className="tabular-nums">{stats.profit > 0 ? "+" : ""}{formatCurrency(stats.profit)}</span>
                  </span>
                  <span className={cn("text-[10px] font-bold tabular-nums px-2 py-0.5 rounded-full", stats.profit >= 0 ? "bg-invest-50 text-invest-600 dark:bg-invest-500/10 dark:text-invest-400" : "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400")}>
                    {stats.profit > 0 ? "+" : ""}{stats.profitPercent.toFixed(2)}%
                  </span>
                </div>
                {stats.totalDeductions > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-invest-500/20 rounded-xl">
                    <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Вычеты НДФЛ:</span>
                    <span className="text-xs font-bold tabular-nums text-slate-900 dark:text-white tracking-tight">
                      <PrivacyBlur isPrivate={isPrivate}>
                        <span className="tabular-nums">{formatCurrency(stats.totalDeductions)}</span>
                      </PrivacyBlur>
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col items-start lg:items-end justify-center lg:justify-between h-full gap-5 lg:w-[40%]">
            <button
              onClick={() => {
                setEditingAsset(undefined);
                setIsFormOpen(true);
              }}
              className="flex items-center justify-center gap-2 px-6 py-3.5 bg-invest-500 hover:bg-invest-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] sm:text-xs transition-all shadow-[0_4px_16px_rgba(6,182,212,0.35)] hover:shadow-[0_4px_24px_rgba(6,182,212,0.5)] active:scale-95 group shrink-0 lg:ml-auto w-full sm:w-auto"
            >
              <Plus className="w-4 h-4 stroke-[3px] group-hover:rotate-90 transition-transform shrink-0" />
              Добавить счет
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

      <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-2 lg:gap-6 md:gap-3 sm:gap-2 items-start">
        {groupedAssets.map((groupData) => {
          const { key: groupKey, items: group, aggregate } = groupData;
          return (
            <AssetStack accentClassName="bg-invest-500"
              key={groupKey}
              items={group}
              groupTitle={group[0].name}
              groupSubtitle={`${group.length} ${group[0].type === 'iis' ? 'ИИС' : getPlural(group.length, ['счет', 'счета', 'счетов'])}`}
              groupIcon={
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center shrink-0 text-invest-500 overflow-hidden">
                  {getBrokerLogoUrl(group[0].name) ? (
                    <BankLogo logoUrl={getBrokerLogoUrl(group[0].name)} className="w-full h-full object-contain p-1.5 sm:p-2" />
                  ) : (
                    <ChartNoAxesCombined className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2px]" />
                  )}
                </div>
              }
              isExpanded={expandedGroupKey === groupKey}
              onToggle={() => setExpandedGroupKey(prev => prev === groupKey ? null : groupKey)}
              getItemKey={(asset) => String(asset.id)}
              renderAggregate={() => {
                const sampleAsset = group[0];
                const { totalContributed, totalCurrent, totalDeductions, profitValue, profitPercent } = aggregate;
                const isPositive = profitPercent >= 0;

                return (
                  <div className="group relative flex flex-col justify-between p-5 rounded-[1.8rem] bg-white/90 dark:bg-slate-950/90 backdrop-blur-2xl border border-slate-200/60 dark:border-white/[0.08] shadow-lg transition-all duration-300 min-h-[160px] overflow-hidden">
                    <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-invest-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              
                    <div className="absolute top-4 right-4 z-20 flex flex-col items-end gap-1.5 pt-1">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-widest leading-none uppercase shrink-0 bg-invest-50 text-invest-600 dark:bg-invest-500/10 dark:text-invest-400">
                        {group.length} {sampleAsset.type === 'iis' ? 'ИИС' : getPlural(group.length, ['счет', 'счета', 'счетов'])}
                      </span>
                      <span className={cn(
                        "inline-flex items-center text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full leading-none border shadow-xs whitespace-nowrap",
                        sampleAsset.type === 'iis'
                          ? "border-invest-500/25 bg-invest-500/10 text-invest-600 dark:text-invest-400"
                          : "border-slate-500/25 bg-slate-500/10 text-slate-500 dark:text-slate-400"
                      )}>
                        {sampleAsset.type === 'iis' ? `ИИС ${sampleAsset.iisType || ''}` : 'Брокерский'}
                      </span>
                    </div>
              
                    <div className="flex items-start gap-3.5 min-w-0 pr-24 mt-1">
                      <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700/50 flex items-center justify-center text-invest-500 shrink-0 shadow-sm overflow-hidden p-1">
                        {getBrokerLogoUrl(sampleAsset.name) ? (
                          <BankLogo logoUrl={getBrokerLogoUrl(sampleAsset.name)} className="w-8 h-8 object-contain" />
                        ) : (
                          <ChartNoAxesCombined className="w-8 h-8 stroke-[2px]" />
                        )}
                      </div>
              
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mt-0.5 mb-1.5">
                          <span className="font-extrabold text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-tight truncate">
                            {sampleAsset.name}
                          </span>
                        </div>
                        
                        <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight px-0.5 tabular-nums">
                          <PrivacyBlur isPrivate={isPrivate}>
                            {formatCurrency(totalCurrent, sampleAsset.currency)}
                          </PrivacyBlur>
                        </div>
                      </div>
                    </div>
              
                    <div className="mt-4 pt-3 border-t border-slate-200/40 dark:border-white/[0.04] flex items-center justify-between relative z-10 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">Вложено:</span>
                          <span className="text-[10px] font-black text-slate-900 dark:text-slate-300 tracking-tight whitespace-nowrap tabular-nums">
                            <PrivacyBlur isPrivate={isPrivate}>
                              {formatCurrency(totalContributed, sampleAsset.currency)}
                            </PrivacyBlur>
                          </span>
                        </div>
                        {totalDeductions > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">Получено вычетов:</span>
                            <span className="text-[10px] font-black text-slate-900 dark:text-slate-300 tracking-tight whitespace-nowrap tabular-nums">
                              <PrivacyBlur isPrivate={isPrivate}>
                                {formatCurrency(totalDeductions, sampleAsset.currency)}
                              </PrivacyBlur>
                            </span>
                          </div>
                        )}
                      </div>
              
                      <div className="flex items-center">
                        <span className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-widest leading-none tabular-nums shrink-0",
                          isPositive
                            ? "bg-invest-50 text-invest-600 dark:bg-invest-500/10 dark:text-invest-400"
                            : "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
                        )}>
                          {isPositive ? "+" : ""}{profitPercent.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }}
              renderItem={(asset) => {
                const contributedRub = convertToRub(asset.amount, asset.currency, rates);
                const currentRub = convertToRub(asset.currentValue, asset.currency, rates);
                
                let profitValue = currentRub - contributedRub;
                let profitPercent = contributedRub > 0 ? (profitValue / contributedRub) * 100 : 0;
                let isPositive = profitPercent >= 0;

                return (
                  <div className="group relative flex flex-col justify-between p-5 rounded-[1.8rem] bg-white/45 dark:bg-slate-950/40 backdrop-blur-xl border border-slate-200/50 dark:border-white/[0.05] hover:border-invest-500/30 dark:hover:border-invest-500/20 shadow-sm hover:shadow-md transition-all duration-300 min-h-[160px] overflow-hidden">
                    <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-invest-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                    <div className="absolute top-4 right-4 z-20 flex flex-col items-end gap-1.5 pt-1">
                      <span className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-widest leading-none tabular-nums shrink-0",
                        isPositive
                          ? "bg-invest-50 text-invest-600 dark:bg-invest-500/10 dark:text-invest-400"
                          : "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
                      )}>
                        {isPositive ? "+" : ""}{profitPercent.toFixed(2)}%
                      </span>
                      <span className={cn(
                        "inline-flex items-center text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full leading-none border shadow-xs whitespace-nowrap",
                        asset.type === 'iis'
                          ? "border-invest-500/25 bg-invest-500/10 text-invest-600 dark:text-invest-400"
                          : "border-slate-500/25 bg-slate-500/10 text-slate-500 dark:text-slate-400"
                      )}>
                        {asset.type === 'iis' ? `ИИС ${asset.iisType || ''}` : 'Брокерский'}
                      </span>
                    </div>

                    <div className="flex items-start gap-3.5 min-w-0 pr-16 mt-1">
                      <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700/50 flex items-center justify-center text-invest-500 shrink-0 shadow-sm overflow-hidden p-1">
                        {getBrokerLogoUrl(asset.name) ? (
                          <BankLogo logoUrl={getBrokerLogoUrl(asset.name)} className="w-8 h-8 object-contain" />
                        ) : (
                          <ChartNoAxesCombined className="w-8 h-8 stroke-[2px]" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mt-0.5 mb-1.5">
                          <span className="font-extrabold text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-tight truncate">
                            {asset.name}
                          </span>
                        </div>
                        
                        <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight px-0.5 tabular-nums">
                          <PrivacyBlur isPrivate={isPrivate}>
                            {formatCurrency(asset.currentValue, asset.currency)}
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
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">Вложено:</span>
                          <span className="text-[10px] font-black text-slate-900 dark:text-slate-300 tracking-tight whitespace-nowrap tabular-nums">
                            <PrivacyBlur isPrivate={isPrivate}>
                              <span className="tabular-nums">{formatCurrency(asset.amount, asset.currency)}</span>
                            </PrivacyBlur>
                          </span>
                        </div>
                        {(asset.deductionsReceived || 0) > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">Получено вычетов:</span>
                            <span className="text-[10px] font-black text-slate-900 dark:text-slate-300 tracking-tight whitespace-nowrap tabular-nums">
                              <PrivacyBlur isPrivate={isPrivate}>
                                {formatCurrency(asset.deductionsReceived || 0, asset.currency)}
                              </PrivacyBlur>
                            </span>
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
                          className="p-1.5 text-slate-400 hover:text-invest-500 dark:hover:text-invest-400 hover:bg-invest-500/10 rounded-xl transition-all cursor-pointer active:scale-95"
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
            <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-1">Счета не добавлены</h4>
            <p className="text-xs text-slate-500">Запишите свои брокерские счета и ИИС для учета полной картины капитала.</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isFormOpen && (
          <InvestmentForm
            onClose={() => {
              setIsFormOpen(false);
              setEditingAsset(undefined);
            }}
            assetToEdit={editingAsset}
          />
        )}
      </AnimatePresence>

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
                    Удалить счет?
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 leading-relaxed text-center">
                    Вы уверены, что хотите навсегда удалить счет «<strong className="text-slate-950 dark:text-white">{deletingAsset.name}</strong>»? Это действие нельзя отменить.
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
