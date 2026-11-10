import { useState, useEffect } from 'react';
import api from './api';

// One shared copy of the public site settings (logo, contact details, …) for
// every component that needs them, instead of each one fetching its own.
//
//  · stale-while-revalidate: the last copy is cached in localStorage, so the
//    logo and contact details are there on first paint (no text-to-logo flash)
//    and are then refreshed from the API — admin changes show on the next page
//    load, or immediately when something dispatches `ft-settings-changed`
//    (the admin Settings page does after saving).
//  · every storage access is guarded; with storage blocked it simply fetches.

const KEY = 'ft_site_settings';
const FAVICON_KEY = 'ft_favicon';
const FRESH_MS = 30_000;

let cache = null;
try { cache = JSON.parse(localStorage.getItem(KEY)); } catch { cache = null; }
let lastFetch = 0;
let inflight = null;
const subscribers = new Set();

// The browser-tab icon: custom if admin set one, otherwise the built-in default
// that index.html ships. The custom URL is cached so index.html can apply it
// before React loads on the next visit.
export function applyFavicon(url) {
  try {
    const link = document.getElementById('site-favicon');
    if (!link) return;
    if (url) { link.removeAttribute('type'); if (link.getAttribute('href') !== url) link.setAttribute('href', url); }
    else { link.setAttribute('type', 'image/svg+xml'); link.setAttribute('href', '/favicon.svg'); }
  } catch { /* no DOM */ }
  try { url ? localStorage.setItem(FAVICON_KEY, url) : localStorage.removeItem(FAVICON_KEY); } catch { /* storage blocked */ }
}

export function refreshSiteSettings({ force = false } = {}) {
  if (inflight) return inflight;
  if (!force && cache && Date.now() - lastFetch < FRESH_MS) return Promise.resolve(cache);
  inflight = api.getPublicSettings()
    .then((s) => {
      cache = s; lastFetch = Date.now();
      try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage blocked */ }
      applyFavicon(s.site_favicon_url || null);
      subscribers.forEach((fn) => fn(s));
      return s;
    })
    .catch(() => cache)
    .finally(() => { inflight = null; });
  return inflight;
}

if (typeof window !== 'undefined') window.addEventListener('ft-settings-changed', () => refreshSiteSettings({ force: true }));

// Returns the settings object, or null until the first copy (cached or fetched) is available.
export function useSiteSettings() {
  const [s, setS] = useState(cache);
  useEffect(() => {
    subscribers.add(setS);
    refreshSiteSettings();
    return () => { subscribers.delete(setS); };
  }, []);
  return s;
}
