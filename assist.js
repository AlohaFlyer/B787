/* Per-section Offline Search + Ask Pualani.
   Each page searches only its own corpus, so answers stay inside that section. */
(function () {
  'use strict';
  if (window.__assistLoaded) return;
  window.__assistLoaded = true;

  var MAP = {
    'ioe.html': 'ioe', 'flows_quiz.html': 'flows', 'cdu_preflight.html': 'cdu',
    'triggers.html': 'triggers', 'limitations.html': 'limitations', 'memory-items.html': 'memory',
    'systems_quiz.html': 'systems', 'fom_quiz.html': 'fom', 'weather.html': 'weather'
  };
  var file = location.pathname.split('/').pop() || 'index.html';
  var KEY = MAP[file];
  if (!KEY) return;

  var CORPUS = null, BM = null, LOADING = null;
  function el(id) { return document.getElementById(id); }

  var STOP = ('a an the and or of to in on for is are was were be been am i my me you your it its this that these those do does did ' +
    'can could would should shall will may might must have has had if then than as at by from with without what when where which who ' +
    'whom how why not no yes about into over under any all some each per').split(' ');
  var STOPS = {}; STOP.forEach(function (w) { STOPS[w] = 1; });
  function norm(w) {
    w = w.toLowerCase();
    if (w.length > 4 && /ies$/.test(w)) return w.slice(0, -3) + 'y';
    if (w.length > 3 && /(ses|xes|zes|ches|shes)$/.test(w)) return w.slice(0, -2);
    if (w.length > 3 && /s$/.test(w) && !/ss$/.test(w)) return w.slice(0, -1);
    if (w.length > 5 && /ing$/.test(w)) return w.slice(0, -3);
    if (w.length > 4 && /ed$/.test(w)) return w.slice(0, -2);
    return w;
  }
  function tok(s) {
    var out = [], m = String(s || '').toLowerCase().match(/[a-z0-9][a-z0-9.'-]*/g) || [];
    for (var i = 0; i < m.length; i++) {
      var w = m[i].replace(/[.'-]+$/, '');
      if (!w || STOPS[w] || w.length < 2) continue;
      out.push(norm(w));
    }
    return out;
  }
  function buildBM(docs) {
    var N = docs.length, df = {}, tf = new Array(N), len = new Array(N), sum = 0;
    for (var i = 0; i < N; i++) {
      var t = tok(docs[i].x).concat(tok(docs[i].t), tok(docs[i].t), tok(docs[i].r));
      var c = {};
      for (var k2 = 0; k2 < t.length; k2++) c[t[k2]] = (c[t[k2]] || 0) + 1;
      tf[i] = c; len[i] = t.length; sum += t.length;
      for (var k in c) df[k] = (df[k] || 0) + 1;
    }
    return { N: N, df: df, tf: tf, len: len, avg: sum / N || 1 };
  }
  /* Keywords is the BM25 engine below. Exact and Phrase do no stemming and no
     expansion: both compare a squashed form, lowercase with every run of
     non-alphanumerics collapsed to one space, so punctuation in the source does
     not break a match while word order and completeness still do. */
  var MODES = {
    keywords: { label: 'Keywords', help: 'Ranked by relevance. Stems words.' },
    exact:    { label: 'Exact',    help: 'Every word must appear, as typed.' },
    phrase:   { label: 'Phrase',   help: 'The whole string, in that order.' }
  };
  var MODE = 'keywords';
  var SEARCHED = false;   // a zero-hit search still counts, otherwise the mode buttons go dead
  function lsGet(k, d) { try { var v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  function squash(x) {
    return String(x == null ? '' : x).toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/^ | $/g, '');
  }
  function sqDoc(d) { if (d.__sq === undefined) d.__sq = ' ' + squash(d.x) + ' '; return d.__sq; }
  function sqHead(d) { if (d.__sh === undefined) d.__sh = ' ' + squash((d.t || '') + ' ' + (d.r || '')) + ' '; return d.__sh; }
  function countOf(hay, needle) {
    if (!needle) return 0;
    var n = 0, i = hay.indexOf(needle);
    while (i >= 0) { n++; i = hay.indexOf(needle, i + 1); }
    return n;
  }
  function searchExact(q, limit) {
    var sq = squash(q); if (!sq) return [];
    var words = sq.split(' ').filter(function (w, i, a) { return a.indexOf(w) === i; }), out = [];
    for (var i = 0; i < CORPUS.docs.length; i++) {
      var d = CORPUS.docs[i], body = sqDoc(d), head = sqHead(d), sc = 0, all = true;
      for (var w = 0; w < words.length; w++) {
        var t = ' ' + words[w] + ' ', c = countOf(body, t);
        if (!c) { all = false; break; }
        sc += 1 + Math.log(1 + c) + (countOf(head, t) ? 3 : 0);
      }
      if (all) out.push([sc, i]);
    }
    out.sort(function (a, c) { return c[0] - a[0]; });
    return out.slice(0, limit || 10).map(function (r) {
      return { s: r[0], d: CORPUS.docs[r[1]], terms: words, lit: words.slice() };
    });
  }
  function searchPhrase(q, limit) {
    var sq = squash(q); if (!sq) return [];
    var needle = ' ' + sq + ' ', out = [];
    for (var i = 0; i < CORPUS.docs.length; i++) {
      var d = CORPUS.docs[i], c = countOf(sqDoc(d), needle);
      if (!c) continue;
      out.push([1 + Math.log(1 + c) + (countOf(sqHead(d), needle) ? 3 : 0), i]);
    }
    out.sort(function (a, c) { return c[0] - a[0]; });
    return out.slice(0, limit || 10).map(function (r) {
      return { s: r[0], d: CORPUS.docs[r[1]], terms: sq.split(' '), lit: [sq] };
    });
  }
  function runSearch(q, limit) {
    if (MODE === 'exact') return searchExact(q, limit);
    if (MODE === 'phrase') return searchPhrase(q, limit);
    return search(q, limit);
  }

  function search(q, limit) {
    var terms = tok(q); if (!terms.length) return [];
    var k1 = 1.5, b = 0.75, sc = new Array(BM.N).fill(0);
    terms.forEach(function (t) {
      var n = BM.df[t]; if (!n) return;
      var idf = Math.log(1 + (BM.N - n + 0.5) / (n + 0.5));
      for (var d = 0; d < BM.N; d++) {
        var f = BM.tf[d][t]; if (!f) continue;
        sc[d] += idf * (f * (k1 + 1)) / (f + k1 * (1 - b + b * BM.len[d] / BM.avg));
      }
    });
    var phrase = q.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
    if (phrase.length > 8) for (var d2 = 0; d2 < BM.N; d2++)
      if (CORPUS.docs[d2].x.toLowerCase().indexOf(phrase) >= 0) sc[d2] += 5;
    var ord = [];
    for (var i = 0; i < sc.length; i++) if (sc[i] > 0) ord.push([sc[i], i]);
    ord.sort(function (a, c) { return c[0] - a[0]; });
    return ord.slice(0, limit || 10).map(function (r) { return { s: r[0], d: CORPUS.docs[r[1]], terms: terms }; });
  }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  // Lead sentence, then real bullets.
  function renderAnswer(text) {
    var lines = text.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
    var lead = [], items = [];
    lines.forEach(function (l) {
      var m = l.match(/^[-\u2022*]\s+(.*)$/);
      if (m) items.push(m[1]);
      else if (!items.length) lead.push(l);
      else items.push(l);
    });
    var html = '';
    if (lead.length) html += '<p class="lead">' + esc(lead.join(' ')) + '</p>';
    if (items.length) html += '<ul>' + items.map(function (i) { return '<li>' + esc(i) + '</li>'; }).join('') + '</ul>';
    return html || esc(text);
  }
  function hl(s, terms) {
    var h = esc(s);
    terms.slice().sort(function (a, b) { return b.length - a.length; }).slice(0, 10).forEach(function (t) {
      if (t.length < 3) return;
      var stem = t.slice(0, Math.max(4, t.length - 1)).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      h = h.replace(new RegExp('(?<![\\w>])(' + stem + '\\w*)', 'gi'), '<mark>$1</mark>');
    });
    return h;
  }
  function reEsc(x) { return x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function hlLit(str, lits) {
    var h = esc(str);
    lits.slice().sort(function (a, b) { return b.length - a.length; }).slice(0, 8).forEach(function (t) {
      if (!t) return;
      var pat = t.split(' ').map(reEsc).join('[^a-zA-Z0-9]+');
      h = h.replace(new RegExp('(?<![a-zA-Z0-9>])(' + pat + ')(?![a-zA-Z0-9])', 'gi'), '<mark>$1</mark>');
    });
    return h;
  }
  function snipLit(text, lits, w) {
    w = w || 300;
    var flat = String(text).replace(/\s+/g, ' ').trim(), low = ' ' + squash(flat) + ' ', at = -1;
    for (var i = 0; i < lits.length && at < 0; i++) at = low.indexOf(' ' + lits[i] + ' ');
    if (at < 0) return snip(text, lits, w);
    var mid = Math.round(at * (flat.length / Math.max(1, low.length - 2)));
    var best = Math.max(0, Math.min(Math.max(0, flat.length - w), mid - Math.round(w / 3)));
    var out = flat.slice(best, best + w);
    if (best > 0) out = '... ' + out;
    if (best + w < flat.length) out += ' ...';
    return out;
  }
  function snip(text, terms, w) {
    w = w || 300;
    var flat = text.replace(/\s+/g, ' ').trim(), low = flat.toLowerCase(), best = 0, hits = -1;
    for (var s = 0; s < Math.max(1, flat.length - w); s += 40) {
      var win = low.slice(s, s + w), n = 0;
      for (var i = 0; i < terms.length; i++) if (win.indexOf(terms[i].slice(0, Math.max(4, terms[i].length - 1))) >= 0) n++;
      if (n > hits) { hits = n; best = s; }
    }
    var out = flat.slice(best, best + w);
    if (best > 0) out = '... ' + out;
    if (best + w < flat.length) out += ' ...';
    return out;
  }

  var CSS = '' +
  '#as-launch{position:fixed;right:14px;bottom:14px;z-index:9990;display:flex;align-items:center;gap:9px;background:#01416e;color:#fff;border:2px solid #b1d887;border-radius:999px;padding:9px 16px 9px 10px;font-family:"Segoe UI",Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 3px 14px rgba(1,23,43,.45);}' +
  '#as-launch:hover{background:#007cba;}' +
  '#as-launch img{width:30px;height:30px;border-radius:50%;background:#fff;object-fit:contain;padding:1px;}' +
  '#as-panel{position:fixed;inset:auto 0 0 0;max-height:88vh;z-index:9991;background:#E8F3FA;color:#01416e;border-top:3px solid #01416e;display:none;flex-direction:column;font-family:"Segoe UI",Arial,Helvetica,sans-serif;box-shadow:0 -6px 26px rgba(1,23,43,.4);}' +
  '#as-panel.on{display:flex;}' +
  '.as-h{display:flex;justify-content:space-between;align-items:center;gap:10px;background:#01416e;color:#b1d887;padding:10px 14px;font-size:13px;font-weight:700;letter-spacing:.04em;}' +
  '.as-h button{background:none;border:none;color:#bfe9f4;font-size:22px;line-height:1;cursor:pointer;}' +
  '.as-b{overflow:auto;padding:12px 14px 20px;}' +
  '.as-wrap{max-width:820px;margin:0 auto;}' +
  '#as-q{width:100%;min-height:62px;padding:11px;border:2px solid #01416e;border-radius:6px;font-family:inherit;font-size:16px;resize:vertical;}' +
  '#as-q:focus{outline:none;border-color:#007cba;}' +
  '.as-row{display:flex;align-items:center;gap:14px;margin-top:12px;flex-wrap:wrap;}' +
  '#as-search{flex:1 1 220px;background:#01416e;color:#fff;border:none;border-radius:6px;padding:15px 18px;font-family:inherit;font-size:16px;font-weight:700;cursor:pointer;}' +
  '#as-search:hover{background:#007cba;}' +
  '#as-ask{display:flex;flex-direction:column;align-items:center;gap:4px;background:none;border:none;cursor:pointer;font-family:inherit;padding:0;}' +
  '#as-ask .disc{width:76px;height:76px;border-radius:50%;overflow:hidden;background:#fff;border:3px solid #01416e;display:flex;align-items:center;justify-content:center;}' +
  '#as-ask .disc img{width:100%;height:100%;object-fit:contain;padding:3px;}' +
  '#as-ask .lbl{font-size:11px;font-weight:700;color:#01416e;}' +
  '.as-modebar{display:flex;align-items:center;gap:9px;margin-top:11px;flex-wrap:wrap;}' +
  '.as-modebar .as-mlbl{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#5b7a8c;}' +
  '.as-modebar .as-mhelp{font-size:11px;color:#666;flex:1 1 100%;}' +
  '.as-seg{display:inline-flex;border:2px solid #01416e;border-radius:999px;overflow:hidden;}' +
  '.as-seg button{font-family:inherit;font-size:12px;font-weight:700;letter-spacing:.03em;background:#fff;color:#01416e;border:none;padding:8px 15px;cursor:pointer;min-height:36px;}' +
  '.as-seg button+button{border-left:2px solid #01416e;}' +
  '.as-seg button[aria-pressed="true"]{background:#01416e;color:#fff;}' +
  '.as-chips{display:flex;gap:6px;flex-wrap:wrap;margin-top:9px;font-size:12px;}' +
  '.as-chip{background:#01416e;color:#fff;border-radius:999px;padding:3px 11px;font-weight:700;letter-spacing:.04em;}' +
  '.as-scope{background:#b1d887;color:#01416e;border-radius:999px;padding:3px 11px;font-weight:700;}' +
  '.as-status{font-size:13px;color:#555;margin-top:12px;min-height:17px;}' +
  '.as-ans{background:#fff;border:2px solid #b1d887;border-left:8px solid #b1d887;padding:14px;margin-top:12px;display:none;}' +
  '.as-ans h4{margin:0 0 7px;font-size:12px;text-transform:uppercase;letter-spacing:.05em;}' +
  '.as-ans .body{font-size:15px;line-height:1.6;}' +
  '.as-ans .lead{font-size:16.5px;font-weight:700;line-height:1.5;margin:0 0 10px;}' +
  '.as-ans ul{margin:0;padding-left:20px;}' +
  '.as-ans li{margin:7px 0;line-height:1.6;}' +
  '.as-ans .who{font-size:11px;color:#666;margin-top:9px;}' +
  '.as-atts{display:flex;gap:7px;flex-wrap:wrap;margin-top:9px;}' +
  '.as-att{position:relative;width:56px;height:56px;border:2px solid #bfe9f4;border-radius:6px;overflow:hidden;background:#fff;}' +
  '.as-att img{width:100%;height:100%;object-fit:cover;display:block;}' +
  '.as-att button{position:absolute;top:1px;right:1px;width:19px;height:19px;border:none;border-radius:50%;background:rgba(1,23,43,.78);color:#fff;font-size:12px;line-height:1;cursor:pointer;padding:0;}' +
  '.as-clip{background:#fff;border:2px solid #01416e;color:#01416e;border-radius:6px;padding:9px 13px;font-family:inherit;font-size:12.5px;font-weight:700;cursor:pointer;min-height:40px;}' +
  '.as-drop{outline:3px dashed #007cba;outline-offset:3px;}' +
  '.as-attnote{font-size:11px;color:#666;margin-top:6px;}' +
  '.as-working{display:flex;align-items:center;gap:9px;font-size:13.5px;color:#01416e;font-weight:700;}' +
  '.as-working .as-dots{display:inline-flex;gap:4px;}' +
  '.as-working .as-dots i{width:7px;height:7px;border-radius:50%;background:#007cba;display:block;animation:asbl 1.05s infinite ease-in-out;}' +
  '.as-working .as-dots i:nth-child(2){animation-delay:.16s;}' +
  '.as-working .as-dots i:nth-child(3){animation-delay:.32s;}' +
  '@keyframes asbl{0%,72%,100%{opacity:.22;transform:translateY(0);}36%{opacity:1;transform:translateY(-3px);}}' +
  '@media (prefers-reduced-motion:reduce){.as-working .as-dots i{animation:none;opacity:.7;}}' +
  '.as-think{margin-top:8px;}' +
  '.as-think summary{cursor:pointer;font-size:11px;font-weight:700;color:#7a93a4;letter-spacing:.04em;text-transform:uppercase;}' +
  '.as-think .as-tb{white-space:pre-wrap;font-size:12px;line-height:1.55;color:#444;background:#f4f9fc;border-left:4px solid #bfe9f4;padding:8px 10px;margin-top:6px;}' +
  '.as-ans .turn{border-top:2px solid #bfe9f4;margin-top:12px;padding-top:10px;}' +
  '.as-ans .turn:first-child{border-top:none;margin-top:0;padding-top:0;}' +
  '.as-ans .tq{font-size:12.5px;font-weight:700;color:#007cba;margin-bottom:6px;}' +
  '.as-fu{border-top:2px solid #bfe9f4;margin-top:12px;padding-top:10px;}' +
  '.as-fu textarea{width:100%;min-height:50px;padding:9px;border:2px solid #bfe9f4;border-radius:6px;font-family:inherit;font-size:16px;resize:vertical;}' +
  '.as-fu textarea:focus{outline:none;border-color:#007cba;}' +
  '.as-fubar{display:flex;align-items:center;gap:8px;margin-top:8px;flex-wrap:wrap;}' +
  '.as-fubar button{font-family:inherit;font-size:12.5px;font-weight:700;border-radius:6px;padding:9px 14px;cursor:pointer;min-height:40px;border:2px solid #01416e;}' +
  '#as-fuask{background:#01416e;color:#fff;}' +
  '#as-fuask[disabled]{opacity:.5;cursor:not-allowed;}' +
  '#as-funew{background:#fff;color:#01416e;}' +
  '.as-fubar .as-fucount{font-size:11px;color:#666;}' +
  '.as-res{background:#fff;border:2px solid #bfe9f4;border-left:6px solid #007cba;padding:11px 13px;margin-top:9px;}' +
  '.as-res .t{font-size:13px;font-weight:700;}' +
  '.as-res .r{font-size:11px;font-weight:700;color:#007cba;margin-top:2px;}' +
  '.as-res .sn{font-size:13.5px;line-height:1.55;color:#333;margin-top:6px;}' +
  '.as-res mark{background:#b1d887;padding:0 2px;}';

  var HTML = '' +
  '<div class="as-h"><span id="as-title">SEARCH THIS SECTION</span><button type="button" id="as-x" aria-label="Close">&times;</button></div>' +
  '<div class="as-b"><div class="as-wrap">' +
  '<textarea id="as-q" placeholder="Ask about this section" aria-label="Your question"></textarea>' +
  '<div class="as-modebar"><span class="as-mlbl">Match</span>' +
    '<div class="as-seg" id="as-seg" role="group" aria-label="Search mode">' +
      '<button type="button" data-mode="keywords" aria-pressed="true">Keywords</button>' +
      '<button type="button" data-mode="exact" aria-pressed="false">Exact</button>' +
      '<button type="button" data-mode="phrase" aria-pressed="false">Phrase</button>' +
    '</div><span class="as-mhelp" id="as-mhelp"></span></div>' +
  '<div class="as-row">' +
    '<button id="as-search" type="button">Offline Search</button>' +
    '<button id="as-clip" type="button" class="as-clip" title="Attach a screenshot">&#128206;</button>' +
    '<input type="file" id="as-file" accept="image/*" multiple style="display:none">' +
    '<button id="as-ask" type="button" title="Ask Pualani"><span class="disc"><img src="/assets/pualani-2001.png" alt=""></span><span class="lbl">Ask Pualani</span></button>' +
  '</div>' +
  '<div class="as-atts" id="as-atts"></div><div class="as-attnote" id="as-attnote"></div>' +
  '<div class="as-chips" id="as-chips"></div>' +
  '<div class="as-status" id="as-status"></div>' +
  '<div class="as-ans" id="as-ans"><h4>Pualani says</h4><div class="body" id="as-ansb"></div><div class="who" id="as-answ"></div>' +
    '<div class="as-fu" id="as-fu" style="display:none">' +
      '<textarea id="as-fuq" placeholder="Follow up on this answer" aria-label="Follow-up question"></textarea>' +
      '<div class="as-atts" id="as-fuatts"></div><div class="as-attnote" id="as-fuattnote"></div>' +
      '<div class="as-fubar"><button type="button" id="as-fuask">Ask follow-up</button>' +
      '<button type="button" id="as-fuclip" class="as-clip" title="Attach a screenshot">&#128206;</button>' +
      '<input type="file" id="as-fufile" accept="image/*" multiple style="display:none">' +
      '<button type="button" id="as-funew">New thread</button>' +
      '<span class="as-fucount" id="as-fucount"></span></div>' +
    '</div></div>' +
  '<div id="as-res"></div>' +
  '</div></div>';

  function load() {
    if (LOADING) return LOADING;
    // A failed load used to stay cached in LOADING, so one dropped packet
    // killed search for the life of the page. Clear it on failure and retry.
    LOADING = fetch('/corpus/' + KEY + '.json').then(function (r) {
      if (!r.ok) throw new Error('corpus ' + r.status);
      return r.json();
    }).then(function (j) {
      CORPUS = j; BM = buildBM(j.docs);
      el('as-title').textContent = (j.title || 'THIS SECTION').toUpperCase();
      return j;
    }).catch(function (e) { LOADING = null; throw e; });
    return LOADING;
  }
  function status(t) { el('as-status').textContent = t; }
  function chips() {
    var p = window.PortalSettings ? window.PortalSettings.profile() : { seat: 'CA', fleet: 'B787', base: 'HNL' };
    el('as-chips').innerHTML = '<span class="as-scope">' + esc(CORPUS ? CORPUS.title : 'this section') + ' only</span>' +
      '<span class="as-chip">' + p.seat + '</span><span class="as-chip">' + p.fleet + '</span><span class="as-chip">' + p.base + '</span>' +
      (p.state ? '<span class="as-chip">' + esc(p.state) + '</span>' : '') +
      ((p.years || p.years === 0) ? '<span class="as-chip">' + p.years + ' yr</span>' : '');
  }
  function render(hits) {
    var box = el('as-res'); box.innerHTML = '';
    if (!hits.length) { status(emptyMsg()); return; }
    status(hits.length + ' match' + (hits.length === 1 ? '' : 'es') + ' in ' + CORPUS.title +
      ' \u00b7 ' + MODES[MODE].label + (MODE === 'keywords' ? ', best first' : ' match') + '.');
    hits.forEach(function (h) {
      var d = document.createElement('div');
      d.className = 'as-res';
      d.innerHTML = '<div class="t">' + (h.lit ? hlLit(h.d.t, h.lit) : hl(h.d.t, h.terms)) + '</div>' +
        (h.d.r ? '<div class="r">' + esc(h.d.r) + '</div>' : '') +
        '<div class="sn">' + (h.lit
          ? hlLit(snipLit(h.d.x, h.lit), h.lit)
          : hl(snip(h.d.x, h.terms), h.terms)) + '</div>';
      box.appendChild(d);
    });
  }
  function emptyMsg() {
    var where = CORPUS ? CORPUS.title : 'this section';
    if (MODE === 'phrase') return 'That exact phrase is not in ' + where + '. Try Exact, or drop a word.';
    if (MODE === 'exact') return 'Nothing in ' + where + ' contains every one of those words. Try Keywords.';
    return 'Nothing in ' + where + ' matches that. This search only covers this section.';
  }
  function setMode(m, rerun) {
    if (!MODES[m]) m = 'keywords';
    MODE = m;
    lsSet('as787_assist_mode', m);
    var btns = el('as-seg').querySelectorAll('button');
    for (var i = 0; i < btns.length; i++) {
      btns[i].setAttribute('aria-pressed', btns[i].getAttribute('data-mode') === m ? 'true' : 'false');
    }
    el('as-mhelp').textContent = MODES[m].help;
    if (rerun && SEARCHED && el('as-q').value.trim()) doSearch();
  }

  function doSearch() {
    var q = el('as-q').value.trim();
    if (!q) { el('as-q').focus(); return; }
    el('as-ans').style.display = 'none';
    status('Searching...');
    SEARCHED = true;
    load().then(function () { chips(); render(runSearch(q, 10)); })
      .catch(function (e) { status('Section index unavailable: ' + e.message + '. Tick Make Available Offline in settings while you have signal.'); });
  }
  /* One thread holds the excerpts pulled for the opening question. Follow-ups
     add only the new question, so this section's text is sent once. */
  var THREAD = null, MAXTURNS = 12, BUSY = false;
  var ATT = { main: [], fu: [] };

  function cap() { var s = window.PortalSettings; return (s && s.MAX_IMAGES) || 4; }
  function paintAtts(which) {
    var box = el(which === 'fu' ? 'as-fuatts' : 'as-atts');
    var note = el(which === 'fu' ? 'as-fuattnote' : 'as-attnote');
    if (!box) return;
    var list = ATT[which];
    box.innerHTML = '';
    list.forEach(function (im, i) {
      var d = document.createElement('div');
      d.className = 'as-att';
      d.innerHTML = '<img src="' + im.url + '" alt="' + esc(im.name || 'attachment') + '"><button type="button" aria-label="Remove attachment">&times;</button>';
      d.querySelector('button').addEventListener('click', function () { list.splice(i, 1); paintAtts(which); });
      box.appendChild(d);
    });
    note.textContent = list.length ? list.length + ' image' + (list.length === 1 ? '' : 's') + ' attached. Max ' + cap() + '.' : '';
  }
  function addFiles(which, files) {
    var s = window.PortalSettings;
    if (!s || !s.prepImage) return;
    var list = ATT[which], room = cap() - list.length;
    var take = Array.prototype.slice.call(files).filter(function (f) { return /^image\//.test(f.type); }).slice(0, Math.max(0, room));
    if (!take.length) {
      if (room <= 0) el(which === 'fu' ? 'as-fuattnote' : 'as-attnote').textContent = 'That is the ' + cap() + ' image limit for one question.';
      return;
    }
    Promise.all(take.map(function (f) { return s.prepImage(f).catch(function () { return null; }); }))
      .then(function (out) { out.forEach(function (im) { if (im) list.push(im); }); paintAtts(which); });
  }
  function wireAttach(which, boxId, btnId, inputId) {
    var box = el(boxId), btn = el(btnId), inp = el(inputId);
    if (!box || !btn || !inp) return;
    btn.addEventListener('click', function () { inp.click(); });
    inp.addEventListener('change', function () { addFiles(which, inp.files); inp.value = ''; });
    box.addEventListener('paste', function (e) {
      var f = e.clipboardData && e.clipboardData.files;
      if (f && f.length) { e.preventDefault(); addFiles(which, f); }
    });
    ['dragenter', 'dragover'].forEach(function (t) { box.addEventListener(t, function (e) { e.preventDefault(); box.classList.add('as-drop'); }); });
    ['dragleave', 'drop'].forEach(function (t) { box.addEventListener(t, function (e) { e.preventDefault(); box.classList.remove('as-drop'); }); });
    box.addEventListener('drop', function (e) { if (e.dataTransfer && e.dataTransfer.files) addFiles(which, e.dataTransfer.files); });
  }
  function workingHTML(label) {
    return '<div class="as-working"><span class="as-dots"><i></i><i></i><i></i></span><span>' + esc(label) + '</span></div>';
  }

  function paintThread(pending) {
    if (!THREAD) return;
    var html = THREAD.turns.map(function (t) {
      return '<div class="turn"><div class="tq">' + esc(t.q) + '</div><div class="ta">' + t.a + '</div>' +
        (t.think ? '<details class="as-think"><summary>Show reasoning</summary><div class="as-tb">' + esc(t.think) + '</div></details>' : '') +
        '</div>';
    }).join('');
    if (pending) html += '<div class="turn"><div class="tq">' + esc(THREAD.pendingQ || '') + '</div><div class="ta">' + workingHTML(pending) + '</div></div>';
    el('as-ansb').innerHTML = html;
    var n = THREAD.turns.length, done = n > 0 && !pending;
    el('as-fu').style.display = done ? '' : 'none';
    if (done) {
      var left = MAXTURNS - n;
      el('as-fuask').disabled = left <= 0;
      el('as-fucount').textContent = left > 0
        ? left + ' follow-up' + (left === 1 ? '' : 's') + ' left in this thread'
        : 'Thread full. Start a new one.';
    }
  }

  function send() {
    BUSY = true;
    el('as-fuask').disabled = true;
    var S = window.PortalSettings;
    return S.askFull(THREAD.sys, THREAD.messages).then(function (res) {
      var body = (res.text || '').trim();
      THREAD.messages.push({ role: 'assistant', content: body || '(no answer)' });
      THREAD.turns.push({ q: THREAD.pendingQ, a: body ? renderAnswer(body) : '<p>' + esc(S.emptyReason(res)) + '</p>',
        think: (res.thinking || '').trim() });
      THREAD.pendingQ = null;
      paintThread();
    }).catch(function (e) {
      THREAD.messages.pop();           // never leave an unanswered question in the history
      THREAD.pendingQ = null;
      paintThread();
      var n = document.createElement('div');
      n.style.cssText = 'color:#8a1f1f;font-size:13px;margin-top:9px;';
      n.textContent = 'Could not reach the model. ' + (e && e.message ? e.message : '');
      el('as-ansb').appendChild(n);
      el('as-fu').style.display = THREAD.turns.length ? '' : 'none';
    }).then(function () { BUSY = false; el('as-fuask').disabled = THREAD.turns.length >= MAXTURNS; });
  }

  function followUp() {
    if (BUSY || !THREAD || !window.PortalSettings) return;
    var q = el('as-fuq').value.trim();
    if (!q || THREAD.turns.length >= MAXTURNS) { if (!q) el('as-fuq').focus(); return; }
    el('as-fuq').value = '';
    THREAD.pendingQ = q;
    var msg = { role: 'user', content: q };
    if (ATT.fu.length) { msg.images = ATT.fu.map(function (im) { return { mime: im.mime, b64: im.b64 }; }); ATT.fu = []; paintAtts('fu'); }
    THREAD.messages.push(msg);
    paintThread('Reading your question' + (msg.images ? ' and ' + msg.images.length + ' image' + (msg.images.length === 1 ? '' : 's') : '') + '...');
    send();
  }

  function newThread() {
    THREAD = null;
    el('as-ans').style.display = 'none';
    el('as-fu').style.display = 'none';
    el('as-fuq').value = '';
    ATT.fu = []; paintAtts('fu');
  }

  function ask() {
    var q = el('as-q').value.trim();
    if (!q) { el('as-q').focus(); return; }
    if (!window.PortalSettings) { status('Settings are not loaded on this page.'); return; }
    if (!window.PortalSettings.ready()) { status('Add an API key and pick a model in settings first.'); window.PortalSettings.open(); return; }
    status('');
    load().then(function () {
      status('');
      chips();
      // Ask always uses the keyword engine. The literal modes are for finding a
      // known string, and starving the model of context to honour them is worse
      // than a wide read. The mode control governs Offline Search only.
      var hits = search(q, 8);
      var shownMode = MODE; MODE = 'keywords';
      render(hits);
      MODE = shownMode;
      if (!hits.length) return;
      var p = window.PortalSettings.profile();
      var today = new Date().toISOString().slice(0, 10);
      var who = p.seat + ' on the B787 at Alaska/Hawaiian, resident of ' + (p.state || 'an unstated state') +
        ' with tax assumptions the pilot set of ' + (p.stateRate || 0) + '% state and ' + (p.fedRate || 35) +
        '% federal for pay math only, domiciled ' + p.base +
        (p.doh ? ', date of hire ' + p.doh + ', which is ' + p.years + ' years ' + p.months +
          ' months of service as of today, next longevity anniversary ' + p.next : '');
      var sys = 'Today is ' + today + '. You answer questions for a ' + who + '. ' +
        'When a provision depends on longevity or years of service, apply the years above and say which band you used. ' +
        'Never state a pay rate or a longevity step that is not in the excerpts. ' +
        'You are scoped to ONE section of a study portal: ' + CORPUS.title + '. ' +
        'Use ONLY the excerpts provided. Never use other aviation knowledge. Never invent a reference or a number. ' +
        'ANSWER IN TLDR FORMAT: line 1 is the bottom line in one sentence under 20 words, then 2 to 5 one-line bullets under 18 words each, ' +
        'each bullet ending with its reference in parentheses. No preamble, no closing summary, no em dashes, no run-on sentences. ' +
        'Numbers carry units and the condition they apply to. ' +
        'If the excerpts do not settle it, line 1 is: Not in this section. Then one bullet saying where to look.';
      var ctx = hits.map(function (h, i) {
        return '[' + (i + 1) + '] ' + h.d.t + (h.d.r ? ' (' + h.d.r + ')' : '') + '\n' + h.d.x.slice(0, 2600);
      }).join('\n\n');
      var user = 'Question: ' + q + '\n\nExcerpts from ' + CORPUS.title +
        '. Later questions in this conversation refer back to these same excerpts:\n\n' + ctx;
      if (ATT.main.length) {
        sys += ' The user attached ' + ATT.main.length + ' image' + (ATT.main.length === 1 ? '' : 's') +
          ' of their own documents. Treat those images as authoritative for the user\'s own figures, ' +
          'keep using ONLY the excerpts for section content, and cite an image figure as (from your image).';
      }
      var first = { role: 'user', content: user };
      if (ATT.main.length) { first.images = ATT.main.map(function (im) { return { mime: im.mime, b64: im.b64 }; }); ATT.main = []; paintAtts('main'); }
      THREAD = { sys: sys, messages: [first], turns: [], pendingQ: q };
      el('as-ans').style.display = 'block';
      el('as-fu').style.display = 'none';
      el('as-ansb').innerHTML = workingHTML('Reading ' + CORPUS.title + '...');
      el('as-answ').textContent = window.PortalSettings.modelLabel() + ' · ' + CORPUS.title + ' only · ' +
        p.seat + ' · B787 · ' + p.base + (p.longevity ? ' · ' + p.longevity : '');
      send();
    }).catch(function (e) {
      // Without this the button did nothing at all when the corpus failed:
      // no spinner, no message, just an unhandled rejection in the console.
      status('Could not load this section. ' + (e && e.message ? e.message : ''));
    });
  }
  function togglePanel(on) {
    var p = el('as-panel');
    var open = on === undefined ? !p.classList.contains('on') : on;
    p.classList.toggle('on', open);
    if (open) { load().then(chips).catch(function () {}); el('as-q').focus(); }
  }
  function updateAsk() {
    el('as-ask').style.display = navigator.onLine ? '' : 'none';
  }
  function mount() {
    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    var b = document.createElement('button');
    b.id = 'as-launch'; b.type = 'button';
    b.innerHTML = '<img src="/assets/pualani-2001.png" alt=""><span>Search this section</span>';
    document.body.appendChild(b);
    var p = document.createElement('div'); p.id = 'as-panel'; p.innerHTML = HTML;
    document.body.appendChild(p);
    b.addEventListener('click', function () { togglePanel(); });
    el('as-x').addEventListener('click', function () { togglePanel(false); });
    el('as-seg').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-mode]');
      if (b) setMode(b.getAttribute('data-mode'), true);
    });
    setMode(lsGet('as787_assist_mode', 'keywords'), false);
    el('as-search').addEventListener('click', doSearch);
    el('as-ask').addEventListener('click', ask);
    wireAttach('main', 'as-q', 'as-clip', 'as-file');
    wireAttach('fu', 'as-fuq', 'as-fuclip', 'as-fufile');
    paintAtts('main'); paintAtts('fu');
    el('as-fuask').addEventListener('click', followUp);
    el('as-funew').addEventListener('click', function () { newThread(); el('as-q').focus(); });
    // Keys typed inside the widget belong to the widget. Pages like triggers,
    // flows and the quizzes bind Space, K and R to document, so without this a
    // space bar in the question box advances the card instead of typing.
    function inWidget(t) {
      if (!t || !t.closest || !t.closest('#as-panel')) return false;   // covers #as-q and #as-fuq
      var tag = (t.tagName || '').toUpperCase();
      return tag === 'INPUT' || tag === 'TEXTAREA' || t.isContentEditable === true;
    }
    ['keydown', 'keypress', 'keyup'].forEach(function (type) {
      window.addEventListener(type, function (e) {
        if (!inWidget(e.target)) return;
        if (type === 'keydown') {
          if (e.key === 'Escape') { e.preventDefault(); togglePanel(false); }
          else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); doSearch(); }
        }
        e.stopPropagation();
      }, true);
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') togglePanel(false); });
    window.addEventListener('portalsettings:ready', function () { if (CORPUS) chips(); });
    window.addEventListener('online', updateAsk);
    window.addEventListener('offline', updateAsk);
    updateAsk();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
