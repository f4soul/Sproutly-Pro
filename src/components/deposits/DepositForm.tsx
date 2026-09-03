import React, { useState, useEffect, Fragment, useMemo, useRef } from "react";
import {
  X,
  Save,
  Calendar,
  Landmark,
  Percent,
  Wallet,
  HandCoins,
  Coins,
  Info,
  ChevronDown,
  Trash2,
  Settings,
  TrendingUp,
} from "lucide-react";
import { Listbox, Transition, Combobox, Dialog } from "@headlessui/react";
import DatePicker, { registerLocale } from "react-datepicker";
import { ru } from "date-fns/locale";
import "react-datepicker/dist/react-datepicker.css";
import { motion, AnimatePresence } from "motion/react";
import { Deposit, CalculationFormula, Bank } from "../../types";

import { BankIconEditor } from "./BankIconEditor";
import { db, syncWithFirebase } from "../../config/db";
import { cn } from "../../lib/utils";
import { addDays, differenceInDays } from "date-fns";
import { auth } from "../../config/firebase";
import {
  getAllBanks,
  DEFAULT_BANK_ICON,
  syncCustomBanksCache,
} from "../../lib/banks";
import { calculateIncome } from "../../lib/depositCalculations";
import { BankLogo } from "./BankLogo";

import { DepositFormBankPicker } from "./DepositFormBankPicker";
import { DepositFormFormulaSelect } from "./DepositFormFormulaSelect";
import { DepositFormDateFields } from "./DepositFormDateFields";

registerLocale("ru", ru);

interface DepositFormProps {
  deposit?: Deposit;
  onClose: () => void;
}

export function DepositForm({ deposit, onClose }: DepositFormProps) {
  // Scroll locking handled by Dialog natively

  const [duration, setDuration] = useState<number | "">("");
  const [banks, setBanks] = useState<Bank[]>([]);
  const [query, setQuery] = useState("");
  const [showBankEditor, setShowBankEditor] = useState(false);
  const [newBank, setNewBank] = useState<Partial<Bank>>({
    name: "",
    color: "#0d9488",
    logoText: "",
    logoUrl: DEFAULT_BANK_ICON,
    iconScale: 1,
    iconOffsetX: 0,
    iconOffsetY: 0,
    isCustom: true,
  });

  const [formData, setFormData] = useState<Partial<Deposit>>({
    bank: "",
    startDate: new Date(),
    endDate: null,
    amount: 0,
    currency: "RUB",
    rate: 0,
    formula: "simple_days",
    sourceNote: "",
    comment: "",
    isClosed: false,
    isArchived: 0,
    splitIncome: false,
  });

  const [hasDraft, setHasDraft] = useState(false);
  const isMountedRef = useRef(false);
  const bankInputRef = useRef<HTMLInputElement>(null);

  const [bankInputMode, setBankInputMode] = useState<"text" | "none">("text");

  // String state variants to allow natural typing with dots, commas, leading zeros (e.g. "0.1", "0,1")
  const [amountStr, setAmountStr] = useState<string>("");
  const [rateStr, setRateStr] = useState<string>("");
  const [durationStr, setDurationStr] = useState<string>("");
  const [factIncomeStr, setFactIncomeStr] = useState<string>("");
  const [exchangeRateOnOpenStr, setExchangeRateOnOpenStr] =
    useState<string>("");

  // Synchronize string states on initial load, draft restore, or external changes
  useEffect(() => {
    if (formData.amount !== undefined) {
      const parsedAmount = Number(amountStr) || 0;
      if (parsedAmount !== formData.amount) {
        setAmountStr(formData.amount === 0 ? "" : String(formData.amount));
      }
    }
  }, [formData.amount]);

  useEffect(() => {
    if (formData.rate !== undefined) {
      const parsedRate = Number(rateStr) || 0;
      if (parsedRate !== formData.rate) {
        setRateStr(formData.rate === 0 ? "" : String(formData.rate));
      }
    }
  }, [formData.rate]);

  useEffect(() => {
    if (duration !== undefined) {
      const parsedDuration = Number(durationStr) || 0;
      if (parsedDuration !== (duration === "" ? 0 : duration)) {
        setDurationStr(duration === "" ? "" : String(duration));
      }
    }
  }, [duration]);

  useEffect(() => {
    if (formData.factIncome !== undefined && formData.factIncome !== null) {
      const parsedFact = Number(factIncomeStr) || 0;
      if (parsedFact !== formData.factIncome) {
        setFactIncomeStr(String(formData.factIncome));
      }
    } else {
      setFactIncomeStr("");
    }
  }, [formData.factIncome]);

  useEffect(() => {
    if (
      formData.exchangeRateOnOpen !== undefined &&
      formData.exchangeRateOnOpen !== null
    ) {
      const parsedRate = Number(exchangeRateOnOpenStr.replace(",", ".")) || 0;
      if (parsedRate !== formData.exchangeRateOnOpen) {
        setExchangeRateOnOpenStr(String(formData.exchangeRateOnOpen));
      }
    } else {
      setExchangeRateOnOpenStr("");
    }
  }, [formData.exchangeRateOnOpen]);

  // Check for draft on mount
  useEffect(() => {
    isMountedRef.current = true;
    if (!deposit) {
      const stored = localStorage.getItem("new_deposit_draft");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (
            parsed.formData &&
            (parsed.formData.amount > 0 ||
              parsed.formData.bank ||
              parsed.formData.sourceNote ||
              parsed.formData.comment ||
              parsed.formData.rate > 0)
          ) {
            setHasDraft(true);
          }
        } catch {
          // Ignore
        }
      }
    }
    return () => {
      isMountedRef.current = false;
    };
  }, [deposit]);

  // Save draft on changes (only for new deposits)
  useEffect(() => {
    if (!deposit && !hasDraft && isMountedRef.current) {
      const isInitialBlank =
        !formData.bank &&
        (formData.amount === 0 || !formData.amount) &&
        (formData.rate === 0 || !formData.rate) &&
        !formData.sourceNote &&
        !formData.comment &&
        formData.formula === "simple_days";

      if (!isInitialBlank) {
        const draftData = {
          formData: {
            ...formData,
            startDate: formData.startDate ? formData.startDate.getTime() : null,
            endDate: formData.endDate ? formData.endDate.getTime() : null,
          },
          duration,
        };
        localStorage.setItem("new_deposit_draft", JSON.stringify(draftData));
      } else {
        localStorage.removeItem("new_deposit_draft");
      }
    }
  }, [formData, duration, deposit, hasDraft]);

  useEffect(() => {
    const loadBanks = async () => {
      const allBanks = await getAllBanks();
      setBanks(allBanks);
    };
    loadBanks();
  }, []);

  useEffect(() => {
    if (deposit) {
      const startDate = deposit.startDate
        ? new Date(deposit.startDate)
        : new Date();
      const endDate = deposit.endDate ? new Date(deposit.endDate) : null;

       
      setFormData({
        ...deposit,
        startDate: isNaN(startDate.getTime()) ? new Date() : startDate,
        endDate: endDate && !isNaN(endDate.getTime()) ? endDate : null,
      });
      if (
        deposit.endDate &&
        !isNaN(startDate.getTime()) &&
        endDate &&
        !isNaN(endDate.getTime())
      ) {
        setDuration(differenceInDays(endDate, startDate));
      }
    }
  }, [deposit]);

  const filteredBanks = useMemo(() => {
    return query === ""
      ? banks
      : banks.filter((bank) =>
          (bank.name || "")
            .toLowerCase()
            .replace(/\s+/g, "")
            .includes(query.toLowerCase().replace(/\s+/g, "")),
        );
  }, [banks, query]);

  const handleSaveNewBank = async () => {
    if (!newBank.name) return;
    const user = auth.currentUser;
    const bankToSave = {
      ...newBank,
      isCustom: true,
      userId: user?.uid,
      logoText: newBank.name.charAt(0).toUpperCase(),
      updatedAt: Date.now(),
    } as Bank;

    // Dexie will auto-generate id since banks table uses ++id or preserve existing
    const id = await db.banks.put(bankToSave);
    const savedBank = { ...bankToSave, id };

    // Sync synchronous RAM cache immediately
    await syncCustomBanksCache();

    if (newBank.id) {
      setBanks((prev) =>
        prev.map((b) => (b.id === newBank.id ? savedBank : b)),
      );
    } else {
      setBanks((prev) => [...prev, savedBank]);
    }

    setFormData((prev) => ({ ...prev, bank: savedBank.name }));
    setShowBankEditor(false);

    // Sync with Firebase in background
    syncWithFirebase().catch(console.error);
  };

  const handleEditBank = (e: React.MouseEvent, bank: Bank) => {
    e.preventDefault();
    e.stopPropagation();
    setNewBank(bank);
    setShowBankEditor(true);
  };

  const [bankToDelete, setBankToDelete] = useState<string | number | null>(
    null,
  );
  const cancelDeleteBankRef = useRef<HTMLButtonElement>(null);

  const confirmDeleteBank = async () => {
    if (!bankToDelete) return;
    await db.banks.delete(bankToDelete);
    await syncCustomBanksCache(); // Sync RAM cache
    setBanks((prev) => prev.filter((b) => b.id !== bankToDelete));
    const deletedBank = banks.find((b) => b.id === bankToDelete);
    if (formData.bank === deletedBank?.name) {
      setFormData((prev) => ({ ...prev, bank: "" }));
    }
    const user = auth.currentUser;
    if (user) {
      const firestoreDocId =
        typeof bankToDelete === "number"
          ? `${user.uid}_${bankToDelete}`
          : String(bankToDelete);
      await db.deletedQueue.put({
        collection: "banks",
        docId: firestoreDocId,
        timestamp: Date.now(),
      });
    }
    setBankToDelete(null);

    // Sync deletion with Firebase in background
    syncWithFirebase().catch(console.error);
  };

  const handleDeleteBank = (e: React.MouseEvent, bankId: string | number) => {
    e.preventDefault();
    e.stopPropagation();
    setBankToDelete(bankId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = auth.currentUser;
    const dataToSave = {
      ...formData,
      userId: user?.uid || undefined,
      updatedAt: Date.now(),
      bank: formData.bank || "Неизвестный банк",
      startDate: formData.startDate || new Date(),
      amount: Number(formData.amount) || 0,
      rate: Number(formData.rate) || 0,
    } as Deposit;

    if (deposit?.id) {
      if (
        dataToSave.formula === 'daily_balance' && 
        (deposit.amount !== dataToSave.amount || deposit.rate !== dataToSave.rate)
      ) {
        // "Bank style" math: snapshot the accrued income up to today, freeze it,
        // and start calculating new income from today for the new balance/rate.
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const oldEndDate = deposit.endDate ? new Date(deposit.endDate) : new Date();
        oldEndDate.setHours(0, 0, 0, 0);

        // Only snap if today is before maturation, otherwise the full income is already earned
        if (today < oldEndDate && Number(dataToSave.amount) > 0) {
          // Calculate income earned *exactly* up to today using the old parameters
          const originalIncomeUpToToday = calculateIncome({
            ...deposit,
            endDate: today,
            factIncome: undefined
          });

          dataToSave.historicalIncome = originalIncomeUpToToday;
          dataToSave.lastAmountUpdate = today.getTime();
        }
      }

      await db.deposits.put({ ...dataToSave, id: deposit.id });
    } else {
      const newId =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : Math.random().toString(36).substr(2, 9) + Date.now();
      await db.deposits.put({ ...dataToSave, id: newId });
      localStorage.removeItem("new_deposit_draft");
    }
    syncWithFirebase().catch(console.error);
    onClose();
  };

  return (
    <Dialog
      as="div"
      className="relative z-[100]"
      open={true}
      onClose={onClose}
      static
    >
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
            <div className="px-6 py-5 sm:px-8 sm:py-6 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-3 shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg sm:text-xl font-bold tracking-tight text-slate-950 dark:text-white flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-deposit-100 dark:bg-deposit-500/20 flex items-center justify-center text-deposit-600 dark:text-deposit-400 shrink-0">
                      <Landmark className="w-4 h-4 stroke-[2.5px]" />
                    </div>
                    {deposit ? "Редактировать вклад" : "Новый вклад"}
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 text-[10px] sm:text-xs font-medium mt-1">
                    Заполните данные для точного расчета налога
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 hover:bg-slate-50 dark:hover:bg-white/5 rounded-full transition-all active:scale-90 cursor-pointer -mt-2 -mr-2 sm:-mr-2"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              className="flex flex-col shrink min-h-0 relative"
            >
              <div className="shrink min-h-0 overflow-y-auto custom-scrollbar [scrollbar-gutter:stable] relative">
                <div className="p-4 sm:p-5 flex flex-col gap-4 flex-shrink-0">
              <AnimatePresence>
                {hasDraft && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, scale: 0.98 }}
                    animate={{ opacity: 1, height: "auto", scale: 1 }}
                    exit={{ opacity: 0, height: 0, scale: 0.98 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="bg-amber-50/75 dark:bg-amber-500/10 border border-amber-200/50 dark:border-amber-500/20 rounded-2xl p-4 flex items-start sm:items-center justify-between gap-3 text-xs text-amber-800 dark:text-amber-300">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-bold uppercase tracking-wider text-[9px] text-amber-600 dark:text-amber-400">
                          Незавершенный черновик
                        </span>
                        <span>
                          У вас остался незаполненный ранее вклад. Продолжить с того
                          же места?
                        </span>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            try {
                              const stored =
                                localStorage.getItem("new_deposit_draft");
                              if (stored) {
                                const parsed = JSON.parse(stored);
                                setFormData({
                                  ...parsed.formData,
                                  startDate: parsed.formData.startDate
                                    ? new Date(parsed.formData.startDate)
                                    : new Date(),
                                  endDate: parsed.formData.endDate
                                    ? new Date(parsed.formData.endDate)
                                    : null,
                                });
                                setDuration(parsed.duration || "");
                              }
                            } catch (e) {
                              console.error("Failed to restore draft:", e);
                            }
                            setHasDraft(false);
                          }}
                          className="px-2.5 py-1.5 bg-deposit-600 hover:bg-deposit-700 active:scale-95 text-white font-bold rounded-xl transition-all cursor-pointer shadow-sm text-[10px] uppercase tracking-wider"
                        >
                          Да
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            localStorage.removeItem("new_deposit_draft");
                            setHasDraft(false);
                          }}
                          className="px-2.5 py-1.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 active:scale-95 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition-all cursor-pointer text-[10px] uppercase tracking-wider"
                        >
                          Сбросить
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>



              <div className="flex flex-wrap gap-2 w-full">
                <ToggleChip
                  label="Накопительный"
                  icon={<Coins className="w-3 h-3 stroke-[1.5px]" />}
                  checked={
                    formData.formula === "daily_balance" ||
                    formData.formula === "min_balance"
                  }
                  onChange={(val) => {
                    if (val) {
                      setFormData({
                        ...formData,
                        formula: "daily_balance",
                        endDate: null,
                      });
                      setDuration("");
                    } else {
                      setFormData({ ...formData, formula: "simple_months" });
                    }
                  }}
                />
                <ToggleChip
                  label="Разбивать доход"
                  icon={<Calendar className="w-3 h-3 stroke-[1.5px]" />}
                  checked={!!formData.splitIncome}
                  onChange={(val) =>
                    setFormData({ ...formData, splitIncome: val })
                  }
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <DepositFormBankPicker
                  formData={formData}
                  setFormData={setFormData}
                  query={query}
                  setQuery={setQuery}
                  bankInputMode={bankInputMode}
                  setBankInputMode={setBankInputMode}
                  bankInputRef={bankInputRef}
                  filteredBanks={filteredBanks}
                  setNewBank={setNewBank}
                  setShowBankEditor={setShowBankEditor}
                  handleEditBank={handleEditBank}
                  handleDeleteBank={handleDeleteBank}
                />

                <Listbox
                  value={formData.currency || "RUB"}
                  onChange={(val) =>
                    setFormData((prev) => ({ ...prev, currency: val }))
                  }
                >
                {({ open }) => (
                <div className={cn("space-y-2 relative", open ? "z-[60]" : "z-30")}>
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Wallet className="w-3.5 h-3.5 text-deposit-500 stroke-[1.5px]" />{" "}
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
                        // Allow only digits, single dot or comma and decimals
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
                      className="apple-input w-full tabular-nums text-sm pr-16"
                      placeholder="0.00"
                    />
                    <div className="absolute inset-y-1 right-1">
                          <div className="relative h-full text-slate-950 dark:text-white">
                            <Listbox.Button className="relative min-w-[54px] h-full flex items-center justify-center gap-1 px-2 rounded-xl bg-slate-100/50 dark:bg-slate-800/80 border border-slate-200/50 dark:border-white/5 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 backdrop-blur-sm cursor-pointer transition-all focus:outline-none">
                              <span className="font-bold text-xs sm:text-sm text-slate-700 dark:text-slate-300 flex items-center justify-center w-4 text-center">
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
                            <Transition
                              as={Fragment}
                              leave="transition ease-in duration-100"
                              leaveFrom="opacity-100"
                              leaveTo="opacity-0"
                            >
                              <Listbox.Options className="absolute right-0 mt-2 w-28 max-h-60 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl p-1.5 flex flex-col gap-0.5 text-sm shadow-2xl z-[110] border border-slate-200/60 dark:border-white/[0.08] focus:outline-none">
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
                                        "flex items-center gap-2.5 py-2.5 px-3 rounded-xl font-bold transition-all duration-200 cursor-pointer",
                                        active || selected
                                          ? "bg-deposit-50 dark:bg-deposit-500/20 text-deposit-600 dark:text-deposit-400"
                                          : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50",
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
                            </Transition>
                          </div>
                    </div>
                  </div>
                </div>
                )}
                </Listbox>

                {formData.currency && formData.currency !== "RUB" && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <TrendingUp className="w-3.5 h-3.5 text-deposit-500 stroke-[1.5px]" />{" "}
                      Курс ЦБ на дату открытия (₽)
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={exchangeRateOnOpenStr}
                      onChange={(e) => {
                        const typed = e.target.value;
                        const normalized = typed.replace(",", ".");
                        if (
                          /^[0-9]*[.]?[0-9]*$/.test(normalized) ||
                          typed === ""
                        ) {
                          setExchangeRateOnOpenStr(typed);
                          const parsed =
                            typed === "" ? undefined : Number(normalized);
                          if (parsed === undefined || !isNaN(parsed)) {
                            setFormData((prev) => ({
                              ...prev,
                              exchangeRateOnOpen: parsed,
                            }));
                          }
                        }
                      }}
                      className="apple-input w-full tabular-nums text-sm"
                      placeholder="95.50"
                    />
                    <p className="text-[10px] text-slate-500 px-1">
                      Зафиксируйте курс, чтобы в будущем сравнивать его с
                      текущим.
                    </p>
                  </div>
                )}

                {showBankEditor && (
                  <div className="md:col-span-2 mt-2 p-5 sm:p-6 lg:p-8 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-[2rem] border border-slate-200/60 dark:border-white/[0.08] animate-in slide-in-from-top-2 duration-300 shadow-sm relative">
                    <div className="relative flex items-center justify-between mb-6">
                      <h4 className="text-[11px] sm:text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-deposit-500/10 dark:bg-deposit-500/20 flex items-center justify-center text-deposit-600 dark:text-deposit-400">
                          <Settings className="w-3.5 h-3.5 stroke-[2.5px]" />
                        </div>
                        Настройка банка
                      </h4>
                      <button
                        type="button"
                        onClick={() => setShowBankEditor(false)}
                        className="text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors cursor-pointer p-2 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-full"
                      >
                        <X size={18} strokeWidth={2.5} />
                      </button>
                    </div>
                    <div className="relative flex flex-col gap-6">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-2 sm:col-span-2">
                          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                            Название банка
                          </label>
                          <input
                            type="text"
                            value={newBank.name}
                            onChange={(e) =>
                              setNewBank({ ...newBank, name: e.target.value })
                            }
                            placeholder="Напр. Тинькофф, Сбербанк..."
                            className="apple-input w-full shadow-inner bg-white/50 dark:bg-slate-950/50"
                          />
                        </div>
                        <div className="flex items-end">
                          <button
                            type="button"
                            onClick={handleSaveNewBank}
                            disabled={!newBank.name}
                            className="apple-button w-full h-[46px] flex items-center justify-center bg-deposit-500 hover:bg-deposit-600 border border-deposit-400/50 dark:border-deposit-500/30 text-white shadow-[0_4px_16px_rgba(20,184,166,0.3)] hover:shadow-[0_4px_20px_rgba(20,184,166,0.4)] disabled:opacity-50 disabled:cursor-not-allowed text-sm font-bold uppercase tracking-wide active:scale-95 transition-all"
                          >
                            Сохранить
                          </button>
                        </div>
                      </div>
                      <div className="w-full">
                        <BankIconEditor
                          bank={newBank}
                          onChange={(updates) =>
                            setNewBank((prev) => ({ ...prev, ...updates }))
                          }
                        />
                      </div>
                    </div>
                  </div>
                )}

                <DepositFormDateFields
                  formData={formData}
                  setFormData={setFormData}
                  durationStr={durationStr}
                  setDurationStr={setDurationStr}
                  duration={duration}
                  setDuration={setDuration}
                />

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Percent className="w-3.5 h-3.5 text-deposit-500 stroke-[1.5px]" />{" "}
                    Ставка (%)
                  </label>
                  <input
                    required
                    type="text"
                    inputMode="decimal"
                    value={rateStr}
                    onChange={(e) => {
                      const val = e.target.value.replace(",", ".");
                      if (/^[0-9]*[.,]?[0-9]*$/.test(val) || val === "") {
                        setRateStr(val);
                        const parsed = val === "" ? 0 : Number(val);
                        if (!isNaN(parsed)) {
                          setFormData((prev) => ({ ...prev, rate: parsed }));
                        }
                      }
                    }}
                    className="apple-input w-full tabular-nums text-sm"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <DepositFormFormulaSelect
                  formData={formData}
                  setFormData={setFormData}
                  setDuration={setDuration}
                />

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Info className="w-3.5 h-3.5 text-deposit-500 stroke-[1.5px]" />{" "}
                    Примечание
                  </label>
                  <input
                    type="text"
                    value={formData.sourceNote}
                    onChange={(e) =>
                      setFormData({ ...formData, sourceNote: e.target.value })
                    }
                    className="apple-input w-full"
                    placeholder="На отпуск, Резерв..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <HandCoins className="w-3.5 h-3.5 text-deposit-500 stroke-[1.5px]" />{" "}
                    Факт. доход (₽)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={factIncomeStr}
                    onChange={(e) => {
                      const val = e.target.value.replace(",", ".");
                      if (/^[0-9]*[.,]?[0-9]*$/.test(val) || val === "") {
                        setFactIncomeStr(val);
                        setFormData((prev) => ({
                          ...prev,
                          factIncome: val === "" ? undefined : Number(val),
                        }));
                      }
                    }}
                    className="apple-input w-full tabular-nums text-sm"
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Info className="w-3.5 h-3.5 text-deposit-500 stroke-[1.5px]" />{" "}
                    Комментарий
                  </label>
                  <textarea
                    value={formData.comment}
                    onChange={(e) =>
                      setFormData({ ...formData, comment: e.target.value })
                    }
                    className="apple-input w-full min-h-[80px] max-h-[160px] resize-none overflow-y-auto custom-scrollbar"
                    placeholder="Дополнительные детали..."
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="shrink-0 px-5 sm:px-6 pt-5 pb-[calc(env(safe-area-inset-bottom,0px)+16px)] sm:pb-6 flex gap-3 sm:gap-2 sm:flex-row justify-end border-t border-slate-200/50 dark:border-slate-800/50 bg-slate-50/90 dark:bg-slate-950/90 backdrop-blur-xl z-20">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-none sm:w-auto py-3.5 sm:py-2 sm:px-5 text-sm sm:text-xs font-bold text-slate-600 dark:text-slate-300 sm:text-slate-500 sm:dark:text-slate-400 bg-white/50 dark:bg-slate-800/80 sm:bg-transparent sm:dark:bg-transparent hover:bg-white dark:hover:bg-slate-700 sm:hover:bg-slate-200/50 sm:dark:hover:bg-slate-800 rounded-xl transition-all active:scale-95 border border-slate-200 dark:border-slate-700/50 sm:border-transparent sm:dark:border-transparent shadow-sm sm:shadow-none uppercase tracking-wide"
              >
                Отмена
              </button>
              <button
                onClick={handleSubmit}
                disabled={
                  !formData.bank ||
                  !formData.amount ||
                  !formData.rate ||
                  !formData.startDate
                }
                className="flex-1 sm:flex-none sm:w-auto py-3.5 sm:py-2 sm:px-6 flex items-center justify-center gap-2 text-sm sm:text-xs font-bold text-white bg-deposit-500 hover:bg-deposit-600 sm:hover:scale-[1.02] rounded-xl transition-all shadow-[0_4px_16px_rgba(20,184,166,0.3)] hover:shadow-[0_4px_20px_rgba(20,184,166,0.4)] active:scale-95 uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:active:scale-100 disabled:hover:scale-100"
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

      {/* Delete Bank Confirmation Modal */}
      <AnimatePresence>
        {bankToDelete && (
          <Dialog
            as="div"
            className="relative z-[150]"
            open={true}
            onClose={() => setBankToDelete(null)}
            initialFocus={cancelDeleteBankRef}
            static
          >
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
                  className="bg-white dark:bg-slate-950 w-full max-w-sm rounded-t-[32px] sm:rounded-[32px] shadow-2xl border border-slate-200 dark:border-slate-800/50 flex flex-col pointer-events-auto px-6 pt-6 pb-[calc(env(safe-area-inset-bottom,0px)+24px)] sm:p-8"
                >
                  <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center mb-6 self-center">
                    <Trash2 className="w-6 h-6 text-rose-500 stroke-[1.5px]" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-950 dark:text-white mb-2 tracking-tight text-center">
                    Удалить банк?
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 leading-relaxed text-center">
                    Вы уверены, что хотите удалить этот банк? Это действие
                    нельзя отменить.
                  </p>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <button
                      type="button"
                      ref={cancelDeleteBankRef}
                      onClick={() => setBankToDelete(null)}
                      className="flex-1 px-4 py-3 rounded-2xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold transition-all border border-slate-200/60 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600 active:scale-95 shadow-sm text-sm uppercase tracking-wide flex items-center justify-center"
                    >
                      Отмена
                    </button>
                    <button
                      type="button"
                      onClick={confirmDeleteBank}
                      className="flex-1 px-4 py-3 rounded-2xl bg-rose-500 hover:bg-rose-600 active:scale-95 text-white font-bold transition-all shadow-[0_4px_16px_rgba(244,63,94,0.3)] hover:shadow-[0_4px_20px_rgba(244,63,94,0.4)] flex items-center justify-center text-sm uppercase tracking-wide"
                    >
                      Удалить
                    </button>
                  </div>
                </motion.div>
        </Dialog.Panel>
      </div>
    </Dialog>
        )}
      </AnimatePresence>
    </Dialog>
  );
}

function ToggleChip({
  label,
  checked,
  onChange,
  icon,
}: {
  label: string;
  checked: boolean;
  onChange: (val: boolean) => void;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        "flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all duration-200 select-none cursor-pointer text-[9px] font-bold uppercase tracking-wider min-w-0",
        checked
          ? "border-deposit-500/30 bg-deposit-500/10 dark:bg-deposit-500/15 text-deposit-700 dark:text-deposit-300 active:scale-95 shadow-[0_2px_12px_rgba(20,184,166,0.15)]"
          : "border-slate-200/60 dark:border-white/[0.08] bg-white/40 dark:bg-slate-900/60 backdrop-blur-md text-slate-500 dark:text-slate-400 hover:bg-white/80 dark:hover:bg-white/5 active:scale-95 shadow-sm",
      )}
    >
      {icon && (
        <div
          className={cn(
            "w-3 h-3 flex items-center justify-center transition-transform shrink-0",
            checked ? "scale-110 text-deposit-500" : "",
          )}
        >
          {icon}
        </div>
      )}
      <span className="truncate leading-none mt-[1px]">{label}</span>
    </button>
  );
}
