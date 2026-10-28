import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { SDGs } from '../../data/constants';
import DashboardShell from './DashboardShell';
import Uploader from '../../components/ui/Uploader';
import GalleryEditor from '../../components/ui/GalleryEditor';
import CharityLogo from '../../components/ui/CharityLogo';
import Icon from '../../components/ui/Icon';
import api from '../../utils/api';
import { cur } from '../../utils/currency';
import { PROJECT_STATUS_BADGE } from './AdminProjects';

// An admin-created charity is vouched for by the admin, so new ones default
// to verified; the toggle is right there to turn it off.
const EMPTY = { name: '', mission: '', logo: '', registrationNo: '', websiteUrl: '', images: [], sdgIds: [], target: '', verified: true };
const money = (n) => `${cur()}${Number(n || 0).toLocaleString('en-GB', { maximumFractionDigits: 2 })}`;

export default function AdminCharityEditor() {
  const { id } = useParams();
  const isNew = !id;
  const { user } = useAuth();
  const { toast } = useCart();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [charity, setCharity] = useState(null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (user && user.role !== 'ADMIN') navigate('/'); }, [user]);

  const fill = (c) => setForm({
    name: c.name || '', mission: c.mission || '', logo: c.logo || '', registrationNo: c.registrationNo || '',
    websiteUrl: c.websiteUrl || '', images: Array.isArray(c.images) ? c.images : [], sdgIds: c.sdgIds || [], target: Number(c.target) > 0 ? String(Number(c.target)) : '', verified: !!c.verified,
  });
  const load = () => api.getAdminCharity(id).then(c => { setCharity(c); fill(c); })
    .catch(e => { toast(e.message || 'Failed to load charity', 'err'); navigate('/dashboard/admin/charities'); })
    .finally(() => setLoading(false));
  useEffect(() => { if (!isNew) load(); }, [id]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const toggleSdg = (n) => setForm(p => ({ ...p, sdgIds: p.sdgIds.includes(n) ? p.sdgIds.filter(x => x !== n) : [...p.sdgIds, n] }));

  const save = async () => {
    if (!form.name.trim()) return toast('Name is required', 'err');
    if (form.target !== '' && !(Number(form.target) >= 0)) return toast('Target must be 0 or more', 'err');
    const body = {
      name: form.name, mission: form.mission, registrationNo: form.registrationNo, websiteUrl: form.websiteUrl.trim() || null,
      sdgIds: form.sdgIds, target: form.target === '' ? 0 : Number(form.target), verified: form.verified, images: form.images.filter(i => i.url),
    };
    // Older seed data can hold an emoji in `logo`; echoing that back would be
    // rejected as a non-URL, so only send it when it actually changed.
    if (isNew || form.logo !== (charity?.logo || '')) body.logo = form.logo.trim() || null;
    setSaving(true);
    try {
      if (isNew) {
        const created = await api.createAdminCharity(body);
        toast('Charity created', 'ok');
        navigate(`/dashboard/admin/charities/${created.id}`, { replace: true });
      } else {
        await api.updateAdminCharity(id, body);
        toast('Charity saved', 'ok');
        await load();
      }
    } catch (e) { toast(e.message || 'Save failed', 'err'); }
    finally { setSaving(false); }
  };

  const remove = async () => {
    if (!window.confirm(`Delete "${charity.name}"? This can't be undone.`)) return;
    try { await api.deleteAdminCharity(id); toast('Charity deleted', 'ok'); navigate('/dashboard/admin/charities'); }
    catch (e) { toast(e.message || 'Delete failed', 'err'); }   // 409 text says exactly what to reassign first
  };

  if (loading) return <DashboardShell title="Charity"><div className="skel" style={{ height: 300, borderRadius: 12 }} /></DashboardShell>;

  return (
    <DashboardShell title={isNew ? 'New Charity' : 'Edit Charity'}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <button className="btn btn-g" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={() => navigate('/dashboard/admin/charities')}><Icon icon={ArrowLeft} size="inline" /> Back to Charities</button>
        <div style={{ display: 'flex', gap: 8 }}>
          {!isNew && <button className="btn btn-s" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#dc2626' }} onClick={remove}><Icon icon={Trash2} size="inline" /> Delete</button>}
          <button className="btn btn-p" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={save} disabled={saving}><Icon icon={Save} size="inline" /> {saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>

      {!isNew && charity && (
        <div className="card" style={{ marginBottom: 18, display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'center' }}>
          <div><div className="lbl">Raised (all campaigns)</div><div style={{ fontFamily: 'var(--fd)', fontSize: 26, fontWeight: 700, color: 'var(--accent)' }}>{money(charity.charityRaised)}</div></div>
          <div><div className="lbl">Campaigns</div><div style={{ fontFamily: 'var(--fd)', fontSize: 26, fontWeight: 700 }}>{charity.projects?.length || 0}</div></div>
          <div><div className="lbl">Artworks</div><div style={{ fontFamily: 'var(--fd)', fontSize: 26, fontWeight: 700 }}>{charity._count?.products ?? 0}</div></div>
          <div style={{ fontSize: 12, color: 'var(--muted)', maxWidth: 320 }}>
            Raised is the total across this charity’s campaigns and can’t be edited here.
            {charity.hasLoginAccount ? ` This charity has its own login (${charity.accountEmail}).` : ' Managed by admin — no login account.'}
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="fg"><label className="fl">Charity Name *</label><input className="fi" value={form.name} onChange={e => set('name', e.target.value)} maxLength={140} /></div>
        <div className="fg">
          <label className="fl">Logo</label>
          {form.logo && <div style={{ marginBottom: 8 }}><CharityLogo logo={form.logo} size={56} /></div>}
          <input className="fi" value={form.logo} onChange={e => set('logo', e.target.value)} placeholder="https://… (or upload below)" style={{ marginBottom: 8 }} />
          <Uploader bucket="avatars" accept="image/jpeg,image/png,image/webp" maxBytes={5 * 1024 * 1024} kind="image"
            value={form.logo ? { path: null, publicUrl: form.logo } : null}
            onUploaded={({ publicUrl }) => set('logo', publicUrl)} label="Upload a logo" />
        </div>
        <div className="fg">
          <label className="fl">Gallery Images <span style={{ fontWeight: 400, color: 'var(--muted)' }}>— shown on the charity page, click to zoom (optional)</span></label>
          <GalleryEditor value={form.images} onChange={v => set('images', v)} />
        </div>
        <div className="fg"><label className="fl">Mission / Description</label><textarea className="fi fta" rows={5} value={form.mission} onChange={e => set('mission', e.target.value)} placeholder="What does this charity do, and who does it help?" /></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
          <div className="fg"><label className="fl">Registration Number</label><input className="fi" value={form.registrationNo} onChange={e => set('registrationNo', e.target.value)} maxLength={60} /></div>
          <div className="fg"><label className="fl">Website</label><input className="fi" value={form.websiteUrl} onChange={e => set('websiteUrl', e.target.value)} placeholder="https://…" /></div>
          <div className="fg"><label className="fl">Fundraising Target ({cur()})</label><input className="fi" type="number" min="0" step="0.01" value={form.target} onChange={e => set('target', e.target.value)} /></div>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0 16px', fontSize: 14, cursor: 'pointer' }}>
          <input type="checkbox" checked={form.verified} onChange={e => set('verified', e.target.checked)} />
          Verified <span style={{ color: 'var(--muted)', fontSize: 12 }}>— shows the verified badge publicly</span>
        </label>

        <div>
          <div className="fl" style={{ marginBottom: 8 }}>SDG Focus</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {SDGs.map(s => (
              <div key={s.id} onClick={() => toggleSdg(s.id)} className={`pill${form.sdgIds.includes(s.id) ? ' on' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', fontSize: 11 }}>
                <span className="sdg" style={{ background: s.c, color: '#fff', width: 18, height: 18, fontSize: 8, borderRadius: 3 }}>{s.id}</span>{s.n}
              </div>
            ))}
          </div>
        </div>
      </div>

      {isNew ? (
        <div className="alert alert-i" style={{ fontSize: 13 }}>Once saved, this charity appears in the campaign form’s charity picker.</div>
      ) : (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 10, flexWrap: 'wrap' }}>
            <h3 style={{ fontFamily: 'var(--fd)', fontSize: 20 }}>Campaigns ({charity?.projects?.length || 0})</h3>
            <Link className="btn btn-s btn-sm" to="/dashboard/admin/projects/new">New campaign</Link>
          </div>
          {charity?.projects?.length ? (
            <table className="tbl">
              <thead><tr><th>Campaign</th><th>Status</th><th>Target</th><th>Raised</th></tr></thead>
              <tbody>
                {charity.projects.map(p => (
                  <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/dashboard/admin/projects/${p.id}`)}>
                    <td style={{ fontSize: 13, fontWeight: 600 }}>{p.title}</td>
                    <td><span className={`badge ${PROJECT_STATUS_BADGE[p.status] || 'b-muted'}`} style={{ fontSize: 10 }}>{p.status}</span></td>
                    <td style={{ fontSize: 12 }}>{money(p.targetAmount)}</td>
                    <td style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 700 }}>{money(p.raisedAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p style={{ color: 'var(--muted)', fontSize: 13 }}>No campaigns yet. This charity can be deleted while it has none (and no artworks or funders).</p>}
          {charity?.projects?.length > 0 && <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 12 }}>To delete this charity, first reassign its campaigns to another charity (open a campaign and change its charity). Archiving doesn’t detach a campaign.</p>}
        </div>
      )}
    </DashboardShell>
  );
}
