import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Star, Globe, Palette, ZoomIn, Award, ArrowRight, Check, Heart, Download, Info } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { SDGs, DIGITAL_CATS } from '../data/constants';
import Icon from '../components/ui/Icon';
import ProductAddons from '../components/ui/ProductAddons';
import CertificateModal from '../components/ui/CertificateModal';
import SocialShare from '../components/ui/SocialShare';
import EbookPreview from '../components/ui/EbookPreview';
import MusicPlayer from '../components/ui/MusicPlayer';
import GraphicPreview from '../components/ui/GraphicPreview';
import AnimationPreview from '../components/ui/AnimationPreview';
import IncludesList from '../components/ui/IncludesList';
import CharityLogo from '../components/ui/CharityLogo';
import api from '../utils/api';

function SdgDot({ id, sm }) {
  const s = SDGs.find(x => x.id === id); if (!s) return null;
  const sz = sm ? 22 : 26;
  return <span className="sdg" title={s.n} style={{ background: s.c, color: '#fff', width: sz, height: sz, fontSize: sm ? 9 : 10, borderRadius: 5 }}>{id}</span>;
}

function Stars({ val, onChange, ro }) {
  return <div className="stars">{[1,2,3,4,5].map(i => <span key={i} style={{ cursor: ro ? 'default' : 'pointer', color: i <= val ? 'var(--gold)' : 'var(--border)' }} onClick={() => !ro && onChange?.(i)}><Icon icon={Star} size="inline" fill={i <= val ? 'currentColor' : 'none'} /></span>)}</div>;
}

export default function ProductPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addToCart, toast, toggleWishlist, isWished } = useCart();
  const { user } = useAuth();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [zoomPos, setZoomPos] = useState(null); // { x, y } for hover zoom
  const [selVar, setSelVar] = useState(null);
  const [qty, setQty] = useState(1);
  const [addonValues, setAddonValues] = useState({});
  const [tab, setTab] = useState('details');
  const [certOpen, setCertOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [rvText, setRvText] = useState('');
  const [upsells, setUpsells] = useState([]);
  const imgRef = useRef(null);

  useEffect(() => {
    setLoading(true); setActiveImg(0); setAddonValues({}); setTab('details'); setQty(1);
    api.getProduct(slug).then(p => {
      setProduct(p);
      if (p.variations?.length) setSelVar(p.variations[0]);
      // Fetch upsells if available
      if (p.upsellIds?.length) {
        Promise.all(p.upsellIds.slice(0, 4).map(id =>
          api.getProducts({ limit: 1 }).then(r => r.items?.[0]).catch(() => null)
        )).then(items => setUpsells(items.filter(Boolean)));
      }
    }).catch(() => toast('Product not found', 'err')).finally(() => setLoading(false));
  }, [slug]);

  if (loading) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', gap: 32, maxWidth: 1100, width: '100%', padding: '0 48px' }}>
        <div className="skel" style={{ flex: 1, aspectRatio: '3/2', borderRadius: 16 }} />
        <div style={{ flex: 1 }}><div className="skel" style={{ height: 32, width: '60%', borderRadius: 8, marginBottom: 12 }} /><div className="skel" style={{ height: 20, width: '40%', borderRadius: 6, marginBottom: 20 }} /><div className="skel" style={{ height: 48, width: '30%', borderRadius: 8 }} /></div>
      </div>
    </div>
  );
  if (!product) return <div className="wrap" style={{ padding: '80px 48px', textAlign: 'center' }}><h2>Product not found</h2><button className="btn btn-p" onClick={() => navigate('/shop')}>Back to Shop</button></div>;

  const images = product.gallery?.images || product.images || [];
  const hasVideo = !!product.gallery?.video;
  const totalSlides = images.length + (hasVideo ? 1 : 0);
  const isVideoActive = hasVideo && activeImg === images.length;
  const price = selVar ? Number(selVar.price) : Number(product.basePrice);
  const reviews = product.reviews || [];
  const avgRating = reviews.length ? (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1) : null;
  const cat = DIGITAL_CATS.find(c => c.id === product.category);
  const isDigital = product.category !== 'ARTWORK';

  const handleAddToCart = () => {
    // Check required addons
    const missing = (product.addons || []).filter(ao => ao.required && !addonValues[ao.id]);
    if (missing.length) { toast(`Please fill: ${missing.map(a => a.label).join(', ')}`, 'err'); return; }
    addToCart(product, qty, selVar, addonValues);
  };

  const submitReview = async () => {
    if (!rating) { toast('Select a star rating', 'err'); return; }
    if (!user) { toast('Sign in to review', 'err'); return; }
    try {
      await api.addReview(slug, { rating, text: rvText });
      toast('Review submitted!', 'ok');
      setRating(0); setRvText('');
      const p = await api.getProduct(slug); setProduct(p);
    } catch (e) { toast(e.message, 'err'); }
  };

  // Hover zoom handler
  const handleImgMouseMove = (e) => {
    if (isVideoActive) return;
    const rect = imgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPos({ x, y });
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--base)', paddingBottom: 80 }}>
      <div className="wrap" style={{ paddingTop: 28 }}>
        <div className="breadcrumbs">
          <Link to="/">Home</Link><span className="sep">›</span>
          <Link to={isDigital ? '/digitals' : '/shop'}>{isDigital ? 'Digital Store' : 'Shop'}</Link><span className="sep">›</span>
          <span className="current">{product.title}</span>
        </div>

        <div className="detail-layout">
          {/* ═══ LEFT — GALLERY ═══ */}
          <div style={{ position: 'sticky', top: 86 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {/* Vertical thumbnails */}
              {totalSlides > 1 && (
                <div className="gallery-vert">
                  {images.map((img, i) => {
                    const isImpact = img.label?.startsWith('Project Impact');
                    return (
                      <div key={i} className={`gallery-thumb${activeImg === i ? ' active' : ''}`}
                        onClick={() => { setActiveImg(i); setZoomPos(null); }} title={img.label}>
                        <img src={img.url?.replace('w=1200', 'w=120').replace('w=700', 'w=120')} alt={img.label} loading="lazy" />
                        {isImpact && <div style={{ position: 'absolute', inset: 0, background: 'rgba(23,124,29,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon icon={Globe} size="inline" /></div>}
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,.6)', color: '#fff', fontSize: 7, textAlign: 'center', padding: 2, fontWeight: 700, letterSpacing: .4, textTransform: 'uppercase' }}>{img.label?.split(' — ')[0]}</div>
                      </div>
                    );
                  })}
                  {hasVideo && (
                    <div className={`gallery-thumb${isVideoActive ? ' active' : ''}`}
                      onClick={() => setActiveImg(images.length)} style={{ background: '#000' }}>
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(255,255,255,.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#111' }}>▶</div>
                      </div>
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,.65)', color: '#fff', fontSize: 7, textAlign: 'center', padding: 2, fontWeight: 700 }}>VIDEO</div>
                    </div>
                  )}
                </div>
              )}

              {/* Main image / video */}
              <div style={{ flex: 1 }}>
                <div ref={imgRef} className="gallery-main"
                  style={{ aspectRatio: product.category === 'ANIMATION' ? '16/9' : '3/2', cursor: isVideoActive ? 'default' : 'zoom-in', overflow: 'hidden', position: 'relative' }}
                  onClick={() => !isVideoActive && images[activeImg] && setLightbox(true)}
                  onMouseMove={handleImgMouseMove}
                  onMouseLeave={() => setZoomPos(null)}>

                  {isVideoActive ? (
                    <iframe src={`https://www.youtube.com/embed/${product.gallery.video}?autoplay=1&mute=1&loop=1&playlist=${product.gallery.video}&modestbranding=1&rel=0`}
                      allow="autoplay; encrypted-media" allowFullScreen style={{ width: '100%', height: '100%', border: 'none' }} title="Video" />
                  ) : images[activeImg] ? (
                    <img key={activeImg} src={images[activeImg].url} alt={product.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', animation: 'carouselSlide .3s ease',
                        ...(zoomPos ? { transform: 'scale(1.8)', transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`, transition: 'transform .1s ease' } : { transition: 'transform .3s ease' })
                      }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', background: `linear-gradient(145deg,${cat?.bg || '#1B4332'},${cat?.color || '#2D6A4F'}44)`, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: .2 }}><Icon icon={Palette} size={48} /></div>
                  )}

                  {/* Category badge */}
                  {cat && !isVideoActive && <div style={{ position: 'absolute', top: 10, left: 10, background: `${cat.color}dd`, color: '#fff', fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', padding: '3px 10px', borderRadius: 20, zIndex: 3, display: 'flex', alignItems: 'center', gap: 4 }}><Icon icon={cat.icon} size="inline" /> {cat.label}</div>}

                  {/* Zoom hint */}
                  {!isVideoActive && !zoomPos && <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,.45)', color: 'rgba(255,255,255,.8)', fontSize: 10, padding: '3px 9px', borderRadius: 20, pointerEvents: 'none', display: 'flex', alignItems: 'center', gap: 4 }}><Icon icon={ZoomIn} size="inline" /> Hover to zoom · Click for lightbox</div>}

                  {/* Counter */}
                  {totalSlides > 1 && <div style={{ position: 'absolute', bottom: 10, right: 10, background: 'rgba(0,0,0,.52)', color: '#fff', fontSize: 11, fontFamily: 'var(--fm)', padding: '3px 9px', borderRadius: 20, pointerEvents: 'none' }}>{isVideoActive ? '▶ Video' : `${activeImg + 1} / ${images.length}`}</div>}

                  {/* Label pill */}
                  {!isVideoActive && images[activeImg]?.label && <div style={{ position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,.55)', color: '#fff', fontSize: 10, fontWeight: 600, letterSpacing: 1.5, textTransform: 'uppercase', padding: '3px 12px', borderRadius: 20, whiteSpace: 'nowrap', pointerEvents: 'none' }}>{images[activeImg].label}</div>}

                  {/* Nav arrows */}
                  {totalSlides > 1 && <>
                    <button className="carousel-nav prev" onClick={e => { e.stopPropagation(); setActiveImg(i => (i - 1 + totalSlides) % totalSlides); setZoomPos(null); }}>‹</button>
                    <button className="carousel-nav next" onClick={e => { e.stopPropagation(); setActiveImg(i => (i + 1) % totalSlides); setZoomPos(null); }}>›</button>
                  </>}
                </div>

                {/* Horizontal dots */}
                {totalSlides > 1 && (
                  <div style={{ display: 'flex', gap: 5, justifyContent: 'center', marginTop: 8 }}>
                    {images.map((_, i) => <div key={i} onClick={() => setActiveImg(i)} style={{ width: activeImg === i ? 16 : 5, height: 5, borderRadius: 3, background: activeImg === i ? 'var(--accent)' : 'var(--border)', cursor: 'pointer', transition: 'all .2s' }} />)}
                    {hasVideo && <div onClick={() => setActiveImg(images.length)} style={{ width: isVideoActive ? 16 : 5, height: 5, borderRadius: 3, background: isVideoActive ? 'var(--gold)' : 'var(--border)', cursor: 'pointer', transition: 'all .2s' }} />}
                  </div>
                )}
              </div>
            </div>

            {/* Certificate badge */}
            {product.autoCertificate && (
              <div style={{ marginTop: 16, padding: '12px 16px', background: 'linear-gradient(135deg,#fff 0%,#faf8f2 100%)', border: '2px solid var(--gold)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
                onClick={() => setCertOpen(true)}>
                <Icon icon={Award} size={24} style={{ color: 'var(--gold)' }} />
                <div style={{ flex: 1 }}><div style={{ fontSize: 12, fontWeight: 700, color: '#1B4332', letterSpacing: 1 }}>Certificate of Authenticity</div>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>ID: {product.certificateId} · Click to preview</div></div>
                <Icon icon={ArrowRight} style={{ color: 'var(--gold)' }} />
              </div>
            )}
          </div>

          {/* ═══ RIGHT — PRODUCT INFO ═══ */}
          <div>
            {/* SDG badges + type */}
            <div style={{ display: 'flex', gap: 5, marginBottom: 12, flexWrap: 'wrap' }}>
              {product.sdgIds?.map(id => <SdgDot key={id} id={id} />)}
              <span className="badge b-muted" style={{ textTransform: 'capitalize' }}>{product.productType?.toLowerCase()}</span>
              {isDigital && <span className="badge b-blue">{product.category}</span>}
            </div>

            {/* Title */}
            <h1 className="display" style={{ fontSize: 42, marginBottom: 8 }}>{product.title}</h1>
            <p style={{ fontSize: 15, color: 'var(--txt2)', marginBottom: 6 }}>
              by <span style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: 500 }} onClick={() => navigate(`/artists/${product.artist?.id}`)}>{product.artist?.displayName}</span>
              {product.medium && <> · {product.medium}</>}
              {product.year && <> · {product.year}</>}
            </p>
            {product.fileFormat && <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--fm)', marginBottom: 12 }}>Format: {product.fileFormat}</div>}

            {/* Rating summary */}
            {avgRating && <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}><Stars val={Math.round(avgRating)} ro /><span style={{ fontSize: 13, color: 'var(--muted)' }}>{avgRating} ({reviews.length} review{reviews.length !== 1 ? 's' : ''})</span></div>}

            {/* Price */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 22 }}>
              <span style={{ fontFamily: 'var(--fd)', fontSize: 42, color: 'var(--accent)', fontWeight: 700 }}>£{price.toLocaleString()}</span>
              {product.comparePrice && <span style={{ fontFamily: 'var(--fd)', fontSize: 22, color: 'var(--muted)', textDecoration: 'line-through' }}>£{Number(product.comparePrice).toLocaleString()}</span>}
              {product.comparePrice && <span className="badge b-red">SAVE £{(Number(product.comparePrice) - price).toLocaleString()}</span>}
            </div>

            {/* Variations */}
            {product.variations?.length > 0 && (
              <div style={{ marginBottom: 22 }}>
                <div className="fl">Select Option</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {product.variations.map(v => (
                    <div key={v.id} onClick={() => setSelVar(v)} style={{ padding: '12px 16px', borderRadius: 'var(--r)', border: `2px solid ${selVar?.id === v.id ? 'var(--mint)' : 'var(--border)'}`, cursor: 'pointer', background: selVar?.id === v.id ? 'rgba(23,124,29,.08)' : 'var(--glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all .18s' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {selVar?.id === v.id && <span style={{ color: 'var(--mint)' }}><Icon icon={Check} size="inline" /></span>}
                        <span style={{ fontSize: 14 }}>{Object.values(v.attributeCombination || {}).join(' · ')}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontFamily: 'var(--fd)', fontSize: 18, color: 'var(--accent)', fontWeight: 700 }}>£{Number(v.price).toLocaleString()}</span>
                        {v.stockQuantity != null && <span style={{ fontSize: 10, color: v.stockQuantity > 0 ? 'var(--muted)' : '#dc2626' }}>{v.stockQuantity > 0 ? `${v.stockQuantity} in stock` : 'Sold out'}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Product Add-Ons */}
            {product.addons?.length > 0 && (
              <ProductAddons addons={product.addons} values={addonValues} onChange={setAddonValues} conditionalRules={[]} />
            )}

            {/* Quantity + Cart + Wishlist */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              <div className="qty">
                <button className="qty-b" onClick={() => setQty(Math.max(1, qty - 1))}>−</button>
                <input className="qty-i" type="number" value={qty} min={1} onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))} />
                <button className="qty-b" onClick={() => setQty(qty + 1)}>+</button>
              </div>
              <button className="btn btn-p btn-lg" style={{ flex: 1, justifyContent: 'center' }} onClick={handleAddToCart}>
                Add to Cart — £{(price * qty).toLocaleString()}
              </button>
              <button className={`btn ${isWished(product.id) ? 'btn-p' : 'btn-s'} btn-icon`} style={{ width: 48, height: 48 }}
                onClick={() => { toggleWishlist(product.id); toast(isWished(product.id) ? 'Removed from wishlist' : 'Added to wishlist', 'ok'); }}
                title={isWished(product.id) ? 'Remove from wishlist' : 'Add to wishlist'}>
                <Icon icon={Heart} fill={isWished(product.id) ? 'currentColor' : 'none'} />
              </button>
            </div>

            {/* Social share */}
            <div style={{ marginBottom: 22 }}>
              <SocialShare title={`${product.title} by ${product.artist?.displayName} — Change Art Gallery`} />
            </div>

            {/* Charity impact card */}
            {product.charity && (
              <div className="card" style={{ padding: 18, marginBottom: 22, display: 'flex', gap: 14, alignItems: 'center', cursor: 'pointer', background: 'rgba(23,124,29,.04)', border: '1px solid rgba(23,124,29,.15)' }}
                onClick={() => navigate(`/charities/${product.charity.id}`)}>
                <CharityLogo logo={product.charity.logo} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>{product.charity.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--txt2)', lineHeight: 1.5 }}>10% of this sale goes directly to their SDG-aligned projects</div>
                </div>
                <span style={{ color: 'var(--accent)', fontSize: 13, flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 4 }}>View charity <Icon icon={ArrowRight} size="inline" /></span>
              </div>
            )}

            {/* Digital product previews */}
            {product.category === 'EBOOK' && <EbookPreview product={product} />}
            {product.category === 'MUSIC' && <MusicPlayer product={product} />}
            {product.category === 'GRAPHIC' && <GraphicPreview product={product} />}
            {product.category === 'ANIMATION' && <AnimationPreview product={product} />}

            {/* What's included (for digital products) */}
            {product.tags?.length > 3 && isDigital && (
              <IncludesList items={product.tags.slice(0, 8)} title="Includes" />
            )}

            {/* Description */}
            <p style={{ fontSize: 14, color: 'var(--txt2)', lineHeight: 1.85, marginBottom: 24 }}>{product.description}</p>

            {/* Tabs */}
            <div className="tabs-container">
              {['details', 'shipping', 'certificate', 'reviews'].map(t => (
                <button key={t} className={`tab-btn${tab === t ? ' active' : ''}`} onClick={() => setTab(t)} style={{ textTransform: 'capitalize' }}>
                  {t} {t === 'reviews' ? `(${reviews.length})` : ''}
                </button>
              ))}
            </div>

            {tab === 'details' && (
              <div style={{ fontSize: 13, color: 'var(--txt2)', lineHeight: 1.85 }}>
                {[['Medium', product.medium], ['Dimensions', product.dimensions], ['Year', product.year], ['Format', product.fileFormat], ['Pages', product.pages], ['SKU', product.sku], ['Stock', product.stockQuantity != null ? `${product.stockQuantity} available` : null]].filter(([, v]) => v).map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontWeight: 600, minWidth: 100, color: 'var(--txt)' }}>{k}</span><span>{v}</span>
                  </div>
                ))}
                {product.tags?.length > 0 && <div style={{ marginTop: 14, display: 'flex', gap: 6, flexWrap: 'wrap' }}>{product.tags.map(t => <span key={t} className="tag">{t}</span>)}</div>}
              </div>
            )}

            {tab === 'shipping' && (
              <div style={{ fontSize: 13, color: 'var(--txt2)', lineHeight: 1.85 }}>
                {isDigital ? (
                  <div className="alert alert-ok"><Icon icon={Download} size="inline" /><div>This is a <strong>digital product</strong>. After purchase, you'll receive instant download access via email and your account dashboard. No shipping required.</div></div>
                ) : (
                  <>
                    <p style={{ marginBottom: 12 }}>Free shipping on orders over £500. Standard shipping: £12.99.</p>
                    <p style={{ marginBottom: 12 }}>All physical artworks are professionally packaged with protective crating. Delivery within 5–10 business days (UK). International shipping available.</p>
                    <p>Tracking information provided via email once dispatched.</p>
                  </>
                )}
              </div>
            )}

            {tab === 'certificate' && (
              <div>
                {product.autoCertificate ? (
                  <>
                    <div className="alert alert-ok" style={{ marginBottom: 16 }}><Icon icon={Award} size="inline" /><div>This {isDigital ? 'product' : 'artwork'} includes a <strong>premium Certificate of Authenticity</strong> with a unique QR verification code.</div></div>
                    <div style={{ fontSize: 13, color: 'var(--txt2)', lineHeight: 1.85, marginBottom: 16 }}>
                      <p>The certificate includes: artist name, artwork title, charity partner, SDG project, platform seal, unique certificate ID, and a QR code linking to the verification page.</p>
                      <p style={{ marginTop: 8 }}>Delivered digitally upon purchase and downloadable from your account.</p>
                    </div>
                    <button className="btn btn-gold" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={() => setCertOpen(true)}>Preview Certificate <Icon icon={ArrowRight} size="inline" /></button>
                  </>
                ) : (
                  <div className="alert alert-i"><Icon icon={Info} size="inline" /><div>This product does not include an auto-generated certificate. The artist may provide their own certificate separately.</div></div>
                )}
              </div>
            )}

            {tab === 'reviews' && (
              <div>
                {avgRating && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22, padding: 18, background: 'var(--glass)', borderRadius: 'var(--r)' }}>
                    <span style={{ fontFamily: 'var(--fd)', fontSize: 40, fontWeight: 700, color: 'var(--gold)' }}>{avgRating}</span>
                    <div><Stars val={Math.round(avgRating)} ro /><div style={{ fontSize: 11, color: 'var(--muted)' }}>{reviews.length} review{reviews.length !== 1 ? 's' : ''}</div></div>
                  </div>
                )}
                {reviews.map((r, i) => (
                  <div key={i} style={{ padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{r.user?.firstName || 'Anonymous'} {r.user?.lastName?.[0] || ''}</div>
                      <Stars val={r.rating} ro />
                    </div>
                    {r.text && <p style={{ fontSize: 13, color: 'var(--txt2)', lineHeight: 1.65 }}>{r.text}</p>}
                  </div>
                ))}
                <div style={{ marginTop: 24, padding: 18, background: 'var(--glass)', borderRadius: 'var(--r)' }}>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>Write a Review</div>
                  <div style={{ display: 'flex', gap: 2, marginBottom: 10 }}>
                    {[1,2,3,4,5].map(i => <span key={i} style={{ cursor: 'pointer', color: i <= rating ? 'var(--gold)' : 'var(--border)' }} onClick={() => setRating(i)}><Icon icon={Star} size={24} fill={i <= rating ? 'currentColor' : 'none'} /></span>)}
                  </div>
                  <textarea className="fi fta" value={rvText} onChange={e => setRvText(e.target.value)} placeholder="Share your thoughts..." rows={3} style={{ marginBottom: 10 }} />
                  <button className="btn btn-p btn-sm" onClick={submitReview}>Submit Review</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ═══ UPSELLS / CROSS-SELLS ═══ */}
        {upsells.length > 0 && (
          <div style={{ marginTop: 56, paddingTop: 36, borderTop: '1px solid var(--border)' }}>
            <div className="lbl" style={{ marginBottom: 10 }}>You May Also Like</div>
            <h2 className="display" style={{ fontSize: 32, marginBottom: 22 }}>Related Artworks</h2>
            <div className="g4" style={{ gap: 16 }}>
              {upsells.map(p => (
                <div key={p.id} className="product-card" onClick={() => navigate(`/shop/${p.slug}`)}>
                  <div className="product-card-img" style={{ aspectRatio: '1' }}>
                    {p.images?.[0]?.url ? <img src={p.images[0].url} alt={p.title} loading="lazy" /> : <div style={{ width: '100%', height: '100%', background: '#1B4332' }} />}
                  </div>
                  <div className="product-card-body">
                    <h3 style={{ fontFamily: 'var(--fd)', fontSize: 16, fontWeight: 600, marginBottom: 3 }}>{p.title}</h3>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>{p.artist?.displayName}</div>
                    <span style={{ fontFamily: 'var(--fd)', fontSize: 16, color: 'var(--accent)', fontWeight: 700 }}>£{Number(p.basePrice).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && images.length > 0 && (
        <div className="lightbox-overlay" onClick={e => e.target === e.currentTarget && setLightbox(false)}>
          <button className="lightbox-close" onClick={() => setLightbox(false)}>×</button>
          {images.length > 1 && <>
            <button className="lightbox-nav prev" onClick={() => setActiveImg(i => (i - 1 + images.length) % images.length)}>‹</button>
            <button className="lightbox-nav next" onClick={() => setActiveImg(i => (i + 1) % images.length)}>›</button>
          </>}
          <img className="lightbox-img" src={images[activeImg]?.url?.replace('w=700', 'w=1600').replace('w=1200', 'w=1800')} alt={product.title} />
          {images[activeImg]?.label && <div className="lightbox-caption">{images[activeImg].label}</div>}
          <div className="lightbox-counter">{activeImg + 1} / {images.length}</div>
          {images.length > 1 && <div className="lightbox-thumbs">
            {images.map((img, i) => <div key={i} className={`lightbox-thumb${i === activeImg ? ' active' : ''}`} onClick={() => setActiveImg(i)}><img src={img.url?.replace('w=1200', 'w=120').replace('w=700', 'w=120')} alt="" loading="lazy" /></div>)}
          </div>}
        </div>
      )}

      {/* Certificate modal */}
      {certOpen && <CertificateModal product={product} onClose={() => setCertOpen(false)} />}
    </div>
  );
}
