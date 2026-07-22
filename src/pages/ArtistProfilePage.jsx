import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { SDGs } from '../data/constants';
import { useCart } from '../context/CartContext';
import api from '../utils/api';
import Icon from '../components/ui/Icon';

function SdgDot({ id }) {
  const s = SDGs.find(x => x.id === id); if (!s) return null;
  return <span className="sdg" title={s.n} style={{ background: s.c, color: '#fff', width: 22, height: 22, fontSize: 9, borderRadius: 5 }}>{id}</span>;
}

export default function ArtistProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [artist, setArtist] = useState(null);
  const [tab, setTab] = useState('portfolio');
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.getArtist(id).then(setArtist).catch(() => {}).finally(() => setLoading(false)); }, [id]);

  if (loading) return <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="skel" style={{ width: 200, height: 24 }} /></div>;
  if (!artist) return <div className="wrap" style={{ padding: 80, textAlign: 'center' }}><h2>Artist not found</h2></div>;

  const products = artist.products || [];
  const exhibitions = artist.exhibitions || [];
  const awards = artist.awards || [];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--base)' }}>
      {/* Header */}
      <div className="profile-header">
        <div className="profile-header-bg">
          {artist.avatarUrl && <img src={artist.avatarUrl} alt="" />}
          {!artist.avatarUrl && <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,#1B4332,#0d2318)' }} />}
        </div>
        <div className="profile-header-content wrap">
          <div className="breadcrumbs" style={{ marginBottom: 14 }}>
            <Link to="/" style={{ color: 'rgba(255,255,255,.5)' }}>Home</Link><span className="sep" style={{ color: 'rgba(255,255,255,.3)' }}>›</span>
            <Link to="/artists" style={{ color: 'rgba(255,255,255,.5)' }}>Artists</Link><span className="sep" style={{ color: 'rgba(255,255,255,.3)' }}>›</span>
            <span style={{ color: '#fff' }}>{artist.displayName}</span>
          </div>
          <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
            {artist.avatarUrl && <img src={artist.avatarUrl} alt="" style={{ width: 80, height: 80, borderRadius: '50%', border: '3px solid rgba(255,255,255,.2)', objectFit: 'cover' }} />}
            <div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>{artist.sdgIds?.map(id => <SdgDot key={id} id={id} />)}{artist.verified && <span className="badge b-green" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon icon={Check} size="inline" /> Verified</span>}</div>
              <h1 style={{ fontFamily: 'var(--fd)', fontSize: 40, color: '#fff', fontWeight: 600 }}>{artist.displayName}</h1>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,.55)' }}>{artist.location}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 36, marginTop: 24, paddingTop: 18, borderTop: '1px solid rgba(255,255,255,.1)' }}>
            {[['£' + Number(artist.totalSold || 0).toLocaleString(), 'Raised'], [artist.artworkCount || 0, 'Works'], [artist.sdgIds?.length || 0, 'SDGs']].map(([v, l]) => (
              <div key={l}><div style={{ fontFamily: 'var(--fd)', fontSize: 24, color: 'var(--accent)', fontWeight: 700 }}>{v}</div><div style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', letterSpacing: 1, textTransform: 'uppercase' }}>{l}</div></div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="wrap" style={{ paddingTop: 0 }}>
        <div className="tabs-container">
          {['portfolio', 'about', 'exhibitions', 'awards'].map(t => (
            <button key={t} className={`tab-btn${tab === t ? ' active' : ''}`} onClick={() => setTab(t)} style={{ textTransform: 'capitalize' }}>{t}</button>
          ))}
        </div>

        {tab === 'portfolio' && (
          <div className="product-grid" style={{ paddingBottom: 60 }}>
            {products.length === 0 ? <div className="empty"><div className="empty-t">No artworks yet</div></div> : products.map(p => (
              <div key={p.id} className="product-card" onClick={() => navigate(`/shop/${p.slug}`)}>
                <div className="product-card-img">
                  {p.images?.[0]?.url ? <img src={p.images[0].url} alt={p.title} loading="lazy" /> : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(145deg,#1B4332,#2D6A4F)' }} />}
                </div>
                <div className="product-card-body">
                  <h3 style={{ fontFamily: 'var(--fd)', fontSize: 17, fontWeight: 600, marginBottom: 4 }}>{p.title}</h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'var(--fd)', fontSize: 16, color: 'var(--accent)', fontWeight: 700 }}>£{Number(p.basePrice).toLocaleString()}</span>
                    {p.charity?.name && <span style={{ fontSize: 10, color: 'var(--muted)' }}>{p.charity.name}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'about' && (
          <div style={{ maxWidth: 800, paddingBottom: 60 }}>
            {artist.artistStatement && <><div className="lbl" style={{ marginBottom: 10 }}>Artist Statement</div><p style={{ fontFamily: 'var(--fd)', fontSize: 20, fontStyle: 'italic', lineHeight: 1.7, marginBottom: 32, borderLeft: '3px solid var(--sage)', paddingLeft: 20 }}>"{artist.artistStatement}"</p></>}
            {artist.biography && <><div className="lbl" style={{ marginBottom: 10 }}>Biography</div><p style={{ fontSize: 14, color: 'var(--txt2)', lineHeight: 1.85 }}>{artist.biography}</p></>}
            {artist.socialLinks && <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
              {Object.entries(artist.socialLinks).filter(([, v]) => v).map(([k, v]) => <span key={k} className="badge b-muted">{k}: {v}</span>)}
            </div>}
          </div>
        )}

        {tab === 'exhibitions' && (
          <div style={{ maxWidth: 700, paddingBottom: 60 }}>
            {exhibitions.length === 0 ? <div className="empty"><div className="empty-t">No exhibitions listed</div></div> : exhibitions.map((e, i) => (
              <div key={i} className="tl-item">
                <div className="tl-yr">{e.yr}</div>
                <div><div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>{e.title}</div><div style={{ fontSize: 12, color: 'var(--muted)' }}>{e.venue}{e.type && ` · ${e.type}`}</div></div>
              </div>
            ))}
          </div>
        )}

        {tab === 'awards' && (
          <div style={{ maxWidth: 700, paddingBottom: 60 }}>
            {awards.length === 0 ? <div className="empty"><div className="empty-t">No awards listed</div></div> : awards.map((a, i) => (
              <div key={i} className="tl-item">
                <div className="tl-yr">{a.yr}</div>
                <div><div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>{a.title}</div><div style={{ fontSize: 12, color: 'var(--muted)' }}>{a.org}</div></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
