import React, { useState, Fragment, useEffect } from "react";
import { Dialog, Listbox } from "@headlessui/react";
import { Vault, ChevronDown, X, Calendar as CalendarIcon } from "lucide-react";
import { CashAsset } from "../../types";
import { db, emitSyncEvent, syncWithFirebase } from "../../config/db";
import { cn, maskDateInput, toISOLocalDate, parseISOLocalDate } from "../../lib/utils";
import { auth } from "../../config/firebase";
import { motion, AnimatePresence } from "motion/react";
import { getExchangeRates, convertToRub, CurrencyRates } from "../../services/currency";
import { formatCurrency } from "../../lib/taxCalculator";
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { ru } from "date-fns/locale/ru";

registerLocale("ru", ru);

interface CashFormProps {
  onClose: () => void;
  assetToEdit?: CashAsset;
}

export function CashForm({ onClose, assetToEdit }: CashFormProps) {
  const [formData, setFormData] = useState<Partial<CashAsset>>(
    assetToEdit || {
      amount: 0,
      currency: "RUB",
      comment: "",
      exchangeRateOnOpen: undefined,
      purchaseDate: new Date().toISOString().split('T')[0],
    },
  );

  const [rates, setRates] = useState<CurrencyRates | null>(null);
  const [isPurchaseDateOpen, setIsPurchaseDateOpen] = useState(false);

  useEffect(() => {
    getExchangeRates().then(setRates);
  }, []);

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
    if (!formData.amount) {
      alert("Укажите сумму актива");
      return;
    }

    try {
      const dataToSave = {
        ...formData,
        name: formData.currency || "RUB",
        userId: auth.currentUser?.uid || "local",
        updatedAt: Date.now()
      } as CashAsset;

      if (assetToEdit && assetToEdit.id) {
        await db.cashAssets.put({ ...dataToSave, id: assetToEdit.id });
      } else {
        await db.cashAssets.add(dataToSave);
      }
      emitSyncEvent("syncing");
      syncWithFirebase().catch(console.error);
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
        className="fixed inset-y-0 right-0 left-0 md:left-68 bg-slate-950/80 backdrop-blur-sm"
        aria-hidden="true"
      />
      <div className="fixed inset-y-0 right-0 left-0 md:left-68 flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-none">
        <Dialog.Panel as={Fragment}>
          <motion.div 
            layout
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
                    <div className="w-8 h-8 rounded-lg bg-cash-100 dark:bg-cash-500/20 flex items-center justify-center text-cash-600 dark:text-cash-400 shrink-0">
                      <Vault className="w-4 h-4 stroke-[2.5px]" />
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
              <div className="space-y-2 relative z-20">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                  Дата
                </label>
                <div className="relative w-full group">
                  <DatePicker
                    selected={parseISOLocalDate(formData.purchaseDate)}
                    onChange={(date: Date | null) => {
                      if (date) {
                        setFormData(p => ({ ...p, purchaseDate: toISOLocalDate(date) }));
                        setIsPurchaseDateOpen(false);
                      } else {
                        setFormData(p => ({ ...p, purchaseDate: undefined }));
                      }
                    }}
                    onChangeRaw={(e) => {
                      if (!e || !e.target || typeof (e.target as any).value !== "string") return;
                      const target = e.target as HTMLInputElement;
                      const { display } = maskDateInput(target.value);
                      target.value = display;
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        setIsPurchaseDateOpen(false);
                      }
                    }}
                    onClickOutside={(e) => {
                      const target = e.target as HTMLElement;
                      if (target.closest(".datepicker-toggle-btn-purchase")) {
                        return;
                      }
                      setIsPurchaseDateOpen(false);
                    }}
                    open={isPurchaseDateOpen}
                    preventOpenOnFocus={true}
                    locale="ru"
                    dateFormat="dd.MM.yyyy"
                    className="apple-input w-full pr-12 cursor-text font-mono text-sm"
                    placeholderText="Выберите дату"
                    wrapperClassName="w-full"
                    portalId="datepicker-portal-container"
                  />
                  <button
                    type="button"
                    onClick={() => setIsPurchaseDateOpen(!isPurchaseDateOpen)}
                    className="datepicker-toggle-btn-purchase absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-amber-500 transition-colors rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 active:scale-90 cursor-pointer z-20 flex items-center justify-center"
                    title="Выбрать дату"
                  >
                    <CalendarIcon className="w-4 h-4 stroke-[1.5px]" />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
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
                          <Listbox.Button className="relative min-w-[54px] h-full flex items-center justify-center gap-1 px-2 rounded-xl bg-slate-100/50 dark:bg-slate-800/80 border border-slate-200/50 dark:border-white/5 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 backdrop-blur-sm cursor-pointer transition-all focus:outline-none">
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
                                as={motion.ul as any}
                                static
                                initial={{ opacity: 0, scale: 0.95, y: -5 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -5 }}
                                transition={{ duration: 0.15 } as any}
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

              <AnimatePresence>
                {formData.currency && formData.currency !== "RUB" && (
                  <motion.div layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden flex flex-col gap-3">
                    {formData.amount && formData.amount > 0 && rates && (
                      <p className="text-[10px] text-slate-500/80 px-1 font-medium mt-0.5">
                        ≈ {formatCurrency(convertToRub(formData.amount, formData.currency, rates))} по курсу ЦБ
                      </p>
                    )}
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
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
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

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
                  className="flex-1 py-3.5 text-sm font-bold text-white bg-cash-500 hover:bg-cash-600 rounded-xl transition-all shadow-[0_4px_16px_rgba(16,185,129,0.3)] hover:shadow-[0_4px_20px_rgba(16,185,129,0.4)] active:scale-95"
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

