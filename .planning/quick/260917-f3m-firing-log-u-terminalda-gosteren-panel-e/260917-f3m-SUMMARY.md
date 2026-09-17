---
quick: 260917-f3m-firing-log-u-terminalda-gosteren-panel-e
plan: 260917-f3m
status: complete
tasks_completed: 2
tasks_total: 2
commits:
  - c51de24
  - 15fd81a
files_changed:
  - components/dashboard/firing-log-panel.tsx
  - components/dashboard/terminal-shell.tsx
verification:
  tsc: pass
  vitest_terminal_shell_store: pass (74 tests)
  eslint: pass
---

# Quick Task 260917-f3m Summary: firing log-u terminalda göstərən panel

`firingLog` store state-i TerminalShell sol sütununda görünən `Atəş Jurnalı`
panelinə çıxarıldı — operator trigger tarixçəsini terminalda birbaşa oxuyur.

## Nə edildi

- **Task 1 (c51de24):** Yeni `components/dashboard/firing-log-panel.tsx` —
  `'use client'`, `Card data-slot="firing-log"`, başlıq `Atəş Jurnalı`
  (ticket-panel uppercase trackinq stili). Üç birbaşa store abunəsi:
  `lastUpdatedISO`, `firingLog`, `firingLogOverflow`. Üç hal:
  skeleton (`lastUpdatedISO === null`), verbatim `Məlumat yoxdur`
  (boş log), dolu log — newest-first `slice().reverse()` sətirlər
  (`data-slot="firing-log-entry"`, `data-verdict`/`data-direction`/
  `data-session`/`data-asof` atributları) + overflow sətri
  (`data-slot="firing-log-overflow"`, `+N köhnə qeyd`).
- **Task 2 (15fd81a):** `terminal-shell.tsx`-ə import + sol sütunda
  `<SmtRow />`-dən dərhal sonra `<FiringLogPanel />` montajı.
  Başqa shell məntiqi dəyişmədi (prop drilling yoxdur).

## Qərarlar / məhdudiyyətlər (plandakı kimi tətbiq)

- `asOf` divar saatına çevrilmir — yalnız `data-asof` atributunda xam
  epoch; TZ məntiqi yoxdur (`sessionDate` artıq NY günü açarıdır).
- Gate etiketləri Azərbaycan dilində: `Zaman`, `Süpürmə`, `Displacement`
  (✓/✗); `reasonKey` + `sessionDate` verbatim.
- Komponent tam riyaziyyatsız: evaluateTrigger/computeTicket, fetch,
  set, Button — heç biri yoxdur.

## Yoxlama

- `npx tsc --noEmit` — təmiz
- `npx vitest run src/terminal-shell.test.ts src/lib/store.test.ts` —
  2 fayl, 74 test yaşıl
- `npx eslint` hər iki faylda — təmiz

## Sapmalar

Yoxdur — plan olduğu kimi icra edildi.
