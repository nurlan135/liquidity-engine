import { formatInTimeZone } from 'date-fns-tz';
import { BAKU_TZ } from '@/src/lib/time';

// Freshness states for the global status strip (D-02, D-03).
export type StatusState = 'LIVE' | 'STALE' | 'CLOSED';

// Age at or beyond which a fresh-flagged envelope is treated as stale.
export const STALE_AFTER_SEC = 120;

export interface EnvelopeFreshness {
  stale: boolean;
  lastUpdatedISO: string;
}

export interface DerivedStatus {
  state: StatusState;
  ageSec: number;
}

function bakuWeekday(now: Date): string {
  return formatInTimeZone(now, BAKU_TZ, 'i');
}

function parseAgeSec(lastUpdatedISO: string, now: Date): number {
  const parsed = new Date(lastUpdatedISO).getTime();
  if (!Number.isFinite(parsed)) {
    throw new Error(`deriveStatus received unparseable lastUpdatedISO: ${lastUpdatedISO}`);
  }
  return Math.max(0, Math.floor((now.getTime() - parsed) / 1000));
}

export function deriveStatus(
  envelope: EnvelopeFreshness,
  now: Date = new Date(),
): DerivedStatus {
  // Weekend closure wins over envelope flags: Baku Sat/Sun (D-03, RESEARCH A6).
  const weekday = bakuWeekday(now);
  const ageSec = parseAgeSec(envelope.lastUpdatedISO, now);
  if (weekday === '6' || weekday === '7') {
    return { state: 'CLOSED', ageSec };
  }
  if (envelope.stale || ageSec >= STALE_AFTER_SEC) {
    return { state: 'STALE', ageSec };
  }
  return { state: 'LIVE', ageSec };
}

function ageCopy(ageSec: number): string {
  if (ageSec < 60) return `${ageSec} san əvvəl`;
  return `${Math.floor(ageSec / 60)} dəq əvvəl`;
}

export function formatStripAge(state: StatusState, ageSec: number): string {
  if (state === 'CLOSED') {
    return 'BAZAR BAĞLIDIR — son bağlanış şamları';
  }
  if (state === 'STALE') {
    return `STALE · ${ageCopy(ageSec)} — son keş göstərilir`;
  }
  return `LIVE · ${ageCopy(ageSec)}`;
}
