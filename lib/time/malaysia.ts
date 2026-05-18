import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";

export const MALAYSIA_TZ = "Asia/Kuala_Lumpur";

export function toMalaysia(date: Date | string | number): Date {
  return toZonedTime(date, MALAYSIA_TZ);
}

export function malaysiaToUtc(date: Date | string): Date {
  return fromZonedTime(date, MALAYSIA_TZ);
}

export function malaysiaDateString(date: Date | string | number = new Date()): string {
  return formatInTimeZone(date, MALAYSIA_TZ, "yyyy-MM-dd");
}

export function formatMalaysia(date: Date | string | number, pattern = "yyyy-MM-dd HH:mm"): string {
  return formatInTimeZone(date, MALAYSIA_TZ, pattern);
}
