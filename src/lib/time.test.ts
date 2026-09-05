import { describe, expect, it } from 'vitest';
import { getTimezoneOffset } from 'date-fns-tz';
import {
  BAKU_TZ,
  CME_TZ,
  bakuOffsetMinutes,
  getAsOfBakuDate,
  toBakuYMD,
} from '@/src/lib/time';

const ASCII_DATE = /^\d{4}-\d{2}-\d{2}$/;

function chicagoOffsetMinutes(at: Date): number {
  return getTimezoneOffset(CME_TZ, at) / 60_000;
}

describe('baku time suite', () => {
  it('March spring-forward pair buckets to the same Baku date with stable +240 offset', () => {
    const before = new Date('2026-03-08T06:59:00Z');
    const after = new Date('2026-03-08T07:01:00Z');
    expect(toBakuYMD(before)).toBe('2026-03-08');
    expect(toBakuYMD(after)).toBe('2026-03-08');
    expect(bakuOffsetMinutes(before)).toBe(240);
    expect(bakuOffsetMinutes(after)).toBe(240);
  });

  it('November fall-back window keeps Baku at +240 while Chicago flips', () => {
    const preDst = new Date('2026-10-31T00:00:00Z');
    const postDst = new Date('2026-11-01T06:00:00Z');
    expect(chicagoOffsetMinutes(preDst)).toBe(-300);
    expect(chicagoOffsetMinutes(postDst)).toBe(-360);
    expect(bakuOffsetMinutes(preDst)).toBe(240);
    expect(bakuOffsetMinutes(postDst)).toBe(240);
    expect(toBakuYMD(postDst)).toBe('2026-11-01');
    expect(toBakuYMD(new Date('2026-11-01T05:00:00Z'))).toBe('2026-11-01');
  });

  it('midnight boundary buckets 19:59Z to 06-15 and 20:01Z to 06-16', () => {
    expect(toBakuYMD(new Date('2026-06-15T19:59:00Z'))).toBe('2026-06-15');
    expect(toBakuYMD(new Date('2026-06-15T20:01:00Z'))).toBe('2026-06-16');
    expect(bakuOffsetMinutes(new Date('2026-06-15T19:59:00Z'))).toBe(240);
    expect(bakuOffsetMinutes(new Date('2026-06-15T20:01:00Z'))).toBe(240);
  });

  it('adjacent daily timestamps map to adjacent Baku dates with no merge or gap', () => {
    const dayMs = 86_400_000;
    const first = Date.parse('2026-01-05T00:00:00Z');
    const dates = [first, first + dayMs].map((ms) => toBakuYMD(ms));
    expect(dates).toEqual(['2026-01-05', '2026-01-06']);
  });

  it('Unix epoch formats to 1970-01-01 with no throw on minimum input', () => {
    expect(toBakuYMD(new Date(0))).toBe('1970-01-01');
    expect(toBakuYMD(0)).toBe('1970-01-01');
    expect(getAsOfBakuDate(new Date(0))).toBe('1970-01-01');
  });

  it('repeated formatting of the same instant returns the identical string', () => {
    const at = new Date('2026-06-15T12:34:56Z');
    expect(toBakuYMD(at)).toBe(toBakuYMD(new Date(at.getTime())));
    expect(getAsOfBakuDate(at)).toBe(getAsOfBakuDate(new Date(at.getTime())));
  });

  it('all outputs are ASCII YYYY-MM-DD strings', () => {
    const instants = [
      new Date('2026-03-08T06:59:00Z'),
      new Date('2026-11-01T06:00:00Z'),
      new Date('2026-06-15T20:01:00Z'),
      new Date(0),
    ];
    for (const at of instants) {
      const s = toBakuYMD(at);
      expect(s).toMatch(ASCII_DATE);
      expect([...s].every((ch) => ch.charCodeAt(0) < 128)).toBe(true);
    }
  });

  it('concurrent formatting of distinct instants returns per-instant dates', async () => {
    const inputs: Array<[Date, string]> = [
      [new Date('2026-03-08T06:59:00Z'), '2026-03-08'],
      [new Date('2026-03-08T07:01:00Z'), '2026-03-08'],
      [new Date('2026-06-15T19:59:00Z'), '2026-06-15'],
      [new Date('2026-06-15T20:01:00Z'), '2026-06-16'],
      [new Date('2026-11-01T06:00:00Z'), '2026-11-01'],
      [new Date(0), '1970-01-01'],
    ];
    const results = await Promise.all(inputs.map(async ([at]) => toBakuYMD(at)));
    results.forEach((result, i) => {
      expect(result).toBe(inputs[i][1]);
    });
  });

  it('sub-second fractional-millisecond instants bucket to the containing Baku date', () => {
    expect(toBakuYMD(new Date('2026-06-15T19:59:59.999Z'))).toBe('2026-06-15');
    expect(toBakuYMD(new Date('2026-06-15T20:00:00.001Z'))).toBe('2026-06-16');
  });

  it('far-future and far-past instants bucket without throw', () => {
    expect(toBakuYMD(new Date('1900-01-01T00:00:00Z'))).toMatch(ASCII_DATE);
    expect(toBakuYMD(new Date('2100-01-01T00:00:00Z'))).toMatch(ASCII_DATE);
  });

  it('exposes Baku and CME IANA zone constants', () => {
    expect(BAKU_TZ).toBe('Asia/Baku');
    expect(CME_TZ).toBe('America/Chicago');
  });
});
