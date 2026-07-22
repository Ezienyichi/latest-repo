import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import Icon from '../components/ui/Icon';

export default function VerifyEmailPage() {
  const { user, verifyEmail } = useAuth();
  const { toast } = useCart();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await verifyEmail(code);
      toast('Email verified!', 'ok');
      if (user?.role === 'ARTIST') navigate('/setup/artist');
      else if (user?.role === 'CHARITY') navigate('/setup/charity');
      else navigate('/');
    } catch (err) { toast(err.message, 'err'); }
    finally { setLoading(false); }
  };

  if (user?.emailVerified) {
    navigate('/');
    return null;
  }

  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ maxWidth: 440, width: '100%', textAlign: 'center' }}>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center', color: 'var(--accent)' }}><Icon icon={Mail} size={48} /></div>
        <h1 className="display" style={{ fontSize: 36, marginBottom: 12 }}>Verify Your Email</h1>
        <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 28, lineHeight: 1.7 }}>
          We sent a 6-digit verification code to <strong>{user?.email}</strong>. Enter it below to verify your account.
        </p>
        <form onSubmit={handleSubmit}>
          <input className="fi" value={code} onChange={e => setCode(e.target.value)} placeholder="Enter 6-digit code"
            style={{ textAlign: 'center', fontSize: 24, fontFamily: 'var(--fm)', letterSpacing: 8, marginBottom: 16 }} maxLength={6} required />
          <button className="btn btn-p btn-lg" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
            {loading ? 'Verifying...' : 'Verify Email'}
          </button>
        </form>
      </div>
    </div>
  );
}
