# Phase 22: Pool Lifecycle + Decay (POOL2-04) - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-10-26
**Phase:** 22-Pool Lifecycle + Decay (POOL2-04)
**Areas discussed:** Decay clock, Re-accumulation identity, Ghost retention, Decay visibility

**Language note:** discussion run in Azerbaijani (user request mid-session — "azərbaycanca ver sualları", "recommend cavabları da olsun"). Questions below are recorded in the Azerbaijani form presented; CONTEXT.md carries the canonical English decisions.

---

## Decay clock (EN, first pass)

| Option | Description | Selected |
|--------|-------------|----------|
| D1 bars (Recommended) | ageBars = number of closed D1 candles between originDate and asOf — matches the 60-bar trailing lookback and session-based replay; weekends/holidays don't age pools. | ✓ |
| Calendar days | asOf − originDate in days — simpler to reason about, but a quiet week ages pools that saw no new price action. | |

**User's choice:** D1 bars (Recommended)
**Notes:** None — recommended option accepted directly.

| Option | Description | Selected |
|--------|-------------|----------|
| 10 bars (Recommended) | Research seed: decay = 1/(1 + ageBars/10) — a pool at 10 bars old scores half; old archaeology fades while fresh pain dominates. | ✓ |
| 20 bars | Slower fade — pools stay relevant roughly a full trading month; closer to the 60-bar lookback window. | |
| 5 bars | Fast fade — only this week's pools matter; §1 rank turns over aggressively. | |

**User's choice:** 10 bars (Recommended)
**Notes:** None.

| Option | Description | Selected |
|--------|-------------|----------|
| Floor at 0.25 (Recommended) | Ancient pools keep a quarter of their score — never fully vanish from rank while ACTIVE; avoids a hard cliff where a pool flips from relevant to zero between two bars. | ✓ |
| Fade to zero | Old enough ACTIVE pools score ~0 and sink to the bottom naturally; rank is purely earned by freshness + weight. | |

**User's choice:** Floor at 0.25 (Recommended)
**Notes:** None.

| Option | Description | Selected |
|--------|-------------|----------|
| Inline in scoreAndRank (Recommended) | One more factor in the existing score formula beside dolBoost/behindPenalty — smallest diff, single formula to read. | ✓ |
| Separate applyDecay wrapper | Pure applyDecay(scores, ages, asOf) beside scoreAndRank — decay logic isolated and unit-testable apart from ranking. | |

**User's choice:** Inline in scoreAndRank (Recommended)
**Notes:** None. After this area: user chose "Next area".

---

## Re-accumulation identity (EN, first pass — one retry)

First AskUserQuestion call failed validation (missing option labels); retried with shortened labels, then accepted.

| Option | Description | Selected |
|--------|-------------|----------|
| Independent | New swings past an old zone always seed a fully independent ACTIVE pool — simplest, falls out of detectPools naturally. | ✓ |
| Linked | Fresh pool carries a link to the old zone — enables re-accumulation narrative but adds lineage bookkeeping. | |

**User's choice:** Independent
**Notes:** None.

| Option | Description | Selected |
|--------|-------------|----------|
| Fresh seed | New cluster touching a SWEPT zone seeds its own ACTIVE pool — SWEPT memory stays dimmed ghost, fresh pain ranks on merit. | ✓ |
| Absorbed | Overlapping touches fold into the SWEPT zone — but re-arms swept memory and breaks D-04 weight immutability. | |

**User's choice:** Fresh seed
**Notes:** None.

| Option | Description | Selected |
|--------|-------------|----------|
| Stay gone | Consumed zones left the map and never return; a fresh pool near a consumed price is just a new pool. | ✓ |
| Flag it | Fresh pool at a previously consumed price gets flagged differently — stronger retest-magnetism story. | |

**User's choice:** Stay gone
**Notes:** None.

| Option | Description | Selected |
|--------|-------------|----------|
| Silent | §1 names rank-1 exactly as Phase 20 does — the new pool simply appears as rank-1 when it earns it. | ✓ |
| Mark it | Rank-1 sentence gains a marker when the pool is a fresh re-accumulation near an old zone. | |

**User's choice:** Silent
**Notes:** None. After this area: user chose "Next area" ("davam et" → continued).

---

## Ghost retention (AZ — user asked "azərbaycanca ver sualları")

First AZ batch rejected by user ("The user wants to clarify these questions" — no recommendation marks, 4th question unanswered). User then asked "recommend cavabları da olsun" (include recommended answers). Re-asked all four questions in Azerbaijani with (Tövsiyə) marks — all accepted.

| Option | Description | Selected |
|--------|-------------|----------|
| Eyni disiplin (Tövsiyə) | SWEPT kölgələr indiki originDate + trailing-20 disiplini ilə qalır — ayrı expiry yoxdur; yalnız map cap sıxışdıranda çıxırlar. Ən sadə, Phase 20 davranışı dəyişmir. | ✓ |
| Qısa expiry | Kölgələr daha tez silinir (məs. N bardan sonra map-da yer olsa belə) — dalğalı pəncərədə çox sweep yığılanda canvas təmiz qalır. | |

**User's choice:** Eyni disiplin (Tövsiyə)
**Notes:** Pre-rejection answers (EN batch): retention = same discipline, ordering = origin order, cap = none. Confirmed in AZ re-ask.

| Option | Description | Selected |
|--------|-------------|----------|
| Origin sırası (Tövsiyə) | Kölgələr rank-lanmış ACTIVE-lərdən sonra originDate sırasında qalır (indiki scoreAndRank davranışı) — decay onları yenidən sıralamır; yalnız ACTIVE rank hərəkət edir. | ✓ |
| Decay sırası | Kölgə göstərmə sırası decay-li skora görə olur — köhnə kölgələr öz aralarında da batır, aktual kölgələr üstdə çıxır. | |

**User's choice:** Origin sırası (Tövsiyə)
**Notes:** None.

| Option | Description | Selected |
|--------|-------------|----------|
| Cap yoxdur (Tövsiyə) | Ayrı ghost cap yoxdur — kölgələr ACTIVE 20-likdən kənarda gəzir (indiki kimi); map cap + nearest-2-per-side sayımı canvas-ı onsuz da bağlayır. | ✓ |
| Ghost cap | Açıq ghost cap (məs. ən yeni 5 SWEPT) — sweep-sıx rejimdə ən pis canvas qarışıqlığını map təzyiqindən asılı olmayaraq bağlayır. | |

**User's choice:** Cap yoxdur (Tövsiyə)
**Notes:** None.

| Option | Description | Selected |
|--------|-------------|----------|
| Skorsuz (Tövsiyə) | Kölgələr skor daşımır (indiki davranış) — decay yalnız ACTIVE rank məsələsidir; ghost dimming dəyişmir. | ✓ |
| Diaqnostik skor | Kölgələr decay-li skor alır, amma heç vaxt rank-a girmir — gələcək istehlakçılar kölgənin aktuallığını yenidən hesablamadan oxuya bilər. | |

**User's choice:** Skorsuz (Tövsiyə)
**Notes:** This 4th question was unanswered in the rejected EN batch; resolved in the AZ re-ask.

---

## Decay visibility (AZ)

| Option | Description | Selected |
|--------|-------------|----------|
| Səssiz (Tövsiyə) | §1 yeni rank-1-i Phase 20 formatında səssizcə adlandırır (side + bounds + ATR məsafə + status) — decay səbəbli rank dəyişimi prozada görünmür; verbatim reason toxunulmur. | ✓ |
| Qeyd ilə | Rank-1 cümləsinə qısa qeyd əlavə olunur (decay səbəbli rank dəyişəndə) — köhnəlmə treyderə legibil olur, amma Phase 20 verbatim prozasına əlavə deməkdir. | |

**User's choice:** Səssiz (Tövsiyə)
**Notes:** None.

| Option | Description | Selected |
|--------|-------------|----------|
| İz yoxdur (Tövsiyə) | Decay yalnız scorer riyaziyyatıdır — chart xəttləri/rənglərində decay izi yoxdur; Phase 20 xətt + 0.5 dimming disiplini dəyişmir. | ✓ |
| Solğun iz | Köhnəlmiş ACTIVE pullar chart-da vizual fərqlənir (məs. daha solğun xətt) — treyder xəritənin harasının köhnəldiyini canvas-da görür. | |

**User's choice:** İz yoxdur (Tövsiyə)
**Notes:** None.

| Option | Description | Selected |
|--------|-------------|----------|
| Eyni qalır (Tövsiyə) | Parity harness pools-on vs pools-off üçlüyü (trigger/flaw/ticket)uries tam eyni qalır — lifecycle proyeksiya kontekstidir, səs vermir (roadmap kilidi). | ✓ |
| Mətn fərqi olar | Parity tələbi yumşalır — decay-li rank ticket mətnində görünə bilər, amma verdictlər (FIRE/ARMED/QUIET, flaw, R/R gate) eyni qalmalıdır. | |

**User's choice:** Eyni qalır (Tövsiyə)
**Notes:** None.

| Option | Description | Selected |
|--------|-------------|----------|
| Sandbox-da (Tövsiyə) | Decay yarım-həyat + floor Phase 21-dəki kalibrasiya sandbox-dakı pool tolerance slider-larına qoşulur — what-if preview, explicit Apply, pinned konstantlar oxunur. | ✓ |
| UI-siz | Decay konstantları kodda pinlənir, UI-siz — kalibrasiya yalnız boundary testlər + firing-log review ilə olur. | |

**User's choice:** Sandbox-da (Tövsiyə)
**Notes:** None. After all areas: user chose "Kontekstə hazıram" (ready for context).

---

## Claude's Discretion

None — user decided all presented areas.

## Deferred Ideas

None — discussion stayed within phase scope.
```
