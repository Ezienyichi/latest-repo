import { Mail, Phone, MessageCircle, Clock } from 'lucide-react';
import { mailHref, telHref, waHref } from '../../utils/contact';
import Icon from './Icon';

// The contact block shared by the footer and the About page. Everything is
// rendered from the admin-managed settings; anything unset is simply omitted
// (and if nothing is set, nothing renders). Email → mailto:, phone → tel:,
// WhatsApp → wa.me, hours as plain text.
export function hasContactDetails(s) {
  return !!(s && (s.contact_email || s.contact_phone || s.whatsapp_number || s.business_hours));
}

export default function ContactDetails({ s, className = '' }) {
  if (!hasContactDetails(s)) return null;
  const wa = waHref(s.whatsapp_number);
  const rows = [
    s.contact_email && { key: 'email', icon: Mail, label: 'Email', href: mailHref(s.contact_email), text: s.contact_email },
    s.contact_phone && { key: 'phone', icon: Phone, label: 'Phone', href: telHref(s.contact_phone), text: s.contact_phone },
    wa && { key: 'whatsapp', icon: MessageCircle, label: 'WhatsApp', href: wa, text: s.whatsapp_number, external: true },
    s.business_hours && { key: 'hours', icon: Clock, label: 'Hours', text: s.business_hours },
  ].filter(Boolean);
  return (
    <ul className={`contact-list ${className}`} data-contact-details>
      {rows.map(r => (
        <li key={r.key} data-contact={r.key}>
          <Icon icon={r.icon} size={16} />
          <span className="contact-label">{r.label}</span>
          {r.href
            ? <a href={r.href} {...(r.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{r.text}</a>
            : <span className="contact-text">{r.text}</span>}
        </li>
      ))}
    </ul>
  );
}
