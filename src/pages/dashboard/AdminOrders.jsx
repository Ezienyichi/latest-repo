import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import DashboardShell from './DashboardShell';
import Icon from '../../components/ui/Icon';
import api from '../../utils/api';

// Same style map OrdersPage.jsx (buyer-facing order history) uses — the
// most complete status treatment already in the codebase, covering every
// OrderStatus value including CANCELLED/REFUNDED.
const STATUS_STYLES = {
  PENDING: { bg: 'rgba(255,173,0,.08)', border: 'rgba(255,173,0,.2)', color: '#b37800' },
  PROCESSING: { bg: 'rgba(59,130,246,.08)', border: 'rgba(59,130,246,.18)', color: '#3b82f6' },
  SHIPPED: { bg: 'rgba(139,92,246,.08)', border: 'rgba(139,92,246,.18)', color: '#8b5cf6' },
  DELIVERED: { bg: 'rgba(23,124,29,.08)', border: 'rgba(23,124,29,.18)', color: '#177c1d' },
  CANCELLED: { bg: 'rgba(220,38,38,.08)', border: 'rgba(220,38,38,.18)', color: '#dc2626' },
  REFUNDED: { bg: 'rgba(107,114,128,.08)', border: 'rgba(107,114,128,.18)', color: '#6b7280' },
};

export default function AdminOrders() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => { if (user && user.role !== 'ADMIN') navigate('/'); }, [user]);

  const load = (p = page) => {
    setLoading(true);
    const q = { page: p, limit: 20 };
    if (status) q.status = status;
    if (buyerEmail) q.buyerEmail = buyerEmail;
    if (dateFrom) q.dateFrom = dateFrom;
    if (dateTo) q.dateTo = dateTo;
    api.getAdminOrders(q).then(d => {
      setOrders(d.items || []); setTotal(d.total || 0); setPages(d.pages || 1); setPage(d.page || 1);
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(1); }, []);

  const filter = () => load(1);

  return (
    <DashboardShell title="Orders">
      <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        <select className="fi fsel" value={status} onChange={e => setStatus(e.target.value)} style={{ width: 150 }}>
          <option value="">All Statuses</option>
          {['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input className="fi" value={buyerEmail} onChange={e => setBuyerEmail(e.target.value)} placeholder="Buyer email..." style={{ width: 200 }} onKeyDown={e => e.key === 'Enter' && filter()} />
        <label style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
          From <input className="fi" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ width: 150 }} />
        </label>
        <label style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
          To <input className="fi" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ width: 150 }} />
        </label>
        <button className="btn btn-s" onClick={filter}>Filter</button>
      </div>

      {loading ? <div>{[1, 2, 3].map(i => <div key={i} className="skel" style={{ height: 56, borderRadius: 8, marginBottom: 8 }} />)}</div> : orders.length === 0 ? (
        <div className="empty" style={{ padding: 48 }}>
          <div style={{ marginBottom: 12, opacity: .3, display: 'flex', justifyContent: 'center' }}><Icon icon={Package} size={40} /></div>
          <div className="empty-t">No orders found</div>
          <p style={{ color: 'var(--muted)' }}>Try different filters</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="tbl">
            <thead><tr><th></th><th>Order</th><th>Buyer</th><th>Items</th><th>Total</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>
              {orders.map(o => {
                const first = o.items?.[0]?.product;
                const st = STATUS_STYLES[o.status] || STATUS_STYLES.PENDING;
                return (
                  <tr key={o.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/dashboard/admin/orders/${o.id}`)}>
                    <td style={{ width: 44 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 6, overflow: 'hidden', background: 'var(--glass)' }}>
                        {first?.images?.[0]?.url ? <img src={first.images[0].url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', background: '#1B4332' }} />}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontFamily: 'var(--fm)', fontSize: 11, color: 'var(--muted)' }}>{o.id.slice(0, 12)}</div>
                      <div style={{ fontSize: 13 }}>{first?.title || '—'}{o._count?.items > 1 ? ` +${o._count.items - 1} more` : ''}</div>
                    </td>
                    <td style={{ fontSize: 12 }}>
                      <div>{o.buyer?.firstName ? `${o.buyer.firstName} ${o.buyer.lastName || ''}`.trim() : 'Guest'}</div>
                      <div style={{ color: 'var(--muted)' }}>{o.buyerEmail}</div>
                    </td>
                    <td>{o._count?.items || 0}</td>
                    <td style={{ fontFamily: 'var(--fd)', fontWeight: 700, color: 'var(--accent)' }}>£{Number(o.totalAmount).toFixed(2)}</td>
                    <td><span className="badge" style={{ background: st.bg, border: `1px solid ${st.border}`, color: st.color, fontSize: 10 }}>{o.status}</span></td>
                    <td style={{ fontSize: 12 }}>{new Date(o.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>{total} total order{total !== 1 ? 's' : ''}</div>
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
