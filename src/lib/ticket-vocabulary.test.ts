// TICK-03 (D-08): paper-ticket vocabulary quarantine.
// Brokerage vocabulary must never reach the tree — Filled / Submit Order /
// placeOrder fail the build with zero allowlist. `Position` is ICT
// methodology vocabulary (dealing-range 0-1 location), so it is scanned
// with an explicit pinned allowlist: computePosition / selectPosition /
// LevelsOutput.position plus the pre-existing lowercase `position` field
// names (range.ts, types.ts, levels.ts, store.ts, bias.ts) plus the three
// legitimate whole-word `Position` comment/label call sites below.
// Mirror of the src/lib/ict/purity.test.ts raw-text glob idiom.
// Test files excluded from self-scan so the guard never flags its own
// pattern strings.

import { describe, expect, it } from 'vitest';

const tsModules = import.meta.glob('../../{src,app,components,lib}/**/*.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

// `.tsx` sources (panels, chart) are a separate glob — one `*.ts` pattern
// never matches them, and a nested-brace `*.{ts,tsx}` glob is not portable.
const tsxModules = import.meta.glob('../../{src,app,components,lib}/**/*.tsx', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const modules: Record<string, string> = { ...tsModules, ...tsxModules };

function scannedSources(): Array<[string, string]> {
  return Object.entries(modules).filter(([path]) => !path.endsWith('.test.ts'));
}

// Zero-tolerance brokerage identifiers: case-sensitive whole-word matches.
// `Filled` — a filled broker order has no paper equivalent; `Submit Order`
// — a submit-CTA has no paper equivalent (sanctioned copy is KAĞIZ QEYD);
// `placeOrder` — a broker function name has no paper equivalent (sanctioned
// names are PaperTicket / paperLog only).
function brokerageViolations(text: string): string[] {
  const hits: string[] = [];
  if (/(^|\W)Filled(\W|$)/.test(text)) hits.push('Filled');
  if (/Submit Order/.test(text)) hits.push('Submit Order');
  if (/(^|\W)placeOrder(\W|$)/.test(text)) hits.push('placeOrder');
  return hits;
}

// Allowlisted pre-existing `Position` vocabulary (Pitfall 1): the ban
// targets brokerage vocabulary (a position held at a broker), never the
// dealing-range 0-1 location math. Each entry MUST still exist — the
// allowlist test below pins them so a future rename cannot silently widen
// the ban.
const POSITION_ALLOWLIST = [
  'computePosition',
  'selectPosition',
  'LevelsOutput.position',
  'position',
] as const;

// Whole-word `Position` (capital P) call sites that pre-date Phase 17 and
// are methodology vocabulary, not brokerage vocabulary. Each entry is
// repo-relative path-scoped so a new `Position` identifier anywhere else
// fails.
const POSITION_WORD_ALLOWLIST: Array<{ path: string; snippet: string }> = [
  { path: 'components/dashboard/report.tsx', snippet: 'Position label from dealing-range position' },
];

function normalizeKey(path: string): string {
  if (path.startsWith('./')) return 'src/lib/' + path.slice(2);
  if (path.startsWith('../../')) return path.slice(6);
  return path;
}

function positionViolations(path: string, text: string): string[] {
  const hits: string[] = [];
  let stripped = text;
  // Path-scoped comment/label call sites FIRST (before the generic symbol
  // strip removes the lowercase anchor the snippet needs to match).
  const repoPath = normalizeKey(path);
  for (const entry of POSITION_WORD_ALLOWLIST) {
    if (repoPath === entry.path) {
      stripped = stripped.replace(entry.snippet, '');
    }
  }
  // Strip every allowlisted symbol occurrence, then look for a remaining
  // whole-word `Position`.
  for (const symbol of POSITION_ALLOWLIST) {
    stripped = stripped.split(symbol).join('');
  }
  // Case-sensitive whole-word `Position` — lowercase `position` fields,
  // `Positioner` (radix primitive), and `positionLabel` are never matched.
  if (/(^|\W)Position(\W|$)/.test(stripped)) hits.push('Position');
  return hits;
}

describe('paper-ticket vocabulary quarantine', () => {
  it('contains no brokerage identifiers', () => {
    const violations = scannedSources()
      .map(([path, text]) => ({ path, hits: brokerageViolations(text) }))
      .filter((entry) => entry.hits.length > 0)
      .map((entry) => `${entry.path}: ${entry.hits.join(', ')}`);
    expect(violations).toEqual([]);
  });

  it('contains no brokerage Position outside the pinned allowlist', () => {
    const violations = scannedSources()
      .map(([path, text]) => ({ path, hits: positionViolations(path, text) }))
      .filter((entry) => entry.hits.length > 0)
      .map((entry) => `${entry.path}: ${entry.hits.join(', ')}`);
    expect(violations).toEqual([]);
  });

  it('pins the allowlisted pre-existing symbols so a rename cannot widen the ban', () => {
    const byPath = new Map(scannedSources());
    // Glob keys are relative to this file (`./ict/range.ts` for siblings,
    // `../../components/...` for tree roots) — normalize to repo-relative
    // paths so the pin survives key-prefix drift.
    const findBySuffix = (suffix: string): string => {
      for (const [path, text] of byPath) {
        if (normalizeKey(path) === suffix) return text;
      }
      throw new Error(`allowlist fixture missing: ${suffix}`);
    };
    // computePosition still defined in range.ts.
    expect(findBySuffix('src/lib/ict/range.ts')).toContain('computePosition');
    // selectPosition still declared in store.ts.
    expect(findBySuffix('src/lib/store.ts')).toContain('selectPosition');
    // LevelsOutput.position still declared in levels.ts.
    expect(findBySuffix('src/lib/ict/levels.ts')).toContain('LevelsOutput');
    expect(findBySuffix('src/lib/ict/levels.ts')).toContain('position: number');
    // Path-scoped Position call sites still present verbatim.
    for (const entry of POSITION_WORD_ALLOWLIST) {
      expect(findBySuffix(entry.path)).toContain(entry.snippet);
    }
  });
});
