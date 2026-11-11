import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Palette, Package, Wallet, User, Handshake, Mail, Folder, Users, Search, BarChart3, Settings, Flag, HeartHandshake, Inbox, FileText, KeyRound, Brush, Contact, ScrollText, ArrowRight, ArrowLeft, Check, Menu, X } from 'lucide-react';
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
  { id: 'team', icon: Contact, label: 'Team', path: '/dashboard/admin/team' },
  { id: 'users', icon: Users, label: 'Users', path: '/dashboard/users' },
  { id: 'newsletter', icon: Mail, label: 'Newsletter', path: '/dashboard/admin/newsletter' },
  { id: 'moderation', icon: Search, label: 'Moderation', path: '/dashboard/moderation' },
  { id: 'analytics', icon: BarChart3, label: 'Analytics', path: '/dashboard/analytics' },
  { id: 'legal', icon: FileText, label: 'Legal', path: '/dashboard/admin/legal' },
  { id: 'activity', icon: ScrollText, label: 'Activity', path: '/dashboard/admin/activity' },
  { id: 'settings', icon: Settings, label: 'Settings', path: '/dashboard/settings' },
  { id: 'account', icon: KeyRound, label: 'Account', path: '/dashboard/admin/account' },
];

// Assistants (STAFF): only what the server lets them use. Hiding is a convenience; every route is also enforced server-side.
const STAFF_NAV = [
  { id: 'submissions', icon: Inbox, label: 'Submissions', path: '/dashboard/admin/submissions', badge: 'submissions' },
  { id: 'products', icon: Palette, label: 'Products', path: '/dashboard/products' },
  { id: 'orders', icon: Package, label: 'Orders', path: '/dashboard/admin/orders' },
  { id: 'charities', icon: HeartHandshake, label: 'Charities', path: '/dashboard/admin/charities' },
  { id: 'projects', icon: Flag, label: 'Campaigns', path: '/dashboard/admin/projects' },
  { id: 'partners', icon: Handshake, label: 'Partners', path: '/dashboard/admin/partners' },
  { id: 'team', icon: Contact, label: 'Team', path: '/dashboard/admin/team' },
  { id: 'account', icon: KeyRound, label: 'Account', path: '/dashboard/admin/account' },
];

export default function DashboardShell({ children, title }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [pending, setPending] = useState(0);

  // Phones/tablets (<900px): the sidebar is a slide-in drawer opened from a sticky top bar.
  const [mobile, setMobile] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches);
  const [open, setOpen] = useState(false);
  const burger = useRef(null); const drawer = useRef(null);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 900px)');
    const on = () => { setMobile(mq.matches); if (!mq.matches) setOpen(false); };
    on(); mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  useEffect(() => { setOpen(false); }, [pathname]);
  const drawerOpen = mobile && open;
  useEffect(() => {
    if (!drawerOpen) return;
    const html = document.documentElement, prevB = document.body.style.overflow, prevH = html.style.overflow;
    document.body.style.overflow = 'hidden'; html.style.overflow = 'hidden';          // lock page scroll
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    drawer.current?.querySelector('.sb-item.on, .sb-item')?.focus();
    const btn = burger.current;
    return () => { document.body.style.overflow = prevB; html.style.overflow = prevH; document.removeEventListener('keydown', onKey); btn?.focus(); };
  }, [drawerOpen]);

  // A login still on its temporary password can do nothing but choose its own (the API enforces this too).
  useEffect(() => {
    if (user?.mustChangePassword && pathname !== '/dashboard/admin/account') navigate('/dashboard/admin/account', { replace: true });
  }, [user?.mustChangePassword, pathname]);

  // Admin / staff: how many invite-link submissions are waiting for review.
  useEffect(() => {
    if (user?.role !== 'ADMIN' && user?.role !== 'STAFF') return;
    let live = true;
    const load = () => api.getSubmissionCount().then(d => { if (live) setPending(d.total || 0); }).catch(() => {});
    load();
    window.addEventListener('ft-submissions-changed', load);
    return () => { live = false; window.removeEventListener('ft-submissions-changed', load); };
  }, [user?.role]);

  const nav = user?.role === 'ARTIST' ? ARTIST_NAV
    : user?.role === 'CHARITY' ? CHARITY_NAV
    : user?.role === 'ADMIN' ? ADMIN_NAV
    : user?.role === 'STAFF' ? STAFF_NAV
    : BUYER_NAV;

  const roleLabel = user?.role === 'ARTIST' ? 'Artist Studio'
    : user?.role === 'CHARITY' ? 'Charity Dashboard'
    : user?.role === 'ADMIN' ? 'Admin Panel'
    : user?.role === 'STAFF' ? 'Staff Panel'
    : 'Dashboard';

  const current = nav.find(i => pathname === i.path || pathname.startsWith(i.path + '/'));
  const pageName = current?.label || title || roleLabel;
  const narrow = collapsed && !mobile;          // the desktop "collapse" setting never applies to the drawer

  return (
    <div className="dash-wrap" style={{ display: 'flex', minHeight: 'calc(100vh - 68px)' }}>
      {/* Mobile top bar (hidden on desktop by CSS) */}
      <div className="dash-topbar" data-dash-topbar>
        <button ref={burger} type="button" className="dash-burger" data-dash-menu onClick={() => setOpen(o => !o)}
          aria-label="Open menu" aria-expanded={drawerOpen} aria-controls="dash-drawer"><Icon icon={Menu} /></button>
        <div className="dash-topbar-title" data-dash-page>{pageName}</div>
      </div>
      {drawerOpen && <div className="dash-scrim" data-dash-scrim onClick={() => setOpen(false)} aria-hidden="true" />}

      {/* Sidebar (a drawer below 900px) */}
      <div id="dash-drawer" ref={drawer} className={`dash-sidebar${drawerOpen ? ' open' : ''}`} data-dash-drawer
        style={{ width: narrow ? 68 : 248 }}
        role={mobile ? 'dialog' : undefined} aria-modal={drawerOpen ? 'true' : undefined} aria-label={mobile ? `${roleLabel} menu` : undefined}>
        <div style={{ padding: '18px 16px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {!narrow && <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', letterSpacing: .5 }}>{roleLabel}</div>}
          {mobile
            ? <button type="button" className="btn btn-g" data-dash-close aria-label="Close menu" style={{ padding: 8, color: 'var(--muted)', display: 'flex' }} onClick={() => setOpen(false)}><Icon icon={X} /></button>
            : <button className="btn btn-g" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} style={{ padding: 4, color: 'var(--muted)', display: 'flex' }} onClick={() => setCollapsed(c => !c)}>
              <Icon icon={collapsed ? ArrowRight : ArrowLeft} size="inline" />
            </button>}
        </div>
        <div style={{ padding: '4px 0' }}>
          {nav.map(item => (
            <div key={item.id} className={`sb-item${(pathname === item.path || pathname.startsWith(item.path + '/')) ? ' on' : ''}`}
              role="link" tabIndex={0} data-nav-item={item.id}
              aria-current={(pathname === item.path || pathname.startsWith(item.path + '/')) ? 'page' : undefined}
              onClick={() => { setOpen(false); navigate(item.path); }}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(false); navigate(item.path); } }}
              style={{ justifyContent: narrow ? 'center' : 'flex-start', paddingLeft: narrow ? 0 : 20 }}>
              <span className="sb-icon" style={{ display: 'flex' }}><Icon icon={item.icon} /></span>
              {!narrow && <span>{item.label}</span>}
              {item.badge === 'submissions' && pending > 0 && (
                <span className="sb-count" aria-label={`${pending} pending`} style={narrow ? { position: 'absolute', top: 4, right: 10 } : { marginLeft: 'auto', marginRight: 16 }}>{pending > 99 ? '99+' : pending}</span>
              )}
            </div>
          ))}
        </div>
        {!narrow && (
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
      <div className="dash-main" style={{ flex: 1, minWidth: 0, background: 'var(--base)', padding: '28px 36px 60px', overflow: 'auto' }}>
        {title && <h1 className="display dash-h1" style={{ fontSize: 32, marginBottom: 24 }}>{title}</h1>}
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
