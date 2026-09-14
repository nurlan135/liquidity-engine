'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboard } from '@/src/lib/store';

const EMPTY_COPY = 'Məlumat yoxdur';

export function Module4() {
  const lastUpdatedISO = useDashboard((s) => s.lastUpdatedISO);
  const selectTrigger = useDashboard((s) => s.selectTrigger);
  const selectTicket = useDashboard((s) => s.selectTicket);
  const trigger = selectTrigger();
  const ticket = selectTicket();

  return (
    <Card data-slot="module-4">
      <CardHeader>
        <CardTitle className="text-[11px] font-semibold uppercase tracking-[0.1em]">Modul 4</CardTitle>
      </CardHeader>
      <CardContent>
        {lastUpdatedISO === null ? (
          <div className="flex flex-col gap-3">
            <div className="h-3 animate-pulse" />
            <div className="h-3 animate-pulse" />
          </div>
        ) : trigger === null && ticket === null ? (
          <p className="text-base font-semibold">{EMPTY_COPY}</p>
        ) : (
          <div>
            {trigger !== null ? (
              <p data-slot="module4-verdict" className="text-[11px] font-semibold uppercase tracking-[0.1em]">
                {trigger.verdict}
                {trigger.direction !== null ? ` · ${trigger.direction}` : null}
              </p>
            ) : null}
            {trigger !== null ? (
              <p data-slot="module4-reason" className="text-base font-semibold">
                {trigger.reason}
              </p>
            ) : null}
            {ticket !== null ? (
              <p data-slot="module4-ticket" className="font-mono text-xs tabular-nums">
                {`Ticket ${ticket.verdict}`}
                {ticket.direction !== null ? ` · ${ticket.direction}` : null}
              </p>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
