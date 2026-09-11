/* Shared portal settings: gear button, one modal for profile, AI keys and offline downloads.
   Mounts into #gearSlot only. That slot exists on the portal home page footer,
   so subpages carry no gear and inherit the same saved settings.
   Exposes window.PortalSettings for other scripts (assist.js). */
(function () {
  'use strict';
  if (window.PortalSettings) return;

  var TAX_SRC = 'Tax Foundation, top marginal rates effective 1 Jan 2026';
  // Bump this every deploy. It is the only way to tell from inside the browser
  // whether you are looking at current code or a cached copy.
  var BUILD = 'v2.36';

  var LS = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) {} }
  };

  var PROV = {
    claude: { name: 'Claude', hint: 'sk-ant-... from console.anthropic.com',
      models: function (k) { return fetch('https://api.anthropic.com/v1/models?limit=100', { headers: hdr(k) }).then(j).then(function (r) { return (r.data || []).map(function (m) { return m.id; }); }); },
      ask: function (k, model, sys, msgs) {
        // The first user turn carries the retrieved manual text and never changes
        // for the life of a thread, so it is the cache anchor. The breakpoint goes
        // on the LAST block of that message, which is the text block, so attached
        // images sit inside the cached prefix rather than after it.
        var out = msgs.map(function (m, i) {
          var anchor = (i === 0 && m.role === 'user');
          if (!anchor && !(m.images && m.images.length)) return { role: m.role, content: m.content };
          var blocks = (m.images || []).map(function (im) {
            return { type: 'image', source: { type: 'base64', media_type: im.mime, data: im.b64 } };
          });
          var textBlock = { type: 'text', text: m.content };
          if (anchor) textBlock.cache_control = { type: 'ephemeral' };
          blocks.push(textBlock);
          return { role: m.role, content: blocks };
        });
        // 1200 was the old ceiling. Fable 5.1 thinks adaptively and those tokens
        // count against max_tokens, so a long answer spent the whole budget
        // reasoning and returned a thinking block with no text at all.
        return fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: hdr(k, 1),
          body: JSON.stringify({ model: model, max_tokens: 8000, system: sys, messages: out }) })
          .then(j).then(function (r) {
            var c = r.content || [];
            // The thinking field name is not pinned down in the docs for adaptive
            // thinking, so take whichever of these the block actually carries.
            var think = c.filter(function (b) { return b.type === 'thinking' || b.type === 'redacted_thinking'; })
              .map(function (b) { return b.thinking || b.summary || b.text || ''; }).join('\n').trim();
            return { text: c.filter(function (b) { return b.type === 'text'; }).map(function (b) { return b.text; }).join('\n'),
              thinking: think, stop: r.stop_reason || '', usage: r.usage || null };
          });
      } },
    openai: { name: 'ChatGPT', hint: 'sk-... from platform.openai.com',
      models: function (k) { return fetch('https://api.openai.com/v1/models', { headers: { Authorization: 'Bearer ' + k } }).then(j).then(function (r) { return (r.data || []).map(function (m) { return m.id; }).sort(); }); },
      ask: function (k, model, sys, msgs) { return chat('https://api.openai.com/v1/chat/completions', { Authorization: 'Bearer ' + k }, model, sys, msgs); } },
    gemini: { name: 'Gemini', hint: 'key from aistudio.google.com',
      models: function (k) { return fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', { headers: { 'x-goog-api-key': k } }).then(j)
        .then(function (r) { return (r.models || []).filter(function (m) { return (m.supportedGenerationMethods || []).indexOf('generateContent') >= 0; }).map(function (m) { return m.name.replace(/^models\//, ''); }); }); },
      ask: function (k, model, sys, msgs) {
        var contents = msgs.map(function (m) {
          var parts = [{ text: m.content }];
          (m.images || []).forEach(function (im) { parts.push({ inlineData: { mimeType: im.mime, data: im.b64 } }); });
          return { role: m.role === 'assistant' ? 'model' : 'user', parts: parts };
        });
        return fetch('https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent',
          { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': k },
            body: JSON.stringify({ systemInstruction: { parts: [{ text: sys }] }, contents: contents }) })
          .then(j).then(function (r) {
            var c = r.candidates && r.candidates[0];
            if (!c) return { text: '', thinking: '', stop: '', usage: null };
            var parts = c.content && c.content.parts || [];
            return { text: parts.filter(function (p) { return !p.thought; }).map(function (p) { return p.text || ''; }).join(''),
              thinking: parts.filter(function (p) { return p.thought; }).map(function (p) { return p.text || ''; }).join('\n'),
              stop: c.finishReason || '', usage: r.usageMetadata || null };
          });
      } },
    grok: { name: 'Grok', hint: 'xai-... from console.x.ai',
      models: function (k) { return fetch('https://api.x.ai/v1/models', { headers: { Authorization: 'Bearer ' + k } }).then(j).then(function (r) { return (r.data || []).map(function (m) { return m.id; }).sort(); }); },
      ask: function (k, model, sys, msgs) { return chat('https://api.x.ai/v1/chat/completions', { Authorization: 'Bearer ' + k }, model, sys, msgs); } }
  };
  function hdr(k, post) {
    var h = { 'x-api-key': k, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' };
    if (post) h['content-type'] = 'application/json';
    return h;
  }
  function chat(url, extra, model, sys, msgs) {
    var h = { 'content-type': 'application/json' };
    for (var k in extra) h[k] = extra[k];
    var out = [{ role: 'system', content: sys }].concat(msgs.map(function (m) {
      if (!(m.images && m.images.length)) return { role: m.role, content: m.content };
      var parts = [{ type: 'text', text: m.content }];
      m.images.forEach(function (im) {
        parts.push({ type: 'image_url', image_url: { url: 'data:' + im.mime + ';base64,' + im.b64 } });
      });
      return { role: m.role, content: parts };
    }));
    return fetch(url, { method: 'POST', headers: h, body: JSON.stringify({ model: model, max_tokens: 8000, messages: out }) })
      .then(j).then(function (r) {
        var c = r.choices && r.choices[0];
        return { text: (c && c.message && c.message.content) || '', thinking: (c && c.message && c.message.reasoning_content) || '',
          stop: (c && c.finish_reason) || '', usage: r.usage || null };
      });
  }
  function j(r) {
    return r.text().then(function (t) {
      var o; try { o = JSON.parse(t); } catch (e) { throw new Error('HTTP ' + r.status + ': ' + t.slice(0, 160)); }
      if (!r.ok) throw new Error((o.error && (o.error.message || o.error.status)) || o.message || ('HTTP ' + r.status));
      return o;
    });
  }

  var CSS = '' +
  '.ps-logbtn{display:inline-flex;align-items:center;gap:8px;background:#eaf7db;border:2px solid #b1d887;color:#4a7a1f;font-family:inherit;font-size:13px;font-weight:700;padding:7px 13px;border-radius:8px;cursor:pointer;}' +
  '.ps-logbtn:hover{background:#b1d887;color:#2f4f12;}' +
  '.ps-logbtn svg{color:#7fb440;}' +
  '.ps-logbtn:hover svg{color:#2f4f12;}' +
  '.ps-log{font-size:12px;color:#01416e;max-height:240px;overflow:auto;margin-top:8px;}' +
  '.ps-log table{border-collapse:collapse;width:100%;}' +
  '.ps-log th{text-align:left;background:#01416e;color:#fff;padding:3px 7px;font-size:11px;position:sticky;top:0;}' +
  '.ps-log td{padding:3px 7px;border-bottom:1px solid #bfe9f4;}' +
  '.ps-log .me{font-weight:700;}' +
  // Phone-only sizing. Applies everywhere because this file loads on every
  // page. Desktop and iPad are deliberately untouched.
  '@media (max-width:600px){' +
    // 16px stops iOS zooming the page on focus, which otherwise leaves it
    // horizontally scrollable until the user pinches back.
    'input[type="text"],input[type="email"],input[type="search"],input[type="number"],input[type="password"],input[type="date"],select,textarea{font-size:16px !important;}' +
    // 44px is the iOS minimum. These are the nav and filter controls the audit
    // measured at 24 to 36px.
    '.filter-btn,.gamebtn,.srcbtn,.catbtn,.navbtn,.btn,a.btn,button.btn,a.back,.portal-back,.reset-link,.bar a,.bar button,.mini,.ps-mini{' +
      'min-height:44px !important;display:inline-flex !important;align-items:center !important;justify-content:center !important;}' +
    '.ps-home{width:44px !important;height:44px !important;}' +
  '}' +
  '.ps-gear{background:none;border:none;color:#7d99ac;font-size:28px;line-height:1;cursor:pointer;padding:2px 6px;border-radius:8px;transition:color .12s,background .12s,transform .25s;}' +
  '.ps-gear:hover{color:#01416e;background:#bfe9f4;transform:rotate(60deg);}' +
  '.ps-ovl{position:fixed;inset:0;background:rgba(1,23,43,.72);display:none;align-items:center;justify-content:center;padding:14px;z-index:10000;}' +
  '.ps-ovl.on{display:flex;}' +
  '.ps-modal{background:#fff;color:#01416e;border:2px solid #01416e;width:100%;max-width:560px;max-height:88vh;display:flex;flex-direction:column;font-family:"Segoe UI",Arial,Helvetica,sans-serif;}' +
  '.ps-mh{display:flex;justify-content:space-between;align-items:center;background:#01416e;color:#b1d887;padding:11px 14px;font-size:13px;font-weight:700;letter-spacing:.05em;}' +
  '.ps-mh button{background:none;border:none;color:#bfe9f4;font-size:22px;line-height:1;cursor:pointer;}' +
  '.ps-mb{overflow:auto;padding:14px 16px 20px;}' +
  '.ps-h3{margin:16px 0 8px;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#01416e;border-top:2px solid #bfe9f4;padding-top:12px;}' +
  '.ps-h3:first-child{margin-top:0;border-top:none;padding-top:0;}' +
  '.ps-f{display:flex;flex-direction:column;gap:5px;margin-bottom:11px;}' +
  '.ps-f label{font-size:12px;font-weight:700;}' +
  '.ps-f input,.ps-f select{padding:9px;border:2px solid #bfe9f4;border-radius:5px;font-family:inherit;font-size:13px;}' +
  '.ps-f input:focus,.ps-f select:focus{outline:none;border-color:#007cba;}' +
  '.ps-row{display:flex;gap:6px;}.ps-row input,.ps-row select{flex:1;min-width:0;}' +
  '.ps-mini{background:#bfe9f4;border:none;border-radius:5px;padding:0 11px;font-size:11px;font-weight:700;color:#01416e;cursor:pointer;font-family:inherit;}' +
  '.ps-mini:hover{background:#00b2d6;color:#fff;}' +
  '.ps-seg{display:inline-flex;border:2px solid #01416e;border-radius:999px;overflow:hidden;align-self:flex-start;}' +
  '.ps-seg button{font-family:inherit;font-size:13px;font-weight:700;background:#fff;color:#01416e;border:none;padding:8px 20px;cursor:pointer;}' +
  '.ps-seg button+button{border-left:2px solid #01416e;}' +
  '.ps-seg button[aria-pressed="true"]{background:#01416e;color:#fff;}' +
  '.ps-ck{display:flex;align-items:flex-start;gap:10px;cursor:pointer;font-size:14px;font-weight:700;padding:6px 0;}' +
  '.ps-ck input{width:20px;height:20px;margin-top:1px;accent-color:#01416e;flex:none;}' +
  '.ps-ck small{display:block;font-size:12px;font-weight:400;color:#555;margin-top:3px;line-height:1.5;}' +
  '.ps-ck.off{opacity:.45;cursor:not-allowed;}' +
  '.ps-bar{height:8px;background:#bfe9f4;border-radius:4px;overflow:hidden;margin:8px 0 4px;display:none;}' +
  '.ps-bar i{display:block;height:100%;width:0;background:#b1d887;transition:width .2s;}' +
  '.ps-note{font-size:11px;color:#666;line-height:1.5;}' +
  '.ps-msg{font-size:12px;color:#555;min-height:16px;line-height:1.5;}';

  // Original log-sheet mark, drawn here so the portal needs no image file.
  var LOGICON = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">' +
    '<path d="M5 3.2h9.2L19 8v12.8H5z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>' +
    '<path d="M14 3.2V8h5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>' +
    '<path d="M8 11.4h8M8 14.2h8M8 17h5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>' +
    '</svg>';

  var HTML = '' +
  '<div class="ps-modal">' +
  '<div class="ps-mh"><span>PORTAL SETTINGS</span><button type="button" id="psX" aria-label="Close">&times;</button></div>' +
  '<div class="ps-mb">' +
    '<div class="ps-h3">Your profile</div>' +
    '<div class="ps-f"><label>Seat</label><div class="ps-seg" id="psSeat"><button type="button" data-v="CA">CA</button><button type="button" data-v="FO">FO</button></div></div>' +
    '<div class="ps-f"><label>Domicile</label><div class="ps-seg" id="psBase"><button type="button" data-v="HNL">HNL</button><button type="button" data-v="SEA">SEA</button></div></div>' +
    '<div class="ps-f"><label for="psDOH">Date of hire</label><input id="psDOH" type="date" min="1960-01-01"><span class="ps-note" id="psLong"></span></div>' +
    '<p class="ps-note">Fleet is B787. Every question carries this profile and your longevity as of today.</p>' +
    '<div class="ps-h3">Tax assumptions</div>' +
    '<div class="ps-f"><label for="psState">State of residence</label><select id="psState"></select></div>' +
    '<p class="ps-note">Residence, not domicile. Under 49 USC 40116(f) an air carrier employee with duties in two or more states is taxed only by their state of residence, or by a state holding more than 50% of their scheduled flight time for the year.</p>' +
    '<div class="ps-f"><label for="psStateRate">State effective rate</label><div class="ps-row">' +
      '<input id="psStateRate" type="number" min="0" max="20" step="0.01" inputmode="decimal">' +
      '<button class="ps-mini" id="psStateReset" type="button">Reset</button></div>' +
      '<span class="ps-note" id="psStateNote"></span></div>' +
    '<div class="ps-f"><label for="psFed">Federal effective rate <span id="psFedVal"></span></label>' +
      '<input id="psFed" type="range" min="0" max="50" step="0.5"></div>' +
    '<p class="ps-note">Seeded from ' + TAX_SRC + '. Those are top marginal rates, which are higher than the effective rate you actually pay. Replace both with your real effective rates from your return for accurate net-pay math.</p>' +
    '<div class="ps-h3">Build</div>' +
    '<div class="ps-f"><label for="psBuild">Running</label><div class="ps-row">' +
      '<input id="psBuild" type="text" readonly>' +
      '<button class="ps-mini" id="psRefresh" type="button">Force refresh</button></div>' +
      '<span class="ps-note" id="psRefreshNote">Deletes every cache, unregisters the service worker, re-fetches the code and reloads. Use it after a deploy, or when the portal looks like the old version.</span></div>' +
    '<div class="ps-h3">Ask Pualani</div>' +
    '<div class="ps-f"><label for="psProv">Answer with</label><select id="psProv">' +
      '<option value="claude">Claude (Anthropic)</option><option value="openai">ChatGPT (OpenAI)</option>' +
      '<option value="gemini">Gemini (Google)</option><option value="grok">Grok (xAI)</option></select></div>' +
    '<div class="ps-f"><label id="psKeyLbl" for="psKey">API key</label><div class="ps-row">' +
      '<input id="psKey" type="password" autocomplete="off" spellcheck="false" placeholder="paste your key">' +
      '<button class="ps-mini" id="psSave" type="button">Save</button><button class="ps-mini" id="psForget" type="button">Forget</button>' +
      '</div><span class="ps-note" id="psKeyNote"></span></div>' +
    '<div class="ps-f"><label for="psModel">Model</label><div class="ps-row">' +
      '<select id="psModel"><option value="">load models with your key</option></select>' +
      '<button class="ps-mini" id="psLoad" type="button">Load</button></div></div>' +
    '<p class="ps-note">Keys stay in this browser on this device. They go straight to the provider, never to as787pilot.app.</p>' +
    '<div class="ps-h3">Offline</div>' +
    '<label class="ps-ck" id="psLblCore"><input type="checkbox" id="psCore"><span>Make Available Offline' +
      '<small>Every page, quiz, question bank, handout and the full PWA PDF. About 22 MB.</small></span></label>' +
    '<div class="ps-bar" id="psBarCore"><i id="psFillCore"></i></div>' +
    '<label class="ps-ck off" id="psLblAudio"><input type="checkbox" id="psAudio" disabled><span>Include podcast audio' +
      '<small>All 83 episodes of Flight Deck Notes plus the SFTD briefing. About 566 MB. Do this on wifi.</small></span></label>' +
    '<div class="ps-bar" id="psBarAudio"><i id="psFillAudio"></i></div>' +
    '<div class="ps-msg" id="psMsg"></div>' +
    '<div id="psLogWrap" style="display:none">' +
      '<div class="ps-h3">Portal log</div>' +
      '<div class="ps-f"><button class="ps-logbtn" id="psLogBtn" type="button" title="Unlock log" aria-label="Unlock log">' + LOGICON + '<span>Unlock log</span></button></div>' +
      '<div class="ps-f" id="psLogKeyF" style="display:none"><button class="ps-mini" id="psLogForget" type="button">Forget read key on this device</button></div>' +
      '<div class="ps-log" id="psLogOut"></div>' +
    '</div>' +
  '</div></div>';

  /* Top marginal individual income tax rates, Tax Foundation, effective
     1 Jan 2026. Two deliberate departures from that source, because this app
     computes W-2 wages: WA is listed at 9.00 there but that tax reaches capital
     gains only, and NH taxes no wage income. Both are 0 here.
     A top marginal rate is NOT an effective rate. It seeds the field and the
     pilot is expected to replace it with their real effective rate. */
  var STATES = {
    AL: 5.00, AK: 0, AZ: 2.50, AR: 3.90, CA: 13.30, CO: 4.40, CT: 6.99, DE: 6.60,
    DC: 10.75, FL: 0, GA: 5.19, HI: 11.00, ID: 5.30, IL: 4.95, IN: 2.95, IA: 3.80,
    KS: 5.58, KY: 3.50, LA: 3.00, ME: 7.15, MD: 6.50, MA: 9.00, MI: 4.25, MN: 9.85,
    MS: 4.00, MO: 4.70, MT: 5.65, NE: 4.55, NV: 0, NH: 0, NJ: 10.75, NM: 5.90,
    NY: 10.90, NC: 3.99, ND: 2.50, OH: 2.75, OK: 4.50, OR: 9.90, PA: 3.07, RI: 5.99,
    SC: 6.00, SD: 0, TN: 0, TX: 0, UT: 4.50, VT: 8.75, VA: 5.75, WA: 0, WV: 4.82,
    WI: 7.65, WY: 0
  };
  function fillStates(selEl, sel) {
    if (!selEl || selEl.options.length) return;
    selEl.innerHTML = Object.keys(STATES).sort().map(function (k) {
      return '<option value="' + k + '">' + k + ' (' + STATES[k].toFixed(2) + '%)</option>';
    }).join('');
    selEl.value = sel;
  }

  function el(id) { return document.getElementById(id); }
  var ovl, mounted = false;
  var PROFILE = { seat: LS.get('pwa_seat', 'CA'), fleet: 'B787', base: LS.get('pwa_base', 'HNL'),
    doh: LS.get('pwa_doh', '2011-10-05'),
    state: LS.get('pwa_state', 'NV'),
    stateRate: LS.get('pwa_state_rate', ''),
    fedRate: LS.get('pwa_fed_rate', '35') };
  function stateRateNum() {
    var v = parseFloat(PROFILE.stateRate);
    return isNaN(v) ? (STATES[PROFILE.state] || 0) : v;
  }
  function fedRateNum() {
    var v = parseFloat(PROFILE.fedRate);
    return isNaN(v) ? 35 : v;
  }

  function longevity(doh) {
    if (!doh) return null;
    var d = new Date(doh + 'T00:00:00'), now = new Date();
    if (isNaN(d.getTime()) || d > now) return null;
    var y = now.getFullYear() - d.getFullYear();
    var m = now.getMonth() - d.getMonth();
    var day = now.getDate() - d.getDate();
    if (day < 0) m--;
    if (m < 0) { y--; m += 12; }
    var next = new Date(d.getTime());
    next.setFullYear(d.getFullYear() + y + 1);
    return { years: y, months: m, next: next.toISOString().slice(0, 10) };
  }
  function longText() {
    var L = longevity(PROFILE.doh);
    if (!L) return '';
    return L.years + ' yr ' + L.months + ' mo of service, next anniversary ' + L.next;
  }

  function paintProfile() {
    var dohEl = el('psDOH');
    if (dohEl) { dohEl.value = PROFILE.doh || ''; el('psLong').textContent = longText(); }
    var st = el('psState');
    if (st) {
      fillStates(st, PROFILE.state);
      st.value = PROFILE.state;
      el('psStateRate').value = stateRateNum().toFixed(2);
      el('psFed').value = fedRateNum();
      el('psFedVal').textContent = fedRateNum().toFixed(1) + '%';
      var seeded = STATES[PROFILE.state];
      el('psStateNote').textContent = seeded === 0
        ? PROFILE.state + ' levies no tax on wage income.'
        : (PROFILE.stateRate === '' ? 'Seeded at the ' + PROFILE.state + ' top marginal rate. Edit it.' : 'Your value, not the table.');
    }
    [['psSeat', 'seat'], ['psBase', 'base']].forEach(function (p) {
      [].forEach.call(el(p[0]).querySelectorAll('button'), function (b) {
        b.setAttribute('aria-pressed', b.getAttribute('data-v') === PROFILE[p[1]] ? 'true' : 'false');
      });
    });
  }
  function curProv() { return el('psProv').value; }
  function keyName(p) { return 'pwa_key_' + p; }
  function modelName(p) { return 'pwa_model_' + p; }
  function realKey() {
    var typed = el('psKey').value.trim();
    if (typed && typed.indexOf('____') !== 0) return typed;
    return LS.get(keyName(curProv()), '');
  }
  function syncProv() {
    var p = curProv(), cfg = PROV[p];
    el('psKeyLbl').textContent = cfg.name + ' API key';
    el('psKeyNote').textContent = cfg.hint;
    var saved = LS.get(keyName(p), '');
    el('psKey').value = saved ? '________________' : '';
    el('psKey').placeholder = saved ? 'saved on this device' : 'paste your key';
    var sel = el('psModel'), m = LS.get(modelName(p), '');
    sel.innerHTML = '';
    var o = document.createElement('option');
    o.value = m; o.textContent = m || 'load models with your key';
    sel.appendChild(o);
    LS.set('pwa_provider', p);
  }
  function msg(t) { el('psMsg').textContent = t; }

  /* ---- offline tier control, shared by every page ---- */
  var reg = null, busy = false;
  function send(m) { if (reg && reg.active) reg.active.postMessage(m); }
  function mb(b) { return (b / 1048576).toFixed(b > 104857600 ? 0 : 1) + ' MB'; }
  function setBar(t, done, total) {
    el('psBar' + t).style.display = total ? 'block' : 'none';
    el('psFill' + t).style.width = total ? Math.round(done / total * 100) + '%' : '0';
  }
  function wireOffline() {
    if (!('serviceWorker' in navigator)) { msg('Offline mode is not available in this browser.'); return; }
    navigator.serviceWorker.register('/sw.js').then(function () { return navigator.serviceWorker.ready; })
      .then(function (r) {
        reg = r;
        if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () {});
        el('psCore').checked = LS.get('as787_off_core') === '1';
        el('psAudio').checked = LS.get('as787_off_audio') === '1';
        el('psAudio').disabled = !el('psCore').checked;
        el('psLblAudio').classList.toggle('off', !el('psCore').checked);
        send({ type: 'STATUS' });
      }).catch(function () { msg('Offline mode could not start.'); });

    navigator.serviceWorker.addEventListener('message', function (ev) {
      var d = ev.data || {};
      if (d.type === 'PROGRESS') {
        setBar(d.tier === 'audio' ? 'Audio' : 'Core', d.done, d.total);
        msg('Downloading ' + (d.tier === 'audio' ? 'podcasts' : 'the portal') + ': ' + d.done + ' of ' + d.total + ', ' + mb(d.bytes) + ' so far.');
      }
      if (d.type === 'DONE') {
        setBar(d.tier === 'audio' ? 'Audio' : 'Core', 0, 0); busy = false;
        if (d.error === 'offline') {
          // The worker could not even fetch the manifest. Untick rather than
          // leaving the box claiming a download that never happened.
          var box = d.tier === 'audio' ? el('psAudio') : el('psCore');
          if (box) box.checked = false;
          LS.set(d.tier === 'audio' ? 'as787_off_audio' : 'as787_off_core', '0');
          msg('No connection, so nothing could be saved. Try again when you have signal.');
          return;
        }
        LS.set(d.tier === 'audio' ? 'as787_off_audio' : 'as787_off_core', '1');
        var f = (d.failed && d.failed.length) || 0;
        msg((d.tier === 'audio' ? 'Podcasts' : 'Portal') + ' saved offline: ' + (d.total - f) + ' of ' + d.total + ' files, ' + mb(d.bytes) + '.' +
          (f ? ' ' + f + ' could not be fetched, tick again to retry.' : ''));
        if (d.tier !== 'audio') { el('psAudio').disabled = false; el('psLblAudio').classList.remove('off'); }
      }
      if (d.type === 'CLEARED') {
        busy = false; LS.set(d.tier === 'audio' ? 'as787_off_audio' : 'as787_off_core', '0');
        msg((d.tier === 'audio' ? 'Podcast audio' : 'Offline copy') + ' removed from this device.');
        if (d.tier !== 'audio') { el('psAudio').checked = false; el('psAudio').disabled = true; el('psLblAudio').classList.add('off'); LS.set('as787_off_audio', '0'); }
      }
      if (d.type === 'STATUS' && d.totals) {
        if (d.cached.core > 0 && d.cached.core >= d.totals.core - 2) msg('Portal is saved offline. Podcasts: ' + d.cached.audio + ' of ' + d.totals.audio + ' audio files.');
        else if (d.cached.core > 0) msg('Partial offline copy: ' + d.cached.core + ' of ' + d.totals.core + ' files. Tick again to finish.');
      }
    });
  }

  function mount() {
    if (mounted) return;
    mounted = true;
    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    ovl = document.createElement('div'); ovl.className = 'ps-ovl'; ovl.innerHTML = HTML;
    document.body.appendChild(ovl);

    // One uniform home icon on every subpage. The pages carry it themselves;
    // this is the safety net for any page that was missed or that predates it.
    // Old floating pills sat at position:fixed over the headings, so they go.
    (function homeIcon() {
      var here = location.pathname.split('/').pop() || 'index.html';
      if (here === 'index.html') return;

      var LABEL = /^(?:\u25c0|\u25b6)?\s*(?:B787\s+)?(?:STUDY\s+)?PORTAL(?:\s*(?:\u25c0|\u25b6))?$|^HOME$/i;
      [].slice.call(document.querySelectorAll('a[href]')).forEach(function (a) {
        if (a.classList.contains('ps-home')) return;
        var href = (a.getAttribute('href') || '').split('#')[0].split('?')[0];
        if (!/(^|\/)index\.html$/i.test(href)) return;
        var txt = (a.textContent || '').replace(/\s+/g, ' ').trim();
        if (!LABEL.test(txt)) return;
        var wrap = a.parentNode, st = wrap && wrap.getAttribute && (wrap.getAttribute('style') || '');
        if (st && /position\s*:\s*fixed/.test(st) && wrap.children.length === 1 && wrap.parentNode) {
          wrap.parentNode.removeChild(wrap);
        } else if (a.parentNode) {
          a.parentNode.removeChild(a);
        }
      });

      if (document.querySelector('.ps-home')) return;
      var css = document.createElement('style');
      css.textContent =
        '.ps-homebar{align-self:stretch;width:100%;box-sizing:border-box;padding:8px 0 0 10px;flex:0 0 auto;text-align:left;}' +
        '.ps-home{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:9px;' +
        'background:#fff;border:2px solid #01416e;color:#01416e;text-decoration:none;box-shadow:0 1px 4px rgba(1,23,43,.2);' +
        'transition:background .12s,color .12s;-webkit-tap-highlight-color:transparent;}' +
        '.ps-home:hover,.ps-home:focus-visible{background:#01416e;color:#fff;}' +
        '.ps-home:focus{outline:none;}' +
        '.ps-home svg{display:block;}' +
        '@media (max-width:480px){.ps-homebar{padding:6px 0 0 8px;}.ps-home{width:40px;height:40px;}}';
      document.head.appendChild(css);

      var bar = document.createElement('div');
      bar.className = 'ps-homebar';
      bar.innerHTML = '<a class="ps-home" href="/index.html" title="B787 Study Portal" aria-label="B787 Study Portal">' +
        '<svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true" focusable="false">' +
        '<path d="M3 11.3 12 4l9 7.3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<path d="M5.7 10.1v9.4h12.6v-9.4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<path d="M10 19.5v-5.1h4v5.1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
        '</svg></a>';
      document.body.insertBefore(bar, document.body.firstChild);
    })();

    // ---- unlock log ----
    // Every visitor queues their unlock in index.html. This flushes the queue to
    // the collector. Writes need no key. Reading the log back does, and that key
    // is only ever entered on the owner's own device.
    var LOG_URL = 'https://script.google.com/macros/s/AKfycbyrHlq0FrUwA2CtCHBo3dGB_CjZaR-igFntcR9nVBGWF84MrLK0VKW6UdCFpyUHVNdN2w/exec';
    var OWNER = 'ryan.pettit@alaskaair.com';

    function myEmail() { try { return (localStorage.getItem('as787_email') || '').toLowerCase(); } catch (e) { return ''; } }

    function flushLog() {
      if (!LOG_URL || !navigator.onLine) return;
      var q;
      try { q = JSON.parse(localStorage.getItem('as787_log_queue') || '[]'); } catch (e) { return; }
      if (!q.length) return;
      fetch(LOG_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ rows: q, ua: navigator.userAgent })
      }).then(function () {
        // The collector deduplicates on timestamp + email, so clearing here is
        // safe even when Apps Script answers the POST with a 404 redirect after
        // already writing the row. Only a network failure keeps the queue.
        try { localStorage.setItem('as787_log_queue', '[]'); } catch (e) {}
      }).catch(function () {});
    }
    flushLog();
    window.addEventListener('online', flushLog);

    function esc(t) { return String(t == null ? '' : t).replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); }

    function renderLocal() {
      var c = {};
      try { c = JSON.parse(localStorage.getItem('as787_log_counts') || '{}'); } catch (e) {}
      var keys = Object.keys(c);
      if (!keys.length) return '<p class="ps-note">No unlocks recorded on this device yet.</p>';
      var rows = keys.sort(function (a, b) { return c[b] - c[a]; }).map(function (k) {
        return '<tr><td>' + esc(k) + '</td><td>' + c[k] + '</td></tr>';
      }).join('');
      return '<p class="ps-note">This device only. Add the read key for everyone.</p>' +
        '<table><thead><tr><th>Email</th><th>Unlocks</th></tr></thead><tbody>' + rows + '</tbody></table>';
    }

    function storedKey() { try { return localStorage.getItem('as787_log_key') || ''; } catch (e) { return ''; } }
    function setKey(v) { try { v ? localStorage.setItem('as787_log_key', v) : localStorage.removeItem('as787_log_key'); } catch (e) {} paintKeyRow(); }
    function paintKeyRow() { el('psLogKeyF').style.display = storedKey() ? '' : 'none'; }

    function showLog() {
      var out = el('psLogOut');
      if (!LOG_URL) { out.innerHTML = '<p class="ps-note">No collector configured yet.</p>' + renderLocal(); return; }

      var key = storedKey();
      if (!key) {
        // Asked once per device, then remembered. Never rendered into the page.
        key = (window.prompt('Read key for the unlock log') || '').trim();
        if (!key) { out.innerHTML = renderLocal(); return; }
      }

      out.innerHTML = '<p class="ps-note">Loading...</p>';
      fetch(LOG_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ read: true, key: key })
      })
        .then(function (r) { return r.json(); })
        .then(function (j) {
          if (!j || !j.ok) {
            if (j && j.error === 'bad key') setKey('');
            out.innerHTML = '<p class="ps-note">' + esc((j && j.error) || 'Could not read the log.') + '</p>' + renderLocal();
            return;
          }
          setKey(key);
          if (!j.people.length) { out.innerHTML = '<p class="ps-note">Collector is live, no unlocks recorded yet.</p>'; return; }
          var rows = j.people.map(function (r) {
            return '<tr class="' + (r.email === OWNER ? 'me' : '') + '"><td>' + esc(r.email) + '</td><td>' + r.count +
              '</td><td>' + esc(String(r.first).slice(0, 10)) + '</td><td>' + esc(String(r.last).slice(0, 10)) + '</td></tr>';
          }).join('');
          out.innerHTML = '<p class="ps-note">' + j.total + ' unlocks, ' + j.people.length + ' addresses.</p>' +
            '<table><thead><tr><th>Email</th><th>Unlocks</th><th>First</th><th>Last</th></tr></thead><tbody>' + rows + '</tbody></table>';
        })
        .catch(function (e) { out.innerHTML = '<p class="ps-note">Could not reach the collector. ' + esc(e.message) + '</p>' + renderLocal(); });
    }

    if (myEmail() === OWNER) {
      el('psLogWrap').style.display = '';
      paintKeyRow();
      el('psLogBtn').addEventListener('click', showLog);
      el('psLogForget').addEventListener('click', function () {
        setKey('');
        el('psLogOut').innerHTML = '';
        msg('Read key cleared on this device.');
      });
    }

    // The gear lives on the portal page only, in the footer slot beside the
    // contact line. Subpages carry no gear and inherit the same saved settings.
    var slot = document.getElementById('gearSlot');
    if (slot && !slot.querySelector('.ps-gear')) {
      var gear = document.createElement('button');
      gear.type = 'button';
      gear.className = 'ps-gear';
      gear.innerHTML = '&#9881;';
      gear.setAttribute('aria-label', 'Portal settings');
      gear.title = 'Portal settings';
      slot.appendChild(gear);
      gear.addEventListener('click', open);
    }

    el('psX').addEventListener('click', close);
    ovl.addEventListener('click', function (e) { if (e.target === ovl) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });

    [['psSeat', 'seat'], ['psBase', 'base']].forEach(function (p) {
      el(p[0]).addEventListener('click', function (e) {
        var b = e.target.closest('button[data-v]'); if (!b) return;
        PROFILE[p[1]] = b.getAttribute('data-v');
        LS.set('pwa_' + p[1], PROFILE[p[1]]); paintProfile();
      });
    });
    el('psBuild').value = BUILD;
    el('psRefresh').addEventListener('click', function () {
      var btn = this, note = el('psRefreshNote');
      btn.disabled = true;
      note.textContent = 'Clearing caches...';
      var jobs = [];
      try {
        if (window.caches && caches.keys) {
          jobs.push(caches.keys().then(function (ks) {
            return Promise.all(ks.map(function (k) { return caches.delete(k); }));
          }));
        }
      } catch (e) {}
      try {
        if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
          jobs.push(navigator.serviceWorker.getRegistrations().then(function (rs) {
            return Promise.all(rs.map(function (r) { return r.unregister(); }));
          }));
        }
      } catch (e) {}
      Promise.all(jobs).catch(function () {}).then(function () {
        note.textContent = 'Re-fetching code...';
        // A plain reload is not enough. The stale copy sits in the HTTP cache as
        // well as the service worker, and only cache:'reload' rewrites that entry.
        return Promise.all(['/portal-settings.js', '/assist.js', '/sw.js', location.pathname]
          .map(function (u) { return fetch(u, { cache: 'reload' }).catch(function () {}); }));
      }).then(function () {
        note.textContent = 'Reloading...';
        setTimeout(function () { location.reload(); }, 250);
      });
    });
    el('psState').addEventListener('change', function () {
      PROFILE.state = this.value; LS.set('pwa_state', PROFILE.state);
      PROFILE.stateRate = ''; LS.set('pwa_state_rate', '');   // reseed from the table
      paintProfile();
      msg('State of residence set to ' + PROFILE.state + '.');
    });
    el('psStateRate').addEventListener('change', function () {
      var v = parseFloat(this.value);
      PROFILE.stateRate = isNaN(v) ? '' : String(v);
      LS.set('pwa_state_rate', PROFILE.stateRate); paintProfile();
    });
    el('psStateReset').addEventListener('click', function () {
      PROFILE.stateRate = ''; LS.set('pwa_state_rate', ''); paintProfile();
      msg('State rate back to the ' + PROFILE.state + ' table value.');
    });
    el('psFed').addEventListener('input', function () {
      PROFILE.fedRate = this.value; LS.set('pwa_fed_rate', PROFILE.fedRate);
      el('psFedVal').textContent = fedRateNum().toFixed(1) + '%';
    });
    el('psDOH').addEventListener('change', function () {
      PROFILE.doh = this.value; LS.set('pwa_doh', PROFILE.doh);
      el('psLong').textContent = longText();
      msg(PROFILE.doh ? 'Longevity now ' + longText() + '.' : 'Date of hire cleared.');
    });
    el('psProv').addEventListener('change', syncProv);
    el('psSave').addEventListener('click', function () {
      var v = el('psKey').value.trim();
      if (!v || v.indexOf('____') === 0) { msg('Nothing to save.'); return; }
      LS.set(keyName(curProv()), v); syncProv(); msg(PROV[curProv()].name + ' key saved on this device.');
    });
    el('psForget').addEventListener('click', function () {
      LS.del(keyName(curProv())); LS.del(modelName(curProv())); syncProv();
      msg(PROV[curProv()].name + ' key removed from this device.');
    });
    el('psLoad').addEventListener('click', function () {
      var p = curProv(), k = realKey();
      if (!k) { msg('Add a key first.'); return; }
      msg('Loading models...');
      PROV[p].models(k).then(function (ids) {
        if (!ids || !ids.length) { msg('That key returned no models.'); return; }
        var sel = el('psModel'); sel.innerHTML = '';
        ids.forEach(function (id) { var o = document.createElement('option'); o.value = id; o.textContent = id; sel.appendChild(o); });
        var saved = LS.get(modelName(p), '');
        sel.value = (saved && ids.indexOf(saved) >= 0) ? saved : ids[0];
        LS.set(modelName(p), sel.value);
        msg(ids.length + ' models available. Using ' + sel.value + '. Pick another from the list if you want.');
      }).catch(function (e) { msg('Model list failed: ' + e.message); });
    });
    el('psModel').addEventListener('change', function () {
      LS.set(modelName(curProv()), this.value); msg('Using ' + this.value + '.');
    });
    el('psCore').addEventListener('change', function () {
      if (busy) { this.checked = !this.checked; return; }
      busy = true;
      if (this.checked) { msg('Starting download...'); send({ type: 'CACHE_CORE' }); }
      else { msg('Removing...'); send({ type: 'CLEAR_CORE' }); send({ type: 'CLEAR_AUDIO' }); }
    });
    el('psAudio').addEventListener('change', function () {
      if (busy) { this.checked = !this.checked; return; }
      busy = true;
      if (this.checked) { msg('Starting podcast download, this one is big...'); send({ type: 'CACHE_AUDIO' }); }
      else { msg('Removing podcasts...'); send({ type: 'CLEAR_AUDIO' }); }
    });

    el('psProv').value = LS.get('pwa_provider', 'claude');
    paintProfile(); syncProv(); wireOffline();
  }

  function open() { mount(); ovl.classList.add('on'); }
  function close() { if (ovl) ovl.classList.remove('on'); }

  window.PortalSettings = {
    open: open, close: close,
    profile: function () {
      var L = longevity(PROFILE.doh);
      return { seat: PROFILE.seat, fleet: 'B787', base: PROFILE.base, doh: PROFILE.doh,
        state: PROFILE.state, stateRate: stateRateNum(), fedRate: fedRateNum(),
        taxSource: TAX_SRC, stateRateIsMine: PROFILE.stateRate !== '',
        years: L ? L.years : null, months: L ? L.months : null, next: L ? L.next : null,
        longevity: longText() };
    },
    build: function () { return BUILD; },
    providerName: function () { return PROV[LS.get('pwa_provider', 'claude')].name; },
    ready: function () {
      var p = LS.get('pwa_provider', 'claude');
      return !!(LS.get(keyName(p), '') && LS.get(modelName(p), ''));
    },
    // Multi-turn, full result: {text, thinking, stop, usage}.
    // messages is [{role, content, images?:[{mime,b64}]}], oldest first.
    askFull: function (sys, messages) {
      var p = LS.get('pwa_provider', 'claude');
      var k = LS.get(keyName(p), ''), m = LS.get(modelName(p), '');
      if (!k) return Promise.reject(new Error('No API key saved. Open settings and add one.'));
      if (!m) return Promise.reject(new Error('No model chosen. Open settings and tap Load.'));
      if (!messages || !messages.length) return Promise.reject(new Error('Nothing to ask.'));
      return PROV[p].ask(k, m, sys, messages);
    },
    // Text only, kept so older callers keep working.
    askThread: function (sys, messages) {
      return window.PortalSettings.askFull(sys, messages).then(function (r) { return r.text; });
    },
    ask: function (sys, user) {
      return window.PortalSettings.askThread(sys, [{ role: 'user', content: user }]);
    },
    // Shared by pwa.html and assist.js so the resize rule lives in one place.
    // A Retina screenshot is 3x bigger than the model can use, and base64 adds
    // another third on top, so downscale before it ever reaches the request.
    MAX_IMAGES: 4,
    prepImage: function (file) {
      return new Promise(function (resolve, reject) {
        if (!file || !/^image\//.test(file.type)) { reject(new Error('Not an image')); return; }
        var fr = new FileReader();
        fr.onerror = function () { reject(new Error('Could not read that file')); };
        fr.onload = function () {
          var img = new Image();
          img.onerror = function () { reject(new Error('Could not decode that image')); };
          img.onload = function () {
            var LIMIT = 1568, w = img.width, h = img.height;
            if (w > LIMIT || h > LIMIT) {
              var sc = LIMIT / Math.max(w, h);
              w = Math.max(1, Math.round(w * sc)); h = Math.max(1, Math.round(h * sc));
            }
            try {
              var cv = document.createElement('canvas');
              cv.width = w; cv.height = h;
              cv.getContext('2d').drawImage(img, 0, 0, w, h);
              // PNG keeps screenshot text crisp; JPEG would smear small type.
              var url = cv.toDataURL('image/png');
              resolve({ mime: 'image/png', b64: url.split(',')[1], url: url, w: w, h: h, name: file.name || 'pasted' });
            } catch (e) { reject(new Error('Could not process that image')); }
          };
          img.src = fr.result;
        };
        fr.readAsDataURL(file);
      });
    },
    // Why an answer came back without text, in words rather than a blank box.
    emptyReason: function (r) {
      var st = (r && r.stop) || '';
      if (st === 'max_tokens' || st === 'length' || st === 'MAX_TOKENS') {
        return 'The model hit its output limit before writing an answer. Ask again, or split the question.';
      }
      if (r && r.thinking) return 'The model reasoned but produced no answer text. Ask again, or rephrase.';
      if (st === 'refusal' || st === 'SAFETY') return 'The model declined to answer that.';
      return 'Empty response' + (st ? ' (' + st + ').' : '.');
    },
    // Only Claude caches the context block today. The others re-read it every turn.
    threadsAreCheap: function () { return LS.get('pwa_provider', 'claude') === 'claude'; },
    modelLabel: function () {
      var p = LS.get('pwa_provider', 'claude');
      return PROV[p].name + ' · ' + LS.get(modelName(p), '');
    }
  };

  // This file is deferred, so pages that paint a profile row at parse time see
  // the fallback defaults and never correct themselves. Tell them when we exist.
  function ready() {
    mount();
    try { window.dispatchEvent(new CustomEvent('portalsettings:ready')); } catch (e) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready);
  else ready();
})();
