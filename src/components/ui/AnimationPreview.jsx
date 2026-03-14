import { useState, useEffect } from 'react';
import { useCart } from '../../context/CartContext';

export default function AnimationPreview({ product }) {
  const { toast } = useCart();
  const [playing, setPlaying] = useState(false);
  const [prog, setProg] = useState(0);

  useEffect(() => {
    let t;
    if (playing) {
      t = setInterval(() => setProg(p => {
        if (p >= 100) { setPlaying(false); return 0; }
        return p + 0.25;
      }), 100);
    }
    return () => clearInterval(t);
  }, [playing]);

  const imgUrl = product.images?.[0]?.url;
  const hasYouTube = !!product.gallery?.video;

  return (
    <div style={{ borderRadius: 'var(--rl)', overflow: 'hidden', border: '1px solid var(--border)', marginBottom: 20, position: 'relative' }}>
      {/* Video / poster */}
      <div style={{ aspectRatio: '16/9', position: 'relative', background: '#0a0a1a', overflow: 'hidden' }}>
        {hasYouTube && playing ? (
          <iframe
            src={`https://www.youtube.com/embed/${product.gallery.video}?autoplay=1&mute=0&modestbranding=1&rel=0`}
            allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen
            style={{ width: '100%', height: '100%', border: 'none' }}
            title={product.title} />
        ) : (
          <>
            {imgUrl ? (
              <img src={imgUrl} alt={product.title} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: .85 }} />
            ) : (
              <div style={{ width: '100%', height: '100%', background: 'linear-gradient(145deg,#051510,#52C47C44)' }} />
            )}
            {/* Gradient overlay */}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(0,0,0,.6) 0%,rgba(0,0,0,.15) 50%,transparent 100%)' }} />

            {/* Play state */}
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              {!playing ? (
                <>
                  <button onClick={() => {
                    if (hasYouTube) { setPlaying(true); }
                    else { setPlaying(true); toast('Preview playing — buy for full 4K resolution', 'info'); }
                  }} style={{
                    width: 72, height: 72, borderRadius: '50%', background: 'rgba(255,255,255,.12)',
                    backdropFilter: 'blur(12px)', border: '2px solid rgba(255,255,255,.4)',
                    cursor: 'pointer', fontSize: 28, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all .2s', boxShadow: '0 8px 40px rgba(0,0,0,.3)',
                  }}
                    onMouseEnter={e => { e.target.style.background = 'rgba(255,255,255,.2)'; e.target.style.transform = 'scale(1.08)'; }}
                    onMouseLeave={e => { e.target.style.background = 'rgba(255,255,255,.12)'; e.target.style.transform = 'scale(1)'; }}>
                    ▶
                  </button>
                  <div style={{ marginTop: 14, fontSize: 12, color: 'rgba(255,255,255,.6)', fontFamily: 'var(--fb)', textAlign: 'center' }}>
                    {product.previewUrl || 'Preview available'}
                  </div>
                </>
              ) : !hasYouTube ? (
                <div style={{ width: '85%' }}>
                  <div style={{ height: 3, background: 'rgba(255,255,255,.2)', borderRadius: 2, overflow: 'hidden', marginBottom: 8 }}>
                    <div style={{ height: '100%', background: '#fff', width: `${prog}%`, transition: 'width .1s linear' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(255,255,255,.6)' }}>
                    <span>Preview playing…</span>
                    <button onClick={() => { setPlaying(false); setProg(0); }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.6)', cursor: 'pointer', fontSize: 11, fontFamily: 'var(--fb)' }}>■ Stop</button>
                  </div>
                </div>
              ) : null}
            </div>
          </>
        )}
      </div>

      {/* Info bar */}
      <div style={{ padding: '10px 18px', background: 'var(--glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 12, fontSize: 11 }}>
          {product.fileFormat && <span style={{ color: 'var(--muted)', fontFamily: 'var(--fm)' }}>{product.fileFormat}</span>}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {hasYouTube && <span className="badge b-red" style={{ fontSize: 9, padding: '2px 8px' }}>YouTube</span>}
          <span className="badge b-muted" style={{ fontSize: 9, padding: '2px 8px' }}>{product.category}</span>
        </div>
      </div>
    </div>
  );
}
