# Manual Version Manifest

Records which manual revision each portal page was last vetted against.
The authoritative per-section dependency map is AUTO-GENERATED in docs/CITATION_INDEX.md
(run `python3 build_scripts/citation_index.py`). Update this table + the index.html footer on every revision.

| Manual | Revision | Date | Last vetted | Pages depending on it |
|---|---|---|---|---|
| FCOM | R10 | 2026-04-01 | 2026-06-17 | flows_quiz (NP.21), limitations (L.10), systems_quiz, limit-or-bust (L.10), jeopardy, aircraft_setup (NP.21), podcast, index footer |
| QRH | R7 | 2026-01-19 | 2026-06-17 | memory-items, hot-seat, podcast, index footer |
| FCTM | R9 | 2026-04-01 | 2026-06-17 | systems_quiz, flows_quiz, podcast, index footer |
| FOM | 124.2 | 2026-06-18 | 2026-06-21 | weather, wx-alternate, systems_quiz, limit-or-bust, podcast, index footer (NOT footer-only - corrected 2026-06-17) |
| MEL | R5 | 2026-04-01 | 2026-06-17 | podcast, index footer |
| Systems training decks | Jun 2026 | 2026-06-12 | systems_quiz (1,540 Q from Systems_extract/*.md) |

## Coverage status (from citation_index.py, updated 2026-06-21)

TAGGED (auto-traceable via structured `ref:` / `[MANUAL ...]` markers):
flows_quiz, limitations, memory-items, systems_quiz, weather, wx-alternate, hot-seat, limit-or-bust, jeopardy, aircraft_setup, podcast.

aircraft_setup.html carries a machine-readable source declaration (ref:"FCOM NP.21") in its <head>: the setup flow is FCOM Normal Procedures NP.21 (Preflight/Setup) + the B787 Aircraft Setup handout. Per-step manual sections are not individually cited; FCOM NP.21 is the controlling source.

UNTAGGED (manual review required):
- **view.html** - PDF-viewer utility page, mentions QRH in passing, no study content. Low risk.

## Podcast
Regenerated via build_scripts/ (parse_ep.py + master_ep_fast.sh). Per-episode manual sources live in
the episode source .txt / manifests. See build_scripts/PODCAST_BUILD_TOOLCHAIN.md.

## Page version registry (bump +0.1 per edit)
index 2.12 | flows_quiz 9.1 | hot-seat 1.3 | jeopardy 1.0 | limit-or-bust 1.4 | limitations 2.4 | memory-items 1.6 | systems_quiz 2.6 | weather 1.5 | wx-alternate 1.1 | aircraft_setup 1.4 | podcast.html data-driven
