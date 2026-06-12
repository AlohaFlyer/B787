# Manual Revision Process — B787 Study Portal

How Ryan and Claude handle a new manual revision (e.g., FCOM R11). Trigger phrase:
"<Manual> updated to <rev>" plus the new PDF in the project folder.

## Steps

1. **Intake.** New PDF goes in "AS - Boeing 787/". Claude confirms revision number and date from the title page and the List of Effective Pages / Revision Record.
2. **Diff.** Claude extracts the revision-highlights / change-record pages and the chapters listed for the affected pages in MANUAL_VERSIONS.md. Build a change list: section, old text, new text.
3. **Dependency sweep.** From MANUAL_VERSIONS.md, identify every dependent page. For each page, grep its citation markers (see Page version registry) and re-verify EVERY quotation, number, procedure step, and quiz question that cites the changed manual:
   - flows_quiz.html: re-extract NP.21, re-run flow-by-flow comparison (items, order, seats, checklist trigger points, d-field quotes, XREFS bodies).
   - limitations.html: re-verify all limits against FCOM L.10 (number + units + condition).
   - memory-items.html: QRH revisions require verbatim re-check of all starred-checklist memory items — zero paraphrase tolerance.
   - systems_quiz.html: re-verify the question source map refs touched by the change list.
4. **Update.** Apply corrections, bump each touched page Ver +0.1, update the index.html footer revtbl AND docs/MANUAL_VERSIONS.md (revision, date, last-vetted).
5. **Commit.** Files under 100KB via GitHub MCP push_files; flows_quiz.html and systems_quiz.html via Chrome upload to github.com/AlohaFlyer/B787 (file_upload tool on the repo's upload page).
6. **Verify live.** Fetch https://alohaflyer.github.io/B787/ pages after Pages rebuild (1-2 min); confirm version numbers and a spot-check of changed content.
7. **Report.** Write a dated audit report (md) to the project folder listing everything changed and everything verified-unchanged. Update Claude project memory.

## Working agreement

- FCOM/QRH always outrank handouts, Win's sheets, and prior portal content.
- Claude never invents manual content; anything unverifiable is flagged "verify in <source>".
- Sandbox pipeline: clone repo to /tmp, pdftotext in page-range chunks, edit programmatically, node --check all script blocks before commit.
