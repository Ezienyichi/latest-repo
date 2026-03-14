import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

const ROLES = [
  { id: 'BUYER', label: 'Buyer / Funder', icon: '🛍️', desc: 'Browse and purchase art. Support charities through your purchases.' },
  { id: 'ARTIST', label: 'Artist / Creative', icon: '🎨', desc: 'Sell artwork, digital products. Connect your art to charitable causes.' },
  { id: 'CHARITY', label: 'Charity / Non-Profit', icon: '🌿', desc: 'Receive donations, manage funders. Partner with artists for impact.' },
];

export default function RegisterPage() {
  const { register } = useAuth();
  const { toast } = useCart();
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: role, 2: details
  const [role, setRole] = useState('BUYER');
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
      const res = await register({ ...form, role });
      toast('Account created! Check your email for the verification code.', 'ok');

      if (res.verificationCode) {
        toast(`Dev mode — your code is: ${res.verificationCode}`, 'info');
      }

      // Redirect based on role
      if (role === 'ARTIST') navigate('/setup/artist');
      else if (role === 'CHARITY') navigate('/setup/charity');
      else navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--base)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 520, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 'var(--rl)', padding: '40px 36px', boxShadow: 'var(--shl)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Link to="/" style={{ textDecoration: 'none' }}>
            <div style={{ fontFamily: 'var(--fd)', fontSize: 28, fontWeight: 700, color: 'var(--accent)', marginBottom: 4 }}>Change Art Gallery</div>
          </Link>
          <p style={{ fontSize: 14, color: 'var(--muted)' }}>Create your account</p>
        </div>

        {/* Step indicator */}
        <div className="stepper" style={{ justifyContent: 'center', marginBottom: 28 }}>
          {[1, 2].map(s => (
            <div key={s} className="step">
              <div className={`step-c ${step > s ? 'done' : step === s ? 'active' : 'pending'}`}>{s}</div>
              <span className={`step-lbl ${step === s ? 'active' : ''}`}>{s === 1 ? 'Choose Role' : 'Your Details'}</span>
              {s < 2 && <div className="step-conn" />}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
              {ROLES.map(r => (
                <div key={r.id} onClick={() => setRole(r.id)}
                  style={{
                    padding: '16px 20px', borderRadius: 'var(--r)', cursor: 'pointer',
                    border: `2px solid ${role === r.id ? 'var(--mint)' : 'var(--border)'}`,
                    background: role === r.id ? 'rgba(23,124,29,.06)' : 'var(--glass)',
                    transition: 'all .18s', display: 'flex', gap: 14, alignItems: 'center',
                  }}>
                  <span style={{ fontSize: 28 }}>{r.icon}</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>{r.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>{r.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <button className="btn btn-p" style={{ width: '100%', justifyContent: 'center', padding: '14px 0' }} onClick={() => setStep(2)}>
              Continue as {ROLES.find(r => r.id === role)?.label} →
            </button>
          </div>
        )}

        {step === 2 && (
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, padding: '10px 14px', background: 'rgba(23,124,29,.06)', border: '1px solid rgba(23,124,29,.15)', borderRadius: 'var(--r)' }}>
              <span style={{ fontSize: 20 }}>{ROLES.find(r => r.id === role)?.icon}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>Registering as {ROLES.find(r => r.id === role)?.label}</span>
              <button type="button" className="btn btn-g btn-sm" style={{ marginLeft: 'auto', fontSize: 11 }} onClick={() => setStep(1)}>Change</button>
            </div>

            {error && <div className="alert alert-w" style={{ marginBottom: 16 }}>⚠ {error}</div>}

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

            <button className="btn btn-p" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '14px 0', marginTop: 8 }}>
              {loading ? 'Creating Account...' : 'Create Account →'}
            </button>

            <div style={{ textAlign: 'center', marginTop: 18, fontSize: 13, color: 'var(--muted)' }}>
              Already have an account? <Link to="/login" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>Sign In</Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
