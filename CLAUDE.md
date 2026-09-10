@AGENTS.md
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