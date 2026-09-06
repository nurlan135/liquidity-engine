import { formatInTimeZone } from 'date-fns-tz';
import { BAKU_TZ, CME_TZ } from '@/src/lib/time';

// Header session line: two real clocks, never a fabricated session state.
// Baku is the operator clock; NY (America/Chicago) is the CME exchange clock.
// No OPEN/CLOSED claim lives here — the status strip owns freshness truth.
export function formatSessionLine(now: Date = new Date()): string {
  const baku = formatInTimeZone(now, BAKU_TZ, 'HH:mm');
  const ny = formatInTimeZone(now, CME_TZ, 'HH:mm');
  return `Bakı ${baku} · NY ${ny}`;
}
