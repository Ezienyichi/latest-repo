import { useState, useEffect } from 'react';
import api from '../../utils/api';

const DEFAULT_NAME = 'FastTackle Africa';

// Renders the brand name from SiteSetting (site_name / site_logo_url) so a
// real logo can be swapped in later without touching any call site.
export default function Wordmark({ style, className, imgStyle }) {
  const [name, setName] = useState(DEFAULT_NAME);
  const [logoUrl, setLogoUrl] = useState(null);

  useEffect(() => {
    api.getPublicSettings().then(s => {
      if (s.site_name) setName(s.site_name);
      if (s.site_logo_url) setLogoUrl(s.site_logo_url);
    }).catch(() => {});
  }, []);

  if (logoUrl) return <img src={logoUrl} alt={name} className={className} style={{ height: 28, display: 'block', ...imgStyle }} />;
  return <span className={className} style={style}>{name}</span>;
}
