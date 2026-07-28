import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import Icon from '../components/ui/Icon';
import Wordmark from '../components/ui/Wordmark';

export default function RegisterPage() {
  const { register } = useAuth();
  const { toast } = useCart();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', confirmPassword: '', firstName: '', lastName: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return; }

    setLoading(true);
    try {
      const res = await register({ ...form, role: 'BUYER' });
      toast('Account created! Check your email for the verification code.', 'ok');

      if (res.verificationCode) {
        toast(`Dev mode — your code is: ${res.verificationCode}`, 'info');
      }

      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--base)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 460, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 'var(--rl)', padding: '40px 36px', boxShadow: 'var(--shl)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Link to="/" style={{ textDecoration: 'none' }}>
            <Wordmark style={{ fontFamily: 'var(--fd)', fontSize: 28, fontWeight: 700, color: 'var(--accent)', marginBottom: 4, display: 'block' }} />
          </Link>
          <p style={{ fontSize: 14, color: 'var(--muted)' }}>Create your account</p>
        </div>

        <form onSubmit={handleSubmit}>
          {error && <div className="alert alert-w" style={{ marginBottom: 16 }}><Icon icon={AlertTriangle} size="inline" /> {error}</div>}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div className="fg" style={{ margin: 0 }}>
              <label className="fl">First Name</label>
              <input className="fi" value={form.firstName} onChange={e => set('firstName', e.target.value)} placeholder="Jane" required />
            </div>
            <div className="fg" style={{ margin: 0 }}>
              <label className="fl">Last Name</label>
              <input className="fi" value={form.lastName} onChange={e => set('lastName', e.target.value)} placeholder="Doe" required />
            </div>
          </div>
          <div className="fg">
            <label className="fl">Email</label>
            <input className="fi" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@example.com" required />
          </div>
          <div className="fg">
            <label className="fl">Phone (optional)</label>
            <input className="fi" type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+44 7700 000000" />
          </div>
          <div className="fg">
            <label className="fl">Password</label>
            <input className="fi" type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="Min. 8 characters" required />
          </div>
          <div className="fg">
            <label className="fl">Confirm Password</label>
            <input className="fi" type="password" value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)} placeholder="Repeat password" required />
          </div>

          <button className="btn btn-p" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '14px 0', marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {loading ? 'Creating Account...' : <>Create Account <Icon icon={ArrowRight} size="inline" /></>}
          </button>

          <div style={{ textAlign: 'center', marginTop: 18, fontSize: 13, color: 'var(--muted)' }}>
            Already have an account? <Link to="/login" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>Sign In</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
