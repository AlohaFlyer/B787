#!/usr/bin/env python3
"""
parse_ep.py - build an ElevenLabs manifest from a clean source script.

Usage:
  python3 parse_ep.py <source.txt> <epN>            # write ../epN/manifest.json
  python3 parse_ep.py <source.txt> <epN> --diff     # compare to existing manifest, print changed seg indices

Source format: paragraphs separated by blank lines, each "Speaker: text".
Speakers: Pualani, Chester, Otto. Audio tags like [warm] are preserved.
Pronunciation is derived from flight-deck-notes.pls (the single source of truth),
applied to the hidden TTS text only; clean scripts/portal keep proper spelling.
Baking the .pls in here means any rebuild from clean source is auto-correct even
though the synth path (ElevenLabs MCP) cannot attach a pronunciation dictionary.
NOTE: Otto and Pualani are deliberately NOT substituted -> spoken plain (locked 2026-06-17).
"""
import sys, json, re, os, hashlib

SRC_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PLS_PATH = os.path.join(SRC_DIR, "flight-deck-notes.pls")
VOICE = {
    "Pualani": "cgSgspJ2msm6clMCkdW9",   # Jessica
    "Chester": "nPczCjzI2devNBz1zQrb",   # Brian (Seattle, deep-warm)
    "Otto":    "jOEnNSVLOHUgmrNwfqQE",   # John
}

# Locked spoken-forms NOT in the .pls, applied BEFORE the .pls subs (higher precedence).
# Case-sensitive so lowercase words (e.g. "at", "sea", "rat") are never touched.
# Pualani / Otto are deliberately absent -> they stay spelled plainly.
LOCKED = [
    (re.compile(r"\b787\b"), "seven-eight-seven"),
    (re.compile(r"\bFCOM\b"), "F-com"),      # locked 2026-06-20 (not in .pls)
    (re.compile(r"\bFCTM\b"), "F-C-T-M"),    # locked 2026-06-20 (not in .pls)
    (re.compile(r"\bautothrottle\b", re.I), "auto throttle"),
    (re.compile(r"\bA/T\b"), "auto throttle"),
    (re.compile(r"\bCANC/?RCL\b"), "cancel recall"),
    (re.compile(r"\bG/S\b"), "glideslope"),
    (re.compile(r"\bD-ATIS\b"), "ay-tiss"),
    (re.compile(r"\bEFIS\b"), "ee-fis"),         # locked 2026-06-22
    (re.compile(r"\bTO/GA\b"), "Toga"),          # locked 2026-06-22
    (re.compile(r"\bARINC\b"), "air-ink"),       # locked 2026-06-22
    (re.compile(r"\bISFD\b"), "I-S-F-D"),        # locked 2026-06-22 (say full name first in script)
    (re.compile(r"\bT-CAS\b"), "tee cass"),  # hyphen variant (.pls covers plain TCAS)
]

def load_pls(path):
    """Parse the .pls lexicon into (compiled \\bGRAPHEME\\b, alias) subs, longest grapheme first."""
    subs = []
    if os.path.exists(path):
        txt = open(path, encoding="utf-8").read()
        for g, a in re.findall(r"<grapheme>(.*?)</grapheme>\s*<alias>(.*?)</alias>", txt, re.S):
            g, a = g.strip(), a.strip()
            if g:
                subs.append((g, a))
    subs.sort(key=lambda ga: len(ga[0]), reverse=True)  # KIAS before IAS, etc.
    return [(re.compile(r"\b" + re.escape(g) + r"\b"), a) for g, a in subs]

PLS_SUBS = load_pls(PLS_PATH)

def apply_subs(t):
    for pat, rep in LOCKED:
        t = pat.sub(rep, t)
    for pat, rep in PLS_SUBS:
        t = pat.sub(rep, t)
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
