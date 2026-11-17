"use client";

import * as React from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/* ─── Types ─────────────────────────────────────────────────── */

export type CalendarMode = "single" | "range" | "multiple";

export interface DateRange {
  from?: Date;
  to?: Date;
}

export interface CalendarEvent {
  date: Date;
  label?: string;
}

interface CalendarSharedProps {
  /** Month currently displayed (controlled). */
  month?: Date;
  /** Initial displayed month (uncontrolled). Defaults to today's month. */
  defaultMonth?: Date;
  onMonthChange?: (month: Date) => void;
  /** 0 = Sunday, 1 = Monday. Default 0. */
  weekStartsOn?: 0 | 1;
  /** Return true to disable a date from selection. */
  disabled?: (date: Date) => boolean;
  /** Dates that are unavailable/reserved, shown struck-through and disabled. */
  bookedDates?: Date[];
  /** Dates with a scheduled-event indicator dot. */
  events?: CalendarEvent[];
  /** Enables the fast month/year jump view when clicking the header label. Default true. */
  quickNav?: boolean;
  className?: string;
  locale?: "en" | "es";
}

interface CalendarSingleProps extends CalendarSharedProps {
  mode?: "single";
  selected?: Date;
  defaultSelected?: Date;
  onSelect?: (date: Date | undefined) => void;
}

interface CalendarMultipleProps extends CalendarSharedProps {
  mode: "multiple";
  selected?: Date[];
  defaultSelected?: Date[];
  onSelect?: (dates: Date[]) => void;
}

interface CalendarRangeProps extends CalendarSharedProps {
  mode: "range";
  selected?: DateRange;
  defaultSelected?: DateRange;
  onSelect?: (range: DateRange | undefined) => void;
}

export type CalendarProps = CalendarSingleProps | CalendarMultipleProps | CalendarRangeProps;

/* ─── Easing ────────────────────────────────────────────────── */

const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];

/* ─── Date Helpers & Locales ───────────────────────────────── */

const MONTH_NAMES_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTH_NAMES_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const WEEKDAY_LABELS_SUN_EN = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const WEEKDAY_LABELS_MON_EN = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const WEEKDAY_LABELS_SUN_ES = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sá"];
const WEEKDAY_LABELS_MON_ES = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];

function isSameDay(a?: Date, b?: Date): boolean {
  if (!a || !b) return false;
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addMonths(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function isBefore(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() < startOfDay(b).getTime();
}

function isWithinRange(date: Date, range: DateRange): boolean {
  if (!range.from || !range.to) return false;
  const t = startOfDay(date).getTime();
  const from = startOfDay(range.from).getTime();
  const to = startOfDay(range.to).getTime();
  return t > Math.min(from, to) && t < Math.max(from, to);
}

function buildMonthGrid(month: Date, weekStartsOn: 0 | 1): Date[] {
  const firstOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
  const firstWeekday = firstOfMonth.getDay();
  const leading = weekStartsOn === 1 ? (firstWeekday + 6) % 7 : firstWeekday;
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(gridStart.getDate() - leading);

  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });
}

/* ─── <Calendar> Component ─────────────────────────────────── */

export const Calendar = React.forwardRef<HTMLDivElement, CalendarProps>((props, ref) => {
  const {
    mode = "single",
    month: controlledMonth,
    defaultMonth,
    onMonthChange,
    weekStartsOn = 0,
    disabled,
    bookedDates,
    events,
    quickNav = true,
    className,
    selected,
    defaultSelected,
    onSelect,
    locale = "en",
  } = props as CalendarSharedProps & {
    mode?: CalendarMode;
    selected?: Date | Date[] | DateRange;
    defaultSelected?: Date | Date[] | DateRange;
    onSelect?: (value: Date | undefined | Date[] | DateRange | undefined) => void;
  };

  const monthNames = locale === "es" ? MONTH_NAMES_ES : MONTH_NAMES_EN;
  const weekdayLabelsSun = locale === "es" ? WEEKDAY_LABELS_SUN_ES : WEEKDAY_LABELS_SUN_EN;
  const weekdayLabelsMon = locale === "es" ? WEEKDAY_LABELS_MON_ES : WEEKDAY_LABELS_MON_EN;
  const weekdayLabels = weekStartsOn === 1 ? weekdayLabelsMon : weekdayLabelsSun;

  const prefersReducedMotion = useReducedMotion();
  const today = React.useMemo(() => startOfDay(new Date()), []);

  const [internalMonth, setInternalMonth] = React.useState(() =>
    startOfDay(defaultMonth ?? controlledMonth ?? new Date()),
  );
  const isMonthControlled = controlledMonth !== undefined;
  const displayedMonth = isMonthControlled ? controlledMonth : internalMonth;

  const [navView, setNavView] = React.useState<"days" | "months" | "years">("days");
  const [direction, setDirection] = React.useState(1);
  const [yearAnchor, setYearAnchor] = React.useState(() => displayedMonth.getFullYear());

  function openYearsView() {
    setYearAnchor(displayedMonth.getFullYear());
    setNavView("years");
  }

  const dayGridRef = React.useRef<HTMLDivElement | null>(null);
  const pendingFocusDateRef = React.useRef<Date | null>(null);

  React.useEffect(() => {
    if (!pendingFocusDateRef.current) return;
    const iso = pendingFocusDateRef.current.toDateString();
    pendingFocusDateRef.current = null;
    (dayGridRef.current?.querySelector(`[data-date-key="${iso}"]`) as HTMLElement | null)?.focus();
  }, [displayedMonth]);

  const setMonth = React.useCallback(
    (next: Date, dir: number) => {
      setDirection(dir);
      if (!isMonthControlled) setInternalMonth(next);
      onMonthChange?.(next);
    },
    [isMonthControlled, onMonthChange],
  );

  const [internalSingle, setInternalSingle] = React.useState<Date | undefined>(
    mode === "single" ? (defaultSelected as Date | undefined) : undefined,
  );
  const [internalMultiple, setInternalMultiple] = React.useState<Date[]>(
    mode === "multiple" ? ((defaultSelected as Date[] | undefined) ?? []) : [],
  );
  const [internalRange, setInternalRange] = React.useState<DateRange | undefined>(
    mode === "range" ? (defaultSelected as DateRange | undefined) : undefined,
  );

  const isSelectedControlled = selected !== undefined;
  const currentSingle = mode === "single" ? ((isSelectedControlled ? selected : internalSingle) as Date | undefined) : undefined;
  const currentMultiple = mode === "multiple" ? ((isSelectedControlled ? selected : internalMultiple) as Date[]) : [];
  const currentRange = mode === "range" ? ((isSelectedControlled ? selected : internalRange) as DateRange | undefined) : undefined;

  function isDisabled(date: Date): boolean {
    if (bookedDates?.some((b) => isSameDay(b, date))) return true;
    return disabled?.(date) ?? false;
  }

  function isBooked(date: Date): boolean {
    return bookedDates?.some((b) => isSameDay(b, date)) ?? false;
  }

  function eventFor(date: Date): CalendarEvent | undefined {
    return events?.find((e) => isSameDay(e.date, date));
  }

  function handleSelectDay(date: Date) {
    if (isDisabled(date)) return;

    if (mode === "single") {
      const next = isSameDay(currentSingle, date) ? undefined : date;
      if (!isSelectedControlled) setInternalSingle(next);
      (onSelect as CalendarSingleProps["onSelect"])?.(next);
      return;
    }

    if (mode === "multiple") {
      const exists = currentMultiple.some((d) => isSameDay(d, date));
      const next = exists ? currentMultiple.filter((d) => !isSameDay(d, date)) : [...currentMultiple, date];
      if (!isSelectedControlled) setInternalMultiple(next);
      (onSelect as CalendarMultipleProps["onSelect"])?.(next);
      return;
    }

    const from = currentRange?.from;
    const to = currentRange?.to;
    let next: DateRange;
    if (!from || (from && to)) {
      next = { from: date, to: undefined };
    } else if (isBefore(date, from)) {
      next = { from: date, to: from };
    } else {
      next = { from, to: date };
    }
    if (!isSelectedControlled) setInternalRange(next);
    (onSelect as CalendarRangeProps["onSelect"])?.(next);
  }

  function goToMonth(offset: number) {
    setMonth(addMonths(displayedMonth, offset), offset >= 0 ? 1 : -1);
  }

  const grid = React.useMemo(
    () => buildMonthGrid(displayedMonth, weekStartsOn),
    [displayedMonth, weekStartsOn],
  );

  const focusableDate = React.useMemo(() => {
    if (mode === "single" && currentSingle && isSameMonth(currentSingle, displayedMonth)) return currentSingle;
    if (isSameMonth(today, displayedMonth)) return today;
    return new Date(displayedMonth.getFullYear(), displayedMonth.getMonth(), 1);
  }, [mode, currentSingle, displayedMonth, today]);

  function cellState(date: Date) {
    const outsideMonth = !isSameMonth(date, displayedMonth);
    const isToday = isSameDay(date, today);
    const isBookedDay = isBooked(date);
    const event = eventFor(date);
    const isDayDisabled = isDisabled(date);

    let isSelected = false;
    let isRangeStart = false;
    let isRangeEnd = false;
    let isInRange = false;

    if (mode === "single") {
      isSelected = isSameDay(currentSingle, date);
    } else if (mode === "multiple") {
      isSelected = currentMultiple.some((d) => isSameDay(d, date));
    } else if (mode === "range" && currentRange) {
      isRangeStart = isSameDay(currentRange.from, date);
      isRangeEnd = isSameDay(currentRange.to, date);
      isInRange = isWithinRange(date, currentRange);
      isSelected = isRangeStart || isRangeEnd;
    }

    return { outsideMonth, isToday, isBookedDay, event, isDayDisabled, isSelected, isRangeStart, isRangeEnd, isInRange };
  }

  const monthLabel = `${monthNames[displayedMonth.getMonth()]} ${displayedMonth.getFullYear()}`;
  const weeks = React.useMemo(() => {
    const rows: Date[][] = [];
    for (let i = 0; i < grid.length; i += 7) {
      rows.push(grid.slice(i, i + 7));
    }
    return rows;
  }, [grid]);

  return (
    <div
      ref={ref}
      data-slot="calendar"
      data-mode={mode}
      className={cn(
        "w-[308px] select-none rounded-2xl bg-white dark:bg-slate-900",
        "border border-slate-200/90 dark:border-slate-800",
        "shadow-2xl shadow-slate-900/10 dark:shadow-slate-950/60",
        "p-4 text-slate-800 dark:text-slate-100",
        className,
      )}
    >
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {monthLabel}
      </div>

      {/* Header */}
      <div className="mb-3 flex items-center justify-between px-1">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => goToMonth(-1)}
          className={cn(
            "flex size-7 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200",
            "hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer outline-none",
          )}
        >
          <IconChevronLeft className="size-4.5" stroke={2} />
        </button>

        <div className="flex items-center gap-1.5 font-medium text-[14px]">
          <button
            type="button"
            disabled={!quickNav}
            aria-label="Show month picker"
            onClick={() => setNavView(navView === "months" ? "days" : "months")}
            className={cn(
              "px-1 py-0.5 rounded text-slate-800 dark:text-slate-100 font-semibold tracking-tight transition-colors outline-none",
              quickNav && "hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer",
              navView === "months" && "bg-slate-100 dark:bg-slate-800",
            )}
          >
            {monthNames[displayedMonth.getMonth()]}
          </button>

          <span className="text-slate-300 dark:text-slate-600 font-light select-none">|</span>

          <button
            type="button"
            disabled={!quickNav}
            aria-label="Show year picker"
            onClick={() => (navView === "years" ? setNavView("days") : openYearsView())}
            className={cn(
              "px-1 py-0.5 rounded text-slate-800 dark:text-slate-100 font-semibold tracking-tight transition-colors outline-none",
              quickNav && "hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer",
              navView === "years" && "bg-slate-100 dark:bg-slate-800",
            )}
          >
            {displayedMonth.getFullYear()}
          </button>
        </div>

        <button
          type="button"
          aria-label="Next month"
          onClick={() => goToMonth(1)}
          className={cn(
            "flex size-7 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200",
            "hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer outline-none",
          )}
        >
          <IconChevronRight className="size-4.5" stroke={2} />
        </button>
      </div>

      <div className="relative overflow-hidden">
        <AnimatePresence mode="popLayout" initial={false} custom={direction}>
          {navView === "days" && (
            <motion.div
              key={`${displayedMonth.getFullYear()}-${displayedMonth.getMonth()}`}
              custom={direction}
              initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: direction * 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: direction * -10 }}
              transition={{ duration: prefersReducedMotion ? 0.12 : 0.16, ease: EASE_OUT }}
            >
              {/* Weekday row */}
              <div className="mb-1.5 grid grid-cols-7 text-center">
                {weekdayLabels.map((label, i) => (
                  <div
                    key={`${label}-${i}`}
                    className="flex h-7 items-center justify-center text-[11.5px] font-medium text-slate-400 dark:text-slate-500"
                  >
                    {label}
                  </div>
                ))}
              </div>

              {/* Day grid */}
              <div
                ref={dayGridRef}
                role="grid"
                aria-label={monthLabel}
                className="grid grid-cols-7 gap-y-1"
                onKeyDown={(e) => {
                  const deltas: Record<string, number> = {
                    ArrowLeft: -1,
                    ArrowRight: 1,
                    ArrowUp: -7,
                    ArrowDown: 7,
                  };
                  let targetDate: Date | undefined;
                  if (e.key in deltas) {
                    const current = new Date((e.target as HTMLElement).dataset.date ?? "");
                    current.setDate(current.getDate() + deltas[e.key]!);
                    targetDate = current;
                  }
                  if (!targetDate) return;
                  e.preventDefault();
                  if (!isSameMonth(targetDate, displayedMonth)) {
                    pendingFocusDateRef.current = targetDate;
                    setMonth(new Date(targetDate.getFullYear(), targetDate.getMonth(), 1), isBefore(targetDate, displayedMonth) ? -1 : 1);
                    return;
                  }
                  const iso = targetDate.toDateString();
                  (dayGridRef.current?.querySelector(`[data-date-key="${iso}"]`) as HTMLElement | null)?.focus();
                }}
              >
                {weeks.map((week, weekIndex) => (
                  <div key={weekIndex} role="row" className="contents">
                    {week.map((date) => {
                      const state = cellState(date);
                      return (
                        <div
                          key={date.toISOString()}
                          role="gridcell"
                          aria-selected={state.isSelected || undefined}
                          className="relative flex h-8.5 items-center justify-center"
                        >
                          {mode === "range" &&
                            currentRange?.from &&
                            currentRange?.to &&
                            !isSameDay(currentRange.from, currentRange.to) &&
                            (state.isInRange || state.isRangeStart || state.isRangeEnd) && (
                              <div
                                className={cn(
                                  "absolute inset-y-0 bg-slate-100 dark:bg-slate-800",
                                  state.isRangeStart ? "left-1/2 right-0" : state.isRangeEnd ? "left-0 right-1/2" : "inset-x-0",
                                )}
                              />
                            )}
                          <button
                            type="button"
                            disabled={state.isDayDisabled}
                            aria-label={date.toDateString()}
                            data-date={date.toISOString()}
                            data-date-key={date.toDateString()}
                            tabIndex={isSameDay(date, focusableDate) ? 0 : -1}
                            onClick={() => handleSelectDay(date)}
                            className={cn(
                              "relative z-10 flex size-8 items-center justify-center rounded-full text-[13px] tabular-nums transition-all outline-none",
                              state.outsideMonth ? "text-slate-300 dark:text-slate-600" : "text-slate-700 dark:text-slate-200",
                              !state.isSelected &&
                                !state.isDayDisabled &&
                                "hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer",
                              state.isSelected &&
                                "bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold shadow-md hover:bg-slate-800",
                              state.isToday &&
                                !state.isSelected &&
                                "border border-slate-300 dark:border-slate-600 font-semibold text-slate-900 dark:text-slate-100",
                              state.isDayDisabled &&
                                !state.isBookedDay &&
                                "pointer-events-none text-slate-300 dark:text-slate-600 opacity-30",
                              state.isBookedDay &&
                                "pointer-events-none text-slate-300 dark:text-slate-600 line-through opacity-40",
                            )}
                          >
                            {date.getDate()}
                            {state.event && !state.isSelected && (
                              <span className="absolute bottom-0.5 size-1 rounded-full bg-blue-500" />
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {navView === "months" && (
            <motion.div
              key="months"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: prefersReducedMotion ? 0.12 : 0.15, ease: EASE_OUT }}
              className="grid grid-cols-3 gap-1.5 py-1"
            >
              {monthNames.map((name, i) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => {
                    setMonth(new Date(displayedMonth.getFullYear(), i, 1), 1);
                    setNavView("days");
                  }}
                  className={cn(
                    "flex h-9 items-center justify-center rounded-xl text-[12.5px] font-medium transition-colors cursor-pointer outline-none",
                    i === displayedMonth.getMonth()
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold"
                      : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800",
                  )}
                >
                  {name.slice(0, 3)}
                </button>
              ))}
            </motion.div>
          )}

          {navView === "years" && (
            <motion.div
              key="years"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: prefersReducedMotion ? 0.12 : 0.15, ease: EASE_OUT }}
            >
              <div className="mb-2 flex items-center justify-between px-1">
                <button
                  type="button"
                  aria-label="Previous years"
                  onClick={() => setYearAnchor((y) => y - 12)}
                  className="flex size-7 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <IconChevronLeft className="size-4" stroke={2} />
                </button>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {yearAnchor - 5} - {yearAnchor + 6}
                </span>
                <button
                  type="button"
                  aria-label="Next years"
                  onClick={() => setYearAnchor((y) => y + 12)}
                  className="flex size-7 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <IconChevronRight className="size-4" stroke={2} />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-1.5 py-1">
                {Array.from({ length: 12 }, (_, i) => yearAnchor - 5 + i).map((year) => (
                  <button
                    key={year}
                    type="button"
                    onClick={() => {
                      setMonth(new Date(year, displayedMonth.getMonth(), 1), 1);
                      setNavView("days");
                    }}
                    className={cn(
                      "flex h-9 items-center justify-center rounded-xl text-[12.5px] tabular-nums font-medium transition-colors cursor-pointer outline-none",
                      year === displayedMonth.getFullYear()
                        ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold"
                        : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800",
                    )}
                  >
                    {year}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
});

Calendar.displayName = "Calendar";
