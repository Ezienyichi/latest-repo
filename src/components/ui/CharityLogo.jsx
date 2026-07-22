import { Leaf } from 'lucide-react';
import Icon from './Icon';

// CharityProfile.logo holds either a real uploaded image URL or (for older/
// seed data) a bare emoji character used as a placeholder. Render whichever
// it actually is instead of assuming — printing a URL as raw text, or an
// emoji as an <img src>, are both wrong.
export default function CharityLogo({ logo, size = 28 }) {
  const isUrl = typeof logo === 'string' && /^https?:\/\//.test(logo);
  if (isUrl) return <img src={logo} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }} />;
  return <Icon icon={Leaf} size={size} />;
}
