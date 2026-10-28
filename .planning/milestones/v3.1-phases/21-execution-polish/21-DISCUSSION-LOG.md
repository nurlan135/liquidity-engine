# Phase 21: Execution Polish - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-10-27
**Phase:** 21-execution-polish
**Areas discussed:** Ticket buffer həndəsəsi, Paritet harness forması, Slider kontrollar əhatəsi, Fire-rate review səthi

---

## Ticket buffer həndəsəsi (SL)

| Option | Description | Selected |
|--------|-------------|----------|
| 0.25×ATR buffer | SL = struktur ekstremumu + 0.25×ATR — hazırkı resolveSL məntiqinə ən yaxın, konservativ | ✓ |
| 0.5×ATR buffer | SL = struktur ekstremumu + 0.5×ATR — daha geniş nəfəs otağı, amma R:R pisləşir | |
| Rejimə-görə dinamik | NQ volatil rejiminə görə dinamik — sakitdə dar, genişlənmədə geniş | |

**User's choice:** 0.25×ATR buffer
**Notes:** Ekstremum mənbəyi soruşulduqda user "FVG+Asia + buffer" yazdı — hazırkı `resolveSL` məntiqi saxlanılır, üstünə buffer əlavə olunur.

---

## Ticket buffer həndəsəsi (TP)

| Option | Description | Selected |
|--------|-------------|----------|
| 0.25×ATR içəridə | TP = ekstremum − 0.25×ATR — SL ilə simmetrik, hesablanması sadə | |
| Struktur cibinə | TP struktur ciblərinə (OTE/Q1/Q3) snap olunur — market strukturuna hörmət edir | |
| Pilləli TP1/TP2/TP3 | TP1 tez çıxış, TP2/TP3 ekstremuma yaxın — qismən bağlama məntiqi | ✓ |

**User's choice:** Pilləli TP1/TP2/TP3
**Notes:** POL-02 magnet-to-the-line qadağanı əsaslandırır — pilləli struktur saxlanılır, heç bir leg ekstremum xəttinə maqnitlənmir.

---

## Paritet harness forması

| Option | Description | Selected |
|--------|-------------|----------|
| Vitest harness | trigger/flaw/ticket verdiktləri pools on vs off — tam avtomatik, CI-də işləyir | ✓ |
| UI toggle | Terminal UI-də pools on/off toggle — operator özü müqayisə edir | |

**User's choice:** Vitest harness
**Notes:** Dev sübutu seçildi — operator sübutu yox, CI sübutu.

---

## Paritet verdikt əhatəsi

| Option | Description | Selected |
|--------|-------------|----------|
| Yalnız trigger | Yalnız trigger verdict (FIRE / STAND_ASIDE) — ən kritik | |
| Tam: trigger+flaw+ticket | Trigger + flaw + ticket — tam zəncir | ✓ (Claude's discretion) |

**User's choice:** "layihəyə uyğun ən optimal cavabı ver" — Claude tam əhatəni seçdi (POL-03 mətni + D-17 lock əsaslandırması ilə).
**Notes:** Qiymət eynidir (eyni fixture, eyni dövrə) — yalnız iki əlavə assertion.

---

## Slider kontrollar əhatəsi

| Option | Description | Selected |
|--------|-------------|----------|
| Tək: fire threshold | Yalnız WHY NOW fire threshold — minimal, təhlükəsiz | ✓ |
| Fire + pool tolerance | Fire threshold + pool tolerance (cap, ATR-merge, DOL boost) — tam kalibrasiya paneli | |

**User's choice:** Tək: fire threshold
**Notes:** Pool tolerance sabitləri CALIBRATION-PROVISIONAL toxunulmaz qalır (Phase 19 D-22).

---

## Slider persist

| Option | Description | Selected |
|--------|-------------|----------|
| localStorage persist | Slider dəyəri localStorage-da saxlanılır — operatorun seçimi sessiyalararası qalır | ✓ (Claude's discretion) |
| Sessiya-only default | Hər yükləmədə default-a qayıdır — kalibrasiya həmişə məlum bazadan başlayır | |

**User's choice:** "layihəyə uyğun ən optimal cavabı ver" — Claude persist seçdi (kalibrasiya davamlılığı əsaslandırması ilə).
**Notes:** Default kodda qalır + reset imkanı tövsiyə olunur.

---

## Fire-rate review səthi

| Option | Description | Selected |
|--------|-------------|----------|
| Report sətr | Report-da mövcud §5/paper-ticket yanında kiçik sətr — 7-günlük say + band statusu | ✓ (Claude's discretion) |
| Ayrı panel | Firing log tarixçəsi + həftəlik say qrafiki ilə ayrı panel — tam şəffaflıq | |
| JSON export kifayətdir | firingLogToJson artıq var — operator JSON endirir, özü təhlil edir | |

**User's choice:** "layihəyə uyğun ən optimal cavabı ver" — Claude report sətrini seçdi (gündəlik operator axını + minimal UI dəyişikliyi əsaslandırması ilə).
**Notes:** Ayrı panel scope creep riski daşıyırdı; JSON təkbaşına "review" deyil.

---

## Qalan sahələr yoxlaması

| Option | Description | Selected |
|--------|-------------|----------|
| Kontekst hazırdır | 3 sahə müzakirə olundu — CONTEXT.md yazılsın | |
| Daha boz sahə var | Fire-rate review səthi və ya yeni sahə əlavə edilsin | ✓ |

**User's choice:** Daha boz sahə var → Fire-rate review səthi müzakirə olundu (yuxarıda).
**Notes:** İlkin seçimdə yalnız 3 sahə seçilmişdi; yoxlama sualı 4-cü sahəni (POL-01) üzə çıxardı.

---

## Claude's Discretion

- Paritet verdikt əhatəsi (tam trigger+flaw+ticket)
- Slider persist (localStorage)
- Fire-rate review səthi (report sətr)

Hər üçündə user "layihəyə uyğun ən optimal cavabı ver" dedi; Claude POL mətnləri + D-17 lock + kalibrasiya davamlılığı + operator axını əsasında qərar verdi.

## Deferred Ideas

None — discussion stayed within phase scope.

---

## Post-discussion add-on (2026-10-27, user-approved)

User asked whether Phases 19–20 left unfinished work; review of 19/20 VERIFICATION + 20-UI-REVIEW surfaced 3 non-blocking UI polish items. User approved folding all 3 into Phase 21 as D-15/D-16/D-17:

| Item | Source | Decision |
|------|--------|----------|
| §1 sub-block rhythm (`space-y-1`) | 20-UI-REVIEW fix 1 | D-15 — one class on `div[data-slot="s1-pain-threshold"]`, no contract change |
| Color literal-vs-token sync pin | 20-UI-REVIEW fix 2 | D-16 — test-only assertion, rides with parity harness PR |
| `aria-live="polite"` on §1 live section | 20-UI-REVIEW fix 3 | D-17 — additive attribute, spans stay `aria-hidden` |

Nyquist validation (`19/20-VALIDATION.md` draft) and P2 backlog (POOL2-01–05) remain out of Phase 21 scope — noted, not folded.
