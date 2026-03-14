import { useState, useEffect } from 'react';
import { useCart } from '../../context/CartContext';
import DashboardShell from './DashboardShell';
import api from '../../utils/api';

const SB = { PENDING: 'b-gold', PROCESSING: 'b-blue', SHIPPED: 'b-purple', DELIVERED: 'b-green', CANCELLED: 'b-red' };

export default function ArtistOrders() {
  const { toast } = useCart();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => { api.getArtistDashboard().then(setData).catch(() => {}).finally(() => setLoading(false)); }, []);

  const orders = data?.recentOrders || [];
  const filtered = filter === 'all' ? orders : orders.filter(o => o.order.status === filter);

  return (
    <DashboardShell title="Orders">
      {loading ? <div>{[1,2,3].map(i => <div key={i} className="skel" style={{ height: 50, borderRadius: 8, marginBottom: 8 }} />)}</div> : (
        <>
          <div style={{ display: 'flex', gap: 6, marginBottom: 18, flexWrap: 'wrap' }}>
            {['all', 'PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED'].map(f => (
              <button key={f} className={`btn btn-sm ${filter === f ? 'btn-p' : 'btn-s'}`} onClick={() => setFilter(f)} style={{ textTransform: 'capitalize' }}>
                {f === 'all' ? 'All' : f.toLowerCase()} ({f === 'all' ? orders.length : orders.filter(o => o.order.status === f).length})
              </button>
            ))}
          </div>
          {filtered.length === 0 ? <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>No orders</div> : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <table className="tbl">
                <thead><tr><th>Order ID</th><th>Artwork</th><th>Qty</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
                <tbody>
                  {filtered.map((oi, i) => (
                    <tr key={i}>
                      <td style={{ fontFamily: 'var(--fm)', fontSize: 11 }}>{oi.order.id.slice(0, 12)}</td>
                      <td style={{ fontWeight: 500, fontSize: 13 }}>{oi.product?.title}</td>
                      <td>{oi.quantity}</td>
                      <td style={{ fontFamily: 'var(--fd)', fontWeight: 700, color: 'var(--accent)' }}>£{Number(oi.unitPrice).toFixed(2)}</td>
                      <td><span className={`badge ${SB[oi.order.status] || 'b-muted'}`} style={{ fontSize: 10 }}>{oi.order.status}</span></td>
                      <td style={{ fontSize: 12 }}>{new Date(oi.order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </DashboardShell>
  );
}
