import { useState } from 'react';

export default function EbookPreview({ product }) {
  const [pg, setPg] = useState(0);
  const pages = [
    { t: 'About', txt: `${product.description || ''}\n\n${product.previewUrl ? 'Preview available.' : 'Purchase to access the full edition.'}` },
    { t: 'Sample', txt: `Chapter One\n\nThe harmattan came early that year, coating the compound in a fine red dust that settled in the creases of everything. Mama said it was a sign.\n\nWe pressed our palms against the cool courtyard wall and watched the dust-light turn the sky a burning amber. The traders had packed up early, the goats were tucked under eaves, and somewhere across the road, a radio played a song I would not hear again for fifteen years.\n\nIt was the kind of day that folds itself into memory before it is even over.\n\n— Preview ends. Purchase to read the full ${product.pages || ''}${product.pages ? '-page' : ''} edition.` },
  ];

  return (
    <div style={{ borderRadius: 'var(--rl)', overflow: 'hidden', border: '1px solid var(--border)', marginBottom: 20 }}>
      {/* macOS title bar */}
      <div style={{ background: '#1e1a14', padding: '9px 16px', display: 'flex', gap: 5, alignItems: 'center' }}>
        {['#ff5f57', '#ffbe2e', '#28c941'].map((c, i) => (
          <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
        ))}
        <span style={{ marginLeft: 8, fontSize: 11, color: 'rgba(255,255,255,.35)', fontFamily: 'var(--fm)', flex: 1, textAlign: 'center' }}>
          {product.title}
        </span>
      </div>

      {/* Book content */}
      <div style={{ background: '#f5f0e8', padding: '28px 32px', minHeight: 220, position: 'relative' }}>
        {/* Page texture lines */}
        <div style={{ position: 'absolute', top: 0, right: 0, width: 3, height: '100%', background: 'linear-gradient(to right, transparent, rgba(0,0,0,.04), transparent)' }} />
        <p style={{ fontFamily: 'Georgia, serif', fontSize: 14, lineHeight: 1.95, color: '#2a2420', whiteSpace: 'pre-line' }}>
          {pages[pg].txt}
        </p>
        {/* Page number */}
        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 10, color: '#b5a898', fontFamily: 'var(--fm)' }}>
          {pg === 0 ? 'About' : `Page 1 of ${product.pages || '∞'}`}
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ background: '#1e1a14', padding: '8px 16px', display: 'flex', gap: 7, justifyContent: 'center' }}>
        {pages.map((p, i) => (
          <button key={i} onClick={() => setPg(i)} style={{
            background: pg === i ? 'var(--forest)' : 'transparent',
            color: pg === i ? '#fff' : 'rgba(255,255,255,.4)',
            border: '1px solid', borderColor: pg === i ? 'var(--forest)' : 'rgba(255,255,255,.1)',
            borderRadius: 'var(--rs)', padding: '4px 14px', fontSize: 11,
            cursor: 'pointer', fontFamily: 'var(--fb)', transition: 'all .15s',
          }}>{p.t}</button>
        ))}
      </div>

      {/* Format info */}
      <div style={{ background: '#1e1a14', padding: '6px 16px 10px', display: 'flex', justifyContent: 'center', gap: 16 }}>
        {product.fileFormat && <span style={{ fontSize: 9, color: 'rgba(255,255,255,.3)', fontFamily: 'var(--fm)', letterSpacing: 1 }}>{product.fileFormat}</span>}
        {product.pages && <span style={{ fontSize: 9, color: 'rgba(255,255,255,.3)', fontFamily: 'var(--fm)', letterSpacing: 1 }}>{product.pages} pages</span>}
      </div>
    </div>
  );
}
