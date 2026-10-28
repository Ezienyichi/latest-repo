import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Handshake, Plus, ArrowUp, ArrowDown, Pencil, Trash2, ExternalLink, Save, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import DashboardShell from './DashboardShell';
import Uploader from '../../components/ui/Uploader';
import Icon from '../../components/ui/Icon';
import api from '../../utils/api';

const TYPE_LABEL = { PARTNER: 'Partner', COLLABORATOR: 'Collaborator' };
const EMPTY = { name: '', type: 'PARTNER', logo: '', website: '', description: '', active: true };

// Manages the logos in the homepage / About-page carousel. The list order is
// the order they scroll in; "Hidden" partners stay here but aren't shown publicly.
export default function AdminPartners() {
  const { user } = useAuth();
  const { toast } = useCart();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [max, setMax] = useState(60);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);   // null | 'new' | partner id
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (user && user.role !== 'ADMIN') navigate('/'); }, [user]);
  useEffect(() => {
    api.getAdminPartners().then(d => { setItems(d.items || []); setMax(d.max || 60); })
      .catch(e => toast(e.message || 'Failed to load partners', 'err')).finally(() => setLoading(false));
  }, []);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const startNew = () => { setForm(EMPTY); setEditing('new'); };
  const startEdit = (p) => { setForm({ name: p.name, type: p.type, logo: p.logo || '', website: p.website || '', description: p.description || '', active: p.active }); setEditing(p.id); };

  const save = async () => {
    if (!form.name.trim()) return toast('Name is required', 'err');
    const body = { name: form.name, type: form.type, logo: form.logo.trim() || null, website: form.website.trim() || null, description: form.description, active: form.active };
    setSaving(true);
    try {
      const d = editing === 'new' ? await api.createAdminPartner(body) : await api.updateAdminPartner(editing, body);
      setItems(d.items); setEditing(null);
      toast(editing === 'new' ? 'Partner added' : 'Partner saved', 'ok');
    } catch (e) { toast(e.message || 'Save failed', 'err'); }
    finally { setSaving(false); }
  };

  const toggleActive = async (p) => {
    const prev = items;
    setItems(items.map(x => (x.id === p.id ? { ...x, active: !x.active } : x)));
    try { const d = await api.updateAdminPartner(p.id, { active: !p.active }); setItems(d.items); toast(p.active ? 'Hidden from the public carousel' : 'Now showing on the public carousel', 'ok'); }
    catch (e) { setItems(prev); toast(e.message || 'Update failed', 'err'); }
  };

  const move = async (i, dir) => {
    const j = i + dir; if (j < 0 || j >= items.length) return;
    const prev = items, next = [...items]; [next[i], next[j]] = [next[j], next[i]];
    setItems(next);
    try { const d = await api.reorderAdminPartners(next.map(x => x.id)); setItems(d.items); }
    catch (e) { setItems(prev); toast(e.message || 'Reorder failed', 'err'); }
  };

  const remove = async (p) => {
    if (!window.confirm(`Remove "${p.name}"? It disappears from the public carousel.`)) return;
    try { const d = await api.deleteAdminPartner(p.id); setItems(d.items); if (editing === p.id) setEditing(null); toast('Partner removed', 'ok'); }
    catch (e) { toast(e.message || 'Delete failed', 'err'); }
  };

  const shown = items.filter(i => i.active).length;
  const atMax = items.length >= max;

  return (
    <DashboardShell title="Partners">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap', marginBottom: 18 }}>
        <p style={{ fontSize: 13, color: 'var(--muted)', maxWidth: 560, lineHeight: 1.65 }}>
          These scroll across the homepage and About page, in the order below. <strong>Partners</strong> are organisations you work with; <strong>collaborators</strong> are creatives and teams you build with — each type gets its own row.
          Changes go live straight away.
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <a className="btn btn-s" href="/" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}><Icon icon={ExternalLink} size="inline" /> View site</a>
          <button className="btn btn-p" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={startNew} disabled={atMax}><Icon icon={Plus} size="inline" /> Add partner</button>
        </div>
      </div>

      {editing && (
        <div className="card" data-partner-editor style={{ padding: 24, marginBottom: 18 }}>
          <h3 style={{ fontFamily: 'var(--fd)', fontSize: 20, marginBottom: 16 }}>{editing === 'new' ? 'Add a partner' : 'Edit partner'}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 14 }}>
            <div className="fg" style={{ margin: 0 }}><label className="fl">Name *</label><input className="fi" value={form.name} onChange={e => set('name', e.target.value)} maxLength={100} data-field="name" /></div>
            <div className="fg" style={{ margin: 0 }}><label className="fl">Group</label>
              <select className="fi fsel" value={form.type} onChange={e => set('type', e.target.value)} data-field="type">
                <option value="PARTNER">Partner — an organisation we work with</option>
                <option value="COLLABORATOR">Collaborator — a creative or team we build with</option>
              </select></div>
          </div>
          <div className="fg" style={{ marginTop: 14 }}>
            <label className="fl">Logo <span style={{ fontWeight: 400, color: 'var(--muted)' }}>— without one, the name is shown as text</span></label>
            {form.logo && <div style={{ height: 56, display: 'flex', alignItems: 'center', marginBottom: 8 }}><img src={form.logo} alt="" style={{ maxHeight: '100%', maxWidth: 200, objectFit: 'contain' }} /></div>}
            <input className="fi" value={form.logo} onChange={e => set('logo', e.target.value)} placeholder="https://… (or upload below)" style={{ marginBottom: 8 }} data-field="logo" />
            <Uploader bucket="previews" accept="image/jpeg,image/png,image/webp,image/gif" maxBytes={5 * 1024 * 1024} kind="image"
              value={form.logo ? { path: null, publicUrl: form.logo } : null} onUploaded={({ publicUrl }) => set('logo', publicUrl)} label="Upload a logo" />
          </div>
          <div className="fg"><label className="fl">Website <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(optional — the logo links to it)</span></label><input className="fi" value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://…" data-field="website" /></div>
          <div className="fg"><label className="fl">Short description <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(optional · {form.description.length}/200)</span></label><input className="fi" value={form.description} onChange={e => set('description', e.target.value)} maxLength={200} data-field="description" /></div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, marginBottom: 16 }}>
            <input type="checkbox" checked={form.active} onChange={e => set('active', e.target.checked)} data-field="active" /> Show on the public carousel
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-p" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={save} disabled={saving}><Icon icon={Save} size="inline" /> {saving ? 'Saving…' : 'Save'}</button>
            <button className="btn btn-g" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={() => setEditing(null)}><Icon icon={X} size="inline" /> Cancel</button>
          </div>
        </div>
      )}

      {loading ? <div>{[1, 2, 3].map(i => <div key={i} className="skel" style={{ height: 70, borderRadius: 10, marginBottom: 10 }} />)}</div> : items.length === 0 ? (
        <div className="empty" data-partners-empty style={{ padding: 48 }}>
          <div style={{ marginBottom: 12, opacity: .3, display: 'flex', justifyContent: 'center' }}><Icon icon={Handshake} size={40} /></div>
          <div className="empty-t">No partners yet</div>
          <p style={{ color: 'var(--muted)', marginBottom: 16 }}>The partners section is hidden on the homepage and About page until you add one.</p>
          <button className="btn btn-p" onClick={startNew}>Add your first partner</button>
        </div>
      ) : (
        <>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>{items.length} total · {shown} showing publicly{items.length - shown > 0 ? ` · ${items.length - shown} hidden` : ''}</div>
          {items.map((p, i) => (
            <div key={p.id} className="card" data-partner-row style={{ padding: '14px 18px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', opacity: p.active ? 1 : .6 }}>
              <div style={{ width: 28, textAlign: 'center', fontFamily: 'var(--fm)', fontSize: 12, color: 'var(--muted)' }}>{i + 1}</div>
              <div style={{ width: 96, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--glass)', borderRadius: 8, flexShrink: 0, overflow: 'hidden' }}>
                {p.logo ? <img src={p.logo} alt="" style={{ maxWidth: '88%', maxHeight: '80%', objectFit: 'contain' }} /> : <span style={{ fontSize: 11, color: 'var(--muted)' }}>text only</span>}
              </div>
              <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 15, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ wordBreak: 'break-word' }}>{p.name}</span>
                  <span className={`badge ${p.type === 'PARTNER' ? 'b-blue' : 'b-gold'}`} style={{ fontSize: 10 }}>{TYPE_LABEL[p.type]}</span>
                  {!p.active && <span className="badge b-muted" style={{ fontSize: 10 }}>HIDDEN</span>}
                </div>
                {p.website && <a href={p.website} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: 'var(--accent)', wordBreak: 'break-all' }}>{p.website}</a>}
                {p.description && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{p.description}</div>}
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }} title="Show on the public carousel">
                  <input type="checkbox" checked={p.active} onChange={() => toggleActive(p)} aria-label={`Show ${p.name} publicly`} /> Show
                </label>
                <button className="btn btn-s btn-sm" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move ${p.name} up`}><Icon icon={ArrowUp} size="inline" /></button>
                <button className="btn btn-s btn-sm" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label={`Move ${p.name} down`}><Icon icon={ArrowDown} size="inline" /></button>
                <button className="btn btn-s btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }} onClick={() => startEdit(p)}><Icon icon={Pencil} size="inline" /> Edit</button>
                <button className="btn btn-danger btn-sm" onClick={() => remove(p)} aria-label={`Remove ${p.name}`}><Icon icon={Trash2} size="inline" /></button>
              </div>
            </div>
          ))}
        </>
      )}
    </DashboardShell>
  );
}
