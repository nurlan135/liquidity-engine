import type { BiasDirection, BiasOutput, RegimeState } from '@/src/lib/ict/types';
import { ANCHOR_WINDOW } from '@/src/lib/ict/range';

export { ANCHOR_WINDOW };

const BUFFER_LO = 0.48;
const BUFFER_HI = 0.52;

export function computeBias(position: number, regime: RegimeState, closedCount: number): BiasOutput {
  if (!Number.isFinite(position) || closedCount < ANCHOR_WINDOW) {
    return {
      bias: 'COMPRESSION',
      rationale: `Insufficient history (${closedCount} of ${ANCHOR_WINDOW} closed candles) in ${regime} regime: holding COMPRESSION until the anchor window fills.`,
      position,
      regime,
    };
  }
  if (position >= BUFFER_LO && position <= BUFFER_HI) {
    return {
      bias: 'COMPRESSION',
      rationale: `Equilibrium-fair at position ${position} inside the 0.48-0.52 buffer in ${regime} regime: no premium or discount edge, longs and shorts both stand down.`,
      position,
      regime,
    };
  }
  // Round UI-facing position to 4 decimals so the rationale never renders a
  // raw float tail (e.g. 0.450644534469892285). Threshold comparisons above
  // still use the full-precision value.
  const displayPosition = Math.round(position * 10_000) / 10_000;
  let bias: BiasDirection;
  let rationale: string;
  if (position < BUFFER_LO) {
    bias = 'BULLISH';
    rationale = `Discount positioning at ${displayPosition} below the 0.48 buffer in ${regime} regime: price sits on the buy side of equilibrium, longs only.`;
  } else {
    bias = 'BEARISH';
    rationale = `Premium positioning at ${displayPosition} above the 0.52 buffer in ${regime} regime: price sits on the sell side of equilibrium, shorts only.`;
  }
  return { bias, rationale, position, regime };
}
