import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Palette, Image as ImageIcon, Monitor, Flame, Home, Package, ShoppingCart, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { DIGITAL_CATS } from '../../data/constants';
import Icon from '../ui/Icon';
import Wordmark from '../ui/Wordmark';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { cartCount } = useCart();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [shopHover, setShopHover] = useState(false);
  const hoverTimer = useRef(null);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const links = [
    { to: '/', label: 'Home' },
    { to: '/shop', label: 'Shop', mega: true },
    { to: '/digitals', label: 'Digital Store' },
    { to: '/artists', label: 'Artists' },
    { to: '/charities', label: 'Charities' },
    { to: '/about', label: 'About' },
  ];

  const shopCats = [
    { label: 'All Artworks', to: '/shop', icon: Palette },
    { label: 'Paintings', to: '/shop?medium=painting', icon: ImageIcon },
    { label: 'Digital Art', to: '/shop?type=downloadable', icon: Monitor },
    { label: 'Mixed Media', to: '/shop?medium=mixed', icon: Flame },
  ];
  const digCats = DIGITAL_CATS.map(c => ({ label: c.label, to: `/digitals?category=${c.id}`, icon: c.icon }));

  const enterShop = () => { clearTimeout(hoverTimer.current); setShopHover(true); };
  const leaveShop = () => { hoverTimer.current = setTimeout(() => setShopHover(false), 200); };

  return (
    <>
      <nav className="cag-nav">
        <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }} onClick={() => navigate('/')}>
          <Wordmark style={{ fontFamily: 'var(--fd)', fontSize: 20, fontWeight: 700, color: 'var(--accent)' }} />
        </div>

        <div className="hide-mobile" style={{ display: 'flex', gap: 1 }}>
          {links.map(l => (
            <div key={l.to} style={{ position: 'relative' }} onMouseEnter={l.mega ? enterShop : undefined} onMouseLeave={l.mega ? leaveShop : undefined}>
              <Link to={l.to} className={`nav-link${pathname === l.to || (l.to !== '/' && pathname.startsWith(l.to)) ? ' active' : ''}`}>{l.label}</Link>
              {l.mega && shopHover && (
                <div className="mega-menu" onMouseEnter={enterShop} onMouseLeave={leaveShop}>
                  <div className="mega-col">
                    <div className="mega-title">Artworks</div>
                    {shopCats.map(c => <div key={c.to} className="mega-item" onClick={() => { navigate(c.to); setShopHover(false); }}><Icon icon={c.icon} size="inline" />{c.label}</div>)}
                  </div>
                  <div className="mega-col">
                    <div className="mega-title">Digital Products</div>
                    {digCats.map(c => <div key={c.to} className="mega-item" onClick={() => { navigate(c.to); setShopHover(false); }}><Icon icon={c.icon} size="inline" />{c.label}</div>)}
                  </div>
                  <div className="mega-col mega-feat">
                    <img src="https://images.unsplash.com/photo-1541367777708-7905fe3296c0?w=400&q=80" alt="" style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 10, marginBottom: 8 }} />
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--accent)' }}>Featured</div>
                    <div style={{ fontFamily: 'var(--fd)', fontSize: 15, fontWeight: 600 }}>Silent River</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>Amara Diallo · £950</div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => navigate('/cart')}>
            <button className="btn btn-g btn-icon" style={{ color: 'var(--muted)', width: 36, height: 36 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
            </button>
            {cartCount > 0 && <div className="ndot" style={{ background: 'var(--mint)', width: 17, height: 17, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 8, color: '#fff', fontWeight: 700 }}>{cartCount}</span></div>}
          </div>
          {user && (
            <div className="hide-mobile" style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-g btn-sm" onClick={() => navigate('/dashboard')}>Dashboard</button>
              <button className="btn btn-s btn-sm" onClick={logout}>Sign Out</button>
            </div>
          )}
          <button className="nav-hamburger" onClick={() => setMobileOpen(o => !o)}><span /><span /><span /></button>
        </div>
      </nav>

      {mobileOpen && (<><div className="mobile-overlay" onClick={() => setMobileOpen(false)} /><div className="mobile-drawer">
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--fd)', fontSize: 18, fontWeight: 700, color: 'var(--accent)' }}>Menu</span>
          <button className="btn btn-g" onClick={() => setMobileOpen(false)} style={{ fontSize: 20, padding: 4 }}>×</button>
        </div>
        <div style={{ padding: '8px 0' }}>
          {links.map(l => <Link key={l.to} to={l.to} className="mobile-nav-item" onClick={() => setMobileOpen(false)}>{l.label}</Link>)}
          {user && (<>
            <div style={{ height: 1, background: 'var(--border)', margin: '8px 24px' }} />
            <div className="mobile-nav-item" onClick={() => { navigate('/dashboard'); setMobileOpen(false); }}>Dashboard</div>
            <div className="mobile-nav-item" onClick={() => { logout(); setMobileOpen(false); }} style={{ color: '#dc2626' }}>Sign Out</div>
          </>)}
        </div>
      </div></>)}

      {/* Mobile bottom nav */}
      <div className="mobile-bottom-nav">
        {[
          { to: '/', icon: Home, label: 'Home' },
          { to: '/shop', icon: Palette, label: 'Shop' },
          { to: '/digitals', icon: Package, label: 'Digital' },
          { to: '/cart', icon: ShoppingCart, label: 'Cart' },
          ...(user ? [{ to: '/dashboard', icon: User, label: 'Account' }] : []),
        ].map(b => (
          <Link key={b.to} to={b.to} className={`mob-tab${pathname === b.to ? ' active' : ''}`}>
            <Icon icon={b.icon} size="inline" />
            <span>{b.label}</span>
            {b.to === '/cart' && cartCount > 0 && <span className="mob-tab-badge">{cartCount}</span>}
          </Link>
        ))}
      </div>
    </>
  );
}
