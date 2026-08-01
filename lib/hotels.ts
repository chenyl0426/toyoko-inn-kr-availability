import type { Hotel, Locale, RegionId } from "./types";

export const HOTELS: Hotel[] = [
  {
    hotelCode: "00208",
    cityId: "seoul",
    cityZh: "首尔",
    nameZh: "首尔东大门 1",
    nameSource: "Toyoko Inn Seoul Dongdaemun No.1",
    officialDetailUrl: "https://www.toyoko-inn.com/search/detail/00208/",
    active: true,
  },
  {
    hotelCode: "00291",
    cityId: "seoul",
    cityZh: "首尔",
    nameZh: "首尔东大门 2",
    nameSource: "Toyoko Inn Seoul Dongdaemun No.2",
    officialDetailUrl: "https://www.toyoko-inn.com/search/detail/00291/",
    active: true,
  },
  {
    hotelCode: "00282",
    cityId: "seoul",
    cityZh: "首尔",
    nameZh: "首尔江南",
    nameSource: "Toyoko Inn Seoul Gangnam",
    officialDetailUrl: "https://www.toyoko-inn.com/search/detail/00282/",
    active: true,
  },
  {
    hotelCode: "00311",
    cityId: "seoul",
    cityZh: "首尔",
    nameZh: "首尔永登浦",
    nameSource: "Toyoko Inn Seoul Yeongdeungpo",
    officialDetailUrl: "https://www.toyoko-inn.com/search/detail/00311/",
    active: true,
  },
  {
    hotelCode: "00277",
    cityId: "incheon",
    cityZh: "仁川",
    nameZh: "仁川富平",
    nameSource: "Toyoko Inn Incheon Bupyeong",
    officialDetailUrl: "https://www.toyoko-inn.com/search/detail/00277/",
    active: true,
  },
  {
    hotelCode: "00234",
    cityId: "daejeon",
    cityZh: "大田",
    nameZh: "大田政府大楼前",
    nameSource: "Toyoko Inn Daejeon Government Complex",
    officialDetailUrl: "https://www.toyoko-inn.com/search/detail/00234/",
    active: true,
  },
  {
    hotelCode: "00297",
    cityId: "daegu",
    cityZh: "大邱",
    nameZh: "大邱东城路",
    nameSource: "Toyoko Inn Daegu Dongseong-ro",
    officialDetailUrl: "https://www.toyoko-inn.com/search/detail/00297/",
    active: true,
  },
  {
    hotelCode: "00310",
    cityId: "ulsan",
    cityZh: "蔚山",
    nameZh: "蔚山三山洞",
    nameSource: "Toyoko Inn Ulsan Samsandong",
    officialDetailUrl: "https://www.toyoko-inn.com/search/detail/00310/",
    active: true,
  },
  {
    hotelCode: "00335",
    cityId: "changwon",
    cityZh: "昌原",
    nameZh: "昌原",
    nameSource: "Toyoko Inn Changwon",
    officialDetailUrl: "https://www.toyoko-inn.com/search/detail/00335/",
    active: true,
  },
  {
    hotelCode: "00221",
    cityId: "busan",
    cityZh: "釜山",
    nameZh: "釜山西面",
    nameSource: "Toyoko Inn Busan Seomyeon",
    officialDetailUrl: "https://www.toyoko-inn.com/search/detail/00221/",
    active: true,
  },
  {
    hotelCode: "00194",
    cityId: "busan",
    cityZh: "釜山",
    nameZh: "釜山站 1",
    nameSource: "Toyoko Inn Busan Station No.1",
    officialDetailUrl: "https://www.toyoko-inn.com/search/detail/00194/",
    active: true,
  },
  {
    hotelCode: "00178",
    cityId: "busan",
    cityZh: "釜山",
    nameZh: "釜山中央站",
    nameSource: "Toyoko Inn Busan Jungang Station",
    officialDetailUrl: "https://www.toyoko-inn.com/search/detail/00178/",
    active: true,
  },
  {
    hotelCode: "00256",
    cityId: "busan",
    cityZh: "釜山",
    nameZh: "釜山海云台 2",
    nameSource: "Toyoko Inn Busan Haeundae No.2",
    officialDetailUrl: "https://www.toyoko-inn.com/search/detail/00256/",
    active: true,
  },
];

const HOTEL_NAMES: Record<Locale, Record<string, string>> = {
  "zh-CN": {
    "00208": "首尔东大门 1",
    "00291": "首尔东大门 2",
    "00282": "首尔江南",
    "00311": "首尔永登浦",
    "00277": "仁川富平",
    "00234": "大田政府大楼前",
    "00297": "大邱东城路",
    "00310": "蔚山三山洞",
    "00335": "昌原",
    "00221": "釜山西面",
    "00194": "釜山站 1",
    "00178": "釜山中央站",
    "00256": "釜山海云台 2",
  },
  "en-US": {
    "00208": "Toyoko Inn Seoul Dongdaemun No.1",
    "00291": "Toyoko Inn Seoul Dongdaemun No.2",
    "00282": "Toyoko Inn Seoul Gangnam",
    "00311": "Toyoko Inn Seoul Yeongdeungpo",
    "00277": "Toyoko Inn Incheon Bupyeong",
    "00234": "Toyoko Inn Daejeon Government Complex",
    "00297": "Toyoko Inn Daegu Dongseong-ro",
    "00310": "Toyoko Inn Ulsan Samsandong",
    "00335": "Toyoko Inn Changwon",
    "00221": "Toyoko Inn Busan Seomyeon",
    "00194": "Toyoko Inn Busan Station No.1",
    "00178": "Toyoko Inn Busan Jungang Station",
    "00256": "Toyoko Inn Busan Haeundae No.2",
  },
  "ja-JP": {
    "00208": "東横INNソウル東大門1",
    "00291": "東横INNソウル東大門2",
    "00282": "東横INNソウル江南",
    "00311": "東横INNソウル永登浦",
    "00277": "東横INN仁川富平",
    "00234": "東横INN大田政府庁舎前",
    "00297": "東横INN大邱東城路",
    "00310": "東横INN蔚山三山洞",
    "00335": "東横INN昌原",
    "00221": "東横INN釜山西面",
    "00194": "東横INN釜山駅1",
    "00178": "東横INN釜山中央駅",
    "00256": "東横INN釜山海雲台2",
  },
  "ko-KR": {
    "00208": "토요코인 서울동대문1",
    "00291": "토요코인 서울동대문2",
    "00282": "토요코인 서울강남",
    "00311": "토요코인 서울영등포",
    "00277": "토요코인 인천부평",
    "00234": "토요코인 대전정부청사앞",
    "00297": "토요코인 대구 동성로",
    "00310": "토요코인 울산삼산동",
    "00335": "토요코인 창원",
    "00221": "토요코인 부산서면",
    "00194": "토요코인 부산역1",
    "00178": "토요코인 부산중앙역",
    "00256": "토요코인 부산해운대2",
  },
};

const REGION_NAMES: Record<Locale, Record<RegionId, string>> = {
  "zh-CN": {
    all: "韩国全部",
    seoul: "首尔",
    incheon: "仁川",
    daejeon: "大田",
    daegu: "大邱",
    ulsan: "蔚山",
    changwon: "昌原",
    busan: "釜山",
  },
  "en-US": {
    all: "All South Korea",
    seoul: "Seoul",
    incheon: "Incheon",
    daejeon: "Daejeon",
    daegu: "Daegu",
    ulsan: "Ulsan",
    changwon: "Changwon",
    busan: "Busan",
  },
  "ja-JP": {
    all: "韓国全域",
    seoul: "ソウル",
    incheon: "仁川",
    daejeon: "大田",
    daegu: "大邱",
    ulsan: "蔚山",
    changwon: "昌原",
    busan: "釜山",
  },
  "ko-KR": {
    all: "대한민국 전체",
    seoul: "서울",
    incheon: "인천",
    daejeon: "대전",
    daegu: "대구",
    ulsan: "울산",
    changwon: "창원",
    busan: "부산",
  },
};

export function hotelName(hotel: Hotel, locale: Locale) {
  return (
    HOTEL_NAMES[locale][hotel.hotelCode] ??
    (locale === "zh-CN" ? hotel.nameZh : hotel.nameSource)
  );
}

export function hotelCity(hotel: Hotel, locale: Locale) {
  return REGION_NAMES[locale][hotel.cityId];
}

export function regionName(regionId: RegionId, locale: Locale) {
  return REGION_NAMES[locale][regionId];
}

export const REGION_OPTIONS: Array<{ id: RegionId; label: string }> = [
  { id: "all", label: "韩国全部" },
  { id: "seoul", label: "首尔" },
  { id: "incheon", label: "仁川" },
  { id: "daejeon", label: "大田" },
  { id: "daegu", label: "大邱" },
  { id: "ulsan", label: "蔚山" },
  { id: "changwon", label: "昌原" },
  { id: "busan", label: "釜山" },
];

export const FORM_LIMITS = {
  adultsPerRoom: { min: 1, max: 4 },
  roomCount: { min: 1, max: 4 },
} as const;

export function hotelsForRegion(regionId: RegionId) {
  return HOTELS.filter(
    (hotel) => hotel.active && (regionId === "all" || hotel.cityId === regionId),
  );
}

export function hotelsForCodes(hotelCodes: readonly string[]) {
  const selected = new Set(hotelCodes);
  return HOTELS.filter(
    (hotel) => hotel.active && selected.has(hotel.hotelCode),
  );
}

export function normalizeHotelCodes(hotelCodes: readonly string[]) {
  return hotelsForCodes(hotelCodes).map((hotel) => hotel.hotelCode);
}
