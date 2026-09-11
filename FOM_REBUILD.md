# FOM Section - Rebuild Guide

How the FOM quizzer and FOM podcast series are built, and how to regenerate them
when a new FOM revision drops. A normal revision is a **data-only** refresh: no engine
code changes needed.

Current build: FOM Rev **125** (Jul 29, 2026). **19 units, 452 questions.**

Units in the quizzer/podcast: FOM chapters **1-16 and 18**, a combined **"19-24 Theaters"**
unit, and a synthesized **"IOE Prep"** unit. **Chapter 17 (Freighter Ops) is intentionally
excluded** - the 787 is a passenger jet, so freighter content does not apply. Chapters
25-26 (ARINC freqs, Acronyms) are excluded as pure reference.

**787-only rule:** all content is scrubbed of other fleets (A330 pax + A330F/freighter,
A321/321, 717, 737, Amazon). When the FOM lists a value per fleet, keep only the 787 value.
Re-apply this audit on every revision.

## Files

| File | Role | Update on revision? |
|------|------|---------------------|
| `fom_questions.json` | Manifest: lists the 19 per-chapter files + counts. Fetched first at runtime. | Yes - update counts / add-remove units |
| `fom_q/chNN.json` | One quiz file per chapter (ch01-16, ch18). Data. | Yes - regenerate changed chapters |
| `fom_q/ch19_24.json` | Combined Theaters unit (chs 19-24), incl. folded NAT HLA items. | Yes |
| `fom_q/ioe.json` | IOE Prep unit (IOE expectations, Captain-on-IOE, find-it-fast, high-yield facts). | As needed |
| `fom_quiz.html` | Quiz engine (no data inline). Chapter chips, reveal/grade, source panel, `?chapter=` deep-link, `localStorage` mastery, and a timed **Game mode** (`?game=1`, countdown, time-bonus scoring, streaks). | Rarely - feature changes only |
| `index.html` | Portal menu ("FOM Quizzer" card) + FOM rev in footer. | Bump rev only |
| Drive: `FOM Podcast Scripts v2` folder | 19 podcast scripts (787-only, check-airman scenarios, IOE focus). | Yes - regenerate changed chapters |
| `podcast.html` | Podcast index. FOM episodes get a `group:"FOM"` tab (added in the audio phase). | Audio phase |

## Data model - a `fom_q/chNN.json` item

Flat JSON array; one object per question:

```json
{
  "id": "fom06-010",
  "chapter": "6",
  "chapterName": "6 ETOPS",
  "q": "Question text",
  "a": "Answer text",
  "ref": "FOM 6.2.3",
  "src": { "ref": "FOM 6.2.3 - Title", "quote": "verbatim de-kerned FOM phrase", "note": "amplification" }
}
```

ID conventions inside a chapter file:
- `fomNN-###` - standard knowledge items.
- `fomNN-scNN` - **check-airman scenario** items (situational "what would you do").
- `fom06-eqNN` - the 25 **ETOPS Pop Quiz** items folded into Ch6.
- `ioe-###` - IOE Prep items (some cite the FOM, some are "find-it-fast" pointing at FOM/QRH/FCOM/MEL/Jeppesen/OpSpecs).

`chapterName` drives the filter chip label and the `?chapter=` deep-link (e.g.
`fom_quiz.html?chapter=6%20ETOPS`). Keep it "NN Name". `ref` is the **diff key**: on a new
revision, `manual_diff.py` shows which sections changed; only items whose `ref` sits in a
changed section need re-verification. `src.quote` must be a real substring of the FOM text.

## Chapter -> FOM page ranges (Rev 124.2 pagination, NOT re-derived for Rev 125 - see note)

Re-derive from the new PDF's bookmarks each revision (pagination shifts).

| Ch | Pages | Ch | Pages | Ch | Pages |
|----|-------|----|-------|----|-------|
| 1 | 108-115 | 7 | 379-413 | 13 | 668-674 |
| 2 | 116-184 | 8 | 414-559 | 14 | 675-700 |
| 3 | 185-197 | 9 | 560-598 | 15 | 701-751 |
| 4 | 198-222 | 10 | 599-607 | 16 | 752-767 |
| 5 | 223-348 | 11 | 608-641 | 18 | 782-792 |
| 6 | 349-378 | 12 | 642-667 | 19-24 | 793-853 |

(Ch17 Freighter pp 768-781 is excluded. Chs 25-26 excluded.)

## Rebuild loop (per changed chapter)

1. **Extract** the chapter's page range from the new `FOM.pdf` to text (pypdf; de-kern quotes).
2. **Diff** with `build_scripts/manual_diff.py` to see which sections changed; unchanged
   sections keep their items/script.
3. **Regenerate quiz items** for changed sections (schema above). 787-only. Keep the `-sc`
   scenario items and, for Ch6, the `-eq` ETOPS-quiz items. Every `a` traceable, every `ref`
   real, every `quote` a de-kerned substring. Never invent a number/section - `[UNVERIFIED]`
   beats a guess.
4. **Regenerate the podcast script** (3 hosts Pualani/Chester/Otto, ElevenLabs
   `Name: [tag] text`, section numbers spoken, >=2 memory aids, humor, and memorable
   check-airman line stories grounded in real Alaska/Hawaiian 787 operations). See
   `docs/PODCAST_REVIEW_SERIES_PLAN.md` for voice IDs + mastering recipe.
5. **Self-verify** every number/limit/cite against the chapter text; fix or drop mismatches.
6. **Merge**: rewrite the chapter's `fom_q/chNN.json`, update `fom_questions.json` counts,
   save the script to Drive.
7. **Re-verify citations** with `build_scripts/citation_index.py`.
8. **Re-host**: commit changed `fom_q/*.json` (+ manifest) to `main`; Vercel redeploys. Bump
   the FOM rev in `index.html`.

This is the loop the `b787-manual-revision` skill runs - prefer invoking that skill
("run the manual revision" / "FOM updated to X"): it recites intake, runs the citation +
diff sweep, re-verifies every dependent page/quiz/script against the new PDF, and re-hosts.

## Guardrails (do not relax)

- Data-only rebuild: touch `fom_q/*.json` + manifest + Drive scripts, not `fom_quiz.html`,
  unless changing the engine on purpose.
- 100% FOM-compliant, 787-only. No invented numbers/sections. No other-fleet content.
- Keep `chapterName` as "NN Name" so chips and deep-links keep working.
- Keep the scenario (`-sc`) and ETOPS (`-eq`) items across revisions.

## Still to build (as of this revision)

- **Podcast audio**: 19 scripts written (Drive `FOM Podcast Scripts v2`); ElevenLabs audio
  not yet generated and `podcast.html` FOM tab not yet wired.
