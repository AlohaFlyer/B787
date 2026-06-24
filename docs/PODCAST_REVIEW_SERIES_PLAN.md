# Flight Deck Notes - Review Series (Ep33-43) Build Ledger

Created 2026-06-23. Autonomous build of 11 deep, manual-cited review episodes requested by Ryan.
Built one-per-run by the scheduled task **b787-podcast-review-series**. This file is the queue +
state. Each run: pick the first episode with status `queued`, build it end to end, set `done`.

## Hard rules (carry into every episode)
- Verbatim-accurate to the manuals. Cite FCOM/FCTM/PRC/QRH section numbers in the dialogue. Never invent numbers or steps. If a value cannot be confirmed in a manual, say "verify in <source>" rather than guess.
- Voices: Pualani = `cgSgspJ2msm6clMCkdW9` (Jessica), Chester = `nPczCjzI2devNBz1zQrb` (Brian, Seattle), Otto = `jOEnNSVLOHUgmrNwfqQE` (John, say "Otto"). Pualani spelled poo-ah-LAH-nee in TTS text.
- Format: clean .txt, paragraphs separated by blank lines, "Speaker: [tag] text". Thorough = ~25-40 segments / ~10-14 min.
- Manuals this set is built against: FCOM R10 (Apr 1 2026), QRH R7 (Jan 19 2026), FCTM R9 (Apr 1 2026), FOM 124.2 (Jun 18 2026), MEL R5. Full FCOM text extract: run `pdftotext -layout "B787 Flight Crew Operating Manual (FCOM).pdf"` then grep. PRC = "PRC_787 (4).pdf". QRH/FCTM PDFs in the Drive folder.

## Pipeline (per episode, all tools available in a scheduled run)
1. Research the topic in the manuals (grep the FCOM text extract; pdftotext the PRC/QRH/FCTM sections as needed). Confirm every number.
2. Write `B787_Podcast_Ep<N>_<Topic>_ElevenLabs.txt` (clean script).
3. `python3 build_scripts/parse_ep.py <script.txt> ep<N>` -> ep<N>/manifest.json (run from a local clone/copy of build_scripts; or replicate its trivial JSON build).
4. For each manifest segment: `mcp__ElevenLabs__text_to_speech` model `eleven_v3`, voice_id per segment, stability 0.5 / similarity_boost 0.75 / style 0.18, output into `ep<N>/seg<NN>/` (master picks newest tts_*.mp3). TTS MUST go through the ElevenLabs MCP (API key lives there; cannot run from a plain script).
5. Master: `bash build_scripts/master_ep_fast.sh <N> <out>/flight-deck-notes-ep<N>.mp3`. IMPORTANT: master_ep_fast.sh has a hardcoded `SRC=` path from an old session. Before running, set SRC to the CURRENT session Drive mount (the `AS - Boeing 787` path under /sessions/<this-session>/mnt/). Music bumpers: music_test/intro_v1.mp3 + outro_v1_hook.mp3 + outro_v2_ending.mp3. Recipe: per-seg mono/44100 +0.2s pad -> concat -> atempo=1.2 -> dynaudnorm -> bookend -> loudnorm I=-16:TP=-1.5 -> 96k mono.
6. Upload the mp3 to github.com/AlohaFlyer/B787/upload/main via Chrome (binary; MCP can't take multi-MB). Submit the commit form via javascript_tool (querySelector submit .click()) - the pixel/ref click is flaky.
7. Update podcast.html: add an entry to the EPISODES array (data-driven; edit, don't rebuild). Group "Review". Confirm length from the mastered mp3.
8. Set this episode `done` in the ledger; commit the ledger + script.
9. Self-debug: if master errors (missing seg, path), fix and rerun. If TTS quota hit, stop and report (Pro tier ~607k char/mo).

## Queue (ep numbers continue the catalogue; portal currently 32 eps)
| Ep | Topic | Primary sources | Status |
|----|-------|-----------------|--------|
| 33 | RNAV RNP AR approaches: criteria, CDU setup, bug/brief, go-around | FCOM SP.4.10-4.12; PRC AR | script-done, audio-queued |
| 34 | Rejected takeoffs (RTO): decision, high/low speed, callouts, actions | FCTM Ch3; FCOM NP.21.33-34 | queued |
| 35 | V1 cut / engine failure on takeoff; V2 handling | FCTM Ch3; FCOM NP/PI; QRH | queued |
| 36 | Captain authority and responsibilities (PIC) | FOM (authority/PIC); FAR | queued |
| 37 | Go-around / missed approach procedures | FCOM NP.21.51; FCTM Ch5 | queued |
| 38 | ILS and IAN approach procedures | FCOM NP.21.42-50, .45 | queued |
| 39 | PM duties + callouts, approach to shutdown | FCOM NP.21; FCTM; PRC | queued |
| 40 | Holding + alternate missed-approach hold setup | FCOM/PRC holding; CDU HOLD | queued |
| 41 | Enroute diversions + CDU setup, best practices | FCOM; FOM divert; QRH | queued |
| 42 | EICAS messages: resolve, divert-or-continue captain process | QRH; FCOM; ECL | queued |
| 43 | Fuel jettison + overweight landing, captain considerations | FCOM 12.20 / SP; QRH | queued |

## Done log
- (none yet; ep33 script staged at B787_Podcast_Ep33_RNP_AR_ElevenLabs.txt, audio pending first run)
