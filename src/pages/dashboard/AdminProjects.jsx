import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flag, Plus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import DashboardShell from './DashboardShell';
import Icon from '../../components/ui/Icon';
import api from '../../utils/api';
import { cur } from '../../utils/currency';

export const PROJECT_STATUS_BADGE = { DRAFT: 'b-gold', ACTIVE: 'b-green', COMPLETED: 'b-blue', ARCHIVED: 'b-muted' };
const money = (n) => `${cur()}${Number(n || 0).toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

export default function AdminProjects() {
  const { user } = useAuth();
  const { toast } = useCart();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [charities, setCharities] = useState([]);
  const [status, setStatus] = useState('');
  const [charityId, setCharityId] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => { if (user && user.role !== 'ADMIN') navigate('/'); }, [user]);
  useEffect(() => { api.getCharities().then(setCharities).catch(() => {}); }, []);

  const load = (p = 1) => {
    setLoading(true);
    const q = { page: p, limit: 20 };
    if (status) q.status = status;
    if (charityId) q.charityId = charityId;
    if (search.trim()) q.search = search.trim();
    api.getAdminProjects(q).then(d => {
      setItems(d.items || []); setTotal(d.total || 0); setPages(d.pages || 1); setPage(d.page || 1);
    }).catch(e => toast(e.message || 'Failed to load campaigns', 'err')).finally(() => setLoading(false));
  };

  useEffect(() => { load(1); }, []);

  return (
    <DashboardShell title="Campaigns">
      <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        <select className="fi fsel" value={status} onChange={e => setStatus(e.target.value)} style={{ width: 150 }}>
          <option value="">All Statuses</option>
          {['DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="fi fsel" value={charityId} onChange={e => setCharityId(e.target.value)} style={{ width: 200 }}>
          <option value="">All Charities</option>
          {charities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input className="fi" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search title..." style={{ width: 200 }} onKeyDown={e => e.key === 'Enter' && load(1)} />
        <button className="btn btn-s" onClick={() => load(1)}>Filter</button>
        <div style={{ flex: 1 }} />
        <button className="btn btn-p" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={() => navigate('/dashboard/admin/projects/new')}>
          <Icon icon={Plus} size="inline" /> New Campaign
        </button>
      </div>

      {loading ? <div>{[1, 2, 3].map(i => <div key={i} className="skel" style={{ height: 56, borderRadius: 8, marginBottom: 8 }} />)}</div> : items.length === 0 ? (
        <div className="empty" style={{ padding: 48 }}>
          <div style={{ marginBottom: 12, opacity: .3, display: 'flex', justifyContent: 'center' }}><Icon icon={Flag} size={40} /></div>
          <div className="empty-t">No campaigns found</div>
          <p style={{ color: 'var(--muted)' }}>Create a campaign, or try different filters</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'auto' }}>
          <table className="tbl">
            <thead><tr><th>Campaign</th><th>Charity</th><th>Status</th><th>Target</th><th>Raised</th><th>Artworks</th></tr></thead>
            <tbody>
              {items.map(p => {
                const pct = Number(p.targetAmount) > 0 ? Math.min(100, Math.round((Number(p.raisedAmount) / Number(p.targetAmount)) * 100)) : 0;
                return (
                  <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/dashboard/admin/projects/${p.id}`)}>
                    <td style={{ fontSize: 13, fontWeight: 600 }}>{p.title}</td>
                    <td style={{ fontSize: 12 }}>
                      <div>{p.charity?.name}</div>
                      <div style={{ color: 'var(--muted)', fontSize: 11 }}>charity total {money(p.charityRaised)}</div>
                    </td>
                    <td><span className={`badge ${PROJECT_STATUS_BADGE[p.status] || 'b-muted'}`} style={{ fontSize: 10 }}>{p.status}</span></td>
                    <td style={{ fontFamily: 'var(--fd)', fontWeight: 700 }}>{money(p.targetAmount)}</td>
                    <td style={{ minWidth: 120 }}>
                      <div style={{ fontFamily: 'var(--fd)', fontWeight: 700, color: 'var(--accent)' }}>{money(p.raisedAmount)}</div>
                      <div style={{ height: 4, borderRadius: 2, background: 'var(--border)', marginTop: 4 }}><div style={{ height: '100%', width: `${pct}%`, borderRadius: 2, background: 'var(--accent)' }} /></div>
                      <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{pct}%</div>
                    </td>
                    <td style={{ fontSize: 12 }}>{p._count?.products ?? 0}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>{total} campaign{total !== 1 ? 's' : ''}</div>
        {pages > 1 && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="btn btn-s btn-sm" disabled={page <= 1} onClick={() => load(page - 1)}>Previous</button>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>Page {page} of {pages}</span>
            <button className="btn btn-s btn-sm" disabled={page >= pages} onClick={() => load(page + 1)}>Next</button>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
