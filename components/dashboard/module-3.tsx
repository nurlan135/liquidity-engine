'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboard } from '@/src/lib/store';

const EMPTY_COPY = 'Məlumat yoxdur';

export function Module3() {
  const lastUpdatedISO = useDashboard((s) => s.lastUpdatedISO);
  const selectAsia = useDashboard((s) => s.selectAsia);
  const selectJudas = useDashboard((s) => s.selectJudas);
  const selectAMD = useDashboard((s) => s.selectAMD);
  const selectConfluence = useDashboard((s) => s.selectConfluence);
  const asia = selectAsia();
  const judas = selectJudas();
  const amd = selectAMD();
  const tier = selectConfluence();

  return (
    <Card data-slot="module-3">
      <CardHeader>
        <CardTitle className="text-[11px] font-semibold uppercase tracking-[0.1em]">Modul 3</CardTitle>
      </CardHeader>
      <CardContent>
        {lastUpdatedISO === null ? (
          <div className="flex flex-col gap-3">
            <div className="h-3 animate-pulse" />
            <div className="h-3 animate-pulse" />
          </div>
        ) : asia === null && judas === null && amd === null ? (
          <p className="text-base font-semibold">{EMPTY_COPY}</p>
        ) : (
          <div>
            <p data-slot="module3-conviction" className="text-[11px] font-semibold uppercase tracking-[0.1em]">
              {`İnam: ${tier}`}
            </p>
            {asia !== null ? (
              <p data-slot="module3-asia" className="font-mono text-xs tabular-nums">
                {`Asia ${asia.sessionDate} · high ${asia.high.toFixed(2)} · low ${asia.low.toFixed(2)}`}
              </p>
            ) : null}
            {judas !== null ? (
              <p data-slot="module3-judas" className="font-mono text-xs tabular-nums">
                {`Judas ${judas.confirmed ? 'təsdiqləndi' : 'gözlənilir'}${judas.sweepSide !== null ? ` · ${judas.sweepSide}` : ''}`}
              </p>
            ) : null}
            {amd !== null ? (
              <p data-slot="module3-amd" className="text-base font-semibold">
                {amd.reason}
              </p>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
