import type { CanvasRenderingTarget2D } from 'fancy-canvas';
import type {
  AutoscaleInfo,
  Coordinate,
  IChartApiBase,
  IPrimitivePaneRenderer,
  IPrimitivePaneView,
  ISeriesApi,
  ISeriesPrimitive,
  SeriesAttachedParameter,
  SeriesType,
  Time,
} from 'lightweight-charts';
import type { ZoneBands } from '@/src/lib/zone-bands';

// Zone fill colors resolve the terminal tokens at draw time so theme changes
// apply without re-attaching the primitive.
const VAR_PREMIUM_FILL = '--terminal-premium-fill';
const VAR_DISCOUNT_FILL = '--terminal-discount-fill';
const FALLBACK_PREMIUM_FILL = 'rgba(255, 0, 255, 0.08)';
const FALLBACK_DISCOUNT_FILL = 'rgba(0, 255, 136, 0.08)';

function readVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value === '' ? fallback : value;
}

export type ZoneBandsGetter = () => ZoneBands | null;

// Live scale read: the renderer calls this getter on every draw so mutating
// ZoneFillPrimitive.opacityScale after attach changes the applied alpha.
// A plain number snapshot here would freeze the first value (Pitfall 1).
export type ZoneOpacityScaleGetter = () => number;

interface SeriesLike {
  priceToCoordinate(price: number): Coordinate | null;
}

class ZoneFillRenderer implements IPrimitivePaneRenderer {
  private readonly series: SeriesLike;
  private readonly getBands: ZoneBandsGetter;
  private readonly getOpacityScale: ZoneOpacityScaleGetter;

  constructor(series: SeriesLike, getBands: ZoneBandsGetter, getOpacityScale: ZoneOpacityScaleGetter) {
    this.series = series;
    this.getBands = getBands;
    this.getOpacityScale = getOpacityScale;
  }

  draw(target: CanvasRenderingTarget2D): void {
    const bands = this.getBands();
    if (bands === null) return;
    // Recompute price-to-pixel geometry on every draw so pan and zoom never desync.
    const premiumTop = this.series.priceToCoordinate(bands.premiumTop);
    const premiumBottom = this.series.priceToCoordinate(bands.premiumBottom);
    const discountTop = this.series.priceToCoordinate(bands.discountTop);
    const discountBottom = this.series.priceToCoordinate(bands.discountBottom);
    if (premiumTop === null || premiumBottom === null || discountTop === null || discountBottom === null) {
      return;
    }
    const opacityScale = this.getOpacityScale();
    target.useBitmapCoordinateSpace((scope) => {
      const width = scope.mediaSize.width;
      const ctx = scope.context;
      ctx.save();
      if (opacityScale !== 1) {
        ctx.globalAlpha = opacityScale;
      }
      ctx.fillStyle = readVar(VAR_PREMIUM_FILL, FALLBACK_PREMIUM_FILL);
      ctx.fillRect(0, premiumTop, width, premiumBottom - premiumTop);
      ctx.fillStyle = readVar(VAR_DISCOUNT_FILL, FALLBACK_DISCOUNT_FILL);
      ctx.fillRect(0, discountTop, width, discountBottom - discountTop);
      ctx.restore();
    });
  }
}

class ZoneFillView implements IPrimitivePaneView {
  private readonly rendererInstance: ZoneFillRenderer;

  constructor(series: SeriesLike, getBands: ZoneBandsGetter, getOpacityScale: ZoneOpacityScaleGetter) {
    this.rendererInstance = new ZoneFillRenderer(series, getBands, getOpacityScale);
  }

  renderer(): IPrimitivePaneRenderer {
    return this.rendererInstance;
  }
}

// ZoneFillPrimitive paints the premium half magenta and the discount half
// green following the official session-highlighting ISeriesPrimitive pattern.
// Opacity scale 1 is the live look; 0.5 over the 8% tokens yields the 4%
// stale desaturation without touching geometry.
export class ZoneFillPrimitive implements ISeriesPrimitive<Time> {
  private readonly getBands: ZoneBandsGetter;
  private requestUpdate: (() => void) | null = null;
  private series: ISeriesApi<SeriesType> | null = null;
  private chart: IChartApiBase<Time> | null = null;
  private readonly views: ZoneFillView[] = [];
  opacityScale = 1;

  constructor(getBands: ZoneBandsGetter) {
    this.getBands = getBands;
  }

  attached(param: SeriesAttachedParameter<Time>): void {
    this.series = param.series as ISeriesApi<SeriesType>;
    this.chart = param.chart;
    this.requestUpdate = param.requestUpdate;
    this.views.length = 0;
    this.views.push(new ZoneFillView(param.series, this.getBands, () => this.opacityScale));
  }

  detached(): void {
    this.series = null;
    this.chart = null;
    this.requestUpdate = null;
    this.views.length = 0;
  }

  paneViews(): readonly IPrimitivePaneView[] {
    return this.views;
  }

  autoscaleInfo(): AutoscaleInfo | null {
    // Zone fills never rescale the price axis; candles own autoscale.
    return null;
  }

  updateBands(): void {
    this.requestUpdate?.();
  }
}

export function attachZoneFill(
  series: { attachPrimitive(primitive: ISeriesPrimitive<Time>): void },
  getBands: ZoneBandsGetter,
): ZoneFillPrimitive {
  const primitive = new ZoneFillPrimitive(getBands);
  series.attachPrimitive(primitive);
  return primitive;
}

export function detachZoneFill(
  series: { detachPrimitive(primitive: ISeriesPrimitive<Time>): void },
  primitive: ZoneFillPrimitive,
): void {
  series.detachPrimitive(primitive);
}

// Sanctioned executor fallback (D-11): if the primitive spike overruns its
// time-box, fall back to a bounded overlay LineSeries pair tracing range high
// and range low across the visible window with autoscale disabled. The caller
// creates the two line series with an autoscaleInfoProvider returning null and
// feeds them from this builder.
export interface ZoneOverlayFallback {
  highLine: { time: string; value: number }[];
  lowLine: { time: string; value: number }[];
}

export function buildZoneOverlayFallback(
  times: string[],
  bands: ZoneBands,
): ZoneOverlayFallback {
  return {
    highLine: times.map((time) => ({ time, value: bands.premiumTop })),
    lowLine: times.map((time) => ({ time, value: bands.discountBottom })),
  };
}
