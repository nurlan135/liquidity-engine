import { differenceInHours, differenceInDays } from 'date-fns';

// Baku-clock countdown helpers. Pure: the clock enters only through the
// injected now parameter, defaulting to the current instant at the boundary.

// Format the gap between now and a target ISO instant as day/hour parts.
export function formatCountdown(targetISO: string, now: Date = new Date()): string {
  const target = new Date(targetISO);
  if (target.getTime() <= now.getTime()) {
    return '0g 0s sonra';
  }
  const days = differenceInDays(target, now);
  const hours = differenceInHours(target, now) - days * 24;
  return `${days}g ${hours}s sonra`;
}

// True when the target falls inside the pre-news window ahead of now.
export function isPreNews(targetISO: string, now: Date = new Date(), windowHours = 24): boolean {
  const targetMs = new Date(targetISO).getTime();
  const gapMs = targetMs - now.getTime();
  return gapMs > 0 && gapMs <= windowHours * 3_600_000;
}
