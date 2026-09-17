'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import {
  CALIBRATION_BEHIND_MAX,
  CALIBRATION_BEHIND_MIN,
  CALIBRATION_BEHIND_STEP,
  CALIBRATION_DISP_MAX,
  CALIBRATION_DISP_MIN,
  CALIBRATION_DISP_STEP,
  CALIBRATION_DOL_BOOST_MAX,
  CALIBRATION_DOL_BOOST_MIN,
  CALIBRATION_DOL_BOOST_STEP,
  CALIBRATION_EQUAL_TOL_MAX_BPS,
  CALIBRATION_EQUAL_TOL_MIN_BPS,
  CALIBRATION_KZ_MAX,
  CALIBRATION_KZ_MIN,
  CALIBRATION_MERGE_MAX,
  CALIBRATION_MERGE_MIN,
  CALIBRATION_MERGE_STEP,
  useDashboard,
} from '@/src/lib/store';

// Phase 21 calibration sandbox (D-13/D-14/D-15, T-21-05/T-21-06): display-only
// review sandbox for both knob families — WHY NOW gate thresholds plus pool
// tolerances. Math-free panel: sliders write the session-scoped preview slice
// only; selectors keep reading the pinned module constants with zero live
// re-derivation on movement; the explicit Tətbiq et path records the reviewed
// HOLD verdict plus the applied-set copy and re-seeds the preview to the
// pinned seeds. Degraded stale/thin legs disable interaction honestly (the
// ticket-panel degraded precedent); calibration-stale prints the verbatim
// NQ-leg lastError inline (T-21-02); no modal confirmations, no toast
// surfaces. Knobs render ONLY from the installed ui Slider wrapper — never
// raw base-ui inline (D-16, T-21-SC).

const PREVIEW_TAG_COPY = 'BAXIŞ — tətbiq edilməyib';

function fmtInt(value: number): string {
  return String(Math.round(value));
}

function fmtMult(value: number): string {
  return `${value.toFixed(2)}×`;
}

function KnobRow({
  label,
  slot,
  display,
  min,
  max,
  step,
  value,
  disabled,
  onChange,
}: {
  label: string;
  slot: string;
  display: string;
  min: number;
  max: number;
  step: number;
  value: number;
  disabled: boolean;
  onChange: (next: number) => void;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em]">{label}</p>
      <div className="flex items-center gap-2">
        <Slider
          data-slot={slot}
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onValueChange={(next) => {
            const first = Array.isArray(next) ? next[0] : next;
            if (typeof first === 'number') onChange(first);
          }}
          aria-label={label}
        />
        <span data-slot={`${slot}-value`} className="font-mono text-xs tabular-nums">
          {display}
        </span>
      </div>
    </div>
  );
}

export function CalibrationSandbox() {
  const lastUpdatedISO = useDashboard((s) => s.lastUpdatedISO);
  const preview = useDashboard((s) => s.calibrationPreview);
  const setKzStartMin = useDashboard((s) => s.setCalibrationKzStartMin);
  const setKzEndMin = useDashboard((s) => s.setCalibrationKzEndMin);
  const setDispMult = useDashboard((s) => s.setCalibrationDispMult);
  const setEqualTolBps = useDashboard((s) => s.setCalibrationEqualTolBps);
  const setMergeAtrMult = useDashboard((s) => s.setCalibrationMergeAtrMult);
  const setDolBoost = useDashboard((s) => s.setCalibrationDolBoost);
  const setBehindPenalty = useDashboard((s) => s.setCalibrationBehindPenalty);
  const applyCalibrationPreview = useDashboard((s) => s.applyCalibrationPreview);
  const resetCalibrationPreviewToPinned = useDashboard((s) => s.resetCalibrationPreviewToPinned);
  const selectCalibrationReview = useDashboard((s) => s.selectCalibrationReview);
  const selectTicket = useDashboard((s) => s.selectTicket);
  const nqStale = useDashboard((s) => s.nq.stale);
  const nqLastError = useDashboard((s) => s.nq.lastError);

  const ticket = selectTicket();
  const review = selectCalibrationReview();
  // Unapplied preview: any knob drifted off the pinned seeds dims the
  // preview block at opacity-45 with the visible BAXIŞ tag (D-14, T-21-05).
  const pristine =
    review.applied ||
    (preview.kzStartMin === 120 &&
      preview.kzEndMin === 300 &&
      preview.dispMult === 0.5 &&
      preview.equalTolBps === 25 &&
      preview.mergeAtrMult === 0.25 &&
      preview.dolBoost === 2.0 &&
      preview.behindPenalty === 0.25);
  const degraded = ticket !== null && (ticket.degraded.stale || ticket.degraded.thin);
  const degradedTag =
    ticket !== null && ticket.degraded.stale
      ? `STALE — ${(ticket.degraded.leg ?? 'bilinmir').toUpperCase()}`
      : ticket !== null && ticket.degraded.thin
        ? `THIN — ${(ticket.degraded.leg ?? 'bilinmir').toUpperCase()}`
        : null;
  const staleLegError = nqStale ? nqLastError : null;

  return (
    <Card data-slot="calibration-sandbox">
      <CardHeader>
        <CardTitle className="text-[11px] font-semibold uppercase tracking-[0.1em]">
          Kalibrləmə Sandbox
        </CardTitle>
      </CardHeader>
      <CardContent>
        {lastUpdatedISO === null ? (
          <div className="flex flex-col gap-3">
            <div className="h-3 animate-pulse" />
            <div className="h-3 animate-pulse" />
            <div className="h-3 animate-pulse" />
          </div>
        ) : (
          <div>
            {degradedTag !== null ? (
              <p
                data-slot="sandbox-degraded-tag"
                className="font-mono text-[11px] tracking-widest text-muted-foreground"
              >
                {degradedTag}
              </p>
            ) : null}
            <div className={pristine ? undefined : 'opacity-45'}>
              {!pristine ? (
                <p data-slot="sandbox-preview-tag" className="text-xs text-muted-foreground">
                  {PREVIEW_TAG_COPY}
                </p>
              ) : null}
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em]">TETİK HƏDLƏRİ</p>
              <KnobRow
                label="Killzone başlanğıc (dəq)"
                slot="sandbox-knob-kz-start"
                display={fmtInt(preview.kzStartMin)}
                min={CALIBRATION_KZ_MIN}
                max={CALIBRATION_KZ_MAX}
                step={1}
                value={preview.kzStartMin}
                disabled={degraded}
                onChange={(next) => setKzStartMin(next)}
              />
              <KnobRow
                label="Killzone son (dəq)"
                slot="sandbox-knob-kz-end"
                display={fmtInt(preview.kzEndMin)}
                min={CALIBRATION_KZ_MIN}
                max={CALIBRATION_KZ_MAX}
                step={1}
                value={preview.kzEndMin}
                disabled={degraded}
                onChange={(next) => setKzEndMin(next)}
              />
              <KnobRow
                label="Displacement əmsalı"
                slot="sandbox-knob-disp"
                display={fmtMult(preview.dispMult)}
                min={CALIBRATION_DISP_MIN}
                max={CALIBRATION_DISP_MAX}
                step={CALIBRATION_DISP_STEP}
                value={preview.dispMult}
                disabled={degraded}
                onChange={(next) => setDispMult(next)}
              />
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em]">HOVUZ TOLERANSLIĞI</p>
              <KnobRow
                label="Bərabərlik dözümü (bps)"
                slot="sandbox-knob-equal-tol"
                display={fmtInt(preview.equalTolBps)}
                min={CALIBRATION_EQUAL_TOL_MIN_BPS}
                max={CALIBRATION_EQUAL_TOL_MAX_BPS}
                step={1}
                value={preview.equalTolBps}
                disabled={degraded}
                onChange={(next) => setEqualTolBps(next)}
              />
              <KnobRow
                label="Bir corpus əmsalı"
                slot="sandbox-knob-merge"
                display={fmtMult(preview.mergeAtrMult)}
                min={CALIBRATION_MERGE_MIN}
                max={CALIBRATION_MERGE_MAX}
                step={CALIBRATION_MERGE_STEP}
                value={preview.mergeAtrMult}
                disabled={degraded}
                onChange={(next) => setMergeAtrMult(next)}
              />
              <KnobRow
                label="DOL gücləndirmə"
                slot="sandbox-knob-dol-boost"
                display={fmtMult(preview.dolBoost)}
                min={CALIBRATION_DOL_BOOST_MIN}
                max={CALIBRATION_DOL_BOOST_MAX}
                step={CALIBRATION_DOL_BOOST_STEP}
                value={preview.dolBoost}
                disabled={degraded}
                onChange={(next) => setDolBoost(next)}
              />
              <KnobRow
                label="Arxa cəza"
                slot="sandbox-knob-behind"
                display={fmtMult(preview.behindPenalty)}
                min={0}
                max={CALIBRATION_BEHIND_MAX}
                step={CALIBRATION_BEHIND_STEP}
                value={preview.behindPenalty}
                disabled={degraded}
                onChange={(next) => setBehindPenalty(next)}
              />
            </div>
            {staleLegError !== null ? (
              <p data-slot="sandbox-stale" className="font-mono text-xs tabular-nums text-muted-foreground">
                {staleLegError}
              </p>
            ) : null}
            {review.applied ? (
              <p data-slot="sandbox-applied" className="text-xs text-muted-foreground">
                {review.appliedCopy}
              </p>
            ) : null}
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={() => applyCalibrationPreview()} data-slot="sandbox-apply">
                Tətbiq et
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => resetCalibrationPreviewToPinned()}
                data-slot="sandbox-reset"
              >
                Yenilə
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
