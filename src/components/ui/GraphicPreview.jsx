import { useState } from 'react';

export default function GraphicPreview({ product }) {
  const [hov, setHov] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // grid | list

  // Sample symbols for vector/icon packs
  const symbols = ['⊕', '⊗', '⊙', '◎', '◉', '◈', '◇', '◆', '◊', '○', '●', '⊛', '⊝', '⊞', '⊟', '⊠', '△', '▽', '◁', '▷', '⬡', '⬢', '⯁', '⬟'];
  // Swatches for brush/color packs
  const swatches = ['#3D2B1F', '#6B4226', '#8D5524', '#C68642', '#E0AC69', '#F1C27D', '#FFD79B', '#1B4332', '#2D6A4F', '#40916C', '#52B788', '#74C69D', '#95D5B2', '#B7E4C7', '#D8F3DC', '#1A1A2E'];

  const isBrushPack = product.title?.toLowerCase().includes('brush') || product.title?.toLowerCase().includes('portrait');
  const displayItems = isBrushPack ? swatches : symbols;

  return (
    <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 'var(--rl)', overflow: 'hidden', marginBottom: 20 }}>
      {/* Header */}
      <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--muted)' }}>Asset Preview</div>
        <div style={{ display: 'flex', gap: 4 }}>
          {['grid', 'list'].map(m => (
            <button key={m} onClick={() => setViewMode(m)} style={{
              background: viewMode === m ? 'var(--glassh)' : 'transparent', border: '1px solid var(--border)',
              borderRadius: 4, padding: '3px 8px', fontSize: 10, cursor: 'pointer', color: viewMode === m ? 'var(--accent)' : 'var(--muted)',
              fontFamily: 'var(--fb)', transition: 'all .15s',
            }}>{m === 'grid' ? '⊞' : '≡'}</button>
          ))}
        </div>
      </div>

      {/* Grid of assets */}
      <div style={{ padding: 14 }}>
        {viewMode === 'grid' ? (
          <div style={{ display: 'grid', gridTemplateColumns: isBrushPack ? 'repeat(8,1fr)' : 'repeat(8,1fr)', gap: 6, marginBottom: 12 }}>
            {displayItems.map((s, i) => (
              <div key={i} onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)} style={{
                aspectRatio: '1', borderRadius: 'var(--rs)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', transition: 'all .18s',
                ...(isBrushPack
                  ? { background: s, border: `2px solid ${hov === i ? 'var(--sage)' : 'transparent'}`, transform: hov === i ? 'scale(1.15)' : 'scale(1)' }
                  : { background: hov === i ? 'var(--hover)' : 'var(--glass)', border: `1px solid ${hov === i ? 'var(--sage)' : 'var(--border)'}`, fontSize: 15, color: hov === i ? 'var(--sage)' : 'var(--muted)' }
                ),
              }}>
                {!isBrushPack && s}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12, maxHeight: 180, overflowY: 'auto' }}>
            {displayItems.slice(0, 12).map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', borderRadius: 'var(--rs)', background: 'var(--glass)', fontSize: 12 }}>
                {isBrushPack ? (
                  <div style={{ width: 18, height: 18, borderRadius: 3, background: s, flexShrink: 0 }} />
                ) : (
                  <span style={{ fontSize: 16, width: 24, textAlign: 'center', flexShrink: 0 }}>{s}</span>
                )}
                <span style={{ color: 'var(--txt2)', fontFamily: 'var(--fm)', fontSize: 11 }}>
                  {isBrushPack ? `Swatch ${i + 1} — ${s}` : `Symbol ${i + 1}`}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer info */}
      <div style={{ padding: '10px 18px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>
          Sample preview · Full pack: {product.fileFormat || 'Multiple formats'}
        </span>
        <span style={{ fontSize: 10, fontFamily: 'var(--fm)', color: 'var(--subtle)', background: 'var(--glass)', padding: '2px 8px', borderRadius: 10 }}>
          {product.fileFormat?.split('+')[0]?.trim() || 'SVG'}
        </span>
      </div>
    </div>
  );
}
