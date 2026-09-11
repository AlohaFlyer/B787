#!/usr/bin/env python3
"""Add clickable index links to the portal PDFs, using coordinates from pdf_links.json.

Run it beside the PDFs you downloaded from as787pilot.app:
    python3 add_pdf_links.py
It rewrites each PDF in place with link annotations added. Needs pikepdf.
"""
import json, os, sys

try:
    import pikepdf
except ImportError:
    sys.exit("pikepdf is missing. Run: python3 -m pip install --user pikepdf")

data = json.load(open("pdf_links.json"))["links"]
for name, rows in data.items():
    if not os.path.exists(name):
        print("skip (not here):", name)
        continue
    pdf = pikepdf.open(name, allow_overwriting_input=True)
    by_page = {}
    for r in rows:
        by_page.setdefault(r[0], []).append(r)
    added = 0
    for pageno, items in by_page.items():
        if pageno < 1 or pageno > len(pdf.pages):
            continue
        page = pdf.pages[pageno - 1]
        annots = []
        for r in items:
            d = r[5]
            if d < 1 or d > len(pdf.pages):
                continue
            target = pdf.pages[d - 1]
            annots.append(pdf.make_indirect(pikepdf.Dictionary(
                Type=pikepdf.Name.Annot, Subtype=pikepdf.Name.Link,
                Rect=r[1:5], Border=[0, 0, 0],
                A=pikepdf.Dictionary(
                    S=pikepdf.Name.GoTo,
                    D=pikepdf.Array([target.obj, pikepdf.Name.XYZ, None, None, None])))))
        if not annots:
            continue
        existing = page.get("/Annots")
        page.Annots = pikepdf.Array(list(existing) + annots) if existing else pikepdf.Array(annots)
        added += len(annots)
    pdf.save(name)
    print("%-34s %3d links added" % (name, added))
print("Done. Upload the rewritten PDFs.")
