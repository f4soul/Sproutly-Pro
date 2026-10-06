import React, { useState } from "react";
import { Calendar, CalendarX, Clock, Lock } from "lucide-react";
import DatePicker from "react-datepicker";
import { addDays, differenceInDays } from "date-fns";
import { Deposit } from "../../types";
import { maskDateInput, cn } from "../../lib/utils";
import { ClearButton } from "../ui/ClearButton";
import { StepperButton } from "../ui/StepperButton";

interface DepositFormDateFieldsProps {
  formData: Partial<Deposit>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<Deposit>>>;
  durationStr: string;
  setDurationStr: React.Dispatch<React.SetStateAction<string>>;
  duration: number | "";
  setDuration: React.Dispatch<React.SetStateAction<number | "">>;
}

export function DepositFormDateFields({
  formData,
  setFormData,
  durationStr,
  setDurationStr,
  duration,
  setDuration,
}: DepositFormDateFieldsProps) {
  const [isStartDateOpen, setIsStartDateOpen] = useState(false);
  const [isEndDateOpen, setIsEndDateOpen] = useState(false);

  const handleDurationChange = (val: number | "") => {
    setDuration(val);
    if (val !== "" && formData.startDate) {
      const startDate = new Date(formData.startDate);
      if (!isNaN(startDate.getTime())) {
        const newEndDate = addDays(startDate, val);
        setFormData((prev) => ({ ...prev, endDate: newEndDate }));
      }
    }
  };

  const handleStartDateChange = (date: Date) => {
    if (isNaN(date.getTime())) return;
    setFormData((prev) => {
      const updated = { ...prev, startDate: date };
      if (duration !== "") {
        updated.endDate = addDays(date, Number(duration));
      }
      return updated;
    });
  };

  const isSavings =
    formData.formula === "daily_balance" || formData.formula === "min_balance";

  const handleStepDuration = (delta: number) => {
    const current = Number(durationStr) || 0;
    const next = Math.max(1, current + delta);
    setDurationStr(String(next));
    handleDurationChange(next);
  };

  const handleClearDuration = () => {
    setDurationStr("");
    handleDurationChange("");
    if (isSavings) {
      setFormData((prev) => ({ ...prev, endDate: null }));
    }
  };

  return (
    <>
      <div className="space-y-2">
        <label className="h-6 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-deposit-500 stroke-[1.5px]" />{" "}
          Дата открытия
        </label>
        <div className="relative w-full group">
          <DatePicker
            selected={formData.startDate ? (isNaN(new Date(formData.startDate).getTime()) ? null : new Date(formData.startDate)) : null}
            onChange={(date: Date | null) => {
              if (date) {
                handleStartDateChange(date);
                setIsStartDateOpen(false);
              } else {
                // start date is not clearable, ignore null
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
            className="datepicker-toggle-btn-start absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-primary-500 transition-colors rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 active:scale-90 cursor-pointer z-20 flex items-center justify-center"
            title="Выбрать дату"
          >
            <Calendar className="w-4 h-4 stroke-[1.5px]" />
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <label className="h-6 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-deposit-500 stroke-[1.5px]" />{" "}
          Срок (дней)
        </label>
        <div className="flex items-center h-[46px] rounded-ui border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 focus-within:ring-4 focus-within:ring-primary-500/10 focus-within:border-primary-500 dark:focus-within:border-primary-500 transition-all overflow-hidden">
          <StepperButton
            type="minus"
            onClick={() => handleStepDuration(-1)}
            disabled={!durationStr || Number(durationStr) <= 1}
            title="Уменьшить срок на 1 день"
          />
          <div className="w-px self-stretch bg-slate-200 dark:bg-slate-700/50" />
          <div className="relative flex-1 h-full flex items-center">
            <input
              type="text"
              inputMode="numeric"
              placeholder={isSavings ? "Бессрочно" : "91, 181..."}
              value={durationStr}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "");
                setDurationStr(val);
                handleDurationChange(val === "" ? "" : Number(val));
                if (val === "" && isSavings) {
                  setFormData((prev) => ({ ...prev, endDate: null }));
                }
              }}
              className={cn(
                "w-full h-full bg-transparent border-0 outline-none text-center tabular-nums text-sm font-medium text-slate-950 dark:text-white py-0 focus:ring-0 disabled:cursor-not-allowed placeholder:font-sans placeholder:text-slate-400 dark:placeholder:text-slate-500",
                Boolean(durationStr) && "pr-8"
              )}
            />
            {Boolean(durationStr) && (
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                <ClearButton onClick={handleClearDuration} title="Очистить срок" />
              </div>
            )}
          </div>
          <div className="w-px self-stretch bg-slate-200 dark:bg-slate-700/50" />
          <StepperButton
            type="plus"
            onClick={() => handleStepDuration(1)}
            title="Увеличить срок на 1 день"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="h-6 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <CalendarX className="w-3.5 h-3.5 text-deposit-500 stroke-[1.5px]" />
            Дата закрытия
          </span>
          <button
            type="button"
            title={formData.isClosed ? "Закрыт досрочно — нажмите, чтобы отменить" : "Отметить как закрытый досрочно"}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (formData.isClosed) {
                let nextEndDate = formData.endDate;
                if (nextEndDate) {
                  const end = new Date(nextEndDate);
                  end.setHours(0, 0, 0, 0);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  if (today >= end) {
                    nextEndDate = null;
                  }
                }

                setFormData((prev) => ({
                  ...prev,
                  isClosed: false,
                  endDate: isSavings ? null : nextEndDate
                }));
                
                if (nextEndDate === null) {
                  setDuration("");
                  setDurationStr("");
                }
              } else {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                setFormData((prev) => ({
                  ...prev,
                  isClosed: true,
                  endDate: isSavings ? today : (prev.endDate || today)
                }));
              }
            }}
            className={cn(
              "flex items-center justify-center gap-1.5 h-6 px-2.5 md:w-6 md:h-6 md:px-0 lg:w-auto lg:h-6 lg:px-2.5 rounded-lg border transition-all duration-200 select-none cursor-pointer text-[9px] font-bold uppercase tracking-wider min-w-0 active:scale-95 shrink-0",
              formData.isClosed
                ? "border-deposit-500/30 bg-deposit-500/10 dark:bg-deposit-500/15 text-deposit-700 dark:text-deposit-300 shadow-[0_2px_12px_rgba(20,184,166,0.15)]"
                : "border-slate-200/60 dark:border-white/[0.08] bg-white/40 dark:bg-slate-900/60 backdrop-blur-md text-slate-500 dark:text-slate-400 hover:bg-white/80 dark:hover:bg-white/5 shadow-sm"
            )}
          >
            <div
              className={cn(
                "w-3 h-3 flex items-center justify-center transition-transform shrink-0",
                formData.isClosed ? "scale-110 text-deposit-500" : ""
              )}
            >
              <Lock className="w-3 h-3 stroke-[1.5px]" />
            </div>
            <span className="inline md:hidden lg:inline truncate leading-none mt-[1px]">Досрочно</span>
          </button>
        </label>
        <div className="relative w-full group">
          <DatePicker
            selected={formData.endDate ? (isNaN(new Date(formData.endDate).getTime()) ? null : new Date(formData.endDate)) : null}
            onChange={(date: Date | null, event?: React.SyntheticEvent<any>) => {
              if (date) {
                setFormData((prev) => ({ ...prev, endDate: date }));
                if (formData.startDate) {
                  const daysDiff = differenceInDays(date, formData.startDate);
                  const validDuration = daysDiff > 0 ? daysDiff : "";
                  setDuration(validDuration);
                  setDurationStr(validDuration !== "" ? String(validDuration) : "");
                }
                setIsEndDateOpen(false);
              } else {
                // If the user explicitly clicked the clear icon inside DatePicker, clear endDate only.
                // Do NOT reset duration: duration is an independent field with its own stepper/clear controls,
                // and savings accounts can have promo duration without a fixed closing date.
                const isExplicitClear = Boolean(
                  event &&
                  (event.type === "click" ||
                    Boolean((event.target as HTMLElement)?.closest?.(".react-datepicker__close-icon")))
                );
                if (isExplicitClear) {
                  setFormData((prev) => ({ ...prev, endDate: null }));
                }
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
                setIsEndDateOpen(false);
              }
            }}
            onClickOutside={(e) => {
              const target = e.target as HTMLElement;
              if (target.closest(".datepicker-toggle-btn-end")) {
                return;
              }
              setIsEndDateOpen(false);
            }}
            open={isEndDateOpen}
            preventOpenOnFocus={true}
            locale="ru"
            dateFormat="dd.MM.yyyy"
            className="apple-input w-full pr-14 cursor-text"
            placeholderText={isSavings ? "Бессрочно" : "Не задана"}
            isClearable
            wrapperClassName="w-full"
            portalId="datepicker-portal-container"
          />
          <button
            type="button"
            onClick={() => setIsEndDateOpen(!isEndDateOpen)}
            className="datepicker-toggle-btn-end absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-primary-500 transition-colors rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 active:scale-90 cursor-pointer z-20 flex items-center justify-center"
            title="Выбрать дату"
          >
            <CalendarX className="w-4 h-4 stroke-[1.5px]" />
          </button>
        </div>
      </div>
    </>
  );
}
