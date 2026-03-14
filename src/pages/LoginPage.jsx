import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export default function LoginPage() {
  const { login } = useAuth();
  const { toast } = useCart();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await login(email, password);
      toast(`Welcome back${res.user.firstName ? ', ' + res.user.firstName : ''}!`, 'ok');

      // Route based on role and profile status
      if (res.user.role === 'ARTIST' && !res.user.hasProfile) navigate('/setup/artist');
      else if (res.user.role === 'CHARITY' && !res.user.hasProfile) navigate('/setup/charity');
      else navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Demo login helpers
  const demoLogin = async (email, pass, label) => {
    setLoading(true);
    try {
      const res = await login(email, pass);
      toast(`Logged in as ${label}`, 'ok');
      navigate('/');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--base)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 440, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 'var(--rl)', padding: '40px 36px', boxShadow: 'var(--shl)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Link to="/" style={{ textDecoration: 'none' }}>
            <div style={{ fontFamily: 'var(--fd)', fontSize: 28, fontWeight: 700, color: 'var(--accent)', marginBottom: 4 }}>Change Art Gallery</div>
          </Link>
          <p style={{ fontSize: 14, color: 'var(--muted)' }}>Sign in to your account</p>
        </div>

        {error && <div className="alert alert-w" style={{ marginBottom: 16 }}>⚠ {error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="fg">
            <label className="fl">Email</label>
            <input className="fi" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
          </div>
          <div className="fg">
            <label className="fl">Password</label>
            <input className="fi" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password" required />
          </div>
          <button className="btn btn-p" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '14px 0' }}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 18, fontSize: 13, color: 'var(--muted)' }}>
          Don't have an account? <Link to="/register" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>Create one</Link>
        </div>

        {/* Demo accounts */}
        <div style={{ marginTop: 28, padding: '16px 0 0', borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10, textAlign: 'center' }}>Demo Accounts</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              ['Admin', 'admin@changeartgallery.com', 'Admin123!', '🔒'],
              ['Buyer', 'buyer@demo.com', 'Buyer123!', '🛍️'],
              ['Artist', 'amara@demo.com', 'Artist123!', '🎨'],
              ['Charity', 'wateraid@demo.com', 'Charity123!', '🌿'],
            ].map(([label, em, pw, ico]) => (
              <button key={label} className="btn btn-s btn-sm" style={{ justifyContent: 'center', fontSize: 11 }}
                onClick={() => demoLogin(em, pw, label)} disabled={loading}>
                {ico} {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
