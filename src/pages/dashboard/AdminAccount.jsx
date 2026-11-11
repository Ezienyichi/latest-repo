import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import DashboardShell from './DashboardShell';
import PasswordInput from '../../components/ui/PasswordInput';
import api from '../../utils/api';

const MIN_PASSWORD = 12;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Admin → Account. Both changes re-ask for the current password. The server ends every OTHER session and
// hands back a fresh token, which we store so this browser stays signed in.
export default function AdminAccount() {
  const { user, refreshUser } = useAuth();
  const { toast } = useCart();
  const navigate = useNavigate();
  useEffect(() => { if (user && !['ADMIN', 'STAFF'].includes(user.role)) navigate('/'); }, [user]);

  const isOwner = user?.role === 'ADMIN';
  const temporary = !!user?.mustChangePassword;      // first sign-in with a temporary password
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [pwErr, setPwErr] = useState(''); const [pwBusy, setPwBusy] = useState(false);
  const [em, setEm] = useState({ current: '', email: '' });
  const [emErr, setEmErr] = useState(''); const [emBusy, setEmBusy] = useState(false);

  const adopt = async (res) => { api.setToken(res.token); await refreshUser(); };

  const changePassword = async (e) => {
    e.preventDefault(); setPwErr('');
    if (!pw.current) return setPwErr('Enter your current password');
    if (pw.next.length < MIN_PASSWORD) return setPwErr(`New password must be at least ${MIN_PASSWORD} characters`);
    if (pw.next !== pw.confirm) return setPwErr('New password and confirmation do not match');
    if (pw.next === pw.current) return setPwErr('New password must be different from the current one');
    setPwBusy(true);
    try {
      await adopt(await api.changeAdminPassword({ currentPassword: pw.current, newPassword: pw.next, confirmPassword: pw.confirm }));
      setPw({ current: '', next: '', confirm: '' });
      toast('Password changed. Other sessions have been signed out.', 'ok');
      if (temporary) navigate('/dashboard/admin/submissions');
    } catch (err) { setPwErr(err.message || 'Could not change the password'); } finally { setPwBusy(false); }
  };

  const changeEmail = async (e) => {
    e.preventDefault(); setEmErr('');
    if (!EMAIL_RE.test(em.email.trim())) return setEmErr('Enter a valid email address');
    if (!em.current) return setEmErr('Enter your current password to confirm');
    setEmBusy(true);
    try {
      await adopt(await api.changeAdminEmail({ currentPassword: em.current, newEmail: em.email.trim() }));
      setEm({ current: '', email: '' });
      toast('Login email changed. Other sessions have been signed out.', 'ok');
    } catch (err) { setEmErr(err.message || 'Could not change the email'); } finally { setEmBusy(false); }
  };

  return (
    <DashboardShell title="Account">
      {temporary && <div className="alert alert-w" role="alert" data-must-change style={{ maxWidth: 560, marginBottom: 16 }}>You're signing in with a temporary password. Choose your own below to continue — you can't use anything else until you do.</div>}
      <p style={{ fontSize: 13, color: 'var(--muted)', maxWidth: 640, lineHeight: 1.65, marginBottom: 18 }}>
        Signed in as <strong data-account-email style={{ color: 'var(--txt)', overflowWrap: 'anywhere' }}>{user?.email}</strong>. Changing your password or login email signs out every <em>other</em> device or browser; this one stays signed in.
      </p>

      <form className="card" onSubmit={changePassword} data-account-form="password" noValidate style={{ padding: 22, marginBottom: 18, maxWidth: 560 }}>
        <h3 style={{ fontFamily: 'var(--fd)', fontSize: 22, marginBottom: 14 }}>Change password</h3>
        {pwErr && <div className="alert alert-e" role="alert" data-account-error="password" style={{ marginBottom: 14 }}>{pwErr}</div>}
        <div className="fg"><label className="fl" htmlFor="acct-cur">Current password</label><PasswordInput id="acct-cur" autoComplete="current-password" value={pw.current} onChange={e => setPw({ ...pw, current: e.target.value })} /></div>
        <div className="fg"><label className="fl" htmlFor="acct-new">New password <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(at least {MIN_PASSWORD} characters)</span></label><PasswordInput id="acct-new" autoComplete="new-password" value={pw.next} onChange={e => setPw({ ...pw, next: e.target.value })} /></div>
        <div className="fg"><label className="fl" htmlFor="acct-conf">Confirm new password</label><PasswordInput id="acct-conf" autoComplete="new-password" value={pw.confirm} onChange={e => setPw({ ...pw, confirm: e.target.value })} /></div>
        <button className="btn btn-p" disabled={pwBusy} data-account-submit="password">{pwBusy ? 'Saving…' : 'Change password'}</button>
      </form>

      {isOwner && <form className="card" onSubmit={changeEmail} data-account-form="email" noValidate style={{ padding: 22, maxWidth: 560 }}>
        <h3 style={{ fontFamily: 'var(--fd)', fontSize: 22, marginBottom: 6 }}>Change login email</h3>
        <p style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 14, lineHeight: 1.6 }}>Use an address you can receive mail at. From now on you sign in with it.</p>
        {emErr && <div className="alert alert-e" role="alert" data-account-error="email" style={{ marginBottom: 14 }}>{emErr}</div>}
        <div className="fg"><label className="fl" htmlFor="acct-email">New email</label><input id="acct-email" className="fi" type="email" autoComplete="email" value={em.email} onChange={e => setEm({ ...em, email: e.target.value })} /></div>
        <div className="fg"><label className="fl" htmlFor="acct-em-cur">Current password</label><PasswordInput id="acct-em-cur" autoComplete="current-password" value={em.current} onChange={e => setEm({ ...em, current: e.target.value })} /></div>
        <button className="btn btn-p" disabled={emBusy} data-account-submit="email">{emBusy ? 'Saving…' : 'Change email'}</button>
      </form>}
    </DashboardShell>
  );
}
