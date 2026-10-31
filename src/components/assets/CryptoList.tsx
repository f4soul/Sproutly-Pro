import { logger } from '../../lib/logger';
import React, { useState, useMemo, useRef, Fragment } from "react";
import { Plus, Edit3, Trash2, Bitcoin, ShieldAlert } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Dialog } from "@headlessui/react";
import { CryptoAsset } from "../../types";
import { db, emitSyncEvent, syncWithFirebase } from "../../config/db";
import { auth } from "../../config/firebase";
import { CryptoForm } from "./CryptoForm";
import { CryptoLogo } from "./CryptoLogo";
import { cn, formatCurrency, getPlural, parseISOLocalDate } from "../../lib/utils";
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
  const cancelDeleteRef = useRef<HTMLButtonElement>(null);
  const [rates, setRates] = useState<CryptoRates | null>(null);

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
      syncWithFirebase().catch(logger.error);
    } catch (err) {
      logger.error("Failed to delete crypto asset", err);
    } finally {
      setDeletingAsset(undefined);
    }
  };

  return (
    <div className="w-full">
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
                <span className="tabular-nums"><PrivacyBlur isPrivate={isPrivate}>{formatCurrency(stats.totalCurrent)}</PrivacyBlur></span>
              </div>
            </div>

            {activeAssets.length > 0 && (
              <div className="flex flex-wrap gap-4 pt-1">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-amber-500/20 rounded-xl">
                  <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Доходность:</span>
                  <span className={cn("text-xs font-bold tabular-nums tracking-tight", stats.profit >= 0 ? "text-amber-500" : "text-rose-500")}>
                    <span className="tabular-nums">{stats.profit > 0 ? "+" : ""}{formatCurrency(stats.profit)}</span>
                  </span>
                  <span className={cn("text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded-md", stats.profit >= 0 ? "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400" : "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400")}>
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
              getItemKey={(asset) => String(asset.id)}
              renderAggregate={() => {
                const ticker = groupKey;
                const { totalContributed, totalQuantity, totalCurrent, profitPercent } = aggregate;
                const isPositive = profitPercent >= 0;
                const currentRate = getCryptoRate(ticker, 'rub', rates);
                const hasDynamics = Boolean(currentRate);
                const cleanTotalQuantity = Number(totalQuantity.toFixed(8));

                const formatUsdtValue = (val: number) =>
                  val.toLocaleString('ru-RU', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: val < 1 ? 4 : 2,
                  });

                const marketRateLabel = currentRate
                  ? ticker.trim().toUpperCase() === 'USDT'
                    ? `${currentRate.toFixed(2)} ₽`
                    : (() => {
                        const usdRate = getCryptoRate(ticker, 'usd', rates);
                        return usdRate
                          ? `${formatUsdtValue(usdRate)} USDT`
                          : formatCurrency(currentRate, 'RUB');
                      })()
                  : null;
              
                return (
                  <div className="group relative flex flex-col justify-between p-5 rounded-[1.8rem] bg-white/95 dark:bg-slate-950/95 border border-slate-200/60 dark:border-white/[0.08] shadow-lg transition-[border-color,box-shadow] duration-200 min-h-[160px] overflow-hidden">
                    <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-amber-500/40 to-transparent opacity-0 pointer-fine:group-hover:opacity-100 transition-opacity pointer-events-none" />
              
                    <div className="absolute top-5 right-4 z-20 flex flex-col items-end gap-1.5">
                      <span className="text-[10px] font-black tracking-tight px-2 py-1 rounded-lg shadow-sm uppercase border text-amber-500 dark:text-amber-400 bg-amber-500/10 border-amber-500/20 leading-none inline-flex items-center">
                        {group.length} {getPlural(group.length, ['позиция', 'позиции', 'позиций'])}
                      </span>
                    </div>
              
                    <div className="flex items-start gap-3.5 min-w-0 pr-24 mt-1">
                      <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700/50 flex items-center justify-center shrink-0 shadow-sm overflow-hidden p-1">
                        <CryptoLogo ticker={ticker} className="w-8 h-8" />
                      </div>
              
                      <div className="flex-1 min-w-0">
                        <h4 className="flex items-center gap-x-2 text-xs font-bold leading-none mt-0.5">
                          <span className="inline-flex items-center text-slate-500 dark:text-slate-400 uppercase tracking-widest -mr-[0.1em] leading-none">
                            {ticker}
                          </span>
                        </h4>
                        
                        <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-2 px-0.5 tabular-nums leading-none">
                          <PrivacyBlur isPrivate={isPrivate} className="inline-flex items-center leading-none tabular-nums">
                            {formatCurrency(totalCurrent)}
                          </PrivacyBlur>
                        </div>

                        <div className="text-xs font-bold text-slate-400 dark:text-slate-500 tabular-nums leading-none mt-1.5 px-0.5">
                          <PrivacyBlur isPrivate={isPrivate} className="inline-flex items-center leading-none tabular-nums">
                            {cleanTotalQuantity} {ticker}
                          </PrivacyBlur>
                        </div>
                      </div>
                    </div>
              
                    <div className="mt-4 pt-3 border-t border-slate-200/40 dark:border-white/[0.04] flex items-center justify-between relative z-10 gap-3">
                      <div className="flex flex-col justify-center gap-1.5 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap text-xs leading-none">
                          <span className="inline-flex items-center font-bold leading-none text-slate-400 dark:text-slate-500">Вложено:</span>
                          <PrivacyBlur
                            isPrivate={isPrivate}
                            className="inline-flex items-center font-black leading-none text-crypto-500 dark:text-crypto-400 tracking-tight whitespace-nowrap tabular-nums"
                          >
                            {formatCurrency(totalContributed)}
                          </PrivacyBlur>
                        </div>

                        {hasDynamics && marketRateLabel && (
                          <div className="flex items-center gap-1.5 text-[10px] font-bold leading-none whitespace-nowrap">
                            <span className="inline-flex items-center leading-none text-slate-400 dark:text-slate-500">Курс:</span>
                            <span className="inline-flex items-center leading-none text-slate-500 dark:text-slate-400 tabular-nums">
                              {marketRateLabel}
                            </span>
                          </div>
                        )}
                      </div>
              
                      {hasDynamics && profitPercent !== 0 && (
                        <div className="flex items-center shrink-0">
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
                const tickerUpper = asset.ticker.trim().toUpperCase();
                const isUsdt = tickerUpper === 'USDT';
                const contributedRub = asset.amount;
                const liveRateRub = getCryptoRate(asset.ticker, 'rub', rates);
                const currentRub = liveRateRub ? asset.quantity * liveRateRub : (asset.currentValue ?? asset.amount);
                const hasDynamics = Boolean(liveRateRub);
                
                const profitValue = currentRub - contributedRub;
                const profitPercent = hasDynamics && contributedRub > 0 ? (profitValue / contributedRub) * 100 : 0;
                const isPositive = profitPercent >= 0;

                const parsedPurchaseDate = parseISOLocalDate(asset.purchaseDate);
                const formattedPurchaseDate = parsedPurchaseDate
                  ? `${String(parsedPurchaseDate.getDate()).padStart(2, "0")}.${String(parsedPurchaseDate.getMonth() + 1).padStart(2, "0")}.${parsedPurchaseDate.getFullYear()}`
                  : null;

                // Извлекаем курс покупки из штатного поля purchaseRate либо из legacy-комментария вида «Курс покупки: 78 634.6»
                let extractedLegacyRate: number | undefined;
                let cleanComment = asset.comment || "";
                if (cleanComment) {
                  const match = cleanComment.match(/курс\s*покупки\s*[:\-—]?\s*([0-9]+(?:[\s.,][0-9]+)*)/i);
                  if (match) {
                    const parsed = Number(match[1].replace(/\s+/g, "").replace(",", "."));
                    if (!isNaN(parsed) && parsed > 0) {
                      extractedLegacyRate = parsed;
                      cleanComment = cleanComment
                        .replace(match[0], "")
                        .replace(/^[\s,;•\-—]+|[\s,;•\-—]+$/g, "")
                        .trim();
                    }
                  }
                }

                const formatUsdtValue = (val: number) =>
                  val.toLocaleString('ru-RU', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: val < 1 ? 4 : 2,
                  });

                const effectivePurchaseRate =
                  asset.purchaseRate && asset.purchaseRate > 0
                    ? asset.purchaseRate
                    : extractedLegacyRate && extractedLegacyRate > 0
                      ? extractedLegacyRate
                      : isUsdt && asset.quantity > 0 && asset.amount > 0
                        ? asset.amount / asset.quantity
                        : undefined;

                const showMarketRate = group.length === 1 && Boolean(liveRateRub);
                const liveUsdRate = !isUsdt ? getCryptoRate(asset.ticker, 'usd', rates) : null;

                // Форматирование строк курсов:
                // - Для USDT: оба курса в ₽ (Покупка: 82.48 ₽ • Курс: 80.24 ₽)
                // - Для остальных монет: оба курса в USDT с единым суффиксом USDT в конце (Покупка: 78 634,6 • Курс: 77 358 USDT)
                const purchaseRateNumStr =
                  effectivePurchaseRate !== undefined
                    ? isUsdt
                      ? `${effectivePurchaseRate.toFixed(2)} ₽`
                      : formatUsdtValue(effectivePurchaseRate)
                    : null;

                const purchaseRateStandaloneLabel =
                  effectivePurchaseRate !== undefined
                    ? isUsdt
                      ? `${effectivePurchaseRate.toFixed(2)} ₽`
                      : `${formatUsdtValue(effectivePurchaseRate)} USDT`
                    : null;

                const marketRateStandaloneLabel = showMarketRate
                  ? isUsdt && liveRateRub
                    ? `${liveRateRub.toFixed(2)} ₽`
                    : liveUsdRate
                      ? `${formatUsdtValue(liveUsdRate)} USDT`
                      : null
                  : null;

                const cleanAssetQuantity = Number(asset.quantity.toFixed(8));

                return (
                  <div className={cn(
                    "group relative flex flex-col justify-between p-5 rounded-[1.8rem] border border-slate-200/50 dark:border-white/[0.05] pointer-fine:hover:border-amber-500/30 dark:pointer-fine:hover:border-amber-500/20 shadow-sm pointer-fine:hover:shadow-md transition-[border-color,box-shadow] duration-200 min-h-[160px] overflow-hidden",
                    group.length === 1
                      ? "bg-white/80 dark:bg-slate-950/60"
                      : "bg-slate-50/60 dark:bg-slate-950/40"
                  )}>
                    <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-amber-500/40 to-transparent opacity-0 pointer-fine:group-hover:opacity-100 transition-opacity pointer-events-none" />

                    {hasDynamics && profitPercent !== 0 && (
                      <div className="absolute top-5 right-4 z-20 flex items-center">
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

                    <div className="flex items-start gap-3.5 min-w-0 pr-16 mt-1">
                      <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700/50 flex items-center justify-center shrink-0 shadow-sm overflow-hidden p-1">
                        <CryptoLogo ticker={asset.ticker} className="w-8 h-8" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="flex items-center gap-x-2 text-xs font-bold leading-none mt-0.5 whitespace-nowrap">
                          <span className="inline-flex items-center text-slate-500 dark:text-slate-400 uppercase tracking-widest -mr-[0.1em] leading-none">
                            {asset.ticker.trim()}
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
                            {formatCurrency(currentRub)}
                          </PrivacyBlur>
                        </div>

                        <div className="text-xs font-bold text-slate-400 dark:text-slate-500 tabular-nums leading-none mt-1.5 px-0.5">
                          <PrivacyBlur isPrivate={isPrivate} className="inline-flex items-center leading-none tabular-nums">
                            {cleanAssetQuantity} {asset.ticker.trim()}
                          </PrivacyBlur>
                        </div>

                        {cleanComment && (
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate italic mt-1.5 px-0.5 font-normal w-full" title={cleanComment}>
                            {cleanComment}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-200/40 dark:border-white/[0.04] flex items-center justify-between relative z-10 gap-2">
                      <div className="flex flex-col justify-center gap-1.5 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap text-xs leading-none">
                          <span className="inline-flex items-center font-bold leading-none text-slate-400 dark:text-slate-500">Вложено:</span>
                          <PrivacyBlur
                            isPrivate={isPrivate}
                            className="inline-flex items-center font-black leading-none text-crypto-500 dark:text-crypto-400 tracking-tight whitespace-nowrap tabular-nums"
                          >
                            {formatCurrency(asset.amount)}
                          </PrivacyBlur>
                        </div>
                        
                        {(purchaseRateStandaloneLabel || marketRateStandaloneLabel) && (
                          <div className="flex items-center gap-1.5 text-[10px] font-bold leading-none whitespace-nowrap">
                            {purchaseRateNumStr && marketRateStandaloneLabel ? (
                              <>
                                <span className="inline-flex items-center leading-none text-slate-400 dark:text-slate-500">Покупка:</span>
                                <span className="inline-flex items-center leading-none text-slate-500 dark:text-slate-400 tabular-nums">
                                  {purchaseRateNumStr}
                                </span>
                                <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600 mx-0.5 shrink-0" />
                                <span className="inline-flex items-center leading-none text-slate-400 dark:text-slate-500">Курс:</span>
                                <span className="inline-flex items-center leading-none text-slate-500 dark:text-slate-400 tabular-nums">
                                  {marketRateStandaloneLabel}
                                </span>
                              </>
                            ) : purchaseRateStandaloneLabel ? (
                              <>
                                <span className="inline-flex items-center leading-none text-slate-400 dark:text-slate-500">Курс покупки:</span>
                                <span className="inline-flex items-center leading-none text-slate-500 dark:text-slate-400 tabular-nums">
                                  {purchaseRateStandaloneLabel}
                                </span>
                              </>
                            ) : (
                              <>
                                <span className="inline-flex items-center leading-none text-slate-400 dark:text-slate-500">Курс:</span>
                                <span className="inline-flex items-center leading-none text-slate-500 dark:text-slate-400 tabular-nums">
                                  {marketRateStandaloneLabel}
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
                    Удалить актив?
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 leading-relaxed text-center">
                    Вы уверены, что хотите навсегда удалить актив «<strong className="text-slate-950 dark:text-white">{deletingAsset.ticker}</strong>»? Это действие нельзя отменить.
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
