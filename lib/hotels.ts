import type { Hotel, RegionId } from "./types";

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
