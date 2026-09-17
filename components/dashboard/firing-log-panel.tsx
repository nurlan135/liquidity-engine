'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboard } from '@/src/lib/store';

// Firing-log oxuyan panel: store-dakı firingLog tarixçəsini terminalda
// göstərir (TRIG-04 kalibrləmə vizibilitesi). Tam riyaziyyatsızdır —
// evaluateTrigger/computeTicket çağırışı, fetch, set, Button yoxdur.
// Üç birbaşa abunə (düz massivdir, useShallow lazım deyil); newest-first
// sıra render zamanı törədilir (store kronoloji append edir).

const EMPTY_COPY = 'Hələ ARMED/FIRE qeydi yoxdur — WAIT yazılmır';

function gateMark(value: boolean): string {
  return value ? '✓' : '✗';
}

export function FiringLogPanel() {
  const lastUpdatedISO = useDashboard((s) => s.lastUpdatedISO);
  const firingLog = useDashboard((s) => s.firingLog);
  const firingLogOverflow = useDashboard((s) => s.firingLogOverflow);
  const entries = firingLog.slice().reverse();

  return (
    <Card data-slot="firing-log">
      <CardHeader>
        <CardTitle className="text-[11px] font-semibold uppercase tracking-[0.1em]">Atəş Jurnalı</CardTitle>
      </CardHeader>
      <CardContent>
        {lastUpdatedISO === null ? (
          <div className="flex flex-col gap-3">
            <div className="h-3 animate-pulse" />
            <div className="h-3 animate-pulse" />
            <div className="h-3 animate-pulse" />
          </div>
        ) : firingLog.length === 0 ? (
          <p className="text-base font-semibold">{EMPTY_COPY}</p>
        ) : (
          <div>
            {firingLogOverflow > 0 ? (
              <p data-slot="firing-log-overflow" className="font-mono text-[11px] tracking-widest text-muted-foreground">
                {`+${firingLogOverflow} köhnə qeyd`}
              </p>
            ) : null}
            {entries.map((entry) => (
              <div
                key={`${entry.sessionDate}-${entry.asOf}-${entry.verdict}`}
                data-slot="firing-log-entry"
                data-verdict={entry.verdict}
                data-direction={entry.direction ?? ''}
                data-session={entry.sessionDate}
                data-asof={entry.asOf}
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em]">
                  {`${entry.verdict} · ${entry.direction ?? '—'}`}
                </p>
                <p className="font-mono text-xs tabular-nums">
                  {`Zaman ${gateMark(entry.gates.timing)} · Süpürmə ${gateMark(entry.gates.purge)} · Displacement ${gateMark(entry.gates.displacement)}`}
                </p>
                <p className="font-mono text-xs tabular-nums text-muted-foreground">
                  {`${entry.reasonKey} · ${entry.sessionDate}`}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
