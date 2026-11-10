/* global __uv$config, BareMux */
'use strict';

const SEARCH_ENGINES = {
  ddg: 'https://duckduckgo.com/?q=%s',
  brave: 'https://search.brave.com/search?q=%s',
  startpage: 'https://www.startpage.com/sp/search?query=%s',
  google: 'https://www.google.com/search?q=%s',
  bing: 'https://www.bing.com/search?q=%s',
};

const THEMES = {
  purple: '#8f7bff',
  blue: '#5b9dff',
  teal: '#3fcfc0',
  green: '#5fd17a',
  orange: '#ff9d4d',
  pink: '#ff7ab8',
};

const SHORTCUTS = [
  ['DuckDuckGo', 'https://duckduckgo.com/'],
  ['Wikipedia', 'https://en.wikipedia.org/'],
  ['Reddit', 'https://www.reddit.com/'],
  ['GitHub', 'https://github.com/'],
  ['BBC News', 'https://www.bbc.com/news'],
  ['Maps', 'https://www.openstreetmap.org/'],
];

const $ = (id) => document.getElementById(id);
const home = $('home');
const browser = $('browser');
const frame = $('frame');
const statusEl = $('status');

// ---------- settings (kept in this browser only) ----------
const settings = { search: 'ddg', theme: 'purple', ads: true };
try {
  Object.assign(settings, JSON.parse(localStorage.getItem('cfg') || '{}'));
} catch { /* storage unavailable: use defaults */ }
if (!SEARCH_ENGINES[settings.search]) settings.search = 'ddg';
if (!THEMES[settings.theme]) settings.theme = 'purple';

function saveSettings() {
  try { localStorage.setItem('cfg', JSON.stringify(settings)); } catch { /* ignore */ }
}

function applyTheme() {
  document.documentElement.style.setProperty('--accent', THEMES[settings.theme]);
  for (const b of $('set-theme').children) {
    b.setAttribute('aria-checked', String(b.dataset.theme === settings.theme));
  }
}

// ---------- start-up ----------
let ready = null;

function setStatus(text, bad) {
  statusEl.textContent = text;
  statusEl.classList.toggle('bad', !!bad);
}

function registerWorker() {
  const script = 'a/sw.js' + (settings.ads ? '' : '?ads=0');
  return navigator.serviceWorker.register(script, { scope: __uv$config.prefix });
}

// Where the backend lives. Empty = the same server that served this page.
const BACKEND = (window.V1 || '').replace(/[/]+$/, '') ||
  (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host;
const REMOTE = !!window.V1;

// On a static host the access code travels in the link (#k=code) and is remembered in this browser.
let accessKey = '';
if (REMOTE) {
  const m = /[#&]k=([^&]+)/.exec(location.hash);
  try {
    if (m) {
      accessKey = decodeURIComponent(m[1]);
      localStorage.setItem('auth', accessKey);
      history.replaceState(null, '', location.pathname + location.search);
    } else {
      accessKey = localStorage.getItem('auth') || '';
    }
  } catch { /* storage unavailable */ }
}

function connUrl() {
  return BACKEND + (accessKey ? '/k/' + encodeURIComponent(accessKey) : '') + '/t/';
}

// Quick check that the backend is up and accepts us.
function probe(url) {
  return new Promise((resolve) => {
    let ws;
    try { ws = new WebSocket(url); } catch { return resolve(false); }
    const done = (ok) => { clearTimeout(timer); try { ws.close(); } catch { /* ignore */ } resolve(ok); };
    const timer = setTimeout(() => done(false), 8000);
    ws.onopen = () => done(true);
    ws.onerror = () => done(false);
  });
}

async function setup() {
  if (!('serviceWorker' in navigator)) {
    throw new Error('This browser does not support service workers.');
  }
  if (!window.isSecureContext) {
    throw new Error('Open this site over https:// (or http://localhost) - it cannot start on plain http.');
  }
  if (!(await probe(connUrl()))) {
    if (REMOTE) $('unlock').hidden = false;
    throw new Error(REMOTE ? 'Could not connect. The server is offline or the access code is wrong.'
      : 'Could not reach the server.');
  }
  $('unlock').hidden = true;
  await registerWorker();

  // window.V3: when set, the transport library's own files live in a different repo.
  const engine = window.V3 || '';
  const asset = (p) => (engine ? engine + p : new URL(p, location.href).pathname);
  const connection = new BareMux.BareMuxConnection(asset('c/worker.js'));
  await connection.setTransport(asset('b/index.mjs'), [{ wisp: connUrl() }]);
}

function start() {
  setStatus('Connecting…');
  ready = setup().then(
    () => setStatus('Ready'),
    (err) => { setStatus(err.message, true); throw err; }
  );
  ready.catch(() => {});
}

$('unlock').addEventListener('submit', (e) => {
  e.preventDefault();
  accessKey = $('unlock-code').value.trim();
  try { localStorage.setItem('auth', accessKey); } catch { /* ignore */ }
  $('unlock-code').value = '';
  start();
});

// ---------- browsing ----------
// Turn what the user typed into a full address, or a search.
function toUrl(input) {
  const text = input.trim();
  if (!text) return '';
  try {
    const u = new URL(text);
    if (u.protocol === 'http:' || u.protocol === 'https:') return u.href;
  } catch { /* not a full address */ }
  if (!/\s/.test(text) && /^[^/]+\.[a-z]{2,}(:\d+)?(\/.*)?$/i.test(text)) {
    try { return new URL('https://' + text).href; } catch { /* fall through to search */ }
  }
  return SEARCH_ENGINES[settings.search].replace('%s', encodeURIComponent(text));
}

async function open(input) {
  const url = toUrl(input);
  if (!url) return;
  try {
    await ready;
  } catch {
    return;
  }
  home.hidden = true;
  browser.hidden = false;
  $('bar-address').value = url;
  frame.src = __uv$config.prefix + __uv$config.encodeUrl(url);
}

// Show the real (unscrambled) address in the bar as the user clicks around.
function currentUrl() {
  try {
    const loc = frame.contentWindow.location;
    const p = loc.pathname + loc.search + loc.hash;
    if (!p.startsWith(__uv$config.prefix)) return '';
    return __uv$config.decodeUrl(p.slice(__uv$config.prefix.length));
  } catch {
    return '';
  }
}

frame.addEventListener('load', () => {
  const url = currentUrl();
  if (url && document.activeElement !== $('bar-address')) $('bar-address').value = url;
});

$('go').addEventListener('submit', (e) => {
  e.preventDefault();
  open($('address').value);
});

$('bar').addEventListener('submit', (e) => {
  e.preventDefault();
  open($('bar-address').value);
  $('bar-address').blur();
});

$('home-btn').addEventListener('click', () => {
  frame.src = 'about:blank';
  browser.hidden = true;
  home.hidden = false;
  $('address').value = '';
  $('address').focus();
});
$('back-btn').addEventListener('click', () => { try { frame.contentWindow.history.back(); } catch { /* ignore */ } });
$('fwd-btn').addEventListener('click', () => { try { frame.contentWindow.history.forward(); } catch { /* ignore */ } });
$('reload-btn').addEventListener('click', () => { try { frame.contentWindow.location.reload(); } catch { /* ignore */ } });
$('full-btn').addEventListener('click', () => {
  if (document.fullscreenElement) document.exitFullscreen();
  else if (frame.requestFullscreen) frame.requestFullscreen().catch(() => {});
});

// ---------- shortcuts ----------
for (const [name, url] of SHORTCUTS) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'shortcut';
  const icon = document.createElement('span');
  icon.className = 'icon';
  icon.textContent = name[0];
  icon.setAttribute('aria-hidden', 'true');
  b.append(icon, name);
  b.addEventListener('click', () => open(url));
  $('shortcuts').append(b);
}

// ---------- settings panel ----------
for (const [name, color] of Object.entries(THEMES)) {
  const b = document.createElement('button');
  b.type = 'button';
  b.dataset.theme = name;
  b.style.background = color;
  b.setAttribute('role', 'radio');
  b.setAttribute('aria-label', name);
  b.title = name;
  b.addEventListener('click', () => {
    settings.theme = name;
    saveSettings();
    applyTheme();
  });
  $('set-theme').append(b);
}

$('set-search').value = settings.search;
$('set-ads').checked = settings.ads;
applyTheme();

$('settings-btn').addEventListener('click', () => $('settings').showModal());

$('set-search').addEventListener('change', () => {
  settings.search = $('set-search').value;
  saveSettings();
});

$('set-ads').addEventListener('change', () => {
  settings.ads = $('set-ads').checked;
  saveSettings();
  // Swap the service worker for the blocking / non-blocking version.
  ready = Promise.resolve(ready).catch(() => {}).then(registerWorker);
  ready.catch((err) => setStatus(err.message, true));
});

start();
