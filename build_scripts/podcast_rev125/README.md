# Podcast build artifacts, FOM Rev 125

Archived 2026-08-01. This folder exists so the **next** manual revision is an
incremental re-synth, not a full rebuild.

## What is here

`FOM_Podcast_*_v4_REV125.txt`
The clean source scripts that produced the current audio. Nine chapters:
Ch02 Operating-General, Ch05 Flight Operations, Ch06 ETOPS, Ch08 Dispatch,
Ch09 Weather, Ch11 Emergency/Abnormal, Ch15 Security/SSI, Ch16 NRFO,
Theaters 19-24.

`epNN.manifest.json`
The parsed segment list for each episode as it was actually synthesized:
segment index, speaker, ElevenLabs voice id, and the exact spoken text after
the locked pronunciation map in `parse_ep.py` was applied.

| manifest | episode | chapter | runtime |
|---|---|---|---|
| ep55 | 55 | Ch 6 ETOPS | 29:09 |
| ep58 | 58 | Ch 2 Operating-General | 25:42 |
| ep61 | 61 | Ch 5 Flight Operations | 27:21 |
| ep63 | 63 | Ch 8 Dispatch | 25:37 |
| ep64 | 64 | Ch 9 Weather | 24:12 |
| ep66 | 66 | Ch 11 Emergency/Abnormal | 26:22 |
| ep70 | 70 | Ch 15 Security/SSI | 25:05 |
| ep71 | 71 | Ch 16 NRFO | 22:57 |
| ep73 | 73 | Ch 19-24 Theaters | 26:51 |

## Why it is in git

When FOM Rev 125 landed, the manifests and segment audio for ep55 through ep74
no longer existed, so every affected episode had to be rebuilt from scratch:
802 segments re-synthesized across 16 parallel agents. The toolchain already
supports `parse_ep.py --diff`, which re-synthesizes only the segments whose text
changed, but that mode needs the prior manifest to compare against. Committing
the manifests here makes that guarantee survive any local cleanup.

## Next revision workflow

1. Edit the relevant `FOM_Podcast_*_v4_REV125.txt` into a `_v5_REV<n>.txt`.
2. Run `parse_ep.py` on the new script with `--diff` against the matching
   `epNN.manifest.json` in this folder.
3. Re-synthesize only the changed segments. Reuse the rest of the segment audio
   from the Drive working folder.
4. Master with `master_ep_fast.sh`, keeping the final mp3 under 10 MB so the
   GitHub web upload accepts it. `-b:a 44k` snaps to 40k; 48k is fine up to
   roughly 26 minutes.
5. Commit the new manifest and script alongside these, do not overwrite them.

## Known upload constraint

GitHub's web uploader rejects a commit carrying all eight episode mp3s at once
("the file is too large"). Commit the audio one file per commit. Each episode's
blob sha was verified against `git hash-object` on the local master after upload.

## Voices

Pualani = Jessica `cgSgspJ2msm6clMCkdW9`
Chester = Brian `nPczCjzI2devNBz1zQrb`
Otto = John `jOEnNSVLOHUgmrNwfqQE`
Model `eleven_v3`, stability 0.5, similarity_boost 0.75, style 0.18.
