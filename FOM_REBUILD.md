# FOM Section - Rebuild Guide

How the FOM quizzer and FOM podcast series are built, and how to regenerate them
when a new FOM revision drops. Designed so a revision is a **data-only** refresh:
no engine code changes needed for normal updates.

Current build: FOM Rev **124.2** (Jun 18, 2026). 18 chapters live in the quizzer,
330 questions. Chapters 19-24 (Theaters) and 25-26 (ARINC freqs, Acronyms) are not
in the quizzer bank.

## Files

| File | Role | Update on revision? |
|------|------|---------------------|
| `fom_questions.json` | The entire quiz bank (data). Read at runtime by the quizzer via `fetch`. | Yes - regenerate changed chapters |
| `fom_quiz.html` | Quiz engine only (no data inline). Chapter filter chips, reveal/grade, source panel, `?chapter=` deep-link, `localStorage` mastery. | Rarely - only for feature changes |
| `index.html` | Portal menu. Carries the "FOM Quizzer" card + FOM rev in the footer table. | Bump rev date/number only |
| Drive: `FOM_Podcast_ChNN_*_script.txt` | One podcast script per chapter (data). | Yes - regenerate changed chapters |
| `podcast.html` | Podcast index. FOM episodes get a `group:"FOM"` tab (added in the audio phase). | Add/adjust FOM episode rows |

## Data model - `fom_questions.json`

Flat JSON array. One object per question:

```json
{
  "id": "fom06-010",
  "chapter": "6",
  "chapterName": "6 ETOPS",
  "q": "Question text",
  "a": "Answer text",
  "ref": "FOM 6.2.3",
  "src": {
    "ref": "FOM 6.2.3 - Table 6.2.3(1): ETOPS Area of Operations",
    "quote": "verbatim phrase from the FOM (de-kerned)",
    "note": "1-2 sentence plain-English amplification"
  }
}
```

- `id` = `fom<NN>-<seq>` (zero-padded chapter). Stable across revisions where possible.
- `chapterName` drives the filter chip label AND the `?chapter=` deep-link
  (e.g. `fom_quiz.html?chapter=6%20ETOPS`). Keep it "NN Name" so the section is self-describing.
- `ref` = the FOM section the answer comes from. This is the **diff key**: on a new
  revision, `manual_diff.py` tells you which sections changed; only questions whose
  `ref` sits in a changed section need re-verification.
- `src.quote` MUST be a real substring of the FOM section text (kerning spaces removed).

## Chapter -> FOM page ranges (Rev 124.2, 893-pp PDF)

Used by the extractor. Re-derive from the new PDF's bookmarks each revision, since
pagination shifts.

| Ch | Name | Pages | Ch | Name | Pages |
|----|------|-------|----|------|-------|
| 1 | Preface | 108-115 | 10 | CRM | 599-607 |
| 2 | Operating-General | 116-184 | 11 | Emergency/Abnormal | 608-641 |
| 3 | Training & Currency | 185-197 | 12 | Fueling & Maintenance | 642-667 |
| 4 | Crew Administration | 198-222 | 13 | Passenger Relations | 668-674 |
| 5 | Flight Operations | 223-348 | 14 | HAZMAT | 675-700 |
| 6 | ETOPS | 349-378 | 15 | Security (SSI) | 701-751 |
| 7 | Comms & Reports | 379-413 | 16 | NRFO | 752-767 |
| 8 | Dispatch | 414-559 | 17 | Freighter Ops | 768-781 |
| 9 | Weather | 560-598 | 18 | Areas of Operation | 782-792 |

Theaters 19-24 = pp 793-853 (not currently in the bank).

## Rebuild loop (per changed chapter)

1. **Extract**: pull the chapter's page range from the new `FOM.pdf` to plain text
   (pypdf `extract_text`). The text has kerning artifacts (stray spaces inside words);
   de-kern when quoting.
2. **Diff**: run `build_scripts/manual_diff.py` old vs new to see which sections in the
   chapter actually changed. Unchanged sections keep their existing questions/scripts.
3. **Regenerate quiz items** for changed sections: 12-22 objects, schema above. Every
   `a` traceable to the text; every `ref` a real section number; every `quote` a real
   de-kerned substring. Never invent a number or a section - mark `[UNVERIFIED]` and skip.
4. **Regenerate the podcast script** for the chapter (3 hosts - Pualani/Chester/Otto -
   ElevenLabs `Name: [tag] text` format, section numbers spoken aloud, >=2 memory aids,
   Top Gun + Airplane! flavor). See `docs/PODCAST_REVIEW_SERIES_PLAN.md` for voice IDs
   and the mastering recipe.
5. **Self-verify**: reopen the chapter text; confirm every number, limit, and citation in
   both outputs. Fix or drop mismatches.
6. **Merge** the chapter's questions back into `fom_questions.json` (preserve unchanged
   chapters). Save the script to Drive.
7. **Re-verify citations**: `build_scripts/citation_index.py` to refresh `docs/CITATION_INDEX.md`.
8. **Re-host**: commit `fom_questions.json` (+ any changed scripts) to `main`; Vercel redeploys.
   Bump the FOM rev in `index.html` footer.

This is the exact loop the `b787-manual-revision` skill runs. Prefer invoking that skill
("run the manual revision" / "FOM updated to X") - it recites intake, runs the citation +
diff sweep, re-verifies every dependent page/quiz/flashcard/podcast item against the new
PDF, and re-hosts.

## Guardrails (do not relax)

- Data-only rebuild: touch `fom_questions.json` and the Drive scripts, not `fom_quiz.html`,
  unless you are changing the engine on purpose.
- 100% FOM-compliant. No invented numbers, limits, or section refs. `[UNVERIFIED]` beats a guess.
- Every question keeps its `ref` so future diffs are cheap.
- `chapterName` stays "NN Name" so chips and deep-links keep working.
