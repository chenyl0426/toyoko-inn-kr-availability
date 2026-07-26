import { HOTELS, FORM_LIMITS } from "@/lib/hotels";
import { queryHotelAvailability } from "@/lib/toyoko-adapter";
import type { SearchCriteria } from "@/lib/types";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const inFlight = new Map<
  string,
  ReturnType<typeof queryHotelAvailability>
>();

function isDate(value: string | null): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
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

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const hotelCode = params.get("hotelCode");
  const checkIn = params.get("checkIn");
  const checkOut = params.get("checkOut");
  const adultsPerRoom = Number(params.get("adultsPerRoom"));
  const roomCount = Number(params.get("roomCount"));

  if (
    !hotelCode ||
    !HOTELS.some((hotel) => hotel.active && hotel.hotelCode === hotelCode) ||
    !isDate(checkIn) ||
    !isDate(checkOut) ||
    checkIn < koreaToday() ||
    checkOut <= checkIn ||
    !Number.isInteger(adultsPerRoom) ||
    adultsPerRoom < FORM_LIMITS.adultsPerRoom.min ||
    adultsPerRoom > FORM_LIMITS.adultsPerRoom.max ||
    !Number.isInteger(roomCount) ||
    roomCount < FORM_LIMITS.roomCount.min ||
    roomCount > FORM_LIMITS.roomCount.max
  ) {
    return Response.json({ error: "查询条件无效" }, { status: 400 });
  }

  const criteria: SearchCriteria = {
    regionId: "all",
    checkIn,
    checkOut,
    adultsPerRoom,
    roomCount,
    smokingPreference: "any",
    locale: "zh-CN",
    requestedAt: new Date().toISOString(),
  };

  const key = [hotelCode, checkIn, checkOut, adultsPerRoom, roomCount].join(":");
  let task = inFlight.get(key);
  if (!task) {
    task = queryHotelAvailability(hotelCode, criteria);
    inFlight.set(key, task);
    task.finally(() => inFlight.delete(key));
  }

  return Response.json(await task, {
    headers: {
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
