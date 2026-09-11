# Quarterly Portal Update - Autonomous Process

Cadence: quarterly (or whenever a manual revises). You download manuals; I update + audit the whole portal.

## Your part (5 min)
1. Download the current manuals (FCOM, QRH, FCTM, FOM, MEL, plus any handouts/decks) as PDFs.
2. Drop them in `AS - Boeing 787/manuals_<YYYY-Qn>/` (e.g. manuals_2026-Q3/).
3. Tell me: **"run the quarterly portal update"**.

## My part (autonomous, then I report)
1. **Identify revisions.** Read each PDF's title page / List of Effective Pages / Revision Record; compare to docs/MANUAL_VERSIONS.md. List which manuals changed and to what revision.
2. **Refresh the citation index.** `citation_index.py` -> regenerates the page->section dependency map from the live pages.
3. **Diff each changed manual.** Extract its change-record/highlights -> changed-section list.
4. **Auto sweep.** `manual_diff.py <MANUAL> <sections>` -> exact list of every portal item (page, game, podcast) citing a changed section.
5. **Verify against the PDF, item by item.** For each flagged item I re-extract the cited section from the new PDF (pdftotext) and confirm the portal's number/units/condition/quote/procedure. Memory items checked verbatim, zero paraphrase. Mismatches corrected.
6. **Untagged pages.** Hand-check aircraft_setup.html (and view.html) every time, since the tool can't trace them.
7. **Podcast.** Any changed section feeding an episode -> edit source, re-synth only changed segments, re-master, re-host.
8. **Independent re-check.** A second pass (subagent) re-verifies the high-stakes pages (limitations, memory-items) against the PDF, independent of the first pass.
9. **Publish.** Bump page versions, update footer + manifest, commit + re-host (Chrome for index.html/large pages), confirm live.
10. **Report.** I send you a dated audit report: every item checked, what changed (old -> new with PDF citation), what was verified-unchanged, and anything I could NOT confirm (flagged, never guessed).

## Honest reliability statement
I will not claim "zero mistakes." What I guarantee: every tagged item is traced to its manual section and re-verified against the actual new PDF, high-stakes pages get an independent second pass, and anything unverifiable is flagged for your eyes rather than silently changed. The two untagged pages (aircraft_setup, view) always get manual review. Adding ref tags to those (one-time) would bring them under the same auto-trace guarantee.
