import { logger } from '../../lib/logger';
import React, { useState, Fragment, useRef } from "react";
import { Dialog, Listbox, Combobox, Transition } from "@headlessui/react";
import { BankLogo } from "../deposits/BankLogo";
import { ChartNoAxesCombined, ChevronDown, X, Calendar as CalendarIcon , Save } from "lucide-react";
import { InvestmentAsset, InvestmentAccountType, IISType } from "../../types";
import { db, emitSyncEvent, syncWithFirebase } from "../../config/db";
import { cn, maskDateInput, toISOLocalDate } from "../../lib/utils";
import { auth } from "../../config/firebase";
import { motion, AnimatePresence } from "motion/react";
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { ru } from "date-fns/locale/ru";
import { DropdownPortal } from "../ui/DropdownPortal";

const POPULAR_BROKERS = [
  "ВТБ Мои Инвестиции",
  "СберИнвестиции",
  "Т-Инвестиции",
  "Альфа-Инвестиции",
  "БКС Мир инвестиций",
  "Финам",
  "Газпромбанк Инвестиции"
];

export const getBrokerLogoUrl = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes("втб")) return "/logos/vtb.svg";
  if (n.includes("сбер")) return "/logos/sber.svg";
  if (n.includes("т-инвестиции") || n.includes("тинькоф")) return "/logos/tbank.svg";
  if (n.includes("альфа")) return "/logos/alfa.svg";
  if (n.includes("бкс")) return "/logos/bcs-bank.svg";
  if (n.includes("финам")) return "/logos/finambank.svg";
  if (n.includes("газпром")) return "/logos/gazprom.svg";
  return undefined;
};

registerLocale("ru", ru);

interface InvestmentFormProps {
  onClose: () => void;
  assetToEdit?: InvestmentAsset;
}

export function InvestmentForm({ onClose, assetToEdit }: InvestmentFormProps) {
  const comboboxRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState<Partial<InvestmentAsset>>(
    assetToEdit || {
      name: "",
      type: "brokerage",
      amount: 0,
      currentValue: 0,
      currency: "RUB",
      startDate: new Date(),
      comment: "",
    },
  );

  const [query, setQuery] = useState("");
  const [amountStr, setAmountStr] = useState<string>(
    assetToEdit ? assetToEdit.amount.toString() : "",
  );

  const [currentValueStr, setCurrentValueStr] = useState<string>(
    assetToEdit ? assetToEdit.currentValue.toString() : "",
  );

  const [deductionsStr, setDeductionsStr] = useState<string>(
    assetToEdit && assetToEdit.deductionsReceived !== undefined
      ? assetToEdit.deductionsReceived.toString()
      : "",
  );

  const [isStartDateOpen, setIsStartDateOpen] = useState(false);

  const filteredBrokers = query === "" ? POPULAR_BROKERS : POPULAR_BROKERS.filter(b => b.toLowerCase().includes(query.toLowerCase()));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      alert("Укажите название брокера или счета");
      return;
    }

    try {
      const dataToSave = {
        ...formData,
        userId: auth.currentUser?.uid || "local",
        updatedAt: Date.now()
      } as InvestmentAsset;

      if (assetToEdit && assetToEdit.id) {
        await db.investmentAssets.put({ ...dataToSave, id: assetToEdit.id });
      } else {
        await db.investmentAssets.add(dataToSave);
      }
      emitSyncEvent("syncing");
      syncWithFirebase().catch(logger.error);
      onClose();
    } catch (err) {
      logger.error("Error saving investment asset:", err);
      alert("Ошибка при сохранении");
    }
  };

  const handleAmountChange = (val: string, setter: (val: string) => void, field: keyof InvestmentAsset) => {
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

  return (
    <Dialog as="div" className="relative z-[100]" open={true} onClose={onClose} static>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-y-0 right-0 left-0 md:left-68 bg-slate-900/10 dark:bg-slate-950/80 backdrop-blur-sm"
        aria-hidden="true"
      />
      <div className="fixed inset-y-0 right-0 left-0 md:left-68 flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-none">
        <Dialog.Panel as={Fragment}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 100 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 100 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="w-full max-w-xl pointer-events-auto flex flex-col"
          >
            <motion.div
              layout
              className="bg-white dark:bg-slate-950 rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800/50 flex flex-col h-auto max-h-[90dvh] sm:max-h-[90vh] w-full"
          >
            <div className="px-6 py-5 sm:px-8 sm:py-5 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-4 relative z-10 shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg sm:text-xl font-bold tracking-tight text-slate-950 dark:text-white flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-invest-100 dark:bg-invest-500/20 flex items-center justify-center text-invest-600 dark:text-invest-400 shrink-0">
                      <ChartNoAxesCombined className="w-4 h-4 stroke-[2.5px]" />
                    </div>
                    {assetToEdit ? "Редактировать счет" : "Новый инвестиционный счет"}
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 text-[10px] sm:text-xs font-medium mt-1">Информация о брокере и активах</p>
                </div>
                <button type="button" onClick={onClose} className="p-2 hover:bg-slate-50 dark:hover:bg-white/5 rounded-full transition-all active:scale-90 cursor-pointer -mt-4 -mr-2 sm:-mr-4 relative z-20">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              {/* Account Type Toggle in Header */}
              <div className="flex bg-slate-100/80 dark:bg-slate-900/80 p-1 rounded-[14px] w-full border border-slate-200/50 dark:border-white/[0.02] shadow-inner relative">
                <button
                  type="button"
                  className={cn(
                    "flex-1 relative flex items-center justify-center text-[10px] xl:text-xs uppercase tracking-widest font-bold h-7 sm:h-8 rounded-[10px] transition-all z-20 outline-none leading-none text-center",
                    formData.type === "brokerage"
                      ? "text-invest-600 dark:text-invest-400"
                      : "text-slate-500 hover:text-slate-950 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/5"
                  )}
                  onClick={() => setFormData(p => ({ ...p, type: "brokerage", iisType: undefined }))}
                >
                  <span className="relative z-20">Брокерский счет</span>
                  {formData.type === "brokerage" && (
                     <motion.div 
                       layoutId="invTypeSelect_header"
                       className="absolute inset-0 bg-white dark:bg-invest-500/10 rounded-[10px] z-10 shadow-sm ring-1 ring-black/5 dark:ring-invest-400/30"
                       transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                     />
                  )}
                </button>
                <button
                  type="button"
                  className={cn(
                    "flex-1 relative flex items-center justify-center text-[10px] xl:text-xs uppercase tracking-widest font-bold h-7 sm:h-8 rounded-[10px] transition-all z-20 outline-none leading-none text-center",
                    formData.type === "iis"
                      ? "text-invest-600 dark:text-invest-400"
                      : "text-slate-500 hover:text-slate-950 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/5"
                  )}
                  onClick={() => setFormData(p => ({ ...p, type: "iis", iisType: "3" }))}
                >
                  <span className="relative z-20">ИИС</span>
                  {formData.type === "iis" && (
                     <motion.div 
                       layoutId="invTypeSelect_header"
                       className="absolute inset-0 bg-white dark:bg-invest-500/10 rounded-[10px] z-10 shadow-sm ring-1 ring-black/5 dark:ring-invest-400/30"
                       transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                     />
                  )}
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col shrink min-h-0 relative">
              <div className="shrink min-h-0 overflow-y-auto custom-scrollbar [scrollbar-gutter:stable] relative">
                <div className="relative w-full flex flex-col flex-shrink-0">
                <AnimatePresence mode="wait">
                  <motion.div 
                    key={formData.type}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="p-6 sm:p-8 flex flex-col gap-6"
                  >
                    {formData.type === "iis" && (
                      <div className="space-y-2 pb-1">
                        <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest block">
                          Тип ИИС
                        </label>
                        <div className="flex bg-slate-100/80 dark:bg-slate-900/80 p-1 rounded-xl w-full border border-slate-200/50 dark:border-slate-800/50 relative h-full">
                          {[ 
                            { id: '3', label: 'Тип 3', desc: 'Оба вычета' },
                            { id: 'A', label: 'Тип А', desc: 'На взнос' },
                            { id: 'B', label: 'Тип Б', desc: 'На доход' },
                          ].map((t) => {
                            const isActive = formData.iisType === t.id;
                            return (
                              <button
                                key={t.id}
                                type="button"
                                onClick={() => setFormData(p => ({ ...p, iisType: t.id as IISType }))}
                                className={cn(
                                  "relative flex-1 flex flex-col items-center justify-center p-2 rounded-lg transition-colors duration-200 z-20 outline-none leading-none text-center",
                                  isActive
                                    ? "text-invest-600 dark:text-invest-400"
                                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                                )}
                              >
                                <span className="relative z-20 font-bold text-[10px] sm:text-[11px] uppercase tracking-wider mb-1 mt-0.5">{t.label}</span>
                                <span className={cn("relative z-20 text-[8px] sm:text-[9px] font-medium leading-none mb-0.5", isActive ? "text-invest-500/80 dark:text-invest-400/80" : "text-slate-400")}>{t.desc}</span>
                                {isActive && (
                                  <motion.div 
                                    layoutId={`iisTypeSelect_${formData.type}`}
                                    className="absolute inset-0 bg-white dark:bg-invest-500/10 rounded-[10px] z-10 shadow-sm ring-1 ring-black/5 dark:ring-invest-400/30"
                                    transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                                  />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2 relative z-30">
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                    Брокер / Название
                  </label>
                  <Combobox
                    value={formData.name || ""}
                    onChange={(val) => setFormData((prev) => ({ ...prev, name: val || undefined }))}
                  >
                    <div ref={comboboxRef} className="relative">
                      <div className="relative w-full cursor-default overflow-hidden bg-transparent text-left focus:outline-none">
                        <Combobox.Input
                          required
                          className="apple-input w-full pr-10"
                          placeholder="ВТБ, Сбер, Т-Банк..."
                          onChange={(event) => {
                            setQuery(event.target.value);
                            setFormData((prev) => ({ ...prev, name: event.target.value }));
                          }}
                        />
                        <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-3">
                          <ChevronDown className="h-4 w-4 text-slate-400" aria-hidden="true" />
                        </Combobox.Button>
                      </div>
                      <DropdownPortal targetRef={comboboxRef} matchWidth>
                      <Transition
                        as={Fragment}
                        leave="transition ease-in duration-100"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                        afterLeave={() => setQuery("")}
                      >
                        <Combobox.Options className="max-h-60 w-full overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl p-1.5 flex flex-col gap-0.5 text-sm shadow-[0_16px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.5)] border border-slate-200/60 dark:border-white/[0.08] focus:outline-none">
                          {filteredBrokers.length === 0 && query !== "" ? (
                            <div className="relative cursor-default select-none py-2 px-4 text-slate-500 dark:text-slate-400">
                              Нажмите Enter, чтобы добавить "{query}"
                            </div>
                          ) : (
                            filteredBrokers.map((broker) => (
                              <Combobox.Option
                                key={broker}
                                className={({ active }) =>
                                  cn(
                                    "relative cursor-pointer select-none py-2.5 px-4 rounded-xl font-medium transition-all",
                                    active ? "bg-invest-50 dark:bg-invest-500/20 text-invest-600 dark:text-invest-400" : "text-slate-700 dark:text-slate-300"
                                  )
                                }
                                value={broker}
                              >
                                <div className="flex items-center gap-3">
                                  {getBrokerLogoUrl(broker) && (
                                    <div className="w-7 h-7 rounded-lg border border-slate-200/50 dark:border-slate-700/50 flex items-center justify-center shrink-0 overflow-hidden bg-white dark:bg-slate-800/80 p-1">
                                      <BankLogo logoUrl={getBrokerLogoUrl(broker)} className="w-[85%] h-[85%] object-contain" />
                                    </div>
                                  )}
                                  <span>{broker}</span>
                                </div>
                              </Combobox.Option>
                            ))
                          )}
                        </Combobox.Options>
                      </Transition>
                      </DropdownPortal>
                    </div>
                  </Combobox>
                </div>

                <div className="space-y-2 relative z-20">
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                    Дата открытия
                  </label>
                  <div className="relative w-full group">
                    <DatePicker
                      selected={formData.startDate ? (isNaN(new Date(formData.startDate).getTime()) ? null : new Date(formData.startDate)) : null}
                      onChange={(date: Date | null) => {
                        if (date) {
                          setFormData(p => ({ ...p, startDate: date }));
                          setIsStartDateOpen(false);
                        } else {
                          setFormData(p => ({ ...p, startDate: null }));
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
                          setIsStartDateOpen(false);
                        }
                      }}
                      onClickOutside={(e) => {
                        const target = e.target as HTMLElement;
                        if (target.closest(".datepicker-toggle-btn-start")) {
                          return;
                        }
                        setIsStartDateOpen(false);
                      }}
                      open={isStartDateOpen}
                      preventOpenOnFocus={true}
                      locale="ru"
                      dateFormat="dd.MM.yyyy"
                      className="apple-input w-full pr-12 cursor-text"
                      placeholderText="Выберите дату"
                      wrapperClassName="w-full"
                      portalId="datepicker-portal-container"
                    />
                    <button
                      type="button"
                      onClick={() => setIsStartDateOpen(!isStartDateOpen)}
                      className="datepicker-toggle-btn-start absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-invest-500 transition-colors rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 active:scale-90 cursor-pointer z-20 flex items-center justify-center"
                      title="Выбрать дату"
                    >
                      <CalendarIcon className="w-4 h-4 stroke-[1.5px]" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-col">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-10">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                      Сумма пополнений
                    </label>
                  <input
                    required
                    type="text"
                    inputMode="decimal"
                    value={amountStr}
                    onChange={(e) => handleAmountChange(e.target.value, setAmountStr, 'amount')}
                    className="apple-input w-full tabular-nums text-sm"
                    placeholder="0"
                  />
                  <p className="text-[10px] text-slate-500/80 px-1">Сколько всего заведено денег</p>
                </div>
                
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                    Текущая стоимость
                  </label>
                  <Listbox
                    value={formData.currency || "RUB"}
                    onChange={(val) =>
                      setFormData((prev) => ({ ...prev, currency: val }))
                    }
                  >
                  {({ open }) => (
                  <div className={cn("relative", open ? "z-[60]" : "z-30")}>
                    <input
                      required
                      type="text"
                      inputMode="decimal"
                      value={currentValueStr}
                      onChange={(e) => handleAmountChange(e.target.value, setCurrentValueStr, 'currentValue')}
                      className="apple-input w-full tabular-nums text-sm pr-20"
                      placeholder="0"
                    />
                    <div className="absolute inset-y-1.5 right-1.5">
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
                                          ? "bg-invest-50 dark:bg-invest-500/20 text-invest-600 dark:text-invest-400"
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
                                              ? "text-invest-500"
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
                    </div>
                  </div>
                  )}
                  </Listbox>
                  <p className="text-[10px] text-slate-500/80 px-1">Фактическая оценка портфеля</p>
                </div>
                
                <div 
                  className={cn(
                    "grid transition-[grid-template-rows,opacity,margin] duration-300 ease-out",
                    (formData.type === 'iis' && (formData.iisType === 'A' || formData.iisType === '3')) ? "grid-rows-[1fr] opacity-100 mt-4 pointer-events-auto" : "grid-rows-[0fr] opacity-0 mt-0 pointer-events-none"
                  )}
                >
                  <div className="overflow-hidden">
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                        Получено вычетов (НДФЛ возврат)
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={deductionsStr}
                        onChange={(e) => handleAmountChange(e.target.value, setDeductionsStr, 'deductionsReceived')}
                        className="apple-input w-full tabular-nums text-sm"
                        placeholder="0"
                      />
                      <p className="text-[10px] text-slate-500 px-1">
                        Сумма уже возвращенного налога на взнос (тип А).
                      </p>
                    </div>
                  </div>
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
                  </motion.div>
                </AnimatePresence>
              </div>
              </div>

            <div className="shrink-0 px-5 sm:px-6 pt-5 pb-[calc(env(safe-area-inset-bottom,0px)+20px)] sm:pb-6 flex gap-3 sm:gap-2 sm:flex-row justify-end border-t border-slate-200/50 dark:border-slate-800/50 bg-slate-50/90 dark:bg-slate-950/90 backdrop-blur-xl z-20">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-none sm:w-auto py-3.5 sm:py-2 sm:px-5 text-sm sm:text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300 sm:text-slate-500 sm:dark:text-slate-400 bg-white/50 dark:bg-slate-800/80 sm:bg-transparent sm:dark:bg-transparent hover:bg-white dark:hover:bg-slate-700 sm:hover:bg-slate-200/50 sm:dark:hover:bg-slate-800 rounded-xl transition-all active:scale-95 border border-slate-200 dark:border-slate-700/50 sm:border-transparent sm:dark:border-transparent shadow-sm sm:shadow-none"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="flex-1 sm:flex-none sm:w-auto py-3.5 sm:py-2 sm:px-6 flex items-center justify-center gap-2 text-sm sm:text-xs font-bold uppercase tracking-wide text-white bg-invest-500 hover:bg-invest-600 sm:hover:scale-[1.02] rounded-xl transition-all shadow-[0_4px_16px_rgba(6,182,212,0.3)] hover:shadow-[0_4px_20px_rgba(6,182,212,0.4)] active:scale-95"
              >
                <Save className="w-4 h-4 sm:w-5 sm:h-5 stroke-[1.5px]" />
                Сохранить
              </button>
            </div>
            </form>
            {/* Embedded datepicker portal container so clicking dates doesn't close Headless UI Dialog */}
            <div
              id="datepicker-portal-container"
              className="absolute inset-0 pointer-events-none z-[120] [&>div]:pointer-events-auto"
            />
          </motion.div>
          </motion.div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
