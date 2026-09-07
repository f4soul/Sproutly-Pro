import React from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "../../lib/utils";

interface StepperButtonProps {
  type?: "minus" | "plus";
  direction?: "down" | "up";
  onClick: (e: React.MouseEvent) => void;
  disabled?: boolean;
  title?: string;
  className?: string;
  size?: "sm" | "md";
}

export function StepperButton({
  type,
  direction,
  onClick,
  disabled = false,
  title,
  className,
  size = "md",
}: StepperButtonProps) {
  const isMinus = type === "minus" || direction === "down";
  const Icon = isMinus ? Minus : Plus;
  const defaultTitle = isMinus ? "Уменьшить" : "Увеличить";

  return (
    <button
      type="button"
      tabIndex={-1}
      disabled={disabled}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick(e);
      }}
      title={title || defaultTitle}
      className={cn(
        "flex items-center justify-center border border-slate-200/60 dark:border-white/[0.08] bg-slate-100/70 dark:bg-white/5 hover:bg-slate-200/70 dark:hover:bg-white/10 active:scale-90 text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white transition-all cursor-pointer select-none disabled:opacity-35 disabled:cursor-not-allowed disabled:active:scale-100 shrink-0",
        size === "md" ? "w-[44px] h-[44px] sm:w-[46px] sm:h-[46px] rounded-ui" : "w-8 h-8 rounded-lg",
        className
      )}
    >
      <Icon className={size === "md" ? "w-4 h-4 stroke-[2.2px]" : "w-3.5 h-3.5 stroke-[2.2px]"} />
    </button>
  );
}
