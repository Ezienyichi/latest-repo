import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import DashboardShell, { StatCard } from './DashboardShell';
import api from '../../utils/api';

export default function CharityFunders() {
  const navigate = useNavigate();
  const { toast } = useCart();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.getCharityDashboard().then(setData).catch(() => {}).finally(() => setLoading(false)); }, []);

  if (loading) return <DashboardShell title="Funders"><div className="skel" style={{ height: 200, borderRadius: 'var(--rl)' }} /></DashboardShell>;

  const stats = data?.stats || {};
  const pct = stats.target > 0 ? Math.min(100, Math.round((stats.raised / stats.target) * 100)) : 0;

  return (
    <DashboardShell title="Funder Management">
      {/* Privacy notice */}
      <div className="alert alert-i" style={{ marginBottom: 24 }}>
        <span>🔒</span>
        <div>
          <strong>Privacy by design:</strong> Funder identities are anonymous. You can see the total count of supporters and send them messages through the platform, but you cannot view individual personal details. This protects funder privacy while enabling meaningful engagement.
        </div>
      </div>

      {/* Funder count hero */}
      <div className="card" style={{ padding: '40px 32px', textAlign: 'center', marginBottom: 24, background: 'linear-gradient(135deg,rgba(23,124,29,.06),rgba(23,124,29,.02))' }}>
        <div style={{ fontFamily: 'var(--fd)', fontSize: 72, fontWeight: 700, color: 'var(--accent)', lineHeight: 1 }}>{(stats.funderCount || 0).toLocaleString()}</div>
        <div style={{ fontSize: 14, color: 'var(--muted)', marginTop: 8, fontWeight: 500 }}>Anonymous Funders Supporting Your Mission</div>
        <div style={{ marginTop: 20, maxWidth: 400, margin: '20px auto 0' }}>
          <div className="pb" style={{ height: 10, marginBottom: 6 }}>
            <div className="pb-fill" style={{ width: `${pct}%`, background: 'linear-gradient(90deg,var(--mint),var(--sage))', height: '100%' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--muted)' }}>
            <span>£{stats.raised?.toLocaleString()} raised</span><span>{pct}% of £{stats.target?.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="g3" style={{ marginBottom: 28 }}>
        <StatCard icon="📧" label="Messages Sent" value={stats.messagesSent || 0} sub="Total funder communications" />
        <StatCard icon="📁" label="Resources Shared" value={stats.resourceCount || 0} sub="Documents & reports" />
        <StatCard icon="🎨" label="Artist Partners" value={stats.partnerCount || 0} sub="Active collaborations" />
      </div>

      {/* Engagement actions */}
      <div className="card" style={{ padding: 24, marginBottom: 20 }}>
        <h3 style={{ fontFamily: 'var(--fd)', fontSize: 20, marginBottom: 16 }}>Engage Your Funders</h3>
        <p style={{ fontSize: 13, color: 'var(--txt2)', lineHeight: 1.7, marginBottom: 18 }}>
          Keep your funders engaged with regular appreciation messages, impact updates, and shared resources. 
          Research shows that charities with active funder communication see <strong>40% higher retention rates</strong>.
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-p" onClick={() => navigate('/dashboard/messages')}>✉️ Send Appreciation Message</button>
          <button className="btn btn-gold" onClick={() => navigate('/dashboard/resources')}>📁 Share a Resource</button>
          <button className="btn btn-s" onClick={() => toast('Newsletter feature coming soon!', 'info')}>📰 Create Newsletter</button>
        </div>
      </div>

      {/* How funders join */}
      <div className="card" style={{ padding: 24 }}>
        <h3 style={{ fontFamily: 'var(--fd)', fontSize: 20, marginBottom: 16 }}>How Funders Join</h3>
        <div className="g3" style={{ gap: 16 }}>
          {[
            { icon: '🛒', title: 'Art Purchase', desc: 'Anyone who buys an artwork linked to your charity automatically becomes a funder.' },
            { icon: '📰', title: 'Newsletter Signup', desc: 'Visitors can sign up on your charity profile page to receive updates.' },
            { icon: '💝', title: 'Direct Donation', desc: 'Users can opt-in as funders through the platform donation flow.' },
          ].map(s => (
            <div key={s.title} style={{ padding: 16, background: 'var(--glass)', borderRadius: 'var(--r)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>{s.icon}</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{s.title}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </DashboardShell>
  );
}
