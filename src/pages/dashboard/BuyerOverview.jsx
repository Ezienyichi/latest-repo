import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import DashboardShell, { StatCard } from './DashboardShell';
import api from '../../utils/api';

export default function BuyerOverview() {
  const navigate = useNavigate();
  const { toast } = useCart();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getBuyerDashboard().then(setData).catch(e => toast(e.message, 'err')).finally(() => setLoading(false));
  }, []);

  if (loading) return <DashboardShell title="Overview"><div className="g4">{[1,2,3,4].map(i => <div key={i} className="skel" style={{ height: 110, borderRadius: 'var(--rl)' }} />)}</div></DashboardShell>;
  if (!data) return <DashboardShell title="Overview"><div className="alert alert-w">Failed to load dashboard</div></DashboardShell>;

  const { stats, recentOrders, funderRelations } = data;

  return (
    <DashboardShell title="Overview">
      <div className="g4" style={{ marginBottom: 28 }}>
        <StatCard icon="📦" label="Total Orders" value={stats.totalOrders} sub="All time" />
        <StatCard icon="💰" label="Total Spent" value={`£${stats.totalSpent.toLocaleString()}`} sub="Across all orders" />
        <StatCard icon="🌿" label="Charity Impact" value={`£${stats.charityContributed.toLocaleString()}`} sub="Directed to charities" color="var(--sage)" />
        <StatCard icon="🤝" label="Charities Supported" value={stats.charitiesSupported} sub="As a funder" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 28 }}>
        {/* Quick actions */}
        <div className="card" style={{ padding: 22 }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>Quick Actions</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button className="btn btn-p" style={{ width: '100%', justifyContent: 'center' }} onClick={() => navigate('/shop')}>
              Browse Artworks
            </button>
            <button className="btn btn-s" style={{ width: '100%', justifyContent: 'center' }} onClick={() => navigate('/orders')}>
              View Order History
            </button>
            <button className="btn btn-s" style={{ width: '100%', justifyContent: 'center' }} onClick={() => navigate('/charities')}>
              Discover Charities
            </button>
          </div>
        </div>

        {/* Charities supported */}
        <div className="card" style={{ padding: 22 }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>Charities You Support</div>
          {funderRelations?.length > 0 ? funderRelations.map(f => (
            <div key={f.charity.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', fontSize: 12, cursor: 'pointer' }} onClick={() => navigate(`/charities/${f.charity.id}`)}>
              <span>{f.charity.logo || '🌿'}</span>
              <span>{f.charity.name}</span>
            </div>
          )) : <div style={{ fontSize: 13, color: 'var(--muted)' }}>Not supporting any charities yet</div>}
        </div>
      </div>

      {/* Recent orders */}
      <div className="card" style={{ padding: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Recent Orders</div>
          <button className="btn btn-g btn-sm" onClick={() => navigate('/orders')}>View All →</button>
        </div>
        {recentOrders?.length > 0 ? (
          <table className="tbl">
            <thead><tr><th>Order</th><th>Items</th><th>Date</th><th>Status</th><th>Amount</th></tr></thead>
            <tbody>
              {recentOrders.map(o => (
                <tr key={o.id}>
                  <td style={{ fontFamily: 'var(--fm)', fontSize: 11 }}>{o.id.slice(0, 10)}</td>
                  <td style={{ fontSize: 13 }}>{o.items?.[0]?.product?.title}{o.items?.length > 1 ? ` +${o.items.length - 1} more` : ''}</td>
                  <td style={{ fontSize: 12 }}>{new Date(o.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</td>
                  <td><span className={`badge ${o.status === 'DELIVERED' ? 'b-green' : o.status === 'SHIPPED' ? 'b-purple' : o.status === 'PROCESSING' ? 'b-blue' : 'b-gold'}`} style={{ fontSize: 10 }}>{o.status}</span></td>
                  <td style={{ fontFamily: 'var(--fd)', fontWeight: 700, color: 'var(--accent)' }}>£{Number(o.totalAmount).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <div style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: 24 }}>No orders yet</div>}
      </div>
    </DashboardShell>
  );
}
