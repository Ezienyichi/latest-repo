import { useState, useEffect } from 'react';
import { Phone, Mail, Star } from 'lucide-react';
import api from '../../utils/api';
import Icon from '../ui/Icon';

// lucide-react dropped brand/logo icons — these are small generic glyphs,
// not a reproduction of any trademarked logo, matching the plain inline-SVG
// pattern already used for the cart icon in Navbar.jsx.
const InstagramGlyph = (props) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" /></svg>;
const FacebookGlyph = (props) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}><path d="M15 3h-2a4 4 0 0 0-4 4v3H6v4h3v7h4v-7h3l1-4h-4V7a1 1 0 0 1 1-1h3V3z" /></svg>;
const XGlyph = (props) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}><path d="M4 4l16 16M20 4L4 20" /></svg>;

// Thin strip above the main nav — everything here comes from SiteSetting
// (contact_email/contact_phone/announcement_message/social_*_url/
// trustpilot_url/google_review_url) so admin can edit it without a
// redeploy. "#" is a valid seeded placeholder for the link fields until
// the real destinations are set.
export default function AnnouncementBar() {
  const [s, setS] = useState(null);

  useEffect(() => { api.getPublicSettings().then(setS).catch(() => {}); }, []);

  if (!s) return null;

  return (
    <div className="announce-bar">
      <div className="announce-left">
        {s.contact_phone && <a href={`tel:${s.contact_phone.replace(/[^\d+]/g, '')}`} className="announce-item"><Icon icon={Phone} size={13} />{s.contact_phone}</a>}
        {s.contact_email && <a href={`mailto:${s.contact_email}`} className="announce-item announce-email"><Icon icon={Mail} size={13} />{s.contact_email}</a>}
      </div>
      <div className="announce-center">{s.announcement_message}</div>
      <div className="announce-right">
        {s.trustpilot_url && <a href={s.trustpilot_url} target="_blank" rel="noopener noreferrer" className="announce-item announce-review"><Icon icon={Star} size={13} />Trustpilot</a>}
        {s.google_review_url && <a href={s.google_review_url} target="_blank" rel="noopener noreferrer" className="announce-item announce-review"><Icon icon={Star} size={13} />Google</a>}
        <div className="announce-social">
          {s.social_instagram_url && <a href={s.social_instagram_url} target="_blank" rel="noopener noreferrer" aria-label="Instagram"><InstagramGlyph /></a>}
          {s.social_facebook_url && <a href={s.social_facebook_url} target="_blank" rel="noopener noreferrer" aria-label="Facebook"><FacebookGlyph /></a>}
          {s.social_twitter_url && <a href={s.social_twitter_url} target="_blank" rel="noopener noreferrer" aria-label="Twitter / X"><XGlyph /></a>}
        </div>
      </div>
    </div>
  );
}
