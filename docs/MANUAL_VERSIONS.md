# Manual Version Manifest

Single source of truth for which manual revision each portal page was last vetted against.
Update this table AND the index.html footer table with every manual revision.

| Manual | Revision | Date | Last vetted | Pages depending on it |
|---|---|---|---|---|
| FCOM | R10 | 2026-04-01 | 2026-06-12 | flows_quiz.html (NP.21 amplified procedures, SP cross-refs), limitations.html (L.10), systems_quiz.html (systems chapters), index.html (footer table) |
| QRH | R7 | 2026-01-19 | 2026-06-11 | memory-items.html (verbatim memory items, 10 starred checklists), index.html (footer table) |
| FCTM | R9 | 2026-04-01 | n/a | index.html (footer table only — no content dependencies yet) |
| FOM | 123.1 | 2026-04-27 | n/a | index.html (footer table only) |
| MEL | R5 | 2026-04-01 | n/a | index.html (footer table only) |
| B787 Flows handout | 16APR25 | 2025-04-16 | 2026-06-12 | flows_quiz.html (cross-check source; FCOM wins on conflict) |
| Systems training decks | Jun 2026 | 2026-06-12 | 2026-06-12 | systems_quiz.html (1,540 Q from Systems_extract/*.md) |

## Page version registry

| Page | Ver | Citation style to grep |
|---|---|---|
| index.html | 1.2 | footer revtbl table |
| flows_quiz.html | 8.5 | `[FCOM NP.21.x:]` in d-fields; `XREFS` const for SP refs; `ref:` per flow |
| limitations.html | 1.1 | FCOM L.10 references |
| memory-items.html | 1.1 | QRH chapter numbers per item |
| systems_quiz.html | 2.3 | `ref:"FCOM x.x.x"` per question source map |

Rule: +0.1 to a page's Ver on every edit. Every page carries the common footer
(787 image + mailto:ryan.pettit@alaskaair.com?subject=B787%20Study%20Portal%20-%20PAGE_NAME + Ver).
