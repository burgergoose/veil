/*global UVServiceWorker,__uv$config*/
// Service worker: runs Ultraviolet and (optionally) drops requests to ad and tracker servers.
importScripts('uv.bundle.js');
importScripts('uv.config.js');
importScripts(__uv$config.sw || 'uv.sw.js');

const uv = new UVServiceWorker();

// Registered as /uv/sw.js?ads=0 to turn blocking off.
const BLOCK_ADS = new URL(self.location.href).searchParams.get('ads') !== '0';

// Matches the domain itself and every subdomain.
const BLOCKED_HOSTS = [
  'doubleclick.net', 'googlesyndication.com', 'googleadservices.com', 'googletagservices.com',
  'googletagmanager.com', 'google-analytics.com', '2mdn.net', 'adservice.google.com',
  'amazon-adsystem.com', 'adnxs.com', 'adsrvr.org', 'adform.net', 'advertising.com',
  'criteo.com', 'criteo.net', 'taboola.com', 'outbrain.com', 'revcontent.com', 'mgid.com',
  'pubmatic.com', 'rubiconproject.com', 'openx.net', 'casalemedia.com', 'indexexchange.com',
  'smartadserver.com', 'bidswitch.net', 'zedo.com', 'moatads.com', 'adsafeprotected.com',
  'doubleverify.com', 'scorecardresearch.com', 'quantserve.com', 'chartbeat.com',
  'hotjar.com', 'mixpanel.com', 'amplitude.com', 'segment.io', 'fullstory.com',
  'applovin.com', 'unityads.unity3d.com', 'vungle.com', 'chartboost.com', 'tapjoy.com',
];

function isBlocked(requestUrl) {
  try {
    const url = new URL(requestUrl);
    if (!url.pathname.startsWith(__uv$config.prefix)) return false;
    const target = new URL(__uv$config.decodeUrl(url.pathname.slice(__uv$config.prefix.length)));
    const host = target.hostname;
    return BLOCKED_HOSTS.some((d) => host === d || host.endsWith('.' + d));
  } catch {
    return false;
  }
}

async function handleRequest(event) {
  if (uv.route(event)) {
    if (BLOCK_ADS && isBlocked(event.request.url)) {
      return new Response(null, { status: 204 });
    }
    return await uv.fetch(event);
  }
  return await fetch(event.request);
}

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (event) => {
  event.respondWith(handleRequest(event));
});
