// Report contract: six fixed sections plus regime badge copy.
// Pure constants: no I/O, no clock. English identifiers with Azerbaijani badge
// copy; locked English chip UNAVAILABLE untouched.

import type { RegimeState } from '@/src/lib/ict/types';

export type ReportSectionState = 'live' | 'unavailable';

export interface ReportSection {
  index: number;
  title: string;
  state: ReportSectionState;
}

// Six institutional report sections in fixed order; only section 2 (Macro
// Dealing Range) is live, the rest render dimmed with UNAVAILABLE markers.
export const REPORT_SECTIONS: ReportSection[] = [
  { index: 1, title: '1. RETAIL EXPOSURE & SENTIMENT ENGINEERING', state: 'unavailable' },
  { index: 2, title: '2. MACRO DEALING RANGE & VOLATILITY REGIME (D1/4H)', state: 'live' },
  { index: 3, title: '3. LIQUIDITY SEQUENCING & CROSS-MARKET SMT (1H/15M)', state: 'unavailable' },
  { index: 4, title: '4. "WHY NOW?" EXECUTION PROTOCOL (5M/1M)', state: 'unavailable' },
  { index: 5, title: '5. INSTITUTIONAL ORDER TICKET', state: 'unavailable' },
  { index: 6, title: '6. FATAL FLAW CHECK & CHALLENGE QUESTION', state: 'unavailable' },
];

export const REGIME_BADGE: Record<RegimeState, string> = {
  expansion: 'Genişlənmə',
  compression: 'Sıxılma',
};

// Pre-news override: a high-impact event inside the window supersedes the ATR badge.
export const PRE_NEWS_BADGE = 'Yüksək təsirli xəbər gözlənilir';
