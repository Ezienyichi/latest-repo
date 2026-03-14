import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { SDGs, DIGITAL_CATS } from '../data/constants';
import api from '../utils/api';

function SdgDot({ id }) {
  const s = SDGs.find(x => x.id === id); if (!s) return null;
  return <span className="sdg" title={s.n} style={{ background: s.c, color: '#fff', width: 20, height: 20, fontSize: 9, borderRadius: 4 }}>{id}</span>;
}

export default function DigitalsPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { addToCart, toast, toggleWishlist, isWished } = useCart();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCat, setActiveCat] = useState(params.get('category') || 'all');
  const [sort, setSort] = useState('featured');

  useEffect(() => {
    setLoading(true);
    const q = { limit: 30 };
    if (activeCat !== 'all') q.category = activeCat;
    api.getProducts(q).then(r => {
      let items = (r.items || []).filter(p => p.category !== 'ARTWORK');
      if (sort === 'price_asc') items.sort((a, b) => Number(a.basePrice) - Number(b.basePrice));
      if (sort === 'price_desc') items.sort((a, b) => Number(b.basePrice) - Number(a.basePrice));
      setProducts(items);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [activeCat, sort]);

  const activeCatData = DIGITAL_CATS.find(c => c.id === activeCat);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--base)' }}>
      {/* Hero */}
      <div style={{ background: `linear-gradient(135deg,${activeCatData?.bg || '#0a0a1a'} 0%,${activeCatData?.color || '#1a1030'}33 50%,#041525 100%)`, padding: '48px 0 36px', position: 'relative', overflow: 'hidden' }}>
        {/* Ambient glow */}
        <div style={{ position: 'absolute', top: '20%', right: '10%', width: 300, height: 300, borderRadius: '50%', background: `${activeCatData?.color || '#9B72CF'}15`, filter: 'blur(80px)', pointerEvents: 'none' }} />
        <div className="wrap">
          <div className="breadcrumbs" style={{ marginBottom: 10 }}>
            <Link to="/" style={{ color: 'rgba(255,255,255,.5)' }}>Home</Link>
            <span className="sep" style={{ color: 'rgba(255,255,255,.3)' }}>›</span>
            <span style={{ color: '#fff' }}>Digital Store</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 20 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', color: activeCatData?.color || 'var(--gold)', marginBottom: 8 }}>
                {activeCatData ? activeCatData.icon + ' ' + activeCatData.label : '📦 All Digital Products'}
              </div>
              <h1 style={{ fontFamily: 'var(--fd)', fontSize: 48, color: '#fff', fontWeight: 600, lineHeight: 1.1 }}>
                {activeCatData ? activeCatData.label : 'Creative Digital Works'}
              </h1>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,.5)', marginTop: 8, maxWidth: 400 }}>
                {activeCat === 'EBOOK' ? 'Illustrated books, essays & stories that fund change'
                  : activeCat === 'MUSIC' ? 'Original albums, EPs & soundscapes by impact artists'
                  : activeCat === 'GRAPHIC' ? 'Vector packs, icon sets & design assets with purpose'
                  : activeCat === 'ANIMATION' ? 'Short films, motion graphics & animated art'
                  : 'eBooks, Music, Graphics & Animation — every purchase funds change'}
              </p>
            </div>
            <select className="fi fsel" value={sort} onChange={e => setSort(e.target.value)} style={{ width: 160, background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.15)', color: '#fff' }}>
              <option value="featured">Featured</option>
              <option value="price_asc">Price ↑</option>
              <option value="price_desc">Price ↓</option>
            </select>
          </div>

          {/* Category tabs */}
          <div style={{ display: 'flex', gap: 8, marginTop: 24, flexWrap: 'wrap' }}>
            <button className={`btn ${activeCat === 'all' ? 'btn-p' : ''}`}
              style={{ ...(activeCat !== 'all' && { background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.15)', color: '#fff', padding: '8px 16px', borderRadius: 'var(--r)', fontSize: 13, cursor: 'pointer' }) }}
              onClick={() => setActiveCat('all')}>All Products</button>
            {DIGITAL_CATS.map(c => (
              <button key={c.id} className={`btn ${activeCat === c.id ? 'btn-p' : ''}`}
                style={{
                  ...(activeCat !== c.id && { background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.15)', color: '#fff', padding: '8px 16px', borderRadius: 'var(--r)', fontSize: 13, cursor: 'pointer' }),
                  ...(activeCat === c.id && { background: c.color, borderColor: c.color }),
                }}
                onClick={() => setActiveCat(c.id)}>
                {c.icon} {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Products grid */}
      <div className="wrap" style={{ paddingTop: 32, paddingBottom: 80 }}>
        <div style={{ marginBottom: 16, fontSize: 13, color: 'var(--muted)' }}>{products.length} product{products.length !== 1 ? 's' : ''}</div>

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 18 }}>
            {[1,2,3,4,5,6,7,8].map(i => <div key={i} className="skel" style={{ height: 320, borderRadius: 'var(--rl)' }} />)}
          </div>
        ) : products.length === 0 ? (
          <div className="empty"><div className="empty-t">No digital products found</div><p style={{ color: 'var(--muted)' }}>Try a different category</p></div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 18 }}>
            {products.map(p => {
              const cat = DIGITAL_CATS.find(c => c.id === p.category);
              return (
                <div key={p.id} className="product-card" onClick={() => navigate(`/shop/${p.slug}`)}>
                  <div style={{ aspectRatio: '1', position: 'relative', overflow: 'hidden' }}>
                    {p.images?.[0]?.url ? (
                      <>
                        <img src={p.images[0].url} alt={p.title} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform .4s' }}
                          onMouseEnter={e => e.target.style.transform = 'scale(1.05)'}
                          onMouseLeave={e => e.target.style.transform = 'scale(1)'} />
                        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to top,${cat?.bg || '#111'}dd,transparent 55%)` }} />
                      </>
                    ) : (
                      <div style={{ width: '100%', height: '100%', background: `linear-gradient(145deg,${cat?.bg || '#1B4332'},${cat?.color || '#2D6A4F'}44)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 36, opacity: .3 }}>{cat?.icon || '📦'}</span>
                      </div>
                    )}
                    {/* Category badge */}
                    {cat && <div style={{ position: 'absolute', top: 10, left: 10, background: `${cat.color}dd`, color: '#fff', fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', padding: '3px 10px', borderRadius: 20, zIndex: 3 }}>{cat.icon} {cat.label}</div>}
                    {/* Sale badge */}
                    {p.comparePrice && <div className="badge b-red" style={{ position: 'absolute', top: 10, right: 10, zIndex: 3 }}>SALE</div>}
                    {/* Wishlist */}
                    <button className={`wish-btn${isWished(p.id) ? ' active' : ''}`}
                      style={{ position: 'absolute', bottom: 10, right: 10 }}
                      onClick={e => { e.stopPropagation(); toggleWishlist(p.id); }}>♥</button>
                    {/* Hover overlay */}
                    <div className="product-card-overlay">
                      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <button className="btn btn-p btn-sm" style={{ width: '100%', justifyContent: 'center' }}
                          onClick={e => { e.stopPropagation(); addToCart(p); }}>Add to Cart — £{Number(p.basePrice).toFixed(2)}</button>
                      </div>
                    </div>
                    {/* Format badge at bottom-left */}
                    {p.fileFormat && (
                      <div style={{ position: 'absolute', bottom: 10, left: 10, background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(6px)', color: 'rgba(255,255,255,.7)', fontSize: 9, fontFamily: 'var(--fm)', padding: '3px 8px', borderRadius: 10, letterSpacing: .5 }}>
                        {p.fileFormat.split('+')[0].trim()}
                      </div>
                    )}
                  </div>

                  <div style={{ padding: 14 }}>
                    <div style={{ display: 'flex', gap: 3, marginBottom: 4 }}>{p.sdgIds?.slice(0, 3).map(id => <SdgDot key={id} id={id} />)}</div>
                    <h3 style={{ fontFamily: 'var(--fd)', fontSize: 16, fontWeight: 600, marginBottom: 2, lineHeight: 1.3 }}>{p.title}</h3>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
                      <span>{p.artist?.displayName}</span>
                      <span>{p.charity?.name}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontFamily: 'var(--fd)', fontSize: 17, color: 'var(--accent)', fontWeight: 700 }}>£{Number(p.basePrice).toFixed(2)}</span>
                        {p.comparePrice && <span style={{ fontFamily: 'var(--fd)', fontSize: 12, color: 'var(--muted)', textDecoration: 'line-through', marginLeft: 6 }}>£{Number(p.comparePrice).toFixed(2)}</span>}
                      </div>
                      {p.avgRating && <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--gold)' }}>★ {p.avgRating}</div>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Responsive override for mobile */}
      <style>{`
        @media(max-width:1024px){
          .wrap > div[style*="grid-template-columns: repeat(4"]{grid-template-columns:repeat(2,1fr)!important}
        }
        @media(max-width:640px){
          .wrap > div[style*="grid-template-columns: repeat(4"]{grid-template-columns:1fr!important}
          .wrap > div[style*="grid-template-columns: repeat(2"]{grid-template-columns:1fr!important}
        }
      `}</style>
    </div>
  );
}
