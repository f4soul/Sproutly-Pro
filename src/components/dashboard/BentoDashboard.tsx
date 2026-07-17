import React, { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Wallet,
  Landmark,
  Vault,
  ChartNoAxesCombined,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  EyeOff,
  Info,
  Activity,
  ChevronDown
} from "lucide-react";
import { Deposit, CashAsset, InvestmentAsset, CryptoAsset, TaxYearSettings, AppSettings } from "../../types";
import { useAppData } from "../../context/AppDataContext";
import { calculateUnifiedFinance } from "../../lib/unifiedFinance";
import { formatCurrency, cn } from "../../lib/utils";
import {
  getExchangeRates,
  convertToRub,
  CurrencyRates,
} from "../../services/currency";
import { isDepositClosed, calculateIncome } from "../../lib/depositCalculations";
import { DepositHeatmap } from "../deposits/DepositHeatmap";
import { HeatmapIcon } from "../ui/HeatmapIcon";

import { AnimatedCurrency } from "../ui/AnimatedCurrency";
import { AnimatedPercentage } from "../ui/AnimatedPercentage";
import { AutoFitText } from "../ui/AutoFitText";
import { PrivacyBlur } from "../ui/PrivacyBlur";
import { EmptyState } from "../ui/EmptyState";

interface BentoDashboardProps {
  deposits: Deposit[];
  cashAssets?: CashAsset[];
  investmentAssets?: InvestmentAsset[];
  cryptoAssets?: CryptoAsset[];
  taxSettings: TaxYearSettings[];
  appSettings: AppSettings;
  isPrivate?: boolean;
  setIsPrivate?: (val: boolean) => void;
}

export function BentoDashboard({
  deposits,
  cashAssets = [],
  investmentAssets = [],
  cryptoAssets = [],
  taxSettings,
  appSettings,
  isPrivate = false,
  setIsPrivate,
}: BentoDashboardProps) {
  const { state } = useAppData();
  const selectedYear = state.activeYear;
  
  const [rates, setRates] = React.useState<CurrencyRates | null>(null);
  const [isInvestBreakdownOpen, setIsInvestBreakdownOpen] = useState(false);
  const investBreakdownRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (investBreakdownRef.current && !investBreakdownRef.current.contains(event.target as Node)) {
        setIsInvestBreakdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  React.useEffect(() => {
    getExchangeRates().then(setRates);
  }, []);

  const data = useMemo(() => {
    // ... (logic remains same)
    let totalDepositsAmount = 0;
    let totalCashAmount = 0;
    let totalInvestmentsAmount = 0;
    let totalCryptoAmount = 0;
    const upcomingEvents: {
      date: Date;
      type: "deposit_end" | "salary";
      label: string;
      amount?: number;
      currency?: string;
      income?: number;
    }[] = [];

    deposits.forEach((d) => {
      if (d.isArchived) return;

      const isClosed =
        d.isClosed ||
        (() => {
          if (!d.endDate) return false;
          const end = new Date(d.endDate);
          end.setHours(0, 0, 0, 0);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          return end.getTime() < today.getTime();
        })();

      if (!isClosed) {
        totalDepositsAmount += convertToRub(
          d.amount,
          d.currency || "RUB",
          rates,
        );
      }

      if (d.endDate) {
        const endDate = new Date(d.endDate);
        if (endDate.getFullYear() === selectedYear) {
          upcomingEvents.push({
            date: endDate,
            type: "deposit_end",
            label: `Окончание: ${d.bank}`,
            amount: d.amount,
            currency: d.currency || "RUB",
            income: calculateIncome(d),
          });
        }
      }
    });

    cashAssets.forEach((c) => {
      if (!c.isArchived) {
        totalCashAmount += convertToRub(c.amount, c.currency || "RUB", rates);
      }
    });

    investmentAssets.forEach((i) => {
      if (!i.isArchived) {
        totalInvestmentsAmount += convertToRub(i.currentValue, i.currency || "RUB", rates);
      }
    });

    cryptoAssets.forEach((c) => {
      if (!c.isArchived) {
        totalCryptoAmount += c.currentValue;
      }
    });

    const yearData = state.years[selectedYear];
    const includeDeposits = true;
    const unified = calculateUnifiedFinance({
      selectedYear,
      yearData,
      deposits,
      taxSettings,
      taxBrackets: state.taxBrackets,
      includeDeposits,
    });

    let totalNormDays = 247;
    let totalWorkingHours = 1973;

    if (yearData) {
      totalNormDays = yearData.months.reduce((sum, m) => sum + m.normDays, 0);
      totalWorkingHours = totalNormDays * 8;
      // Salary events removed per user request
    }

    const now = new Date();
    const sortedEvents = upcomingEvents
      .filter((e) => e.date >= now)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 5);

    const prevYear = selectedYear - 1;
    const prevYearData = state.years[prevYear];
    const prevUnified = calculateUnifiedFinance({
      selectedYear: prevYear,
      yearData: prevYearData,
      deposits,
      taxSettings,
      taxBrackets: state.taxBrackets,
      includeDeposits,
    });

    const netDiffPercent =
      prevUnified.totalNet > 0
        ? ((unified.totalNet - prevUnified.totalNet) / prevUnified.totalNet) *
          100
        : 0;

    return {
      ...unified,
      limit: unified.depositLimit,
      totalDepositsAmount,
      totalCashAmount,
      totalInvestmentsAmount,
      totalCryptoAmount,
      totalNetCapital: totalDepositsAmount + totalCashAmount + totalInvestmentsAmount + totalCryptoAmount,
      upcomingEvents: sortedEvents,
      netDiffPercent,
      totalNormDays,
      totalWorkingHours,
    };
  }, [deposits, selectedYear, taxSettings, state]);

  const incomeChartData = [
    {
      name: "Зарплата",
      value: data.salaryGross,
      color: "var(--color-primary-500)",
    },
    {
      name: "Вклады",
      value: data.depositsIncome,
      color: "var(--color-deposit-500)",
    },
  ];

  const formatVal = (val: number, cur: string = "RUB") => (
    <PrivacyBlur isPrivate={isPrivate}>
      <AnimatedCurrency value={val} currency={cur} />
    </PrivacyBlur>
  );
  const formatValPlain = (
    val: number,
    cur: string = "RUB",
    hideSymbol: boolean = false,
  ) => {
    let formatted = formatCurrency(val, cur);
    if (hideSymbol) formatted = formatted.replace(/[^\d\s.,-]/g, "").trim();
    return <PrivacyBlur isPrivate={isPrivate}>{formatted}</PrivacyBlur>;
  };
  const limitProgress = Math.min(100, (data.depositsIncome / data.limit) * 100);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 w-full min-w-0">
      {/* Bento Grid */}
      <motion.div
        id="bento-grid"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 lg:auto-rows-[180px]"
      >
        {/* Main Capital Card (2/3 width) */}
        <motion.div
          whileHover={{ y: -4 }}
          className="col-span-1 md:col-span-2 lg:col-span-4 lg:row-span-2 apple-card p-5 sm:p-6 flex flex-col justify-between relative overflow-hidden group"
        >
          {/* Decorative shapes */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 dark:bg-primary-500/20 rounded-full blur-3xl -translate-y-32 translate-x-32 transition-transform duration-700 group-hover:scale-110" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary-500/10 dark:bg-primary-500/20 rounded-full blur-3xl translate-y-32 -translate-x-32 transition-transform duration-700 group-hover:scale-110" />

          {/* Decorative Year Background */}
          <div className="absolute -right-6 -bottom-12 select-none pointer-events-none transition-all duration-700 overflow-hidden">
            <motion.span
              key={selectedYear}
              initial={{ opacity: 0, scale: 0.8, x: 40 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              transition={{ type: "spring", stiffness: 100, damping: 20 }}
              className="text-[160px] font-black leading-none tracking-tighter whitespace-nowrap text-black/[0.06] dark:text-white/5"
            >
              {selectedYear}
            </motion.span>
          </div>

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-2 group/tooltip">
                  <Wallet
                    size={18}
                    className="text-primary-500 dark:text-primary-400"
                  />
                  <span className="text-sm font-bold uppercase tracking-wider">
                    Чистый капитал (Net)
                  </span>
                  <div className="relative flex items-center justify-center">
                    <Info
                      size={14}
                      className="text-slate-400 dark:text-slate-500 hover:text-primary-500 transition-colors cursor-help"
                    />
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 sm:w-56 p-2 bg-slate-900/95 dark:bg-white/95 backdrop-blur-xl rounded-xl shadow-xl opacity-0 scale-95 pointer-events-none group-hover/tooltip:opacity-100 group-hover/tooltip:scale-100 transition-all duration-200 z-50 origin-top text-center text-white dark:text-slate-900 text-[10px] font-bold leading-tight">
                      Включает валютные активы, конвертированные по курсу ЦБ РФ
                      на сегодня.
                    </div>
                  </div>
                </div>
              </div>
              {setIsPrivate && (
                <button
                  onClick={() => setIsPrivate(!isPrivate)}
                  className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-95 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400"
                  title={isPrivate ? "Показать данные" : "Скрыть данные"}
                  data-tour="privacy-toggle"
                >
                  {isPrivate ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              )}
            </div>
            <h2 className="text-3xl sm:text-4xl xl:text-5xl font-black tracking-tighter mb-2 text-slate-950 dark:text-white">
              {formatVal(data.totalNetCapital)}
            </h2>
            <div className="flex items-center gap-1 font-medium">
              {data.netDiffPercent! >= 0 ? (
                <ArrowUpRight
                  size={16}
                  className="text-primary-500 dark:text-primary-400"
                />
              ) : (
                <ArrowDownRight
                  size={16}
                  className="text-rose-500 dark:text-rose-400"
                />
              )}
              <AnimatedPercentage
                value={data.netDiffPercent!}
                showPlus={true}
                className={cn(
                  "font-bold",
                  data.netDiffPercent! >= 0
                    ? "text-primary-600 dark:text-primary-400"
                    : "text-rose-600 dark:text-rose-400",
                )}
              />
              <span className="text-sm text-slate-500 dark:text-slate-400 ml-1">
                к прошлому году
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-6 mt-6 border-t border-slate-200 dark:border-slate-800 relative z-10">
            <div>
              <p className="text-[11px] sm:text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">
                Доход (до вычета)
              </p>
              <p className="text-xl font-bold text-slate-800 dark:text-slate-200">
                {formatVal(data.totalGross)}
              </p>
            </div>
            <div>
              <p className="text-[11px] sm:text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">
                Всего налогов
              </p>
              <p className="text-xl font-bold text-rose-500 dark:text-rose-400">
                {formatVal(data.totalTax)}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Averages Block */}
        <motion.div
          whileHover={{ y: -4 }}
          className="@container col-span-1 md:col-span-2 lg:col-span-2 lg:row-span-1 apple-card p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden min-h-[130px] group"
        >
          {/* Subtle Accent Glow */}
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-primary-500/10 via-primary-500/5 to-transparent dark:from-primary-900/20 dark:via-primary-900/5 z-0 pointer-events-none"></div>

          {/* Activity Graphic */}
          <div className="absolute top-0 right-0 -mr-4 -mt-4 text-primary-500 opacity-5 dark:opacity-10 group-hover:text-primary-400/20 group-hover:scale-110 transition-all duration-700 pointer-events-none z-0">
            <Activity size={140} strokeWidth={1} />
          </div>

          <div className="relative z-10 h-full flex flex-col justify-between min-w-0">
            <div className="flex items-center justify-between mb-1.5 w-full">
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest truncate">
                Средний доход{" "}
                <span className="opacity-70 ml-0.5 text-[8px]">(NET)</span>
              </h3>
            </div>

            <div className="flex flex-col gap-0.5 mt-auto overflow-hidden">
              <AutoFitText className="flex items-baseline gap-1.5 leading-none mb-0.5 pointer-events-none">
                <span className="text-3xl sm:text-3xl lg:text-[2.5rem] font-black text-primary-600 dark:text-primary-400 drop-shadow-sm p-0.5">
                  {formatVal(data.totalNet / 12)}
                </span>
                <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase shrink-0">
                  / мес
                </span>
              </AutoFitText>

              <div className="flex flex-wrap items-center gap-0.5 mt-1">
                <div className="inline-flex items-baseline gap-1.5 leading-none bg-slate-50/50 dark:bg-slate-950/50 px-2.5 py-2 rounded-[8px] border border-slate-200/50 dark:border-white/5 w-max max-w-full">
                  <span className="text-[11px] sm:text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                    {formatVal(data.totalNet / 365)}
                  </span>
                  <span className="text-[8px] sm:text-[9px] font-bold text-slate-500 uppercase tracking-widest shrink-0">
                    / день
                  </span>
                </div>

                <div className="inline-flex items-baseline gap-1.5 leading-none bg-slate-50/50 dark:bg-slate-950/50 px-2.5 py-2 rounded-[8px] border border-slate-200/50 dark:border-white/5 w-max max-w-full">
                  <span className="text-[11px] sm:text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                    {formatVal(data.totalNet / 1973)}
                  </span>
                  <span className="text-[8px] sm:text-[9px] font-bold text-slate-500 uppercase tracking-widest shrink-0">
                    / час
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Income Structure Chart */}
        <motion.div
          whileHover={{ y: -4 }}
          className="col-span-1 md:col-span-2 lg:col-span-2 lg:row-span-2 apple-card p-4 sm:p-5 flex flex-col justify-between min-h-[160px] lg:min-h-0 relative"
        >
          <div className="flex items-center justify-between z-10 relative">
            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest truncate">
              Структура доходов
            </h3>
          </div>

          <div className="flex-1 flex flex-col justify-center gap-4 mt-2 mb-2">
            <div className="hidden lg:flex flex-1 items-center justify-center min-h-[140px] relative z-0">
              {(() => {
                const total = incomeChartData.reduce(
                  (sum, item) => sum + item.value,
                  0,
                );
                if (total === 0)
                  return (
                    <EmptyState className="opacity-50 text-xs text-center" />
                  );

                return (
                  <div className="w-full flex items-center justify-center h-full max-h-[160px] lg:max-h-[220px]">
                    <svg
                      className="w-full h-full max-w-[220px] max-h-[220px] -rotate-90 overflow-visible"
                      viewBox="0 0 200 200"
                    >
                      {incomeChartData.map((item, idx) => {
                        const radius = 95 - idx * 20;
                        const circumference = 2 * Math.PI * radius;
                        const percent = total > 0 ? item.value / total : 0;
                        const strokeDashoffset = Math.max(
                          0,
                          circumference - percent * circumference,
                        );

                        return (
                          <g key={`income-ring-${item.name}-${idx}`}>
                            <circle
                              cx="100"
                              cy="100"
                              r={radius}
                              fill="none"
                              stroke={item.color}
                              strokeWidth="15"
                              className="opacity-[0.08] dark:opacity-[0.15]"
                            />
                            {percent > 0 && (
                              <motion.circle
                                cx="100"
                                cy="100"
                                r={radius}
                                fill="none"
                                stroke={item.color}
                                strokeWidth="15"
                                strokeLinecap="round"
                                strokeDasharray={circumference}
                                initial={{ strokeDashoffset: circumference }}
                                animate={{ strokeDashoffset }}
                                transition={{
                                  duration: 1.5,
                                  ease: "easeOut",
                                  delay: idx * 0.15,
                                }}
                                style={{
                                  filter: `drop-shadow(0 0 8px ${item.color}90)`,
                                }}
                              />
                            )}
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                );
              })()}
            </div>

            <div className="lg:hidden space-y-4">
              <div className="relative h-2 bg-slate-50 dark:bg-slate-800/50 rounded-full">
                <div className="flex h-full w-full rounded-full">
                  {(() => {
                    const total = incomeChartData.reduce(
                      (sum, item) => sum + item.value,
                      0,
                    );
                    if (total === 0) return (
                      <EmptyState className="absolute inset-0 italic" />
                    );
                    return incomeChartData.map((item, idx) => (
                      <motion.div
                        key={item.name}
                        initial={{ width: 0 }}
                        animate={{ width: `${(item.value / total) * 100}%` }}
                        transition={{ duration: 1, delay: idx * 0.2 }}
                        style={{
                          backgroundColor: item.color,
                          boxShadow: `0 0 8px ${item.color}90`,
                        }}
                        className="h-full first:rounded-l-full last:rounded-r-full relative z-10"
                      />
                    ));
                  })()}
                </div>
              </div>
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                <span>0 ₽</span>
                <span>
                  {(() => {
                    const total = incomeChartData.reduce(
                      (sum, item) => sum + item.value,
                      0,
                    );
                    return formatValPlain(total);
                  })()}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2 mt-auto shrink-0 z-10 relative">
            {incomeChartData.map((item, idx) => (
              <div
                key={`income-item-${item.name}-${idx}`}
                className="flex items-center justify-between gap-1"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full shadow-sm"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    {item.name}
                  </span>
                </div>
                <span
                  className="text-xs font-black text-slate-950 dark:text-white"
                  title={isPrivate ? undefined : formatCurrency(item.value)}
                >
                  {formatVal(item.value)}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Tax Limit Progress */}
        <motion.div
          whileHover={{ y: -4 }}
          className="col-span-1 md:col-span-1 lg:col-span-2 lg:row-span-1 apple-card p-4 sm:p-5 flex flex-col justify-between min-w-0"
        >
          <div className="flex items-center justify-between mb-4 w-full">
            <h3 className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest truncate">
              Лимит вкладов
            </h3>
            <span
              className={cn(
                "px-2 py-0.5 rounded-full text-[10px] font-bold tracking-widest shrink-0",
                limitProgress >= 100
                  ? "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
                  : "bg-deposit-50 text-deposit-600 dark:bg-deposit-500/10 dark:text-deposit-400",
              )}
            >
              {limitProgress.toFixed(1)}%
            </span>
          </div>

          <div className="flex-1 flex flex-col justify-end w-full space-y-4">
            <p className="text-lg sm:text-[1.35rem] md:text-xl lg:text-[1.15rem] xl:text-[1.45rem] font-black text-slate-950 dark:text-white truncate tracking-tight">
              {formatVal(data.depositsIncome)}
            </p>

            <div className="relative h-2 bg-slate-50 dark:bg-slate-800/50 rounded-full shrink-0 mt-auto">
              <motion.div
                initial={{ width: 0 }}
                animate={{
                  width: `${Math.min(100, Math.max(0, limitProgress))}%`,
                }}
                transition={{ duration: 1, ease: "easeOut" }}
                className={cn(
                  "h-full rounded-full transition-colors duration-500",
                  limitProgress >= 100
                    ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]"
                    : "bg-deposit-500 shadow-[0_0_8px_rgba(var(--rgb-deposit),0.6)]",
                )}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 shrink-0">
              <span>0 ₽</span>
              <span>{formatValPlain(data.limit)}</span>
            </div>
          </div>
        </motion.div>

        {/* Total in Deposits */}
        <motion.div
          whileHover={{ y: -4 }}
          className={cn(
            "@container col-span-1 md:col-span-1 lg:col-span-2 lg:row-span-1 apple-card p-4 sm:p-5 flex flex-col justify-between items-start min-w-0 h-full relative overflow-hidden !overflow-visible transition-all",
            isInvestBreakdownOpen ? "z-50" : "z-10"
          )}
        >
          <div className="w-full flex justify-between items-start mb-2">
            <div className="w-8 h-8 rounded-lg bg-deposit-100 dark:bg-deposit-500/20 flex items-center justify-center text-deposit-600 dark:text-deposit-400 shrink-0">
              <Landmark size={16} />
            </div>
            {(() => {
              const activeCount = deposits.filter(
                (d) => !d.isArchived && !isDepositClosed(d),
              ).length;
              if (activeCount > 0) {
                const lastDigit = activeCount % 10;
                const lastTwo = activeCount % 100;
                const word =
                  lastDigit === 1 && lastTwo !== 11 ? "активный" : "активных";
                return (
                  <div className="bg-slate-50/80 dark:bg-slate-800/80 flex items-center px-2 py-1 rounded-lg backdrop-blur-md border border-slate-200/50 dark:border-white/5">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                      <span className="text-deposit-500 mr-1">
                        {activeCount}
                      </span>
                      {word}
                    </span>
                  </div>
                );
              }
              return null;
            })()}
          </div>

          <div className="min-w-0 w-full mt-auto flex flex-col items-start gap-0.5">
            <h3 className="text-[9px] sm:text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest truncate">
              Сбережения и инвестиции
            </h3>

            {data.totalNetCapital > 0 ? (
              (() => {
                const total = data.totalNetCapital;
                const depPct =
                  total > 0 ? (data.totalDepositsAmount / total) * 100 : 0;
                const cashPct =
                  total > 0 ? (data.totalCashAmount / total) * 100 : 0;
                const invPct =
                  total > 0 ? (data.totalInvestmentsAmount / total) * 100 : 0;
                const cryptoPct =
                  total > 0 ? (data.totalCryptoAmount / total) * 100 : 0;

                const barItems = [
                  { id: 'dep', amount: data.totalDepositsAmount, pct: depPct, name: 'Вклады', bgClass: 'bg-deposit-500 dark:bg-deposit-400 dark:shadow-[0_0_10px_rgba(20,184,166,0.6)]', iconBgClass: 'bg-deposit-500 dark:bg-deposit-400' },
                  { id: 'cash', amount: data.totalCashAmount, pct: cashPct, name: 'Наличные', bgClass: 'bg-cash-500 dark:bg-cash-400 dark:shadow-[0_0_10px_rgba(16,185,129,0.6)]', iconBgClass: 'bg-cash-500 dark:bg-cash-400' },
                  { id: 'inv', amount: data.totalInvestmentsAmount, pct: invPct, name: 'Биржа', bgClass: 'bg-invest-500 dark:bg-invest-400 dark:shadow-[0_0_10px_rgba(6,182,212,0.6)]', iconBgClass: 'bg-invest-500 dark:bg-invest-400' },
                  { id: 'crypto', amount: data.totalCryptoAmount, pct: cryptoPct, name: 'Крипта', bgClass: 'bg-crypto-500 dark:bg-crypto-400 dark:shadow-[0_0_10px_rgba(245,158,11,0.6)]', iconBgClass: 'bg-crypto-500 dark:bg-crypto-400' },
                ].filter(item => item.amount > 0).sort((a, b) => b.amount - a.amount);

                const totalInvestCombinedAmount = data.totalInvestmentsAmount + data.totalCryptoAmount;
                const investCombinedPct = total > 0 ? (totalInvestCombinedAmount / total) * 100 : 0;

                const investSubItems = [
                  { id: 'inv', amount: data.totalInvestmentsAmount, pct: invPct, name: 'Биржа', bgClass: 'bg-invest-500 dark:bg-invest-400 dark:shadow-[0_0_10px_rgba(6,182,212,0.6)]', iconBgClass: 'bg-invest-500 dark:bg-invest-400' },
                  { id: 'crypto', amount: data.totalCryptoAmount, pct: cryptoPct, name: 'Крипта', bgClass: 'bg-crypto-500 dark:bg-crypto-400 dark:shadow-[0_0_10px_rgba(245,158,11,0.6)]', iconBgClass: 'bg-crypto-500 dark:bg-crypto-400' },
                ].filter(item => item.amount > 0).sort((a, b) => b.amount - a.amount);

                const investListEntry = investSubItems.length >= 2
                  ? { id: 'invest-group', amount: totalInvestCombinedAmount, pct: investCombinedPct, name: 'Инвестиции', bgClass: 'bg-invest-500 dark:bg-invest-400 dark:shadow-[0_0_10px_rgba(6,182,212,0.6)]', iconBgClass: 'bg-invest-500 dark:bg-invest-400' }
                  : investSubItems[0]; // единственный активный элемент (Биржа ИЛИ Крипта) со своим именем/цветом, либо undefined

                const listItems = [
                  { id: 'dep', amount: data.totalDepositsAmount, pct: depPct, name: 'Вклады', bgClass: 'bg-deposit-500 dark:bg-deposit-400 dark:shadow-[0_0_10px_rgba(20,184,166,0.6)]', iconBgClass: 'bg-deposit-500 dark:bg-deposit-400' },
                  { id: 'cash', amount: data.totalCashAmount, pct: cashPct, name: 'Наличные', bgClass: 'bg-cash-500 dark:bg-cash-400 dark:shadow-[0_0_10px_rgba(16,185,129,0.6)]', iconBgClass: 'bg-cash-500 dark:bg-cash-400' },
                  investListEntry,
                ].filter((item): item is NonNullable<typeof item> => Boolean(item) && item.amount > 0).sort((a, b) => b.amount - a.amount);

                return (
                  <div className="flex flex-col w-full gap-3 mt-2">
                    <div className="w-full h-1.5 bg-slate-200/50 dark:bg-slate-800/50 rounded-full overflow-hidden flex shadow-inner">
                      {barItems.map(item => (
                        <div
                          key={item.id}
                          className={`h-full ${item.bgClass}`}
                          style={{ width: `${item.pct}%` }}
                        />
                      ))}
                    </div>
                    <div className="flex flex-col w-full gap-1">
                      {listItems.map(item => {
                        const isInvestGroup = item.id === 'invest-group';
                        const hasSubItems = isInvestGroup && investSubItems.length > 0;
                        return (
                          <div key={item.id} className="relative flex flex-col" ref={hasSubItems ? investBreakdownRef : null}>
                            <div 
                              className={cn(
                                "flex items-center justify-between gap-2", 
                                hasSubItems && "cursor-pointer select-none py-0.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors -mx-1 px-1"
                              )}
                              onClick={hasSubItems ? () => setIsInvestBreakdownOpen(v => !v) : undefined}
                              role={hasSubItems ? "button" : undefined}
                              tabIndex={hasSubItems ? 0 : undefined}
                              onKeyDown={hasSubItems ? (e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  setIsInvestBreakdownOpen(v => !v);
                                }
                              } : undefined}
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <div className={`w-1.5 h-1.5 rounded-full ${item.iconBgClass} shrink-0`} />
                                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
                                  {item.name}
                                </span>
                                {hasSubItems && (
                                  <ChevronDown size={10} strokeWidth={3} className={cn("text-slate-400 dark:text-slate-500 transition-transform shrink-0", !isInvestBreakdownOpen && "-rotate-90")} />
                                )}
                              </div>
                              <div className="flex items-baseline gap-1.5 shrink-0">
                                <span className="text-xs font-black text-slate-950 dark:text-white">{formatValPlain(Math.round(item.amount), "RUB", true)}</span>
                                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 w-8 text-right">{item.pct.toFixed(0)}%</span>
                              </div>
                            </div>
                            
                            {hasSubItems && (
                              <AnimatePresence>
                                {isInvestBreakdownOpen && (
                                  <motion.div
                                    initial={{ opacity: 0, y: -8, scale: 0.98 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -8, scale: 0.98 }}
                                    transition={{ duration: 0.15 }}
                                    className="absolute left-0 right-0 top-full mt-1 z-30 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-[0_16px_40px_rgba(0,0,0,0.15)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.6)] p-3 flex flex-col gap-2"
                                  >
                                    {investSubItems.map(subItem => (
                                      <div key={subItem.id} className="flex items-center justify-between gap-2 py-0.5">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                          <div className={`w-1.5 h-1.5 rounded-full ${subItem.iconBgClass} shrink-0`} />
                                          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">{subItem.name}</span>
                                        </div>
                                        <div className="flex items-baseline gap-1.5 shrink-0">
                                          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{formatValPlain(Math.round(subItem.amount), "RUB", true)}</span>
                                          <span className="text-[9px] font-medium text-slate-400 dark:text-slate-500 w-8 text-right pl-3">{subItem.pct.toFixed(0)}%</span>
                                        </div>
                                      </div>
                                    ))}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()
            ) : (
              <EmptyState className="italic" />
            )}
          </div>
        </motion.div>

        {/* Upcoming Events */}
        <motion.div
          whileHover={{ y: -4 }}
          className="col-span-1 md:col-span-2 lg:col-span-6 lg:row-span-2 apple-card p-6 flex flex-col min-h-[300px] lg:min-h-0"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Ближайшие события
            </h3>
            <Calendar size={18} className="text-slate-400" />
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto custom-scrollbar pr-2 cursor-auto relative">
            {data.upcomingEvents.length > 0 ? (
              data.upcomingEvents.map((event, idx) => (
                <div
                  key={`event-${event.type}-${event.date.getTime()}-${idx}`}
                  className="flex items-center gap-4 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 hover:shadow-sm transition-all"
                >
                  <div
                    className={cn(
                      "w-10 h-10 rounded-xl flex flex-col items-center justify-center shrink-0",
                      event.type === "salary"
                        ? "bg-primary-100 text-primary-600 dark:bg-primary-500/20 dark:text-primary-400"
                        : "bg-deposit-100 text-deposit-600 dark:bg-deposit-500/20 dark:text-deposit-400",
                    )}
                  >
                    <span className="text-[8px] font-black uppercase leading-none">
                      {event.date.toLocaleString("ru", { month: "short" })}
                    </span>
                    <span className="text-base font-black leading-none">
                      {event.date.getDate()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-950 dark:text-white truncate">
                      {event.label}
                    </p>
                    <p className="text-[10px] text-slate-500 font-medium">
                      {event.type === "salary" ? "Зарплата" : "Вклад"}
                    </p>
                  </div>
                  <div className="text-right flex flex-col items-end justify-center">
                    <p className="text-xs font-black text-slate-950 dark:text-white leading-tight">
                      {formatValPlain(
                        event.amount || 0,
                        event.currency || "RUB",
                      )}
                    </p>
                    {event.type === "deposit_end" && event.income !== undefined && (
                      <p className="text-[10px] font-bold text-deposit-500 dark:text-deposit-400 mt-0.5 leading-none px-1.5 py-0.5 bg-deposit-50 dark:bg-deposit-500/10 rounded-md inline-block">
                        +{formatValPlain(event.income, event.currency || "RUB")}
                      </p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <EmptyState className="absolute inset-0 italic" />
            )}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
