"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { FORM_LIMITS, REGION_OPTIONS, hotelsForRegion } from "@/lib/hotels";
import { zhCN as c } from "@/lib/i18n";
import type {
  ErrorType,
  Hotel,
  HotelAvailability,
  RegionId,
  RoomOffer,
  SearchCriteria,
  SmokingPreference,
  UiHotelState,
} from "@/lib/types";

type HistoryCriteria = Omit<SearchCriteria, "requestedAt">;
type ResultView = "all" | "available" | "failed";

const HISTORY_KEY = "toyoko-korea-search-history-v1";
const MAX_HISTORY = 10;
const MAX_CONCURRENCY = 3;

function addDays(date: string, days: number) {
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
  const difference =
    Date.parse(`${checkOut}T00:00:00Z`) -
    Date.parse(`${checkIn}T00:00:00Z`);
  return Math.max(0, Math.round(difference / 86_400_000));
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    weekday: "short",
    timeZone: "Asia/Seoul",
  }).format(new Date(`${date}T00:00:00+09:00`));
}

function formatKoreaTime(date: string | number) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "Asia/Seoul",
  }).format(new Date(date));
}

function formatKrw(amount: number) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(amount);
}

function template(text: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce(
    (result, [key, value]) =>
      result.replaceAll(`{${key}}`, String(value)),
    text,
  );
}

function sortedOffers(
  result: HotelAvailability,
  preference: SmokingPreference,
) {
  const hasNonSmoking = result.offers.some(
    (offer) => offer.smokingType === "nonSmoking",
  );

  const visible =
    preference === "smokingOnly"
      ? result.offers.filter((offer) => offer.smokingType === "smoking")
      : result.offers;

  const rank = (offer: RoomOffer) => {
    if (preference !== "nonSmokingPreferred") return 0;
    if (offer.smokingType === "nonSmoking") return 0;
    if (offer.smokingType === "unknown") return 1;
    return 2;
  };

  return visible
    .map((offer) => ({
      ...offer,
      isSmokingFallback:
        preference === "nonSmokingPreferred" &&
        !hasNonSmoking &&
        offer.smokingType === "smoking",
    }))
    .sort((a, b) => rank(a) - rank(b) || a.priceAmount - b.priceAmount);
}

function toCompletedState(
  hotel: Hotel,
  result: HotelAvailability,
  preference: SmokingPreference,
): UiHotelState {
  const visibleOffers = sortedOffers(result, preference);
  return {
    phase: "completed",
    hotel,
    result,
    visibleOffers,
    preferenceNoMatch:
      result.status === "available" && visibleOffers.length === 0,
    hasSmokingFallback: visibleOffers.some(
      (offer) => offer.isSmokingFallback,
    ),
  };
}

function statusText(errorType: ErrorType | null) {
  return errorType ? c.errors[errorType] : c.hotel.failed;
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

function OfferRow({ offer }: { offer: RoomOffer }) {
  const stock = Math.max(
    offer.generalVacantRoom,
    offer.membershipVacantRoom,
  );
  return (
    <article
      className={`offer-row${offer.isSmokingFallback ? " is-fallback" : ""}`}
    >
      <div className="offer-main">
        <div className="offer-title-line">
          <h4>{offer.roomTypeZh ?? offer.roomTypeSource}</h4>
          <span className={`smoking-tag smoking-${offer.smokingType}`}>
            {c.smoking[offer.smokingType]}
          </span>
        </div>
        {offer.roomTypeZh && (
          <p className="source-name">
            {c.offer.officialRoomName}：{offer.roomTypeSource}
          </p>
        )}
        <div className="offer-plan">
          <span className="plan-kicker">{c.offer.officialPlanName}</span>
          <strong>{offer.planNameZh ?? offer.planNameSource}</strong>
        </div>
        {offer.qualificationNote && (
          <p className="qualification-note">{offer.qualificationNote}</p>
        )}
      </div>

      <div className="offer-price">
        <span className="price-basis">
          {offer.priceBasis === "stayTotal"
            ? c.offer.stayTotal
            : c.offer.unknownBasis}
        </span>
        <strong>
          {formatKrw(offer.generalPrice ?? offer.membershipPrice ?? 0)}
        </strong>
        <div className="price-labels">
          {offer.generalPrice && (
            <span>
              {c.offer.generalPrice} {formatKrw(offer.generalPrice)}
            </span>
          )}
          {offer.membershipPrice && (
            <span>
              {c.offer.membershipPrice} {formatKrw(offer.membershipPrice)}
            </span>
          )}
        </div>
        <span className="stock-note">
          {template(c.offer.stock, { count: stock })}
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

function HotelCard({
  state,
  onRetry,
  retrying,
}: {
  state: UiHotelState;
  onRetry: (hotel: Hotel) => void;
  retrying: boolean;
}) {
  const { hotel } = state;
  return (
    <section className="hotel-card">
      <div className="hotel-card-header">
        <div>
          <div className="hotel-location">
            <span>{hotel.cityZh}</span>
            <span>·</span>
            <span>
              {c.hotel.code} {hotel.hotelCode}
            </span>
          </div>
          <h3>{hotel.nameZh}</h3>
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
          <span className="loader-dot" />
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
              {state.result.status === "available" ? (
                <StatusPill tone="live">{c.hotel.available}</StatusPill>
              ) : state.result.status === "soldOut" ? (
                <StatusPill tone="muted">{c.hotel.soldOut}</StatusPill>
              ) : (
                <StatusPill tone="error">{c.hotel.failed}</StatusPill>
              )}
              {state.result.status === "available" && (
                <span className="offer-count">
                  {template(c.hotel.plans, {
                    count: state.visibleOffers.length,
                  })}
                </span>
              )}
            </div>
            <span className="queried-at">
              {template(c.hotel.queriedAt, {
                time: formatKoreaTime(state.result.sourceQueriedAt),
              })}
              <span aria-hidden="true"> · </span>
              {(state.result.durationMs / 1000).toFixed(1)}s
            </span>
          </div>

          {state.hasSmokingFallback && (
            <div className="inline-alert alert-warning">
              <span aria-hidden="true">!</span>
              <p>{c.smokingFallback}</p>
            </div>
          )}

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
                  <strong>{statusText(state.result.errorType)}</strong>
                  <p>{state.result.message}</p>
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
              {state.visibleOffers.map((offer, index) => (
                <OfferRow
                  key={`${offer.roomTypeSource}-${offer.planId ?? offer.planNameSource}-${index}`}
                  offer={offer}
                />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}

export default function Home() {
  const dates = useRef(defaultDates());
  const [regionId, setRegionId] = useState<RegionId>("seoul");
  const [checkIn, setCheckIn] = useState(dates.current.checkIn);
  const [checkOut, setCheckOut] = useState(dates.current.checkOut);
  const [adultsPerRoom, setAdultsPerRoom] = useState(1);
  const [roomCount, setRoomCount] = useState(1);
  const [smokingPreference, setSmokingPreference] =
    useState<SmokingPreference>("nonSmokingPreferred");
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

  useEffect(() => {
    try {
      const stored = JSON.parse(
        localStorage.getItem(HISTORY_KEY) ?? "[]",
      ) as HistoryCriteria[];
      if (Array.isArray(stored)) {
        setHistory(stored.slice(0, MAX_HISTORY));
        if (stored[0]?.regionId) setRegionId(stored[0].regionId);
      }
    } catch {
      localStorage.removeItem(HISTORY_KEY);
    }
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
      regionId,
      checkIn,
      checkOut,
      adultsPerRoom,
      roomCount,
      smokingPreference,
      locale: "zh-CN",
      requestedAt: new Date().toISOString(),
    };
  }

  function validate(criteria: SearchCriteria) {
    if (
      !criteria.regionId ||
      !criteria.checkIn ||
      !criteria.checkOut ||
      !criteria.adultsPerRoom ||
      !criteria.roomCount
    ) {
      return c.form.required;
    }
    if (criteria.checkIn < koreaToday()) return c.form.checkInPast;
    if (criteria.checkOut <= criteria.checkIn) return c.form.invalidCheckOut;
    return "";
  }

  function saveHistory(criteria: SearchCriteria) {
    const { requestedAt: _requestedAt, ...value } = criteria;
    const signature = JSON.stringify(value);
    const next = [
      value,
      ...history.filter((item) => JSON.stringify(item) !== signature),
    ].slice(0, MAX_HISTORY);
    setHistory(next);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
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

    const hotels = hotelsForRegion(criteria.regionId);
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
          result = {
            hotelCode: hotel.hotelCode,
            status: "failed",
            offers: [],
            sourceQueriedAt: new Date().toISOString(),
            durationMs: 0,
            errorType: "unknown",
            sourceUrl: hotel.officialDetailUrl,
            message: c.errors.unknown,
          };
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
      const result = await fetchHotel(hotel, {
        ...queryCriteria,
        requestedAt: new Date().toISOString(),
      });
      setHotelStates((states) =>
        states.map((state) =>
          state.hotel.hotelCode === hotel.hotelCode
            ? toCompletedState(
                hotel,
                result,
                queryCriteria.smokingPreference,
              )
            : state,
        ),
      );
    } finally {
      setRetryingCodes((codes) => {
        const next = new Set(codes);
        next.delete(hotel.hotelCode);
        return next;
      });
    }
  }

  function applyHistory(item: HistoryCriteria) {
    setRegionId(item.regionId);
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
    localStorage.removeItem(HISTORY_KEY);
  }

  return (
    <main>
      <header className="site-header">
        <a href="#" className="wordmark" aria-label={c.productName}>
          <span className="wordmark-mark">住</span>
          <span>{c.brand}</span>
        </a>
        <div className="header-note">
          <span className="live-dot" />
          {c.unofficial}
        </div>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">{c.heroEyebrow}</p>
          <h1>{c.heroTitle}</h1>
          <p className="hero-description">{c.heroDescription}</p>
          <div className="trust-row">
            <span>✓ {c.liveData}</span>
            <span>✓ {c.unofficial}</span>
          </div>
        </div>

        <div className="search-shell" ref={formRef}>
          <div className="search-shell-heading">
            <div>
              <span>SEARCH</span>
              <h2>{c.form.title}</h2>
            </div>
            <p>{c.form.subtitle}</p>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-grid">
              <label className="field field-region">
                <span>{c.fields.region}</span>
                <select
                  value={regionId}
                  onChange={(event) =>
                    setRegionId(event.target.value as RegionId)
                  }
                >
                  {REGION_OPTIONS.map((region) => (
                    <option value={region.id} key={region.id}>
                      {region.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>{c.fields.checkIn}</span>
                <input
                  type="date"
                  value={checkIn}
                  min={koreaToday()}
                  onChange={(event) => setCheckIn(event.target.value)}
                  required
                />
              </label>

              <label className="field">
                <span>{c.fields.checkOut}</span>
                <input
                  type="date"
                  value={checkOut}
                  min={addDays(checkIn, 1)}
                  onChange={(event) => setCheckOut(event.target.value)}
                  required
                />
              </label>

              <div className="night-count" aria-live="polite">
                <strong>{nights}</strong>
                <span>{c.form.night}</span>
              </div>

              <label className="field">
                <span>{c.fields.adultsPerRoom}</span>
                <select
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
                {template(c.form.roomsSummary, {
                  adults: adultsPerRoom,
                  rooms: roomCount,
                  total: totalAdults,
                })}
              </strong>
              <span>{c.form.childNote}</span>
            </div>

            <fieldset className="smoking-fieldset">
              <legend>{c.fields.smokingPreference}</legend>
              <div className="segmented-control">
                {(
                  [
                    "any",
                    "nonSmokingPreferred",
                    "smokingOnly",
                  ] as SmokingPreference[]
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

            {regionId === "all" && (
              <p className="all-notice">{c.allLongNotice}</p>
            )}
            {formError && (
              <p className="form-error" role="alert">
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
            {history.map((item, index) => (
              <button
                type="button"
                className="history-chip"
                onClick={() => applyHistory(item)}
                aria-label={c.history.use}
                key={`${JSON.stringify(item)}-${index}`}
              >
                <strong>
                  {
                    REGION_OPTIONS.find((region) => region.id === item.regionId)
                      ?.label
                  }
                </strong>
                <span>
                  {formatDate(item.checkIn)} — {formatDate(item.checkOut)}
                </span>
                <span>
                  {item.adultsPerRoom} 人 × {item.roomCount} 室
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
              </div>
              <p className="criteria-summary">
                {
                  REGION_OPTIONS.find(
                    (region) => region.id === queryCriteria.regionId,
                  )?.label
                }
                <span>·</span>
                {formatDate(queryCriteria.checkIn)} —{" "}
                {formatDate(queryCriteria.checkOut)}
                <span>·</span>
                {nightsBetween(
                  queryCriteria.checkIn,
                  queryCriteria.checkOut,
                )}{" "}
                {c.form.night}
                <span>·</span>
                {queryCriteria.adultsPerRoom} 人 × {queryCriteria.roomCount} 室
                <span>·</span>
                {c.smoking[queryCriteria.smokingPreference]}
              </p>
            </div>
            <button
              type="button"
              className="button button-secondary"
              onClick={() =>
                formRef.current?.scrollIntoView({
                  behavior: "smooth",
                  block: "center",
                })
              }
            >
              {c.editCriteria}
            </button>
          </div>

          <div className="progress-card" aria-live="polite">
            <div className="progress-copy">
              <strong>
                {template(c.results.completed, {
                  done: completedCount,
                  total: hotelStates.length,
                })}
              </strong>
              <span>
                {totalDuration !== null
                  ? template(c.results.totalDuration, {
                      seconds: (totalDuration / 1000).toFixed(1),
                    })
                  : queryStartedAt
                    ? template(c.results.startedAt, {
                        time: formatKoreaTime(queryStartedAt),
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
                {c.partialFailure}（{failedCount} 家）
              </p>
            </div>
          )}

          <div className="result-controls">
            <div className="view-tabs" role="tablist" aria-label={c.results.title}>
              {(["all", "available", "failed"] as ResultView[]).map((view) => (
                <button
                  type="button"
                  role="tab"
                  aria-selected={resultView === view}
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
            <span className="source-note-mark">i</span>
            <div>
              <strong>{c.liveData}</strong>
              <p>{c.officialReminder}</p>
            </div>
          </div>
        </section>
      )}

      <footer>
        <div>
          <span className="wordmark-mark">住</span>
          <div>
            <strong>{c.footer.title}</strong>
            <p>{c.footer.description}</p>
          </div>
        </div>
        <span>{c.footer.personal}</span>
      </footer>
    </main>
  );
}
