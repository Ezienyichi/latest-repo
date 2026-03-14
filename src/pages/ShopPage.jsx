import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { SDGs } from '../data/constants';
import api from '../utils/api';

function SdgDot({ id }) {
  const s = SDGs.find(x => x.id === id); if (!s) return null;
  return <span className="sdg" title={s.n} style={{ background: s.c, color: '#fff', width: 22, height: 22, fontSize: 9, borderRadius: 5 }}>{id}</span>;
}

export default function ShopPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { addToCart, toast, toggleWishlist, isWished } = useCart();
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(params.get('search') || '');
  const [sdgF, setSdgF] = useState(null);
  const [charityF, setCharityF] = useState('');
  const [sort, setSort] = useState('featured');
  const [view, setView] = useState('grid');
  const [maxPrice, setMaxPrice] = useState(3000);
  const [page, setPage] = useState(1);
  const [qv, setQv] = useState(null);

  useEffect(() => {
    setLoading(true);
    const q = { limit: 12, page, sort: sort === 'asc' ? 'price_asc' : sort === 'desc' ? 'price_desc' : sort === 'newest' ? 'newest' : undefined };
    if (search) q.search = search;
    if (sdgF) q.sdg = sdgF;
    if (charityF) q.charityId = charityF;
    if (maxPrice < 3000) q.maxPrice = maxPrice;
    const cat = params.get('category');
    if (cat) q.category = cat;

    api.getProducts(q).then(r => { setProducts(r.items || []); setTotal(r.total || 0); }).catch(() => {}).finally(() => setLoading(false));
  }, [search, sdgF, charityF, sort, maxPrice, page, params]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--base)' }}>
      {/* Header */}
      <div style={{ background: 'var(--base)', padding: '48px 48px 28px', borderBottom: '1px solid var(--border)' }}>
        <div className="wrap">
          <div className="breadcrumbs"><Link to="/">Home</Link><span className="sep">›</span><span className="current">Shop</span></div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
            <div>
              <div className="lbl" style={{ marginBottom: 8 }}>Marketplace</div>
              <h1 className="display" style={{ fontSize: 48 }}>Discover Artworks</h1>
            </div>
            <div style={{ display: 'flex', gap: 9, alignItems: 'center', flexWrap: 'wrap' }}>
              <input className="fi" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} style={{ width: 220 }} />
              <select className="fi fsel" value={sort} onChange={e => setSort(e.target.value)} style={{ width: 160 }}>
                <option value="featured">Featured</option><option value="asc">Price ↑</option><option value="desc">Price ↓</option><option value="newest">Newest</option>
              </select>
              <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
                {[['grid', '⊞'], ['list', '≡']].map(([v, ico]) => (
                  <button key={v} className="btn btn-g" style={{ padding: '9px 13px', background: view === v ? 'var(--glassh)' : 'transparent', fontSize: 17 }} onClick={() => setView(v)}>{ico}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="wrap" style={{ paddingTop: 28, paddingBottom: 80 }}>
        <div className="filter-layout">
          {/* Sidebar */}
          <div className="filter-sidebar">
            <div className="card" style={{ padding: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 18 }}>Filters</div>
              <div style={{ marginBottom: 20 }}>
                <div className="fl">SDG Category</div>
                <div className={`pill${!sdgF ? ' on' : ''}`} style={{ display: 'block', marginBottom: 5, fontSize: 11 }} onClick={() => setSdgF(null)}>All SDGs</div>
                <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {SDGs.map(s => (
                    <div key={s.id} className={`pill${sdgF === s.id ? ' on' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', fontSize: 11 }} onClick={() => setSdgF(sdgF === s.id ? null : s.id)}>
                      <SdgDot id={s.id} />{s.n}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="fl">Max Price: £{maxPrice.toLocaleString()}</div>
                <input type="range" min={0} max={3000} step={50} value={maxPrice} onChange={e => setMaxPrice(Number(e.target.value))} style={{ width: '100%', marginTop: 8 }} />
              </div>
            </div>
          </div>

          {/* Products */}
          <div>
            <div style={{ marginBottom: 14, fontSize: 13, color: 'var(--muted)' }}>{total} artwork{total !== 1 ? 's' : ''} found</div>
            {loading ? (
              <div className="product-grid">{[1,2,3,4,5,6].map(i => <div key={i} className="skel" style={{ height: 380, borderRadius: 'var(--rl)' }} />)}</div>
            ) : products.length === 0 ? (
              <div className="empty"><div className="empty-t">No artworks found</div><p style={{ color: 'var(--muted)' }}>Try adjusting your filters</p></div>
            ) : view === 'grid' ? (
              <div className="product-grid">
                {products.map(p => (
                  <div key={p.id} className="product-card" onClick={() => navigate(`/shop/${p.slug}`)}>
                    <div className="product-card-img">
                      {p.images?.[0]?.url ? <img src={p.images[0].url} alt={p.title} loading="lazy" /> : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(145deg,#1B4332,#2D6A4F)' }} />}
                      <div className="product-card-overlay">
                        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 7 }}>
                          <button className="btn btn-p" style={{ width: '100%', justifyContent: 'center' }} onClick={e => { e.stopPropagation(); addToCart(p); }}>Add to Cart</button>
                          <button className="btn btn-s btn-sm" style={{ width: '100%', justifyContent: 'center' }} onClick={e => { e.stopPropagation(); setQv(p); }}>Quick View</button>
                        </div>
                      </div>
                      {p.comparePrice && <div className="badge b-red" style={{ position: 'absolute', top: 10, left: 10, zIndex: 3 }}>SALE</div>}
                      <button className={`wish-btn${isWished(p.id) ? ' active' : ''}`} onClick={e => { e.stopPropagation(); toggleWishlist(p.id); toast(isWished(p.id) ? 'Removed from wishlist' : 'Added to wishlist'); }}>♥</button>
                    </div>
                    <div className="product-card-body">
                      <div style={{ display: 'flex', gap: 3, marginBottom: 6 }}>{p.sdgIds?.map(id => <SdgDot key={id} id={id} />)}</div>
                      <h3 style={{ fontFamily: 'var(--fd)', fontSize: 18, fontWeight: 600, marginBottom: 3 }}>{p.title}</h3>
                      <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>by {p.artist?.displayName} · {p.charity?.name}</p>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontFamily: 'var(--fd)', fontSize: 18, color: 'var(--accent)', fontWeight: 700 }}>£{Number(p.basePrice).toLocaleString()}</span>
                        <span className="badge b-muted" style={{ fontSize: 9, textTransform: 'capitalize' }}>{p.productType?.toLowerCase()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {products.map(p => (
                  <div key={p.id} className="card card-h" style={{ display: 'flex', gap: 18, padding: 16, cursor: 'pointer' }} onClick={() => navigate(`/shop/${p.slug}`)}>
                    <div style={{ width: 76, height: 76, borderRadius: 'var(--r)', overflow: 'hidden', flexShrink: 0 }}>
                      {p.images?.[0]?.url ? <img src={p.images[0].url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', background: '#1B4332' }} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: 3, marginBottom: 4 }}>{p.sdgIds?.map(id => <SdgDot key={id} id={id} />)}</div>
                      <h3 style={{ fontFamily: 'var(--fd)', fontSize: 18, fontWeight: 600, marginBottom: 2 }}>{p.title}</h3>
                      <p style={{ fontSize: 11, color: 'var(--muted)' }}>{p.artist?.displayName} · {p.medium} · {p.charity?.name}</p>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontFamily: 'var(--fd)', fontSize: 20, color: 'var(--accent)', fontWeight: 700, marginBottom: 8 }}>£{Number(p.basePrice).toLocaleString()}</div>
                      <button className="btn btn-p btn-sm" onClick={e => { e.stopPropagation(); addToCart(p); }}>Add to Cart</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick View Modal */}
      {qv && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setQv(null)}>
          <div className="modal" style={{ maxWidth: 560 }}>
            <div className="mhead"><h3 style={{ fontFamily: 'var(--fd)', fontSize: 22 }}>{qv.title}</h3><button className="mclose" onClick={() => setQv(null)}>×</button></div>
            <div className="mbody">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22 }}>
                <div style={{ aspectRatio: '1', borderRadius: 'var(--r)', overflow: 'hidden' }}>
                  {qv.images?.[0]?.url ? <img src={qv.images[0].url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', background: '#1B4332' }} />}
                </div>
                <div>
                  <div style={{ display: 'flex', gap: 3, marginBottom: 8 }}>{qv.sdgIds?.map(id => <SdgDot key={id} id={id} />)}</div>
                  <p style={{ fontSize: 13, color: 'var(--txt2)', lineHeight: 1.7, marginBottom: 14 }}>{qv.description?.slice(0, 180)}…</p>
                  <div style={{ fontFamily: 'var(--fd)', fontSize: 26, color: 'var(--accent)', fontWeight: 700, marginBottom: 14 }}>£{Number(qv.basePrice).toLocaleString()}</div>
                  <button className="btn btn-p" style={{ width: '100%', justifyContent: 'center' }} onClick={() => { addToCart(qv); setQv(null); }}>Add to Cart</button>
                  <button className="btn btn-g" style={{ width: '100%', justifyContent: 'center', marginTop: 7 }} onClick={() => { navigate(`/shop/${qv.slug}`); setQv(null); }}>Full Details →</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
