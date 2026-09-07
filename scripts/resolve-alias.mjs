// ESM resolve hook so plain `node` executes scripts that drive the
// bundler-style `@/` sources. Rewrites `@/<rel>` to `<root>/<rel>.ts`
// (type-stripped by `--experimental-strip-types`) and passes everything
// else through. Dependency-free (node built-ins only).
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('@/')) {
    // WR-04: normalize and contain. A specifier like `@/../../outside.ts`
    // joins to a path outside ROOT; without a containment check it would be
    // loaded with shortCircuit. Fall through on escape so Node resolves it
    // normally (and fails) instead of loading an out-of-root file.
    const candidate = path.normalize(path.join(ROOT, specifier.slice(2).concat('.ts')));
    if (!candidate.startsWith(ROOT)) {
      return nextResolve(specifier, context);
    }
    if (existsSync(candidate)) {
      return { url: pathToFileURL(candidate).href, shortCircuit: true };
    }
  }
  return nextResolve(specifier, context);
}
