import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

// Same markup + .lightbox-* styles the product page uses, as a reusable
// component, plus keyboard support (Esc / arrows) and focus return.
export function ImageLightbox({ images, index, onIndex, onClose, alt = '' }) {
  const closeRef = useRef(null);
  const n = images.length;
  const go = (d) => onIndex((index + d + n) % n);

  useEffect(() => {
    const opener = document.activeElement;
    closeRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prevOverflow; opener?.focus?.(); };
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft' && n > 1) go(-1);
      else if (e.key === 'ArrowRight' && n > 1) go(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const img = images[index];
  if (!img) return null;
  // Portaled to <body>: callers can sit inside a sticky/transformed ancestor,
  // which would trap this fixed overlay in that ancestor's stacking context
  // (and leave it under the navbar).
  return createPortal(
    <div className="lightbox-overlay" role="dialog" aria-modal="true" aria-label="Image viewer" onClick={e => e.target === e.currentTarget && onClose()}>
      <button ref={closeRef} className="lightbox-close" onClick={onClose} aria-label="Close">×</button>
      {n > 1 && <>
        <button className="lightbox-nav prev" onClick={() => go(-1)} aria-label="Previous image">‹</button>
        <button className="lightbox-nav next" onClick={() => go(1)} aria-label="Next image">›</button>
      </>}
      <img className="lightbox-img" src={img.url} alt={img.label || alt} />
      {img.label && <div className="lightbox-caption" style={{ whiteSpace: 'normal', maxWidth: '88vw', textAlign: 'center' }}>{img.label}</div>}
      {n > 1 && <div className="lightbox-counter">{index + 1} / {n}</div>}
      {n > 1 && (
        <div className="lightbox-thumbs">
          {images.map((im, i) => (
            <div key={i} className={`lightbox-thumb${i === index ? ' active' : ''}`} onClick={() => onIndex(i)}><img src={im.url} alt="" loading="lazy" /></div>
          ))}
        </div>
      )}
    </div>,
    document.body
  );
}

// Thumbnail grid that opens the lightbox. `max` caps how many tiles render
// (the last tile shows "+N" and still opens the full set) — used where the
// gallery sits in a sticky column and must stay a bounded height.
export default function ImageGallery({ images, alt = '', max, minTile = 150 }) {
  const [open, setOpen] = useState(null);
  const list = (Array.isArray(images) ? images : []).filter(i => i?.url);
  if (!list.length) return null;
  const shown = max && list.length > max ? list.slice(0, max) : list;
  const extra = list.length - shown.length;
  return (
    <>
      <div className="img-gallery" style={{ '--tile': `${minTile}px` }}>
        {shown.map((im, i) => (
          <button key={i} type="button" className="img-gallery-tile" onClick={() => setOpen(i)} aria-label={`View image ${i + 1} of ${list.length}${im.label ? `: ${im.label}` : ''}`}>
            <img src={im.url} alt={im.label || alt} loading="lazy" />
            {extra > 0 && i === shown.length - 1 && <span className="img-gallery-more">+{extra}</span>}
          </button>
        ))}
      </div>
      {open !== null && <ImageLightbox images={list} index={open} onIndex={setOpen} onClose={() => setOpen(null)} alt={alt} />}
    </>
  );
}
