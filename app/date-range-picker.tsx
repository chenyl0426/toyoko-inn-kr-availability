"use client";

import { useEffect, useId, useRef, useState } from "react";

type ActiveField = "checkIn" | "checkOut";

type DateRangePickerProps = {
  checkIn: string;
  checkOut: string;
  minDate: string;
  checkInInvalid?: boolean;
  checkOutInvalid?: boolean;
  describedBy?: string;
  onCheckInChange: (value: string) => void;
  onCheckOutChange: (value: string) => void;
};

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(value: string) {
  if (!ISO_DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfMonth(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(1);
  return toIsoDate(date);
}

function addMonths(value: string, amount: number) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + amount);
  return toIsoDate(date);
}

function addDays(value: string, amount: number) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return toIsoDate(date);
}

function monthLabel(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function fullDateLabel(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function calendarDays(month: string) {
  const first = new Date(`${month}T00:00:00Z`);
  const mondayOffset = (first.getUTCDay() + 6) % 7;
  const firstVisible = addDays(month, -mondayOffset);
  return Array.from({ length: 42 }, (_, index) => addDays(firstVisible, index));
}

function cleanDraft(value: string) {
  return value.replace(/[^\d-]/g, "").slice(0, 10);
}

function CalendarMonth({
  month,
  activeField,
  checkIn,
  checkOut,
  minDate,
  focusedDate,
  onSelect,
  onFocusDate,
  onNavigate,
  secondary = false,
}: {
  month: string;
  activeField: ActiveField;
  checkIn: string;
  checkOut: string;
  minDate: string;
  focusedDate: string;
  onSelect: (value: string) => void;
  onFocusDate: (value: string) => void;
  onNavigate: (value: string) => void;
  secondary?: boolean;
}) {
  const currentMonth = month.slice(0, 7);
  const validCheckIn = isValidDate(checkIn);
  const validCheckOut = isValidDate(checkOut);

  return (
    <section
      className={`calendar-month${secondary ? " calendar-month-secondary" : ""}`}
      aria-label={monthLabel(month)}
    >
      <h3>{monthLabel(month)}</h3>
      <div className="calendar-weekdays" aria-hidden="true">
        {WEEKDAYS.map((weekday) => (
          <span key={weekday}>{weekday}</span>
        ))}
      </div>
      <div className="calendar-days">
        {calendarDays(month).map((date) => {
          const isOutsideMonth = date.slice(0, 7) !== currentMonth;
          const isStart = validCheckIn && date === checkIn;
          const isEnd = validCheckOut && date === checkOut;
          const isInRange =
            validCheckIn &&
            validCheckOut &&
            date > checkIn &&
            date < checkOut;
          const isDisabled =
            date < minDate ||
            (activeField === "checkOut" && validCheckIn && date <= checkIn);
          const isFocusable = !isOutsideMonth && date === focusedDate;

          return (
            <button
              type="button"
              className={[
                "calendar-day",
                isOutsideMonth ? "is-outside" : "",
                isInRange ? "is-in-range" : "",
                isStart ? "is-range-start" : "",
                isEnd ? "is-range-end" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              data-date={date}
              disabled={isDisabled || isOutsideMonth}
              tabIndex={isFocusable ? 0 : -1}
              onClick={() => onSelect(date)}
              onFocus={() => onFocusDate(date)}
              onKeyDown={(event) => {
                const moves: Partial<Record<typeof event.key, number>> = {
                  ArrowLeft: -1,
                  ArrowRight: 1,
                  ArrowUp: -7,
                  ArrowDown: 7,
                };
                const offset = moves[event.key];
                if (offset !== undefined) {
                  event.preventDefault();
                  onNavigate(addDays(date, offset));
                  return;
                }
                if (event.key === "Home" || event.key === "End") {
                  event.preventDefault();
                  const weekdayOffset =
                    (new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7;
                  onNavigate(
                    addDays(
                      date,
                      event.key === "Home"
                        ? -weekdayOffset
                        : 6 - weekdayOffset,
                    ),
                  );
                }
              }}
              aria-label={fullDateLabel(date)}
              aria-pressed={isStart || isEnd}
              aria-hidden={isOutsideMonth || undefined}
              key={date}
            >
              {Number(date.slice(8, 10))}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function DateRangePicker({
  checkIn,
  checkOut,
  minDate,
  checkInInvalid = false,
  checkOutInvalid = false,
  describedBy,
  onCheckInChange,
  onCheckOutChange,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeField, setActiveField] = useState<ActiveField>("checkIn");
  const [visibleMonth, setVisibleMonth] = useState(() =>
    startOfMonth(isValidDate(checkIn) ? checkIn : minDate),
  );
  const [focusedDate, setFocusedDate] = useState(() =>
    isValidDate(checkIn) ? checkIn : minDate,
  );
  const wrapperRef = useRef<HTMLDivElement>(null);
  const checkInRef = useRef<HTMLInputElement>(null);
  const checkOutRef = useRef<HTMLInputElement>(null);
  const suppressFocusOpenRef = useRef(false);
  const checkInId = useId();
  const checkOutId = useId();
  const panelId = useId();

  useEffect(() => {
    if (!isOpen) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        requestAnimationFrame(() => {
          suppressFocusOpenRef.current = true;
          (activeField === "checkIn"
            ? checkInRef.current
            : checkOutRef.current
          )?.focus();
          requestAnimationFrame(() => {
            suppressFocusOpenRef.current = false;
          });
        });
      }
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [activeField, isOpen]);

  function focusCalendarDate(value: string) {
    const earliestSelectable =
      activeField === "checkOut" && isValidDate(checkIn)
        ? addDays(checkIn, 1)
        : minDate;
    const target = value < earliestSelectable ? earliestSelectable : value;
    const targetMonth = startOfMonth(target);
    const isSingleMonth = window.matchMedia("(max-width: 680px)").matches;
    const lastVisibleMonth = isSingleMonth
      ? visibleMonth
      : addMonths(visibleMonth, 1);
    if (targetMonth < visibleMonth) {
      setVisibleMonth(targetMonth);
    } else if (targetMonth > lastVisibleMonth) {
      setVisibleMonth(
        isSingleMonth ? targetMonth : addMonths(targetMonth, -1),
      );
    }
    setFocusedDate(target);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        wrapperRef.current
          ?.querySelector<HTMLButtonElement>(
            `.calendar-day[data-date="${target}"]:not(:disabled)`,
          )
          ?.focus();
      });
    });
  }

  function moveCalendarView(amount: number) {
    const nextMonth = addMonths(visibleMonth, amount);
    const earliestSelectable =
      activeField === "checkOut" && isValidDate(checkIn)
        ? addDays(checkIn, 1)
        : minDate;
    const nextFocus =
      nextMonth < earliestSelectable ? earliestSelectable : nextMonth;
    setVisibleMonth(nextMonth);
    setFocusedDate(nextFocus);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        wrapperRef.current
          ?.querySelector<HTMLButtonElement>(
            `.calendar-day[data-date="${nextFocus}"]:not(:disabled)`,
          )
          ?.focus();
      });
    });
  }

  function openFor(field: ActiveField) {
    setActiveField(field);
    const preferredDate =
      field === "checkOut" && isValidDate(checkOut)
        ? checkOut
        : isValidDate(checkIn)
          ? field === "checkOut"
            ? addDays(checkIn, 1)
            : checkIn
          : minDate;
    setVisibleMonth(startOfMonth(preferredDate));
    setFocusedDate(preferredDate);
    setIsOpen(true);
  }

  function selectDate(value: string) {
    if (
      activeField === "checkIn" ||
      !isValidDate(checkIn)
    ) {
      onCheckInChange(value);
      onCheckOutChange("");
      setActiveField("checkOut");
      focusCalendarDate(addDays(value, 1));
      return;
    }

    if (value <= checkIn) {
      onCheckInChange(value);
      onCheckOutChange("");
      setActiveField("checkOut");
      return;
    }

    onCheckOutChange(value);
    setIsOpen(false);
    requestAnimationFrame(() => {
      suppressFocusOpenRef.current = true;
      checkOutRef.current?.focus();
      requestAnimationFrame(() => {
        suppressFocusOpenRef.current = false;
      });
    });
  }

  function resetRange() {
    onCheckInChange("");
    onCheckOutChange("");
    setActiveField("checkIn");
    setVisibleMonth(startOfMonth(minDate));
    setFocusedDate(minDate);
  }

  return (
    <div className="date-range-picker" ref={wrapperRef}>
      <div className="date-range-fields">
        <div className="field">
          <label htmlFor={checkInId}>入住日期</label>
          <div
            className={`date-input-shell${isOpen && activeField === "checkIn" ? " is-active" : ""}`}
            onClick={() => openFor("checkIn")}
          >
            <input
              ref={checkInRef}
              id={checkInId}
              name="checkIn"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              required
              aria-invalid={checkInInvalid}
              aria-describedby={describedBy}
              placeholder="YYYY-MM-DD"
              value={checkIn}
              maxLength={10}
              role="combobox"
              aria-haspopup="dialog"
              aria-expanded={isOpen && activeField === "checkIn"}
              aria-controls={panelId}
              onFocus={() => {
                if (suppressFocusOpenRef.current) {
                  suppressFocusOpenRef.current = false;
                  return;
                }
                openFor("checkIn");
              }}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  focusCalendarDate(
                    isValidDate(checkIn) ? checkIn : minDate,
                  );
                }
              }}
              onChange={(event) => onCheckInChange(cleanDraft(event.target.value))}
            />
            <span className="calendar-glyph" aria-hidden="true">
              日
            </span>
          </div>
        </div>

        <div className="field">
          <label htmlFor={checkOutId}>退房日期</label>
          <div
            className={`date-input-shell${isOpen && activeField === "checkOut" ? " is-active" : ""}`}
            onClick={() => openFor("checkOut")}
          >
            <input
              ref={checkOutRef}
              id={checkOutId}
              name="checkOut"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              required
              aria-invalid={checkOutInvalid}
              aria-describedby={describedBy}
              placeholder="YYYY-MM-DD"
              value={checkOut}
              maxLength={10}
              role="combobox"
              aria-haspopup="dialog"
              aria-expanded={isOpen && activeField === "checkOut"}
              aria-controls={panelId}
              onFocus={() => {
                if (suppressFocusOpenRef.current) {
                  suppressFocusOpenRef.current = false;
                  return;
                }
                openFor("checkOut");
              }}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  focusCalendarDate(
                    isValidDate(checkOut)
                      ? checkOut
                      : isValidDate(checkIn)
                        ? addDays(checkIn, 1)
                        : minDate,
                  );
                }
              }}
              onChange={(event) =>
                onCheckOutChange(cleanDraft(event.target.value))
              }
            />
            <span className="calendar-glyph" aria-hidden="true">
              日
            </span>
          </div>
        </div>
      </div>

      {isOpen && (
        <div
          className="date-calendar-popover"
          id={panelId}
          role="dialog"
          aria-modal="false"
          aria-label="选择入住和退房日期"
        >
          <div className="calendar-toolbar">
            <div>
              <strong>
                {activeField === "checkIn" ? "选择入住日期" : "选择退房日期"}
              </strong>
              <span>
                {isValidDate(checkIn)
                  ? isValidDate(checkOut)
                    ? `${checkIn} → ${checkOut}`
                    : `${checkIn} → 请选择退房日期`
                  : "先选择入住日期，再选择退房日期"}
              </span>
            </div>
            <div className="calendar-nav">
              <button
                type="button"
                aria-label="上一个月"
                onClick={() => moveCalendarView(-1)}
                disabled={
                  visibleMonth <=
                  startOfMonth(
                    activeField === "checkOut" && isValidDate(checkIn)
                      ? addDays(checkIn, 1)
                      : minDate,
                  )
                }
              >
                ‹
              </button>
              <button
                type="button"
                aria-label="下一个月"
                onClick={() => moveCalendarView(1)}
              >
                ›
              </button>
            </div>
          </div>

          <div className="calendar-months">
            <CalendarMonth
              month={visibleMonth}
              activeField={activeField}
              checkIn={checkIn}
              checkOut={checkOut}
              minDate={minDate}
              focusedDate={focusedDate}
              onSelect={selectDate}
              onFocusDate={setFocusedDate}
              onNavigate={focusCalendarDate}
            />
            <CalendarMonth
              month={addMonths(visibleMonth, 1)}
              activeField={activeField}
              checkIn={checkIn}
              checkOut={checkOut}
              minDate={minDate}
              focusedDate={focusedDate}
              onSelect={selectDate}
              onFocusDate={setFocusedDate}
              onNavigate={focusCalendarDate}
              secondary
            />
          </div>

          <div className="calendar-footer">
            <span>可直接键入日期，格式为 YYYY-MM-DD</span>
            <button type="button" onClick={resetRange}>
              重新选择
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
