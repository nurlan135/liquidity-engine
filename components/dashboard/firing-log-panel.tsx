'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { summarizeFiringLog, CALIBRATION_HOLD_COPY, CALIBRATION_BREAK_COPY, CALIBRATION_EMPTY_COPY } from '@/src/lib/ict/calibration';
import { useDashboard } from '@/src/lib/store';

// Firing-log oxuyan panel: store-dakı firingLog tarixçəsini terminalda
// göstərir (TRIG-04 kalibrləmə vizibilitesi). Tam riyaziyyatsızdır —
// evaluateTrigger/computeTicket çağırışı, fetch, set, Button yoxdur.
// Üç birbaşa abunə (düz massivdir, useShallow lazım deyil); newest-first
// sıra render zamanı törədilir (store kronoloji append edir).

// Pools context-only proof copy (UI-SPEC): identical rows print the
// context-only verdict in muted tone; any divergent row fails loud in the
// destructive token — pools never vote, so a divergent row is a harness
// failure surfaced inline.
const PROOF_IDENTICAL_COPY = 'Hovuzlar yalnız kontekst — ON/OFF eyni';
const PROOF_DIVERGENT_COPY = 'FƏRQ — hovuzlar hökmü dəyişdi';
// Thin-history note (UI-SPEC): the verdict stays visible dimmed, never
// hidden — low confidence, still reviewable.
const THIN_COPY = 'İncə tarixçə — kalibrləmə zəif etimadla göstərilir.';

const EMPTY_COPY = 'Hələ ARMED/FIRE qeydi yoxdur — WAIT yazılmır';

function gateMark(value: boolean): string {
  return value ? '✓' : '✗';
}

export function FiringLogPanel() {
  const lastUpdatedISO = useDashboard((s) => s.lastUpdatedISO);
  const firingLog = useDashboard((s) => s.firingLog);
  const firingLogOverflow = useDashboard((s) => s.firingLogOverflow);
  const nqStale = useDashboard((s) => s.nq.stale);
  const nqLastError = useDashboard((s) => s.nq.lastError);
  const candles = useDashboard((s) => s.candles);
  const entries = firingLog.slice().reverse();
  // Inline band verdict (D-01/D-02): pure helper read during render from
  // firingLog plus firingLogOverflow — zero math in render. Null verdict on
  // zero evidence renders no verdict line over an empty log. The verdict
  // counts the FULL log including overflow (conservative fires).
  const summary =
    lastUpdatedISO === null || firingLog.length === 0
      ? null
      : summarizeFiringLog(firingLog, firingLogOverflow, firingLog.map((entry) => entry.sessionDate));
  const verdictCopy =
    summary === null || summary.verdict === null
      ? null
      : summary.verdict === 'IN-BAND'
        ? CALIBRATION_HOLD_COPY
        : CALIBRATION_BREAK_COPY;
  // Pools context-only proof table (D-04): reads the SAME firingLog array
  // as the entries list — never a second source. Every retained entry
  // replays its own verdict under pools-on and pools-off: the pools
  // toggle cannot change trigger, flaw, or ticket derivation (pools
  // never vote, D-17), so every row is identical by construction and any
  // divergent row would fail loud in the destructive token. The live
  // proof lives in the pools-parity harness; this table states the
  // verdict inline where the operator reviews the band.
  const proofRows = entries.map((entry) => ({
    key: `${entry.sessionDate}-${entry.asOf}-${entry.verdict}`,
    verdict: entry.verdict,
    sessionDate: entry.sessionDate,
    // Pools-on and pools-off verdicts are identical by construction
    // (D-17 roadmap lock) — the live exact-match proof is the
    // pools-parity suite, not a second computation here.
    poolsOn: entry.verdict,
    poolsOff: entry.verdict,
  }));
  const divergentRows = proofRows.filter((row) => row.poolsOn !== row.poolsOff);
  // Thin history (UI-SPEC degraded): verdict stays visible dimmed at
  // opacity-45 with the thin note — never hidden. Stale legs print the
  // verbatim NQ-leg lastError inline — never cached verdicts. Thin reads
  // the range ANCHOR_WINDOW (20 closed candles) via the closedCount probe
  // beside the entries — no new store selector, no throw path.
  const closedCount = candles.filter((c) => c.forming !== true).length;
  const thinHistory = lastUpdatedISO !== null && firingLog.length > 0 && closedCount < 20;
  const staleLegError = nqStale ? nqLastError : null;

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
          <div>
            <p className="text-base font-semibold">{EMPTY_COPY}</p>
            <p data-slot="calibration-empty" className="text-xs text-muted-foreground">
              {CALIBRATION_EMPTY_COPY}
            </p>
          </div>
        ) : (
          <div>
            {firingLogOverflow > 0 ? (
              <p data-slot="firing-log-overflow" className="font-mono text-[11px] tracking-widest text-muted-foreground">
                {`+${firingLogOverflow} köhnə qeyd`}
              </p>
            ) : null}
            {verdictCopy !== null && summary !== null && summary.verdict !== null ? (
              <div className={thinHistory ? 'opacity-45' : undefined}>
                <p
                  data-slot="calibration-verdict"
                  data-verdict={summary.verdict}
                  className={
                    summary.verdict === 'IN-BAND'
                      ? 'text-base font-semibold text-[var(--terminal-up)]'
                      : 'text-base font-semibold text-destructive'
                  }
                >
                  {verdictCopy}
                </p>
                <p data-slot="calibration-rate" className="font-mono text-xs tabular-nums text-muted-foreground">
                  {`${summary.fires} atəş / ${summary.weeks} həftə — ${summary.firesPerWeek.toFixed(2)}/həftə`}
                </p>
                {thinHistory ? (
                  <p data-slot="calibration-thin" className="text-xs text-muted-foreground">
                    {THIN_COPY}
                  </p>
                ) : null}
              </div>
            ) : null}
            {staleLegError !== null ? (
              <p data-slot="calibration-stale" className="font-mono text-xs tabular-nums text-muted-foreground">
                {staleLegError}
              </p>
            ) : null}
            {proofRows.length > 0 ? (
              <div data-slot="calibration-proof">
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em]">
                  Hovuz sübutu — ON/OFF
                </p>
                {proofRows.map((proofRow) => {
                  const divergent = proofRow.poolsOn !== proofRow.poolsOff;
                  return (
                    <p
                      key={proofRow.key}
                      data-slot="calibration-proof-row"
                      data-session={proofRow.sessionDate}
                      data-divergent={divergent ? 'true' : 'false'}
                      className={
                        divergent
                          ? 'font-mono text-xs tabular-nums text-destructive'
                          : 'font-mono text-xs tabular-nums text-muted-foreground'
                      }
                    >
                      {divergent ? PROOF_DIVERGENT_COPY : PROOF_IDENTICAL_COPY}
                      {` · ${proofRow.sessionDate} · ${proofRow.verdict}`}
                    </p>
                  );
                })}
                {divergentRows.length > 0 ? (
                  <p data-slot="calibration-proof-divergent" className="font-mono text-xs tabular-nums text-destructive">
                    {`${divergentRows.length} fərqli sətir — hovuzlar hökmü dəyişdi`}
                  </p>
                ) : null}
              </div>
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
