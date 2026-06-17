#!/usr/bin/env python3
"""manual_diff.py <MANUAL> <changed-section> [<changed-section> ...]
Given changed manual sections, list every portal item to re-verify.
Matches by section prefix, so 'FOM 5.4' catches 5.4.1, 5.4.2, etc.
Run citation_index.py first to refresh citation_index.json.

Example: python3 manual_diff.py FOM 5.4 8.2.5 9.2.1
"""
import json, sys, os
here=os.path.dirname(os.path.abspath(__file__))
idx=json.load(open(os.path.join(here,"citation_index.json")))["index"]
if len(sys.argv)<3:
    print(__doc__); sys.exit(1)
man=sys.argv[1].upper(); changed=sys.argv[2:]
secs=idx.get(man,{})
hit=False
print(f"# Re-verify checklist: {man} sections {changed}\n")
for sec in sorted(secs):
    if any(sec==c or sec.startswith(c.rstrip('.')+'.') or sec==c for c in changed) or any(sec.startswith(c) for c in changed):
        for pg,n in sorted(secs[sec].items()):
            print(f"[ ] {man} {sec:12} -> {pg} ({n} item{'s' if n>1 else ''})")
            hit=True
if not hit:
    print("No tagged items cite those sections. (Check untagged pages manually: aircraft_setup, view.)")
