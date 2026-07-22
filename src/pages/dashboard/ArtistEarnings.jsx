import { useState, useEffect } from 'react';
import { Wallet, Landmark, Leaf, Info } from 'lucide-react';
import DashboardShell, { StatCard } from './DashboardShell';
import Icon from '../../components/ui/Icon';
import api from '../../utils/api';

export default function ArtistEarnings() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.getArtistDashboard().then(setData).catch(() => {}).finally(() => setLoading(false)); }, []);

  if (loading) return <DashboardShell title="Earnings"><div className="g3">{[1,2,3].map(i => <div key={i} className="skel" style={{ height: 110, borderRadius: 'var(--rl)' }} />)}</div></DashboardShell>;

  const s = data?.stats || {};
  const monthly = data?.monthlyEarnings || [];

  return (
    <DashboardShell title="Earnings & Payouts">
      <div className="g3" style={{ marginBottom: 28 }}>
        <StatCard icon={Wallet} label="Gross Revenue" value={`£${(s.grossRevenue || 0).toLocaleString()}`} sub="Total sales before fees" />
        <StatCard icon={Landmark} label="Net Earnings" value={`£${(s.netEarnings || 0).toLocaleString()}`} sub="After platform & charity splits" color="var(--accent)" />
        <StatCard icon={Leaf} label="Charity Contributed" value={`£${(s.charityContributed || 0).toLocaleString()}`} sub="Your impact through art" color="var(--sage)" />
      </div>

      {/* Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontFamily: 'var(--fd)', fontSize: 20, marginBottom: 18 }}>Revenue Breakdown</h3>
          {[
            ['Gross Sales', `£${(s.grossRevenue || 0).toFixed(2)}`, 'var(--txt)'],
            ['Platform Fee (10%)', `-£${(s.platformFees || 0).toFixed(2)}`, '#dc2626'],
            ['Charity Split (10%)', `-£${(s.charityContributed || 0).toFixed(2)}`, 'var(--sage)'],
          ].map(([k, v, c]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: 14 }}>
              <span style={{ color: 'var(--muted)' }}>{k}</span><span style={{ fontWeight: 600, color: c }}>{v}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0 0', fontSize: 16, fontWeight: 700 }}>
            <span>Your Earnings</span>
            <span style={{ fontFamily: 'var(--fd)', fontSize: 24, color: 'var(--accent)' }}>£{(s.netEarnings || 0).toFixed(2)}</span>
          </div>
        </div>

        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontFamily: 'var(--fd)', fontSize: 20, marginBottom: 18 }}>Payout Schedule</h3>
          <div className="alert alert-i" style={{ marginBottom: 14 }}><Icon icon={Info} size="inline" /><div>Payouts are processed on the 1st and 15th of each month for orders marked as delivered.</div></div>
          <div style={{ fontSize: 13, color: 'var(--txt2)', lineHeight: 1.7 }}>
            <p style={{ marginBottom: 8 }}>Next payout: <strong>1st of next month</strong></p>
            <p style={{ marginBottom: 8 }}>Payout method: <strong>Bank Transfer (Stripe Connect)</strong></p>
            <p>Minimum payout threshold: <strong>£50</strong></p>
          </div>
        </div>
      </div>

      {/* Monthly chart */}
      <div className="card" style={{ padding: 24 }}>
        <h3 style={{ fontFamily: 'var(--fd)', fontSize: 20, marginBottom: 18 }}>Monthly Revenue</h3>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 140 }}>
          {monthly.map((m, i) => {
            const maxVal = Math.max(...monthly.map(x => x.revenue), 1);
            const h = (m.revenue / maxVal) * 100;
            return (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{ fontSize: 11, fontFamily: 'var(--fm)', color: 'var(--accent)', fontWeight: 600 }}>{m.revenue > 0 ? `£${m.revenue.toLocaleString()}` : '—'}</div>
                <div style={{ width: '100%', height: `${Math.max(h, 4)}%`, background: 'linear-gradient(to top, var(--mint), var(--sage))', borderRadius: '4px 4px 0 0', minHeight: 4 }} />
                <div style={{ fontSize: 9, color: 'var(--muted)', fontFamily: 'var(--fm)' }}>{m.month}</div>
                <div style={{ fontSize: 9, color: 'var(--subtle)' }}>{m.orders} order{m.orders !== 1 ? 's' : ''}</div>
              </div>
            );
          })}
        </div>
      </div>
    </DashboardShell>
  );
}
