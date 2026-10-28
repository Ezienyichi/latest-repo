import { BookOpen, Headphones } from 'lucide-react';
import Icon from './Icon';

// The "Read online" / "Listen now" button for a digital line of an order.
// `accessUrl` only ever arrives from the order API, for the buyer, so there
// is nothing to render when it's absent (e.g. a physical line, or an
// order that no longer grants access).
export default function AccessLink({ item, size = 'md', style }) {
  if (!item?.accessUrl) return null;
  const music = item.product?.category === 'MUSIC';
  const label = music ? 'Listen now' : 'Read online';
  return (
    <a href={item.accessUrl} target="_blank" rel="noopener noreferrer" data-access-link
      className={`btn btn-p${size === 'lg' ? ' btn-lg' : ' btn-sm'}`}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none', ...style }}>
      <Icon icon={music ? Headphones : BookOpen} size="inline" /> {label}
    </a>
  );
}
