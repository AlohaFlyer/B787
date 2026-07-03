# Flight Deck Notes - Review Series (Ep33-43) Build Ledger

Created 2026-06-23. Autonomous build of 11 deep, manual-cited review episodes requested by Ryan.
Built one-per-run by the scheduled task **b787-podcast-review-series**. This file is the queue +
state. Each run: pick the first episode with status `queued`, build it end to end, set `done`.

**SERIES COMPLETE 2026-07-03.** All 11 episodes (33-43) are live on podcast.html. Eps 35-43 were
built by browser sessions (not this scheduler); the 2026-07-03 scheduled run verified every mp3
exists in the repo at sane size, spot-checked ep35 format (13:09, 96k mono, 44100 Hz), and synced
this ledger. No further scheduled builds needed; the task can be disabled.

## Hard rules (carry into every episode)
- Verbatim-accurate to the manuals. Cite FCOM/FCTM/PRC/QRH section numbers in the dialogue. Never invent numbers or steps. If a value cannot be confirmed in a manual, say "verify in <source>" rather than guess.
- Voices: Pualani = `cgSgspJ2msm6clMCkdW9` (Jessica), Chester = `nPczCjzI2devNBz1zQrb` (Brian, Seattle), Otto = `jOEnNSVLOHUgmrNwfqQE` (John, say "Otto"). Pualani spelled poo-ah-LAH-nee in TTS text.
- Format: clean .txt, paragraphs separated by blank lines, "Speaker: [tag] text". Thorough = ~25-40 segments / ~10-14 min.
- Manuals this set is built against: FCOM R10 (Apr 1 2026), QRH R7 (Jan 19 2026), FCTM R9 (Apr 1 2026), FOM 124.2 (Jun 18 2026), MEL R5. Full FCOM text extract: run `pdftotext -layout "B787 Flight Crew Operating Manual (FCOM).pdf"` then grep. PRC = "PRC_787 (4).pdf". QRH/FCTM PDFs in the Drive folder.

## Pipeline (per episode, all tools available in a scheduled run)
1. Research the topic in the manuals (grep the FCOM text extract; pdftotext the PRC/QRH/FCTM sections as needed). Confirm every number.
2. Write `B787_Podcast_Ep<N>_<Topic>_ElevenLabs.txt` (clean script).
3. `python3 build_scripts/parse_ep.py <script.txt> ep<N>` -> ep<N>/manifest.json (needs flight-deck-notes.pls in the project root for pronunciations). Patch AR -> A-R and GNSS -> G-N-S-S after, which the .pls misses.
4. For each manifest segment: `mcp__ElevenLabs__text_to_speech` model `eleven_v3`, voice_id per segment, stability 0.5 / similarity_boost 0.75 / style 0.18, output_directory the Drive ep<N>/seg<NN>/ (master picks newest tts_*.mp3; the MCP names files tts_<word>_<ts>.mp3, which matches). TTS MUST go through the ElevenLabs MCP (API key lives there; cannot run from a plain script). Make the seg dirs first.
5. Master: copy master_ep_fast.sh, set its `SRC=` to the CURRENT session Drive mount, then `bash master_ep_fast.sh <N> "<mount>/flight-deck-notes-ep<N>.mp3"`. Music bumpers: music_test/. Recipe: per-seg mono/44100 +0.2s pad -> concat -> atempo=1.2 -> dynaudnorm -> bookend -> loudnorm I=-16:TP=-1.5 -> 96k mono. Verify duration with ffprobe. GOTCHA: master_ep_fast.sh hardcodes build dir `/tmp/m_$EP`; if a stale dir owned by a prior session uid lingers, the `rm -rf` fails and the encode mixes stale wavs (short/garbled output). Point `B=` at a fresh unique dir per run and re-verify duration.
6. Upload the mp3 to github.com/AlohaFlyer/B787/upload/main via Chrome (binary; MCP can't take multi-MB). Submit the commit form via javascript_tool (querySelector submit button .click()) - the pixel/ref click is flaky. The Chrome file_upload tool takes the Drive desktop path and works under its 10 MB cap.
7. Update podcast.html EPISODES array (schema {n,group,title,topic,len,audio,quiz}; group "Review"; len from ffprobe). Upload alongside the mp3 in the same Chrome commit (avoids needing the file content as an MCP arg).
8. Set this episode `done` in the ledger; commit the ledger + script (bash cp the .txt into the Drive mount).
9. Self-debug: if master errors (missing seg, path), fix and rerun. Check mcp__ElevenLabs__check_subscription first; Pro ~607k char/mo, ~345k remaining as of 2026-06-23.

## Queue (ep numbers continue the catalogue; portal currently 44 eps)
| Ep | Topic | Primary sources | Status |
|----|-------|-----------------|--------|
| 33 | RNAV RNP AR approaches: criteria, CDU setup, bug/brief, go-around | FCOM SP.4.10-4.12; PRC AR | DONE 2026-06-23 (9:27) |
| 34 | Rejected takeoffs (RTO): decision, high/low speed, callouts, actions | FCTM Ch3; FCOM NP.21.33-34 | DONE 2026-06-24 (13:29) |
| 35 | V1 cut / engine failure on takeoff; V2 handling | FCTM Ch3; FCOM NP/PI; QRH | DONE (browser session; 13:09; mp3 9,473,403 B verified 2026-07-03) |
| 36 | Captain authority and responsibilities (PIC) | FOM (authority/PIC); FAR | DONE (browser session; 13:41; mp3 9,852,387 B verified 2026-07-03) |
| 37 | Go-around / missed approach procedures | FCOM NP.21.51; FCTM Ch5 | DONE (browser session; 13:40; mp3 9,838,595 B verified 2026-07-03) |
| 38 | ILS and IAN approach procedures | FCOM NP.21.42-50, .45 | DONE (browser session; 13:31; mp3 9,735,463 B verified 2026-07-03) |
| 39 | PM duties + callouts, approach to shutdown | FCOM NP.21; FCTM; PRC | DONE (browser session; 13:40; mp3 9,839,535 B verified 2026-07-03) |
| 40 | Holding + alternate missed-approach hold setup | FCOM/PRC holding; CDU HOLD | DONE (browser session; 11:19; mp3 8,147,114 B verified 2026-07-03) |
| 41 | Enroute diversions + CDU setup, best practices | FCOM; FOM divert; QRH | DONE (browser session; 12:58; mp3 9,333,909 B verified 2026-07-03) |
| 42 | EICAS messages: resolve, divert-or-continue captain process | QRH; FCOM; ECL | DONE (browser session; 13:20; mp3 9,600,358 B verified 2026-07-03) |
| 43 | Fuel jettison + overweight landing, captain considerations | FCOM 12.20 / SP; QRH | DONE (browser session; 11:31; mp3 8,303,849 B verified 2026-07-03) |

## Done log
- 2026-06-23: Ep33 RNAV RNP AR shipped. flight-deck-notes-ep33.mp3 (9:27, 96k mono, 25 segments), live on podcast.html Review group. Built in-session (not via scheduler). Next queued: Ep34 RTO.
- 2026-06-24: Scheduler run b787-podcast-review-series regenerated and committed the Ep33 audio (re-synthesized 25 segments via ElevenLabs eleven_v3, mastered to 9:27 / 96k mono). Uploaded flight-deck-notes-ep33.mp3 (6,799,823 bytes) to repo, verified via API at commit 2d4f26d. podcast.html Ep33 entry and ledger status were already staged/done from 06-23; left as-is. Next queued: Ep34 RTO.
- 2026-06-24: Ep34 Rejected Takeoff shipped. flight-deck-notes-ep34.mp3 (13:29, 96k mono, 36 segments), committed at 9,706,624 bytes (verified via API, commit 4d40c50). Sources confirmed against FCTM Ch3 (RTO Decision/Maneuver/Go-Stop, 3.24-3.27), QRH MAN.1.1-1.2 (reject criteria below/above 80 kt, the maneuver + callouts, captain considerations, evacuation), FCOM 14.20.4 (RTO autobrake: arms on ground, max braking if GS >85 kt & both levers idle; does not operate at/below 85 kt). Drafted 40 segments, then trimmed 4 redundant reinforcement segments to 36 to land 13:29 / 9.7 MB under the 10 MB Chrome file_upload cap. podcast.html EPISODES updated (Review group, quiz=memory-items.html) and committed via MCP (commit 3036e34). Script .txt cp'd into Drive folder. Next queued: Ep35 V1 cut / engine failure on takeoff.
- 2026-07-03: Scheduled run found Ep35-43 already live. podcast.html EPISODES lists all of 35-43 in the Review group; every flight-deck-notes-ep<N>.mp3 (N=35..43) verified present in the repo via the GitHub contents API at sizes 8.1-9.9 MB; ep35 spot-checked by download + ffprobe (789.4 s = 13:09, 96k, mono, 44100 Hz). These were built by browser sessions per B787_Shared_Context.md ("Eps 33-43 were added by browser sessions"; portal now 44 eps incl. Ep44 Triggers). No audio was built or committed this run (hard rule: do not rebuild existing episodes). Ledger statuses synced to DONE. Review series complete.
