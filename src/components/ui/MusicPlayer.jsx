import { useState, useEffect } from 'react';
import { useCart } from '../../context/CartContext';

export default function MusicPlayer({ product }) {
  const { toast } = useCart();
  const [playing, setPlaying] = useState(false);
  const [prog, setProg] = useState(0);
  const [sel, setSel] = useState(0);

  // Parse tracklist from product data or tags
  const tracklist = product.tags?.filter(t => t.includes('('))?.length > 0
    ? product.tags.filter(t => t.includes('('))
    : null;
  const tracks = tracklist || [product.title];

  useEffect(() => {
    let t;
    if (playing) {
      t = setInterval(() => setProg(p => {
        if (p >= 100) { setPlaying(false); return 0; }
        return p + 0.5;
      }), 100);
    }
    return () => clearInterval(t);
  }, [playing]);

  const togglePlay = () => {
    setPlaying(p => !p);
    if (!playing) toast('Preview playing — buy for lossless quality', 'info');
  };

  const selectTrack = (i) => {
    setSel(i); setPlaying(true); setProg(0);
    toast('Preview playing', 'info');
  };

  const imgUrl = product.images?.[0]?.url;

  return (
    <div style={{ background: 'var(--panel)', border: '1px solid var(--borderl)', borderRadius: 'var(--rl)', overflow: 'hidden', marginBottom: 20 }}>
      {/* Now playing bar */}
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12, alignItems: 'center' }}>
        <div style={{ width: 52, height: 52, borderRadius: 'var(--rs)', overflow: 'hidden', flexShrink: 0, background: 'linear-gradient(145deg,#041525,#2EB8E644)' }}>
          {imgUrl ? <img src={imgUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🎵</div>}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tracks[sel]}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>{product.artist?.displayName} · Track {sel + 1}/{tracks.length}</div>
        </div>
        <button onClick={togglePlay} style={{
          width: 42, height: 42, borderRadius: '50%', background: 'var(--mint)', border: 'none',
          cursor: 'pointer', fontSize: 16, color: '#fff', display: 'flex', alignItems: 'center',
          justifyContent: 'center', flexShrink: 0, transition: 'all .15s', boxShadow: playing ? '0 0 20px rgba(23,124,29,.3)' : 'none',
        }}>
          {playing ? '⏸' : '▶'}
        </button>
      </div>

      {/* Progress bar */}
      <div style={{ padding: '8px 18px', background: 'var(--glass)' }}>
        <div style={{ height: 3, background: 'var(--border)', borderRadius: 2, marginBottom: 4, overflow: 'hidden', cursor: 'pointer' }}
          onClick={e => { const rect = e.target.getBoundingClientRect(); setProg((e.clientX - rect.left) / rect.width * 100); }}>
          <div style={{ height: '100%', background: 'linear-gradient(90deg,var(--mint),var(--sage))', width: `${prog}%`, transition: 'width .1s linear' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--fm)' }}>
          <span>Preview · {product.fileFormat?.split('+')[0]?.trim() || ''}</span>
          <span>{Math.floor(prog * 0.3)}:{String(Math.floor((prog * 18) % 60)).padStart(2, '0')}</span>
        </div>
      </div>

      {/* Tracklist */}
      <div style={{ maxHeight: 180, overflowY: 'auto' }}>
        {tracks.slice(0, 12).map((t, i) => (
          <div key={i} onClick={() => selectTrack(i)} style={{
            padding: '9px 18px', fontSize: 12, cursor: 'pointer', display: 'flex', gap: 10, alignItems: 'center',
            background: sel === i ? 'rgba(23,124,29,.1)' : 'transparent', transition: 'background .15s',
            borderBottom: '1px solid var(--border)',
          }}>
            <span style={{ fontFamily: 'var(--fm)', fontSize: 10, color: 'var(--muted)', minWidth: 18, textAlign: 'right' }}>{i + 1}</span>
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: sel === i ? 'var(--accent)' : 'var(--txt2)', fontWeight: sel === i ? 500 : 400 }}>{t}</span>
            {sel === i && playing && (
              <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 14 }}>
                {[3, 5, 2, 4].map((h, j) => (
                  <div key={j} style={{ width: 2, height: h + (playing ? Math.sin(Date.now() / 200 + j) * 3 : 0), background: 'var(--accent)', borderRadius: 1, transition: 'height .15s' }} />
                ))}
              </div>
            )}
          </div>
        ))}
        {tracks.length > 12 && <div style={{ padding: '8px 18px', fontSize: 11, color: 'var(--muted)' }}>+{tracks.length - 12} more in full release</div>}
      </div>
    </div>
  );
}
