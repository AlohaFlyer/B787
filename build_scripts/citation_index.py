#!/usr/bin/env python3
"""Scan portal HTML pages, extract every manual citation, emit an index.
Robust source-of-truth: run this against the repo to regenerate the dependency map
so it never goes stale. Patterns captured:
  ref:"<MANUAL> <section>"     (systems_quiz, weather, wx-alternate, hot-seat, limit-or-bust)
  [<MANUAL> <section> ...]     (flows_quiz d-field quotes)
  bare <MANUAL> <section>      (prose fallback, e.g. FCOM L.10.2)
"""
import re, json, sys, glob, os
MANUALS = ["FCOM","QRH","FCTM","FOM","MEL"]
PAGES = ["index","flows_quiz","limitations","memory-items","systems_quiz","podcast",
         "aircraft_setup","weather","wx-alternate","jeopardy","hot-seat","limit-or-bust","triggers","view"]
# a section token like L.10.2, NP.21.3, 5.4.2, 7.1, 123.621
SECT = r"[A-Z]{0,3}\.?\d+(?:\.\d+)*(?:\.\d+)*"
pat_quoted = re.compile(r'ref:"\s*([^"]+?)\s*"')
pat_bracket = re.compile(r'\[(FCOM|QRH|FCTM|FOM|MEL)\s+([^\]:]+)')
pat_bare = re.compile(r'\b(FCOM|QRH|FCTM|FOM|MEL)\s+(' + SECT + r')')

def manual_of(s):
    for m in MANUALS:
        if s.upper().startswith(m): return m
    return None

index = {}  # (manual) -> {section -> {page -> count}}
untagged = {}
for p in PAGES:
    f = f"{p}.html"
    if not os.path.exists(f): continue
    txt = open(f, encoding="utf-8", errors="ignore").read()
    hits = 0
    # quoted ref:"..."
    for m in pat_quoted.findall(txt):
        man = manual_of(m)
        if not man:
            continue
        # split things like "FOM 5.4.1 / 5.4.4" into sections
        body = m[len(man):].strip()
        for sec in re.split(r'[\/,]| and ', body):
            sec = re.match(r"([A-Z]{0,3}\.?[0-9]+(?:\.[0-9]+)*)", sec.strip()); sec = sec.group(1) if sec else ""
            if not sec: continue
            index.setdefault(man,{}).setdefault(sec,{}).setdefault(p,0)
            index[man][sec][p]+=1; hits+=1
    # bracket [FCOM NP.21..]
    for man,body in pat_bracket.findall(txt):
        sec = body.strip().split()[0].rstrip(':')
        index.setdefault(man,{}).setdefault(sec,{}).setdefault(p,0)
        index[man][sec][p]+=1; hits+=1
    # bare prose refs (only count if not already heavy quoted page)
    if hits==0:
        for man,sec in pat_bare.findall(txt):
            index.setdefault(man,{}).setdefault(sec,{}).setdefault(p,0)
            index[man][sec][p]+=1; hits+=1
    if hits==0:
        # page mentions a manual in prose but has no parseable section refs
        present=[m for m in MANUALS if re.search(r'\b'+m+r'\b',txt,re.I)]
        untagged[p]=present

# page -> manuals summary
page_manuals={}
for man,secs in index.items():
    for sec,pages in secs.items():
        for pg in pages:
            page_manuals.setdefault(pg,{}).setdefault(man,0)
            page_manuals[pg][man]+=pages[pg]

json.dump({"index":index,"page_manuals":page_manuals,"untagged":untagged},
          open("citation_index.json","w"), indent=1)
print("=== PAGE -> MANUALS (tagged citation counts) ===")
for pg in PAGES:
    if pg in page_manuals:
        print(f"  {pg:16} " + ", ".join(f"{m}:{c}" for m,c in sorted(page_manuals[pg].items())))
print("\n=== UNTAGGED (manual mentioned in prose, no parseable section refs) ===")
for pg,ms in untagged.items(): print(f"  {pg:16} mentions {ms} but NO structured refs")
print("\n=== FOM section coverage (your live concern) ===")
for sec,pages in sorted(index.get("FOM",{}).items()):
    print(f"  FOM {sec:14} -> " + ", ".join(f"{pg}({c})" for pg,c in pages.items()))
