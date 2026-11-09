const send = (msg) => new Promise((res) => chrome.runtime.sendMessage(msg, (r) => res(r || { ok: false, error: chrome.runtime.lastError?.message })));
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

async function render() {
  const st = await send({ type: 'state' });
  const signedIn = st.ok && st.email;
  $('signin').hidden = !!signedIn;
  $('main').hidden = !signedIn;
  if (!signedIn) { $('email').focus(); return; }

  $('who').textContent = st.email;
  $('hover').checked = st.hoverEnabled;
  $('mainErr').textContent = st.error || '';
  $('count').textContent = st.catalog ? `${st.catalog.products.length} items in ${st.catalog.collections.length} collections` : '';
  loadRecent();
}

async function loadRecent() {
  const r = await send({ type: 'recent', limit: 10 });
  const ul = $('recent');
  if (!r.ok) { ul.innerHTML = `<li class="err">${esc(r.error)}</li>`; return; }
  if (!r.items.length) { ul.innerHTML = '<li class="muted">Nothing saved yet.</li>'; return; }
  ul.innerHTML = r.items.map((a) => `<li><div class="p">${esc(a.storage_path)}</div>
    <div class="muted">${esc(a.uploaded_email || '')} · ${a.width ? `${a.width}×${a.height} · ` : ''}${new Date(a.created_at).toLocaleString()}</div></li>`).join('');
}

$('signin').addEventListener('submit', async (e) => {
  e.preventDefault();
  const b = e.submitter; b.disabled = true; $('signinErr').textContent = '';
  const r = await send({ type: 'signIn', email: $('email').value, password: $('password').value });
  b.disabled = false;
  if (!r.ok) { $('signinErr').textContent = r.error; return; }
  $('password').value = '';
  render();
});

$('signout').addEventListener('click', async () => { await send({ type: 'signOut' }); render(); });
$('hover').addEventListener('change', (e) => chrome.storage.local.set({ hoverEnabled: e.target.checked }));
$('reload').addEventListener('click', async () => {
  $('mainErr').textContent = '';
  const r = await send({ type: 'catalog' });
  if (!r.ok) $('mainErr').textContent = r.error;
  render();
});

render();
