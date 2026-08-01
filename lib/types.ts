export type RegionId =
  | "all"
  | "seoul"
  | "incheon"
  | "daejeon"
  | "daegu"
  | "ulsan"
  | "changwon"
  | "busan";

export type Locale = "zh-CN" | "en-US" | "ja-JP" | "ko-KR";

export type SmokingPreference = "any" | "nonSmoking" | "smoking";
export type SmokingType = "nonSmoking" | "smoking" | "unknown";
export type HotelStatus = "available" | "soldOut" | "failed";
export type ErrorType =
  | "timeout"
  | "officialError"
  | "accessRestricted"
  | "parserChanged"
  | "unknown";

export interface StayCriteria {
  checkIn: string;
  checkOut: string;
  adultsPerRoom: number;
  roomCount: number;
}

export interface SearchCriteria extends StayCriteria {
  hotelCodes: string[];
  smokingPreference: SmokingPreference;
  locale: Locale;
  requestedAt: string;
}

export interface Hotel {
  hotelCode: string;
  cityId: Exclude<RegionId, "all">;
  cityZh: string;
  nameZh: string;
  nameSource: string;
  officialDetailUrl: string;
  active: boolean;
}

export interface RoomOffer {
  roomTypeId: string | null;
  roomTypeSource: string;
  roomTypeZh: string;
  roomImageUrl: string | null;
  smokingType: SmokingType;
  planNameSource: string;
  planNameZh: string;
  planId: string | null;
  priceAmount: number;
  currency: string;
  priceBasis: "stayTotal" | "unknown";
  priceLabelSource: string | null;
  generalPrice: number | null;
  membershipPrice: number | null;
  generalVacantRoom: number;
  membershipVacantRoom: number;
  bookingUrl: string;
  qualificationNote: string | null;
}

export interface HotelAvailability {
  hotelCode: string;
  status: HotelStatus;
  offers: RoomOffer[];
  sourceQueriedAt: string;
  durationMs: number;
  errorType: ErrorType | null;
  sourceUrl: string;
  message?: string;
}

export type UiHotelState =
  | { phase: "waiting" | "querying"; hotel: Hotel }
  | {
      phase: "completed";
      hotel: Hotel;
      result: HotelAvailability;
      visibleOffers: RoomOffer[];
      preferenceNoMatch: boolean;
    };
