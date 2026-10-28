import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Flag, Check } from 'lucide-react';
import { SDGs } from '../data/constants';
import api from '../utils/api';
import Icon from '../components/ui/Icon';
import { cur } from '../utils/currency';

export const money = (n) => `${cur()}${Number(n || 0).toLocaleString('en-GB', { maximumFractionDigits: 0 })}`;
export const progressPct = (p) => (Number(p.targetAmount) > 0 ? Math.min(100, Math.round((Number(p.raisedAmount) / Number(p.targetAmount)) * 100)) : 0);

export function SdgDot({ id, size = 20 }) {
  const s = SDGs.find(x => x.id === id); if (!s) return null;
  return <span className="sdg" title={s.n} style={{ background: s.c, color: '#fff', width: size, height: size, fontSize: Math.round(size * .45), borderRadius: 4 }}>{id}</span>;
}

export function CampaignProgress({ project }) {
  const pct = progressPct(project);
  const funded = project.status === 'COMPLETED';
  return (
    <div>
      <div className="pb"><div className="pb-fill" style={{ width: `${funded ? 100 : pct}%`, background: 'linear-gradient(90deg,var(--mint),var(--sage))' }} /></div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--muted)', marginTop: 5, gap: 8 }}>
        <span><strong style={{ color: 'var(--accent)' }}>{money(project.raisedAmount)}</strong> raised</span>
        <span>{funded ? 'Funded' : `${pct}% of ${money(project.targetAmount)}`}</span>
      </div>
    </div>
  );
}

export function CampaignCard({ p, onOpen }) {
  const funded = p.status === 'COMPLETED';
  return (
    <div className="product-card" onClick={onOpen} role="link" tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter') onOpen(); }}>
      <div className="campaign-card-img">
        {p.headerImage ? <img src={p.headerImage} alt={p.title} loading="lazy" /> : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(145deg,#1B4332,#2D6A4F)' }} />}
        {funded && <div className="badge b-green" style={{ position: 'absolute', top: 10, left: 10, zIndex: 3, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon icon={Check} size="inline" /> Funded</div>}
      </div>
      <div className="product-card-body">
        <div style={{ display: 'flex', gap: 3, marginBottom: 6, flexWrap: 'wrap' }}>{p.sdgIds?.map(id => <SdgDot key={id} id={id} />)}</div>
        <h3 style={{ fontFamily: 'var(--fd)', fontSize: 20, fontWeight: 600, marginBottom: 3 }}>{p.title}</h3>
        <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 10 }}>by {p.charity?.name}{p.artworkCount > 0 && <> · {p.artworkCount} artwork{p.artworkCount !== 1 ? 's' : ''}</>}</p>
        <p style={{ fontSize: 12, color: 'var(--txt2)', lineHeight: 1.65, marginBottom: 14, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.summary}</p>
        <CampaignProgress project={p} />
      </div>
    </div>
  );
}

export default function CampaignsPage() {
  const navigate = useNavigate();
  const [active, setActive] = useState({ items: [], total: 0, page: 1, pages: 1 });
  const [funded, setFunded] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = (page = 1) => {
    setLoading(true); setError(false);
    api.getProjects({ page, limit: 12 }).then(setActive).catch(() => setError(true)).finally(() => setLoading(false));
  };
  useEffect(() => {
    load(1);
    api.getProjects({ status: 'COMPLETED', limit: 6 }).then(d => setFunded(d.items || [])).catch(() => {});
  }, []);

  const open = (p) => navigate(`/campaigns/${p.slug}`);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--base)' }}>
      <div className="campaigns-head" style={{ background: 'var(--base)', padding: '48px 48px 28px', borderBottom: '1px solid var(--border)' }}>
        <div className="wrap" style={{ padding: 0 }}>
          <div className="breadcrumbs"><Link to="/">Home</Link><span className="sep">›</span><span className="current">Campaigns</span></div>
          <div className="lbl" style={{ marginBottom: 8 }}>Art That Funds Change</div>
          <h1 className="display" style={{ fontSize: 'clamp(34px,5vw,48px)' }}>Impact Campaigns</h1>
          <p style={{ fontSize: 14, color: 'var(--muted)', marginTop: 8, maxWidth: 620 }}>Real projects run by verified charities. Every artwork linked to a campaign helps fund it.</p>
        </div>
      </div>

      <div className="wrap" style={{ paddingTop: 32, paddingBottom: 80 }}>
        {loading ? (
          <div className="product-grid">{[1, 2, 3].map(i => <div key={i} className="skel" style={{ height: 380, borderRadius: 'var(--rl)' }} />)}</div>
        ) : error ? (
          <div className="empty"><div className="empty-t">Couldn’t load campaigns</div><p style={{ color: 'var(--muted)' }}>Please try again in a moment.</p><button className="btn btn-s" style={{ marginTop: 12 }} onClick={() => load(active.page)}>Retry</button></div>
        ) : active.items.length === 0 ? (
          <div className="empty" style={{ padding: 48 }}>
            <div style={{ marginBottom: 12, opacity: .3, display: 'flex', justifyContent: 'center' }}><Icon icon={Flag} size={40} /></div>
            <div className="empty-t">No active campaigns right now</div>
            <p style={{ color: 'var(--muted)' }}>New impact campaigns are coming soon. In the meantime, <Link to="/shop" style={{ color: 'var(--accent)' }}>browse the art</Link>.</p>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 14, fontSize: 13, color: 'var(--muted)' }}>{active.total} active campaign{active.total !== 1 ? 's' : ''}</div>
            <div className="product-grid">{active.items.map(p => <CampaignCard key={p.id} p={p} onOpen={() => open(p)} />)}</div>
            {active.pages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 10, alignItems: 'center', marginTop: 28 }}>
                <button className="btn btn-s btn-sm" disabled={active.page <= 1} onClick={() => load(active.page - 1)}>Previous</button>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>Page {active.page} of {active.pages}</span>
                <button className="btn btn-s btn-sm" disabled={active.page >= active.pages} onClick={() => load(active.page + 1)}>Next</button>
              </div>
            )}
          </>
        )}

        {funded.length > 0 && (
          <div style={{ marginTop: 64 }}>
            <div className="lbl" style={{ marginBottom: 8 }}>Thank you</div>
            <h2 className="display" style={{ fontSize: 32, marginBottom: 20 }}>Funded Campaigns</h2>
            <div className="product-grid">{funded.map(p => <CampaignCard key={p.id} p={p} onOpen={() => open(p)} />)}</div>
          </div>
        )}
      </div>
    </div>
  );
}
