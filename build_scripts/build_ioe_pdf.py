#!/usr/bin/env python3
"""Rebuild B787_IOE_Workbook_Answered.pdf from ioe_questions.json.

Layout mirrors the ioe.html card: short question, the bare-fact answer in green,
then the full detail, the citation, the verbatim quote, the note, and the
original workbook wording.
"""
import json, re, html, os
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame, Paragraph,
                                Spacer, Table, TableStyle, KeepTogether)

SRC = os.environ.get('IOE_JSON', 'ioe_questions.json')
OUT = os.environ.get('IOE_PDF', 'B787_IOE_Workbook_Answered.pdf')

MIDNIGHT = colors.HexColor('#01426A')
ATLAS    = colors.HexColor('#0074C8')
GREEN    = colors.HexColor('#00805E')
AMBER    = colors.HexColor('#8A5A12')
GREY     = colors.HexColor('#5A6B78')
LINE     = colors.HexColor('#C9DCE9')
BAND     = colors.HexColor('#EDF4FA')

def esc(s):
    return html.escape(s or '', quote=False)

S = dict(
    sec   = ParagraphStyle('sec', fontName='Helvetica-Bold', fontSize=13, leading=16,
                           textColor=colors.white, spaceBefore=0, spaceAfter=0),
    grp   = ParagraphStyle('grp', fontName='Helvetica-Bold', fontSize=9, leading=12,
                           textColor=ATLAS, spaceBefore=10, spaceAfter=2),
    q     = ParagraphStyle('q', fontName='Helvetica-Bold', fontSize=10.5, leading=13.5,
                           textColor=MIDNIGHT, spaceBefore=9, spaceAfter=1),
    ans   = ParagraphStyle('ans', fontName='Helvetica-Bold', fontSize=11, leading=14,
                           textColor=GREEN, spaceBefore=2, spaceAfter=3),
    ansr  = ParagraphStyle('ansr', fontName='Helvetica-Bold', fontSize=11, leading=14,
                           textColor=AMBER, spaceBefore=2, spaceAfter=3),
    body  = ParagraphStyle('body', fontName='Helvetica', fontSize=9.5, leading=12.5,
                           textColor=colors.black, spaceAfter=2),
    ref   = ParagraphStyle('ref', fontName='Helvetica-Bold', fontSize=8.5, leading=11,
                           textColor=ATLAS, leftIndent=10, spaceBefore=3),
    quote = ParagraphStyle('quote', fontName='Helvetica-Oblique', fontSize=8.5, leading=11,
                           textColor=colors.HexColor('#24404A'), leftIndent=21,
                           rightIndent=8, spaceBefore=2),
    note  = ParagraphStyle('note', fontName='Helvetica', fontSize=8.5, leading=11,
                           textColor=GREY, leftIndent=10, spaceBefore=2),
    tag   = ParagraphStyle('tag', fontName='Helvetica-Bold', fontSize=7, leading=9,
                           textColor=GREY, spaceBefore=0, spaceAfter=1),
    icao  = ParagraphStyle('icao', fontName='Helvetica', fontSize=8.5, leading=11,
                           textColor=colors.HexColor('#6B4E12'), leftIndent=10, spaceBefore=4),
    icaoh = ParagraphStyle('icaoh', fontName='Helvetica-Bold', fontSize=7.5, leading=10,
                           textColor=colors.HexColor('#8A5A12'), leftIndent=10, spaceBefore=6),
    orig  = ParagraphStyle('orig', fontName='Helvetica-Oblique', fontSize=7.5, leading=10,
                           textColor=GREY, leftIndent=10, spaceBefore=2),
    h1    = ParagraphStyle('h1', fontName='Helvetica-Bold', fontSize=21, leading=25,
                           textColor=MIDNIGHT, spaceAfter=2),
    h2    = ParagraphStyle('h2', fontName='Helvetica', fontSize=12, leading=16,
                           textColor=ATLAS, spaceAfter=10),
    lead  = ParagraphStyle('lead', fontName='Helvetica', fontSize=9.5, leading=13,
                           textColor=colors.black, spaceAfter=6),
    cell  = ParagraphStyle('cell', fontName='Helvetica', fontSize=9, leading=12),
    cellb = ParagraphStyle('cellb', fontName='Helvetica-Bold', fontSize=9, leading=12),
)

def section_band(sec, title, coi, width):
    txt = esc('%s  %s' % (sec, title))
    if coi:
        txt += '&nbsp;&nbsp;<font color="#B1D887">[ CRITICAL OBSERVABLE ITEM ]</font>'
    t = Table([[Paragraph(txt, S['sec'])]], colWidths=[width])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), MIDNIGHT),
        ('LEFTPADDING', (0, 0), (-1, -1), 9),
        ('RIGHTPADDING', (0, 0), (-1, -1), 9),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    return t

def source_block(c, width):
    rows = []
    if c['ref']:
        rows.append(Paragraph(esc(c['ref']), S['ref']))
    if c['quote']:
        rows.append(Paragraph('&ldquo;%s&rdquo;' % esc(c['quote']), S['quote']))
    if c['note']:
        rows.append(Paragraph(esc(c['note']), S['note']))
    if (c.get('icao') or '').strip():
        rows.append(Paragraph('ICAO DIFFERENCE, REFERENCE ONLY. COMPANY PROCEDURE GOVERNS', S['icaoh']))
        rows.append(Paragraph(esc(c['icao']), S['icao']))
    if c['qOrig'] and c['qOrig'].strip() != c['q'].strip():
        rows.append(Paragraph('Workbook wording: %s' % esc(c['qOrig']), S['orig']))
    if not rows:
        return None
    t = Table([[rows]], colWidths=[width])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), BAND),
        ('LINEBEFORE', (0, 0), (0, -1), 2, ATLAS),
        ('LEFTPADDING', (0, 0), (-1, -1), 7),
        ('RIGHTPADDING', (0, 0), (-1, -1), 7),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    return t

def main():
    cards = json.load(open(SRC))
    nv = sum(1 for c in cards if c['status'] == 'verified')
    nd = len(cards) - nv
    ncoi = sum(1 for c in cards if c['coi'])
    nw = sum(1 for c in cards if c.get('kind') == 'walkthrough')

    doc = BaseDocTemplate(OUT, pagesize=letter,
                          leftMargin=0.62*inch, rightMargin=0.62*inch,
                          topMargin=0.72*inch, bottomMargin=0.62*inch,
                          title='B787 IOE Workbook Answered',
                          author='B787 Captain Study Project',
                          subject='B787 OE Workbook V3',
                          creator='B787 Captain Study Project',
                          keywords='B787, IOE, OE Workbook, FOM, FCOM, QRH')
    W = doc.width

    def deco(canv, d):
        canv.saveState()
        canv.setFont('Helvetica', 8)
        canv.setFillColor(GREY)
        canv.drawString(d.leftMargin, letter[1] - 0.47*inch, 'B787 IOE Workbook, Answered')
        canv.drawRightString(letter[0] - d.rightMargin, letter[1] - 0.47*inch,
                             'FOM Rev 125.1  |  FCOM R10  |  QRH R7')
        canv.setStrokeColor(LINE)
        canv.setLineWidth(0.5)
        canv.line(d.leftMargin, letter[1] - 0.55*inch,
                  letter[0] - d.rightMargin, letter[1] - 0.55*inch)
        canv.line(d.leftMargin, 0.55*inch, letter[0] - d.rightMargin, 0.55*inch)
        canv.setFont('Helvetica', 7.5)
        canv.drawString(d.leftMargin, 0.40*inch,
                        'Study aid only. Verify against the current manual before operational use.')
        canv.drawRightString(letter[0] - d.rightMargin, 0.40*inch, 'Page %d' % canv.getPageNumber())
        canv.restoreState()

    doc.addPageTemplates([PageTemplate(id='main',
                          frames=[Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id='f')],
                          onPage=deco)])

    st = []
    st.append(Paragraph('B787 IOE Workbook', S['h1']))
    st.append(Paragraph('Answered, in flashcard form', S['h2']))
    st.append(Paragraph(
        'Source: B787 OE Workbook, Version 3, June 2026.', S['lead']))

    rows = [
        ['Workbook questions', str(len(cards))],
        ['Answered from the manuals', str(nv)],
        ['Not answered in our manuals', str(nd)],
        ['Critical Observable Items', str(ncoi)],
        ['Drill cards / walkthrough items', '%d / %d' % (len(cards) - nw, nw)],
        ['Manuals used', 'FOM Rev 125.1 (8/12/26), FCOM R10, QRH R7'],
        ['Reference', 'ICAO NAT Doc 007 V.2026-1, where our manuals are silent'],
        ['Compiled', 'August 16, 2026'],
    ]
    t = Table([[Paragraph(a, S['cell']), Paragraph(b, S['cellb'])] for a, b in rows],
              colWidths=[2.5*inch, W - 2.5*inch])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), BAND),
        ('LINEBELOW', (0, 0), (-1, -2), 0.4, colors.white),
        ('LEFTPADDING', (0, 0), (-1, -1), 9),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    st.append(t)
    st.append(Spacer(1, 14))

    st.append(Paragraph('How to read this document', S['q']))
    st.append(Paragraph(
        'Each question carries the answer in green, and nothing else. That green line is what you '
        'should be able to say cold. Everything under it is the backup: the full answer, the manual '
        'section, a verbatim quote where one exists, a note, and the workbook\'s own wording of the '
        'question where it differed.', S['body']))
    st.append(Paragraph(
        'An answer in amber is not published anywhere in the FOM, FCOM or QRH. It names the manual, '
        'card or system that holds it, or says plainly that no requirement exists. Nothing was '
        'guessed. Most of these sit in the FCTM, the MEL, the Pilot Reference Cards, FD Pro, '
        'Comply365 or the OpSpecs.', S['body']))
    st.append(Paragraph(
        'Two questions ask for the flight deck door entry code and the crew rest door lock '
        'combination. Those are deliberately not recorded. They are security sensitive under FOM '
        'Chapter 15 and do not belong in a study document.', S['body']))

    last_sec = last_grp = None
    for c in cards:
        blk = []
        if (c['sec'], c['secTitle']) != last_sec:
            blk.append(Spacer(1, 12))
            blk.append(section_band(c['sec'], c['secTitle'], c['coi'], W))
            last_sec = (c['sec'], c['secTitle'])
            last_grp = None
        if c['group'] and c['group'] != last_grp:
            blk.append(Paragraph(esc(c['group']), S['grp']))
            last_grp = c['group']
        tagtxt = esc(c.get('topic', ''))
        if c.get('kind') == 'walkthrough':
            tagtxt += '&nbsp;&nbsp;&middot;&nbsp;&nbsp;WALKTHROUGH ITEM, PERFORM RATHER THAN RECALL'
        if tagtxt:
            blk.append(Paragraph(tagtxt.upper(), S['tag']))
        blk.append(Paragraph(esc(c['q']), S['q']))
        blk.append(Paragraph(esc(c['a']),
                             S['ans'] if c['status'] == 'verified' else S['ansr']))
        if c['detail']:
            blk.append(Paragraph(esc(c['detail']), S['body']))
        sb = source_block(c, W)
        if sb is not None:
            blk.append(sb)
        st.append(KeepTogether(blk))

    doc.build(st)
    print('built', OUT)

if __name__ == '__main__':
    main()
