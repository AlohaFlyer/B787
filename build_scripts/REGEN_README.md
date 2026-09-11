# Flight Deck Notes - regeneration toolchain

Saved 2026-06-17. Lets us cheaply regenerate episodes when manuals (FCOM/QRH/FOM/FCTM/MEL) revise.

## Files
- `parse_ep.py` - clean source script (.txt) -> `epN/manifest.json`. Applies the locked pronunciation map. `--diff` lists which segment indices changed vs the current manifest (so only those re-synth).
- `master_ep.sh <N> <out.mp3>` - masters `epN/seg*/tts_*.mp3` with the NEW music bumpers into a 96k mono mp3. VALIDATED 2026-06-17: reproduced live Ep23 exactly (347.533s, peak -1.7dB, mean within 0.3dB).

## Pipeline
1. Edit the source `.txt` (or for a one-word fix, edit `epN/manifest.json` directly).
2. Generate audio for changed segments ONLY, via the ElevenLabs MCP (generation needs the API key held by the MCP; it cannot run from a plain script):
   tool `mcp__ElevenLabs__text_to_speech`, model `eleven_v3`, voice_id per segment,
   settings stability 0.5 / similarity 0.75 / style 0.15-0.2, one paragraph per call,
   output into `epN/segNN/` (master picks newest `tts_*.mp3` via `ls -t`).
3. `bash build_scripts/master_ep.sh N /path/flight-deck-notes-epN.mp3`
4. Re-host the mp3 (Chrome upload to github.com/AlohaFlyer/B787/upload/main; MCP create_or_update_file cannot take multi-MB binaries) and bump portal version.

## Voices
Pualani = Jessica `cgSgspJ2msm6clMCkdW9` (Hawaiian Airlines logo woman; spell name poo-ah-LAH-nee in API text).
Chester = Brian `nPczCjzI2devNBz1zQrb` (Alaska Eskimo, Seattle, deep-warm).
Otto = John `jOEnNSVLOHUgmrNwfqQE` (say "Otto" - the old "AW-toh" spelling is retired).

## Music bumpers (NEW, locked 2026-06-17)
front: music_test/intro_v1.mp3 (12.04s); close: music_test/outro_v1_hook.mp3 (7.03s) + music_test/outro_v2_ending.mp3 (9.01s).
Mastering: per-seg mono/44100 + 0.2s pad -> concat -> atempo=1.2 -> dynaudnorm -> bookend -> loudnorm I=-16:TP=-1.5 -> 96k mono.

## Manual revisions this set was built against
FCOM R10 (Apr 1 2026), QRH R7 (Jan 19 2026), FCTM R9 (Apr 1 2026), FOM 125 (Jul 29 2026), MEL R5 (Apr 1 2026).
