"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useI18n } from "@/app/i18n-provider";
import {
  HOTELS,
  REGION_OPTIONS,
  hotelCity,
  hotelName,
  hotelsForRegion,
  regionName,
} from "@/lib/hotels";
import { DEFAULT_LOCALE, formatMessage, getMessages } from "@/lib/i18n";
import type { Locale, RegionId } from "@/lib/types";

type HotelSelectorProps = {
  selectedHotelCodes: string[];
  invalid?: boolean;
  describedBy?: string;
  onChange: (hotelCodes: string[]) => void;
};

const ACTIVE_HOTELS = HOTELS.filter((hotel) => hotel.active);
const REGION_GROUPS = REGION_OPTIONS.filter(
  (region) => region.id !== "all",
).map((region) => ({
  ...region,
  hotels: hotelsForRegion(region.id),
}));

export function describeHotelSelection(
  hotelCodes: string[],
  locale: Locale = DEFAULT_LOCALE,
) {
  const c = getMessages(locale);
  const selected = ACTIVE_HOTELS.filter((hotel) =>
    hotelCodes.includes(hotel.hotelCode),
  );
  if (selected.length === 0) return c.hotels.selectedNone;
  if (selected.length === ACTIVE_HOTELS.length) {
    return formatMessage(c.hotels.selectedAll, { count: selected.length });
  }
  if (selected.length === 1) return hotelName(selected[0], locale);

  const cityIds = new Set(selected.map((hotel) => hotel.cityId));
  if (cityIds.size === 1) {
    return formatMessage(c.hotels.selectedRegion, {
      region: hotelCity(selected[0], locale),
      count: selected.length,
    });
  }
  return formatMessage(c.hotels.selectedMixed, { count: selected.length });
}

export function HotelSelector({
  selectedHotelCodes,
  invalid = false,
  describedBy,
  onChange,
}: HotelSelectorProps) {
  const { locale, messages: c } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [expandedRegions, setExpandedRegions] = useState<Set<RegionId>>(
    new Set(),
  );
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const fieldLabelId = useId();
  const summaryId = useId();
  const panelTitleId = useId();
  const selectedSet = useMemo(
    () => new Set(selectedHotelCodes),
    [selectedHotelCodes],
  );
  const allHotelsSelected = selectedSet.size === ACTIVE_HOTELS.length;
  const someHotelsSelected = selectedSet.size > 0 && !allHotelsSelected;

  useEffect(() => {
    if (!isOpen) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  function commitSelection(next: Set<string>) {
    onChange(
      ACTIVE_HOTELS.filter((hotel) => next.has(hotel.hotelCode)).map(
        (hotel) => hotel.hotelCode,
      ),
    );
  }

  function toggleRegion(regionId: RegionId, checked: boolean) {
    const next = new Set(selectedSet);
    hotelsForRegion(regionId).forEach((hotel) => {
      if (checked) next.add(hotel.hotelCode);
      else next.delete(hotel.hotelCode);
    });
    commitSelection(next);
  }

  function toggleHotel(hotelCode: string, checked: boolean) {
    const next = new Set(selectedSet);
    if (checked) next.add(hotelCode);
    else next.delete(hotelCode);
    commitSelection(next);
  }

  function toggleAllHotels(checked: boolean) {
    commitSelection(
      new Set(
        checked ? ACTIVE_HOTELS.map((hotel) => hotel.hotelCode) : [],
      ),
    );
  }

  function toggleExpanded(regionId: RegionId) {
    setExpandedRegions((current) => {
      const next = new Set(current);
      if (next.has(regionId)) next.delete(regionId);
      else next.add(regionId);
      return next;
    });
  }

  return (
    <div className="hotel-selector field" ref={rootRef}>
      <span id={fieldLabelId}>{c.fields.hotels}</span>
      <button
        type="button"
        className="hotel-selector-trigger"
        ref={triggerRef}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-controls={panelId}
        aria-labelledby={`${fieldLabelId} ${summaryId}`}
        data-invalid={invalid || undefined}
        aria-describedby={describedBy}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span>
          <strong id={summaryId}>
            {describeHotelSelection(selectedHotelCodes, locale)}
          </strong>
          <small>
            {formatMessage(c.hotels.selectedCount, {
              selected: selectedHotelCodes.length,
              total: ACTIVE_HOTELS.length,
            })}
          </small>
        </span>
        <span className="selector-chevron" aria-hidden="true" />
      </button>

      {isOpen && (
        <div
          className="hotel-selector-panel"
          id={panelId}
          role="group"
          aria-labelledby={panelTitleId}
        >
          <div className="hotel-selector-heading">
            <div>
              <strong id={panelTitleId}>{c.hotels.panelTitle}</strong>
              <span>{c.hotels.panelHint}</span>
            </div>
            <button
              type="button"
              className="text-button"
              onClick={() => {
                setIsOpen(false);
                triggerRef.current?.focus();
              }}
            >
              {c.hotels.done}
            </button>
          </div>

          <label className="hotel-global-select">
            <input
              type="checkbox"
              checked={allHotelsSelected}
              ref={(element) => {
                if (element) element.indeterminate = someHotelsSelected;
              }}
              onChange={(event) => toggleAllHotels(event.target.checked)}
            />
            <span>
              <strong>{c.hotels.allHotels}</strong>
              <small>
                {formatMessage(c.hotels.selectedCount, {
                  selected: selectedHotelCodes.length,
                  total: ACTIVE_HOTELS.length,
                })}
              </small>
            </span>
          </label>

          <div className="hotel-region-groups">
            {REGION_GROUPS.map((region) => {
              const selectedCount = region.hotels.filter((hotel) =>
                selectedSet.has(hotel.hotelCode),
              ).length;
              const allSelected = selectedCount === region.hotels.length;
              const partlySelected = selectedCount > 0 && !allSelected;
              const isExpanded = expandedRegions.has(region.id);
              const listId = `${panelId}-${region.id}`;

              return (
                <section className="hotel-region-group" key={region.id}>
                  <div className="hotel-region-heading">
                    <button
                      type="button"
                      className="hotel-region-toggle"
                      aria-expanded={isExpanded}
                      aria-controls={listId}
                      onClick={() => toggleExpanded(region.id)}
                    >
                      <span
                        className={`region-chevron${isExpanded ? " is-expanded" : ""}`}
                        aria-hidden="true"
                      />
                      <strong>{regionName(region.id, locale)}</strong>
                      <span>
                        {selectedCount} / {region.hotels.length}
                      </span>
                    </button>

                    <label className="region-select-all">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        ref={(element) => {
                          if (element) element.indeterminate = partlySelected;
                        }}
                        onChange={(event) =>
                          toggleRegion(region.id, event.target.checked)
                        }
                      />
                      <span>{c.hotels.selectAll}</span>
                    </label>
                  </div>

                  {isExpanded && (
                    <div className="hotel-option-list" id={listId}>
                      {region.hotels.map((hotel) => (
                        <label className="hotel-option" key={hotel.hotelCode}>
                          <input
                            type="checkbox"
                            name="hotelCodes"
                            value={hotel.hotelCode}
                            checked={selectedSet.has(hotel.hotelCode)}
                            onChange={(event) =>
                              toggleHotel(hotel.hotelCode, event.target.checked)
                            }
                          />
                          <span className="hotel-option-check" aria-hidden="true" />
                          <span>
                            <strong>{hotelName(hotel, locale)}</strong>
                            <small>
                              {c.hotel.code} {hotel.hotelCode}
                            </small>
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
