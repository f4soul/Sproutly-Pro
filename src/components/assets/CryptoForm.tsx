import React, { useState, Fragment, useEffect } from "react";
import { Dialog, Combobox, Transition } from "@headlessui/react";
import { Bitcoin, ChevronDown, X, Calendar as CalendarIcon } from "lucide-react";
import { CryptoAsset } from "../../types";
import { db, emitSyncEvent, syncWithFirebase } from "../../config/db";
import { cn } from "../../lib/utils";
import { auth } from "../../config/firebase";
import { motion, AnimatePresence } from "motion/react";
import { CryptoLogo } from "./CryptoLogo";
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { ru } from "date-fns/locale/ru";

registerLocale("ru", ru);

const POPULAR_TICKERS = ["USDT", "BTC", "ETH", "TON"];

interface CryptoFormProps {
  onClose: () => void;
  assetToEdit?: CryptoAsset;
}

export function CryptoForm({ onClose, assetToEdit }: CryptoFormProps) {
  const [formData, setFormData] = useState<Partial<CryptoAsset>>(
    assetToEdit || {
      ticker: "",
      quantity: 0,
      amount: 0,
      comment: "",
      purchaseDate: new Date().toISOString().split('T')[0],
    },
  );

  const [query, setQuery] = useState("");
  const [quantityStr, setQuantityStr] = useState<string>(
    assetToEdit ? assetToEdit.quantity.toString() : "",
  );
  const [amountStr, setAmountStr] = useState<string>(
    assetToEdit ? assetToEdit.amount.toString() : "",
  );
  const [isPurchaseDateOpen, setIsPurchaseDateOpen] = useState(false);

  const handleRawDateInput = (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    const value = e.currentTarget.value;
    const parts = value.split(".");
    if (parts.length === 3) {
      const p0 = parseInt(parts[0], 10);
      const p1 = parseInt(parts[1], 10);
      let p2 = parseInt(parts[2], 10);

      if (!isNaN(p0) && !isNaN(p1) && !isNaN(p2)) {
        if (p2 < 100) p2 = 2000 + p2;

        const day = p0;
        const month = p1 - 1;
        const year = p2;

        const newDate = new Date(year, month, day);
        if (!isNaN(newDate.getTime())) {
          setFormData((prev) => ({ ...prev, purchaseDate: newDate.toISOString().split('T')[0] }));
        }
      }
    }
  };

  const filteredTickers = query === "" 
    ? POPULAR_TICKERS 
    : POPULAR_TICKERS.filter(b => b.toLowerCase().includes(query.toLowerCase()));

  const handleAmountChange = (val: string, setter: (val: string) => void, field: keyof CryptoAsset) => {
    const formatted = val.replace(",", ".");
    if (/^[0-9]*[.,]?[0-9]*$/.test(formatted) || formatted === "") {
      setter(formatted);
      const parsed = formatted === "" ? 0 : Number(formatted);
      if (!isNaN(parsed)) {
        setFormData((prev) => ({
          ...prev,
          [field]: parsed,
        }));
      }
    }
  };

  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.ticker) {
      alert("Укажите тикер");
      return;
    }

    try {
      const dataToSave = {
        ...formData,
        userId: auth.currentUser?.uid || "local",
        updatedAt: Date.now()
      } as CryptoAsset;

      if (assetToEdit && assetToEdit.id) {
        await db.cryptoAssets.put({ ...dataToSave, id: assetToEdit.id });
      } else {
        await db.cryptoAssets.add(dataToSave);
      }
      emitSyncEvent("syncing");
      syncWithFirebase().catch(console.error);
      onClose();
    } catch (err) {
      console.error("Error saving crypto asset:", err);
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
            className="bg-white dark:bg-slate-950 w-full max-w-xl rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800/50 flex flex-col h-[86dvh] sm:h-[620px] max-h-[86dvh] sm:max-h-[85vh] pointer-events-auto"
          >
            <div className="px-6 py-5 sm:px-8 sm:py-5 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-4 relative z-10 shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg sm:text-xl font-bold tracking-tight text-slate-950 dark:text-white flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                      <Bitcoin className="w-4 h-4 stroke-[2.5px]" />
                    </div>
                    {assetToEdit ? "Редактировать крипту" : "Новый криптоактив"}
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 text-[10px] sm:text-xs font-medium mt-1">Информация об активе в портфеле</p>
                </div>
                <button type="button" onClick={onClose} className="p-2 hover:bg-slate-50 dark:hover:bg-white/5 rounded-full transition-all active:scale-90 cursor-pointer -mt-4 -mr-2 sm:-mr-4 relative z-20">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 relative">
              <div className="flex-1 overflow-y-auto p-6 sm:p-8 flex flex-col gap-6 custom-scrollbar">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2 relative z-30">
                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                      Тикер
                    </label>
                    <Combobox
                      value={formData.ticker || ""}
                      onChange={(val) => setFormData((prev) => ({ ...prev, ticker: val || undefined }))}
                    >
                      <div className="relative">
                        <div className="relative w-full cursor-default overflow-hidden bg-transparent text-left focus:outline-none">
                          <Combobox.Input
                            required
                            className="apple-input w-full pr-10 uppercase"
                            placeholder="USDT, BTC..."
                            onChange={(event) => {
                              const upper = event.target.value.toUpperCase();
                              setQuery(upper);
                              setFormData((prev) => ({ ...prev, ticker: upper }));
                            }}
                          />
                          <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-3">
                            <ChevronDown className="h-4 w-4 text-slate-400" aria-hidden="true" />
                          </Combobox.Button>
                        </div>
                        <Transition
                          as={Fragment}
                          leave="transition ease-in duration-100"
                          leaveFrom="opacity-100"
                          leaveTo="opacity-0"
                          afterLeave={() => setQuery("")}
                        >
                          <Combobox.Options className="absolute mt-2 max-h-60 w-full overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl p-1.5 flex flex-col gap-0.5 text-sm shadow-2xl z-[110] border border-slate-200/60 dark:border-white/[0.08] focus:outline-none">
                            {filteredTickers.length === 0 && query !== "" ? (
                              <div className="relative cursor-default select-none py-2 px-4 text-slate-500 dark:text-slate-400">
                                Нажмите Enter, чтобы добавить "{query}"
                              </div>
                            ) : (
                              filteredTickers.map((ticker) => (
                                <Combobox.Option
                                  key={ticker}
                                  className={({ active }) =>
                                    cn(
                                      "relative cursor-pointer select-none py-2.5 px-4 rounded-xl font-medium transition-all flex items-center gap-2",
                                      active ? "bg-amber-50 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400" : "text-slate-700 dark:text-slate-300"
                                    )
                                  }
                                  value={ticker}
                                >
                                  <CryptoLogo ticker={ticker} className="w-4 h-4 shrink-0" />
                                  {ticker}
                                </Combobox.Option>
                              ))
                            )}
                          </Combobox.Options>
                        </Transition>
                      </div>
                    </Combobox>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                      Количество
                    </label>
                    <input
                      required
                      type="text"
                      inputMode="decimal"
                      value={quantityStr}
                      onChange={(e) => handleAmountChange(e.target.value, setQuantityStr, 'quantity')}
                      className="apple-input w-full font-mono text-sm"
                      placeholder="0.00"
                    />
                    <p className="text-[10px] text-slate-500/80 px-1">Количество монет/токенов</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                      Вложено, ₽
                    </label>
                    <input
                      required
                      type="text"
                      inputMode="decimal"
                      value={amountStr}
                      onChange={(e) => handleAmountChange(e.target.value, setAmountStr, 'amount')}
                      className="apple-input w-full font-mono text-sm"
                      placeholder="0"
                    />
                    <p className="text-[10px] text-slate-500/80 px-1">Себестоимость покупки</p>
                  </div>
                  
                  <div className="space-y-2 relative z-20">
                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                      Дата покупки
                    </label>
                    <div className="relative w-full group">
                      <DatePicker
                        selected={formData.purchaseDate ? new Date(formData.purchaseDate) : null}
                        onChange={(date: Date | null) => {
                          if (date) {
                            setFormData(p => ({ ...p, purchaseDate: date.toISOString().split('T')[0] }));
                          } else {
                            setFormData(p => ({ ...p, purchaseDate: undefined }));
                          }
                          setIsPurchaseDateOpen(false);
                        }}
                        onKeyDown={(e) => {
                          handleRawDateInput(e as any);
                          if (e.key === "Enter") {
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
                </div>

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
                    placeholder="Дополнительные детали..."
                  />
                </div>
              </div>

              <div className="flex-none px-5 sm:px-6 pt-5 pb-[calc(env(safe-area-inset-bottom,0px)+16px)] sm:pb-6 flex gap-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3.5 text-sm font-bold text-slate-600 dark:text-slate-300 bg-white/50 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all active:scale-95 border border-slate-200 dark:border-slate-700/50 shadow-sm"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3.5 text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl transition-all shadow-[0_4px_16px_rgba(245,158,11,0.3)] hover:shadow-[0_4px_20px_rgba(245,158,11,0.4)] active:scale-95"
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
