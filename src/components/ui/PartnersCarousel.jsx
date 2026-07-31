import { useState, useEffect, useRef } from 'react';
import api from '../../utils/api';

// Same fallback shown until PageContent('partners') loads / if the fetch
// fails — kept in sync with the seed data, not the source of truth for it.
const PARTNERS_FALLBACK = [
  { name: 'Meridian Foundation', url: null },
  { name: 'Northbridge Trust', url: null },
  { name: 'Sable & Co.', url: null },
  { name: 'Lumen Partners', url: null },
  { name: 'Kestrel Group', url: null },
  { name: 'Anchor Collective', url: null },
];

const SPEED_PX_PER_SEC = 30;

// Shared between HomePage and AboutPage — editing PageContent('partners')
// updates both. Continuous right-to-left auto-scroll via CSS @keyframes
// (translateX 0 -> -50%), not the rAF/scrollLeft technique the product
// carousels use — logos need no drag/swipe, so plain CSS animation is
// simpler and sidesteps that mechanism's failure modes entirely. The
// looped set is rendered twice; -50% is exactly one copy's width because
// the transform resolves against this same element's own width, so no
// runtime measurement is needed for the loop itself — only for picking a
// duration that yields ~30px/sec regardless of how many logos there are.
export default function PartnersCarousel() {
  const [logos, setLogos] = useState(null);
  const [reduced, setReduced] = useState(false);
  const [duration, setDuration] = useState(30);
  const trackRef = useRef(null);

  useEffect(() => {
    api.getPageContent('partners').then(r => setLogos(r.body?.logos?.length ? r.body.logos : PARTNERS_FALLBACK)).catch(() => setLogos(PARTNERS_FALLBACK));
  }, []);

  useEffect(() => {
    setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  const items = logos || PARTNERS_FALLBACK;

  useEffect(() => {
    if (reduced) return;
    const el = trackRef.current;
    if (!el) return;
    // .partners-track carries no padding of its own (only `gap`), so
    // scrollWidth is exactly two copies back-to-back — scrollWidth/2 is
    // the true repeat distance, matching what translateX(-50%) moves.
    const measure = () => setDuration(Math.max(el.scrollWidth / 2 / SPEED_PX_PER_SEC, 6));
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [items, reduced]);

  const renderLogo = (p, i) => (
    <div key={`${p.name}-${i}`} className="partners-logo-item" tabIndex={0}>
      {p.url ? <img src={p.url} alt={p.name} loading="lazy" /> : <span>{p.name}</span>}
    </div>
  );

  return (
    <section className="partners-carousel-section">
      <div className="wrap">
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div className="lbl">Our Partners</div>
          <h2 className="display" style={{ fontSize: 28 }}>Organisations We Work With</h2>
        </div>
      </div>
      <div className="partners-track-wrap">
        {reduced ? (
          <div className="partners-row partners-track-static">
            {items.map(renderLogo)}
          </div>
        ) : (
          <div className="partners-row partners-track" ref={trackRef} style={{ animationDuration: `${duration}s` }}>
            {[...items, ...items].map(renderLogo)}
          </div>
        )}
      </div>
    </section>
  );
}
