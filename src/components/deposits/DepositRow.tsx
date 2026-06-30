import React, { useState } from "react";
import { Edit2, Trash2 } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { Deposit } from "../../types";
import { formatCurrency, formatPercent, cn } from "../../lib/utils";
import {
  calculateIncome,
  isDepositClosed,
} from "../../lib/depositCalculations";
import { getBankDetails } from "../../lib/banks";
import { BankLogo } from "./BankLogo";
import { PrivacyBlur } from "../ui/PrivacyBlur";

interface DepositRowProps {
  deposit: Deposit;
  onEdit: (deposit: Deposit) => void;
  onDelete: (deposit: Deposit) => void;
  isPrivate?: boolean;
  isLast?: boolean;
}

export const DepositRow: React.FC<DepositRowProps> = React.memo(({
  deposit,
  onEdit,
  onDelete,
  isPrivate = false,
  isLast = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const income = calculateIncome(deposit);

  const formatVal = (val: number) => (
    <PrivacyBlur isPrivate={isPrivate}>
      {formatCurrency(val, deposit.currency || "RUB")}
    </PrivacyBlur>
  );

  const parseDate = (dateVal: string | Date | undefined | null) => {
    if (!dateVal) return null;
    const date = dateVal instanceof Date ? dateVal : new Date(dateVal);
    return isNaN(date.getTime()) ? null : date;
  };

  const startDate = parseDate(deposit.startDate);
  const endDate = parseDate(deposit.endDate);
  const isClosed = isDepositClosed(deposit);
  const bankDetails = getBankDetails(deposit.bank);
  const isSavingsAccount =
    deposit.formula === "daily_balance" || deposit.formula === "min_balance";

  const trBackground = isExpanded
    ? "bg-slate-50 dark:bg-[#151b2a]"
    : isClosed
      ? "bg-[#f8fafc] dark:bg-[#0d121f] hover:bg-slate-100 dark:hover:bg-[#151b2a]"
      : isSavingsAccount
        ? "bg-[#f4fcfb] dark:bg-[#06141a] hover:bg-[#e4f7f4] dark:hover:bg-[#091e25]"
        : "bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-[#151b2a]";

  return (
    <>
      <tr
        className={cn(
          "group transition-all cursor-pointer relative",
          trBackground,
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <td
          className={cn(
            "p-2.5 border-slate-200 dark:border-slate-800 relative",
            !(isLast && !isExpanded) && "border-b",
          )}
        >
          {/* Absolute Tags in Top-Left Corner */}
          {(isClosed || isSavingsAccount) && (
            <div className="absolute top-0 left-0 hidden sm:flex items-start z-20 pointer-events-none">
              {isSavingsAccount && (
                <span className={cn(
                  "bg-deposit-500 text-white dark:text-slate-900 text-[6px] font-black uppercase tracking-widest px-1.5 py-0.5 leading-none opacity-90 shadow-[1px_1px_2px_rgba(0,0,0,0.1)]",
                  isClosed ? "rounded-none" : "rounded-br-md"
                )}>
                  Накопительный
                </span>
              )}
              {isClosed && (
                <span className="bg-slate-500 text-white dark:text-slate-900 text-[6px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-br-md leading-none opacity-90 shadow-[1px_1px_2px_rgba(0,0,0,0.1)]">
                  Закрыт
                </span>
              )}
            </div>
          )}

          <div
            className={cn(
              "flex items-center gap-3 relative z-10",
              isClosed && "opacity-60",
            )}
          >
            <div className="w-7 h-7 rounded-lg overflow-hidden bg-white/50 dark:bg-transparent border border-slate-200 dark:border-slate-800 flex items-center justify-center p-1 shrink-0 shadow-sm transition-all mt-1">
              {bankDetails.logoUrl ? (
                <BankLogo
                  logoUrl={bankDetails.logoUrl}
                  alt=""
                  className="w-full h-full object-contain"
                />
              ) : (
                <span
                  className="font-black text-[10px]"
                  style={{ color: bankDetails.color }}
                >
                  {bankDetails.logoText}
                </span>
              )}
            </div>
            <div className="min-w-0 flex flex-col justify-center mt-1">
              <span className="font-bold text-[13px] sm:text-xs md:text-[13px] truncate text-slate-950 dark:text-white leading-tight">
                {deposit.bank}
              </span>
            </div>
          </div>
        </td>
        <td
          className={cn(
            "px-2 py-2.5 text-center border-slate-200 dark:border-slate-800",
            !(isLast && !isExpanded) && "border-b",
          )}
        >
          <span
            className={cn(
              "font-bold text-deposit-500 dark:text-deposit-400 text-[13px]",
              isClosed && "opacity-60",
            )}
          >
            {formatPercent(deposit.rate)}
          </span>
        </td>

        <td
          className={cn(
            "hidden xl:table-cell px-2 py-2.5 text-center border-slate-200 dark:border-slate-800",
            !(isLast && !isExpanded) && "border-b",
          )}
        >
          <span
            className={cn(
              "text-[13px] font-medium text-slate-950 dark:text-white",
              isClosed && "opacity-60",
            )}
          >
            {startDate ? format(startDate, "dd.MM.yy") : "-"}
          </span>
        </td>
        <td
          className={cn(
            "hidden xl:table-cell px-2 py-2.5 text-center border-slate-200 dark:border-slate-800",
            !(isLast && !isExpanded) && "border-b",
          )}
        >
          <span
            className={cn(
              "text-[13px] font-medium",
              isClosed && "opacity-60",
              !isClosed &&
                endDate &&
                differenceInDays(endDate, new Date()) <= 7 &&
                "text-amber-500 dark:text-amber-400 font-bold",
            )}
          >
            {endDate ? format(endDate, "dd.MM.yy") : "∞"}
          </span>
        </td>

        <td
          className={cn(
            "table-cell xl:hidden px-2 py-2.5 text-center border-slate-200 dark:border-slate-800",
            !(isLast && !isExpanded) && "border-b",
          )}
        >
          <div
            className={cn(
              "flex flex-col items-center justify-center",
              isClosed && "opacity-60",
            )}
          >
            <span className="text-[12px] font-medium text-slate-950 dark:text-white">
              {startDate ? format(startDate, "dd.MM.yy") : "-"}
            </span>
            <span
              className={cn(
                "text-[10px]",
                "hidden lg:block", // For tablet landscape
                !isClosed &&
                  endDate &&
                  differenceInDays(endDate, new Date()) <= 7
                  ? "text-amber-500 dark:text-amber-400 font-bold"
                  : "text-slate-500 dark:text-slate-400",
              )}
            >
              {endDate ? format(endDate, "dd.MM.yy") : "∞"}
            </span>
            <span
              className={cn(
                "text-[10px] text-slate-500 dark:text-slate-400 lg:hidden",
              )}
            >
              {endDate ? format(endDate, "dd.MM.yy") : "∞"}
            </span>
            <div className="flex sm:hidden items-center justify-center gap-1 mt-0.5">
              {isSavingsAccount && (
                <span className="bg-deposit-500/10 text-deposit-600 dark:bg-deposit-500/20 dark:text-deposit-400 text-[6px] font-black uppercase tracking-widest px-1.5 py-[3px] rounded-full leading-none whitespace-nowrap">
                  Накопит.
                </span>
              )}
              {isClosed && (
                <span className="bg-slate-500/10 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400 text-[6px] font-black uppercase tracking-widest px-1.5 py-[3px] rounded-full leading-none whitespace-nowrap">
                  Закрыт
                </span>
              )}
            </div>
          </div>
        </td>

        <td
          className={cn(
            "px-2 py-2.5 text-center border-slate-200 dark:border-slate-800",
            !(isLast && !isExpanded) && "border-b",
          )}
        >
          <span
            className={cn(
              "text-[13px] font-bold text-slate-950 dark:text-white",
              isClosed && "opacity-60",
            )}
          >
            {formatVal(deposit.amount)}
          </span>
        </td>

        <td
          className={cn(
            "hidden xl:table-cell px-2 py-2.5 text-center border-slate-200 dark:border-slate-800",
            !(isLast && !isExpanded) && "border-b",
          )}
        >
          <span
            className={cn(
              "text-[13px] font-bold text-deposit-500 dark:text-deposit-400",
              isClosed && "opacity-60",
            )}
          >
            +{formatVal(income)}
          </span>
        </td>
        <td
          className={cn(
            "hidden xl:table-cell px-2 py-2.5 text-center border-slate-200 dark:border-slate-800",
            !(isLast && !isExpanded) && "border-b",
          )}
        >
          <span
            className={cn(
              "text-[13px] font-bold text-slate-950 dark:text-white",
              isClosed && "opacity-60",
            )}
          >
            {formatVal(deposit.amount + income)}
          </span>
        </td>

        <td
          className={cn(
            "table-cell xl:hidden px-2 py-2.5 text-center border-slate-200 dark:border-slate-800",
            !(isLast && !isExpanded) && "border-b",
          )}
        >
          <div className="flex flex-col items-center justify-center">
            <span
              className={cn(
                "text-[13px] font-bold text-slate-950 dark:text-white",
                isClosed && "opacity-60",
              )}
            >
              {formatVal(deposit.amount + income)}
            </span>
            <span
              className={cn(
                "text-[11px] font-bold text-deposit-500 dark:text-deposit-400",
                isClosed && "opacity-60",
              )}
            >
              +{formatVal(income)}
            </span>
          </div>
        </td>

        <td
          className={cn(
            "p-2.5 text-right border-slate-200 dark:border-slate-800 sticky right-0 z-10 bg-inherit",
            !(isLast && !isExpanded) && "border-b",
          )}
        >
          <div className="flex flex-nowrap items-center justify-center gap-2.5 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(deposit);
              }}
              onPointerDown={(e) => e.stopPropagation()} className="p-1.5 hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg text-slate-500 hover:text-primary-600 transition-all cursor-pointer opacity-60 hover:opacity-100"
              title="Редактировать"
            >
              <Edit2 className="w-3.5 h-3.5 stroke-[1.5px]" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(deposit);
              }}
              onPointerDown={(e) => e.stopPropagation()} className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg text-slate-500 hover:text-rose-600 transition-all cursor-pointer opacity-60 hover:opacity-100"
              title="В архив"
            >
              <Trash2 className="w-3.5 h-3.5 stroke-[1.5px]" />
            </button>
          </div>
        </td>
      </tr>
      <tr className="bg-slate-50/30 dark:bg-white/5 border-b border-transparent">
        <td colSpan={9} className="p-0">
          <div
            className={cn(
              "grid transition-[grid-template-rows,opacity] duration-300 ease-out",
              isExpanded
                ? "grid-rows-[1fr] opacity-100 pointer-events-auto"
                : "grid-rows-[0fr] opacity-0 pointer-events-none",
            )}
          >
            <div className="overflow-hidden">
              <div
                className={cn(
                  "border-slate-200 dark:border-slate-800",
                  !isLast && "border-b",
                )}
              >
                {/* Desktop/Tablet Horizontal Content */}
                <div className="hidden lg:flex flex-row flex-wrap items-center gap-6 text-[11px] px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 dark:text-slate-400 font-medium font-bold uppercase tracking-widest text-[8px]">
                      Формула расчета:
                    </span>
                    <span className="font-bold text-slate-950 dark:text-white">
                      {deposit.formula === "simple_days"
                        ? "В конце срока"
                        : deposit.formula === "simple_months"
                          ? "Ежемесячно (без капитализации)"
                          : deposit.formula === "compound_monthly"
                            ? "Ежемесячная капитализация"
                            : deposit.formula === "daily_balance"
                              ? "На ежедневный остаток"
                              : deposit.formula === "min_balance"
                                ? "На минимальный остаток"
                                : "Не указана"}
                    </span>
                  </div>
                  {deposit.sourceNote && (
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 dark:text-slate-400 font-medium font-bold uppercase tracking-widest text-[8px]">
                        Вывод:
                      </span>
                      <span className="font-bold text-slate-950 dark:text-white">
                        {deposit.sourceNote}
                      </span>
                    </div>
                  )}
                  {deposit.comment && (
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-slate-500 dark:text-slate-400 font-medium shrink-0 font-bold uppercase tracking-widest text-[8px]">
                        Заметка:
                      </span>
                      <span
                        className="text-slate-950 dark:text-white truncate"
                        title={deposit.comment}
                      >
                        {deposit.comment}
                      </span>
                    </div>
                  )}
                </div>

                {/* Mobile Content */}
                <div className="lg:hidden flex flex-col gap-4 p-4 text-[11px]">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest text-[8px]">
                        Формула расчета
                      </span>
                      <span className="font-bold text-slate-950 dark:text-white">
                        {deposit.formula === "simple_days"
                          ? "В конце срока"
                          : deposit.formula === "simple_months"
                            ? "Ежемесячно"
                            : deposit.formula === "compound_monthly"
                              ? "Капитализация"
                              : deposit.formula === "daily_balance"
                                ? "Ежедн. остаток"
                                : deposit.formula === "min_balance"
                                  ? "Мин. остаток"
                                  : "Не указана"}
                      </span>
                    </div>
                    {deposit.sourceNote && (
                      <div className="flex flex-col gap-1">
                        <span className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest text-[8px]">
                          Счет вывода
                        </span>
                        <span className="font-bold text-slate-950 dark:text-white">
                          {deposit.sourceNote}
                        </span>
                      </div>
                    )}
                  </div>
                  {deposit.comment && (
                    <div className="flex flex-col gap-1">
                      <span className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest text-[8px]">
                        Дополнительно
                      </span>
                      <span className="text-slate-950 dark:text-white break-words">
                        {deposit.comment}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </td>
      </tr>
    </>
  );
});
