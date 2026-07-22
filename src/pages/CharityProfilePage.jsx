import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { SDGs } from '../data/constants';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import api from '../utils/api';

function SdgDot({ id }) {
  const s = SDGs.find(x => x.id === id); if (!s) return null;
  return <span className="sdg" title={s.n} style={{ background: s.c, color: '#fff', width: 26, height: 26, fontSize: 10, borderRadius: 5 }}>{id}</span>;
}

export default function CharityProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useCart();
  const [charity, setCharity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [email, setEmail] = useState('');

  useEffect(() => { api.getCharity(id).then(setCharity).catch(() => {}).finally(() => setLoading(false)); }, [id]);

  if (loading) return <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="skel" style={{ width: 200, height: 24 }} /></div>;
  if (!charity) return <div className="wrap" style={{ padding: 80, textAlign: 'center' }}><h2>Charity not found</h2></div>;

  const pct = charity.target > 0 ? Math.min(100, Math.round((Number(charity.raised) / Number(charity.target)) * 100)) : 0;
  const resources = charity.resources || [];
  const partners = charity.partnerships?.map(p => p.artist) || [];

  const downloadResource = async (resource) => {
    try {
      const params = new URLSearchParams({ bucket: 'charity-docs', path: resource.fileUrl, context: 'charity-resource', refId: resource.id });
      const { signedUrl } = await api.get(`/uploads/download?${params}`);
      window.open(signedUrl, '_blank');
    } catch (e) { toast(e.message || 'Could not download this resource', 'err'); }
  };

  const becomeFunder = async () => {
    if (!user) { toast('Sign in to become a funder', 'err'); return; }
    try {
      await api.becomeFunder(id);
      toast(`You're now supporting ${charity.name}! 🌿`, 'ok');
    } catch (e) { toast(e.message, 'err'); }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--base)' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#0d2318 0%,#1B4332 50%,#0d2318 100%)', padding: '56px 48px 32px' }}>
        <div className="wrap">
          <div className="breadcrumbs" style={{ marginBottom: 14 }}>
            <Link to="/" style={{ color: 'rgba(255,255,255,.5)' }}>Home</Link><span className="sep" style={{ color: 'rgba(255,255,255,.3)' }}>›</span>
            <Link to="/charities" style={{ color: 'rgba(255,255,255,.5)' }}>Charities</Link><span className="sep" style={{ color: 'rgba(255,255,255,.3)' }}>›</span>
            <span style={{ color: '#fff' }}>{charity.name}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 20, flexWrap: 'wrap' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>{charity.sdgIds?.map(id => <SdgDot key={id} id={id} />)}{charity.verified && <span className="badge b-green">✓ Verified</span>}</div>
              <h1 style={{ fontFamily: 'var(--fd)', fontSize: 44, color: '#fff', fontWeight: 600, marginBottom: 4 }}>{charity.logo} {charity.name}</h1>
              {charity.registrationNo && <div style={{ fontSize: 12, color: 'rgba(255,255,255,.45)' }}>Reg: {charity.registrationNo}</div>}
            </div>
            <button className="btn btn-p" onClick={() => navigate('/shop')}>Support via Art Purchase</button>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{ background: 'var(--panel)', borderBottom: '1px solid var(--border)' }}>
        <div className="wrap" style={{ padding: '16px 48px', display: 'flex', gap: 44, flexWrap: 'wrap' }}>
          {[['Funders', (charity.funderCount || 0).toLocaleString()], ['Raised', `£${Number(charity.raised).toLocaleString()}`], ['SDGs', charity.sdgIds?.length], ['Target', `£${Number(charity.target).toLocaleString()}`]].map(([l, v]) => (
            <div key={l}><div className="display" style={{ fontSize: 26, color: 'var(--accent)' }}>{v}</div><div style={{ fontSize: 10, color: 'var(--muted)' }}>{l}</div></div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="wrap" style={{ paddingTop: 0 }}>
        <div className="tabs-container">
          {['overview', 'resources', 'artists'].map(t => (
            <button key={t} className={`tab-btn${tab === t ? ' active' : ''}`} onClick={() => setTab(t)} style={{ textTransform: 'capitalize' }}>{t}</button>
          ))}
        </div>

        {tab === 'overview' && (
          <div style={{ maxWidth: 860, paddingBottom: 60 }}>
            <p style={{ fontFamily: 'var(--fd)', fontSize: 20, lineHeight: 1.7, fontStyle: 'italic', marginBottom: 28, borderLeft: '3px solid var(--sage)', paddingLeft: 20 }}>"{charity.mission}"</p>
            <div style={{ marginBottom: 24 }}>
              <div className="lbl" style={{ marginBottom: 10 }}>Fundraising Progress</div>
              <div className="pb"><div className="pb-fill" style={{ width: `${pct}%`, background: 'linear-gradient(90deg,var(--mint),var(--sage))' }} /></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--muted)', marginTop: 6 }}>
                <span>£{Number(charity.raised).toLocaleString()} raised ({pct}%)</span><span>£{Number(charity.target).toLocaleString()} target</span>
              </div>
            </div>

            {/* What we provide */}
            <div className="alert alert-ok" style={{ marginBottom: 20 }}>
              <span>🌿</span>
              <div><strong>What we provide:</strong> High possibility to receive capital campaigns, major gifts, recurrent donations, and publicity for charities registered on our platform.</div>
            </div>

            {/* Newsletter / Become Funder */}
            <div style={{ marginTop: 28 }}>
              <div className="lbl" style={{ marginBottom: 12 }}>Become a Funder</div>
              <div className="alert alert-i" style={{ marginBottom: 14 }}>Becoming a funder registers you to receive updates and resources from {charity.name}. Your personal details remain private.</div>
              {user ? (
                <button className="btn btn-p" onClick={becomeFunder}>Become a Funder of {charity.name} 🌿</button>
              ) : (
                <div style={{ display: 'flex', gap: 10, maxWidth: 420 }}>
                  <input className="fi" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} style={{ flex: 1 }} />
                  <button className="btn btn-p" onClick={() => { toast('Sign in or register to become a funder', 'info'); navigate('/register'); }}>Support</button>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'resources' && (
          <div style={{ maxWidth: 700, paddingBottom: 60 }}>
            {resources.length > 0 ? (
              <table className="tbl">
                <thead><tr><th>Resource</th><th>Type</th><th>Visibility</th><th></th></tr></thead>
                <tbody>
                  {resources.map(r => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 500 }}>{r.title}</td>
                      <td><span className="badge b-blue" style={{ fontSize: 10 }}>{r.fileType?.toUpperCase()}</span></td>
                      <td><span className={`badge ${r.visibility === 'PUBLIC' ? 'b-green' : 'b-gold'}`} style={{ fontSize: 10 }}>{r.visibility?.toLowerCase()}</span></td>
                      <td><button className="btn btn-s btn-sm" onClick={() => downloadResource(r)}>Download</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <div className="empty"><div className="empty-t">No resources yet</div></div>}
          </div>
        )}

        {tab === 'artists' && (
          <div style={{ paddingBottom: 60 }}>
            {partners.length > 0 ? (
              <div className="g4" style={{ gap: 16 }}>
                {partners.map(a => (
                  <div key={a.id} className="card card-h" style={{ textAlign: 'center', padding: 20, cursor: 'pointer' }} onClick={() => navigate(`/artists/${a.id}`)}>
                    {a.avatarUrl ? <img src={a.avatarUrl} alt="" style={{ width: 60, height: 60, borderRadius: '50%', objectFit: 'cover', margin: '0 auto 10px' }} /> : <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--glass)', margin: '0 auto 10px' }} />}
                    <div style={{ fontFamily: 'var(--fd)', fontSize: 16, fontWeight: 600 }}>{a.displayName}</div>
                  </div>
                ))}
              </div>
            ) : <div className="empty"><div className="empty-t">No partnered artists yet</div></div>}
          </div>
        )}
      </div>
    </div>
  );
}
