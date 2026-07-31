import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Heart, ArrowRight } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { SDGs, FRAMED_CATEGORIES } from '../data/constants';
import api from '../utils/api';
import Icon from '../components/ui/Icon';
import EditionBadge, { priceLabel, priceAmount } from '../components/ui/EditionBadge';

function SdgDot({ id }) {
  const s = SDGs.find(x => x.id === id); if (!s) return null;
  return <span className="sdg" title={s.n} style={{ background: s.c, color: '#fff', width: 22, height: 22, fontSize: 9, borderRadius: 5 }}>{id}</span>;
}

// Subcategory filter — mirrors the homepage's Originals row (mirrors the
// real `medium` field, lowercased, so real ARTWORK products with a tagged
// medium bucket correctly once any exist).
const ORIGINALS_SUBCATS = [
  { id: 'all', label: 'All' },
  { id: 'abstract', label: 'Abstract' },
  { id: 'oil', label: 'Oil' },
  { id: 'acrylic', label: 'Acrylic' },
];

// Full product-shaped placeholders (unlike the homepage carousel's
// lightweight item shape) so they render through the exact same grid/list/
// quick-view JSX real products do. No slug — every interactive action below
// (card click-through, Add to Cart, Wishlist) is guarded on slug presence
// so these can't reach checkout as a fake product.
const SUBCAT_PLACEHOLDERS = [
  { id: 'ph-1', slug: null, title: 'Crimson Bloom', artist: { displayName: 'Imani Osei' }, charity: { name: 'WaterAid UK' }, images: [{ url: 'https://images.unsplash.com/photo-1563882687284-b4381efc07f5?w=600&h=750&fit=crop&q=80' }], basePrice: 780, editionType: 'ORIGINAL', estimatedValue: 1450, category: 'ARTWORK', productType: 'SIMPLE', medium: 'Abstract', sdgIds: [] },
  { id: 'ph-2', slug: null, title: 'Ember & Indigo', artist: { displayName: 'Thabo Nkosi' }, charity: { name: 'Oxfam' }, images: [{ url: 'https://images.unsplash.com/photo-1541367777708-7905fe3296c0?w=600&h=750&fit=crop&q=80' }], basePrice: 850, editionType: 'ORIGINAL', estimatedValue: 1600, category: 'ARTWORK', productType: 'SIMPLE', medium: 'Abstract', sdgIds: [] },
  { id: 'ph-3', slug: null, title: 'The Little Pond', artist: { displayName: 'Selam Girma' }, charity: { name: 'WaterAid UK' }, images: [{ url: 'https://images.unsplash.com/photo-1688588426729-dc4f7bdb8fbe?w=600&h=750&fit=crop&q=80' }], basePrice: 1100, editionType: 'PRINT', category: 'ARTWORK', productType: 'SIMPLE', medium: 'Oil', sdgIds: [] },
  { id: 'ph-4', slug: null, title: 'The River at Dusk', artist: { displayName: 'Boipelo Seape' }, charity: { name: 'CAMFED' }, images: [{ url: 'https://images.unsplash.com/photo-1578926375605-eaf7559b1458?w=600&h=750&fit=crop&q=80' }], basePrice: 980, editionType: 'ORIGINAL', estimatedValue: 2100, category: 'ARTWORK', productType: 'SIMPLE', medium: 'Oil', sdgIds: [] },
  { id: 'ph-5', slug: null, title: 'Golden Hour Study', artist: { displayName: 'Malik Toure' }, charity: { name: 'CAMFED' }, images: [{ url: 'https://images.unsplash.com/flagged/photo-1563882687293-71c93ae4d7dc?w=600&h=750&fit=crop&q=80' }], basePrice: 640, editionType: 'PRINT', category: 'ARTWORK', productType: 'SIMPLE', medium: 'Acrylic', sdgIds: [] },
  { id: 'ph-6', slug: null, title: 'Coastal Fragments', artist: { displayName: 'Naledi Khumalo' }, charity: { name: 'Greenpeace Africa' }, images: [{ url: 'https://images.unsplash.com/photo-1704786574827-b4dfa47ad4f4?w=600&h=750&fit=crop&q=80' }], basePrice: 920, editionType: 'ORIGINAL', estimatedValue: 1800, category: 'ARTWORK', productType: 'SIMPLE', medium: 'Acrylic', sdgIds: [] },
];

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
  const [activeSubcat, setActiveSubcat] = useState('all');

  useEffect(() => {
    setLoading(true);
    const q = { limit: 12, page, sort: sort === 'asc' ? 'price_asc' : sort === 'desc' ? 'price_desc' : sort === 'newest' ? 'newest' : undefined };
    if (search) q.search = search;
    if (sdgF) q.sdg = sdgF;
    if (charityF) q.charityId = charityF;
    if (maxPrice < 3000) q.maxPrice = maxPrice;
    // A subcategory tab forces ARTWORK — there's no `medium` query param on
    // the backend, so real matches are narrowed client-side below instead.
    const cat = activeSubcat !== 'all' ? 'ARTWORK' : params.get('category');
    if (cat) q.category = cat;

    api.getProducts(q).then(r => { setProducts(r.items || []); setTotal(r.total || 0); }).catch(() => {}).finally(() => setLoading(false));
  }, [search, sdgF, charityF, sort, maxPrice, page, params, activeSubcat]);

  // When a subcategory tab is active: narrow real results to matching
  // medium client-side (no backend support for it), then top up with
  // subcat-tagged placeholders so the tab never renders empty.
  const displayProducts = activeSubcat === 'all' ? products : [
    ...products.filter(p => (p.medium || '').toLowerCase() === activeSubcat),
    ...SUBCAT_PLACEHOLDERS.filter(p => p.medium.toLowerCase() === activeSubcat),
  ];
  const displayTotal = activeSubcat === 'all' ? total : displayProducts.length;

  const goToProduct = (p) => { if (p.slug) navigate(`/shop/${p.slug}`); };
  const addPlaceholderAware = (e, p) => {
    e.stopPropagation();
    if (!p.slug) { toast('This is a placeholder — real products coming soon', 'info'); return; }
    addToCart(p);
  };

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
                <option value="featured">Featured</option><option value="asc">Price: Low to High</option><option value="desc">Price: High to Low</option><option value="newest">Newest</option>
              </select>
              <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
                {[['grid', '⊞'], ['list', '≡']].map(([v, ico]) => (
                  <button key={v} className="btn btn-g" style={{ padding: '9px 13px', background: view === v ? 'var(--glassh)' : 'transparent', fontSize: 17 }} onClick={() => setView(v)}>{ico}</button>
                ))}
              </div>
            </div>
          </div>
          {/* Subcategory tabs — Originals, filterable by medium */}
          <div style={{ display: 'flex', gap: 8, marginTop: 20, flexWrap: 'wrap' }}>
            {ORIGINALS_SUBCATS.map(s => (
              <button key={s.id} className={`btn ${activeSubcat === s.id ? 'btn-p' : 'btn-s'} btn-sm`} onClick={() => { setActiveSubcat(s.id); setPage(1); }}>{s.label}</button>
            ))}
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
            <div style={{ marginBottom: 14, fontSize: 13, color: 'var(--muted)' }}>{displayTotal} artwork{displayTotal !== 1 ? 's' : ''} found</div>
            {loading ? (
              <div className="product-grid">{[1,2,3,4,5,6].map(i => <div key={i} className="skel" style={{ height: 380, borderRadius: 'var(--rl)' }} />)}</div>
            ) : displayProducts.length === 0 ? (
              <div className="empty"><div className="empty-t">No artworks found</div><p style={{ color: 'var(--muted)' }}>Try adjusting your filters</p></div>
            ) : view === 'grid' ? (
              <div className="product-grid">
                {displayProducts.map(p => (
                  <div key={p.id} className="product-card" onClick={() => goToProduct(p)} style={{ cursor: p.slug ? 'pointer' : 'default' }}>
                    <div className={`product-card-img${FRAMED_CATEGORIES.includes(p.category) ? ' pf-framed' : ''}`}>
                      {p.images?.[0]?.url ? <img src={p.images[0].url} alt={p.title} loading="lazy" /> : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(145deg,#1B4332,#2D6A4F)' }} />}
                      <div className="product-card-overlay">
                        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 7 }}>
                          <button className="btn btn-p" style={{ width: '100%', justifyContent: 'center' }} onClick={e => addPlaceholderAware(e, p)}>Add to Cart</button>
                          <button className="btn btn-s btn-sm" style={{ width: '100%', justifyContent: 'center' }} onClick={e => { e.stopPropagation(); setQv(p); }}>Quick View</button>
                        </div>
                      </div>
                      {p.comparePrice && <div className="badge b-red" style={{ position: 'absolute', top: 10, left: 10, zIndex: 3 }}>SALE</div>}
                      <EditionBadge editionType={p.editionType} style={{ position: 'absolute', top: 10, right: 44, zIndex: 3 }} />
                      <button className={`wish-btn${isWished(p.id) ? ' active' : ''}`} onClick={e => { e.stopPropagation(); if (!p.slug) { toast('This is a placeholder — real products coming soon', 'info'); return; } toggleWishlist(p.id); toast(isWished(p.id) ? 'Removed from wishlist' : 'Added to wishlist'); }}><Icon icon={Heart} size="inline" fill={isWished(p.id) ? 'currentColor' : 'none'} /></button>
                    </div>
                    <div className="product-card-body">
                      <div style={{ display: 'flex', gap: 3, marginBottom: 6 }}>{p.sdgIds?.map(id => <SdgDot key={id} id={id} />)}</div>
                      <h3 style={{ fontFamily: 'var(--fd)', fontSize: 18, fontWeight: 600, marginBottom: 3 }}>{p.title}</h3>
                      <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>by {p.artist?.displayName} · {p.charity?.name}</p>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>
                          {priceLabel(p) && <span style={{ display: 'block', fontSize: 9, fontWeight: 700, letterSpacing: .6, textTransform: 'uppercase', color: 'var(--muted)' }}>{priceLabel(p)}</span>}
                          <span style={{ fontFamily: 'var(--fd)', fontSize: 18, color: 'var(--accent)', fontWeight: 700 }}>£{priceAmount(p).toLocaleString()}</span>
                        </span>
                        <span className="badge b-muted" style={{ fontSize: 9, textTransform: 'capitalize' }}>{p.productType?.toLowerCase()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {displayProducts.map(p => (
                  <div key={p.id} className="card card-h" style={{ display: 'flex', gap: 18, padding: 16, cursor: p.slug ? 'pointer' : 'default' }} onClick={() => goToProduct(p)}>
                    <div className={FRAMED_CATEGORIES.includes(p.category) ? 'pf-contain' : ''} style={{ width: 76, height: 76, borderRadius: 'var(--r)', overflow: 'hidden', flexShrink: 0 }}>
                      {p.images?.[0]?.url ? <img src={p.images[0].url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', background: '#1B4332' }} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: 3, marginBottom: 4, alignItems: 'center' }}>{p.sdgIds?.map(id => <SdgDot key={id} id={id} />)}<EditionBadge editionType={p.editionType} /></div>
                      <h3 style={{ fontFamily: 'var(--fd)', fontSize: 18, fontWeight: 600, marginBottom: 2 }}>{p.title}</h3>
                      <p style={{ fontSize: 11, color: 'var(--muted)' }}>{p.artist?.displayName} · {p.medium} · {p.charity?.name}</p>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      {priceLabel(p) && <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: .6, textTransform: 'uppercase', color: 'var(--muted)' }}>{priceLabel(p)}</div>}
                      <div style={{ fontFamily: 'var(--fd)', fontSize: 20, color: 'var(--accent)', fontWeight: 700, marginBottom: 8 }}>£{priceAmount(p).toLocaleString()}</div>
                      <button className="btn btn-p btn-sm" onClick={e => addPlaceholderAware(e, p)}>Add to Cart</button>
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
                <div className={FRAMED_CATEGORIES.includes(qv.category) ? 'pf-framed' : ''} style={{ aspectRatio: '1', borderRadius: 'var(--r)', overflow: 'hidden', position: 'relative' }}>
                  {qv.images?.[0]?.url ? <img src={qv.images[0].url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', background: '#1B4332' }} />}
                </div>
                <div>
                  <div style={{ display: 'flex', gap: 3, marginBottom: 8, alignItems: 'center' }}>{qv.sdgIds?.map(id => <SdgDot key={id} id={id} />)}<EditionBadge editionType={qv.editionType} /></div>
                  <p style={{ fontSize: 13, color: 'var(--txt2)', lineHeight: 1.7, marginBottom: 14 }}>{qv.description?.slice(0, 180)}…</p>
                  {priceLabel(qv) && <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: .6, textTransform: 'uppercase', color: 'var(--muted)' }}>{priceLabel(qv)}</div>}
                  <div style={{ fontFamily: 'var(--fd)', fontSize: 26, color: 'var(--accent)', fontWeight: 700, marginBottom: 14 }}>£{priceAmount(qv).toLocaleString()}</div>
                  <button className="btn btn-p" style={{ width: '100%', justifyContent: 'center' }} onClick={() => { if (!qv.slug) { toast('This is a placeholder — real products coming soon', 'info'); return; } addToCart(qv); setQv(null); }}>Add to Cart</button>
                  {qv.slug && <button className="btn btn-g" style={{ width: '100%', justifyContent: 'center', marginTop: 7, display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={() => { navigate(`/shop/${qv.slug}`); setQv(null); }}>Full Details <Icon icon={ArrowRight} size="inline" /></button>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
