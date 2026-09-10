<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
## Git Worktree Hygiene (execute-phase üçün)

Hər `execute-phase` dispatch-dən ƏVVƏL:
1. `git fetch origin` icra et.
2. `HEAD` ilə `origin/HEAD` arasında divergence yoxla
   (`node .../gsd-tools.cjs query worktree.base-check --mode ... --pick shouldDegrade`).
3. Əgər `shouldDegrade: true` gəlirsə VƏ bu gözlənilməz haldırsa (yəni feature branch
   üzərində qəsdən deyil), istifadəçiyə bildir və dispatch-dən əvvəl:
   - lokal commit'ləri push et, YA DA
   - `origin/HEAD`-i yenilə (`git remote set-head origin -a`).
4. Əgər divergence qəsdəndir (aktiv feature branch, hələ merge olunmayıb),
   sual vermə — `worktree.baseRef: "head"` konfiqi artıq bunu idarə edir,
   sadəcə sequential/parallel rejim seçimini istifadəçiyə bir cümlə ilə bildir,
   dayanma.

## Config Warning Hygiene

`defaults.json` (`~/.gsd/defaults.json`) ilə layihə konfiqi arasında
`resolve_model_ids`/`runtime` kimi açarlar üst-üstə düşəndə xəbərdarlıq (#3532)
çıxır. Bu access xətası deyil — sadəcə hansı konfiqin qazandığını göstərir.
Bunu hər dəfə görməmək üçün: eyni açarları YALNIZ layihə konfiqində saxla,
qlobal defaults.json-dan sil (və ya əksinə, hansı strategiyanı seçmisənsə).