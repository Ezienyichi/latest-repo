import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Palette, Package, Wallet, User, Handshake, Mail, Folder, Users, Search, BarChart3, Settings, Flag, HeartHandshake, Inbox, Brush, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Icon from '../../components/ui/Icon';
import api from '../../utils/api';

const BUYER_NAV = [
  { id: 'overview', icon: LayoutDashboard, label: 'Overview', path: '/dashboard' },
];

const ARTIST_NAV = [
  { id: 'overview', icon: LayoutDashboard, label: 'Overview', path: '/dashboard' },
  { id: 'artworks', icon: Palette, label: 'Artworks', path: '/dashboard/artworks' },
  { id: 'orders', icon: Package, label: 'Orders', path: '/dashboard/orders' },
  { id: 'earnings', icon: Wallet, label: 'Earnings', path: '/dashboard/earnings' },
  { id: 'profile', icon: User, label: 'Profile', path: '/dashboard/profile' },
];

const CHARITY_NAV = [
  { id: 'overview', icon: LayoutDashboard, label: 'Overview', path: '/dashboard' },
  { id: 'funders', icon: Handshake, label: 'Funders', path: '/dashboard/funders' },
  { id: 'messages', icon: Mail, label: 'Messages', path: '/dashboard/messages' },
  { id: 'resources', icon: Folder, label: 'Resources', path: '/dashboard/resources' },
  { id: 'profile', icon: User, label: 'Profile', path: '/dashboard/charity-profile' },
];

const ADMIN_NAV = [
  { id: 'overview', icon: LayoutDashboard, label: 'Overview', path: '/dashboard/admin' },
  { id: 'submissions', icon: Inbox, label: 'Submissions', path: '/dashboard/admin/submissions', badge: 'submissions' },
  { id: 'products', icon: Palette, label: 'Products', path: '/dashboard/products' },
  { id: 'orders', icon: Package, label: 'Orders', path: '/dashboard/admin/orders' },
  { id: 'artists', icon: Brush, label: 'Artists', path: '/dashboard/admin/artists' },
  { id: 'charities', icon: HeartHandshake, label: 'Charities', path: '/dashboard/admin/charities' },
  { id: 'projects', icon: Flag, label: 'Campaigns', path: '/dashboard/admin/projects' },
  { id: 'partners', icon: Handshake, label: 'Partners', path: '/dashboard/admin/partners' },
  { id: 'users', icon: Users, label: 'Users', path: '/dashboard/users' },
  { id: 'newsletter', icon: Mail, label: 'Newsletter', path: '/dashboard/admin/newsletter' },
  { id: 'moderation', icon: Search, label: 'Moderation', path: '/dashboard/moderation' },
  { id: 'analytics', icon: BarChart3, label: 'Analytics', path: '/dashboard/analytics' },
  { id: 'settings', icon: Settings, label: 'Settings', path: '/dashboard/settings' },
];

export default function DashboardShell({ children, title }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [pending, setPending] = useState(0);

  // Admin-only: how many invite-link submissions are waiting for review.
  useEffect(() => {
    if (user?.role !== 'ADMIN') return;
    let live = true;
    const load = () => api.getSubmissionCount().then(d => { if (live) setPending(d.total || 0); }).catch(() => {});
    load();
    window.addEventListener('ft-submissions-changed', load);
    return () => { live = false; window.removeEventListener('ft-submissions-changed', load); };
  }, [user?.role]);

  const nav = user?.role === 'ARTIST' ? ARTIST_NAV
    : user?.role === 'CHARITY' ? CHARITY_NAV
    : user?.role === 'ADMIN' ? ADMIN_NAV
    : BUYER_NAV;

  const roleLabel = user?.role === 'ARTIST' ? 'Artist Studio'
    : user?.role === 'CHARITY' ? 'Charity Dashboard'
    : user?.role === 'ADMIN' ? 'Admin Panel'
    : 'Dashboard';

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 68px)' }}>
      {/* Sidebar */}
      <div className="dash-sidebar" style={{ width: collapsed ? 68 : 248 }}>
        <div style={{ padding: '18px 16px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {!collapsed && <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', letterSpacing: .5 }}>{roleLabel}</div>}
          <button className="btn btn-g" style={{ padding: 4, color: 'var(--muted)', display: 'flex' }} onClick={() => setCollapsed(c => !c)}>
            <Icon icon={collapsed ? ArrowRight : ArrowLeft} size="inline" />
          </button>
        </div>
        <div style={{ padding: '4px 0' }}>
          {nav.map(item => (
            <div key={item.id} className={`sb-item${(pathname === item.path || pathname.startsWith(item.path + '/')) ? ' on' : ''}`}
              onClick={() => navigate(item.path)}
              style={{ justifyContent: collapsed ? 'center' : 'flex-start', paddingLeft: collapsed ? 0 : 20 }}>
              <span className="sb-icon" style={{ display: 'flex' }}><Icon icon={item.icon} /></span>
              {!collapsed && <span>{item.label}</span>}
              {item.badge === 'submissions' && pending > 0 && (
                <span className="sb-count" aria-label={`${pending} pending`} style={collapsed ? { position: 'absolute', top: 4, right: 10 } : { marginLeft: 'auto', marginRight: 16 }}>{pending > 99 ? '99+' : pending}</span>
              )}
            </div>
          ))}
        </div>
        {!collapsed && (
          <div style={{ padding: '16px 20px', marginTop: 'auto', borderTop: '1px solid var(--border)' }}>
            <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 2 }}>
              {user?.artistProfile?.displayName || user?.charityProfile?.name || user?.firstName || 'User'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{user?.email}</div>
            {user?.artistProfile?.verified && <div className="badge b-green" style={{ marginTop: 6, fontSize: 9, display: 'inline-flex', alignItems: 'center', gap: 3 }}><Icon icon={Check} size="inline" /> Verified</div>}
          </div>
        )}
      </div>

      {/* Main content */}
      <div style={{ flex: 1, background: 'var(--base)', padding: '28px 36px 60px', overflow: 'auto' }}>
        {title && <h1 className="display" style={{ fontSize: 32, marginBottom: 24 }}>{title}</h1>}
        {children}
      </div>
    </div>
  );
}

// Stat card component
export function StatCard({ icon, label, value, sub, color }) {
  return (
    <div className="card" style={{ padding: '20px 22px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--muted)' }}>{label}</div>
        <Icon icon={icon} />
      </div>
      <div style={{ fontFamily: 'var(--fd)', fontSize: 30, fontWeight: 700, color: color || 'var(--accent)', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>{sub}</div>}
    </div>
  );
}
