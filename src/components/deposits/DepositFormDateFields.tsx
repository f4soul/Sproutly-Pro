import React, { useState } from "react";
import { Calendar, CalendarX, Clock } from "lucide-react";
import DatePicker from "react-datepicker";
import { addDays, differenceInDays } from "date-fns";
import { Deposit } from "../../types";

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

  const handleRawDateInput = (
    e: React.KeyboardEvent<HTMLElement>,
    isStartDate: boolean,
  ) => {
    if (e.key === "Enter") {
      const target = e.target as HTMLInputElement;
      const val = target.value?.replace(/\D/g, "");
      if (val && val.length === 8) {
        const day = parseInt(val.substring(0, 2), 10);
        const month = parseInt(val.substring(2, 4), 10) - 1;
        const year = parseInt(val.substring(4, 8), 10);
        const newDate = new Date(year, month, day);
        if (!isNaN(newDate.getTime())) {
          if (isStartDate) {
            handleStartDateChange(newDate);
          } else {
            setFormData((prev) => {
              const next = { ...prev, endDate: newDate };
              if (next.startDate) {
                setDuration(differenceInDays(newDate, next.startDate));
              }
              return next;
            });
          }
        }
      }
    }
  };

  return (
    <>
      <div className="space-y-2">
        <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-primary-500 stroke-[1.5px]" />{" "}
          Дата открытия
        </label>
        <div className="relative w-full group">
          <DatePicker
            selected={formData.startDate}
            onChange={(date) => {
              if (date) {
                handleStartDateChange(date);
              }
              setIsStartDateOpen(false);
            }}
            onKeyDown={(e) => {
              handleRawDateInput(e, true);
              if (e.key === "Enter") {
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
          <Clock className="w-3.5 h-3.5 text-violet-500 stroke-[1.5px]" />{" "}
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
          className="apple-input w-full disabled:opacity-50 disabled:cursor-not-allowed font-mono text-sm"
        />
      </div>

      <div className="space-y-2">
        <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <CalendarX className="w-3.5 h-3.5 text-primary-500 stroke-[1.5px]" />{" "}
          Дата закрытия
        </label>
        <div className="relative w-full group">
          <DatePicker
            selected={formData.endDate}
            onChange={(date) => {
              if (date) {
                setFormData({ ...formData, endDate: date });
                if (formData.startDate) {
                  setDuration(differenceInDays(date, formData.startDate));
                }
              } else {
                setFormData({ ...formData, endDate: null });
                setDuration("");
              }
              setIsEndDateOpen(false);
            }}
            onKeyDown={(e) => {
              handleRawDateInput(e, false);
              if (e.key === "Enter") {
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
