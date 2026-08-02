import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Palette, Check, ImageOff } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { SDGs, FRAMED_CATEGORIES } from '../data/constants';
import api from '../utils/api';
import Icon from '../components/ui/Icon';
import CharityLogo from '../components/ui/CharityLogo';
import TrustBadges from '../components/ui/TrustBadges';
import EditionBadge, { priceLabel, priceAmount } from '../components/ui/EditionBadge';
import PartnersCarousel from '../components/ui/PartnersCarousel';

function SdgDot({ id, sm }) {
  const s = SDGs.find(x => x.id === id);
  if (!s) return null;
  const sz = sm ? 22 : 26;
  return <span className="sdg" title={`SDG ${id}: ${s.n}`} style={{ background: s.c, color: '#fff', width: sz, height: sz, fontSize: sm ? 9 : 10, borderRadius: 5 }}>{id}</span>;
}

// Placeholder pool for the homepage gallery carousels — used only to fill a
// row out to ROW_TARGET when real ACTIVE products don't cover it yet. Every
// image below is a standard (non-Unsplash+) images.unsplash.com CDN link,
// free for commercial use under the Unsplash License, downloaded and
// visually inspected before being added here. Charity names match real
// seeded CharityProfile rows; artist names are intentionally fictional
// placeholders, not reused real seeded artists, so nothing here
// misattributes a real person's work.
//
// `subcat` drives the filter tabs: for Originals it mirrors the real
// `medium` field (lowercased) so real ARTWORK products bucket correctly if
// an artist has tagged medium as abstract/oil/acrylic; for Digital Works it
// mirrors the real `category` enum, except 'DIGITAL_ART' which has no
// schema equivalent — that tab is placeholder-only until/unless a real
// category is added for it.
const ORIGINALS_SUBCATS = [
  { id: 'all', label: 'All' },
  { id: 'abstract', label: 'Abstract' },
  { id: 'oil', label: 'Oil' },
  { id: 'acrylic', label: 'Acrylic' },
];
const DIGITAL_SUBCATS = [
  { id: 'all', label: 'All' },
  { id: 'MUSIC', label: 'Music' },
  { id: 'GRAPHIC', label: 'Graphics' },
  { id: 'DIGITAL_ART', label: 'Digital Art' },
];
const PAINTING_PLACEHOLDERS = [
  { title: 'Crimson Bloom', artist: 'Imani Osei', price: 780, editionType: 'ORIGINAL', estimatedValue: 1450, charityName: 'WaterAid UK', category: 'ARTWORK', subcat: 'abstract', img: 'https://images.unsplash.com/photo-1563882687284-b4381efc07f5?w=600&h=750&fit=crop&q=80' },
  { title: 'Golden Hour Study', artist: 'Malik Toure', price: 640, editionType: 'PRINT', charityName: 'CAMFED', category: 'ARTWORK', subcat: 'acrylic', img: 'https://images.unsplash.com/flagged/photo-1563882687293-71c93ae4d7dc?w=600&h=750&fit=crop&q=80' },
  { title: 'Coastal Fragments', artist: 'Naledi Khumalo', price: 920, editionType: 'ORIGINAL', estimatedValue: 1800, charityName: 'Greenpeace Africa', category: 'ARTWORK', subcat: 'acrylic', img: 'https://images.unsplash.com/photo-1704786574827-f4dfa47ad4f4?w=600&h=750&fit=crop&q=80' },
  { title: 'Ember & Indigo', artist: 'Thabo Nkosi', price: 850, editionType: 'ORIGINAL', estimatedValue: 1600, charityName: 'Oxfam', category: 'ARTWORK', subcat: 'abstract', img: 'https://images.unsplash.com/photo-1541367777708-7905fe3296c0?w=600&h=750&fit=crop&q=80' },
  { title: 'The Little Pond', artist: 'Selam Girma', price: 1100, editionType: 'PRINT', charityName: 'WaterAid UK', category: 'ARTWORK', subcat: 'oil', img: 'https://images.unsplash.com/photo-1688588426729-dc4f7bdb8fbe?w=600&h=750&fit=crop&q=80' },
  { title: 'The River at Dusk', artist: 'Boipelo Seape', price: 980, editionType: 'ORIGINAL', estimatedValue: 2100, charityName: 'CAMFED', category: 'ARTWORK', subcat: 'oil', img: 'https://images.unsplash.com/photo-1578926375605-eaf7559b1458?w=600&h=750&fit=crop&q=80' },
];
const DIGITAL_PLACEHOLDERS = [
  { title: 'Midnight Sessions', artist: 'Kwame Boateng', price: 12, charityName: 'Oxfam', category: 'MUSIC', subcat: 'MUSIC', img: 'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=600&h=750&fit=crop&q=80' },
  { title: 'Analog Mix', artist: 'Nia Kariuki', price: 15, charityName: 'WaterAid UK', category: 'MUSIC', subcat: 'MUSIC', img: 'https://images.unsplash.com/photo-1574517947730-55cb23e608c2?w=600&h=750&fit=crop&q=80' },
  { title: 'Prism Set Vol. 2', artist: 'Zainab Hassan', price: 35, charityName: 'WaterAid UK', category: 'GRAPHIC', subcat: 'GRAPHIC', img: 'https://images.unsplash.com/photo-1639170952854-16636715af61?w=600&h=750&fit=crop&q=80' },
  { title: 'Fracture Grid', artist: 'Owen Mensah', price: 26, charityName: 'CAMFED', category: 'GRAPHIC', subcat: 'GRAPHIC', img: 'https://images.unsplash.com/photo-1754411072193-fa49c36554e4?w=600&h=750&fit=crop&q=80' },
  { title: 'Chromatic Drift', artist: 'Tumi Radebe', price: 28, charityName: 'CAMFED', category: 'DIGITAL_ART', subcat: 'DIGITAL_ART', img: 'https://images.unsplash.com/photo-1748363565614-7fea470379f4?w=600&h=750&fit=crop&q=80' },
  { title: 'Still Frame', artist: 'Nomvula Dube', price: 22, charityName: 'Oxfam', category: 'DIGITAL_ART', subcat: 'DIGITAL_ART', img: 'https://images.unsplash.com/photo-1736147066581-95fa303553a0?w=600&h=750&fit=crop&q=80' },
];
const ROW_TARGET = 6;

// Fallback shown until PageContent('homepage').fundraisingProjects loads —
// same shape admin will edit later. There's no Project model yet (tracked
// separately), so these are explicitly illustrative, not live-tracked
// campaigns — each still points at a real seeded CharityProfile by name.
const FUNDRAISING_PROJECTS_FALLBACK = [
  { title: 'Clean Water Access — Northern Kenya', blurb: 'Boreholes and hand-pumps bringing safe drinking water to rural communities.', charityName: 'WaterAid UK', image: 'https://images.pexels.com/photos/3030281/pexels-photo-3030281.jpeg?auto=compress&cs=tinysrgb&w=700' },
  { title: "Girls' Education Fund — Rural Ghana", blurb: 'School fees, books, and mentorship supporting girls through secondary education.', charityName: 'CAMFED', image: 'https://images.pexels.com/photos/6963779/pexels-photo-6963779.jpeg?auto=compress&cs=tinysrgb&w=700' },
  { title: 'Community Reforestation — Kenya', blurb: 'Native tree planting to restore degraded land and support local livelihoods.', charityName: 'Greenpeace Africa', image: 'https://images.pexels.com/photos/18468252/pexels-photo-18468252.jpeg?auto=compress&cs=tinysrgb&w=700' },
];

function GalleryCard({ item, onClick, onCharityClick }) {
  const framed = FRAMED_CATEGORIES.includes(item.category);
  const label = priceLabel(item);
  return (
    <div className="gallery-card" onClick={onClick} tabIndex={0} role="button"
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}>
      <div className={`gallery-card-img-wrap${framed ? ' pf-framed' : ''}`}>
        <img src={item.img} alt={item.title} loading="lazy" draggable={false} />
        <EditionBadge editionType={item.editionType} style={{ position: 'absolute', top: 10, left: 10, zIndex: 3 }} />
      </div>
      <div className="gallery-card-body">
        <h3 className="gallery-card-title">{item.title}</h3>
        <p className="gallery-card-artist">by {item.artist}</p>
        <div className="gallery-card-foot">
          <span>
            {label && <span className="gallery-card-est-lbl">{label}</span>}
            <span className="gallery-card-price">£{priceAmount(item).toLocaleString()}</span>
          </span>
          {item.charityId ? (
            <span className="gallery-card-charity" onClick={e => { e.stopPropagation(); onCharityClick(item.charityId); }}>
              <CharityLogo logo={item.charityLogo} size={14} /> {item.charityName}
            </span>
          ) : (
            <span className="gallery-card-charity gallery-card-charity-static">
              <CharityLogo logo={null} size={14} /> {item.charityName}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// Continuous, right-to-left auto-scrolling carousel. The card list is
// rendered twice back-to-back; auto-scroll increments scrollLeft every
// frame and wraps by subtracting exactly one copy's width the instant it
// crosses that boundary — since both copies are pixel-identical, that jump
// is invisible, producing an endless loop with no visible seam.
//
// Manual drag/swipe uses the SAME scrollLeft the auto-scroll drives, so
// there's no mode-switch or position hand-off: dragging simply pauses the
// per-frame increment, and it resumes ~2s after release from wherever the
// user left it. Hover and keyboard focus pause immediately (no delay) and
// resume immediately when they end. prefers-reduced-motion skips the
// animation loop entirely, leaving a plain manually-scrollable row.
const AUTOSCROLL_PX_PER_SEC = 40;

function CarouselTrack({ items, itemKey, renderItem }) {
  const trackRef = useRef(null);
  const state = useRef({
    setWidth: 0, dragging: false, startX: 0, startScroll: 0, moved: false,
    hoverPaused: false, focusPaused: false, resumeAt: 0, reduced: false,
  });

  useEffect(() => {
    state.current.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    // Measure the real "repeat distance" (first card of copy two minus first
    // card of copy one) rather than scrollWidth/2 — scrollWidth also
    // includes the track's own outer padding (counted once, not per-copy),
    // which inflates scrollWidth/2 past the true repeat width. On wide
    // viewports that inflated value can exceed the browser's native max
    // scrollLeft (scrollWidth - clientWidth), so the wrap condition
    // (scrollLeft >= setWidth) can never fire — the loop silently stalls
    // pinned at the native ceiling instead of wrapping.
    const measure = () => {
      const n = items.length;
      const kids = el.children;
      state.current.setWidth = (n > 0 && kids.length >= 2 * n) ? kids[n].offsetLeft - kids[0].offsetLeft : el.scrollWidth / 2;
    };
    measure();
    el.scrollLeft = 0;
    window.addEventListener('resize', measure);
    if (state.current.reduced) return () => window.removeEventListener('resize', measure);

    let raf, last = performance.now();
    const tick = now => {
      const dt = (now - last) / 1000;
      last = now;
      const s = state.current;
      if (!s.dragging && !s.hoverPaused && !s.focusPaused && now >= s.resumeAt && s.setWidth > 0) {
        el.scrollLeft += AUTOSCROLL_PX_PER_SEC * dt;
        if (el.scrollLeft >= s.setWidth) el.scrollLeft -= s.setWidth;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', measure); };
  }, [items.length]);

  const onPointerDown = e => {
    if (e.pointerType !== 'mouse') return; // touch/pen keep native swipe scrolling
    const el = trackRef.current;
    const s = state.current;
    s.dragging = true; s.moved = false; s.startX = e.clientX; s.startScroll = el.scrollLeft;
    el.setPointerCapture(e.pointerId);
    el.classList.add('dragging');
  };
  const onPointerMove = e => {
    const s = state.current;
    if (!s.dragging) return;
    const el = trackRef.current;
    const dx = e.clientX - s.startX;
    if (Math.abs(dx) > 5) s.moved = true;
    let next = s.startScroll - dx;
    if (s.setWidth > 0) next = ((next % s.setWidth) + s.setWidth) % s.setWidth;
    el.scrollLeft = next;
  };
  const endDrag = e => {
    const s = state.current;
    if (!s.dragging) return;
    s.dragging = false;
    s.resumeAt = performance.now() + 2000; // resume auto-scroll ~2s after release
    const el = trackRef.current;
    el?.classList.remove('dragging');
    // Explicitly release pointer capture here rather than relying on the
    // implicit release-on-pointerup — with capture still technically held
    // at the instant the browser resolves the following synthetic click's
    // target, some engines retarget that click to the capturing element
    // (this track, which has no onClick) instead of the actual card under
    // the cursor, silently eating every mouse click on a real product.
    // Keyboard (Enter/Space, wired directly per-card) and touch (pointerType
    // check above skips capture entirely) were never affected — only mouse.
    if (e?.pointerId != null && el?.hasPointerCapture?.(e.pointerId)) el.releasePointerCapture(e.pointerId);
  };
  const onClickCapture = e => {
    if (state.current.moved) { e.stopPropagation(); e.preventDefault(); state.current.moved = false; }
  };

  const doubled = [...items, ...items];
  return (
    <div className="gallery-fullbleed" ref={trackRef}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerLeave={endDrag}
      onClickCapture={onClickCapture}
      onMouseEnter={() => { state.current.hoverPaused = true; }}
      onMouseLeave={() => { state.current.hoverPaused = false; }}
      onFocus={e => { if (e.target.matches(':focus-visible')) state.current.focusPaused = true; }}
      onBlur={() => { state.current.focusPaused = false; }}>
      {doubled.map((item, i) => renderItem(item, i))}
    </div>
  );
}

function GalleryRow({ label, heading, real, placeholders, subcats, browsePath, onOpen, onCharityClick }) {
  const [activeSubcat, setActiveSubcat] = useState('all');
  const isDigitalRow = subcats === DIGITAL_SUBCATS;

  const realMapped = real.map(p => ({
    id: p.id, slug: p.slug, title: p.title, artist: p.artist?.displayName || 'Unknown Artist',
    price: p.basePrice, category: p.category, img: p.images?.[0]?.url,
    editionType: p.editionType, estimatedValue: p.estimatedValue,
    subcat: isDigitalRow ? p.category : (p.medium || '').toLowerCase(),
    charityId: p.charity?.id, charityName: p.charity?.name || 'Unaffiliated', charityLogo: p.charity?.logo,
  })).filter(p => p.img);

  const merged = [...realMapped, ...placeholders]
    .filter(item => activeSubcat === 'all' || item.subcat === activeSubcat)
    .slice(0, ROW_TARGET);

  return (
    <div className="gallery-row">
      <div className="wrap">
        <div className="gallery-row-head">
          <div>
            <div className="lbl" style={{ marginBottom: 8 }}>{label}</div>
            <h3 className="display" style={{ fontSize: 30 }}>{heading}</h3>
          </div>
          <button className="btn btn-s" onClick={() => onOpen(browsePath)}>View All <Icon icon={ArrowRight} size="inline" /></button>
        </div>
        <div className="gallery-subcats">
          {subcats.map(s => (
            <button key={s.id} className={`gallery-subcat-tab${activeSubcat === s.id ? ' active' : ''}`} onClick={() => setActiveSubcat(s.id)}>
              {s.label}
            </button>
          ))}
        </div>
      </div>
      {merged.length === 0 ? (
        <div className="wrap">
          <div className="empty" style={{ padding: '48px 24px' }}>
            <div className="empty-ico"><Icon icon={ImageOff} size={40} /></div>
            <div className="empty-t" style={{ fontSize: 20 }}>Nothing here yet</div>
            <p style={{ color: 'var(--muted)', fontSize: 13 }}>Check back soon for new {label.toLowerCase()}.</p>
          </div>
        </div>
      ) : (
        <CarouselTrack items={merged}
          renderItem={(item, i) => (
            <GalleryCard key={`${item.slug || 'ph-' + (i % merged.length)}-${i < merged.length ? 'a' : 'b'}`} item={item} onCharityClick={onCharityClick}
              onClick={() => onOpen(item.slug ? `/shop/${item.slug}` : browsePath)} />
          )} />
      )}
    </div>
  );
}

// Cross-category pool (real categories only — DIGITAL_ART is a
// placeholder-only pseudo-category for the Digital Works subcat filter and
// doesn't belong in these catalog-wide rows) reused, in different
// slices/order, to fill Latest Collections and Top Sellers without
// sourcing more images. Originals Only reuses PAINTING_PLACEHOLDERS
// directly since every item in it already reads as an original piece.
const CROSS_CATEGORY_PLACEHOLDERS = [...PAINTING_PLACEHOLDERS, ...DIGITAL_PLACEHOLDERS.filter(p => p.category !== 'DIGITAL_ART')];
const LATEST_PLACEHOLDERS = CROSS_CATEGORY_PLACEHOLDERS.slice(0, ROW_TARGET);
const TOPSELLER_PLACEHOLDERS = [...CROSS_CATEGORY_PLACEHOLDERS].reverse().slice(0, ROW_TARGET);

function mapProduct(p) {
  return {
    id: p.id, slug: p.slug, title: p.title, artist: p.artist?.displayName || 'Unknown Artist',
    price: p.basePrice, category: p.category, img: p.images?.[0]?.url,
    editionType: p.editionType, estimatedValue: p.estimatedValue,
    charityId: p.charity?.id, charityName: p.charity?.name || 'Unaffiliated', charityLogo: p.charity?.logo,
  };
}

// Same CarouselTrack as GalleryRow, without the subcategory filter tabs —
// these three rows are each a single dynamic query (newest / bestselling /
// originals-only), not a filterable group.
function SimpleCarouselRow({ label, heading, real, placeholders, browsePath, onOpen, onCharityClick }) {
  const merged = [...real.map(mapProduct).filter(p => p.img), ...placeholders].slice(0, ROW_TARGET);

  return (
    <div className="gallery-row">
      <div className="wrap">
        <div className="gallery-row-head">
          <div>
            <div className="lbl" style={{ marginBottom: 8 }}>{label}</div>
            <h3 className="display" style={{ fontSize: 30 }}>{heading}</h3>
          </div>
          <button className="btn btn-s" onClick={() => onOpen(browsePath)}>View All <Icon icon={ArrowRight} size="inline" /></button>
        </div>
      </div>
      {merged.length === 0 ? (
        <div className="wrap">
          <div className="empty" style={{ padding: '48px 24px' }}>
            <div className="empty-ico"><Icon icon={ImageOff} size={40} /></div>
            <div className="empty-t" style={{ fontSize: 20 }}>Nothing here yet</div>
            <p style={{ color: 'var(--muted)', fontSize: 13 }}>Check back soon for new {label.toLowerCase()}.</p>
          </div>
        </div>
      ) : (
        <CarouselTrack items={merged}
          renderItem={(item, i) => (
            <GalleryCard key={`${item.slug || 'ph-' + (i % merged.length)}-${i < merged.length ? 'a' : 'b'}`} item={item} onCharityClick={onCharityClick}
              onClick={() => onOpen(item.slug ? `/shop/${item.slug}` : browsePath)} />
          )} />
      )}
    </div>
  );
}

// Existing hardcoded hero — the fallback whenever admin hasn't configured
// hero_media_type/hero_video_url/hero_image_url, or whatever they set
// fails to load.
const DEFAULT_HERO_VIDEO_SOURCES = [
  'https://videos.pexels.com/video-files/3571264/3571264-uhd_2560_1440_25fps.mp4',
  'https://videos.pexels.com/video-files/4172900/4172900-hd_1920_1080_25fps.mp4',
];
const DEFAULT_HERO_POSTER = 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=1920&q=85';

export default function HomePage() {
  const navigate = useNavigate();
  const { toast } = useCart();
  const [email, setEmail] = useState('');
  const [subbed, setSubbed] = useState(false);
  const [featured, setFeatured] = useState([]);
  const [theory, setTheory] = useState(null);
  const [content, setContent] = useState(null);
  const [heroFailed, setHeroFailed] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [paintings, setPaintings] = useState([]);
  const [digitalWorks, setDigitalWorks] = useState([]);
  const [latest, setLatest] = useState([]);
  const [topSellers, setTopSellers] = useState([]);
  const [originals, setOriginals] = useState([]);

  useEffect(() => {
    api.getProducts({ featured: 'true', limit: 16 }).then(r => setFeatured(r.items || [])).catch(() => {});
    api.getPublicSettings().then(setTheory).catch(() => {});
    api.getPageContent('homepage').then(r => setContent(r.body)).catch(() => {});
    // Fetch a larger batch than ROW_TARGET since sub-category tabs filter
    // client-side from this same set rather than re-fetching per tab.
    api.getProducts({ category: 'ARTWORK', limit: 24, sort: 'newest' }).then(r => setPaintings(r.items || [])).catch(() => {});
    api.getProducts({ limit: 48, sort: 'newest' }).then(r => setDigitalWorks((r.items || []).filter(p => p.category !== 'ARTWORK'))).catch(() => {});
    // Latest Collections — dynamic view: ACTIVE products, createdAt desc.
    api.getProducts({ limit: 24, sort: 'newest' }).then(r => setLatest(r.items || [])).catch(() => {});
    // Top Sellers — dynamic view: ACTIVE products ranked by units sold
    // (count of OrderItem rows per product; no soldCount field exists on
    // Product). Ties (everything, until real orders exist) fall back to
    // featured then newest — see products.js.
    api.getProducts({ limit: 24, sort: 'bestselling' }).then(r => setTopSellers(r.items || [])).catch(() => {});
    // Originals Only — product attribute filter on the new editionType field.
    api.getProducts({ editionType: 'ORIGINAL', limit: 24, sort: 'newest' }).then(r => setOriginals(r.items || [])).catch(() => {});
    setReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  // Reset the failure flag whenever the underlying setting changes (e.g.
  // admin fixes a broken URL) so it isn't stuck on the fallback forever.
  useEffect(() => { setHeroFailed(false); }, [theory?.hero_media_type, theory?.hero_video_url, theory?.hero_image_url]);

  const adminVideoReady = theory?.hero_media_type === 'video' && !!theory?.hero_video_url;
  const adminImageReady = theory?.hero_media_type === 'image' && !!theory?.hero_image_url;

  // Single decision point: 'video' (autoplaying) or 'still' (a plain
  // image — either the chosen still, or a video's poster when
  // prefers-reduced-motion is on, or the default poster once anything has
  // actually failed to load, so a failure never retries the same media).
  let heroRenderMode, heroStillSrc, heroPosterSrc, heroVideoSrcs;
  if (heroFailed) {
    heroRenderMode = 'still';
    heroStillSrc = DEFAULT_HERO_POSTER;
  } else if (adminVideoReady) {
    heroPosterSrc = theory.hero_poster_url || DEFAULT_HERO_POSTER;
    heroVideoSrcs = [theory.hero_video_url];
    heroRenderMode = reducedMotion ? 'still' : 'video';
    heroStillSrc = heroPosterSrc;
  } else if (adminImageReady) {
    heroRenderMode = 'still';
    heroStillSrc = theory.hero_image_url;
  } else {
    heroPosterSrc = DEFAULT_HERO_POSTER;
    heroVideoSrcs = DEFAULT_HERO_VIDEO_SOURCES;
    heroRenderMode = reducedMotion ? 'still' : 'video';
    heroStillSrc = DEFAULT_HERO_POSTER;
  }

  const openCharity = id => navigate(`/charities/${id}`);

  const sub = () => {
    if (!email.includes('@')) { toast('Enter a valid email', 'err'); return; }
    setSubbed(true);
    toast(`Welcome to the ${theory?.site_name || 'FastTackle Africa'} community!`, 'ok');
  };

  return (
    <div>
      {/* ═══ HERO — video or image background, admin-editable via
          SiteSetting hero_media_type/hero_video_url/hero_poster_url/
          hero_image_url; falls back to the default video below whenever
          nothing's configured or the chosen media fails to load ═══ */}
      <section style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
        {heroRenderMode === 'video' ? (
          <video className="hero-vid" autoPlay muted loop playsInline preload="auto"
            style={{ filter: 'saturate(1.25) brightness(.48) contrast(1.08)' }}
            poster={heroPosterSrc} onError={() => setHeroFailed(true)}>
            {heroVideoSrcs.map(src => <source key={src} src={src} type="video/mp4" />)}
          </video>
        ) : (
          <img className="hero-vid" src={heroStillSrc} alt="" aria-hidden="true" loading="eager"
            style={{ filter: 'saturate(1.25) brightness(.48) contrast(1.08)' }}
            onError={() => setHeroFailed(true)} />
        )}

        {/* Gradient overlays */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none', background: 'linear-gradient(108deg,rgba(5,12,8,.97) 0%,rgba(8,18,11,.88) 32%,rgba(12,24,15,.55) 58%,rgba(6,14,9,.78) 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none', background: 'radial-gradient(ellipse 55% 70% at 12% 20%,rgba(23,124,29,.22) 0%,transparent 65%)' }} />
        <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none', background: 'radial-gradient(ellipse 50% 60% at 88% 82%,rgba(255,173,0,.1) 0%,transparent 60%)' }} />

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: 1340, margin: '0 auto', padding: 'clamp(100px,12vh,150px) clamp(24px,4vw,64px) clamp(80px,10vh,110px)', display: 'grid', gridTemplateColumns: '1fr clamp(340px,32vw,440px)', gap: 'clamp(32px,5vw,80px)', alignItems: 'center' }}>
          <div>
            <div className="hero-tag">
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0, opacity: .9 }} />
              SDG-Aligned Art Commerce · 17 UN Goals
            </div>
            <h1 className="hero-h1">
              Where <em style={{ color: 'var(--gold)', fontStyle: 'italic', textShadow: '0 0 60px rgba(255,173,0,.35)' }}>Art</em><br />
              Funds <span style={{ color: 'var(--accent)', textShadow: '0 0 40px rgba(23,124,29,.4)' }}>Change</span>
            </h1>
            <p className="hero-sub">
              Connect with extraordinary artists, support verified charities. Every purchase carries a premium certificate of authenticity and funds a real sustainable development project.
            </p>
            <div className="hero-ctas">
              <button className="btn btn-p btn-lg" style={{ fontSize: 15, padding: '15px 32px', boxShadow: '0 8px 32px rgba(23,124,29,.4)', display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={() => navigate('/shop')}>
                Explore Artworks <Icon icon={ArrowRight} size="inline" />
              </button>
            </div>
            <div className="hero-stats">
              {[['2,847', 'Artworks Sold'], ['£184k', 'Funds Raised'], ['63', 'Charities Supported']].map(([v, l]) => (
                <div key={l}><div className="hero-stat-val">{v}</div><div className="hero-stat-lbl">{l}</div></div>
              ))}
            </div>
          </div>

          {/* Featured artwork card */}
          {featured[0] && (
            <div className="hero-card">
              <div className="hero-card-inner" onClick={() => navigate(`/shop/${featured[0].slug}`)} style={{ cursor: 'pointer' }}>
                <div style={{ aspectRatio: '4/5', position: 'relative', overflow: 'hidden' }}>
                  {featured[0].images?.[0]?.url ? (
                    <img src={featured[0].images[0].url} alt={featured[0].title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', background: 'linear-gradient(145deg,#1B4332,#2D6A4F)' }} />
                  )}
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(0,0,0,.92) 0%,rgba(0,0,0,.14) 45%,transparent 100%)' }} />
                  <div style={{ position: 'absolute', top: 14, left: 14, display: 'flex', gap: 5 }}>
                    {featured[0].sdgIds?.map(id => <SdgDot key={id} id={id} sm />)}
                  </div>
                  <div style={{ position: 'absolute', bottom: 16, left: 16, right: 16 }}>
                    <div style={{ fontFamily: 'var(--fd)', fontSize: 22, color: '#fff', fontWeight: 600, marginBottom: 4 }}>{featured[0].title}</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,.6)' }}>by {featured[0].artist?.displayName}</div>
                    <div style={{ fontFamily: 'var(--fd)', fontSize: 28, color: 'var(--gold)', fontWeight: 700, marginTop: 8 }}>£{Number(featured[0].basePrice).toLocaleString()}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ═══ TOP SELLERS — first content section after the hero ═══ */}
      <section className="section" style={{ background: 'var(--base)' }}>
        <SimpleCarouselRow label="Top Sellers" heading="Most Loved" real={topSellers} placeholders={TOPSELLER_PLACEHOLDERS}
          browsePath="/shop" onOpen={navigate} onCharityClick={openCharity} />
      </section>

      {/* ═══ THEORY OF CHANGE — full-bleed background image, text overlaid.
          Background image: theory_bg_image SiteSetting, admin-editable from
          AdminSettings.jsx same as the hero image; falls back to this
          placeholder (African artist at work — same photo already used
          elsewhere on the site) until admin sets one. Statement text:
          theoryStatement field on the 'homepage' PageContent row, same
          content?.field-with-fallback pattern the How It Works section
          above uses — no admin editor for PageContent exists yet, so the
          fallback is the copy of record until one is built. ═══ */}
      <section className="section toc-full">
        <img className="toc-full-bg" loading="lazy" aria-hidden="true" alt=""
          src={theory?.theory_bg_image || 'https://images.unsplash.com/photo-1611414779790-abb3e1ec462e?w=1920&q=75'} />
        <div className="toc-full-scrim" />
        <div className="wrap toc-full-content">
          <div className="lbl" style={{ marginBottom: 16, color: 'var(--accent2)' }}>Theory of Change</div>
          <p className="toc-full-text">
            {content?.theoryStatement || 'If creatives are given a trusted platform to sell their work alongside credible charitable partners, and if buyers get transparent ways to purchase products that directly finance SDG-aligned projects, then creative commerce becomes a sustainable source of philanthropic capital that strengthens nonprofits, empowers creative entrepreneurs, and delivers measurable improvements in communities worldwide.'}
          </p>
        </div>
      </section>

      {/* ═══ PRODUCT GALLERY (PART 1) — full-bleed carousels, heading stays in .wrap ═══ */}
      <section className="section" style={{ background: 'var(--base)' }}>
        <GalleryRow label="Originals" heading="Original Works" real={paintings} placeholders={PAINTING_PLACEHOLDERS}
          subcats={ORIGINALS_SUBCATS} browsePath="/shop" onOpen={navigate} onCharityClick={openCharity} />
        <GalleryRow label="Creative Digital Works" heading="Downloadable Creations" real={digitalWorks} placeholders={DIGITAL_PLACEHOLDERS}
          subcats={DIGITAL_SUBCATS} browsePath="/digitals" onOpen={navigate} onCharityClick={openCharity} />
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section className="section" style={{ background: 'var(--panel)' }}>
        <div className="wrap">
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div className="lbl" style={{ marginBottom: 10 }}>How It Works</div>
            <h2 className="display" style={{ fontSize: 46 }}>{content?.howItWorksHeading || 'From Creativity to Community Impact'}</h2>
          </div>
          <div className="g4" style={{ gap: 28 }}>
            {(content?.howItWorks || []).map(s => (
              <div key={s.n} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--fm)', fontSize: 44, color: 'var(--accent)', fontWeight: 700, opacity: .2, marginBottom: -10 }}>{s.n}</div>
                <h3 style={{ fontFamily: 'var(--fd)', fontSize: 22, fontWeight: 600, marginBottom: 10 }}>{s.t}</h3>
                <p style={{ fontSize: 13.5, color: 'var(--txt2)', lineHeight: 1.7 }}>{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ PRODUCT GALLERY (PART 2) — full-bleed carousels, heading stays in .wrap ═══ */}
      <section className="section" style={{ background: 'var(--base)' }}>
        <SimpleCarouselRow label="Latest Collections" heading="Just Added" real={latest} placeholders={LATEST_PLACEHOLDERS}
          browsePath="/shop?sort=newest" onOpen={navigate} onCharityClick={openCharity} />
        <SimpleCarouselRow label="Originals Only" heading="One-of-a-Kind Pieces" real={originals} placeholders={PAINTING_PLACEHOLDERS}
          browsePath="/shop" onOpen={navigate} onCharityClick={openCharity} />
      </section>

      {/* ═══ FUNDRAISING PROJECTS — placeholder gallery; no Project model
          yet, see FUNDRAISING_PROJECTS_FALLBACK comment above ═══ */}
      <section className="section" style={{ background: 'var(--panel)' }}>
        <div className="wrap">
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div className="lbl" style={{ marginBottom: 10 }}>Where Your Support Goes</div>
            <h2 className="display" style={{ fontSize: 46 }}>{content?.projectsHeading || 'Projects We\'re Funding'}</h2>
            <p style={{ fontSize: 14, color: 'var(--muted)', maxWidth: 560, margin: '12px auto 0' }}>A preview of the kind of SDG-aligned community projects your purchases and donations support.</p>
          </div>
          <div className="g3" style={{ gap: 24 }}>
            {(content?.fundraisingProjects || FUNDRAISING_PROJECTS_FALLBACK).map(proj => (
              <div key={proj.title} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ aspectRatio: '4/3', position: 'relative' }}>
                  <img src={proj.image} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <span className="badge b-muted" style={{ position: 'absolute', top: 10, left: 10 }}>Preview</span>
                </div>
                <div style={{ padding: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 6 }}>{proj.charityName}</div>
                  <h3 style={{ fontFamily: 'var(--fd)', fontSize: 19, fontWeight: 600, marginBottom: 8 }}>{proj.title}</h3>
                  <p style={{ fontSize: 13, color: 'var(--txt2)', lineHeight: 1.65 }}>{proj.blurb}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FEATURED ARTWORKS ═══ */}
      {featured.length > 0 && (
        <section className="section" style={{ background: 'var(--panel)' }}>
          <div className="wrap">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 36 }}>
              <div>
                <div className="lbl" style={{ marginBottom: 10 }}>Featured</div>
                <h2 className="display" style={{ fontSize: 44 }}>Curated Artworks</h2>
              </div>
              <button className="btn btn-s" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={() => navigate('/shop')}>View All <Icon icon={ArrowRight} size="inline" /></button>
            </div>
            <div className="g4">
              {featured.slice(0, 4).map(aw => (
                <div key={aw.id} className="card card-h" style={{ padding: 0, overflow: 'hidden', cursor: 'pointer' }}
                  onClick={() => navigate(`/shop/${aw.slug}`)}>
                  <div className={`product-card-img${FRAMED_CATEGORIES.includes(aw.category) ? ' pf-framed' : ''}`}>
                    {aw.images?.[0]?.url ? (
                      <img src={aw.images[0].url} alt={aw.title} loading="lazy" style={{ transition: 'transform .4s' }}
                        onMouseEnter={e => { if (!FRAMED_CATEGORIES.includes(aw.category)) e.target.style.transform = 'scale(1.04)'; }}
                        onMouseLeave={e => e.target.style.transform = 'scale(1)'} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', background: 'linear-gradient(145deg,#1B4332,#2D6A4F)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: .3 }}>
                        <Icon icon={Palette} size={40} />
                      </div>
                    )}
                    {aw.comparePrice && <div className="badge b-red" style={{ position: 'absolute', top: 10, left: 10, zIndex: 3 }}>SALE</div>}
                    <EditionBadge editionType={aw.editionType} style={{ position: 'absolute', top: 10, right: 10, zIndex: 3 }} />
                  </div>
                  <div style={{ padding: 14 }}>
                    <div style={{ display: 'flex', gap: 3, marginBottom: 6 }}>{aw.sdgIds?.map(id => <SdgDot key={id} id={id} sm />)}</div>
                    <h3 style={{ fontFamily: 'var(--fd)', fontSize: 18, fontWeight: 600, marginBottom: 3 }}>{aw.title}</h3>
                    <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 9 }}>by {aw.artist?.displayName} · {aw.charity?.name}</p>
                    {priceLabel(aw) && <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: .6, textTransform: 'uppercase', color: 'var(--muted)' }}>{priceLabel(aw)}</div>}
                    <div style={{ fontFamily: 'var(--fd)', fontSize: 18, color: 'var(--accent)', fontWeight: 700 }}>£{priceAmount(aw).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══ OUR PARTNERS — replaces the old SDG icon strip. Shared
          component, also used on the About page. ═══ */}
      <PartnersCarousel />

      {/* ═══ TESTIMONIALS ═══ */}
      <section className="section" style={{ background: 'var(--base)' }}>
        <div className="wrap">
          <div style={{ textAlign: 'center', marginBottom: 44 }}>
            <div className="lbl" style={{ marginBottom: 10 }}>Testimonials</div>
            <h2 className="display" style={{ fontSize: 44 }}>What People Say</h2>
          </div>
          <div className="g3" style={{ gap: 24 }}>
            {[
              { q: 'The platform perfectly bridges art and impact. My watercolour series has raised over £18,000 for girls\' education.', n: 'Yemi Adebayo', r: 'Artist, Lagos' },
              { q: 'We\'ve received more sustained donor engagement through art sales than from traditional fundraising campaigns.', n: 'WaterAid UK', r: 'Charity Partner' },
              { q: 'Knowing my purchase funds real change makes collecting art feel like an act of purpose. The certificates are beautiful.', n: 'Sarah Mitchell', r: 'Collector, London' },
            ].map(t => (
              <div key={t.n} className="card" style={{ padding: 28 }}>
                <div style={{ fontSize: 32, color: 'var(--gold)', lineHeight: 1, marginBottom: 12 }}>"</div>
                <p style={{ fontFamily: 'var(--fd)', fontSize: 17, fontStyle: 'italic', lineHeight: 1.7, marginBottom: 18, color: 'var(--txt)' }}>{t.q}</p>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{t.n}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{t.r}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ NEWSLETTER — artwork-on-an-easel background, dark scrim for legibility ═══ */}
      <section className="section newsletter-section">
        <img className="newsletter-bg-img" loading="lazy" aria-hidden="true" alt=""
          src="https://images.pexels.com/photos/10322821/pexels-photo-10322821.jpeg?auto=compress&cs=tinysrgb&w=1920" />
        <div className="newsletter-scrim" />
        <div className="wrap" style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 560, margin: '0 auto' }}>
          <div className="lbl" style={{ marginBottom: 12, color: 'var(--accent2)' }}>Stay Connected</div>
          <h2 className="display" style={{ fontSize: 46, marginBottom: 16, color: '#fff' }}>Join the Movement</h2>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,.82)', lineHeight: 1.8, marginBottom: 32 }}>Sign up for curated art drops, impact stories, and early access to new collections.</p>
          {subbed ? (
            <div className="alert alert-ok" style={{ justifyContent: 'center', fontSize: 15 }}><Icon icon={Check} size="inline" /> You're in! Welcome to the community.</div>
          ) : (
            <div style={{ display: 'flex', gap: 10, maxWidth: 440, margin: '0 auto' }}>
              <input className="fi fi-dark" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && sub()}
                style={{ flex: 1, background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.28)', color: '#fff' }} />
              <button className="btn btn-gold" onClick={sub}>Subscribe</button>
            </div>
          )}
        </div>
      </section>

      <TrustBadges />
    </div>
  );
}
