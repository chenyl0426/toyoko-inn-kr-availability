"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { DateRangePicker } from "@/app/date-range-picker";
import { LanguageSwitcher, useI18n } from "@/app/i18n-provider";
import {
  HotelSelector,
  describeHotelSelection,
} from "@/app/hotel-selector";
import {
  FORM_LIMITS,
  HOTELS,
  REGION_OPTIONS,
  hotelCity,
  hotelName,
  hotelsForCodes,
  hotelsForRegion,
  normalizeHotelCodes,
  regionName,
} from "@/lib/hotels";
import { formatMessage, isLocale } from "@/lib/i18n";
import { planName, roomName } from "@/lib/toyoko-translations";
import type {
  ErrorType,
  Hotel,
  HotelAvailability,
  Locale,
  RoomOffer,
  SearchCriteria,
  SmokingPreference,
  UiHotelState,
} from "@/lib/types";

type HistoryCriteria = Omit<SearchCriteria, "requestedAt">;
type ResultView = "all" | "available" | "failed";

const HISTORY_KEY = "toyoko-korea-search-history-v3";
const LEGACY_HISTORY_KEYS = [
  "toyoko-korea-search-history-v2",
  "toyoko-korea-search-history-v1",
];
const MAX_HISTORY = 10;
const MAX_CONCURRENCY = 3;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ACTIVE_HOTEL_CODES = normalizeHotelCodes(
  HOTELS.map((hotel) => hotel.hotelCode),
);
const DEFAULT_HOTEL_CODES = hotelsForRegion("seoul").map(
  (hotel) => hotel.hotelCode,
);

function historySignature(item: HistoryCriteria) {
  return [
    item.hotelCodes.join(","),
    item.checkIn,
    item.checkOut,
    item.adultsPerRoom,
    item.roomCount,
    item.smokingPreference,
  ].join("|");
}

function normalizeSmokingPreference(
  value: unknown,
): SmokingPreference | null {
  if (value === "any" || value === "nonSmoking" || value === "smoking") {
    return value;
  }
  if (value === "nonSmokingPreferred") return "nonSmoking";
  if (value === "smokingOnly") return "smoking";
  return null;
}

function normalizeHistoryCriteria(value: unknown): HistoryCriteria | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  const smokingPreference = normalizeSmokingPreference(
    item.smokingPreference,
  );
  const checkIn = item.checkIn;
  const checkOut = item.checkOut;
  const adultsPerRoom = item.adultsPerRoom;
  const roomCount = item.roomCount;

  let hotelCodes: string[] = [];
  if (Array.isArray(item.hotelCodes)) {
    hotelCodes = normalizeHotelCodes(
      item.hotelCodes.filter((code): code is string => typeof code === "string"),
    );
  } else if (typeof item.regionId === "string") {
    const legacyRegion = REGION_OPTIONS.find(
      (region) => region.id === item.regionId,
    );
    if (legacyRegion) {
      hotelCodes = hotelsForRegion(legacyRegion.id).map(
        (hotel) => hotel.hotelCode,
      );
    }
  }

  if (
    hotelCodes.length === 0 ||
    typeof checkIn !== "string" ||
    typeof checkOut !== "string" ||
    !isValidDate(checkIn) ||
    !isValidDate(checkOut) ||
    checkOut <= checkIn ||
    typeof adultsPerRoom !== "number" ||
    !Number.isInteger(adultsPerRoom) ||
    adultsPerRoom < FORM_LIMITS.adultsPerRoom.min ||
    adultsPerRoom > FORM_LIMITS.adultsPerRoom.max ||
    typeof roomCount !== "number" ||
    !Number.isInteger(roomCount) ||
    roomCount < FORM_LIMITS.roomCount.min ||
    roomCount > FORM_LIMITS.roomCount.max ||
    !smokingPreference
  ) {
    return null;
  }

  return {
    hotelCodes,
    checkIn,
    checkOut,
    adultsPerRoom,
    roomCount,
    smokingPreference,
    locale: isLocale(item.locale) ? item.locale : "zh-CN",
  };
}

function isValidDate(date: string) {
  if (!ISO_DATE_PATTERN.test(date)) return false;
  const value = new Date(`${date}T00:00:00Z`);
  return (
    Number.isFinite(value.getTime()) &&
    value.toISOString().slice(0, 10) === date
  );
}

function addDays(date: string, days: number) {
  if (!isValidDate(date)) return "";
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function koreaToday() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(new Date())
    .reduce<Record<string, string>>((result, part) => {
      result[part.type] = part.value;
      return result;
    }, {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function defaultDates() {
  const today = koreaToday();
  const checkIn = addDays(today, 1);
  return { checkIn, checkOut: addDays(checkIn, 1) };
}

function nightsBetween(checkIn: string, checkOut: string) {
  if (!isValidDate(checkIn) || !isValidDate(checkOut)) return 0;
  const difference =
    Date.parse(`${checkOut}T00:00:00Z`) -
    Date.parse(`${checkIn}T00:00:00Z`);
  return Math.max(0, Math.round(difference / 86_400_000));
}

function formatDate(date: string, locale: Locale, emptyLabel: string) {
  if (!isValidDate(date)) return emptyLabel;
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    weekday: "short",
    timeZone: "Asia/Seoul",
  }).format(new Date(`${date}T00:00:00+09:00`));
}

function formatKoreaTime(date: string | number, locale: Locale) {
  return new Intl.DateTimeFormat(locale, {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "Asia/Seoul",
  }).format(new Date(date));
}

function formatKrw(amount: number, locale: Locale) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(amount);
}

function pluralUnit(
  count: number,
  locale: Locale,
  one: string,
  other: string,
) {
  return new Intl.PluralRules(locale).select(count) === "one" ? one : other;
}

function visibleOffersForPreference(
  result: HotelAvailability,
  preference: SmokingPreference,
) {
  return result.offers
    .filter(
      (offer) =>
        preference === "any" || offer.smokingType === preference,
    )
    .sort((a, b) => a.priceAmount - b.priceAmount);
}

function toCompletedState(
  hotel: Hotel,
  result: HotelAvailability,
  preference: SmokingPreference,
): UiHotelState {
  const visibleOffers = visibleOffersForPreference(result, preference);
  return {
    phase: "completed",
    hotel,
    result,
    visibleOffers,
    preferenceNoMatch:
      result.status === "available" && visibleOffers.length === 0,
  };
}

function unknownFailure(hotel: Hotel): HotelAvailability {
  return {
    hotelCode: hotel.hotelCode,
    status: "failed",
    offers: [],
    sourceQueriedAt: new Date().toISOString(),
    durationMs: 0,
    errorType: "unknown",
    sourceUrl: hotel.officialDetailUrl,
  };
}

function StatusPill({
  tone,
  children,
}: {
  tone: "live" | "muted" | "warning" | "error";
  children: React.ReactNode;
}) {
  return <span className={`status-pill status-${tone}`}>{children}</span>;
}

type RoomGroupData = {
  key: string;
  representative: RoomOffer;
  plans: RoomOffer[];
};

function groupOffers(offers: RoomOffer[]): RoomGroupData[] {
  const groups = new Map<string, RoomGroupData>();
  offers.forEach((offer) => {
    const key = `${offer.roomTypeId ?? offer.roomTypeSource}-${offer.smokingType}`;
    const existing = groups.get(key);
    if (existing) {
      existing.plans.push(offer);
    } else {
      groups.set(key, { key, representative: offer, plans: [offer] });
    }
  });
  return Array.from(groups.values());
}

function RoomImage({ offer }: { offer: RoomOffer }) {
  const { locale, messages: c } = useI18n();
  const [hasError, setHasError] = useState(false);
  const localizedRoomName = roomName(offer.roomTypeSource, locale);
  if (!offer.roomImageUrl || hasError) {
    return (
      <div className="room-image-placeholder" aria-hidden="true">
        {c.roomPlaceholder}
      </div>
    );
  }

  return (
    // The official image URL is dynamic and should be loaded directly.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className="room-image"
      src={offer.roomImageUrl}
      alt={formatMessage(c.roomImageAlt, { room: localizedRoomName })}
      width={144}
      height={144}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
    />
  );
}

function PlanRow({ offer }: { offer: RoomOffer }) {
  const { locale, messages: c } = useI18n();
  const stock = Math.max(
    offer.generalVacantRoom,
    offer.membershipVacantRoom,
  );
  return (
    <article className="plan-row">
      <div className="plan-main">
        <span className="plan-kicker">{c.offer.officialPlanName}</span>
        <strong>{planName(offer.planNameSource, locale)}</strong>
        <span className="plan-source">
          {c.offer.officialPlanSource}: {offer.planNameSource}
        </span>
        {offer.qualificationNote && (
          <p className="qualification-note">{c.offer.qualificationNote}</p>
        )}
      </div>

      <div className="offer-price">
        <span className="price-basis">
          {offer.priceBasis === "stayTotal"
            ? c.offer.stayTotal
            : c.offer.unknownBasis}
        </span>
        <strong>
          {formatKrw(
            offer.generalPrice ?? offer.membershipPrice ?? 0,
            locale,
          )}
        </strong>
        <div className="price-labels">
          {offer.generalPrice && (
            <span>
              {c.offer.generalPrice} {formatKrw(offer.generalPrice, locale)}
            </span>
          )}
          {offer.membershipPrice && (
            <span>
              {c.offer.membershipPrice}{" "}
              {formatKrw(offer.membershipPrice, locale)}
            </span>
          )}
        </div>
        <span className="stock-note">
          {formatMessage(c.offer.stock, { count: stock })}
        </span>
      </div>

      <div className="offer-action">
        <a
          href={offer.bookingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="button button-primary button-small"
        >
          {c.offer.book} <span aria-hidden="true">↗</span>
        </a>
        <p>{c.offer.bookingNote}</p>
      </div>
    </article>
  );
}

function RoomGroup({ group }: { group: RoomGroupData }) {
  const { locale, messages: c } = useI18n();
  const { representative: room, plans } = group;

  return (
    <section className="room-group">
      <div className="room-overview">
        <RoomImage offer={room} />
        <div className="room-heading">
          <div className="offer-title-line">
            <h4>{roomName(room.roomTypeSource, locale)}</h4>
            <span className={`smoking-tag smoking-${room.smokingType}`}>
              {c.smoking[room.smokingType]}
            </span>
          </div>
          <p className="source-name">
            {c.offer.officialRoomName}: {room.roomTypeSource}
          </p>
          <span className="room-plan-count">
            {formatMessage(c.units.roomPlanCount, {
              count: plans.length,
              planUnit: pluralUnit(
                plans.length,
                locale,
                c.units.planOne,
                c.units.planOther,
              ),
            })}
          </span>
        </div>
      </div>
      <div className="room-plans">
        {plans.map((offer, index) => (
          <PlanRow
            offer={offer}
            key={`${offer.planId ?? offer.planNameSource}-${index}`}
          />
        ))}
      </div>
    </section>
  );
}

function HotelCard({
  state,
  onRetry,
  retrying,
}: {
  state: UiHotelState;
  onRetry: (hotel: Hotel) => void;
  retrying: boolean;
}) {
  const { locale, messages: c } = useI18n();
  const { hotel } = state;
  const statusText = (errorType: ErrorType | null) =>
    errorType ? c.errors[errorType] : c.hotel.failed;
  const roomGroups =
    state.phase === "completed" ? groupOffers(state.visibleOffers) : [];
  return (
    <section
      className="hotel-card"
      aria-labelledby={`hotel-${hotel.hotelCode}`}
    >
      <div className="hotel-card-header">
        <div>
          <div className="hotel-location">
            <span>{hotelCity(hotel, locale)}</span>
            <span>·</span>
            <span>
              {c.hotel.code} {hotel.hotelCode}
            </span>
          </div>
          <h3 id={`hotel-${hotel.hotelCode}`}>
            {hotelName(hotel, locale)}
          </h3>
          <p>{hotel.nameSource}</p>
        </div>
        <a
          href={hotel.officialDetailUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-link"
        >
          {c.hotel.officialDetail} <span aria-hidden="true">↗</span>
        </a>
      </div>

      {state.phase !== "completed" ? (
        <div className="hotel-loading" aria-live="polite">
          <span className="loader-dot" aria-hidden="true" />
          <div>
            <strong>
              {state.phase === "waiting"
                ? c.hotel.waiting
                : c.hotel.querying}
            </strong>
            <span className="loading-line" />
          </div>
        </div>
      ) : (
        <>
          <div className="hotel-result-summary">
            <div>
              {state.preferenceNoMatch ? (
                <StatusPill tone="warning">
                  {c.results.noPreferenceMatch}
                </StatusPill>
              ) : state.result.status === "available" ? (
                <StatusPill tone="live">{c.hotel.available}</StatusPill>
              ) : state.result.status === "soldOut" ? (
                <StatusPill tone="muted">{c.hotel.soldOut}</StatusPill>
              ) : (
                <StatusPill tone="error">{c.hotel.failed}</StatusPill>
              )}
              {state.result.status === "available" && (
                <span className="offer-count">
                  {formatMessage(c.hotel.plans, {
                    rooms: roomGroups.length,
                    plans: state.visibleOffers.length,
                    roomTypeUnit: pluralUnit(
                      roomGroups.length,
                      locale,
                      c.units.roomTypeOne,
                      c.units.roomTypeOther,
                    ),
                    planUnit: pluralUnit(
                      state.visibleOffers.length,
                      locale,
                      c.units.planOne,
                      c.units.planOther,
                    ),
                  })}
                </span>
              )}
            </div>
            <span className="queried-at">
              {formatMessage(c.hotel.queriedAt, {
                time: formatKoreaTime(state.result.sourceQueriedAt, locale),
              })}
              <span aria-hidden="true"> · </span>
              {formatMessage(c.units.seconds, {
                seconds: (state.result.durationMs / 1000).toFixed(1),
              })}
            </span>
          </div>

          {state.preferenceNoMatch && (
            <div className="empty-state compact">
              <p>{c.hotel.noPreference}</p>
              <a
                href={state.result.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-link"
              >
                {c.hotel.confirmOfficial} ↗
              </a>
            </div>
          )}

          {state.result.status === "soldOut" && (
            <div className="empty-state">
              <span className="empty-mark" aria-hidden="true">
                0
              </span>
              <div>
                <strong>{c.hotel.soldOut}</strong>
                <a
                  href={state.result.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-link"
                >
                  {c.hotel.confirmOfficial} ↗
                </a>
              </div>
            </div>
          )}

          {state.result.status === "failed" && (
            <div className="failure-state">
              <div>
                <span className="failure-symbol" aria-hidden="true">
                  ×
                </span>
                <div>
                  <strong>{c.hotel.failed}</strong>
                  <p>{statusText(state.result.errorType)}</p>
                </div>
              </div>
              <button
                type="button"
                className="button button-secondary button-small"
                onClick={() => onRetry(hotel)}
                disabled={retrying}
              >
                {retrying ? c.searching : c.hotel.retry}
              </button>
            </div>
          )}

          {state.visibleOffers.length > 0 && (
            <div className="offer-list">
              {roomGroups.map((group) => (
                <RoomGroup group={group} key={group.key} />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}

export default function Home() {
  const { locale, messages: c } = useI18n();
  const [initialDates] = useState(defaultDates);
  const [selectedHotelCodes, setSelectedHotelCodes] =
    useState<string[]>(DEFAULT_HOTEL_CODES);
  const [checkIn, setCheckIn] = useState(initialDates.checkIn);
  const [checkOut, setCheckOut] = useState(initialDates.checkOut);
  const [adultsPerRoom, setAdultsPerRoom] = useState(1);
  const [roomCount, setRoomCount] = useState(1);
  const [smokingPreference, setSmokingPreference] =
    useState<SmokingPreference>("any");
  const [formError, setFormError] = useState("");
  const [history, setHistory] = useState<HistoryCriteria[]>([]);
  const [hotelStates, setHotelStates] = useState<UiHotelState[]>([]);
  const [queryCriteria, setQueryCriteria] = useState<SearchCriteria | null>(
    null,
  );
  const [queryStartedAt, setQueryStartedAt] = useState<number | null>(null);
  const [totalDuration, setTotalDuration] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [resultView, setResultView] = useState<ResultView>("all");
  const [retryingCodes, setRetryingCodes] = useState<Set<string>>(new Set());
  const resultsRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const previousLocaleRef = useRef(locale);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const readHistory = (key: string) => {
        try {
          const stored: unknown = JSON.parse(
            localStorage.getItem(key) ?? "[]",
          );
          return Array.isArray(stored)
            ? stored
                .map(normalizeHistoryCriteria)
                .filter((item): item is HistoryCriteria => item !== null)
            : [];
        } catch {
          try {
            localStorage.removeItem(key);
          } catch {
            // Search history is optional when browser storage is unavailable.
          }
          return [];
        }
      };

      const current = readHistory(HISTORY_KEY);
      const migratedFromLegacy = current.length === 0;
      const candidates = migratedFromLegacy
        ? LEGACY_HISTORY_KEYS.flatMap(readHistory)
        : current;
      const seen = new Set<string>();
      const deduped = candidates.filter((item) => {
        const signature = historySignature(item);
        if (seen.has(signature)) return false;
        seen.add(signature);
        return true;
      });
      const next = deduped.slice(0, MAX_HISTORY);
      setHistory(next);
      if (next[0]) setSelectedHotelCodes([...next[0].hotelCodes]);

      if (migratedFromLegacy && next.length > 0) {
        try {
          localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
        } catch {
          // Search history is optional when browser storage is unavailable.
        }
      }
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (previousLocaleRef.current === locale) return;
    previousLocaleRef.current = locale;
    const frame = requestAnimationFrame(() => setFormError(""));
    return () => cancelAnimationFrame(frame);
  }, [locale]);

  useEffect(() => {
    const timers = new Set<number>();
    const rippleSelector =
      ".button, .edit-fab, .history-chip, .view-tabs button, .text-button";

    const startRipple = (control: HTMLElement, x: number, y: number) => {
      const rect = control.getBoundingClientRect();
      const radius = Math.hypot(
        Math.max(x, rect.width - x),
        Math.max(y, rect.height - y),
      );
      control.style.setProperty("--ripple-x", `${x}px`);
      control.style.setProperty("--ripple-y", `${y}px`);
      control.style.setProperty("--ripple-scale", String(radius / 6));
      control.classList.remove("is-rippling");
      void control.offsetWidth;
      control.classList.add("is-rippling");
      const timer = window.setTimeout(() => {
        control.classList.remove("is-rippling");
        timers.delete(timer);
      }, 560);
      timers.add(timer);
    };

    const handlePointerDown = (event: PointerEvent) => {
      const control = (event.target as Element).closest<HTMLElement>(
        rippleSelector,
      );
      if (!control || control.matches(":disabled")) return;
      const rect = control.getBoundingClientRect();
      startRipple(control, event.clientX - rect.left, event.clientY - rect.top);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      const control = (event.target as Element).closest<HTMLElement>(
        rippleSelector,
      );
      if (!control || control.matches(":disabled")) return;
      const rect = control.getBoundingClientRect();
      startRipple(control, rect.width / 2, rect.height / 2);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  const nights = nightsBetween(checkIn, checkOut);
  const totalAdults = adultsPerRoom * roomCount;
  const completedCount = hotelStates.filter(
    (state) => state.phase === "completed",
  ).length;
  const failedCount = hotelStates.filter(
    (state) =>
      state.phase === "completed" && state.result.status === "failed",
  ).length;
  const sourceAvailableCount = hotelStates.filter(
    (state) =>
      state.phase === "completed" &&
      state.result.status === "available",
  ).length;
  const matchingAvailableCount = hotelStates.filter(
    (state) =>
      state.phase === "completed" &&
      state.result.status === "available" &&
      state.visibleOffers.length > 0,
  ).length;
  const allCompleted =
    hotelStates.length > 0 && completedCount === hotelStates.length;
  const availabilityState = !allCompleted
    ? { className: "is-pending", label: c.results.searching }
    : matchingAvailableCount > 0
      ? { className: "is-available", label: c.results.hasRoom }
      : sourceAvailableCount > 0
        ? { className: "is-warning", label: c.results.noPreferenceMatch }
      : failedCount > 0
        ? { className: "is-warning", label: c.results.incomplete }
        : { className: "is-none", label: c.results.noRoom };

  const showFieldErrors = Boolean(formError);
  const hotelSelectionInvalid =
    showFieldErrors && selectedHotelCodes.length === 0;
  const checkInInvalid =
    showFieldErrors &&
    (!isValidDate(checkIn) || checkIn < koreaToday());
  const checkOutInvalid =
    showFieldErrors &&
    (!isValidDate(checkOut) || checkOut <= checkIn);
  const adultsInvalid =
    showFieldErrors &&
    (!Number.isInteger(adultsPerRoom) ||
      adultsPerRoom < FORM_LIMITS.adultsPerRoom.min ||
      adultsPerRoom > FORM_LIMITS.adultsPerRoom.max);
  const roomsInvalid =
    showFieldErrors &&
    (!Number.isInteger(roomCount) ||
      roomCount < FORM_LIMITS.roomCount.min ||
      roomCount > FORM_LIMITS.roomCount.max);

  const visibleHotelStates = useMemo(() => {
    if (resultView === "all") return hotelStates;
    return hotelStates.filter((state) => {
      if (state.phase !== "completed") return false;
      if (resultView === "failed") return state.result.status === "failed";
      return (
        state.result.status === "available" &&
        state.visibleOffers.length > 0
      );
    });
  }, [hotelStates, resultView]);

  function currentCriteria(): SearchCriteria {
    return {
      hotelCodes: [...selectedHotelCodes],
      checkIn,
      checkOut,
      adultsPerRoom,
      roomCount,
      smokingPreference,
      locale,
      requestedAt: new Date().toISOString(),
    };
  }

  function validate(criteria: SearchCriteria) {
    if (criteria.hotelCodes.length === 0) return c.form.noHotels;
    if (
      normalizeHotelCodes(criteria.hotelCodes).length !==
        criteria.hotelCodes.length ||
      !criteria.checkIn ||
      !criteria.checkOut ||
      !criteria.adultsPerRoom ||
      !criteria.roomCount
    ) {
      return c.form.required;
    }
    if (
      !isValidDate(criteria.checkIn) ||
      !isValidDate(criteria.checkOut)
    ) {
      return c.form.invalidDate;
    }
    if (criteria.checkIn < koreaToday()) return c.form.checkInPast;
    if (criteria.checkOut <= criteria.checkIn) return c.form.invalidCheckOut;
    if (
      !Number.isInteger(criteria.adultsPerRoom) ||
      criteria.adultsPerRoom < FORM_LIMITS.adultsPerRoom.min ||
      criteria.adultsPerRoom > FORM_LIMITS.adultsPerRoom.max ||
      !Number.isInteger(criteria.roomCount) ||
      criteria.roomCount < FORM_LIMITS.roomCount.min ||
      criteria.roomCount > FORM_LIMITS.roomCount.max
    ) {
      return c.form.required;
    }
    return "";
  }

  function saveHistory(criteria: SearchCriteria) {
    const value: HistoryCriteria = {
      hotelCodes: [...criteria.hotelCodes],
      checkIn: criteria.checkIn,
      checkOut: criteria.checkOut,
      adultsPerRoom: criteria.adultsPerRoom,
      roomCount: criteria.roomCount,
      smokingPreference: criteria.smokingPreference,
      locale: criteria.locale,
    };
    const signature = historySignature(value);
    const next = [
      value,
      ...history.filter((item) => historySignature(item) !== signature),
    ].slice(0, MAX_HISTORY);
    setHistory(next);
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    } catch {
      // Search history is optional when browser storage is unavailable.
    }
  }

  async function fetchHotel(
    hotel: Hotel,
    criteria: SearchCriteria,
  ): Promise<HotelAvailability> {
    const params = new URLSearchParams({
      hotelCode: hotel.hotelCode,
      checkIn: criteria.checkIn,
      checkOut: criteria.checkOut,
      adultsPerRoom: String(criteria.adultsPerRoom),
      roomCount: String(criteria.roomCount),
    });
    const response = await fetch(`/api/availability?${params}`, {
      method: "GET",
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return (await response.json()) as HotelAvailability;
  }

  async function runSearch(criteria: SearchCriteria) {
    const error = validate(criteria);
    if (error) {
      setFormError(error);
      return;
    }

    const hotels = hotelsForCodes(criteria.hotelCodes);
    const startedAt = Date.now();
    const collected: HotelAvailability[] = [];
    let cursor = 0;

    setFormError("");
    setIsRunning(true);
    setQueryCriteria(criteria);
    setQueryStartedAt(startedAt);
    setTotalDuration(null);
    setResultView("all");
    setHotelStates(hotels.map((hotel) => ({ phase: "waiting", hotel })));

    requestAnimationFrame(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    const worker = async () => {
      while (cursor < hotels.length) {
        const hotel = hotels[cursor++];
        setHotelStates((states) =>
          states.map((state) =>
            state.hotel.hotelCode === hotel.hotelCode
              ? { phase: "querying", hotel }
              : state,
          ),
        );

        let result: HotelAvailability;
        try {
          result = await fetchHotel(hotel, criteria);
        } catch {
          result = unknownFailure(hotel);
        }
        collected.push(result);
        setHotelStates((states) =>
          states.map((state) =>
            state.hotel.hotelCode === hotel.hotelCode
              ? toCompletedState(hotel, result, criteria.smokingPreference)
              : state,
          ),
        );
      }
    };

    await Promise.all(
      Array.from({ length: Math.min(MAX_CONCURRENCY, hotels.length) }, worker),
    );
    setTotalDuration(Date.now() - startedAt);
    setIsRunning(false);
    if (collected.some((result) => result.status !== "failed")) {
      saveHistory(criteria);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!isRunning) await runSearch(currentCriteria());
  }

  async function retryHotel(hotel: Hotel) {
    if (!queryCriteria || retryingCodes.has(hotel.hotelCode)) return;
    setRetryingCodes((codes) => new Set(codes).add(hotel.hotelCode));
    setHotelStates((states) =>
      states.map((state) =>
        state.hotel.hotelCode === hotel.hotelCode
          ? { phase: "querying", hotel }
          : state,
      ),
    );

    try {
      let result: HotelAvailability;
      try {
        result = await fetchHotel(hotel, {
          ...queryCriteria,
          requestedAt: new Date().toISOString(),
        });
      } catch {
        result = unknownFailure(hotel);
      }
      setHotelStates((states) => {
        return states.map((state) =>
          state.hotel.hotelCode === hotel.hotelCode
            ? toCompletedState(
                hotel,
                result,
                queryCriteria.smokingPreference,
              )
            : state,
        );
      });
    } finally {
      setRetryingCodes((codes) => {
        const next = new Set(codes);
        next.delete(hotel.hotelCode);
        return next;
      });
    }
  }

  function applyHistory(item: HistoryCriteria) {
    setSelectedHotelCodes([...item.hotelCodes]);
    setCheckIn(item.checkIn);
    setCheckOut(item.checkOut);
    setAdultsPerRoom(item.adultsPerRoom);
    setRoomCount(item.roomCount);
    setSmokingPreference(item.smokingPreference);
    setFormError("");
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function clearHistory() {
    setHistory([]);
    try {
      localStorage.removeItem(HISTORY_KEY);
      LEGACY_HISTORY_KEYS.forEach((key) => localStorage.removeItem(key));
    } catch {
      // The in-memory history is still cleared.
    }
  }

  function scrollToSearchForm() {
    formRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }

  return (
    <>
      <a className="skip-link" href="#search-form">
        {c.skipToSearch}
      </a>
      <header className="site-header">
        <a href="#" className="wordmark" aria-label={c.productName}>
          <span className="wordmark-mark">{c.brandMark}</span>
          <span className="wordmark-copy">
            <strong>{c.brand}</strong>
            <small>{c.brandUtility}</small>
          </span>
        </a>
        <div className="header-actions">
          <div className="header-note">
            <span className="live-dot" aria-hidden="true" />
            {c.unofficial}
          </div>
          <LanguageSwitcher />
        </div>
      </header>

      <main id="main-content">
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">{c.heroEyebrow}</p>
            <h1>{c.heroTitle}</h1>
            <p className="hero-description">{c.heroDescription}</p>

            <div className="city-route" aria-label={c.supportedRegions}>
              {REGION_OPTIONS.filter((region) => region.id !== "all").map(
                (region) => (
                  <span className="route-stop" key={region.id}>
                    <span aria-hidden="true" />
                    {regionName(region.id, locale)}
                  </span>
                ),
              )}
            </div>

            <div className="trust-row">
              <span>✓ {c.liveData}</span>
              <span>✓ {c.unofficial}</span>
            </div>
          </div>

        <div
          className="search-shell"
          id="search-form"
          ref={formRef}
          tabIndex={-1}
        >
          <div className="search-shell-heading">
            <div>
              <span className="surface-label">
                <span className="live-dot" aria-hidden="true" />
                {c.results.live}
              </span>
              <h2>{c.form.title}</h2>
            </div>
            <p>{c.form.subtitle}</p>
          </div>

          <form
            onSubmit={handleSubmit}
            noValidate
            aria-describedby={formError ? "search-form-error" : undefined}
          >
            <div className="form-grid">
              <HotelSelector
                selectedHotelCodes={selectedHotelCodes}
                invalid={hotelSelectionInvalid}
                describedBy={formError ? "search-form-error" : undefined}
                onChange={(hotelCodes) => {
                  setSelectedHotelCodes(hotelCodes);
                  if (
                    hotelCodes.length > 0 &&
                    formError === c.form.noHotels
                  ) {
                    setFormError("");
                  }
                }}
              />

              <DateRangePicker
                checkIn={checkIn}
                checkOut={checkOut}
                minDate={koreaToday()}
                checkInInvalid={checkInInvalid}
                checkOutInvalid={checkOutInvalid}
                describedBy={formError ? "search-form-error" : undefined}
                onCheckInChange={setCheckIn}
                onCheckOutChange={setCheckOut}
              />

              <div className="night-count" aria-live="polite">
                <strong>{nights}</strong>
                <span>
                  {pluralUnit(
                    nights,
                    locale,
                    c.units.nightOne,
                    c.units.nightOther,
                  )}
                </span>
              </div>

              <label className="field">
                <span>{c.fields.adultsPerRoom}</span>
                <select
                  name="adultsPerRoom"
                  required
                  aria-invalid={adultsInvalid}
                  aria-describedby={formError ? "search-form-error" : undefined}
                  value={adultsPerRoom}
                  onChange={(event) =>
                    setAdultsPerRoom(Number(event.target.value))
                  }
                >
                  {Array.from(
                    {
                      length:
                        FORM_LIMITS.adultsPerRoom.max -
                        FORM_LIMITS.adultsPerRoom.min +
                        1,
                    },
                    (_, index) => FORM_LIMITS.adultsPerRoom.min + index,
                  ).map((value) => (
                    <option value={value} key={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>{c.fields.roomCount}</span>
                <select
                  name="roomCount"
                  required
                  aria-invalid={roomsInvalid}
                  aria-describedby={formError ? "search-form-error" : undefined}
                  value={roomCount}
                  onChange={(event) =>
                    setRoomCount(Number(event.target.value))
                  }
                >
                  {Array.from(
                    {
                      length:
                        FORM_LIMITS.roomCount.max -
                        FORM_LIMITS.roomCount.min +
                        1,
                    },
                    (_, index) => FORM_LIMITS.roomCount.min + index,
                  ).map((value) => (
                    <option value={value} key={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="room-summary">
              <strong>
                {formatMessage(c.form.roomsSummary, {
                  adults: adultsPerRoom,
                  rooms: roomCount,
                  total: totalAdults,
                  adultUnit: pluralUnit(
                    adultsPerRoom,
                    locale,
                    c.units.adultOne,
                    c.units.adultOther,
                  ),
                  roomUnit: pluralUnit(
                    roomCount,
                    locale,
                    c.units.roomOne,
                    c.units.roomOther,
                  ),
                  totalAdultUnit: pluralUnit(
                    totalAdults,
                    locale,
                    c.units.adultOne,
                    c.units.adultOther,
                  ),
                })}
              </strong>
              <span>{c.form.childNote}</span>
            </div>

            <fieldset className="smoking-fieldset">
              <legend>{c.fields.smokingPreference}</legend>
              <div className="segmented-control">
                {(
                  ["any", "nonSmoking", "smoking"] as SmokingPreference[]
                ).map((value) => (
                  <label key={value}>
                    <input
                      type="radio"
                      name="smokingPreference"
                      value={value}
                      checked={smokingPreference === value}
                      onChange={() => setSmokingPreference(value)}
                    />
                    <span>{c.smoking[value]}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            {selectedHotelCodes.length === ACTIVE_HOTEL_CODES.length && (
              <p className="all-notice">{c.allLongNotice}</p>
            )}
            {formError && (
              <p className="form-error" id="search-form-error" role="alert">
                {formError}
              </p>
            )}

            <button
              type="submit"
              className="button button-primary search-button"
              disabled={isRunning}
            >
              <span>{isRunning ? c.searching : c.search}</span>
              <span className="button-arrow" aria-hidden="true">
                →
              </span>
            </button>
          </form>
        </div>
        </section>

      <section className="history-section" aria-labelledby="history-title">
        <div className="section-heading-inline">
          <h2 id="history-title">{c.history.title}</h2>
          {history.length > 0 && (
            <button type="button" className="text-button" onClick={clearHistory}>
              {c.clearHistory}
            </button>
          )}
        </div>
        {history.length === 0 ? (
          <p className="history-empty">{c.noHistory}</p>
        ) : (
          <div className="history-list">
            {history.map((item) => (
              <button
                type="button"
                className="history-chip"
                onClick={() => applyHistory(item)}
                key={historySignature(item)}
              >
                <strong>
                  {describeHotelSelection(item.hotelCodes, locale)}
                </strong>
                <span>
                  {formatDate(item.checkIn, locale, c.dateIncomplete)} —{" "}
                  {formatDate(item.checkOut, locale, c.dateIncomplete)}
                </span>
                <span>
                  {formatMessage(c.units.peopleRooms, {
                    adults: item.adultsPerRoom,
                    rooms: item.roomCount,
                    adultUnit: pluralUnit(
                      item.adultsPerRoom,
                      locale,
                      c.units.adultOne,
                      c.units.adultOther,
                    ),
                    roomUnit: pluralUnit(
                      item.roomCount,
                      locale,
                      c.units.roomOne,
                      c.units.roomOther,
                    ),
                  })}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      {queryCriteria && (
        <section className="results-section" ref={resultsRef}>
          <div className="results-topbar">
            <div>
              <div className="results-title-line">
                <p className="eyebrow">{c.results.live}</p>
                <h2>{c.results.title}</h2>
                <span
                  className={`availability-banner ${availabilityState.className}`}
                  aria-live="polite"
                >
                  <span className="availability-dot" aria-hidden="true" />
                  {availabilityState.label}
                </span>
              </div>
              <p className="criteria-summary">
                {describeHotelSelection(queryCriteria.hotelCodes, locale)}
                <span>·</span>
                {formatDate(
                  queryCriteria.checkIn,
                  locale,
                  c.dateIncomplete,
                )}{" "}
                —{" "}
                {formatDate(
                  queryCriteria.checkOut,
                  locale,
                  c.dateIncomplete,
                )}
                <span>·</span>
                {(() => {
                  const nightCount = nightsBetween(
                    queryCriteria.checkIn,
                    queryCriteria.checkOut,
                  );
                  return formatMessage(c.units.nightCount, {
                    count: nightCount,
                    nightUnit: pluralUnit(
                      nightCount,
                      locale,
                      c.units.nightOne,
                      c.units.nightOther,
                    ),
                  });
                })()}
                <span>·</span>
                {formatMessage(c.units.peopleRooms, {
                  adults: queryCriteria.adultsPerRoom,
                  rooms: queryCriteria.roomCount,
                  adultUnit: pluralUnit(
                    queryCriteria.adultsPerRoom,
                    locale,
                    c.units.adultOne,
                    c.units.adultOther,
                  ),
                  roomUnit: pluralUnit(
                    queryCriteria.roomCount,
                    locale,
                    c.units.roomOne,
                    c.units.roomOther,
                  ),
                })}
                <span>·</span>
                {c.smoking[queryCriteria.smokingPreference]}
              </p>
            </div>
            <button
              type="button"
              className="button button-secondary"
              onClick={scrollToSearchForm}
            >
              {c.editCriteria}
            </button>
          </div>

          <div className="progress-card" aria-live="polite">
            <div className="progress-copy">
              <strong>
                {formatMessage(c.results.completed, {
                  done: completedCount,
                  total: hotelStates.length,
                })}
              </strong>
              <span>
                {totalDuration !== null
                  ? formatMessage(c.results.totalDuration, {
                      seconds: (totalDuration / 1000).toFixed(1),
                    })
                  : queryStartedAt
                    ? formatMessage(c.results.startedAt, {
                        time: formatKoreaTime(queryStartedAt, locale),
                      })
                    : ""}
              </span>
            </div>
            <div
              className="progress-track"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={hotelStates.length}
              aria-valuenow={completedCount}
            >
              <span
                style={{
                  width: `${hotelStates.length ? (completedCount / hotelStates.length) * 100 : 0}%`,
                }}
              />
            </div>
          </div>

          {failedCount > 0 && (
            <div className="inline-alert alert-error">
              <span aria-hidden="true">!</span>
              <p>
                {c.partialFailure}{" "}
                {formatMessage(c.units.hotelCount, {
                  count: failedCount,
                  hotelUnit: pluralUnit(
                    failedCount,
                    locale,
                    c.units.hotelOne,
                    c.units.hotelOther,
                  ),
                })}
              </p>
            </div>
          )}

          <div className="result-controls">
            <div className="view-tabs" aria-label={c.results.title}>
              {(["all", "available", "failed"] as ResultView[]).map((view) => (
                <button
                  type="button"
                  aria-pressed={resultView === view}
                  className={resultView === view ? "is-active" : ""}
                  onClick={() => setResultView(view)}
                  key={view}
                >
                  {c.results.views[view]}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="button button-secondary"
              disabled={isRunning}
              onClick={() =>
                  runSearch({
                    ...queryCriteria,
                    locale,
                    requestedAt: new Date().toISOString(),
                })
              }
            >
              {isRunning ? c.searching : c.searchAgain}
            </button>
          </div>

          <div className="hotel-list">
            {visibleHotelStates.length > 0 ? (
              visibleHotelStates.map((state) => (
                <HotelCard
                  state={state}
                  onRetry={retryHotel}
                  retrying={retryingCodes.has(state.hotel.hotelCode)}
                  key={state.hotel.hotelCode}
                />
              ))
            ) : (
              <div className="no-view-results">{c.results.noViewMatch}</div>
            )}
          </div>

          <div className="source-note">
            <span className="source-note-mark" aria-hidden="true">
              i
            </span>
            <div>
              <strong>{c.liveData}</strong>
              <p>{c.officialReminder}</p>
            </div>
          </div>
        </section>
      )}

      </main>

      <footer>
        <div>
          <span className="wordmark-mark">{c.brandMark}</span>
          <div>
            <strong>{c.footer.title}</strong>
            <p>{c.footer.description}</p>
          </div>
        </div>
        <span>{c.footer.personal}</span>
      </footer>

      {queryCriteria && (
        <button
          type="button"
          className="edit-fab"
          onClick={scrollToSearchForm}
        >
          <span aria-hidden="true">↑</span>
          {c.editCriteria}
        </button>
      )}
    </>
  );
}
