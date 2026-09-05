import React from "react";
import { Calendar } from "lucide-react";
import { motion } from "motion/react";
import { cn, formatCurrency } from "../../lib/utils";
import { PrivacyBlur } from "../ui/PrivacyBlur";
import { EmptyState } from "../ui/EmptyState";

interface UpcomingEvent {
  date: Date;
  type: "deposit_end" | "salary";
  label: string;
  amount?: number;
  currency?: string;
  income?: number;
}

interface UpcomingEventsProps {
  events: UpcomingEvent[];
  isPrivate: boolean;
}

export function UpcomingEvents({ events, isPrivate }: UpcomingEventsProps) {
  const formatValPlain = (
    val: number,
    cur: string = "RUB",
    hideSymbol: boolean = false,
  ) => {
    let formatted = formatCurrency(val, cur);
    if (hideSymbol) formatted = formatted.replace(/[^\d\s.,-]/g, "").trim();
    return (
      <span className="tabular-nums">
        <PrivacyBlur isPrivate={isPrivate}>{formatted}</PrivacyBlur>
      </span>
    );
  };

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="w-full apple-card p-6 flex flex-col"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Ближайшие события
        </h3>
        <Calendar size={18} className="text-slate-400" />
      </div>
      <div className="cursor-auto relative">
        {events.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 content-start">
            {events.map((event, idx) => (
              <div
                key={`event-${event.type}-${event.date.getTime()}-${idx}`}
                className={cn(
                  "items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 hover:shadow-sm transition-all",
                  idx === 5 ? "hidden lg:flex" : "flex"
                )}
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
                  <span className="text-base font-black leading-none tabular-nums">
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
                <div className="text-right flex flex-col items-end justify-center shrink-0">
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
            ))}
          </div>
        ) : (
          <EmptyState className="absolute inset-0 italic" />
        )}
      </div>
    </motion.div>
  );
}
