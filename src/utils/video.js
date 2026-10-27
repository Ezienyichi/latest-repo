// Campaign videos are admin-pasted URLs: usually YouTube (any of its URL
// shapes), sometimes a direct file. parseVideo() tells them apart.
const YT_HOST = /^(?:www\.|m\.|music\.)?(?:youtube\.com|youtube-nocookie\.com)$/i;
const ID = /^[\w-]{11}$/;

// "90", "90s", "1m30s", "1h2m3s" -> seconds
function toSeconds(t) {
  if (!t) return 0;
  if (/^\d+$/.test(t)) return +t;
  const m = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/i.exec(t);
  return m ? (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0) : 0;
}

export function parseVideo(url) {
  if (typeof url !== 'string' || !url.trim()) return null;
  let u;
  try { u = new URL(url.trim()); } catch { return null; }
  if (!/^https?:$/.test(u.protocol)) return null;
  const host = u.hostname.toLowerCase();
  let id = null;
  const isYt = host === 'youtu.be' || host === 'www.youtu.be' || YT_HOST.test(host);
  if (host === 'youtu.be' || host === 'www.youtu.be') id = u.pathname.split('/')[1];
  else if (YT_HOST.test(host)) {
    const parts = u.pathname.split('/').filter(Boolean);
    if (u.pathname === '/watch' || parts[0] === 'watch') id = u.searchParams.get('v');
    else if (['embed', 'shorts', 'live', 'v'].includes(parts[0])) id = parts[1];
  }
  // A YouTube page that isn't a single video (channel, playlist, bare /watch)
  // can't be played as a file either, so it is rejected rather than guessed at.
  if (isYt) {
    if (!id || !ID.test(id)) return null;
    return { kind: 'youtube', id, start: toSeconds(u.searchParams.get('t') || u.searchParams.get('start')), url: u.href };
  }
  return { kind: 'file', url: u.href };
}

export const youtubeThumb = (id, q = 'maxresdefault') => `https://i.ytimg.com/vi/${id}/${q}.jpg`;
export const youtubeEmbed = (id, start = 0) =>
  `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1${start ? `&start=${start}` : ''}`;
