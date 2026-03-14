import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import api from '../utils/api';

export default function MyCertificatesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useCart();
  const [certs, setCerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    api.get('/certificates/my-certificates').then(setCerts).catch(() => {}).finally(() => setLoading(false));
  }, [user]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--base)', paddingBottom: 80 }}>
      <div style={{ padding: '48px 48px 28px', borderBottom: '1px solid var(--border)' }}>
        <div className="wrap">
          <div className="breadcrumbs"><Link to="/">Home</Link><span className="sep">›</span><span className="current">My Certificates</span></div>
          <h1 className="display" style={{ fontSize: 44 }}>My Certificates</h1>
          <p style={{ fontSize: 14, color: 'var(--muted)', marginTop: 6 }}>Premium Certificates of Authenticity from your purchases</p>
        </div>
      </div>
      <div className="wrap" style={{ paddingTop: 28, maxWidth: 900 }}>
        {loading ? <div>{[1,2].map(i => <div key={i} className="skel" style={{ height: 120, borderRadius: 'var(--rl)', marginBottom: 12 }} />)}</div> : certs.length === 0 ? (
          <div className="empty" style={{ padding: 48 }}>
            <div style={{ fontSize: 48, marginBottom: 12, opacity: .3 }}>🏛</div>
            <div className="empty-t">No certificates yet</div>
            <p style={{ color: 'var(--muted)', marginBottom: 20 }}>Purchase artwork with the Certificate of Authenticity badge to receive premium certificates</p>
            <button className="btn btn-p btn-lg" onClick={() => navigate('/shop')}>Browse Artworks →</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {certs.map(c => (
              <div key={c.certificateId} className="card" style={{ padding: 22, display: 'flex', gap: 18, alignItems: 'center' }}>
                <div style={{ width: 72, height: 72, borderRadius: 10, overflow: 'hidden', flexShrink: 0, border: '2px solid var(--gold)', background: 'var(--glass)' }}>
                  {c.image ? <img src={c.image.replace('w=1200', 'w=140')} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', background: '#1B4332' }} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--fd)', fontSize: 20, fontWeight: 600, marginBottom: 2 }}>{c.artwork}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>by {c.artist}{c.charity ? ` · ${c.charity}` : ''}</div>
                  <div style={{ fontFamily: 'var(--fm)', fontSize: 11, color: 'var(--gold)' }}>ID: {c.certificateId}</div>
                  <div style={{ fontSize: 10, color: 'var(--subtle)', marginTop: 2 }}>Purchased: {new Date(c.purchaseDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                  <button className="btn btn-gold btn-sm" onClick={() => navigate(`/verify/${c.certificateId}`)}>View Certificate</button>
                  <button className="btn btn-s btn-sm" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/verify/${c.certificateId}`); toast('Verification link copied!', 'ok'); }}>Copy Link</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
