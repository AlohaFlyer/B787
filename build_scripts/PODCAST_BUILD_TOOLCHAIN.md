# Flight Deck Notes - Build Toolchain (archived 2026-06-17)

Canonical archive of the podcast regeneration scripts, embedded in markdown per project convention. Runnable copies live beside this file (parse_ep.py, master_ep.sh, master_ep_fast.sh). Validated 2026-06-17: master reproduces live Ep23 (347.533s) and Ep5 exactly.

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
FCOM R10 (Apr 1 2026), QRH R7 (Jan 19 2026), FCTM R9 (Apr 1 2026), FOM 123.1 (Apr 27 2026), MEL R5 (Apr 1 2026).

---
## parse_ep.py
```python
#!/usr/bin/env python3
"""
parse_ep.py - build an ElevenLabs manifest from a clean source script.

Usage:
  python3 parse_ep.py <source.txt> <epN>            # write ../epN/manifest.json
  python3 parse_ep.py <source.txt> <epN> --diff     # compare to existing manifest, print changed seg indices

Source format: paragraphs separated by blank lines, each "Speaker: text".
Speakers: Pualani, Chester, Otto. Audio tags like [warm] are preserved.
Applies the locked pronunciation map (hidden TTS spelling only; clean script keeps real words).
NOTE: the old Otto -> AW-toh substitution is REMOVED. Otto is spoken as "Otto".
"""
import sys, json, re, os, hashlib

SRC_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VOICE = {
    "Pualani": "cgSgspJ2msm6clMCkdW9",   # Jessica
    "Chester": "nPczCjzI2devNBz1zQrb",   # Brian (Seattle, deep-warm)
    "Otto":    "jOEnNSVLOHUgmrNwfqQE",   # John
}
# word-level subs (case-insensitive, whole word). Order matters: do multiword first.
SUBS = [
    (r"\bPualani\b", "poo-ah-LAH-nee"),
    (r"\b787\b", "seven-eight-seven"),
    (r"\bEICAS\b", "eye-cass"),
    (r"\bT-?CAS\b", "tee-cass"),
    (r"\bG-?P-?W-?S\b", "gee-pee-double-u-ess"),
    (r"\bLNAV\b", "el-nav"),
    (r"\bVNAV\b", "vee-nav"),
    (r"\bHUD\b", "hud"),
    (r"\bCANC/?RCL\b", "cancel recall"),
    (r"\bG/S\b", "glideslope"),
    (r"\bSATCOM\b", "sat-com"),
    (r"\bD-?ATIS\b", "D-ay-tiss"),
    # Otto is intentionally NOT substituted (new standard: say "Otto").
    # Letter-acronyms already hyphenated in source (P-F-D, A-G-L, I-L-S, F-M-C) are left as-is.
]
def apply_subs(t):
    for pat, rep in SUBS:
        t = re.sub(pat, rep, t)
    return t

def parse(path):
    raw = open(path, encoding="utf-8").read()
    paras = [p.strip() for p in re.split(r"\n\s*\n", raw) if p.strip()]
    segs = []
    for i, p in enumerate(paras, 1):
        m = re.match(r"^(Pualani|Chester|Otto)\s*:\s*(.*)$", p, re.S)
        if not m:
            continue
        spk, txt = m.group(1), apply_subs(m.group(2).strip())
        segs.append({"i": i, "speaker": spk, "voice_id": VOICE[spk], "text": txt})
    return segs

def seg_hash(s):
    return hashlib.sha1((s["speaker"] + "|" + s["text"]).encode("utf-8")).hexdigest()[:10]

if __name__ == "__main__":
    src, ep = sys.argv[1], sys.argv[2]
    diff = "--diff" in sys.argv
    new = parse(src)
    mpath = os.path.join(SRC_DIR, ep, "manifest.json")
    if diff and os.path.exists(mpath):
        old = json.load(open(mpath))
        oldmap = {o["i"]: seg_hash(o) for o in old}
        changed = [s["i"] for s in new if oldmap.get(s["i"]) != seg_hash(s)]
        print("changed segs:", changed)
    else:
        os.makedirs(os.path.join(SRC_DIR, ep), exist_ok=True)
        json.dump(new, open(mpath, "w"), indent=1, ensure_ascii=False)
        print(f"wrote {mpath}: {len(new)} segments")
```

## master_ep.sh (reference, sequential)
```bash
#!/bin/bash
# master_ep.sh <N> : master ep<N> with NEW music bumpers -> flight-deck-notes-ep<N>.mp3
# Recipe: per-seg mono/44100 + 0.2s pad, concat body, atempo=1.2, dynaudnorm,
# bookend intro_v1 + body + outro_v1_hook + outro_v2_ending, loudnorm I=-16:TP=-1.5, 96k mono.
set -e
SRC="/sessions/kind-inspiring-ritchie/mnt/AS - Boeing 787"
EP="$1"
INTRO="$SRC/music_test/intro_v1.mp3"
OUTRO1="$SRC/music_test/outro_v1_hook.mp3"
OUTRO2="$SRC/music_test/outro_v2_ending.mp3"
B="/tmp/m_$EP"; rm -rf "$B"; mkdir -p "$B"
list="$B/list.txt"; : > "$list"; i=0
while read -r d; do
  f=$(ls -t "$d"/tts_*.mp3 2>/dev/null | head -1); [ -z "$f" ] && continue
  i=$((i+1)); o=$(printf "%s/s%03d.wav" "$B" "$i")
  ffmpeg -nostdin -v error -y -i "$f" -af "aformat=sample_fmts=s16:sample_rates=44100:channel_layouts=mono,apad=pad_dur=0.2" "$o"
  echo "file '$o'" >> "$list"
done < <(ls -d "$SRC/ep$EP"/seg* | sort -V)
ffmpeg -nostdin -v error -y -f concat -safe 0 -i "$list" -af "atempo=1.2,dynaudnorm" "$B/body.wav"
for pair in "INTRO:$INTRO" "OUTRO1:$OUTRO1" "OUTRO2:$OUTRO2"; do
  nm=${pair%%:*}; src=${pair#*:}
  ffmpeg -nostdin -v error -y -i "$src" -af "aformat=sample_fmts=s16:sample_rates=44100:channel_layouts=mono" "$B/$nm.wav"
done
printf "file '%s'\n" "$B/INTRO.wav" "$B/body.wav" "$B/OUTRO1.wav" "$B/OUTRO2.wav" > "$B/final.txt"
ffmpeg -nostdin -v error -y -f concat -safe 0 -i "$B/final.txt" -af "loudnorm=I=-16:TP=-1.5:LRA=11" -ar 44100 -ac 1 -b:a 96k "$2"
```

## master_ep_fast.sh (parallel per-seg encode; used for batch re-master)
```bash
#!/bin/bash
# master_ep_fast.sh <N> <out.mp3> : same recipe as master_ep.sh, parallel per-seg encode (bg jobs).
set -e
SRC="/sessions/kind-inspiring-ritchie/mnt/AS - Boeing 787"
EP="$1"; OUT="$2"
INTRO="$SRC/music_test/intro_v1.mp3"; OUTRO1="$SRC/music_test/outro_v1_hook.mp3"; OUTRO2="$SRC/music_test/outro_v2_ending.mp3"
B="/tmp/m_$EP"; rm -rf "$B"; mkdir -p "$B"
mapfile -t dirs < <(ls -d "$SRC/ep$EP"/seg* | sort -V)
: > "$B/list.txt"; idx=0; n=0
for d in "${dirs[@]}"; do
  f=$(ls -t "$d"/tts_*.mp3 2>/dev/null | head -1); [ -z "$f" ] && continue
  idx=$((idx+1)); o=$(printf "%s/s%03d.wav" "$B" "$idx")
  echo "file '$o'" >> "$B/list.txt"
  ffmpeg -nostdin -v error -y -i "$f" -af "aformat=sample_fmts=s16:sample_rates=44100:channel_layouts=mono,apad=pad_dur=0.2" "$o" &
  n=$((n+1)); (( n % 4 == 0 )) && wait
done
wait
ffmpeg -nostdin -v error -y -f concat -safe 0 -i "$B/list.txt" -af "atempo=1.2,dynaudnorm" "$B/body.wav"
for pair in "INTRO:$INTRO" "OUTRO1:$OUTRO1" "OUTRO2:$OUTRO2"; do
  nm=${pair%%:*}; src=${pair#*:}
  ffmpeg -nostdin -v error -y -i "$src" -af "aformat=sample_fmts=s16:sample_rates=44100:channel_layouts=mono" "$B/$nm.wav"
done
printf "file '%s'\n" "$B/INTRO.wav" "$B/body.wav" "$B/OUTRO1.wav" "$B/OUTRO2.wav" > "$B/final.txt"
ffmpeg -nostdin -v error -y -f concat -safe 0 -i "$B/final.txt" -af "loudnorm=I=-16:TP=-1.5:LRA=11" -ar 44100 -ac 1 -b:a 96k "$OUT"
```
