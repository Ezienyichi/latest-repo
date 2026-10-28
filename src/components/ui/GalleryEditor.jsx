import { Plus, X, ArrowUp, ArrowDown } from 'lucide-react';
import Uploader from './Uploader';
import Icon from './Icon';

const MAX = 24;

// Admin editor for a gallery: [{ url, label }]. One Uploader per slot, plus a
// caption, reorder and remove. Blank slots are fine while editing — the API
// drops them on save.
export default function GalleryEditor({ value, onChange, bucket = 'previews' }) {
  const items = Array.isArray(value) ? value : [];
  const update = (i, patch) => onChange(items.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  const remove = (i) => onChange(items.filter((_, j) => j !== i));
  const move = (i, d) => { const k = i + d; if (k < 0 || k >= items.length) return; const next = [...items]; [next[i], next[k]] = [next[k], next[i]]; onChange(next); };
  const add = () => onChange([...items, { url: '', label: '' }]);

  return (
    <div>
      {items.map((it, i) => (
        <div key={i} data-gallery-row style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ flex: '2 1 220px', minWidth: 0 }}>
            <Uploader bucket={bucket} accept="image/jpeg,image/png,image/webp" maxBytes={15 * 1024 * 1024} kind="image"
              value={it.url ? { path: null, publicUrl: it.url } : null}
              onUploaded={({ publicUrl }) => update(i, { url: publicUrl })} label={`Gallery image ${i + 1}`} />
          </div>
          <input className="fi" value={it.label || ''} onChange={e => update(i, { label: e.target.value })} placeholder="Caption (optional)" maxLength={120} style={{ flex: '1 1 140px', minWidth: 0 }} />
          <div style={{ display: 'flex', gap: 4 }}>
            <button type="button" className="btn btn-s btn-sm" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up"><Icon icon={ArrowUp} size="inline" /></button>
            <button type="button" className="btn btn-s btn-sm" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label="Move down"><Icon icon={ArrowDown} size="inline" /></button>
            <button type="button" className="btn btn-danger btn-sm" onClick={() => remove(i)} aria-label="Remove image"><Icon icon={X} size="inline" /></button>
          </div>
        </div>
      ))}
      <button type="button" className="btn btn-s btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }} onClick={add} disabled={items.length >= MAX}>
        <Icon icon={Plus} size="inline" /> Add image
      </button>
      {items.length >= MAX && <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 8 }}>Maximum {MAX} images</span>}
    </div>
  );
}
