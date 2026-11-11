import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import DashboardShell from './DashboardShell';
import Uploader from '../../components/ui/Uploader';
import Icon from '../../components/ui/Icon';
import api from '../../utils/api';

const blank = { name: '', role: '', photoPath: '', sortOrder: '', active: true };

// Admin → Team: the people shown on the About page. Owner and staff can manage it.
export default function AdminTeam() {
  const { user } = useAuth();
  const { toast } = useCart();
  const navigate = useNavigate();
  useEffect(() => { if (user && !['ADMIN', 'STAFF'].includes(user.role)) navigate('/'); }, [user]);
  const [items, setItems] = useState(null);
  const [form, setForm] = useState(null);       // null = closed; { id?, ...fields }
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const load = () => api.getAdminTeam().then(d => setItems(d.items)).catch(e => toast(e.message || 'Failed to load', 'err'));
  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e.preventDefault(); setErr('');
    if (!form.name.trim()) return setErr('Enter a name');
    if (!form.role.trim()) return setErr('Enter a role or title');
    const body = { name: form.name.trim(), role: form.role.trim(), photoPath: form.photoPath || null, active: !!form.active };
    if (form.sortOrder !== '' && form.sortOrder != null) body.sortOrder = Number(form.sortOrder);
    setBusy(true);
    try {
      if (form.id) await api.updateTeamMember(form.id, body); else await api.createTeamMember(body);
      toast(form.id ? 'Team member updated' : 'Team member added', 'ok'); setForm(null); load();
    } catch (e2) { setErr(e2.message || 'Could not save'); } finally { setBusy(false); }
  };
  const remove = async (m) => {
    if (!window.confirm(`Remove ${m.name} from the team page?`)) return;
    try { await api.deleteTeamMember(m.id); toast('Removed', 'ok'); load(); } catch (e) { toast(e.message || 'Failed', 'err'); }
  };
  const toggle = async (m) => { try { await api.updateTeamMember(m.id, { active: !m.active }); load(); } catch (e) { toast(e.message || 'Failed', 'err'); } };

  return (
    <DashboardShell title="Team">
      <p style={{ fontSize: 13, color: 'var(--muted)', maxWidth: 620, lineHeight: 1.65, marginBottom: 16 }}>The people shown in "Meet the team" on the About page. Inactive members are hidden from the public page.</p>
      {!form && <button className="btn btn-p btn-sm" data-team-add onClick={() => { setForm({ ...blank }); setErr(''); }} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 14 }}><Icon icon={Plus} size="inline" /> Add team member</button>}
      {form && (
        <form className="card" onSubmit={save} data-team-form noValidate style={{ padding: 20, marginBottom: 18, maxWidth: 560 }}>
          <h3 style={{ fontFamily: 'var(--fd)', fontSize: 20, marginBottom: 12 }}>{form.id ? 'Edit team member' : 'New team member'}</h3>
          {err && <div className="alert alert-e" role="alert" data-team-error style={{ marginBottom: 12 }}>{err}</div>}
          <div className="fg"><label className="fl">Name *</label><input className="fi" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} maxLength={100} data-field="teamName" /></div>
          <div className="fg"><label className="fl">Role / title *</label><input className="fi" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} maxLength={100} data-field="teamRole" /></div>
          <div className="fg"><label className="fl">Photo</label>
            <Uploader bucket="avatars" accept="image/jpeg,image/png,image/webp" maxBytes={5 * 1024 * 1024} kind="image" label="Photo" value={form.photoPath ? { path: null, publicUrl: form.photoPath } : null} onUploaded={({ publicUrl }) => setForm({ ...form, photoPath: publicUrl })} />
            {form.photoPath && <button type="button" className="btn btn-g btn-sm" style={{ marginTop: 6 }} onClick={() => setForm({ ...form, photoPath: '' })}>Remove photo</button>}
          </div>
          <div className="fg"><label className="fl">Display order <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(lower comes first; blank = last)</span></label><input className="fi" inputMode="numeric" value={form.sortOrder} onChange={e => setForm({ ...form, sortOrder: e.target.value })} style={{ maxWidth: 140 }} /></div>
          <label className="agree-check"><input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} /><span>Show on the About page</span></label>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}><button className="btn btn-p" disabled={busy} data-team-save>{busy ? 'Saving…' : 'Save'}</button><button type="button" className="btn btn-g" onClick={() => setForm(null)}>Cancel</button></div>
        </form>
      )}
      {!items ? <div className="skel" style={{ height: 160, borderRadius: 12 }} /> : items.length === 0 ? <div className="card" style={{ padding: 24, color: 'var(--muted)' }}>No team members yet.</div> : items.map(m => (
        <div key={m.id} className="card" data-team-row={m.name} style={{ padding: '12px 16px', marginBottom: 8, display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', overflow: 'hidden', background: 'var(--glass)', flex: 'none' }}>{m.photoPath && <img src={m.photoPath} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}</div>
          <div style={{ flex: '1 1 200px', minWidth: 0 }}><div style={{ fontWeight: 600 }}>{m.name}</div><div style={{ fontSize: 12, color: 'var(--muted)' }}>{m.role} · order {m.sortOrder}{!m.active && ' · hidden'}</div></div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button className="btn btn-s btn-sm" onClick={() => { setForm({ id: m.id, name: m.name, role: m.role, photoPath: m.photoPath || '', sortOrder: String(m.sortOrder), active: m.active }); setErr(''); window.scrollTo({ top: 0 }); }}>Edit</button>
            <button className="btn btn-s btn-sm" onClick={() => toggle(m)}>{m.active ? 'Hide' : 'Show'}</button>
            <button className="btn btn-danger btn-sm" onClick={() => remove(m)} aria-label={`Remove ${m.name}`}><Icon icon={Trash2} size="inline" /></button>
          </div>
        </div>
      ))}
    </DashboardShell>
  );
}
