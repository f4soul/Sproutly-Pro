import React, { Fragment, useRef } from "react";
import { Listbox, Transition } from "@headlessui/react";
import { ChevronDown, Check, Calculator } from "lucide-react";
import { CalculationFormula, Deposit } from "../../types";
import { cn } from "../../lib/utils";
import { DropdownPortal } from "../ui/DropdownPortal";

const formulas: { id: CalculationFormula; name: string }[] = [
  { id: "simple_days", name: "В конце срока" },
  { id: "simple_months", name: "Ежемесячная выплата" },
  { id: "compound_monthly", name: "С капитализацией" },
  { id: "daily_balance", name: "На ежедневный остаток" },
  { id: "min_balance", name: "На минимальный остаток" },
  { id: "", name: "Без расчета" },
];

interface DepositFormFormulaSelectProps {
  formData: Partial<Deposit>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<Deposit>>>;
  setDuration: React.Dispatch<React.SetStateAction<number | "">>;
}

export function DepositFormFormulaSelect({
  formData,
  setFormData,
  setDuration,
}: DepositFormFormulaSelectProps) {
  const listboxRef = useRef<HTMLDivElement>(null);
  
  return (
    <div className="space-y-2">
      <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
        <Calculator className="w-3.5 h-3.5 text-deposit-500 stroke-[1.5px]" />{" "}
        Формула расчета
      </label>
      <Listbox
        value={formData.formula}
        onChange={(val) => {
          const isSavings = val === "daily_balance" || val === "min_balance";
          setFormData({
            ...formData,
            formula: val as CalculationFormula,
            ...(isSavings ? { endDate: null } : {}),
          });
          if (isSavings) setDuration("");
        }}
      >
        {({ open }) => (
        <div ref={listboxRef} className={cn("relative", open ? "z-[60]" : "z-30")}>
          <Listbox.Button className="relative w-full cursor-pointer rounded-2xl bg-slate-50 dark:bg-slate-800/50 py-3 pl-4 pr-10 text-left border border-transparent focus:border-deposit-500/30 transition-all font-medium text-sm text-slate-950 dark:text-white">
            <span className="block truncate">
              {formulas.find((f) => f.id === formData.formula)?.name}
            </span>
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              <ChevronDown
                className="h-4 w-4 text-slate-500"
                aria-hidden="true"
              />
            </span>
          </Listbox.Button>
          <DropdownPortal targetRef={listboxRef} matchWidth>
          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Listbox.Options className="max-h-60 w-full overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl p-1.5 flex flex-col gap-0.5 text-sm shadow-[0_16px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.5)] border border-slate-200/60 dark:border-white/[0.08] focus:outline-none">
              {formulas.map((formula) => (
                <Listbox.Option
                  key={formula.id}
                  className={({ active }) =>
                    cn(
                      "relative cursor-pointer select-none py-2.5 px-3 rounded-xl font-medium transition-all duration-200 flex items-center justify-between gap-2 border border-transparent",
                      active
                        ? "bg-slate-100/70 dark:bg-slate-800/60 text-slate-900 dark:text-white border-slate-200/40 dark:border-white/[0.04] shadow-sm"
                        : "text-slate-850 dark:text-slate-200",
                    )
                  }
                  value={formula.id}
                >
                  {({ selected }) => (
                    <>
                      <span
                        className={cn(
                          "block truncate text-sm font-medium transition-all text-slate-800 dark:text-slate-200",
                          selected && "font-bold text-slate-950 dark:text-white",
                        )}
                      >
                        {formula.name}
                      </span>
                      {selected ? (
                        <span className="text-deposit-500 flex items-center justify-center shrink-0">
                          <Check className="h-4 w-4 stroke-[2.5px]" />
                        </span>
                      ) : null}
                    </>
                  )}
                </Listbox.Option>
              ))}
            </Listbox.Options>
          </Transition>
          </DropdownPortal>
        </div>
        )}
      </Listbox>
    </div>
  );
}
