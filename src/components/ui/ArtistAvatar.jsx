// Artist profile-picture + banner fallbacks. The placeholders are original
// (generated here — initials on a brand gradient, and an abstract SVG), so
// there is no third-party image or licence involved when an admin hasn't
// set a picture yet.

const PALETTE = [['#1B4332', '#2D6A4F'], ['#177c1d', '#2dba35'], ['#14532d', '#22a829'], ['#1a3a2a', '#40916c']];

const initials = (name = '') => name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('') || '?';
const pickColors = (name = '') => PALETTE[[...name].reduce((n, ch) => n + ch.charCodeAt(0), 0) % PALETTE.length];

export const ARTIST_BANNER_PLACEHOLDER = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 400" preserveAspectRatio="xMidYMid slice">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0d2318"/><stop offset="1" stop-color="#2D6A4F"/></linearGradient></defs>
    <rect width="1600" height="400" fill="url(#g)"/>
    <circle cx="1280" cy="60" r="220" fill="#ffad00" opacity=".10"/>
    <circle cx="200" cy="360" r="260" fill="#2dba35" opacity=".12"/>
    <path d="M0 300 C300 220 500 380 800 300 S1300 220 1600 300 V400 H0Z" fill="#ffffff" opacity=".05"/>
  </svg>`
)}`;

// Small circular profile picture. `artist` needs { displayName, avatarUrl? }.
export default function ArtistAvatar({ artist, size = 24, style }) {
  const base = { width: size, height: size, borderRadius: '50%', flexShrink: 0, objectFit: 'cover', display: 'inline-block', ...style };
  if (artist?.avatarUrl) return <img src={artist.avatarUrl} alt="" loading="lazy" style={base} />;
  const [a, b] = pickColors(artist?.displayName);
  return (
    <span aria-hidden="true" style={{ ...base, background: `linear-gradient(135deg,${a},${b})`, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: Math.max(8, Math.round(size * 0.4)), fontWeight: 700, letterSpacing: .3 }}>
      {initials(artist?.displayName)}
    </span>
  );
}

// "(avatar) by Name" — the artist credit line used on product cards.
export function ArtistCredit({ artist, prefix = '', size = 18, name, onNameClick, nameStyle }) {
  const label = name ?? artist?.displayName;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, verticalAlign: 'middle', minWidth: 0 }}>
      <ArtistAvatar artist={{ ...artist, displayName: label }} size={size} />
      <span style={nameStyle} onClick={onNameClick}>{prefix}{label}</span>
    </span>
  );
}
