import { useNavigate, Link } from 'react-router-dom';
import { LEGAL_DOCS, legalPath } from '../../data/legal';
import { SDGs } from '../../data/constants';
import Wordmark from '../ui/Wordmark';
import ContactDetails, { hasContactDetails } from '../ui/ContactDetails';
import { useSiteSettings } from '../../utils/siteSettings';

export default function Footer() {
  const navigate = useNavigate();
  const s = useSiteSettings();
  const showContact = hasContactDetails(s);
  const sections = [
    ['Platform', [['Discover Art', '/shop'], ['Digital Store', '/digitals'], ['Browse Artists', '/artists'], ['Impact Campaigns', '/campaigns'], ['About Us', '/about']]],
    // "Contact Us" goes to the About page's contact section (the same admin-managed details as the footer column).
    ['Support', [['Contact Us', '/about#contact'], ['Documentation', '/']]],
  ];

  return (
    <footer style={{ background: 'var(--footer-bg)', borderTop: '1px solid var(--border)', padding: '56px 0 32px' }}>
      <div className="wrap">
        <div className={`footer-grid${showContact ? ' has-contact' : ''}`}>
          <div>
            {/* The footer is always dark, so it takes the light logo (site_logo_dark_url) when there is one. */}
            <div style={{ marginBottom: 6 }}>
              <Wordmark onDark size="footer" style={{ fontFamily: 'var(--fd)', fontSize: 20, color: 'var(--mint)', fontWeight: 700, display: 'block' }} />
            </div>
            <p style={{ fontSize: 13, color: 'var(--footer-txt)', lineHeight: 1.75, maxWidth: 260 }}>
              Where extraordinary art funds real-world change. Every purchase carries a premium certificate of authenticity and supports a verified SDG project.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 16 }}>
              {SDGs.slice(0, 9).map(sd => (
                <span key={sd.id} className="sdg" style={{ background: sd.c, color: '#fff', width: 20, height: 20, fontSize: 8, borderRadius: 4 }}>{sd.id}</span>
              ))}
            </div>
          </div>
          {sections.map(([h, items]) => (
            <div key={h}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 14 }}>{h}</div>
              {items.map(([item, to]) => (
                <div key={item} onClick={() => navigate(to)} style={{ fontSize: 13, color: 'var(--footer-txt)', marginBottom: 9, cursor: 'pointer', transition: 'color .15s' }}
                  onMouseEnter={e => e.target.style.color = 'var(--accent)'}
                  onMouseLeave={e => e.target.style.color = 'var(--footer-txt)'}>
                  {item}
                </div>
              ))}
            </div>
          ))}
          {/* Legal — all five pages, on every page that has the footer. */}
          <div data-footer-legal>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 14 }}>Legal</div>
            {LEGAL_DOCS.map(d => <Link key={d.slug} to={legalPath(d.slug)} className="footer-link">{d.short}</Link>)}
          </div>
          {showContact && (
            <div data-footer-contact>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 14 }}>Contact</div>
              <ContactDetails s={s} className="on-dark" />
            </div>
          )}
        </div>
        <div className="footer-bottom">
          <span style={{ fontSize: 12, color: 'var(--footer-txt)' }}>© {new Date().getFullYear()} {s?.site_name || 'FastTackle Africa'}. All rights reserved.</span>
          <span style={{ fontSize: 12, color: 'var(--footer-txt)' }}>Powered by Art. Driven by Purpose.</span>
        </div>
      </div>
    </footer>
  );
}
