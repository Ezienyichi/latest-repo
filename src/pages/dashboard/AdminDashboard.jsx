import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import DashboardShell, { StatCard } from './DashboardShell';
import api from '../../utils/api';

export default function AdminDashboard() {
  const { user } = useAuth();
  const { toast } = useCart();
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [moderation, setModeration] = useState(null);
  const [users, setUsers] = useState({ users: [], total: 0 });
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userSearch, setUserSearch] = useState('');
  const [userRole, setUserRole] = useState('');

  useEffect(() => {
    if (user?.role !== 'ADMIN') { navigate('/'); return; }
    Promise.all([
      api.getAdminDashboard().catch(() => null),
      api.get('/admin/moderation').catch(() => null),
      api.get('/admin/users?limit=20').catch(() => ({ users: [], total: 0 })),
      api.get('/admin/analytics').catch(() => null),
    ]).then(([s, m, u, a]) => { setStats(s); setModeration(m); setUsers(u); setAnalytics(a); }).finally(() => setLoading(false));
  }, [user]);

  const searchUsers = () => {
    const params = new URLSearchParams();
    if (userSearch) params.set('search', userSearch);
    if (userRole) params.set('role', userRole);
    api.get(`/admin/users?${params}`).then(setUsers).catch(() => {});
  };

  const verifyArtist = async (id) => {
    try { await api.post(`/admin/verify-artist/${id}`, {}); toast('Artist verified!', 'ok'); api.get('/admin/moderation').then(setModeration); }
    catch (e) { toast(e.message, 'err'); }
  };

  const verifyCharity = async (id) => {
    try { await api.post(`/admin/verify-charity/${id}`, {}); toast('Charity verified!', 'ok'); api.get('/admin/moderation').then(setModeration); }
    catch (e) { toast(e.message, 'err'); }
  };

  const moderateProduct = async (id, status) => {
    try { await api.patch(`/admin/products/${id}/moderate`, { status }); toast(`Product ${status.toLowerCase()}`, 'ok'); api.get('/admin/moderation').then(setModeration); }
    catch (e) { toast(e.message, 'err'); }
  };

  const reviewDocument = async (id, status) => {
    const note = status === 'REJECTED' ? prompt('Optional note for the charity (why it was rejected):') || '' : '';
    try { await api.patch(`/admin/charity-documents/${id}/review`, { status, note }); toast(`Document ${status.toLowerCase()}`, 'ok'); api.get('/admin/moderation').then(setModeration); }
    catch (e) { toast(e.message, 'err'); }
  };

  if (loading) return <DashboardShell title="Admin Panel"><div className="g4">{[1,2,3,4].map(i => <div key={i} className="skel" style={{ height: 110, borderRadius: 'var(--rl)' }} />)}</div></DashboardShell>;

  const s = stats?.stats || {};

  return (
    <DashboardShell title="Admin Panel">
      {/* Tabs */}
      <div className="tabs-container" style={{ marginBottom: 24 }}>
        {['overview', 'moderation', 'users', 'analytics'].map(t => (
          <button key={t} className={`tab-btn${tab === t ? ' active' : ''}`} onClick={() => setTab(t)} style={{ textTransform: 'capitalize' }}>{t}</button>
        ))}
      </div>

      {/* ═══ OVERVIEW ═══ */}
      {tab === 'overview' && (<>
        <div className="g4" style={{ marginBottom: 28 }}>
          <StatCard icon="👥" label="Total Users" value={s.users || 0} />
          <StatCard icon="🎨" label="Active Products" value={s.products || 0} />
          <StatCard icon="📦" label="Total Orders" value={s.orders || 0} />
          <StatCard icon="💰" label="Total Revenue" value={`£${(s.revenue || 0).toLocaleString()}`} />
        </div>
        <div className="g3" style={{ marginBottom: 28 }}>
          <StatCard icon="🏦" label="Platform Revenue" value={`£${(s.platformRevenue || 0).toLocaleString()}`} sub="10% commission" color="var(--gold)" />
          <StatCard icon="🌿" label="Charity Impact" value={`£${(s.charityTotal || 0).toLocaleString()}`} sub="Directed to charities" color="var(--sage)" />
          <StatCard icon="🔍" label="Pending Review" value={(moderation?.pendingArtists?.length || 0) + (moderation?.pendingCharities?.length || 0)} sub="Artists + charities" color="#3b82f6" />
        </div>

        {/* Recent orders */}
        <div className="card" style={{ padding: 22 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>Recent Orders</h3>
          <table className="tbl">
            <thead><tr><th>Order</th><th>Buyer</th><th>Items</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>
              {(stats?.recentOrders || analytics?.recentOrders || []).slice(0, 8).map(o => (
                <tr key={o.id}>
                  <td style={{ fontFamily: 'var(--fm)', fontSize: 11 }}>{o.id.slice(0, 10)}</td>
                  <td>{o.buyer?.firstName || o.buyer?.email?.split('@')[0]}</td>
                  <td>{o._count?.items || o.items?.length || 0}</td>
                  <td style={{ fontFamily: 'var(--fd)', fontWeight: 700, color: 'var(--accent)' }}>£{Number(o.totalAmount).toFixed(2)}</td>
                  <td><span className={`badge ${o.status === 'DELIVERED' ? 'b-green' : o.status === 'PROCESSING' ? 'b-blue' : 'b-gold'}`} style={{ fontSize: 10 }}>{o.status}</span></td>
                  <td style={{ fontSize: 12 }}>{new Date(o.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>)}

      {/* ═══ MODERATION ═══ */}
      {tab === 'moderation' && (<>
        {/* Pending Artists */}
        <div className="card" style={{ padding: 22, marginBottom: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>Pending Artist Verification ({moderation?.pendingArtists?.length || 0})</h3>
          {moderation?.pendingArtists?.length > 0 ? (
            <table className="tbl">
              <thead><tr><th>Name</th><th>Email</th><th>Statement</th><th>Action</th></tr></thead>
              <tbody>
                {moderation.pendingArtists.map(a => (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 500 }}>{a.displayName}</td>
                    <td style={{ fontSize: 12 }}>{a.user?.email}</td>
                    <td style={{ fontSize: 12, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.artistStatement?.slice(0, 80)}</td>
                    <td><button className="btn btn-p btn-sm" onClick={() => verifyArtist(a.id)}>✓ Verify</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <div style={{ textAlign: 'center', padding: 20, color: 'var(--muted)' }}>No pending artists</div>}
        </div>

        {/* Pending Charities */}
        <div className="card" style={{ padding: 22, marginBottom: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>Pending Charity Verification ({moderation?.pendingCharities?.length || 0})</h3>
          {moderation?.pendingCharities?.length > 0 ? (
            <table className="tbl">
              <thead><tr><th>Name</th><th>Registration</th><th>Email</th><th>Action</th></tr></thead>
              <tbody>
                {moderation.pendingCharities.map(c => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 500 }}>{c.name}</td>
                    <td style={{ fontFamily: 'var(--fm)', fontSize: 11 }}>{c.registrationNo}</td>
                    <td style={{ fontSize: 12 }}>{c.user?.email}</td>
                    <td><button className="btn btn-p btn-sm" onClick={() => verifyCharity(c.id)}>✓ Verify</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <div style={{ textAlign: 'center', padding: 20, color: 'var(--muted)' }}>No pending charities</div>}
        </div>

        {/* Draft Products */}
        <div className="card" style={{ padding: 22 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>Draft Products ({moderation?.draftProducts?.length || 0})</h3>
          {moderation?.draftProducts?.length > 0 ? (
            <table className="tbl">
              <thead><tr><th>Title</th><th>Artist</th><th>Actions</th></tr></thead>
              <tbody>
                {moderation.draftProducts.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 500 }}>{p.title}</td>
                    <td>{p.artist?.displayName}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-p btn-sm" onClick={() => moderateProduct(p.id, 'ACTIVE')}>Approve</button>
                        <button className="btn btn-danger btn-sm" onClick={() => moderateProduct(p.id, 'SUSPENDED')}>Reject</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <div style={{ textAlign: 'center', padding: 20, color: 'var(--muted)' }}>No draft products</div>}
        </div>

        {/* Pending Charity Documents */}
        <div className="card" style={{ padding: 22, marginTop: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>Pending Verification Documents ({moderation?.pendingDocuments?.length || 0})</h3>
          {moderation?.pendingDocuments?.length > 0 ? (
            <table className="tbl">
              <thead><tr><th>Charity</th><th>Label</th><th>Uploaded</th><th>Action</th></tr></thead>
              <tbody>
                {moderation.pendingDocuments.map(d => (
                  <tr key={d.id}>
                    <td style={{ fontWeight: 500 }}>{d.charity?.name}</td>
                    <td style={{ fontSize: 12 }}>{d.label}</td>
                    <td style={{ fontSize: 12 }}>{new Date(d.uploadedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-p btn-sm" onClick={() => reviewDocument(d.id, 'APPROVED')}>Approve</button>
                        <button className="btn btn-danger btn-sm" onClick={() => reviewDocument(d.id, 'REJECTED')}>Reject</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <div style={{ textAlign: 'center', padding: 20, color: 'var(--muted)' }}>No pending documents</div>}
        </div>
      </>)}

      {/* ═══ USERS ═══ */}
      {tab === 'users' && (<>
        <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
          <input className="fi" value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Search users..." style={{ width: 260 }} onKeyDown={e => e.key === 'Enter' && searchUsers()} />
          <select className="fi fsel" value={userRole} onChange={e => { setUserRole(e.target.value); }} style={{ width: 140 }}>
            <option value="">All Roles</option><option value="BUYER">Buyer</option><option value="ARTIST">Artist</option><option value="CHARITY">Charity</option><option value="ADMIN">Admin</option>
          </select>
          <button className="btn btn-p btn-sm" onClick={searchUsers}>Search</button>
        </div>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="tbl">
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Verified</th><th>Joined</th></tr></thead>
            <tbody>
              {(users?.users || []).map(u => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 500 }}>{u.firstName} {u.lastName}</td>
                  <td style={{ fontSize: 12 }}>{u.email}</td>
                  <td><span className={`badge ${u.role === 'ADMIN' ? 'b-red' : u.role === 'ARTIST' ? 'b-purple' : u.role === 'CHARITY' ? 'b-green' : 'b-muted'}`} style={{ fontSize: 10 }}>{u.role}</span></td>
                  <td>{u.emailVerified ? <span style={{ color: 'var(--sage)' }}>✓</span> : <span style={{ color: 'var(--muted)' }}>—</span>}</td>
                  <td style={{ fontSize: 12 }}>{new Date(u.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: 10, fontSize: 12, color: 'var(--muted)' }}>{users?.total || 0} total users</div>
      </>)}

      {/* ═══ ANALYTICS ═══ */}
      {tab === 'analytics' && analytics && (<>
        <div className="g2" style={{ marginBottom: 24, gap: 20 }}>
          {/* Users by role */}
          <div className="card" style={{ padding: 22 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>Users by Role</h3>
            {(analytics.usersByRole || []).map(r => (
              <div key={r.role} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <span className={`badge ${r.role === 'ADMIN' ? 'b-red' : r.role === 'ARTIST' ? 'b-purple' : r.role === 'CHARITY' ? 'b-green' : 'b-muted'}`}>{r.role}</span>
                <span style={{ fontFamily: 'var(--fd)', fontWeight: 700 }}>{r._count}</span>
              </div>
            ))}
          </div>

          {/* Orders by status */}
          <div className="card" style={{ padding: 22 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>Orders by Status</h3>
            {(analytics.ordersByStatus || []).map(o => (
              <div key={o.status} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <span className={`badge ${o.status === 'DELIVERED' ? 'b-green' : o.status === 'PROCESSING' ? 'b-blue' : o.status === 'SHIPPED' ? 'b-purple' : 'b-gold'}`}>{o.status}</span>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontFamily: 'var(--fd)', fontWeight: 700 }}>{o._count}</span>
                  <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 8 }}>£{Number(o._sum?.totalAmount || 0).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="g2" style={{ gap: 20 }}>
          {/* Top artists */}
          <div className="card" style={{ padding: 22 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>Top Artists by Revenue</h3>
            {(analytics.topArtists || []).map((a, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <span style={{ fontWeight: 500 }}>{a.displayName}</span>
                  {a.verified && <span style={{ color: 'var(--sage)', marginLeft: 4, fontSize: 11 }}>✓</span>}
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{a.artworkCount} works</div>
                </div>
                <span style={{ fontFamily: 'var(--fd)', fontWeight: 700, color: 'var(--accent)' }}>£{Number(a.totalSold).toLocaleString()}</span>
              </div>
            ))}
          </div>

          {/* Top charities */}
          <div className="card" style={{ padding: 22 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>Top Charities by Funds Raised</h3>
            {(analytics.topCharities || []).map((c, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <span style={{ fontWeight: 500 }}>{c.name}</span>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{c.funderCount} funders</div>
                </div>
                <span style={{ fontFamily: 'var(--fd)', fontWeight: 700, color: 'var(--sage)' }}>£{Number(c.raised).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </>)}
    </DashboardShell>
  );
}
