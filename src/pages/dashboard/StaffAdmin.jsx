import { useState, useEffect } from 'react';
import { Copy, Check, UserPlus, Eye, EyeOff } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import Icon from '../../components/ui/Icon';
import api from '../../utils/api';

// Owner-only pieces of the Users page for staff logins: add one, show its temporary password ONCE,
// deactivate / reactivate / reset. The server enforces all of it (these routes are ADMIN-only).

export function TempPasswordNotice({ temp, onClose }) {
  const { toast } = useCart();
  const [copied, setCopied] = useState(false);
  const [shown, setShown] = useState(false);
  useEffect(() => { setShown(false); }, [temp]);      // a new password always starts hidden
  if (!temp) return null;
  const copy = async () => { try { await navigator.clipboard.writeText(temp.password); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { toast('Copy failed — select the password and copy it manually', 'err'); } };
  return (
    <div className="card" data-temp-password role="alert" style={{ padding: 20, marginBottom: 18, border: '2px solid var(--gold, #E0A354)' }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{temp.title}</div>
      <div style={{ fontSize: 13, color: 'var(--txt2)', marginBottom: 12, lineHeight: 1.6 }}>
        Give this to <strong>{temp.name}</strong> (<span style={{ overflowWrap: 'anywhere' }}>{temp.email}</span>). <strong>It is shown only once</strong> and cannot be looked up again. They will be asked to choose their own password the first time they sign in.
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <code data-temp-value style={{ fontSize: 20, letterSpacing: 1.5, padding: '8px 14px', background: 'var(--glass)', border: '1px solid var(--border)', borderRadius: 8, userSelect: shown ? 'all' : 'none', overflowWrap: 'anywhere' }}>{shown ? temp.password : '•'.repeat(temp.password.length)}</code>
        <button type="button" className="btn btn-s btn-sm" data-temp-eye onClick={() => setShown(s => !s)} aria-label={shown ? 'Hide password' : 'Show password'} aria-pressed={shown} style={{ display: 'inline-flex', alignItems: 'center' }}><Icon icon={shown ? EyeOff : Eye} size="inline" aria-hidden="true" /></button>
        <button className="btn btn-s btn-sm" onClick={copy} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Icon icon={copied ? Check : Copy} size="inline" /> {copied ? 'Copied' : 'Copy'}</button>
        <button className="btn btn-p btn-sm" onClick={onClose} data-temp-done>I've saved it — hide</button>
      </div>
    </div>
  );
}

export function AddStaff({ onCreated, setTemp }) {
  const { toast } = useCart();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ firstName: '', lastName: '', email: '' });
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setErr('');
    if (!f.firstName.trim()) return setErr('Enter a first name');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) return setErr('Enter a valid email address');
    setBusy(true);
    try {
      const r = await api.createStaff({ firstName: f.firstName.trim(), lastName: f.lastName.trim(), email: f.email.trim() });
      setTemp({ title: 'Staff login created', name: [r.user.firstName, r.user.lastName].filter(Boolean).join(' '), email: r.user.email, password: r.temporaryPassword });
      setF({ firstName: '', lastName: '', email: '' }); setOpen(false); onCreated?.();
      toast('Staff login created', 'ok');
    } catch (e2) { setErr(e2.message || 'Could not create the login'); } finally { setBusy(false); }
  };
  if (!open) return <button className="btn btn-p btn-sm" data-add-staff onClick={() => setOpen(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 14 }}><Icon icon={UserPlus} size="inline" /> Add staff</button>;
  return (
    <form className="card" onSubmit={submit} data-add-staff-form noValidate style={{ padding: 18, marginBottom: 16, maxWidth: 640 }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>Add a staff login</div>
      <p style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 12, lineHeight: 1.6 }}>Staff can manage products, campaigns, charities, partners, team members, submissions and order shipping. They cannot see settings, revenue, users or legal pages. You'll get a temporary password to pass on.</p>
      {err && <div className="alert alert-e" role="alert" data-staff-error style={{ marginBottom: 12 }}>{err}</div>}
      <div className="submit-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '0 14px' }}>
        <div className="fg"><label className="fl">First name *</label><input className="fi" value={f.firstName} onChange={e => setF({ ...f, firstName: e.target.value })} data-field="staffFirst" /></div>
        <div className="fg"><label className="fl">Last name</label><input className="fi" value={f.lastName} onChange={e => setF({ ...f, lastName: e.target.value })} /></div>
      </div>
      <div className="fg"><label className="fl">Email (their login) *</label><input className="fi" type="email" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} data-field="staffEmail" /></div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-p btn-sm" disabled={busy} data-staff-submit>{busy ? 'Creating…' : 'Create login'}</button>
        <button type="button" className="btn btn-g btn-sm" onClick={() => { setOpen(false); setErr(''); }}>Cancel</button>
      </div>
    </form>
  );
}

export function StaffActions({ u, onChanged, setTemp }) {
  const { toast } = useCart();
  const [busy, setBusy] = useState(false);
  if (u.role !== 'STAFF') return null;
  const name = [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email;
  const run = async (kind) => {
    const msg = kind === 'deactivate' ? `Deactivate ${name}? They are signed out of every device immediately and cannot log in.`
      : kind === 'reset' ? `Reset ${name}'s password? They are signed out and get a new temporary password.` : `Reactivate ${name}? They will get a new temporary password.`;
    if (!window.confirm(msg)) return;
    setBusy(true);
    try {
      const r = kind === 'deactivate' ? await api.deactivateStaff(u.id) : kind === 'reactivate' ? await api.reactivateStaff(u.id) : await api.resetStaffPassword(u.id);
      if (r.temporaryPassword) setTemp({ title: kind === 'reset' ? 'New temporary password' : 'Login reactivated', name, email: u.email, password: r.temporaryPassword });
      else toast(`${name} deactivated and signed out everywhere`, 'ok');
      onChanged?.();
    } catch (e) { toast(e.message || 'Failed', 'err'); } finally { setBusy(false); }
  };
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      {u.deactivatedAt
        ? <button className="btn btn-s btn-sm" disabled={busy} onClick={() => run('reactivate')} data-staff-action="reactivate">Reactivate</button>
        : <>
          <button className="btn btn-s btn-sm" disabled={busy} onClick={() => run('reset')} data-staff-action="reset">Reset password</button>
          <button className="btn btn-danger btn-sm" disabled={busy} onClick={() => run('deactivate')} data-staff-action="deactivate">Deactivate</button>
        </>}
    </div>
  );
}
