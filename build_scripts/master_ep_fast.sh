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
