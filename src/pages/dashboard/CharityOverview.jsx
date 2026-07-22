import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Handshake, Wallet, Mail, Palette, Folder, ArrowRight } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import DashboardShell, { StatCard } from './DashboardShell';
import Icon from '../../components/ui/Icon';
import api from '../../utils/api';

export default function CharityOverview() {
  const navigate = useNavigate();
  const { toast } = useCart();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getCharityDashboard().then(setData).catch(e => toast(e.message, 'err')).finally(() => setLoading(false));
  }, []);

  if (loading) return <DashboardShell title="Overview"><div className="g4">{[1,2,3,4].map(i => <div key={i} className="skel" style={{ height: 110, borderRadius: 'var(--rl)' }} />)}</div></DashboardShell>;
  if (!data) return <DashboardShell title="Overview"><div className="alert alert-w">Failed to load dashboard</div></DashboardShell>;

  const { stats, messages, resources, partnerships, profile } = data;
  const pct = stats.target > 0 ? Math.min(100, Math.round((stats.raised / stats.target) * 100)) : 0;

  return (
    <DashboardShell title="Charity Overview">
      {/* Verification status */}
      {profile?.verified ? (
        <div className="alert alert-ok" style={{ marginBottom: 20 }}><Icon icon={Check} size="inline" /> Your charity is verified and visible on the platform</div>
      ) : (
        <div className="alert alert-w" style={{ marginBottom: 20 }}>⏳ Your charity profile is pending verification by our team</div>
      )}

      {/* Stats */}
      <div className="g4" style={{ marginBottom: 28 }}>
        <StatCard icon={Handshake} label="Funders" value={stats.funderCount.toLocaleString()} sub="Anonymous supporters" />
        <StatCard icon={Wallet} label="Funds Raised" value={`£${stats.raised.toLocaleString()}`} sub={`${pct}% of £${stats.target.toLocaleString()} target`} />
        <StatCard icon={Mail} label="Messages Sent" value={stats.messagesSent} sub="Funder communications" />
        <StatCard icon={Palette} label="Artist Partners" value={stats.partnerCount} sub="Active collaborations" color="var(--gold)" />
      </div>

      {/* Fundraising progress */}
      <div className="card" style={{ padding: 24, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ fontFamily: 'var(--fd)', fontSize: 20 }}>Fundraising Progress</h3>
          <span style={{ fontFamily: 'var(--fd)', fontSize: 24, color: 'var(--accent)', fontWeight: 700 }}>{pct}%</span>
        </div>
        <div className="pb" style={{ marginBottom: 8, height: 12 }}>
          <div className="pb-fill" style={{ width: `${pct}%`, background: 'linear-gradient(90deg,var(--mint),var(--sage))', height: '100%' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--muted)' }}>
          <span>£{stats.raised.toLocaleString()} raised</span>
          <span>£{stats.target.toLocaleString()} target</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
        {/* Quick actions */}
        <div className="card" style={{ padding: 22 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>Quick Actions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button className="btn btn-p" style={{ width: '100%', justifyContent: 'center', display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={() => navigate('/dashboard/messages')}><Icon icon={Mail} size="inline" /> Send Appreciation Message</button>
            <button className="btn btn-s" style={{ width: '100%', justifyContent: 'center', display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={() => navigate('/dashboard/resources')}><Icon icon={Folder} size="inline" /> Upload Resource</button>
            <button className="btn btn-s" style={{ width: '100%', justifyContent: 'center', display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={() => navigate('/dashboard/funders')}><Icon icon={Handshake} size="inline" /> View Funders</button>
          </div>
        </div>

        {/* Artist partners */}
        <div className="card" style={{ padding: 22 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>Artist Partners</h3>
          {partnerships?.length > 0 ? partnerships.map(p => (
            <div key={p.artist.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              {p.artist.avatarUrl ? <img src={p.artist.avatarUrl} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} /> : <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--glass)' }} />}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{p.artist.displayName}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>£{Number(p.artist.totalSold || 0).toLocaleString()} raised</div>
              </div>
            </div>
          )) : <div style={{ fontSize: 13, color: 'var(--muted)' }}>No artist partners yet</div>}
        </div>
      </div>

      {/* Recent messages */}
      <div className="card" style={{ padding: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600 }}>Recent Messages</h3>
          <button className="btn btn-g btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }} onClick={() => navigate('/dashboard/messages')}>View All <Icon icon={ArrowRight} size="inline" /></button>
        </div>
        {messages?.length > 0 ? (
          <table className="tbl">
            <thead><tr><th>Subject</th><th>Type</th><th>Recipients</th><th>Sent</th></tr></thead>
            <tbody>
              {messages.slice(0, 5).map(m => (
                <tr key={m.id}>
                  <td style={{ fontWeight: 500 }}>{m.subject}</td>
                  <td><span className={`badge ${m.messageType === 'APPRECIATION' ? 'b-green' : m.messageType === 'NEWSLETTER' ? 'b-blue' : 'b-gold'}`} style={{ fontSize: 10 }}>{m.messageType}</span></td>
                  <td>{m.recipientCount}</td>
                  <td style={{ fontSize: 12 }}>{new Date(m.sentAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <div style={{ textAlign: 'center', padding: 24, color: 'var(--muted)' }}>No messages sent yet</div>}
      </div>
    </DashboardShell>
  );
}
