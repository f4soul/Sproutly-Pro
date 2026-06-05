import React, { useState, Fragment } from "react";
import { Dialog, Listbox } from "@headlessui/react";
import { Banknote, ChevronDown, X } from "lucide-react";
import { CashAsset } from "../../types";
import { db, emitSyncEvent } from "../../config/db";
import { cn } from "../../lib/utils";
import { auth } from "../../config/firebase";
import { motion, AnimatePresence } from "motion/react";

interface CashFormProps {
  onClose: () => void;
  assetToEdit?: CashAsset;
}

export function CashForm({ onClose, assetToEdit }: CashFormProps) {
  const [formData, setFormData] = useState<Partial<CashAsset>>(
    assetToEdit || {
      name: "",
      amount: 0,
      currency: "RUB",
      comment: "",
      exchangeRateOnOpen: undefined,
    },
  );

  const [amountStr, setAmountStr] = useState<string>(
    assetToEdit ? assetToEdit.amount.toString() : "",
  );

  const [exchangeRateOnOpenStr, setExchangeRateOnOpenStr] = useState<string>(
    assetToEdit && assetToEdit.exchangeRateOnOpen !== undefined && assetToEdit.exchangeRateOnOpen !== null
      ? assetToEdit.exchangeRateOnOpen.toString()
      : "",
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.amount) {
      alert("Укажите название и сумму актива");
      return;
    }

    try {
      const dataToSave = {
        ...formData,
        userId: auth.currentUser?.uid || "local",
        updatedAt: Date.now()
      } as CashAsset;

      if (assetToEdit && assetToEdit.id) {
        await db.cashAssets.put({ ...dataToSave, id: assetToEdit.id });
      } else {
        await db.cashAssets.add(dataToSave);
      }
      emitSyncEvent("syncing");
      onClose();
    } catch (err) {
      console.error("Error saving cash asset:", err);
      alert("Ошибка при сохранении");
    }
  };

  return (
    <Dialog as="div" className="relative z-[100]" open={true} onClose={onClose} static>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
        aria-hidden="true"
      />
      <div className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-none">
        <Dialog.Panel as={Fragment}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 100 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 100 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="bg-white dark:bg-slate-950 w-full max-w-xl rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800/50 flex flex-col max-h-[90vh] pointer-events-auto"
          >
            <div className="px-6 py-5 sm:px-8 sm:py-6 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg sm:text-xl font-bold tracking-tight text-slate-950 dark:text-white flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-deposit-100 dark:bg-deposit-500/20 flex items-center justify-center text-deposit-600 dark:text-deposit-400 shrink-0">
                      <Banknote className="w-4 h-4 stroke-[2.5px]" />
                    </div>
                    {assetToEdit ? "Редактировать актив" : "Новый актив"}
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 text-[10px] sm:text-xs font-medium mt-1">Информация о наличных сбережениях</p>
                </div>
                <button type="button" onClick={onClose} className="p-2 hover:bg-slate-50 dark:hover:bg-white/5 rounded-full transition-all active:scale-90 cursor-pointer -mt-4 -mr-2 sm:-mr-4">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 sm:p-8 flex flex-col gap-6 overflow-y-auto custom-scrollbar flex-1">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                  Название
                </label>
                <input
                  type="text"
                  required
                  value={formData.name || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  className="apple-input w-full"
                  placeholder="Сейф, Копилка..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  Сумма
                </label>
                <div className="relative">
                  <input
                    required
                    type="text"
                    inputMode="decimal"
                    value={amountStr}
                    onChange={(e) => {
                      const val = e.target.value.replace(",", ".");
                      if (/^[0-9]*[.,]?[0-9]*$/.test(val) || val === "") {
                        setAmountStr(val);
                        const parsed = val === "" ? 0 : Number(val);
                        if (!isNaN(parsed)) {
                          setFormData((prev) => ({
                            ...prev,
                            amount: parsed,
                          }));
                        }
                      }
                    }}
                    className="apple-input w-full font-mono text-sm pr-20"
                    placeholder="0"
                  />
                  <div className="absolute inset-y-1.5 right-1.5 z-10">
                    <Listbox
                      value={formData.currency || "RUB"}
                      onChange={(val) =>
                        setFormData((prev) => ({ ...prev, currency: val }))
                      }
                    >
                      {({ open }) => (
                        <div className="relative h-full text-slate-950 dark:text-white">
                          <Listbox.Button className="relative h-full flex items-center justify-center gap-1.5 px-3 rounded-lg border transition-all duration-200 select-none cursor-pointer border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 active:scale-95 focus:outline-none">
                            <span className="font-bold text-xs sm:text-sm text-slate-700 dark:text-slate-300 flex items-center justify-center min-w-[1.2rem] text-center">
                              {{ RUB: "₽", USD: "$", EUR: "€", CNY: "¥" }[
                                (formData.currency || "RUB") as
                                  | "RUB"
                                  | "USD"
                                  | "EUR"
                                  | "CNY"
                              ] || "₽"}
                            </span>
                            <ChevronDown
                              className={cn(
                                "w-3.5 h-3.5 text-slate-400 stroke-[2.5px] transition-transform",
                                open && "rotate-180",
                              )}
                            />
                          </Listbox.Button>
                          <AnimatePresence>
                            {open && (
                              <Listbox.Options 
                                as={motion.ul}
                                static
                                initial={{ opacity: 0, scale: 0.95, y: -5 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -5 }}
                                transition={{ duration: 0.15 }}
                                className="absolute right-0 mt-2 w-28 max-h-60 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] rounded-2xl bg-white dark:bg-slate-900 p-1.5 flex flex-col gap-0.5 text-sm shadow-[0_16px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.5)] z-[110] border border-slate-200 dark:border-slate-800 focus:outline-none"
                              >
                                {[
                                  { id: "RUB", symbol: "₽", label: "RUB" },
                                  { id: "USD", symbol: "$", label: "USD" },
                                  { id: "EUR", symbol: "€", label: "EUR" },
                                  { id: "CNY", symbol: "¥", label: "CNY" },
                                ].map((c) => (
                                  <Listbox.Option
                                    key={c.id}
                                    value={c.id}
                                    className={({ active, selected }) =>
                                      cn(
                                        "flex items-center gap-2.5 py-2.5 px-3 rounded-xl font-bold transition-all duration-200 cursor-pointer outline-none",
                                        active || selected
                                          ? "bg-deposit-50 dark:bg-deposit-500/20 text-deposit-600 dark:text-deposit-400"
                                          : "text-slate-600 dark:text-slate-300",
                                      )
                                    }
                                  >
                                    {({ selected }) => (
                                      <>
                                        <span
                                          className={cn(
                                            "w-4 text-center shrink-0",
                                            selected
                                              ? "text-deposit-500"
                                              : "text-slate-400",
                                          )}
                                        >
                                          {c.symbol}
                                        </span>
                                        <span className="flex-1 truncate">
                                          {c.label}
                                        </span>
                                      </>
                                    )}
                                  </Listbox.Option>
                                ))}
                              </Listbox.Options>
                            )}
                          </AnimatePresence>
                        </div>
                      )}
                    </Listbox>
                  </div>
                </div>
              </div>

              {formData.currency && formData.currency !== "RUB" && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    Курс ЦБ на дату фиксации (₽)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={exchangeRateOnOpenStr}
                    onChange={(e) => {
                      const typed = e.target.value;
                      const normalized = typed.replace(",", ".");
                      if (/^[0-9]*[.]?[0-9]*$/.test(normalized) || typed === "") {
                        setExchangeRateOnOpenStr(typed);
                        const parsed = typed === "" ? undefined : Number(normalized);
                        if (parsed === undefined || !isNaN(parsed)) {
                          setFormData((prev) => ({
                            ...prev,
                            exchangeRateOnOpen: parsed,
                          }));
                        }
                      }
                    }}
                    className="apple-input w-full font-mono text-sm"
                    placeholder="Например, 95.50"
                  />
                  <p className="text-[10px] text-slate-500 px-1">
                    Для аналитики курсовой разницы в будущем.
                  </p>
                </motion.div>
              )}

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                  Комментарий (Опционально)
                </label>
                <textarea
                  value={formData.comment || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      comment: e.target.value,
                    }))
                  }
                  className="apple-input w-full min-h-[80px] resize-none"
                  placeholder="Зачем или откуда..."
                />
              </div>

              <div className="pt-4 flex gap-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3.5 text-sm font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-all active:scale-95 border border-transparent dark:border-slate-700/50"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3.5 text-sm font-bold text-white bg-deposit-500 hover:bg-deposit-600 rounded-xl transition-all shadow-[0_4px_16px_rgba(20,184,166,0.3)] hover:shadow-[0_4px_20px_rgba(20,184,166,0.4)] active:scale-95"
                >
                  Сохранить
                </button>
              </div>
            </form>
          </motion.div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}

