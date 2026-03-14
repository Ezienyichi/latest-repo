import { useNavigate } from 'react-router-dom';
import { SDGs } from '../../data/constants';

export default function Footer() {
  const navigate = useNavigate();
  const sections = [
    ['Platform', [['Discover Art', '/shop'], ['Digital Store', '/digitals'], ['Browse Artists', '/artists'], ['Charities', '/charities']]],
    ['Create', [['Sell Your Art', '/register'], ['Partner a Charity', '/register'], ['Artist Studio', '/dashboard']]],
    ['Support', [['Privacy Policy', '/'], ['Contact Us', '/'], ['Documentation', '/']]],
  ];

  return (
    <footer style={{ background: 'var(--footer-bg)', borderTop: '1px solid var(--border)', padding: '56px 0 32px' }}>
      <div className="wrap">
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 48, marginBottom: 48 }}>
          <div>
            <div style={{ fontFamily: 'var(--fd)', fontSize: 20, color: 'var(--mint)', marginBottom: 4, fontWeight: 700 }}>Change Art Gallery</div>
            <div style={{ fontSize: 10, color: 'var(--gold)', marginBottom: 12, fontWeight: 500, letterSpacing: '.5px' }}>by Fast Tackle Africa</div>
            <p style={{ fontSize: 13, color: 'var(--footer-txt)', lineHeight: 1.75, maxWidth: 260 }}>
              Where extraordinary art funds real-world change. Every purchase carries a premium certificate of authenticity and supports a verified SDG project.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 16 }}>
              {SDGs.slice(0, 9).map(s => (
                <span key={s.id} className="sdg" style={{ background: s.c, color: '#fff', width: 20, height: 20, fontSize: 8, borderRadius: 4 }}>{s.id}</span>
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
        </div>
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 22, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--footer-txt)' }}>© 2026 Fast Tackle Africa. All rights reserved.</span>
          <span style={{ fontSize: 12, color: 'var(--footer-txt)' }}>Powered by Art. Driven by Purpose.</span>
        </div>
      </div>
    </footer>
  );
}
