import { formatInTimeZone } from 'date-fns-tz';
import { BAKU_TZ } from '@/src/lib/time';

// IANA anchor for the header NY clock (Eastern, same as ICT NY_TZ).
export const NY_TZ = 'America/New_York';

// Header session line: two real clocks, never a fabricated session state.
// Baku is the operator clock; NY is Eastern wall-clock.
// No OPEN/CLOSED claim lives here — the status strip owns freshness truth.
export function formatSessionLine(now: Date = new Date()): string {
  const baku = formatInTimeZone(now, BAKU_TZ, 'HH:mm');
  const ny = formatInTimeZone(now, NY_TZ, 'HH:mm');
  return `Bakı ${baku} · NY ${ny}`;
}
