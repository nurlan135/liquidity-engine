'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { readFireThreshold, useDashboard } from '@/src/lib/store';
import {
  FIRE_THRESHOLD_DEFAULT,
  FIRE_THRESHOLD_MAX,
  FIRE_THRESHOLD_MIN,
} from '@/src/lib/fire-rate';

// Phase 21 threshold control (D-06/D-08): thin WHY NOW fire-threshold slider
// over the plan 03 thresholdInputs store slice. Calibration-display only —
// the operator value never enters src/lib/ict (D-11/D-12/D-13); band
// annotation happens in the section 5 strip from plan 03. Shape mirrors the
// ticket-panel risk stepper: locked label, mono readout, ghost reset, and
// degraded stale/thin write-lock. Persistence is a single display number
// under the namespaced versioned key below — no tracking, no profiling.
const STORAGE_KEY = 'liquidity.fireThreshold.v1';

// Validate-on-read at the component boundary (T-21-05): crafted localStorage
// values cross here into operator state. Number() parses the stored string;
// readFireThreshold refuses garbage and out-of-band numbers back to the code
// default — never a throw, never a blank. SSR-safe: window access is guarded
// and try-caught, never at module scope, never during render (lazy useState
// initializer only).
function readPersistedThreshold(): number {
  try {
    if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
      return FIRE_THRESHOLD_DEFAULT;
    }
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return FIRE_THRESHOLD_DEFAULT;
    return readFireThreshold(Number(raw));
  } catch {
    return FIRE_THRESHOLD_DEFAULT;
  }
}

function writePersistedThreshold(value: number): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(value));
  } catch {
    // Storage unavailable (private mode, quota) — the operator value still
    // lives in the store for this session; persistence is best-effort.
  }
}

export function ThresholdControl() {
  const fireThreshold = useDashboard((s) => s.thresholdInputs.fireThreshold);
  const setFireThreshold = useDashboard((s) => s.setFireThreshold);
  const selectTicket = useDashboard((s) => s.selectTicket);
  const ticket = selectTicket();

  // Degraded write-lock mirroring the risk stepper: stale or thin dims the
  // control and locks sizing writes until fresh data returns.
  const degraded =
    ticket !== null && (ticket.degraded.stale || ticket.degraded.thin);

  // Hydrate the store once from the persisted display value. Lazy initializer
  // reads storage a single time on mount; the effect pushes it into the store
  // post-render so server and first client paint both render the code default
  // synchronously (no hydration mismatch, no skeleton).
  const [initial] = useState(readPersistedThreshold);
  useEffect(() => {
    setFireThreshold(initial);
    // Intentionally mount-only: the persisted base must not re-assert over
    // live operator drags on later renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleValueChange = (next: number | readonly number[]) => {
    const value = Array.isArray(next) ? next[0] : next;
    if (typeof value !== 'number') return;
    setFireThreshold(value);
    // Write-through in the event handler only: persist what the store
    // actually kept after clamp-on-write, so storage can never disagree
    // with the rendered readout.
    writePersistedThreshold(useDashboard.getState().thresholdInputs.fireThreshold);
  };

  const handleReset = () => {
    setFireThreshold(FIRE_THRESHOLD_DEFAULT);
    writePersistedThreshold(FIRE_THRESHOLD_DEFAULT);
  };

  return (
    <div data-slot="threshold-control" className="flex flex-col gap-2">
      <h4 className="text-[11px] font-semibold uppercase tracking-[0.1em]">
        Atəş Həddi
      </h4>
      <div className="flex flex-wrap items-center gap-2">
        <Slider
          value={[fireThreshold]}
          min={FIRE_THRESHOLD_MIN}
          max={FIRE_THRESHOLD_MAX}
          step={1}
          onValueChange={handleValueChange}
          disabled={degraded}
          aria-label="Atəş Həddi"
          className="min-w-28 flex-1"
        />
        <span
          data-slot="threshold-value"
          className="font-mono text-base font-semibold tabular-nums"
        >
          {`${fireThreshold} / həftə`}
        </span>
        <Button
          size="sm"
          variant="ghost"
          title="Defolta qaytar"
          onClick={handleReset}
          disabled={degraded}
          data-slot="threshold-reset"
        >
          Sıfırla
        </Button>
      </div>
    </div>
  );
}
