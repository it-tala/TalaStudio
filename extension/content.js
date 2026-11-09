(() => {
  if (window.__tsSaveLoaded) return;
  window.__tsSaveLoaded = true;

  const VIEWS = [
    ['front', 'Front'], ['perspective', 'Perspective'], ['detail', 'Detail'], ['spec', 'Spec'],
    ['finish', 'Finish swatch'], ['room_hero', 'Room hero'], ['lp_hero', 'Landing hero'],
    ['social', 'Social'], ['process', 'Process / story'], ['other', 'Other'],
  ];
  const send = (msg) => new Promise((res) => chrome.runtime.sendMessage(msg, (r) => res(r || { ok: false, error: chrome.runtime.lastError?.message })));

  // ---------- shadow UI ----------
  const host = document.createElement('div');
  host.id = 'ts-save-host';
  host.style.cssText = 'all:initial;position:fixed;top:0;left:0;width:0;height:0;z-index:2147483647;';
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `
<style>
  :host { all: initial; }
  * { box-sizing: border-box; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
  .btn { position: fixed; display: none; align-items: center; gap: 6px; padding: 7px 12px; border: 0; border-radius: 999px;
    background: #1f2a24; color: #f4efe6; font-size: 13px; font-weight: 600; cursor: pointer;
    box-shadow: 0 2px 10px rgba(0,0,0,.35); }
  .btn:hover { background: #33443a; }
  .btn svg { width: 14px; height: 14px; }
  .overlay { position: fixed; inset: 0; display: none; align-items: center; justify-content: center; background: rgba(0,0,0,.45); }
  .panel { width: min(440px, calc(100vw - 32px)); max-height: calc(100vh - 32px); overflow: auto; background: #fbf8f3; color: #1f2a24;
    border-radius: 14px; box-shadow: 0 12px 40px rgba(0,0,0,.35); padding: 16px; font-size: 13px; }
  .head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
  .head b { font-size: 15px; }
  .x { border: 0; background: none; font-size: 20px; line-height: 1; cursor: pointer; color: #6b6b6b; }
  .preview { display: flex; gap: 12px; align-items: flex-start; margin-bottom: 12px; }
  .preview img { width: 96px; height: 96px; object-fit: contain; background: #ece6dc; border-radius: 8px; }
  .src { color: #6b6b6b; font-size: 11px; word-break: break-all; max-height: 60px; overflow: hidden; }
  label { display: block; font-weight: 600; margin: 10px 0 4px; }
  input[type=text], select, textarea { width: 100%; padding: 7px 9px; border: 1px solid #cfc6b8; border-radius: 8px; background: #fff;
    color: #1f2a24; font-size: 13px; }
  select[size] { height: 150px; }
  textarea { resize: vertical; min-height: 44px; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .chip { padding: 5px 10px; border: 1px solid #cfc6b8; border-radius: 999px; background: #fff; cursor: pointer; font-size: 12px; color: #1f2a24; }
  .chip[aria-pressed=true] { background: #1f2a24; color: #f4efe6; border-color: #1f2a24; }
  .row { display: flex; gap: 8px; align-items: center; margin-top: 14px; }
  .save { flex: 1; padding: 10px; border: 0; border-radius: 10px; background: #1f2a24; color: #f4efe6; font-weight: 700; font-size: 14px; cursor: pointer; }
  .save:disabled { opacity: .5; cursor: default; }
  .status { margin-top: 10px; min-height: 18px; font-size: 12px; }
  .status.err { color: #a12a1a; } .status.ok { color: #2f6b3a; }
  .hint { color: #6b6b6b; font-size: 11px; margin-top: 4px; }
  .toast { position: fixed; right: 16px; bottom: 16px; display: none; padding: 10px 14px; border-radius: 10px; background: #1f2a24; color: #f4efe6; font-size: 13px;
    box-shadow: 0 4px 16px rgba(0,0,0,.3); max-width: 360px; }
</style>
<button class="btn" type="button"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M12 3v12m0 0l-5-5m5 5l5-5M4 21h16"/></svg>Save</button>
<div class="overlay" role="dialog" aria-modal="true" aria-label="Save to TalaStudio">
  <div class="panel">
    <div class="head"><b>Save to TalaStudio</b><button class="x" type="button" aria-label="Close">×</button></div>
    <div class="preview"><img alt=""><div class="src"></div></div>
    <div class="body"></div>
  </div>
</div>
<div class="toast"></div>`;
  (document.body || document.documentElement).appendChild(host);

  const $ = (s) => root.querySelector(s);
  const btn = $('.btn'), overlay = $('.overlay'), body = $('.body'), toast = $('.toast');

  // ---------- hover button ----------
  let enabled = true, panelOpen = false, current = null, hideTimer = 0, raf = 0, lastXY = [0, 0];
  chrome.storage.local.get('hoverEnabled').then((v) => { enabled = v.hoverEnabled !== false; });
  chrome.storage.onChanged.addListener((c) => {
    if (c.hoverEnabled) { enabled = c.hoverEnabled.newValue !== false; if (!enabled) hideBtn(); }
  });

  function usable(img) {
    const r = img.getBoundingClientRect();
    return r.width >= 120 && r.height >= 90 && (img.naturalWidth || 0) >= 200 && (img.currentSrc || img.src);
  }
  function probe() {
    raf = 0;
    const stack = document.elementsFromPoint(lastXY[0], lastXY[1]);
    if (stack[0] === host) { clearTimeout(hideTimer); return; }
    const img = stack.find((el) => el instanceof HTMLImageElement && usable(el));
    if (img) { current = img; placeBtn(img); } else scheduleHide();
  }
  function placeBtn(img) {
    clearTimeout(hideTimer);
    const r = img.getBoundingClientRect();
    btn.style.left = Math.max(r.left + 10, 8) + 'px';
    btn.style.top = Math.max(r.top + 10, 8) + 'px';
    btn.style.display = 'inline-flex';
  }
  function scheduleHide() { clearTimeout(hideTimer); hideTimer = setTimeout(hideBtn, 250); }
  function hideBtn() { btn.style.display = 'none'; }

  document.addEventListener('mousemove', (e) => {
    if (!enabled || panelOpen) return;
    lastXY = [e.clientX, e.clientY];
    if (!raf) raf = requestAnimationFrame(probe);
  }, { passive: true, capture: true });
  window.addEventListener('scroll', hideBtn, { passive: true, capture: true });

  btn.addEventListener('click', (e) => {
    e.preventDefault(); e.stopPropagation();
    if (current) openPanel(bestSrc(current), current);
  });

  function bestSrc(img) {
    let best = img.currentSrc || img.src, bestW = 0;
    const set = img.getAttribute('srcset');
    if (set) {
      for (const part of set.split(',')) {
        const [u, d] = part.trim().split(/\s+/);
        const w = d && d.endsWith('w') ? parseInt(d, 10) : d && d.endsWith('x') ? parseFloat(d) * 1000 : 0;
        if (u && w > bestW) { bestW = w; best = new URL(u, document.baseURI).href; }
      }
    }
    return best;
  }

  // ---------- panel ----------
  function guessItem(products, img, src) {
    const text = [img && img.alt, img && img.title, img && img.getAttribute && img.getAttribute('aria-label'),
      decodeURIComponent((src.split('?')[0].split('/').pop()) || '')].filter(Boolean).join(' ').toLowerCase();
    const m = text.match(/\b([a-z]{2})[-_ ]?(\d{3})/);
    if (m) {
      const code = (m[1] + '-' + m[2]).toUpperCase();
      if (products.some((p) => p.code === code)) return code;
    }
    let best = null, len = 0;
    for (const p of products) {
      const k = (p.collection + ' ' + p.name).toLowerCase();
      if (text.includes(k) && k.length > len) { best = p.code; len = k.length; }
    }
    return best;
  }

  async function toBase64(src) {
    const buf = await (await fetch(src)).arrayBuffer();
    const bytes = new Uint8Array(buf);
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  }

  function esc(s) { return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  async function openPanel(src, img) {
    hideBtn();
    panelOpen = true;
    overlay.style.display = 'flex';
    $('.preview img').src = src;
    $('.src').textContent = src.startsWith('data:') ? '(embedded image)' : src;
    body.innerHTML = '<div class="status">Loading item list…</div>';

    const st = await send({ type: 'state' });
    if (!st.ok || !st.email) {
      body.innerHTML = `<div class="status err">Sign in first: click the TalaStudio icon in the browser toolbar.</div>`;
      return;
    }
    if (!st.catalog) {
      body.innerHTML = `<div class="status err">${esc(st.error || 'Could not load the item list.')}</div>`;
      return;
    }
    const { products, collections, views } = st.catalog;
    const last = st.lastChoice || {};
    const guessed = guessItem(products, img, src);
    let item = guessed || last.item || '';
    let view = last.view || 'front';
    const allFinishes = [...new Set(products.flatMap((p) => p.finishes || []))];

    const groups = collections.slice().sort((a, b) => a.slug.localeCompare(b.slug)).map((c) => {
      const items = products.filter((p) => p.collection_slug === c.slug);
      return `<optgroup label="${esc(c.name)} · ${esc(c.room)}">
        <option value="col:${esc(c.slug)}">${esc(c.name)} ${esc(c.room)} — whole collection / room scene</option>
        ${items.map((p) => `<option value="${esc(p.code)}">${esc(p.code)} · ${esc(p.collection)} ${esc(p.name)}</option>`).join('')}
      </optgroup>`;
    }).join('');

    body.innerHTML = `
      <label for="q">Item</label>
      <input id="q" type="text" placeholder="Search: code, collection or item (e.g. DH-102, zuma sofa)" autocomplete="off">
      <select id="item" size="7">${groups}</select>
      ${guessed ? `<div class="hint">Matched ${esc(guessed)} from the image name.</div>` : ''}
      <label>View</label>
      <div class="chips" id="views">${VIEWS.filter(([v]) => views.includes(v)).map(([v, l]) => `<button type="button" class="chip" data-v="${v}" aria-pressed="${v === view}">${l}</button>`).join('')}</div>
      <label for="finish">Finish</label>
      <select id="finish"></select>
      <input id="finishOther" type="text" placeholder="Finish name" style="display:none;margin-top:6px">
      <label for="notes">Notes <span style="font-weight:400;color:#6b6b6b">(optional)</span></label>
      <textarea id="notes" placeholder="e.g. final render, approved by Evin"></textarea>
      <div class="row"><button class="save" type="button">Save to library</button></div>
      <div class="status" role="status"></div>`;

    const sel = $('#item'), q = $('#q'), fin = $('#finish'), finOther = $('#finishOther'), status = $('.status'), save = $('.save');
    if (item && [...sel.options].some((o) => o.value === item)) sel.value = item;

    function fillFinishes() {
      const p = products.find((x) => x.code === sel.value);
      const list = p ? (p.finishes || []) : allFinishes;
      const keep = fin.value || last.finish || '';
      fin.innerHTML = `<option value="">— none / not finish-specific —</option>` +
        list.map((f) => `<option>${esc(f)}</option>`).join('') + `<option value="__other">Other…</option>`;
      if ([...fin.options].some((o) => o.value === keep)) fin.value = keep;
      finOther.style.display = fin.value === '__other' ? 'block' : 'none';
    }
    fillFinishes();
    sel.addEventListener('change', fillFinishes);
    fin.addEventListener('change', () => { finOther.style.display = fin.value === '__other' ? 'block' : 'none'; });

    q.addEventListener('input', () => {
      const terms = q.value.toLowerCase().split(/\s+/).filter(Boolean);
      for (const g of sel.querySelectorAll('optgroup')) {
        let any = false;
        for (const o of g.querySelectorAll('option')) {
          const hay = (g.label + ' ' + o.textContent).toLowerCase();
          const show = terms.every((t) => hay.includes(t));
          o.hidden = !show; any = any || show;
        }
        g.hidden = !any;
      }
      const first = sel.querySelector('option:not([hidden])');
      if (first && (!sel.value || sel.selectedOptions[0]?.hidden)) { sel.value = first.value; fillFinishes(); }
    });

    $('#views').addEventListener('click', (e) => {
      const b = e.target.closest('.chip'); if (!b) return;
      view = b.dataset.v;
      for (const c of root.querySelectorAll('.chip')) c.setAttribute('aria-pressed', String(c === b));
    });

    save.addEventListener('click', async () => {
      const finish = fin.value === '__other' ? finOther.value.trim() : fin.value;
      if (!sel.value) { status.className = 'status err'; status.textContent = 'Pick an item or a collection.'; return; }
      if (view === 'finish' && !finish) { status.className = 'status err'; status.textContent = 'Pick the finish this swatch shows.'; return; }
      save.disabled = true;
      status.className = 'status'; status.textContent = 'Downloading the full-size image and uploading…';
      let inlineB64 = null;
      try {
        if (src.startsWith('blob:') || src.startsWith('data:')) inlineB64 = await toBase64(src);
      } catch (e) {
        save.disabled = false; status.className = 'status err'; status.textContent = 'Could not read this image from the page.'; return;
      }
      const r = await send({ type: 'save', src, inlineB64, pageUrl: location.href, item: sel.value, view, finish, notes: $('#notes').value.trim() });
      save.disabled = false;
      if (!r.ok) { status.className = 'status err'; status.textContent = r.error; return; }
      if (r.duplicate) { status.className = 'status err'; status.textContent = `Already in the library as ${r.path}`; return; }
      const size = r.width ? ` · ${r.width}×${r.height}` : '';
      closePanel();
      showToast(`Saved ${r.path}${size}`);
    });

    q.focus();
  }

  function closePanel() { overlay.style.display = 'none'; panelOpen = false; body.innerHTML = ''; }
  function showToast(text) {
    toast.textContent = text; toast.style.display = 'block';
    clearTimeout(showToast.t); showToast.t = setTimeout(() => { toast.style.display = 'none'; }, 3500);
  }

  $('.x').addEventListener('click', closePanel);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closePanel(); });
  // keep page shortcuts (e.g. Google Photos arrow keys) from firing while typing in the panel
  for (const ev of ['keydown', 'keyup', 'keypress']) {
    overlay.addEventListener(ev, (e) => {
      if (ev === 'keydown' && e.key === 'Escape') closePanel();
      e.stopPropagation();
    });
  }

  chrome.runtime.onMessage.addListener((msg, _s, sendResponse) => {
    if (msg.type === 'openPanel') {
      const img = [...document.images].find((i) => i.currentSrc === msg.src || i.src === msg.src) || null;
      openPanel(msg.src, img);
      sendResponse({ ok: true });
    }
  });
})();
