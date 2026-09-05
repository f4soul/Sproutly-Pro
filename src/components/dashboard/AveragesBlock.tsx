import React from "react";
import { Activity } from "lucide-react";
import { motion } from "motion/react";
import { PrivacyBlur } from "../ui/PrivacyBlur";
import { AnimatedCurrency } from "../ui/AnimatedCurrency";
import { AutoFitText } from "../ui/AutoFitText";

interface AveragesBlockProps {
  totalNet: number;
  isPrivate: boolean;
}

export function AveragesBlock({ totalNet, isPrivate }: AveragesBlockProps) {
  const formatVal = (val: number, cur: string = "RUB") => (
    <PrivacyBlur isPrivate={isPrivate}>
      <AnimatedCurrency value={val} currency={cur} />
    </PrivacyBlur>
  );

  return (
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
              {formatVal(totalNet / 12)}
            </span>
            <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase shrink-0">
              / мес
            </span>
          </AutoFitText>

          <div className="flex flex-wrap items-center gap-0.5 mt-1">
            <div className="inline-flex items-baseline gap-1.5 leading-none bg-slate-50/50 dark:bg-slate-950/50 px-2.5 py-2 rounded-[8px] border border-slate-200/50 dark:border-white/5 w-max max-w-full">
              <span className="text-[11px] sm:text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                {formatVal(totalNet / 365)}
              </span>
              <span className="text-[8px] sm:text-[9px] font-bold text-slate-500 uppercase tracking-widest shrink-0">
                / день
              </span>
            </div>

            <div className="inline-flex items-baseline gap-1.5 leading-none bg-slate-50/50 dark:bg-slate-950/50 px-2.5 py-2 rounded-[8px] border border-slate-200/50 dark:border-white/5 w-max max-w-full">
              <span className="text-[11px] sm:text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                {formatVal(totalNet / 1973)}
              </span>
              <span className="text-[8px] sm:text-[9px] font-bold text-slate-500 uppercase tracking-widest shrink-0">
                / час
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
