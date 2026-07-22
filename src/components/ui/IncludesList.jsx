import { Check } from 'lucide-react';
import Icon from './Icon';

export default function IncludesList({ items = [], title = "What's Included" }) {
  if (!items.length) return null;
  return (
    <div style={{ marginBottom: 22 }}>
      <div className="fl" style={{ marginBottom: 10 }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 14px', background: 'var(--glass)', borderRadius: 'var(--rs)', border: '1px solid var(--border)' }}>
            <span style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 1 }}><Icon icon={Check} size="inline" /></span>
            <span style={{ fontSize: 13, color: 'var(--txt2)', lineHeight: 1.5 }}>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
