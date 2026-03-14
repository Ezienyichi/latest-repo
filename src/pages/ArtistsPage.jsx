import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { SDGs } from '../data/constants';
import api from '../utils/api';

function SdgDot({ id }) {
  const s = SDGs.find(x => x.id === id); if (!s) return null;
  return <span className="sdg" title={s.n} style={{ background: s.c, color: '#fff', width: 20, height: 20, fontSize: 9, borderRadius: 4 }}>{id}</span>;
}

export default function ArtistsPage() {
  const navigate = useNavigate();
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.getArtists().then(setArtists).catch(() => {}).finally(() => setLoading(false)); }, []);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--base)' }}>
      <div style={{ background: 'var(--base)', padding: '48px 48px 28px', borderBottom: '1px solid var(--border)' }}>
        <div className="wrap">
          <div className="breadcrumbs"><Link to="/">Home</Link><span className="sep">›</span><span className="current">Artists</span></div>
          <div className="lbl" style={{ marginBottom: 8 }}>Our Community</div>
          <h1 className="display" style={{ fontSize: 48 }}>Artists & Creatives</h1>
          <p style={{ fontSize: 14, color: 'var(--muted)', marginTop: 8 }}>{artists.length} artists creating art that funds change</p>
        </div>
      </div>
      <div className="wrap" style={{ paddingTop: 32, paddingBottom: 80 }}>
        {loading ? <div className="g3">{[1,2,3,4,5,6].map(i => <div key={i} className="skel" style={{ height: 300, borderRadius: 'var(--rl)' }} />)}</div> : (
          <div className="g3" style={{ gap: 24 }}>
            {artists.map(a => (
              <div key={a.id} className="card card-h" style={{ padding: 0, overflow: 'hidden', cursor: 'pointer' }} onClick={() => navigate(`/artists/${a.id}`)}>
                <div style={{ height: 200, overflow: 'hidden', position: 'relative' }}>
                  {a.avatarUrl ? <img src={a.avatarUrl} alt={a.displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(145deg,#1B4332,#2D6A4F)' }} />}
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(0,0,0,.7) 0%,transparent 60%)' }} />
                  <div style={{ position: 'absolute', bottom: 14, left: 14, right: 14 }}>
                    <h3 style={{ fontFamily: 'var(--fd)', fontSize: 22, color: '#fff', fontWeight: 600 }}>{a.displayName}</h3>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,.6)' }}>{a.location}</div>
                  </div>
                  {a.verified && <div className="badge b-green" style={{ position: 'absolute', top: 12, right: 12 }}>✓ Verified</div>}
                </div>
                <div style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', gap: 3, marginBottom: 8 }}>{a.sdgIds?.slice(0, 5).map(id => <SdgDot key={id} id={id} />)}</div>
                  <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 10, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{a.artistStatement}</p>
                  <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
                    <span><strong style={{ color: 'var(--accent)' }}>£{Number(a.totalSold || 0).toLocaleString()}</strong> <span style={{ color: 'var(--muted)' }}>raised</span></span>
                    <span><strong>{a.artworkCount}</strong> <span style={{ color: 'var(--muted)' }}>works</span></span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
