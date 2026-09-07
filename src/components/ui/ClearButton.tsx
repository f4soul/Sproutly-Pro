import React from "react";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";

interface ClearButtonProps {
  onClick: (e: React.MouseEvent) => void;
  className?: string;
  title?: string;
  visible?: boolean;
}

export function ClearButton({
  onClick,
  className,
  title = "Очистить",
  visible = true,
}: ClearButtonProps) {
  if (!visible) return null;

  return (
    <button
      type="button"
      tabIndex={-1}
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onPointerDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick(e);
      }}
      title={title}
      className={cn(
        "p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-white/10 active:scale-90 transition-all cursor-pointer flex items-center justify-center select-none pointer-events-auto relative z-20",
        className
      )}
    >
      <X className="w-3.5 h-3.5 stroke-[2.2px]" />
    </button>
  );
}
