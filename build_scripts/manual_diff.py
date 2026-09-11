#!/usr/bin/env python3
"""manual_diff.py <MANUAL> <changed-section> [<changed-section> ...]
Given changed manual sections, list every portal item to re-verify.
Matches section containment in BOTH directions: a changed 'FOM 5.4' catches a page
citing 5.4.1, AND a changed 'FOM 5.6.6.3' catches a page citing the broader 5.6.6.
Run citation_index.py first to refresh citation_index.json.

Example: python3 manual_diff.py FOM 5.4 8.2.5 9.2.1
"""
import json, sys, os
here=os.path.dirname(os.path.abspath(__file__))
# citation_index.py writes to the repo root; accept either location.
_cands=[os.path.join(here,"citation_index.json"),
        os.path.join(here,os.pardir,"citation_index.json"),
        "citation_index.json"]
_p=next((c for c in _cands if os.path.exists(c)), None)
if not _p:
    sys.exit("citation_index.json not found. Run: python3 build_scripts/citation_index.py")
idx=json.load(open(_p))["index"]
if len(sys.argv)<3:
    print(__doc__); sys.exit(1)
man=sys.argv[1].upper(); changed=sys.argv[2:]
secs=idx.get(man,{})
hit=False
print(f"# Re-verify checklist: {man} sections {changed}\n")
def related(sec, c):
    """True if sec and c are the same section or one contains the other."""
    sec=sec.strip('.'); c=c.strip('.')
    return sec==c or sec.startswith(c+'.') or c.startswith(sec+'.')

for sec in sorted(secs):
    if any(related(sec,c) for c in changed):
        for pg,n in sorted(secs[sec].items()):
            print(f"[ ] {man} {sec:12} -> {pg} ({n} item{'s' if n>1 else ''})")
            hit=True
if not hit:
    print("No tagged items cite those sections. (Check untagged pages manually: aircraft_setup, view.)")
