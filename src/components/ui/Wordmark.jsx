import { useState, useEffect } from 'react';
import { useSiteSettings } from '../../utils/siteSettings';

const DEFAULT_NAME = 'FastTackle Africa';

// The brand mark. Shows the uploaded logo when admin has set one, otherwise the
// site name as text. All of it comes from the public site settings, so a logo
// can be swapped in Admin → Settings → Branding & Contact with no redeploy.
//
//  onDark  the mark sits on a dark background (the footer): use the light logo
//          (site_logo_dark_url), falling back to the main logo if there isn't one.
//  size    caps the logo's height/width so ANY uploaded image fits its slot
//          without breaking the layout, desktop or mobile — see .brand-logo-*
//          in globals.css: nav · footer · card (auth pages, loading) · sm (certificates).
//  alt     is always the site name.
export default function Wordmark({ style, className, imgStyle, onDark = false, size = 'nav' }) {
  const s = useSiteSettings();
  const [broken, setBroken] = useState(false);
  const name = s?.site_name || DEFAULT_NAME;
  const url = (onDark && s?.site_logo_dark_url) || s?.site_logo_url || null;

  useEffect(() => { setBroken(false); }, [url]);

  // A logo URL that fails to load falls back to the text name instead of a broken image.
  if (url && !broken) {
    return <img src={url} alt={name} className={`brand-logo brand-logo-${size}${className ? ` ${className}` : ''}`} style={imgStyle} onError={() => setBroken(true)} />;
  }
  return <span className={className} style={style}>{name}</span>;
}
