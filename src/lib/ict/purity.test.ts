import { describe, expect, it } from 'vitest';

// D-05/D-06: co-located purity grep guard for src/lib/ict. Methodology math
// stays pure — time is injected by callers, state lives in the store outside
// ict/. Reads sibling sources as raw text, fails on clock reads or store
// imports. Test files excluded from self-scan so the guard never flags its
// own pattern strings.
const sources = import.meta.glob('./*.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

function ictSources(): Array<[string, string]> {
  return Object.entries(sources).filter(([path]) => !path.endsWith('.test.ts'));
}

function hasStoreImport(text: string): boolean {
  return (
    text.includes("'zustand'") ||
    text.includes('"zustand"') ||
    text.includes("'src/lib/store'") ||
    text.includes('"src/lib/store"') ||
    text.includes("'@/store") ||
    text.includes('"@/store') ||
    text.includes("'@/src/lib/store") ||
    text.includes('"@/src/lib/store')
  );
}

describe('ict purity guard', () => {
  it('contains no Date.now( clock reads', () => {
    const violations = ictSources()
      .filter(([, text]) => text.includes('Date.now('))
      .map(([path]) => path);
    expect(violations).toEqual([]);
  });

  it('contains no store imports', () => {
    const violations = ictSources()
      .filter(([, text]) => hasStoreImport(text))
      .map(([path]) => path);
    expect(violations).toEqual([]);
  });
});
