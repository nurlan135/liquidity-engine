'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PAPER_EQUITY_USD } from '@/src/lib/ticket';
import { useDashboard } from '@/src/lib/store';

// Phase 17 ticket thin panel (TICK-04): math-free paper ticket — EXECUTE
// direction, OTE×FVG entry, invalidation SL, TP1/TP2/TP3 ladder with per-leg
// R-multiples, R-R gate, size in NQ contracts. Replaces the UNAVAILABLE
// ticket card one-to-one, keeping the exact data-slot. Stable
// selector-function subscription with derivation during render (never
// useShallow on nested ticket output, report.tsx selectLevels precedent).
// EXECUTE-side KAĞIZ QEYD appends a paperLog note; STAND ASIDE-side İMTİNA
// dismisses without logging. Degraded stale/thin renders dimmed with a
// STALE/THIN tag naming the failed leg, numbers dimmed, sizing locked.

const EMPTY_COPY = 'Məlumat yoxdur';
const RISK_STEP = 0.5;

function fmtPrice(value: number | null): string {
  return value === null ? '—' : value.toFixed(2);
}

function fmtRatio(value: number | null): string {
  return value === null ? '—' : `1:${value.toFixed(1)}`;
}

export function TicketPanel() {
  const lastUpdatedISO = useDashboard((s) => s.lastUpdatedISO);
  const riskPct = useDashboard((s) => s.ticketInputs.riskPct);
  const setRiskPct = useDashboard((s) => s.setRiskPct);
  const appendPaperLog = useDashboard((s) => s.appendPaperLog);
  const selectTicket = useDashboard((s) => s.selectTicket);
  const ticket = selectTicket();

  // İMTİNA acknowledgment is per-ticket: a new asOf resets the decline flag.
  const [declined, setDeclined] = useState(false);
  const ticketAsOf = ticket?.asOf ?? null;
  useEffect(() => {
    setDeclined(false);
  }, [ticketAsOf]);

  const degraded =
    ticket !== null && (ticket.degraded.stale || ticket.degraded.thin);
  const degradedTag =
    ticket !== null && ticket.degraded.stale
      ? `STALE — ${(ticket.degraded.leg ?? 'bilinmir').toUpperCase()}`
      : ticket !== null && ticket.degraded.thin
        ? `THIN — ${(ticket.degraded.leg ?? 'bilinmir').toUpperCase()}`
        : null;
  const isExecute =
    ticket !== null && (ticket.verdict === 'EXECUTE_LONG' || ticket.verdict === 'EXECUTE_SHORT');

  return (
    <Card data-slot="ticket">
      <CardHeader>
        <CardTitle className="text-[11px] font-semibold uppercase tracking-[0.1em]">Əmr Bileti</CardTitle>
      </CardHeader>
      <CardContent>
        {lastUpdatedISO === null ? (
          <div className="flex flex-col gap-3">
            <div className="h-3 animate-pulse" />
            <div className="h-3 animate-pulse" />
            <div className="h-3 animate-pulse" />
          </div>
        ) : ticket === null ? (
          <p className="text-base font-semibold">{EMPTY_COPY}</p>
        ) : (
          <div className={degraded ? 'opacity-45' : undefined}>
            {degradedTag !== null ? (
              <p
                data-slot="ticket-degraded-tag"
                className="font-mono text-[11px] tracking-widest text-muted-foreground"
              >
                {degradedTag}
              </p>
            ) : null}
            <p
              data-slot="ticket-verdict"
              className="text-[11px] font-semibold uppercase tracking-[0.1em]"
            >
              {ticket.verdict}
              {ticket.direction !== null ? ` · ${ticket.direction}` : null}
            </p>
            <p data-slot="ticket-reason" className="text-base font-semibold">
              {ticket.reason}
            </p>
            {isExecute ? (
              <div>
                <p data-slot="ticket-entry" className="font-mono text-xl font-semibold tabular-nums">
                  {`Giriş (OTE×FVG): ${fmtPrice(ticket.entry)}`}
                </p>
                <p data-slot="ticket-sl" className="font-mono text-xl font-semibold tabular-nums">
                  {`Stop: ${fmtPrice(ticket.sl)}`}
                </p>
                <p data-slot="ticket-tp1" className="font-mono text-xl font-semibold tabular-nums">
                  {`TP1: ${fmtPrice(ticket.tp.tp1)} · R ${fmtRatio(ticket.rMultiples.tp1)}`}
                </p>
                {ticket.tp.tp2 !== null ? (
                  <p data-slot="ticket-tp2" className="font-mono text-xs tabular-nums">
                    {`TP2: ${fmtPrice(ticket.tp.tp2)} · R ${fmtRatio(ticket.rMultiples.tp2)}`}
                  </p>
                ) : (
                  <p data-slot="ticket-tp2-missing" className="text-xs text-muted-foreground">
                    TP2 həll edilmədi — qarşı likvidlik tapılmadı.
                  </p>
                )}
                {ticket.tp.tp3 !== null ? (
                  <p data-slot="ticket-tp3" className="font-mono text-xs tabular-nums">
                    {`TP3: ${fmtPrice(ticket.tp.tp3)} · R ${fmtRatio(ticket.rMultiples.tp3)}`}
                  </p>
                ) : (
                  <p data-slot="ticket-tp3-missing" className="text-xs text-muted-foreground">
                    TP3 həll edilmədi — qarşı likvidlik tapılmadı.
                  </p>
                )}
                <p data-slot="ticket-rr" className="font-mono text-xl font-semibold tabular-nums">
                  {`R/R ${fmtRatio(ticket.rr)}`}
                </p>
                <p data-slot="ticket-size" className="font-mono text-xl font-semibold tabular-nums">
                  {`Ölçü: ${ticket.sizeContracts === null ? '—' : ticket.sizeContracts} NQ`}
                </p>
              </div>
            ) : null}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.1em]">Risk %</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setRiskPct(riskPct - RISK_STEP)}
                disabled={degraded}
                data-slot="risk-decrement"
              >
                −
              </Button>
              <span data-slot="risk-value" className="font-mono text-xs tabular-nums">
                {riskPct.toFixed(1)}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setRiskPct(riskPct + RISK_STEP)}
                disabled={degraded}
                data-slot="risk-increment"
              >
                +
              </Button>
            </div>
            <p className="font-mono text-xs tabular-nums text-muted-foreground">
              {`Kağız balans: $${PAPER_EQUITY_USD}`}
            </p>
            {isExecute ? (
              degraded ? (
                <p data-slot="ticket-size-lock" className="text-xs text-muted-foreground">
                  {`Ölçü kilidlidir — ${degradedTag}: kağız qeyd bağlıdır.`}
                </p>
              ) : (
                <Button
                  size="sm"
                  onClick={() =>
                    appendPaperLog({
                      asOf: ticket.asOf,
                      verdict: ticket.verdict,
                      direction: ticket.direction,
                      entry: ticket.entry,
                      sl: ticket.sl,
                      tp: { ...ticket.tp },
                      sizeContracts: ticket.sizeContracts,
                    })
                  }
                  data-slot="ticket-log"
                >
                  KAĞIZ QEYD
                </Button>
              )
            ) : (
              <div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDeclined(true)}
                  data-slot="ticket-dismiss"
                >
                  İMTİNA
                </Button>
                {declined ? (
                  <p data-slot="ticket-declined" className="text-xs text-muted-foreground">
                    İmtina edildi — qeyd yaradılmadı.
                  </p>
                ) : null}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
