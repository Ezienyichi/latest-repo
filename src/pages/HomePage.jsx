import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Palette, Leaf, ShoppingBag, Check, ImageOff } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { SDGs } from '../data/constants';
import api from '../utils/api';
import Icon from '../components/ui/Icon';
import CharityLogo from '../components/ui/CharityLogo';

function SdgDot({ id, sm }) {
  const s = SDGs.find(x => x.id === id);
  if (!s) return null;
  const sz = sm ? 22 : 26;
  return <span className="sdg" title={`SDG ${id}: ${s.n}`} style={{ background: s.c, color: '#fff', width: sz, height: sz, fontSize: sm ? 9 : 10, borderRadius: 5 }}>{id}</span>;
}

// Placeholder pool for the homepage gallery rows — used only to fill out a
// row when real ACTIVE products don't cover it yet. Every image below is a
// standard (non-Unsplash+) images.unsplash.com CDN link, free for commercial
// use under the Unsplash License, downloaded and visually inspected before
// being added here. Charity names match real seeded CharityProfile rows;
// artist names are intentionally fictional placeholders, not reused real
// seeded artists, so nothing here misattributes a real person's work.
const PAINTING_PLACEHOLDERS = [
  { title: 'Crimson Bloom', artist: 'Imani Osei', price: 780, charityName: 'WaterAid UK', category: 'ARTWORK', img: 'https://images.unsplash.com/photo-1563882687284-b4381efc07f5?w=600&h=750&fit=crop&q=80' },
  { title: 'Golden Hour Study', artist: 'Malik Toure', price: 640, charityName: 'CAMFED', category: 'ARTWORK', img: 'https://images.unsplash.com/flagged/photo-1563882687293-71c93ae4d7dc?w=600&h=750&fit=crop&q=80' },
  { title: 'Coastal Fragments', artist: 'Naledi Khumalo', price: 920, charityName: 'Greenpeace Africa', category: 'ARTWORK', img: 'https://images.unsplash.com/photo-1704786574827-f4dfa47ad4f4?w=600&h=750&fit=crop&q=80' },
  { title: 'Ember & Indigo', artist: 'Thabo Nkosi', price: 850, charityName: 'Oxfam', category: 'ARTWORK', img: 'https://images.unsplash.com/photo-1541367777708-7905fe3296c0?w=600&h=750&fit=crop&q=80' },
];
const DIGITAL_PLACEHOLDERS = [
  { title: 'The Long Way Home', artist: 'Amina Bello', price: 18, charityName: 'CAMFED', category: 'EBOOK', img: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=600&h=750&fit=crop&q=80' },
  { title: 'Midnight Sessions', artist: 'Kwame Boateng', price: 12, charityName: 'Oxfam', category: 'MUSIC', img: 'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=600&h=750&fit=crop&q=80' },
  { title: 'Prism Set Vol. 2', artist: 'Zainab Hassan', price: 35, charityName: 'WaterAid UK', category: 'GRAPHIC', img: 'https://images.unsplash.com/photo-1639170952854-16636715af61?w=600&h=750&fit=crop&q=80' },
  { title: 'Kinetic Bloom', artist: 'Sipho Dlamini', price: 45, charityName: 'Greenpeace Africa', category: 'ANIMATION', img: 'https://images.unsplash.com/photo-1574717025058-2f8737d2e2b7?w=600&h=750&fit=crop&q=80' },
];
const ROW_TARGET = 4;

// Framed treatment (mat border + lifted shadow) for categories that read as
// "art on a wall" — paintings and graphic prints. Digital categories that
// are inherently flat media (ebook covers, music art) stay unframed.
const FRAMED_CATEGORIES = ['ARTWORK', 'GRAPHIC'];

function GalleryCard({ item, onClick, onCharityClick }) {
  const framed = FRAMED_CATEGORIES.includes(item.category);
  return (
    <div className={`gallery-card${framed ? ' gallery-card-framed' : ''}`} onClick={onClick}>
      <div className="gallery-card-img-wrap">
        <img src={item.img} alt={item.title} loading="lazy" />
      </div>
      <div className="gallery-card-body">
        <h3 className="gallery-card-title">{item.title}</h3>
        <p className="gallery-card-artist">by {item.artist}</p>
        <div className="gallery-card-foot">
          <span className="gallery-card-price">£{Number(item.price).toLocaleString()}</span>
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

function GalleryRow({ label, heading, real, placeholders, browsePath, onOpen, onCharityClick }) {
  const merged = [
    ...real.map(p => ({
      id: p.id, slug: p.slug, title: p.title, artist: p.artist?.displayName || 'Unknown Artist',
      price: p.basePrice, category: p.category, img: p.images?.[0]?.url,
      charityId: p.charity?.id, charityName: p.charity?.name || 'Unaffiliated', charityLogo: p.charity?.logo,
    })).filter(p => p.img),
    ...placeholders,
  ].slice(0, ROW_TARGET);

  return (
    <div className="gallery-row">
      <div className="gallery-row-head">
        <div>
          <div className="lbl" style={{ marginBottom: 8 }}>{label}</div>
          <h3 className="display" style={{ fontSize: 30 }}>{heading}</h3>
        </div>
        <button className="btn btn-s" onClick={() => onOpen(browsePath)}>View All <Icon icon={ArrowRight} size="inline" /></button>
      </div>
      {merged.length === 0 ? (
        <div className="empty" style={{ padding: '48px 24px' }}>
          <div className="empty-ico"><Icon icon={ImageOff} size={40} /></div>
          <div className="empty-t" style={{ fontSize: 20 }}>Nothing here yet</div>
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>Check back soon for new {label.toLowerCase()}.</p>
        </div>
      ) : (
        <div className="gallery-grid">
          {merged.map((item, i) => (
            <GalleryCard key={item.slug || `ph-${i}`} item={item} onCharityClick={onCharityClick}
              onClick={() => onOpen(item.slug ? `/shop/${item.slug}` : browsePath)} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const { toast } = useCart();
  const [email, setEmail] = useState('');
  const [subbed, setSubbed] = useState(false);
  const [featured, setFeatured] = useState([]);
  const [theory, setTheory] = useState(null);
  const [paintings, setPaintings] = useState([]);
  const [digitalWorks, setDigitalWorks] = useState([]);

  useEffect(() => {
    api.getProducts({ featured: 'true', limit: 16 }).then(r => setFeatured(r.items || [])).catch(() => {});
    api.getPublicSettings().then(setTheory).catch(() => {});
    api.getProducts({ category: 'ARTWORK', limit: ROW_TARGET, sort: 'newest' }).then(r => setPaintings(r.items || [])).catch(() => {});
    api.getProducts({ limit: 24, sort: 'newest' }).then(r => setDigitalWorks((r.items || []).filter(p => p.category !== 'ARTWORK'))).catch(() => {});
  }, []);

  const openCharity = id => navigate(`/charities/${id}`);

  const sub = () => {
    if (!email.includes('@')) { toast('Enter a valid email', 'err'); return; }
    setSubbed(true);
    toast(`Welcome to the ${theory?.site_name || 'FastTackle Africa'} community!`, 'ok');
  };

  return (
    <div>
      {/* ═══ HERO — full-bleed video background ═══ */}
      <section style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
        <video className="hero-vid" autoPlay muted loop playsInline preload="auto"
          style={{ filter: 'saturate(1.25) brightness(.48) contrast(1.08)' }}
          poster="https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=1920&q=85">
          <source src="https://videos.pexels.com/video-files/3571264/3571264-uhd_2560_1440_25fps.mp4" type="video/mp4" />
          <source src="https://videos.pexels.com/video-files/4172900/4172900-hd_1920_1080_25fps.mp4" type="video/mp4" />
        </video>

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
              <button className="btn btn-s btn-lg" style={{ fontSize: 15, padding: '15px 32px', background: 'rgba(255,255,255,.08)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,.2)', color: '#fff' }} onClick={() => navigate('/register')}>
                Partner With Us
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

      {/* ═══ THEORY OF CHANGE — editorial two-column ═══ */}
      <section className="toc2">
        <img className="toc2-watermark" src="https://images.unsplash.com/photo-1630068846062-3ffe78aa5049?w=900&q=60" alt="" aria-hidden="true" loading="lazy" />
        <div className="toc2-wrap">
          <div className="toc2-grid">
            <div className="toc2-photos">
              <img className="toc2-photo-main" loading="lazy"
                src="https://images.unsplash.com/photo-1536064479547-7ee40b74b807?w=700&h=780&fit=crop&q=80"
                alt="A community healthcare charity project" />
              <img className="toc2-photo-accent" loading="lazy"
                src="https://images.unsplash.com/photo-1611414779790-abb3e1ec462e?w=460&h=490&fit=crop&q=80"
                alt="An African artist at work on a canvas" />
            </div>
            <div className="toc2-copy">
              <div className="toc2-kicker">Theory of Change</div>
              <h2 className="toc2-heading">How Change Compounds</h2>
              {theory && (
                <>
                  <p className="toc2-para">{theory.theory_if}</p>
                  <div className="toc2-highlight">
                    <img className="toc2-highlight-thumb" loading="lazy"
                      src="https://images.unsplash.com/photo-1769117695165-6ecb44ff1150?w=340&h=180&fit=crop&q=80"
                      alt="Buyers and partners engaging with creative work" />
                    <div className="toc2-highlight-text">
                      <p className="toc2-clamp2">{theory.theory_and_if}</p>
                      <span className="toc2-link" onClick={() => navigate('/about')}>Learn more</span>
                    </div>
                  </div>
                  <p className="toc2-para toc2-para-second">{theory.theory_then}</p>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ PRODUCT GALLERY ═══ */}
      <section className="section" style={{ background: 'var(--base)' }}>
        <div className="wrap">
          <GalleryRow label="Paintings" heading="Original Works" real={paintings} placeholders={PAINTING_PLACEHOLDERS}
            browsePath="/shop" onOpen={navigate} onCharityClick={openCharity} />
          <GalleryRow label="Digital Works" heading="Downloadable Creations" real={digitalWorks} placeholders={DIGITAL_PLACEHOLDERS}
            browsePath="/digitals" onOpen={navigate} onCharityClick={openCharity} />
        </div>
      </section>

      {/* ═══ WHAT WE PROVIDE ═══ */}
      <section className="section" style={{ background: 'var(--panel)' }}>
        <div className="wrap">
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div className="lbl" style={{ marginBottom: 10 }}>What We Provide</div>
            <h2 className="display" style={{ fontSize: 46 }}>Value For Every Participant</h2>
          </div>
          <div className="g3" style={{ gap: 24 }}>
            {[
              { ico: Palette, t: 'For Artists & Creatives', cta: 'Start Selling', items: ['Value-driven buyers & collectors who care about impact', 'Increases the visibility and value of your creative works', 'Automatic Certificate of Authenticity generation', 'Direct connection to verified SDG charity projects', 'Full artist studio with portfolio, exhibitions & awards', 'Analytics dashboard — views, conversion, demographics'] },
              { ico: Leaf, t: 'For Charities & Non-Profits', cta: 'Apply as Charity', items: ['High possibility to receive capital campaigns & major gifts', 'Recurrent donation streams from art sales', 'Publicity and brand awareness through creative partnerships', 'Funder management — messaging, templates, resources', 'Daily appreciation reminders for donor engagement', 'SDG Impact Reports — auto-generated quarterly'] },
              { ico: ShoppingBag, t: 'For Buyers & Funders', cta: 'Browse Art', items: ['Every purchase supports a verified charitable cause', 'Premium Certificate of Authenticity with QR verification', 'Connect directly to the artists and their stories', 'Transparent impact — see exactly where your money goes', 'Support SDG-aligned projects with each transaction', 'Access to exclusive digital products and limited editions'] },
            ].map(s => (
              <div key={s.t} className="card" style={{ padding: 32, textAlign: 'center' }}>
                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center', color: 'var(--accent)' }}><Icon icon={s.ico} size={44} /></div>
                <h3 style={{ fontFamily: 'var(--fd)', fontSize: 24, fontWeight: 600, marginBottom: 16 }}>{s.t}</h3>
                <div style={{ textAlign: 'left', marginBottom: 22 }}>
                  {s.items.map((item, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, fontSize: 13, color: 'var(--txt2)', lineHeight: 1.6 }}>
                      <span style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }}><Icon icon={Check} size="inline" /></span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
                <button className="btn btn-gold" onClick={() => navigate('/register')}>{s.cta}</button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section className="section" style={{ background: 'var(--base)' }}>
        <div className="wrap">
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div className="lbl" style={{ marginBottom: 10 }}>How It Works</div>
            <h2 className="display" style={{ fontSize: 46 }}>Three Steps to Impact</h2>
          </div>
          <div className="g3" style={{ gap: 36 }}>
            {[
              { n: '01', t: 'Artist Creates', d: 'Artists and creatives list their original artwork and digital products, each linked to a verified SDG-aligned charity.' },
              { n: '02', t: 'Buyer Purchases', d: 'Art lovers browse, purchase, and receive a premium Certificate of Authenticity with every order.' },
              { n: '03', t: 'Charity Benefits', d: '10% of every sale goes directly to the partnered charity. Funders receive updates and impact reports.' },
            ].map(s => (
              <div key={s.n} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--fm)', fontSize: 52, color: 'var(--accent)', fontWeight: 700, opacity: .2, marginBottom: -12 }}>{s.n}</div>
                <h3 style={{ fontFamily: 'var(--fd)', fontSize: 26, fontWeight: 600, marginBottom: 10 }}>{s.t}</h3>
                <p style={{ fontSize: 14, color: 'var(--txt2)', lineHeight: 1.75 }}>{s.d}</p>
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
                  <div style={{ aspectRatio: '3/4', position: 'relative', overflow: 'hidden' }}>
                    {aw.images?.[0]?.url ? (
                      <img src={aw.images[0].url} alt={aw.title} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform .4s' }}
                        onMouseEnter={e => e.target.style.transform = 'scale(1.04)'}
                        onMouseLeave={e => e.target.style.transform = 'scale(1)'} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', background: 'linear-gradient(145deg,#1B4332,#2D6A4F)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: .3 }}>
                        <Icon icon={Palette} size={40} />
                      </div>
                    )}
                    {aw.comparePrice && <div className="badge b-red" style={{ position: 'absolute', top: 10, left: 10, zIndex: 3 }}>SALE</div>}
                  </div>
                  <div style={{ padding: 14 }}>
                    <div style={{ display: 'flex', gap: 3, marginBottom: 6 }}>{aw.sdgIds?.map(id => <SdgDot key={id} id={id} sm />)}</div>
                    <h3 style={{ fontFamily: 'var(--fd)', fontSize: 18, fontWeight: 600, marginBottom: 3 }}>{aw.title}</h3>
                    <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 9 }}>by {aw.artist?.displayName} · {aw.charity?.name}</p>
                    <div style={{ fontFamily: 'var(--fd)', fontSize: 18, color: 'var(--accent)', fontWeight: 700 }}>£{Number(aw.basePrice).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══ SDG IMPACT STRIP ═══ */}
      <section style={{ background: 'linear-gradient(135deg,#0d2318 0%,#1B4332 50%,#0d2318 100%)', padding: '36px 0', overflow: 'hidden' }}>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', padding: '0 24px' }}>
          {SDGs.map(s => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', background: 'rgba(255,255,255,.06)', borderRadius: 20, border: '1px solid rgba(255,255,255,.08)' }}>
              <span className="sdg" style={{ background: s.c, color: '#fff', width: 20, height: 20, fontSize: 9, borderRadius: 4 }}>{s.id}</span>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,.5)', fontWeight: 500, letterSpacing: .5 }}>{s.n}</span>
            </div>
          ))}
        </div>
      </section>

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

      {/* ═══ NEWSLETTER ═══ */}
      <section className="section" style={{ background: 'var(--panel)' }}>
        <div className="wrap" style={{ textAlign: 'center', maxWidth: 560, margin: '0 auto' }}>
          <div className="lbl" style={{ marginBottom: 12 }}>Stay Connected</div>
          <h2 className="display" style={{ fontSize: 46, marginBottom: 16 }}>Join the Movement</h2>
          <p style={{ fontSize: 15, color: 'var(--txt2)', lineHeight: 1.8, marginBottom: 32 }}>Sign up for curated art drops, impact stories, and early access to new collections.</p>
          {subbed ? (
            <div className="alert alert-ok" style={{ justifyContent: 'center', fontSize: 15 }}><Icon icon={Check} size="inline" /> You're in! Welcome to the community.</div>
          ) : (
            <div style={{ display: 'flex', gap: 10, maxWidth: 440, margin: '0 auto' }}>
              <input className="fi" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && sub()} style={{ flex: 1 }} />
              <button className="btn btn-gold" onClick={sub}>Subscribe</button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
