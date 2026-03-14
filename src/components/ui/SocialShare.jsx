export default function SocialShare({ title, url }) {
  const encoded = encodeURIComponent(url || window.location.href);
  const text = encodeURIComponent(title || '');

  const platforms = [
    { name: 'Twitter', icon: '𝕏', href: `https://twitter.com/intent/tweet?text=${text}&url=${encoded}` },
    { name: 'Facebook', icon: 'f', href: `https://www.facebook.com/sharer/sharer.php?u=${encoded}` },
    { name: 'WhatsApp', icon: '💬', href: `https://wa.me/?text=${text}%20${encoded}` },
    { name: 'Copy Link', icon: '🔗', href: null },
  ];

  const copy = () => {
    navigator.clipboard.writeText(url || window.location.href);
  };

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>Share</span>
      {platforms.map(p => (
        p.href ? (
          <a key={p.name} href={p.href} target="_blank" rel="noopener noreferrer" title={p.name}
            style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--glass)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: 'var(--muted)', textDecoration: 'none', transition: 'all .15s' }}
            onMouseEnter={e => { e.target.style.background = 'var(--glassh)'; e.target.style.color = 'var(--accent)'; }}
            onMouseLeave={e => { e.target.style.background = 'var(--glass)'; e.target.style.color = 'var(--muted)'; }}>
            {p.icon}
          </a>
        ) : (
          <button key={p.name} onClick={copy} title="Copy link"
            style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--glass)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: 'var(--muted)', cursor: 'pointer', transition: 'all .15s' }}>
            {p.icon}
          </button>
        )
      ))}
    </div>
  );
}
