import { Truck, Download, BadgeCheck, HandHeart, Globe } from 'lucide-react';
import Icon from './Icon';

// isDigital swaps the delivery badge to a download-focused one — a buyer of
// an ebook/track/graphic/animation should never see a shipping estimate.
export default function TrustBadges({ isDigital = false }) {
  const badges = [
    isDigital
      ? { icon: Download, label: 'Instant Digital Download', text: 'Available immediately after purchase' }
      : { icon: Truck, label: 'Fast Delivery', text: 'Delivery outside Africa within 2-3 weeks' },
    { icon: BadgeCheck, label: 'Certified', text: 'Certificate of authenticity included' },
    { icon: HandHeart, label: 'Artists Supported', text: 'Artists are supported from every purchase' },
    { icon: Globe, label: 'Community & Life Impact', text: 'Each work is linked to a cause & benefits charity' },
  ];

  return (
    <section className="trust-stripe">
      <div className="wrap">
        <div className="trust-grid">
          {badges.map(b => (
            <div key={b.label} className="trust-badge">
              <div className="trust-badge-icon"><Icon icon={b.icon} size={26} /></div>
              <div>
                <div className="trust-badge-label">{b.label}</div>
                <div className="trust-badge-text">{b.text}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
