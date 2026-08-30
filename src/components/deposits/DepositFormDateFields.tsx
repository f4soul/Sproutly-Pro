import React, { useState } from "react";
import { Calendar, CalendarX, Clock, Lock } from "lucide-react";
import DatePicker from "react-datepicker";
import { addDays, differenceInDays } from "date-fns";
import { Deposit } from "../../types";
import { maskDateInput, cn } from "../../lib/utils";

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
    setFormData((prev) => ({ ...prev, startDate: date }));
    if (duration !== "") {
      const newEndDate = addDays(date, Number(duration));
      setFormData((prev) => ({ ...prev, endDate: newEndDate }));
    }
  };

  return (
    <>
      <div className="space-y-2">
        <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
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
        <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-deposit-500 stroke-[1.5px]" />{" "}
          Срок (дней)
        </label>
        <input
          type="text"
          inputMode="numeric"
          disabled={
            formData.formula === "daily_balance" ||
            formData.formula === "min_balance"
          }
          placeholder="91, 181..."
          value={durationStr}
          onChange={(e) => {
            const val = e.target.value.replace(/\D/g, "");
            setDurationStr(val);
            handleDurationChange(val === "" ? "" : Number(val));
          }}
          className="apple-input w-full disabled:opacity-50 disabled:cursor-not-allowed tabular-nums text-sm"
        />
      </div>

      <div className="space-y-2">
        <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center justify-between gap-2">
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
                const isSavings = formData.formula === "daily_balance" || formData.formula === "min_balance";
                
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

                setFormData({
                  ...formData,
                  isClosed: false,
                  endDate: isSavings ? null : nextEndDate
                });
                
                if (!isSavings && nextEndDate === null) {
                  setDuration("");
                }
              } else {
                const isSavings = formData.formula === "daily_balance" || formData.formula === "min_balance";
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                setFormData({ ...formData, isClosed: true, endDate: isSavings ? today : (formData.endDate || today) });
              }
            }}
            className={cn(
              "flex items-center justify-center gap-1.5 h-6 px-2.5 md:w-6 md:h-6 md:px-0 lg:w-auto lg:h-auto lg:px-2.5 lg:py-1 rounded-lg border transition-all duration-200 select-none cursor-pointer text-[9px] font-bold uppercase tracking-wider min-w-0 active:scale-95 shrink-0",
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
            onChange={(date: Date | null) => {
              if (date) {
                setFormData({ ...formData, endDate: date });
                if (formData.startDate) {
                  setDuration(differenceInDays(date, formData.startDate));
                }
                setIsEndDateOpen(false);
              } else {
                setFormData({ ...formData, endDate: null });
                setDuration("");
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
            disabled={
              formData.formula === "daily_balance" ||
              formData.formula === "min_balance"
            }
            className="apple-input w-full pr-12 disabled:opacity-50 disabled:cursor-not-allowed cursor-text"
            placeholderText="Бессрочно"
            isClearable
            wrapperClassName="w-full"
            portalId="datepicker-portal-container"
          />
          <button
            type="button"
            disabled={
              formData.formula === "daily_balance" ||
              formData.formula === "min_balance"
            }
            onClick={() => setIsEndDateOpen(!isEndDateOpen)}
            className="datepicker-toggle-btn-end absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-primary-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 active:scale-90 cursor-pointer z-20 flex items-center justify-center"
            title="Выбрать дату"
          >
            <CalendarX className="w-4 h-4 stroke-[1.5px]" />
          </button>
        </div>
      </div>
    </>
  );
}
