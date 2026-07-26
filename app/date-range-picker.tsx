"use client";

import { useEffect, useId, useRef, useState } from "react";

type ActiveField = "checkIn" | "checkOut";

type DateRangePickerProps = {
  checkIn: string;
  checkOut: string;
  minDate: string;
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
  onSelect,
  secondary = false,
}: {
  month: string;
  activeField: ActiveField;
  checkIn: string;
  checkOut: string;
  minDate: string;
  onSelect: (value: string) => void;
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
              disabled={isDisabled}
              onClick={() => onSelect(date)}
              aria-label={fullDateLabel(date)}
              aria-pressed={isStart || isEnd}
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
  onCheckInChange,
  onCheckOutChange,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeField, setActiveField] = useState<ActiveField>("checkIn");
  const [visibleMonth, setVisibleMonth] = useState(() =>
    startOfMonth(isValidDate(checkIn) ? checkIn : minDate),
  );
  const wrapperRef = useRef<HTMLDivElement>(null);
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
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  function openFor(field: ActiveField) {
    setActiveField(field);
    const preferredDate =
      field === "checkOut" && isValidDate(checkOut)
        ? checkOut
        : isValidDate(checkIn)
          ? checkIn
          : minDate;
    setVisibleMonth(startOfMonth(preferredDate));
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
  }

  function resetRange() {
    onCheckInChange("");
    onCheckOutChange("");
    setActiveField("checkIn");
    setVisibleMonth(startOfMonth(minDate));
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
              id={checkInId}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="YYYY-MM-DD"
              value={checkIn}
              maxLength={10}
              role="combobox"
              aria-haspopup="dialog"
              aria-expanded={isOpen && activeField === "checkIn"}
              aria-controls={panelId}
              onFocus={() => openFor("checkIn")}
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
              id={checkOutId}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="YYYY-MM-DD"
              value={checkOut}
              maxLength={10}
              role="combobox"
              aria-haspopup="dialog"
              aria-expanded={isOpen && activeField === "checkOut"}
              aria-controls={panelId}
              onFocus={() => openFor("checkOut")}
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
                onClick={() => setVisibleMonth(addMonths(visibleMonth, -1))}
                disabled={visibleMonth <= startOfMonth(minDate)}
              >
                ‹
              </button>
              <button
                type="button"
                aria-label="下一个月"
                onClick={() => setVisibleMonth(addMonths(visibleMonth, 1))}
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
              onSelect={selectDate}
            />
            <CalendarMonth
              month={addMonths(visibleMonth, 1)}
              activeField={activeField}
              checkIn={checkIn}
              checkOut={checkOut}
              minDate={minDate}
              onSelect={selectDate}
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
