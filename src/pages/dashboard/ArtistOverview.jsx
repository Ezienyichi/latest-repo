import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Palette, Package, Wallet, Leaf, ArrowRight } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import DashboardShell, { StatCard } from './DashboardShell';
import Icon from '../../components/ui/Icon';
import CharityLogo from '../../components/ui/CharityLogo';
import api from '../../utils/api';

export default function ArtistOverview() {
  const navigate = useNavigate();
  const { toast } = useCart();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getArtistDashboard().then(setData).catch(e => toast(e.message, 'err')).finally(() => setLoading(false));
  }, []);

  if (loading) return <DashboardShell title="Overview"><div className="g4">{[1,2,3,4].map(i => <div key={i} className="skel" style={{ height: 110, borderRadius: 'var(--rl)' }} />)}</div></DashboardShell>;
  if (!data) return <DashboardShell title="Overview"><div className="alert alert-w">Failed to load dashboard</div></DashboardShell>;

  const { stats, monthlyEarnings, products, recentOrders, partnerships } = data;

  return (
    <DashboardShell title="Overview">
      {/* Stats grid */}
      <div className="g4" style={{ marginBottom: 28 }}>
        <StatCard icon={Palette} label="Active Listings" value={stats.activeListings} sub={`${stats.draftListings} drafts`} />
        <StatCard icon={Package} label="Total Orders" value={stats.totalOrders} sub={`${stats.pendingOrders} pending`} />
        <StatCard icon={Wallet} label="Net Earnings" value={`£${stats.netEarnings.toLocaleString()}`} sub={`Gross: £${stats.grossRevenue.toLocaleString()}`} />
        <StatCard icon={Leaf} label="Charity Impact" value={`£${stats.charityContributed.toLocaleString()}`} sub="Directed to charities" color="var(--sage)" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 28 }}>
        {/* Monthly earnings chart (simple bar chart) */}
        <div className="card" style={{ padding: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Monthly Revenue</div>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>Last 6 months</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120 }}>
            {(monthlyEarnings || []).map((m, i) => {
              const maxVal = Math.max(...monthlyEarnings.map(x => x.revenue), 1);
              const h = (m.revenue / maxVal) * 100;
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{ fontSize: 10, fontFamily: 'var(--fm)', color: 'var(--accent)', fontWeight: 600 }}>
                    {m.revenue > 0 ? `£${m.revenue.toLocaleString()}` : '—'}
                  </div>
                  <div style={{ width: '100%', height: `${Math.max(h, 4)}%`, background: 'linear-gradient(to top, var(--mint), var(--sage))', borderRadius: '4px 4px 0 0', transition: 'height .5s ease', minHeight: 4 }} />
                  <div style={{ fontSize: 9, color: 'var(--muted)', fontFamily: 'var(--fm)' }}>{m.month}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick actions */}
        <div className="card" style={{ padding: 22 }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>Quick Actions</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button className="btn btn-p" style={{ width: '100%', justifyContent: 'center' }} onClick={() => navigate('/dashboard/artworks?new=1')}>
              + New Artwork
            </button>
            <button className="btn btn-s" style={{ width: '100%', justifyContent: 'center' }} onClick={() => navigate('/dashboard/orders')}>
              View Orders
            </button>
            <button className="btn btn-s" style={{ width: '100%', justifyContent: 'center' }} onClick={() => navigate('/dashboard/profile')}>
              Edit Profile
            </button>
            <button className="btn btn-s" style={{ width: '100%', justifyContent: 'center' }} onClick={() => navigate('/dashboard/earnings')}>
              View Earnings
            </button>
          </div>
          {/* Partnerships */}
          {partnerships?.length > 0 && (
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>Charity Partners</div>
              {partnerships.map(p => (
                <div key={p.charity.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', fontSize: 12 }}>
                  <CharityLogo logo={p.charity.logo} size={18} />
                  <span>{p.charity.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent orders */}
      <div className="card" style={{ padding: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Recent Orders</div>
          <button className="btn btn-g btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }} onClick={() => navigate('/dashboard/orders')}>View All <Icon icon={ArrowRight} size="inline" /></button>
        </div>
        {recentOrders?.length > 0 ? (
          <table className="tbl">
            <thead><tr><th>Order</th><th>Artwork</th><th>Date</th><th>Status</th><th>Amount</th></tr></thead>
            <tbody>
              {recentOrders.slice(0, 8).map((oi, i) => (
                <tr key={i}>
                  <td style={{ fontFamily: 'var(--fm)', fontSize: 11 }}>{oi.order.id.slice(0, 10)}</td>
                  <td style={{ fontWeight: 500, fontSize: 13 }}>{oi.product?.title}</td>
                  <td style={{ fontSize: 12 }}>{new Date(oi.order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</td>
                  <td><span className={`badge ${oi.order.status === 'DELIVERED' ? 'b-green' : oi.order.status === 'SHIPPED' ? 'b-purple' : oi.order.status === 'PROCESSING' ? 'b-blue' : 'b-gold'}`} style={{ fontSize: 10 }}>{oi.order.status}</span></td>
                  <td style={{ fontFamily: 'var(--fd)', fontWeight: 700, color: 'var(--accent)' }}>£{Number(oi.unitPrice).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <div style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: 24 }}>No orders yet</div>}
      </div>
    </DashboardShell>
  );
}
