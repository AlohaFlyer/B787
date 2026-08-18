#!/usr/bin/env python3
"""Verifier for the IOE bank. Exit 0 only when every requested check passes."""
import json, re, io, sys, unicodedata, argparse, statistics

SRC = '/tmp/ioe/ioe_questions.json'
MAN = {k: io.open('/tmp/ioe/man/%s.txt' % k, encoding='utf-8', errors='replace').read()
       for k in ('FOM', 'FCOM', 'QRH', 'NAT007', 'FCTM', 'MEL')}


def norm(s):
    s = unicodedata.normalize('NFKD', s or '')
    for a, b in [('“', '"'), ('”', '"'), ('‘', "'"), ('’', "'"),
                 ('–', '-'), ('—', '-'), ('−', '-')]:
        s = s.replace(a, b)
    return re.sub(r'\s+', ' ', re.sub(r'[^A-Za-z0-9]+', ' ', s)).strip().lower()


NORM_MAN = {k: norm(v) for k, v in MAN.items()}

NOISE = re.compile(
    r'\b(desktop|routed|verify at source|not in this environment|staged|the bank|'
    r'flagged by the|this session|as an ai|i could not|i did not locate)\b', re.I)
YN_Q = re.compile(r'^(is|are|can|do|does|must|will|should|may|has|have|did|would|was|were)\b', re.I)
YN_A = re.compile(r'^(yes|no|not|only|never|always)\b', re.I)
FACT_Q = re.compile(r'^(what|who|when|how)\b', re.I)
LOC_A = re.compile(r'^(in the|on the|at the)\b', re.I)


def main():
    ap = argparse.ArgumentParser()
    for f in ('noise', 'counts', 'quotes', 'labels', 'all'):
        ap.add_argument('--' + f, action='store_true')
    ns = ap.parse_args()
    on = lambda f: ns.all or getattr(ns, f)

    d = json.load(open(SRC))
    fails = []

    def chk(name, ok, extra=''):
        print(('PASS ' if ok else 'FAIL ') + name + ((' ' + str(extra)) if extra else ''))
        if not ok:
            fails.append(name)

    if on('counts'):
        chk('342 cards', len(d) == 342, len(d))
        chk('unique ids', len(set(c['id'] for c in d)) == 342)
        chk('120 critical observable items', sum(1 for c in d if c['coi']) == 120)
        chk('45 workbook sections', len(set((c['sec'], c['secTitle']) for c in d)) == 45)
        chk('every card has q, a, ref', all(c['q'].strip() and c['a'].strip() and c['ref'].strip() for c in d))
        aw = [len(c['a'].split()) for c in d]
        chk('no answer over 12 words', max(aw) <= 12, 'median %s max %s' % (statistics.median(aw), max(aw)))
        SEC = re.compile(r'\b\d+\.\d+\.\d|\b(FOM|FCOM|QRH|NAT)\s*\d+\.\d|\bsection \d+\.\d', re.I)
        chk('no manual section numbers in answers', not [c['id'] for c in d if SEC.search(c['a'])])

    if on('quotes'):
        bad = [c['id'] for c in d if c['status'] == 'verified' and c['quote']
               and not any(norm(c['quote']) in t for t in NORM_MAN.values())]
        chk('every verified quote is a literal substring', not bad, bad[:5])
        icao = [c['id'] for c in d if c.get('icao', '').strip()]
        badi = [i for i in icao if not any(norm(x) in NORM_MAN['NAT007']
                for x in re.findall(r'"([^"]{20,})"', dict((c['id'], c) for c in d)[i]['icao']))]
        chk('every ICAO note quotes NAT Doc 007', not badi, badi[:5])

    if on('noise'):
        hits = [(c['id'], f) for c in d for f in ('a', 'detail', 'note', 'icao')
                if NOISE.search(c.get(f, '') or '')]
        chk('no process vocabulary', not hits, hits[:6])
        dw = [(c['id'], len(c['detail'].split())) for c in d if len(c['detail'].split()) > 60]
        chk('every detail under 60 words', not dw, dw[:5])
        nw = [(c['id'], len(c['note'].split())) for c in d if len(c['note'].split()) > 45]
        chk('every note under 45 words', not nw, nw[:5])
        dash = [c['id'] for c in d if any('—' in (c.get(f) or '') or '–' in (c.get(f) or '')
                for f in ('q', 'a', 'detail', 'note', 'icao'))]
        chk('no em or en dashes', not dash, dash[:5])
        FLEET = re.compile(r'\bA3(2[01]|30)\b|\bAirbus\b|\b737\b|\b717\b|\b757\b|\b767\b|\b777\b|\b321\b|\b330\b', re.I)
        fl = [(c['id'], f) for c in d for f in ('q', 'a', 'qOrig', 'detail', 'note', 'ref', 'quote', 'secTitle', 'group', 'icao')
              if FLEET.search(c.get(f, '') or '')]
        chk('no fleet other than the 787', not fl, fl[:6])
        rest = [c['id'] for c in d if c['note'] and norm(c['note']) == norm(c['a'])]
        chk('no note that just restates the answer', not rest, rest[:5])

    if on('labels'):
        ynbad = [(c['id'], c['a']) for c in d
                 if YN_Q.match(c['q'].strip()) and ' or ' not in c['q'] and not YN_A.match(c['a'].strip())]
        chk('yes/no questions answered yes or no', not ynbad, ynbad[:4])
        locbad = [(c['id'], c['a']) for c in d
                  if FACT_Q.match(c['q'].strip()) and LOC_A.match(c['a'].strip())]
        chk('no fact question answered with a location', not locbad, locbad[:4])
        code = [c['id'] for c in d if re.search(r'code is \d|combination is \d', ' '.join(
            [c.get(f, '') or '' for f in ('a', 'detail', 'note', 'quote', 'icao')]), re.I)]
        chk('no door code anywhere', not code, code)

    print('\nRESULT: ' + ('ALL CHECKS PASS' if not fails else 'FAILURES: ' + ', '.join(fails)))
    sys.exit(0 if not fails else 1)


if __name__ == '__main__':
    main()
