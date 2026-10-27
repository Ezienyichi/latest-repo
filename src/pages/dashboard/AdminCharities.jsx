import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HeartHandshake, Plus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import DashboardShell from './DashboardShell';
import CharityLogo from '../../components/ui/CharityLogo';
import Icon from '../../components/ui/Icon';
import api from '../../utils/api';
import { cur } from '../../utils/currency';

const money = (n) => `${cur()}${Number(n || 0).toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

export default function AdminCharities() {
  const { user } = useAuth();
  const { toast } = useCart();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => { if (user && user.role !== 'ADMIN') navigate('/'); }, [user]);

  const load = (p = 1) => {
    setLoading(true);
    const q = { page: p, limit: 20 };
    if (verified) q.verified = verified;
    if (search.trim()) q.search = search.trim();
    api.getAdminCharities(q).then(d => {
      setItems(d.items || []); setTotal(d.total || 0); setPages(d.pages || 1); setPage(d.page || 1);
    }).catch(e => toast(e.message || 'Failed to load charities', 'err')).finally(() => setLoading(false));
  };

  useEffect(() => { load(1); }, []);

  return (
    <DashboardShell title="Charities">
      <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        <select className="fi fsel" value={verified} onChange={e => setVerified(e.target.value)} style={{ width: 160 }}>
          <option value="">All Charities</option>
          <option value="true">Verified</option>
          <option value="false">Unverified</option>
        </select>
        <input className="fi" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or reg. no…" style={{ width: 220 }} onKeyDown={e => e.key === 'Enter' && load(1)} />
        <button className="btn btn-s" onClick={() => load(1)}>Filter</button>
        <div style={{ flex: 1 }} />
        <button className="btn btn-p" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={() => navigate('/dashboard/admin/charities/new')}>
          <Icon icon={Plus} size="inline" /> New Charity
        </button>
      </div>

      {loading ? <div>{[1, 2, 3].map(i => <div key={i} className="skel" style={{ height: 56, borderRadius: 8, marginBottom: 8 }} />)}</div> : items.length === 0 ? (
        <div className="empty" style={{ padding: 48 }}>
          <div style={{ marginBottom: 12, opacity: .3, display: 'flex', justifyContent: 'center' }}><Icon icon={HeartHandshake} size={40} /></div>
          <div className="empty-t">No charities found</div>
          <p style={{ color: 'var(--muted)' }}>Add a charity so campaigns can be linked to it, or try different filters</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'auto' }}>
          <table className="tbl">
            <thead><tr><th></th><th>Charity</th><th>Reg. No.</th><th>Status</th><th>Campaigns</th><th>Raised</th><th>Target</th></tr></thead>
            <tbody>
              {items.map(c => (
                <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/dashboard/admin/charities/${c.id}`)}>
                  <td style={{ width: 44 }}><CharityLogo logo={c.logo} size={32} /></td>
                  <td style={{ fontSize: 13, fontWeight: 600 }}>
                    {c.name}
                    {c.hasLoginAccount && <div style={{ color: 'var(--muted)', fontSize: 11, fontWeight: 400 }}>has its own login</div>}
                  </td>
                  <td style={{ fontSize: 12 }}>{c.registrationNo || '—'}</td>
                  <td><span className={`badge ${c.verified ? 'b-green' : 'b-gold'}`} style={{ fontSize: 10 }}>{c.verified ? 'VERIFIED' : 'UNVERIFIED'}</span></td>
                  <td style={{ fontSize: 12 }}>{c._count?.projects ?? 0}</td>
                  <td style={{ fontFamily: 'var(--fd)', fontWeight: 700, color: 'var(--accent)' }}>{money(c.charityRaised)}</td>
                  <td style={{ fontSize: 12 }}>{Number(c.target) > 0 ? money(c.target) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>{total} charit{total !== 1 ? 'ies' : 'y'}</div>
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
