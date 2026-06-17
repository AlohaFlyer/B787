# Manual Revision Process - B787 Study Portal

How to fold a new manual revision (e.g., FOM 123.2) into the WHOLE portal reliably.
Trigger: "<Manual> updated to <rev>" + the new PDF in "AS - Boeing 787/".

## Steps
1. **Intake.** New PDF in the project folder. Confirm revision + date from the title page / Revision Record.
2. **Refresh the index.** `python3 build_scripts/citation_index.py` (regenerates docs/CITATION_INDEX.md + citation_index.json from the live pages, so the dependency map is never stale).
3. **Diff.** Extract the manual's change-record pages -> list the changed sections.
4. **Auto dependency sweep.** `python3 build_scripts/manual_diff.py <MANUAL> <changed sections...>`
   -> prints the exact re-verify checklist (every page + item citing those sections). Example:
   `python3 build_scripts/manual_diff.py FOM 5.4 8.2.5 9.2.1`
5. **Re-verify each listed item** against the new manual (number + units + condition; memory items verbatim, zero paraphrase).
6. **Untagged pages.** Always hand-check aircraft_setup.html (and view.html) - the tool cannot trace them until they carry ref tags.
7. **Podcast.** If a changed section feeds an episode, edit the episode source/manifest, re-synth only changed segments via ElevenLabs MCP, re-master with build_scripts/master_ep_fast.sh, re-host. See PODCAST_BUILD_TOOLCHAIN.md.
8. **Games.** hot-seat (QRH) and limit-or-bust (FCOM L.10) are tagged and appear in the sweep. jeopardy is FCOM-tagged. Re-verify their flagged items too.
9. **Update.** Apply fixes, bump each touched page Ver +0.1, update index.html footer + docs/MANUAL_VERSIONS.md (rev/date/last-vetted), re-run citation_index.py.
10. **Commit + verify live + audit report.** Small text via push_files; large pages (flows_quiz, systems_quiz) + index.html (base64 logos) via Chrome upload. Confirm live versions, spot-check changed content, write a dated audit md, update project memory.

## Working agreement
- FCOM/QRH outrank handouts and prior content. Never invent manual content; flag unverifiable as "verify in <source>".
- index.html must be re-hosted via Chrome upload (byte-exact) - its base64 logos corrupt if committed inline.
