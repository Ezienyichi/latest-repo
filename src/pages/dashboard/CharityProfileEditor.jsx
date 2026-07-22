import { useState, useEffect } from 'react';
import { useCart } from '../../context/CartContext';
import { SDGs } from '../../data/constants';
import DashboardShell from './DashboardShell';
import Uploader from '../../components/ui/Uploader';
import api from '../../utils/api';

const DOC_BADGE = { PENDING: 'b-gold', APPROVED: 'b-green', REJECTED: 'b-red' };

export default function CharityProfileEditor() {
  const { toast } = useCart();
  const [profile, setProfile] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});
  const [newDocLabel, setNewDocLabel] = useState('');
  const [newDocPath, setNewDocPath] = useState(null);

  const load = () => {
    api.getCharityDashboard().then(d => {
      setProfile(d.profile);
      setDocuments(d.documents || []);
      const p = d.profile;
      setForm({
        name: p.name || '', mission: p.mission || '', registrationNo: p.registrationNo || '',
        websiteUrl: p.websiteUrl || '', target: p.target || 0, sdgIds: p.sdgIds || [], logo: p.logo || '',
      });
    }).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const addDocument = async () => {
    if (!newDocLabel || !newDocPath) { toast('Add a label and a file first', 'err'); return; }
    try {
      await api.post('/dashboard/charity/documents', { label: newDocLabel, storagePath: newDocPath });
      toast('Document submitted for review', 'ok');
      setNewDocLabel(''); setNewDocPath(null);
      load();
    } catch (e) { toast(e.message, 'err'); }
  };

  const deleteDocument = async (id) => {
    if (!confirm('Remove this document?')) return;
    try { await api.delete(`/dashboard/charity/documents/${id}`); toast('Removed', 'ok'); load(); }
    catch (e) { toast(e.message, 'err'); }
  };

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const toggleSdg = (id) => setForm(p => ({ ...p, sdgIds: p.sdgIds.includes(id) ? p.sdgIds.filter(x => x !== id) : [...p.sdgIds, id] }));

  const save = async () => {
    setSaving(true);
    try {
      await api.patch('/dashboard/charity/profile', {
        name: form.name, mission: form.mission, registrationNo: form.registrationNo,
        websiteUrl: form.websiteUrl, target: form.target, sdgIds: form.sdgIds, logo: form.logo,
      });
      toast('Profile updated!', 'ok');
    } catch (e) { toast(e.message, 'err'); }
    finally { setSaving(false); }
  };

  if (loading) return <DashboardShell title="Edit Profile"><div className="skel" style={{ height: 300, borderRadius: 'var(--rl)' }} /></DashboardShell>;

  return (
    <DashboardShell title="Edit Profile">
      {profile?.verified ? (
        <div className="alert alert-ok" style={{ marginBottom: 20 }}>✓ Your charity is verified and visible on the platform</div>
      ) : (
        <div className="alert alert-w" style={{ marginBottom: 20 }}>⏳ Your charity profile is pending verification</div>
      )}

      <div className="card" style={{ padding: 28 }}>
        <div className="fg">
          <label className="fl">Logo</label>
          <Uploader
            bucket="avatars"
            accept="image/jpeg,image/png,image/webp"
            maxBytes={5 * 1024 * 1024}
            kind="image"
            value={form.logo ? { path: null, publicUrl: form.logo } : null}
            onUploaded={({ publicUrl }) => set('logo', publicUrl)}
            label="Upload a logo"
          />
        </div>
        <div className="fg"><label className="fl">Charity Name</label><input className="fi" value={form.name} onChange={e => set('name', e.target.value)} /></div>
        <div className="fg"><label className="fl">Registration Number</label><input className="fi" value={form.registrationNo} onChange={e => set('registrationNo', e.target.value)} /></div>
        <div className="fg"><label className="fl">Mission Statement</label><textarea className="fi fta" value={form.mission} onChange={e => set('mission', e.target.value)} rows={5} /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div className="fg" style={{ margin: 0 }}><label className="fl">Website</label><input className="fi" value={form.websiteUrl} onChange={e => set('websiteUrl', e.target.value)} placeholder="https://..." /></div>
          <div className="fg" style={{ margin: 0 }}><label className="fl">Fundraising Target (£)</label><input className="fi" type="number" value={form.target} onChange={e => set('target', Number(e.target.value))} /></div>
        </div>
        <div className="fg" style={{ marginTop: 14 }}>
          <label className="fl">SDG Alignment</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {SDGs.map(s => (
              <div key={s.id} onClick={() => toggleSdg(s.id)} className={`pill${form.sdgIds.includes(s.id) ? ' on' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', fontSize: 11 }}>
                <span className="sdg" style={{ background: s.c, color: '#fff', width: 18, height: 18, fontSize: 8, borderRadius: 3 }}>{s.id}</span>{s.n}
              </div>
            ))}
          </div>
        </div>

        <button className="btn btn-p btn-lg" style={{ width: '100%', justifyContent: 'center', marginTop: 22 }} onClick={save} disabled={saving}>
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </div>

      <div className="card" style={{ padding: 28, marginTop: 20 }}>
        <h3 style={{ fontFamily: 'var(--fd)', fontSize: 20, marginBottom: 6 }}>Verification Documents</h3>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
          Upload registration certificates or other proof of charitable status. These are private — only your admin team can view them.
        </p>

        {documents.length > 0 && (
          <table className="tbl" style={{ marginBottom: 18 }}>
            <thead><tr><th>Label</th><th>Uploaded</th><th>Status</th><th>Note</th><th></th></tr></thead>
            <tbody>
              {documents.map(d => (
                <tr key={d.id}>
                  <td style={{ fontWeight: 500 }}>{d.label}</td>
                  <td style={{ fontSize: 12 }}>{new Date(d.uploadedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}</td>
                  <td><span className={`badge ${DOC_BADGE[d.reviewStatus]}`} style={{ fontSize: 10 }}>{d.reviewStatus}</span></td>
                  <td style={{ fontSize: 12, color: 'var(--muted)' }}>{d.reviewNote || '—'}</td>
                  <td>{d.reviewStatus === 'PENDING' && <button className="btn btn-danger btn-sm" onClick={() => deleteDocument(d.id)}>×</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <div style={{ flex: 2 }}>
            <Uploader
              bucket="charity-docs"
              accept="application/pdf,image/jpeg,image/png"
              maxBytes={20 * 1024 * 1024}
              kind="file"
              value={newDocPath ? { path: newDocPath } : null}
              onUploaded={({ path }) => setNewDocPath(path)}
              label="Upload a document"
            />
          </div>
          <input className="fi" value={newDocLabel} onChange={e => setNewDocLabel(e.target.value)} placeholder="e.g. UK Charity Commission Certificate" style={{ flex: 1 }} />
          <button className="btn btn-s btn-sm" onClick={addDocument}>Submit</button>
        </div>
      </div>
    </DashboardShell>
  );
}
