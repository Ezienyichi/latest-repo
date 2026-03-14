import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { SDGs } from '../data/constants';
import api from '../utils/api';

function SdgDot({ id }) {
  const s = SDGs.find(x => x.id === id); if (!s) return null;
  return <span className="sdg" title={s.n} style={{ background: s.c, color: '#fff', width: 20, height: 20, fontSize: 9, borderRadius: 4 }}>{id}</span>;
}

export default function CharitiesPage() {
  const navigate = useNavigate();
  const [charities, setCharities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.getCharities().then(setCharities).catch(() => {}).finally(() => setLoading(false)); }, []);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--base)' }}>
      <div style={{ background: 'var(--base)', padding: '48px 48px 28px', borderBottom: '1px solid var(--border)' }}>
        <div className="wrap">
          <div className="breadcrumbs"><Link to="/">Home</Link><span className="sep">›</span><span className="current">Charities</span></div>
          <div className="lbl" style={{ marginBottom: 8 }}>Impact Partners</div>
          <h1 className="display" style={{ fontSize: 48 }}>Charities & NGOs</h1>
          <p style={{ fontSize: 14, color: 'var(--muted)', marginTop: 8 }}>{charities.length} verified organisations creating real-world impact</p>
        </div>
      </div>

      {/* What we provide for charities */}
      <div className="wrap" style={{ paddingTop: 28 }}>
        <div className="alert alert-ok" style={{ marginBottom: 28 }}>
          <span>🌿</span>
          <div><strong>For charities on our platform:</strong> High possibility to receive capital campaigns, major gifts, recurrent donations, and publicity through creative partnerships with value-driven artists and collectors.</div>
        </div>
      </div>

      <div className="wrap" style={{ paddingBottom: 80 }}>
        {loading ? <div className="g2">{[1,2,3,4].map(i => <div key={i} className="skel" style={{ height: 260, borderRadius: 'var(--rl)' }} />)}</div> : (
          <div className="g2" style={{ gap: 24 }}>
            {charities.map(c => {
              const pct = c.target > 0 ? Math.min(100, Math.round((Number(c.raised) / Number(c.target)) * 100)) : 0;
              return (
                <div key={c.id} className="card card-h" style={{ padding: 28, cursor: 'pointer' }} onClick={() => navigate(`/charities/${c.id}`)}>
                  <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 16 }}>
                    <div style={{ fontSize: 36 }}>{c.logo || '🌿'}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>{c.sdgIds?.map(id => <SdgDot key={id} id={id} />)}{c.verified && <span className="badge b-green">✓ Verified</span>}</div>
                      <h3 style={{ fontFamily: 'var(--fd)', fontSize: 24, fontWeight: 600, marginBottom: 4 }}>{c.name}</h3>
                      {c.registrationNo && <div style={{ fontSize: 11, color: 'var(--muted)' }}>Reg: {c.registrationNo}</div>}
                    </div>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--txt2)', lineHeight: 1.7, marginBottom: 16 }}>{c.mission?.slice(0, 160)}{c.mission?.length > 160 ? '…' : ''}</p>
                  <div style={{ marginBottom: 10 }}>
                    <div className="pb"><div className="pb-fill" style={{ width: `${pct}%`, background: 'linear-gradient(90deg,var(--mint),var(--sage))' }} /></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                      <span>£{Number(c.raised).toLocaleString()} raised</span><span>£{Number(c.target).toLocaleString()} target</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 24, fontSize: 12 }}>
                    <span><strong style={{ color: 'var(--accent)' }}>{c.funderCount?.toLocaleString()}</strong> funders</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
