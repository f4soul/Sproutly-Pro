import React, { useState } from "react";
import { motion, AnimatePresence, useIsPresent } from "motion/react";
import { Landmark, Vault, ChartNoAxesCombined } from "lucide-react";
import { Deposit, CashAsset, InvestmentAsset } from "../../types";
import { DepositList } from "../deposits/DepositList";
import { CashList } from "./CashList";
import { InvestmentList } from "./InvestmentList";
import { cn } from "../../lib/utils";

interface AssetsViewProps {
  deposits: Deposit[];
  cashAssets: CashAsset[];
  investmentAssets: InvestmentAsset[];
  selectedYear: number;
  isPrivate?: boolean;
}

export function AssetsView({
  deposits,
  cashAssets,
  investmentAssets,
  selectedYear,
  isPrivate = false,
}: AssetsViewProps) {
  const [activeTab, setActiveTab] = useState<"deposits" | "cash" | "investments">("deposits");
  const isOuterPresent = useIsPresent();

  return (
    <div className="space-y-4">
      {/* Segmented Control formatted exactly key-to-key like the dashboard */}
      <div className="flex flex-col items-center gap-4 -mt-2 mb-4 w-full z-20">
        <div className="flex items-center justify-center w-full md:w-auto relative gap-1 z-30">
          <div data-tour="assets-tabs" className="flex items-center bg-slate-50 dark:bg-slate-950/50 rounded-xl gap-1 w-full md:w-auto p-0.5 border border-slate-100 dark:border-white/[0.03]">
            <button
              onClick={() => setActiveTab("deposits")}
              className={cn(
                "flex-1 md:flex-none md:px-5 lg:px-7 relative flex items-center justify-center gap-2 py-2 text-[10px] xl:text-xs font-bold rounded-xl transition-all h-9 z-10",
                activeTab === "deposits"
                  ? "text-primary-600 dark:text-primary-400"
                  : "text-slate-500 hover:text-slate-950 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/5"
              )}
            >
              <span className="relative z-20 flex items-center gap-2">
                <Landmark size={13} className={cn("transition-colors", activeTab === "deposits" ? "opacity-100" : "opacity-60")} />
                <span className="uppercase tracking-widest truncate">Вклады</span>
              </span>
              {activeTab === "deposits" && (
                <motion.div 
                  layoutId="activeAssetsTabPill"
                  className="absolute inset-0 bg-white dark:bg-primary-500/10 rounded-xl z-10 shadow-sm ring-1 ring-black/5 dark:ring-primary-400/30"
                  transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                />
              )}
            </button>

            <button
              onClick={() => setActiveTab("cash")}
              className={cn(
                "flex-1 md:flex-none md:px-5 lg:px-7 relative flex items-center justify-center gap-2 py-2 text-[10px] xl:text-xs font-bold rounded-xl transition-all h-9 z-10",
                activeTab === "cash"
                  ? "text-primary-600 dark:text-primary-400"
                  : "text-slate-500 hover:text-slate-950 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/5"
              )}
            >
              <span className="relative z-20 flex items-center gap-2">
                <Vault size={13} className={cn("transition-colors", activeTab === "cash" ? "opacity-100" : "opacity-60")} />
                <span className="uppercase tracking-widest truncate">Сейф</span>
              </span>
              {activeTab === "cash" && (
                <motion.div 
                  layoutId="activeAssetsTabPill"
                  className="absolute inset-0 bg-white dark:bg-primary-500/10 rounded-xl z-10 shadow-sm ring-1 ring-black/5 dark:ring-primary-400/30"
                  transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                />
              )}
            </button>
            <button
              onClick={() => setActiveTab("investments")}
              className={cn(
                "flex-1 md:flex-none md:px-5 lg:px-7 relative flex items-center justify-center gap-2 py-2 text-[10px] xl:text-xs font-bold rounded-xl transition-all h-9 z-10",
                activeTab === "investments"
                  ? "text-primary-600 dark:text-primary-400"
                  : "text-slate-500 hover:text-slate-950 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/5"
              )}
            >
              <span className="relative z-20 flex items-center gap-2">
                <ChartNoAxesCombined size={13} className={cn("transition-colors", activeTab === "investments" ? "opacity-100" : "opacity-60")} />
                <span className="uppercase tracking-widest truncate">Биржа</span>
              </span>
              {activeTab === "investments" && (
                <motion.div 
                  layoutId="activeAssetsTabPill"
                  className="absolute inset-0 bg-white dark:bg-primary-500/10 rounded-xl z-10 shadow-sm ring-1 ring-black/5 dark:ring-primary-400/30"
                  transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                />
              )}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence mode="popLayout" initial={false}>
        {activeTab === "deposits" && (
          <motion.div
            key="deposits"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <DepositList
              deposits={deposits}
              selectedYear={selectedYear}
              isPrivate={isPrivate}
              isOuterPresent={isOuterPresent}
            />
          </motion.div>
        )}
        {activeTab === "cash" && (
          <motion.div
            key="cash"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <CashList cashAssets={cashAssets} isPrivate={isPrivate} />
          </motion.div>
        )}
        {activeTab === "investments" && (
          <motion.div
            key="investments"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <InvestmentList investmentAssets={investmentAssets} isPrivate={isPrivate} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
