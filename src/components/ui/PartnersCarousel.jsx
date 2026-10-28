import { useState, useEffect, useRef } from 'react';
import api from '../../utils/api';

const SPEED_PX_PER_SEC = 30;
// Fewer than this and a looping marquee would show gaps — they sit in a still, centred row instead.
const MIN_FOR_MARQUEE = 5;

const GROUPS = [
  { type: 'PARTNER', label: 'Our Partners', heading: 'Organisations We Work With' },
  { type: 'COLLABORATOR', label: 'Our Collaborators', heading: 'Creatives & Teams We Build With' },
];

function Logo({ p, clone }) {
  const inner = p.logo ? <img src={p.logo} alt={clone ? '' : p.name} loading="lazy" /> : <span>{p.name}</span>;
  // The looped second copy is decoration for the animation — keep it out of the tab order / screen readers.
  const hidden = clone ? { 'aria-hidden': true, tabIndex: -1 } : {};
  return (
    <div className="partners-logo-item" title={p.description || p.name} {...(p.website ? {} : { tabIndex: clone ? -1 : 0 })} {...(clone ? { 'aria-hidden': true } : {})}>
      {p.website
        ? <a href={p.website} target="_blank" rel="noopener noreferrer" aria-label={p.description ? `${p.name} — ${p.description}` : p.name} {...hidden}>{inner}</a>
        : inner}
    </div>
  );
}

// One scrolling row for one group of partners.
function Group({ group, items }) {
  const [reduced, setReduced] = useState(false);
  const [duration, setDuration] = useState(30);
  const trackRef = useRef(null);
  useEffect(() => { setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches); }, []);
  const animate = !reduced && items.length >= MIN_FOR_MARQUEE;

  useEffect(() => {
    if (!animate) return;
    const el = trackRef.current;
    if (!el) return;
    // The track holds two copies back-to-back, so scrollWidth/2 is the true repeat distance.
    const measure = () => setDuration(Math.max(el.scrollWidth / 2 / SPEED_PX_PER_SEC, 6));
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [items, animate]);

  return (
    <section className="partners-carousel-section" data-partners-group={group.type}>
      <div className="wrap">
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div className="lbl">{group.label}</div>
          <h2 className="display" style={{ fontSize: 28 }}>{group.heading}</h2>
        </div>
      </div>
      <div className="partners-track-wrap">
        {animate ? (
          <div className="partners-row partners-track" ref={trackRef} style={{ animationDuration: `${duration}s` }}>
            {[...items, ...items].map((p, i) => <Logo key={`${p.name}-${i}`} p={p} clone={i >= items.length} />)}
          </div>
        ) : (
          <div className="partners-row partners-track-static">
            {items.map((p, i) => <Logo key={`${p.name}-${i}`} p={p} />)}
          </div>
        )}
      </div>
    </section>
  );
}

// Shared by HomePage and AboutPage. Everything comes from the admin-managed
// list (Admin → Partners → PageContent('partners')); there is deliberately no
// built-in placeholder list — invented company names would imply endorsements
// that don't exist. With no active partners (or if the list can't load) the
// whole section simply isn't shown.
export default function PartnersCarousel() {
  const [logos, setLogos] = useState([]);
  useEffect(() => {
    let live = true;
    api.getPageContent('partners').then(r => { if (live) setLogos(Array.isArray(r.body?.logos) ? r.body.logos : []); }).catch(() => {});
    return () => { live = false; };
  }, []);

  return (
    <>
      {GROUPS.map(g => {
        const items = logos.filter(l => (l.type || 'PARTNER') === g.type);
        return items.length ? <Group key={g.type} group={g} items={items} /> : null;
      })}
    </>
  );
}
