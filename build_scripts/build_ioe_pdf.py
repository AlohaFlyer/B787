#!/usr/bin/env python3
"""Build B787_IOE_Workbook_Answered.pdf from ioe_questions.json.

Organized by topic in flight order with a table of contents, a Numbers to Know
page up front, and key facts set larger and bold so they land at a glance.
"""
import json, re, html, os
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame, Paragraph,
                                Spacer, Table, TableStyle, KeepTogether, PageBreak)
from reportlab.platypus.tableofcontents import TableOfContents

SRC = os.environ.get('IOE_JSON', 'ioe_questions.json')
OUT = os.environ.get('IOE_PDF', 'B787_IOE_Workbook_Answered.pdf')

MIDNIGHT = colors.HexColor('#01426A')
ATLAS    = colors.HexColor('#0074C8')
GREEN    = colors.HexColor('#00805E')
AMBER    = colors.HexColor('#8A5A12')
GREY     = colors.HexColor('#5A6B78')
LINE     = colors.HexColor('#C9DCE9')
BAND     = colors.HexColor('#EDF4FA')

TOPIC_ORDER = [
    'Emergency Equipment', 'Security and Doors', 'Crew Rest', 'EFB and FD Pro',
    'Dispatch and Release', 'Fuel Planning', 'Weather and Minimums',
    'Communications and PA', 'Pushback and Start', 'Taxi and Ground',
    'Cold Weather and Runway Condition', 'Takeoff and Departure',
    'Cruise and Diversion', 'ETOPS', 'Oceanic and NAT', 'International Theaters',
    'TCAS and Traffic', 'Medical', 'HAZMAT', 'Descent and Approach',
    'Landing and Rollout', 'MEL and Maintenance', 'Abnormals and QRH',
    'General Operations',
]


def esc(s):
    return html.escape(s or '', quote=False)


def is_gold(c):
    """A fact worth knowing cold: short, verified, and it carries a number."""
    return (c['status'] == 'verified' and re.search(r'\d', c['a'])
            and len(c['a'].split()) <= 6)


S = dict(
    topic = ParagraphStyle('topic', fontName='Helvetica-Bold', fontSize=15, leading=18,
                           textColor=colors.white),
    grp   = ParagraphStyle('grp', fontName='Helvetica-Bold', fontSize=9, leading=12,
                           textColor=ATLAS, spaceBefore=10, spaceAfter=2),
    tag   = ParagraphStyle('tag', fontName='Helvetica-Bold', fontSize=7, leading=9,
                           textColor=GREY, spaceBefore=0, spaceAfter=1),
    coi   = ParagraphStyle('coi', fontName='Helvetica-Bold', fontSize=7, leading=9,
                           textColor=GREEN, spaceBefore=0, spaceAfter=1),
    q     = ParagraphStyle('q', fontName='Helvetica-Bold', fontSize=10.5, leading=13.5,
                           textColor=MIDNIGHT, spaceBefore=9, spaceAfter=1),
    ans   = ParagraphStyle('ans', fontName='Helvetica-Bold', fontSize=11, leading=14,
                           textColor=GREEN, spaceBefore=2, spaceAfter=3),
    gold  = ParagraphStyle('gold', fontName='Helvetica-Bold', fontSize=14, leading=17,
                           textColor=GREEN, spaceBefore=3, spaceAfter=4),
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
    icao  = ParagraphStyle('icao', fontName='Helvetica', fontSize=8.5, leading=11,
                           textColor=colors.HexColor('#6B4E12'), leftIndent=10, spaceBefore=4),
    icaoh = ParagraphStyle('icaoh', fontName='Helvetica-Bold', fontSize=7.5, leading=10,
                           textColor=AMBER, leftIndent=10, spaceBefore=6),
    orig  = ParagraphStyle('orig', fontName='Helvetica-Oblique', fontSize=7, leading=9,
                           textColor=colors.HexColor('#8A9BA8'), leftIndent=10, spaceBefore=3),
    h1    = ParagraphStyle('h1', fontName='Helvetica-Bold', fontSize=21, leading=25,
                           textColor=MIDNIGHT, spaceAfter=2),
    h2    = ParagraphStyle('h2', fontName='Helvetica', fontSize=12, leading=16,
                           textColor=ATLAS, spaceAfter=10),
    lead  = ParagraphStyle('lead', fontName='Helvetica', fontSize=9.5, leading=13,
                           textColor=colors.black, spaceAfter=6),
    cell  = ParagraphStyle('cell', fontName='Helvetica', fontSize=9, leading=12),
    cellb = ParagraphStyle('cellb', fontName='Helvetica-Bold', fontSize=9, leading=12),
    numq  = ParagraphStyle('numq', fontName='Helvetica', fontSize=9.5, leading=13),
    numa  = ParagraphStyle('numa', fontName='Helvetica-Bold', fontSize=11, leading=13,
                           textColor=GREEN),
    toch  = ParagraphStyle('toch', fontName='Helvetica-Bold', fontSize=14, leading=18,
                           textColor=MIDNIGHT, spaceBefore=6, spaceAfter=10),
)

TOC_LEVEL = ParagraphStyle('toc0', fontName='Helvetica', fontSize=10.5, leading=16,
                           textColor=MIDNIGHT, leftIndent=4)


class Doc(BaseDocTemplate):
    def afterFlowable(self, fl):
        if getattr(fl, '_toc', None):
            self.notify('TOCEntry', (0, fl._toc, self.page))


def topic_band(title, n, width):
    p = Paragraph('%s  <font size="9">(%d)</font>' % (esc(title), n), S['topic'])
    t = Table([[p]], colWidths=[width])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), MIDNIGHT),
        ('LEFTPADDING', (0, 0), (-1, -1), 9),
        ('RIGHTPADDING', (0, 0), (-1, -1), 9),
        ('TOPPADDING', (0, 0), (-1, -1), 7),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
    ]))
    t._toc = title
    return t


def source_block(c, width):
    rows = []
    if c['ref']:
        rows.append(Paragraph(esc(c['ref']), S['ref']))
    if c['quote']:
        qtxt = c['quote']
        opening = '' if qtxt.lstrip().startswith(('"', '\u201c')) else '&ldquo;'
        closing = '' if qtxt.rstrip().endswith(('"', '\u201d')) else '&rdquo;'
        rows.append(Paragraph(opening + esc(qtxt) + closing, S['quote']))
    if c['note']:
        rows.append(Paragraph(esc(c['note']), S['note']))
    if (c.get('icao') or '').strip():
        rows.append(Paragraph('NAT DOC 007, REFERENCE ONLY. COMPANY PROCEDURE GOVERNS', S['icaoh']))
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

    by_topic = {}
    for c in cards:
        by_topic.setdefault(c['topic'], []).append(c)
    order = [t for t in TOPIC_ORDER if t in by_topic] + \
            [t for t in sorted(by_topic) if t not in TOPIC_ORDER]

    doc = Doc(OUT, pagesize=letter,
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

    # ---- Cover ----
    st.append(Paragraph('B787 IOE Workbook', S['h1']))
    st.append(Paragraph('Answered, in flashcard form', S['h2']))
    st.append(Paragraph('Source: B787 OE Workbook, Version 3, June 2026.', S['lead']))
    rows = [
        ['Workbook questions', str(len(cards))],
        ['Answered from the manuals', str(nv)],
        ['Not answered in our manuals', str(nd)],
        ['Critical Observable Items', str(ncoi)],
        ['Drill cards / walkthrough items', '%d / %d' % (len(cards) - nw, nw)],
        ['Manuals used', 'FOM Rev 125.1 (8/12/26), FCOM R10, QRH R7'],
        ['Reference', 'ICAO NAT Doc 007 V.2026-1, where our manuals are silent'],
        ['Compiled', 'August 2026'],
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
        'should be able to say cold. Key numbers are set larger so they land at a glance. Everything '
        'under the answer is the backup: the full answer, the manual section, a verbatim quote where '
        'one exists, and a note.', S['body']))
    st.append(Paragraph(
        'Questions are grouped by topic in roughly the order you meet them on a trip, preflight '
        'to shutdown, with the long-haul topics in the middle. The tag above each question carries '
        'the grade sheet item it came from.', S['body']))
    st.append(Paragraph(
        'An answer in amber is not published anywhere in the FOM, FCOM or QRH. It names the manual, '
        'card or system that holds it, or says plainly that no requirement exists. Nothing was '
        'guessed.', S['body']))
    st.append(Paragraph(
        'Two questions ask for the flight deck door entry code and the crew rest door lock '
        'combination. Those are deliberately not recorded. They are security sensitive and do not '
        'belong in a study document.', S['body']))

    # ---- Numbers to Know ----
    gold = [c for c in cards if is_gold(c)]
    st.append(PageBreak())
    st.append(Paragraph('Numbers to Know', S['h1']))
    st.append(Paragraph('The facts on these cards worth knowing cold before the first leg.', S['h2']))
    nrows = [[Paragraph(esc(c['q']), S['numq']), Paragraph(esc(c['a']), S['numa'])]
             for c in gold]
    nt = Table(nrows, colWidths=[W * 0.62, W * 0.38])
    nt.setStyle(TableStyle([
        ('ROWBACKGROUNDS', (0, 0), (-1, -1), [colors.white, BAND]),
        ('LINEBELOW', (0, 0), (-1, -1), 0.3, LINE),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    st.append(nt)

    # ---- Contents ----
    st.append(PageBreak())
    st.append(Paragraph('Contents', S['toch']))
    toc = TableOfContents()
    toc.levelStyles = [TOC_LEVEL]
    st.append(toc)

    # ---- Cards, by topic ----
    for topic in order:
        group = by_topic[topic]
        st.append(PageBreak() if topic == order[0] else Spacer(1, 14))
        st.append(topic_band(topic, len(group), W))
        last_grp = None
        for c in group:
            blk = []
            if c['group'] and c['group'] != last_grp:
                blk.append(Paragraph(esc(c['group']), S['grp']))
                last_grp = c['group']
            if c['coi']:
                blk.append(Paragraph('CRITICAL OBSERVABLE ITEM', S['coi']))
            meta = c['sec'] + '  ' + c['secTitle']
            if c.get('kind') == 'walkthrough':
                meta += '   WALKTHROUGH ITEM, PERFORM RATHER THAN RECALL'
            blk.append(Paragraph(esc(meta).upper(), S['tag']))
            blk.append(Paragraph(esc(c['q']), S['q']))
            if c['status'] == 'verified':
                blk.append(Paragraph(esc(c['a']), S['gold'] if is_gold(c) else S['ans']))
            else:
                blk.append(Paragraph(esc(c['a']), S['ansr']))
            if c['detail']:
                blk.append(Paragraph(esc(c['detail']), S['body']))
            sb = source_block(c, W)
            if sb is not None:
                blk.append(sb)
            st.append(KeepTogether(blk))

    natcards = [c for c in cards if (c.get('icao') or '').strip()]
    if natcards:
        st.append(PageBreak())
        st.append(topic_band('North Atlantic: NAT Doc 007 Notes', len(natcards), W))
        st.append(Paragraph(
            'Every place NAT Doc 007, the ICAO North Atlantic Operations and Airspace Manual '
            'V.2026-1, speaks to a question in this workbook. The company manuals govern in '
            'every case; these are the ICAO references behind them, collected for review '
            'before a North Atlantic crossing. Each note also appears on its card.', S['body']))
        for c in natcards:
            blk = [Paragraph(esc(c['q']), S['q']),
                   Paragraph(esc(c['a']), S['ans'] if c['status'] == 'verified' else S['ansr']),
                   Paragraph(esc(c['icao']), S['icao'])]
            st.append(KeepTogether(blk))

    doc.multiBuild(st)
    print('built %s  (%d cards, %d gold, %d topics)' % (OUT, len(cards), len(gold), len(order)))


if __name__ == '__main__':
    main()
