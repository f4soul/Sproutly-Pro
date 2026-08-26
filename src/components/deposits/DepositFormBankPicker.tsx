import React, { Fragment, useRef } from "react";
import { Combobox, Transition } from "@headlessui/react";
import { Landmark, X, ChevronDown, Check, Edit2, Trash2, Plus } from "lucide-react";
import { Bank, Deposit } from "../../types";
import { DEFAULT_BANK_ICON } from "../../lib/banks";
import { BankLogo } from "./BankLogo";
import { cn } from "../../lib/utils";
import { DropdownPortal } from "../ui/DropdownPortal";

interface DepositFormBankPickerProps {
  formData: Partial<Deposit>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<Deposit>>>;
  query: string;
  setQuery: React.Dispatch<React.SetStateAction<string>>;
  bankInputMode: "text" | "none";
  setBankInputMode: React.Dispatch<React.SetStateAction<"text" | "none">>;
  bankInputRef: React.RefObject<HTMLInputElement | null>;
  filteredBanks: Bank[];
  setNewBank: React.Dispatch<React.SetStateAction<Partial<Bank>>>;
  setShowBankEditor: React.Dispatch<React.SetStateAction<boolean>>;
  handleEditBank: (e: React.MouseEvent, bank: Bank) => void;
  handleDeleteBank: (e: React.MouseEvent, bankId: string | number) => void;
}

export function DepositFormBankPicker({
  formData,
  setFormData,
  query,
  setQuery,
  bankInputMode,
  setBankInputMode,
  bankInputRef,
  filteredBanks,
  setNewBank,
  setShowBankEditor,
  handleEditBank,
  handleDeleteBank,
}: DepositFormBankPickerProps) {
  const comboboxRef = useRef<HTMLDivElement>(null);
  
  return (
    <div className="space-y-2">
      <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
        <Landmark className="w-3.5 h-3.5 text-deposit-500 stroke-[1.5px]" />{" "}
        Банк
      </label>

      <Combobox
        value={formData.bank}
        onChange={(val) => {
          if (val === "__ADD_NEW__") {
            setNewBank({
              name: query || "",
              color: "#0d9488",
              logoText: "",
              logoUrl: DEFAULT_BANK_ICON,
              iconScale: 1,
              iconOffsetX: 0,
              iconOffsetY: 0,
              isCustom: true,
            });
            setShowBankEditor(true);
          } else {
            setFormData({ ...formData, bank: val || undefined });
          }
          if (typeof document !== "undefined" && document.activeElement) {
            (document.activeElement as HTMLElement).blur();
          }
          setBankInputMode("text");
        }}
      >
        {({ open }) => (
        <div ref={comboboxRef} className={cn("relative", open ? "z-[60]" : "z-30")}>
          <div className="relative w-full cursor-default overflow-hidden rounded-2xl bg-slate-50 dark:bg-slate-800/50 text-left border border-transparent focus-within:border-deposit-500/30 transition-all">
            <Combobox.Input
              ref={bankInputRef}
              className="w-full border-none py-3 pl-4 pr-16 text-sm font-medium bg-transparent outline-none text-slate-950 dark:text-white"
              displayValue={(val: any) =>
                typeof val === "string" ? val : ""
              }
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Выберите банк"
              inputMode={bankInputMode}
              onMouseDown={() => setBankInputMode("text")}
              onTouchStart={() => setBankInputMode("text")}
            />
            {formData.bank || query ? (
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (bankInputRef.current) {
                    const nativeInputValueSetter =
                      Object.getOwnPropertyDescriptor(
                        window.HTMLInputElement.prototype,
                        "value",
                      )?.set;
                    if (nativeInputValueSetter) {
                      nativeInputValueSetter.call(bankInputRef.current, "");
                    }
                    bankInputRef.current.dispatchEvent(
                      new Event("input", { bubbles: true }),
                    );
                    bankInputRef.current.dispatchEvent(
                      new Event("change", { bubbles: true }),
                    );
                  }
                  setFormData((prev) => ({ ...prev, bank: "" }));
                  setQuery("");
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (bankInputRef.current) {
                    const nativeInputValueSetter =
                      Object.getOwnPropertyDescriptor(
                        window.HTMLInputElement.prototype,
                        "value",
                      )?.set;
                    if (nativeInputValueSetter) {
                      nativeInputValueSetter.call(bankInputRef.current, "");
                    }
                    bankInputRef.current.dispatchEvent(
                      new Event("input", { bubbles: true }),
                    );
                    bankInputRef.current.dispatchEvent(
                      new Event("change", { bubbles: true }),
                    );
                  }
                  setFormData((prev) => ({ ...prev, bank: "" }));
                  setQuery("");
                }}
                className="absolute inset-y-0 right-10 flex items-center px-2 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors cursor-pointer z-20"
                title="Очистить"
              >
                <X className="h-4 w-4 stroke-[2.5px]" />
              </button>
            ) : null}
            <Combobox.Button
              onMouseDown={() => setBankInputMode("none")}
              onTouchStart={() => setBankInputMode("none")}
              onClick={() => {
                if (typeof document !== "undefined" && document.activeElement) {
                  (document.activeElement as HTMLElement).blur();
                }
                setTimeout(() => {
                  setBankInputMode("text");
                }, 150);
              }}
              className="absolute inset-y-0 right-0 flex items-center px-3 cursor-pointer"
            >
              <ChevronDown
                className="h-4 w-4 text-slate-500"
                aria-hidden="true"
              />
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
              {filteredBanks.length === 0 && query !== "" ? (
                <div className="relative cursor-default select-none py-2 px-4 text-slate-500">
                  Ничего не найдено.
                </div>
              ) : (
                filteredBanks.map((bank, bankIdx) => (
                  <Combobox.Option
                    key={`bank-option-${bank.id || bank.name || "custom"}-${bankIdx}`}
                    className={({ active }) =>
                      cn(
                        "relative cursor-pointer select-none py-2.5 px-3 rounded-xl font-medium transition-all duration-200 flex items-center justify-between gap-2 border border-transparent",
                        active
                          ? "bg-slate-100/70 dark:bg-slate-800/60 text-slate-900 dark:text-white border-slate-200/40 dark:border-white/[0.04] shadow-sm"
                          : "text-slate-950 dark:text-white",
                      )
                    }
                    value={bank.name}
                  >
                    {({ selected }) => (
                      <>
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-3 flex-1 min-w-0 pr-2">
                            <div className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200/50 dark:border-slate-700/50 flex items-center justify-center overflow-hidden transition-all shrink-0 p-1">
                              <BankLogo
                                logoUrl={bank.logoUrl}
                                alt=""
                                className="w-[85%] h-[85%] object-contain"
                              />
                            </div>
                            <span
                              className={cn(
                                "block truncate text-sm font-medium transition-all text-slate-800 dark:text-slate-200",
                                selected &&
                                  "font-bold text-slate-950 dark:text-white",
                              )}
                            >
                              {bank.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {selected && (
                              <span className="text-deposit-500 flex items-center justify-center">
                                <Check className="h-4 w-4 stroke-[2.5px]" />
                              </span>
                            )}
                            {bank.isCustom && (
                              <>
                                <button
                                  type="button"
                                  onPointerDown={(e) => {
                                    e.stopPropagation();
                                  }}
                                  onTouchStart={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    handleEditBank(e as any as React.MouseEvent, bank);
                                  }}
                                  onClick={(e) => handleEditBank(e, bank)}
                                  className="h-7 w-7 flex items-center justify-center text-slate-400 hover:text-deposit-500 hover:bg-deposit-500/10 rounded-lg transition-all cursor-pointer z-10 shrink-0"
                                  title="Редактировать банк"
                                >
                                  <Edit2 size={13} className="stroke-[2px]" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) =>
                                    handleDeleteBank(
                                      e,
                                      bank.id as string | number,
                                    )
                                  }
                                  className="h-7 w-7 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all cursor-pointer z-10 shrink-0"
                                  title="Удалить банк"
                                >
                                  <Trash2 size={13} className="stroke-[2px]" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </Combobox.Option>
                ))
              )}
              <Combobox.Option
                value="__ADD_NEW__"
                className={({ active }) =>
                  cn(
                    "flex items-center gap-2.5 py-2.5 px-3 rounded-xl font-bold transition-all duration-200 cursor-pointer mt-1 border border-dashed border-deposit-500/20 dark:border-deposit-500/10 text-deposit-600 dark:text-deposit-400",
                    active
                      ? "bg-deposit-50/50 dark:bg-deposit-500/10 border-solid border-deposit-500/30"
                      : "bg-transparent",
                  )
                }
              >
                <Plus
                  size={16}
                  className="stroke-[2.5px] text-deposit-500 shrink-0"
                />
                <span className="text-xs tracking-wide uppercase">
                  Добавить новый банк
                </span>
              </Combobox.Option>
            </Combobox.Options>
          </Transition>
          </DropdownPortal>
        </div>
        )}
      </Combobox>
    </div>
  );
}
