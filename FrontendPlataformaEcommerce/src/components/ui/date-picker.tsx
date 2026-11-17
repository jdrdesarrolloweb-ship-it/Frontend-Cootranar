"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IconCalendar, IconX } from "@tabler/icons-react";
import { Calendar } from "./calendar";
import { cn } from "../../lib/utils";

export interface DatePickerProps {
  value?: string; // YYYY-MM-DD
  onChange?: (dateStr: string) => void;
  min?: string; // YYYY-MM-DD
  max?: string; // YYYY-MM-DD
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
  error?: string;
  id?: string;
  name?: string;
  locale?: "es" | "en";
  align?: "left" | "right" | "center";
  desplegarArriba?: boolean;
}

/**
 * Convierte de manera segura un string YYYY-MM-DD a objeto Date sin desfases de zona horaria UTC.
 */
function parseISODate(iso?: string): Date | undefined {
  if (!iso || typeof iso !== "string") return undefined;
  const parts = iso.split("-");
  if (parts.length !== 3) return undefined;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return undefined;
  return new Date(year, month, day);
}

/**
 * Convierte un Date a string YYYY-MM-DD
 */
function toISODate(date?: Date): string {
  if (!date || isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const MESES_ABR = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export const DatePicker = React.forwardRef<HTMLDivElement, DatePickerProps>(
  (
    {
      value = "",
      onChange,
      min,
      max,
      placeholder = "dd/mm/aaaa",
      disabled = false,
      className,
      inputClassName,
      error,
      id,
      align = "left",
      desplegarArriba = false,
      locale = "en",
    },
    ref,
  ) => {
    const [open, setOpen] = React.useState(false);
    const [desplegarHaciaArriba, setDesplegarHaciaArriba] = React.useState(desplegarArriba);
    const containerRef = React.useRef<HTMLDivElement>(null);

    const selectedDate = React.useMemo(() => parseISODate(value), [value]);
    const minDate = React.useMemo(() => parseISODate(min), [min]);
    const maxDate = React.useMemo(() => parseISODate(max), [max]);

    React.useEffect(() => {
      if (open && containerRef.current) {
        if (desplegarArriba) {
          setDesplegarHaciaArriba(true);
          return;
        }
        const rect = containerRef.current.getBoundingClientRect();
        const espacioAbajo = window.innerHeight - rect.bottom;
        const espacioArriba = rect.top;
        const ALTURA_CALENDARIO = 350;

        // Si no cabe abajo (menos de 350px) y arriba hay más espacio, abrir hacia arriba
        if (espacioAbajo < ALTURA_CALENDARIO && espacioArriba > espacioAbajo) {
          setDesplegarHaciaArriba(true);
        } else {
          setDesplegarHaciaArriba(false);
        }
      }
    }, [open, desplegarArriba]);

    React.useEffect(() => {
      function handleClickOutside(event: MouseEvent) {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setOpen(false);
        }
      }

      function handleKeyDown(event: KeyboardEvent) {
        if (event.key === "Escape") {
          setOpen(false);
        }
      }

      if (open) {
        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleKeyDown);
      }
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("keydown", handleKeyDown);
      };
    }, [open]);

    const handleSelect = (date: Date | undefined) => {
      if (!date) {
        onChange?.("");
      } else {
        onChange?.(toISODate(date));
      }
      setOpen(false);
    };

    const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange?.("");
    };

    const isDateDisabled = (date: Date): boolean => {
      const d = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
      if (minDate) {
        const minT = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate()).getTime();
        if (d < minT) return true;
      }
      if (maxDate) {
        const maxT = new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate()).getTime();
        if (d > maxT) return true;
      }
      return false;
    };

    const textoVisible = React.useMemo(() => {
      if (!selectedDate) return "";
      const d = selectedDate.getDate();
      const m = MESES_ABR[selectedDate.getMonth()];
      const y = selectedDate.getFullYear();
      return `${d} ${m} ${y}`;
    }, [selectedDate]);

    return (
      <div ref={containerRef} className={cn("relative w-full", className)}>
        <div
          id={id}
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => !disabled && setOpen((prev) => !prev)}
          onKeyDown={(e) => {
            if (!disabled && (e.key === "Enter" || e.key === " ")) {
              e.preventDefault();
              setOpen((prev) => !prev);
            }
          }}
          className={cn(
            "flex items-center justify-between w-full h-11 px-3.5 rounded-xl cursor-pointer select-none transition-all",
            "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100",
            "border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600",
            "focus:outline-none focus:ring-2 focus:ring-[#0e3a8c] dark:focus:ring-blue-500",
            open && "ring-2 ring-[#0e3a8c] border-transparent",
            disabled && "opacity-50 cursor-not-allowed pointer-events-none",
            error && "border-red-500 focus:ring-red-400",
            inputClassName,
          )}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <IconCalendar className="size-4.5 text-slate-400 dark:text-slate-500 shrink-0" stroke={1.8} />
            <span
              className={cn(
                "text-sm font-medium truncate",
                selectedDate ? "text-slate-900 dark:text-slate-100 font-semibold" : "text-slate-400 dark:text-slate-500",
              )}
            >
              {selectedDate ? textoVisible : placeholder}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {selectedDate && !disabled && (
              <button
                type="button"
                onClick={handleClear}
                title="Borrar fecha"
                aria-label="Borrar fecha"
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <IconX className="size-3.5" stroke={2.5} />
              </button>
            )}
          </div>
        </div>

        {error && <p className="text-xs text-red-500 mt-1 font-medium">{error}</p>}

        <AnimatePresence>
          {open && (
            <motion.div
              ref={ref}
              role="dialog"
              aria-modal="true"
              initial={{ opacity: 0, scale: 0.96, y: desplegarHaciaArriba ? 4 : -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: desplegarHaciaArriba ? 4 : -4 }}
              transition={{ duration: 0.14, ease: [0.23, 1, 0.32, 1] }}
              style={{ zIndex: 9999 }}
              className={cn(
                "absolute",
                desplegarHaciaArriba ? "bottom-full mb-2" : "top-full mt-2",
                align === "right" ? "right-0" : align === "center" ? "left-1/2 -translate-x-1/2" : "left-0",
              )}
            >
              <Calendar
                mode="single"
                locale={locale}
                selected={selectedDate}
                defaultMonth={selectedDate || minDate || new Date()}
                onSelect={handleSelect}
                disabled={isDateDisabled}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  },
);

DatePicker.displayName = "DatePicker";
