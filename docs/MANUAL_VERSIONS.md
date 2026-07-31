# Manual Version Manifest

Records which manual revision each portal page was last vetted against.
The authoritative per-section dependency map is AUTO-GENERATED in docs/CITATION_INDEX.md
(run `python3 build_scripts/citation_index.py`). Update this table + the index.html footer on every revision.

| Manual | Revision | Date | Last vetted | Pages depending on it |
|---|---|---|---|---|
| FCOM | R10 | 2026-04-01 | 2026-06-17 | flows_quiz (NP.21), limitations (L.10), systems_quiz, limit-or-bust (L.10), jeopardy, aircraft_setup (NP.21), cdu_preflight (NP.21.2-5), triggers (NP.21), podcast, index footer |
| QRH | R7 | 2026-01-19 | 2026-06-17 | memory-items, hot-seat, podcast, index footer |
| FCTM | R9 | 2026-04-01 | 2026-06-23 | systems_quiz, flows_quiz, podcast, index footer |
| FOM | 125 | 2026-07-29 | 2026-07-31 | weather, wx-alternate, systems_quiz, limit-or-bust, podcast, fom_quiz + fom_q/*.json, phase_flows, index footer |
| MEL | R5 | 2026-04-01 | 2026-06-17 | podcast, index footer |
| AOM | TBD | TBD | not vetted | (AOM PDF not present in Drive folder as of 2026-06-23; revision cannot be confirmed - do not cite until staged) |
| Systems training decks | Jun 2026 | 2026-06-12 | systems_quiz + sv_exam (1,515 Q from Systems_extract/*.md) |

FCTM R9 (April 1, 2026) confirmed 2026-06-23 against the PDF cover page (Revision Number: 9, Revision Date: April 1, 2026).

## Coverage status (from citation_index.py, updated 2026-06-21)

TAGGED (auto-traceable via structured `ref:` / `[MANUAL ...]` markers):
flows_quiz, limitations, memory-items, systems_quiz, weather, wx-alternate, hot-seat, limit-or-bust, jeopardy, aircraft_setup, cdu_preflight, triggers, podcast.

aircraft_setup.html carries a machine-readable source declaration (ref:"FCOM NP.21") in its <head>: the setup flow is FCOM Normal Procedures NP.21 (Preflight/Setup) + the B787 Aircraft Setup handout. Per-step manual sections are not individually cited; FCOM NP.21 is the controlling source.

sv_exam.html (SV Practice Exam) carries NO new manual dependency: it reuses the already-vetted systems_quiz question bank (sv_questions.json, 1,515 Q extracted verbatim from systems_quiz.html). Vetting follows systems_quiz.

triggers.html (Triggers Quizzer, Ver 1.0, added 2026-07-01): FCOM NP.21 citations on go-around and checklist-order cards; the phase-trigger, approach-setup (ATIS/Build/Bug/Brief/Brakes), and "Checklist Complete" (Before Takeoff + Landing only) cards are company SOP / class notes / gate-to-takeoff trigger map (Charlie Morris + Ryan), labeled as such in each card's Source panel.

UNTAGGED (manual review required):
- **view.html** - PDF-viewer utility page, mentions QRH in passing, no study content. Low risk.

## Podcast
Regenerated via build_scripts/ (parse_ep.py + master_ep_fast.sh). Per-episode manual sources live in
the episode source .txt / manifests. See build_scripts/PODCAST_BUILD_TOOLCHAIN.md.

## Page version registry (bump +0.1 per edit)
index 2.18 | flows_quiz 9.6 | hot-seat 1.3 | jeopardy 1.0 | limit-or-bust 1.4 | limitations 2.6 | memory-items 1.6 | triggers 1.6 | systems_quiz 2.6 | weather 1.6 | wx-alternate 1.2 | aircraft_setup 1.5 | cdu_preflight 1.0 | sv_exam 1.0 | phase_flows (see page footer) | podcast.html data-driven

## Open build items
- 4 DRAFT stub flows (NP.21.30 Pushback/Towing, Cruise/ETOPS entry, NP.21.45 Landing-IAN, NP.21.48 Landing-VNAV) still pending in flows_quiz.html / phase_flows.html. Verbatim source staged in docs/FLOWS_REBUILD_SOURCE_NP21.md (FCOM R10). Flows 3 (CDU Preflight) and 4 (Preflight-FO) FCOM R10 verbatim audit CLOSED 2026-07-03 (flows_quiz Ver 9.6).
- index.html footer photo: B787_night.jpg now committed as a real binary file and referenced via <img src> (replaced the truncated-base64 / SVG-placeholder saga; byte-verified md5 47bc434c…).

## FOM Rev 125 sweep (2026-07-31)

FOM 125 (Rev date 7/29/26) replaced 124.2. 52 sections changed; the Revision Highlights table was
extracted from the PDF and every changed section was body-diffed 124.2 -> 125 rather than trusting
the highlights prose. Portal citations were matched against the changed list in BOTH directions.

Applied: revision strings across index/weather/podcast/fom_questions/build docs; weather.html and
wx-alternate.html section remap 8.2.4 -> 8.2.2, 8.2.4.1 -> 8.2.2.1, 8.2.4.2 -> 8.2.2.2, 8.2.5 -> 8.2.3
(those numbers do not exist in 124.2 either, so this was a pre-existing defect); weather.html
contiguous-48 no-alternate answer corrected (the "2 sm more" additive is Alaska-only); new weather
card for FOM 5.4.4, which now covers the 787 for takeoffs below 500 RVR; 17 corrections in fom_q/.

Known tooling gaps found during this sweep, not yet fixed:
- citation_index.py writes citation_index.json to the repo root but manual_diff.py reads it from
  build_scripts/, so manual_diff.py fails on a clean clone until the file is copied.
- manual_diff.py matches only one direction. A page citing FOM 5.6.6 is NOT flagged when 5.6.6.3
  changes. Bidirectional matching found one extra hit this revision.
- fom_quiz.html / fom_q/*.json and cdu_preflight.html carry FOM-derived content but emit no
  parseable ref markers, so they are invisible to the citation index.
- The citation parser swallowed the podcast "FOM 124.2" blurb as if it were a section number.

Still open after this sweep:
- systems_quiz.html: 11 pre-existing FOM citation errors (wrong section numbers and one fabricated
  quote at sv-ground-078). None caused by Rev 125. Not applied; awaiting a decision.
- podcast ep70 (Ch15 Security) teaches a deleted galley Option 3 and omits the now-mandatory IPSB
  deploy step. Audio re-cut not approved in this session.
- 34 of the 52 changed sections have no quiz coverage at all. Highest-value 787 gaps: 5.6.22.3
  TALPA landing model, 5.4.4 HGS/HUD, 5.2.20 and 15.2.6.x IPSB, 8.5.2.1 787 Europe D-180,
  22.2.1 Transition Areas, 23.18.1.13 LHR jumpseat, 23.19 Italy (new chapter).
- FOM_REBUILD.md chapter page ranges are still keyed to 124.2 pagination; re-derive from the new
  PDF bookmarks.
