import { formatInTimeZone, getTimezoneOffset } from 'date-fns-tz';

export const BAKU_TZ = 'Asia/Baku';
export const CME_TZ = 'America/Chicago';

export function toBakuYMD(d: Date | number): string {
  return formatInTimeZone(d, BAKU_TZ, 'yyyy-MM-dd');
}

export function getAsOfBakuDate(now: Date = new Date()): string {
  return toBakuYMD(now);
}

export function bakuOffsetMinutes(at: Date): number {
  return getTimezoneOffset(BAKU_TZ, at) / 60_000;
}
