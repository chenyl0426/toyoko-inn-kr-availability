import type {
  ErrorType,
  HotelAvailability,
  RoomOffer,
  SearchCriteria,
} from "./types";
import { planNameZh, roomNameZh } from "./toyoko-translations";

const OFFICIAL_ORIGIN = "https://www.toyoko-inn.com";
const REQUEST_TIMEOUT_MS = 13_000;

type OfficialPlan = {
  planCode?: string | null;
  planName?: string | null;
  detailedExplanation?: string | null;
  notes?: string | null;
  membershipCategorize?: string | null;
  smokingCategorize?: string | null;
  price?: {
    generalPrice?: number | null;
    membershipPrice?: number | null;
  };
  vacant?: {
    generalVacantRoom?: number | null;
    membershipVacantRoom?: number | null;
  };
};

type OfficialRoom = {
  roomTypeName?: string | null;
  roomTypeId?: string | null;
  imageUrls?: string | null;
  specs?: { isSmoking?: boolean | null };
  plans?: OfficialPlan[];
};

type OfficialResponse = {
  hotelCode?: string;
  hotelTitle?: string;
  canReservation?: boolean;
  hotelStatus?: string;
  roomTypeList?: OfficialRoom[];
};

class AdapterError extends Error {
  constructor(
    public readonly errorType: ErrorType,
    message: string,
  ) {
    super(message);
  }
}

function buildSourceUrl(hotelCode: string, criteria: SearchCriteria) {
  const url = new URL("/search/result/room_plan/", OFFICIAL_ORIGIN);
  url.searchParams.set("hotel", hotelCode);
  url.searchParams.set("people", String(criteria.adultsPerRoom));
  url.searchParams.set("room", String(criteria.roomCount));
  // Always request the full set so "禁烟优先" can degrade to smoking rooms.
  url.searchParams.set("smoking", "all");
  url.searchParams.set("start", criteria.checkIn);
  url.searchParams.set("end", criteria.checkOut);
  return url;
}

function parseNextData(html: string): OfficialResponse {
  const match = html.match(
    /<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i,
  );
  if (!match?.[1]) {
    if (/captcha|recaptcha|アクセス制限|access denied/i.test(html)) {
      throw new AdapterError("accessRestricted", "官网要求验证或限制访问");
    }
    throw new AdapterError("parserChanged", "官网页面结构发生变化");
  }

  try {
    const parsed = JSON.parse(match[1]) as {
      page?: string;
      props?: { pageProps?: { planResponse?: OfficialResponse } };
    };
    if (
      parsed.page !== "/search/result/room_plan" ||
      !parsed.props?.pageProps?.planResponse ||
      !Array.isArray(parsed.props.pageProps.planResponse.roomTypeList)
    ) {
      throw new AdapterError("parserChanged", "官网结果字段发生变化");
    }
    return parsed.props.pageProps.planResponse;
  } catch (error) {
    if (error instanceof AdapterError) throw error;
    throw new AdapterError("parserChanged", "官网结果无法解析");
  }
}

function positiveNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : null;
}

function normalizeOffers(
  response: OfficialResponse,
  sourceUrl: string,
): RoomOffer[] {
  const offers: RoomOffer[] = [];

  response.roomTypeList?.forEach((room) => {
    room.plans?.forEach((plan) => {
      const generalVacantRoom = Math.max(
        0,
        Number(plan.vacant?.generalVacantRoom ?? 0),
      );
      const membershipVacantRoom = Math.max(
        0,
        Number(plan.vacant?.membershipVacantRoom ?? 0),
      );
      if (generalVacantRoom === 0 && membershipVacantRoom === 0) return;

      const generalPrice = positiveNumber(plan.price?.generalPrice);
      const membershipPrice = positiveNumber(plan.price?.membershipPrice);
      const priceAmount = generalPrice ?? membershipPrice;
      if (priceAmount === null) return;

      const isSmoking = room.specs?.isSmoking;
      const membershipCategory = plan.membershipCategorize?.trim() || null;
      const isQualifiedPlan =
        membershipCategory !== null &&
        !/^all$|^general$/i.test(membershipCategory);
      const roomTypeSource =
        room.roomTypeName?.trim() || "官网未提供房型名称";
      const planNameSource =
        plan.planName?.trim() || "官网未提供计划名称";

      offers.push({
        roomTypeId: room.roomTypeId?.trim() || null,
        roomTypeSource,
        roomTypeZh: roomNameZh(roomTypeSource),
        roomImageUrl: room.imageUrls?.trim() || null,
        smokingType:
          typeof isSmoking === "boolean"
            ? isSmoking
              ? "smoking"
              : "nonSmoking"
            : "unknown",
        planNameSource,
        planNameZh: planNameZh(planNameSource),
        planId: plan.planCode?.trim() || null,
        priceAmount,
        currency: "KRW",
        priceBasis: "stayTotal",
        priceLabelSource:
          generalPrice && membershipPrice
            ? "普通价 / 会员价"
            : generalPrice
              ? "普通价"
              : "会员价",
        generalPrice,
        membershipPrice,
        generalVacantRoom,
        membershipVacantRoom,
        bookingUrl: sourceUrl,
        isSmokingFallback: false,
        qualificationNote: isQualifiedPlan
          ? "该计划可能有会员、学生或其他资格要求，请在官网确认。"
          : null,
      });
    });
  });

  return offers;
}

async function fetchOnce(url: URL) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        accept: "text/html,application/xhtml+xml",
        "accept-language": "ja-JP,ja;q=0.9",
        "user-agent":
          "ToyokoInn-Korea-Availability/0.1 (personal on-demand search)",
      },
    });

    if (response.status === 403 || response.status === 429) {
      throw new AdapterError("accessRestricted", "官网要求验证或限制访问");
    }
    if (response.status >= 500) {
      throw new AdapterError("officialError", "官网暂时不可用");
    }
    if (!response.ok) {
      throw new AdapterError("officialError", `官网返回错误（${response.status}）`);
    }
    return response.text();
  } catch (error) {
    if (error instanceof AdapterError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new AdapterError("timeout", "请求超时");
    }
    throw new AdapterError("unknown", "访问官网时发生未知错误");
  } finally {
    clearTimeout(timer);
  }
}

async function fetchWithRetry(url: URL) {
  try {
    return await fetchOnce(url);
  } catch (error) {
    if (
      error instanceof AdapterError &&
      !["timeout", "officialError", "unknown"].includes(error.errorType)
    ) {
      throw error;
    }
    // One automatic retry, only for temporary transport errors and 5xx.
    return fetchOnce(url);
  }
}

export async function queryHotelAvailability(
  hotelCode: string,
  criteria: SearchCriteria,
): Promise<HotelAvailability> {
  const started = Date.now();
  const sourceQueriedAt = new Date().toISOString();
  const sourceUrl = buildSourceUrl(hotelCode, criteria).toString();

  try {
    const html = await fetchWithRetry(new URL(sourceUrl));
    const response = parseNextData(html);
    if (response.hotelCode !== hotelCode) {
      throw new AdapterError("parserChanged", "官网返回了不匹配的酒店");
    }
    const offers = normalizeOffers(response, sourceUrl);

    return {
      hotelCode,
      status: offers.length > 0 ? "available" : "soldOut",
      offers,
      sourceQueriedAt,
      durationMs: Date.now() - started,
      errorType: null,
      sourceUrl,
      message:
        offers.length > 0 ? undefined : "当前条件下未发现可订房型",
    };
  } catch (error) {
    const adapterError =
      error instanceof AdapterError
        ? error
        : new AdapterError("unknown", "未知错误");
    return {
      hotelCode,
      status: "failed",
      offers: [],
      sourceQueriedAt,
      durationMs: Date.now() - started,
      errorType: adapterError.errorType,
      sourceUrl,
      message: adapterError.message,
    };
  }
}
