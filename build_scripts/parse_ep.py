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
