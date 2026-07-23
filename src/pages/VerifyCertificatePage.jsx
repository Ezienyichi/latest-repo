import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { XCircle, CheckCircle2, Check, ArrowRight } from 'lucide-react';
import { SDGs } from '../data/constants';
import api from '../utils/api';
import Icon from '../components/ui/Icon';
import Wordmark from '../components/ui/Wordmark';

function SdgDot({ id }) {
  const s = SDGs.find(x => x.id === id); if (!s) return null;
  return <span className="sdg" title={s.n} style={{ background: s.c, color: '#fff', width: 22, height: 22, fontSize: 9, borderRadius: 5 }}>{id}</span>;
}

export default function VerifyCertificatePage() {
  const { certId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get(`/certificates/verify/${certId}`).then(setData).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, [certId]);

  if (loading) return <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="skel" style={{ width: 300, height: 24 }} /></div>;

  if (error || !data?.valid) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div className="card" style={{ maxWidth: 460, padding: 40, textAlign: 'center' }}>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center', color: '#dc2626' }}><Icon icon={XCircle} size={56} /></div>
        <h2 className="display" style={{ fontSize: 28, marginBottom: 8 }}>Certificate Not Found</h2>
        <p style={{ color: 'var(--muted)', marginBottom: 20 }}>The certificate ID <strong style={{ fontFamily: 'var(--fm)' }}>{certId}</strong> could not be verified.</p>
        <Link to="/" className="btn btn-p">Go to Homepage</Link>
      </div>
    </div>
  );

  const c = data.certificate;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--base)', padding: '48px 0 80px' }}>
      <div className="wrap" style={{ maxWidth: 640 }}>
        {/* Verified badge */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center', color: 'var(--sage)', animation: 'pop .5s cubic-bezier(.34,1.56,.64,1)' }}><Icon icon={CheckCircle2} size={64} /></div>
          <h1 className="display" style={{ fontSize: 36, marginBottom: 6 }}>Certificate Verified</h1>
          <p style={{ fontSize: 14, color: 'var(--muted)' }}>This is an authentic certificate issued by <Wordmark style={{ fontWeight: 600 }} /></p>
        </div>

        {/* Certificate display */}
        <div style={{ background: 'linear-gradient(135deg,#fff 0%,#faf8f2 100%)', border: '2px solid var(--gold)', borderRadius: 16, padding: '44px 40px', position: 'relative', color: '#1B4332' }}>
          <div style={{ position: 'absolute', inset: 12, border: '1px solid rgba(255,173,0,.3)', borderRadius: 10, pointerEvents: 'none' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', color: '#b37800', marginBottom: 4 }}>Issued By</div>
              <Wordmark style={{ fontFamily: 'var(--fd)', fontSize: 18, fontWeight: 700, display: 'block' }} />
            </div>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg,#177c1d,#1B4332)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: 'var(--fd)', fontSize: 18, fontWeight: 700 }}>CAG</div>
          </div>

          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontFamily: 'var(--fd)', fontSize: 28, fontWeight: 600, letterSpacing: -.5, marginBottom: 4 }}>CERTIFICATE OF AUTHENTICITY</div>
            <div style={{ width: 60, height: 2, background: 'var(--gold)', margin: '0 auto' }} />
          </div>

          <p style={{ fontSize: 15, lineHeight: 1.8, textAlign: 'center', marginBottom: 28 }}>
            This certifies that <strong>"{c.artwork}"</strong> is an authentic {c.category?.toLowerCase() === 'artwork' ? 'original work' : 'digital product'} by <strong>{c.artist}</strong>
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>
            {[['Artwork', c.artwork, false], ['Artist', c.artist, c.artistVerified], ['Charity Partner', c.charity || 'N/A', c.charityVerified], ['Medium', c.medium || 'Digital', false], ['Year', c.year, false], ['Category', c.category, false]].map(([k, v, verified]) => (
              <div key={k}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: '#9ca3af', marginBottom: 2 }}>{k}</div>
                <div style={{ fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>{v}{verified && <Icon icon={Check} size="inline" style={{ color: 'var(--sage)' }} />}</div>
              </div>
            ))}
          </div>

          {c.sdgIds?.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: '#9ca3af', marginBottom: 6 }}>SDG Alignment</div>
              <div style={{ display: 'flex', gap: 4 }}>{c.sdgIds.map(id => <SdgDot key={id} id={id} />)}</div>
            </div>
          )}

          <div style={{ paddingTop: 20, borderTop: '1px solid rgba(255,173,0,.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <div style={{ fontFamily: 'var(--fm)', fontSize: 11, color: '#6b7280' }}>Certificate ID</div>
              <div style={{ fontFamily: 'var(--fm)', fontSize: 14, fontWeight: 600 }}>{c.id}</div>
              <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 4 }}>{c.issuedBy}</div>
            </div>
            <div style={{ width: 60, height: 60, background: '#f3f4f6', borderRadius: 8, border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="3" height="3"/><rect x="18" y="18" width="3" height="3"/></svg>
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Link to="/shop" className="btn btn-p" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>Browse More Artworks <Icon icon={ArrowRight} size="inline" /></Link>
        </div>
      </div>
    </div>
  );
}
