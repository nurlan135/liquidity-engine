import { describe, expect, it, vi } from 'vitest';
import { zoneBands } from '@/src/lib/zone-bands';
import { ZoneFillPrimitive } from '@/components/charts/zone-primitive';

describe('zoneBands', () => {
  it('splits a 100/0/50 range into premium 50-100 and discount 0-50 halves', () => {
    const bands = zoneBands({ high: 100, low: 0, eq: 50 });
    expect(bands.premiumBottom).toBe(50);
    expect(bands.premiumTop).toBe(100);
    expect(bands.discountBottom).toBe(0);
    expect(bands.discountTop).toBe(50);
  });

  it('throws on non-finite high low or eq', () => {
    expect(() =>
      zoneBands({ high: NaN, low: 0, eq: 50 }),
    ).toThrow();
    expect(() =>
      zoneBands({ high: 100, low: Infinity, eq: 50 }),
    ).toThrow();
    expect(() =>
      zoneBands({ high: 100, low: 0, eq: NaN }),
    ).toThrow();
  });

  it('throws when eq lies outside the high low span', () => {
    expect(() =>
      zoneBands({ high: 100, low: 0, eq: 150 }),
    ).toThrow();
    expect(() =>
      zoneBands({ high: 100, low: 0, eq: -10 }),
    ).toThrow();
  });
});

describe('ZoneFillPrimitive opacity live-read (13-02 Task 1)', () => {
  const bands = { premiumTop: 100, premiumBottom: 50, discountTop: 50, discountBottom: 0 };
  const seriesLike = { priceToCoordinate: (price: number) => price as unknown as ReturnType<typeof Object> as never };

  function stubTarget(capture: { globalAlphas: (number | undefined)[] }) {
    const ctx = {
      save: vi.fn(),
      restore: vi.fn(),
      fillRect: vi.fn(),
      set fillStyle(_v: string) {},
      set globalAlpha(v: number) {
        capture.globalAlphas.push(v);
      },
      get globalAlpha() {
        return 1;
      },
    };
    return {
      useBitmapCoordinateSpace: (fn: (scope: { mediaSize: { width: number }; context: unknown }) => void) => {
        fn({ mediaSize: { width: 100 }, context: ctx });
      },
    };
  }

  function attachAndDraw(primitive: ZoneFillPrimitive, target: unknown) {
    primitive.attached({
      series: seriesLike,
      chart: {},
      requestUpdate: () => {},
    } as unknown as Parameters<ZoneFillPrimitive['attached']>[0]);
    const view = primitive.paneViews()[0]!;
    view.renderer()!.draw(target as never);
  }

  it('draws at full strength by default with no globalAlpha override', () => {
    const primitive = new ZoneFillPrimitive(() => bands);
    const capture = { globalAlphas: [] as (number | undefined)[] };
    attachAndDraw(primitive, stubTarget(capture));
    expect(primitive.opacityScale).toBe(1);
    expect(capture.globalAlphas).toEqual([]);
  });

  it('applies alpha 0.5 when the field mutates to 0.5 after attach (stale/thin precedent)', () => {
    const primitive = new ZoneFillPrimitive(() => bands);
    primitive.attached({
      series: seriesLike,
      chart: {},
      requestUpdate: () => {},
    } as unknown as Parameters<ZoneFillPrimitive['attached']>[0]);
    primitive.opacityScale = 0.5;
    const capture = { globalAlphas: [] as (number | undefined)[] };
    primitive.paneViews()[0]!.renderer()!.draw(stubTarget(capture) as never);
    expect(capture.globalAlphas).toEqual([0.5]);
  });

  it('restores full strength when the field returns to 1 without re-attach', () => {
    const primitive = new ZoneFillPrimitive(() => bands);
    primitive.attached({
      series: seriesLike,
      chart: {},
      requestUpdate: () => {},
    } as unknown as Parameters<ZoneFillPrimitive['attached']>[0]);
    primitive.opacityScale = 0.5;
    primitive.opacityScale = 1;
    const capture = { globalAlphas: [] as (number | undefined)[] };
    primitive.paneViews()[0]!.renderer()!.draw(stubTarget(capture) as never);
    expect(capture.globalAlphas).toEqual([]);
  });
});
