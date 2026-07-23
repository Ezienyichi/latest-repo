import { SDGs } from '../../data/constants';
import Wordmark from './Wordmark';

export default function CertificateModal({ product, onClose }) {
  if (!product) return null;
  const sdgNames = (product.sdgIds || []).map(id => SDGs.find(s => s.id === id)?.n).filter(Boolean).join(', ');

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 620 }}>
        <div className="mhead">
          <h3 style={{ fontFamily: 'var(--fd)', fontSize: 20 }}>Certificate of Authenticity</h3>
          <button className="mclose" onClick={onClose}>×</button>
        </div>
        <div className="mbody">
          {/* Certificate card */}
          <div style={{
            background: 'linear-gradient(135deg,#fff 0%,#faf8f2 100%)',
            border: '2px solid var(--gold)', borderRadius: 12,
            padding: '40px 36px', position: 'relative', color: '#1B4332',
          }}>
            {/* Inner border */}
            <div style={{ position: 'absolute', inset: 10, border: '1px solid rgba(255,173,0,.3)', borderRadius: 7, pointerEvents: 'none' }} />

            {/* Logo strip */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
              <div>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', color: '#b37800', marginBottom: 4 }}>Issued By</div>
                <Wordmark style={{ fontFamily: 'var(--fd)', fontSize: 18, fontWeight: 700, color: '#1B4332', display: 'block' }} />
              </div>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg,#177c1d,#1B4332)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: 'var(--fd)', fontSize: 18, fontWeight: 700 }}>CAG</div>
            </div>

            {/* Title */}
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{ fontFamily: 'var(--fd)', fontSize: 28, fontWeight: 600, letterSpacing: -0.5, marginBottom: 4, color: '#1B4332' }}>CERTIFICATE OF AUTHENTICITY</div>
              <div style={{ width: 60, height: 2, background: 'var(--gold)', margin: '0 auto' }} />
            </div>

            {/* Details */}
            <div style={{ marginBottom: 24 }}>
              <p style={{ fontSize: 14, lineHeight: 1.8, color: '#374151', textAlign: 'center' }}>
                This certifies that <strong style={{ color: '#1B4332' }}>"{product.title}"</strong> is an authentic
                {product.category === 'ARTWORK' ? ' original work' : ' digital product'} by{' '}
                <strong style={{ color: '#1B4332' }}>{product.artist?.displayName}</strong>
              </p>
            </div>

            {/* Info grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 24 }}>
              {[
                ['Artwork', product.title],
                ['Artist', product.artist?.displayName],
                ['Charity Partner', product.charity?.name || 'N/A'],
                ['SDG Alignment', sdgNames || 'N/A'],
                ['Medium', product.medium || product.fileFormat || 'Digital'],
                ['Year', product.year || new Date().getFullYear()],
              ].map(([label, value]) => (
                <div key={label}>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: '#9ca3af', marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: 13, color: '#1B4332', fontWeight: 500 }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Certificate ID + QR placeholder */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: 18, borderTop: '1px solid rgba(255,173,0,.2)' }}>
              <div>
                <div style={{ fontFamily: 'var(--fm)', fontSize: 11, color: '#6b7280', letterSpacing: 1 }}>Certificate ID</div>
                <div style={{ fontFamily: 'var(--fm)', fontSize: 13, color: '#1B4332', fontWeight: 500 }}>{product.certificateId || 'CAG-PREVIEW'}</div>
                <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 4 }}>Issued by <Wordmark style={{ fontSize: 10, color: '#9ca3af' }} /> Platform</div>
              </div>
              {/* QR code placeholder */}
              <div style={{ width: 56, height: 56, background: '#f3f4f6', borderRadius: 6, border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="3" height="3" /><rect x="18" y="14" width="3" height="3" /><rect x="14" y="18" width="3" height="3" /><rect x="18" y="18" width="3" height="3" /></svg>
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: 'var(--muted)' }}>
            The buyer will receive this certificate digitally upon purchase, with a unique QR code for verification.
          </div>
        </div>
      </div>
    </div>
  );
}
