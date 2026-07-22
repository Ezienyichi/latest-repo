import { useState, useEffect } from 'react';
import { useCart } from '../../context/CartContext';
import DashboardShell from './DashboardShell';
import Uploader from '../../components/ui/Uploader';
import api from '../../utils/api';

export default function CharityResources() {
  const { toast } = useCart();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: '', fileUrl: '', fileType: 'pdf', visibility: 'PUBLIC' });

  const load = () => { api.getCharityDashboard().then(setData).catch(() => {}).finally(() => setLoading(false)); };
  useEffect(load, []);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const addResource = async () => {
    if (!form.title || !form.fileUrl) { toast('Title and file URL required', 'err'); return; }
    try {
      await api.post('/dashboard/charity/resources', form);
      toast('Resource added!', 'ok');
      setShowAdd(false);
      setForm({ title: '', fileUrl: '', fileType: 'pdf', visibility: 'PUBLIC' });
      load();
    } catch (e) { toast(e.message, 'err'); }
  };

  const deleteResource = async (id) => {
    if (!confirm('Delete this resource?')) return;
    try { await api.delete(`/dashboard/charity/resources/${id}`); toast('Deleted', 'ok'); load(); }
    catch (e) { toast(e.message, 'err'); }
  };

  const shareResource = async (resource) => {
    try {
      const params = new URLSearchParams({ bucket: 'charity-docs', path: resource.fileUrl, context: 'charity-resource', refId: resource.id });
      const { signedUrl } = await api.get(`/uploads/download?${params}`);
      await navigator.clipboard.writeText(signedUrl);
      toast('Link copied — valid for 1 hour', 'ok');
    } catch (e) { toast(e.message || 'Could not create a download link', 'err'); }
  };

  const resources = data?.resources || [];

  if (loading) return <DashboardShell title="Resources"><div className="skel" style={{ height: 200, borderRadius: 'var(--rl)' }} /></DashboardShell>;

  return (
    <DashboardShell title="Resource Repository">
      <div className="alert alert-i" style={{ marginBottom: 20 }}>
        <span>📁</span>
        <div>Upload PDFs, reports, and documents for your funders. <strong>Public</strong> resources are visible on your charity profile page. <strong>Funders Only</strong> resources are shared exclusively with your supporters via the platform.</div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>{resources.length} resource{resources.length !== 1 ? 's' : ''}</div>
        <button className="btn btn-p" onClick={() => setShowAdd(true)}>+ Upload Resource</button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="card" style={{ padding: 24, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ fontFamily: 'var(--fd)', fontSize: 20 }}>Add Resource</h3>
            <button className="btn btn-g btn-sm" onClick={() => setShowAdd(false)}>Cancel</button>
          </div>
          <div className="fg"><label className="fl">Title *</label><input className="fi" value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Annual Impact Report 2025" /></div>
          <div className="fg">
            <label className="fl">File *</label>
            <Uploader
              bucket="charity-docs"
              accept="application/pdf,image/jpeg,image/png"
              maxBytes={20 * 1024 * 1024}
              kind="file"
              value={form.fileUrl ? { path: form.fileUrl } : null}
              onUploaded={({ path }) => set('fileUrl', path)}
              label="Upload the resource file"
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="fg" style={{ margin: 0 }}>
              <label className="fl">File Type</label>
              <select className="fi fsel" value={form.fileType} onChange={e => set('fileType', e.target.value)}>
                <option value="pdf">PDF</option><option value="doc">Document</option><option value="image">Image</option><option value="other">Other</option>
              </select>
            </div>
            <div className="fg" style={{ margin: 0 }}>
              <label className="fl">Visibility</label>
              <select className="fi fsel" value={form.visibility} onChange={e => set('visibility', e.target.value)}>
                <option value="PUBLIC">Public — visible on profile</option>
                <option value="FUNDERS_ONLY">Funders Only — exclusive access</option>
              </select>
            </div>
          </div>
          <button className="btn btn-p" style={{ marginTop: 14 }} onClick={addResource}>Upload Resource</button>
        </div>
      )}

      {/* Resource table */}
      {resources.length > 0 ? (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="tbl">
            <thead><tr><th>Resource</th><th>Type</th><th>Visibility</th><th>Uploaded</th><th>Actions</th></tr></thead>
            <tbody>
              {resources.map(r => (
                <tr key={r.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 18 }}>{r.fileType === 'pdf' ? '📄' : r.fileType === 'image' ? '🖼️' : '📎'}</span>
                      <span style={{ fontWeight: 500 }}>{r.title}</span>
                    </div>
                  </td>
                  <td><span className="badge b-blue" style={{ fontSize: 10 }}>{r.fileType?.toUpperCase()}</span></td>
                  <td><span className={`badge ${r.visibility === 'PUBLIC' ? 'b-green' : 'b-gold'}`} style={{ fontSize: 10 }}>{r.visibility === 'PUBLIC' ? 'Public' : 'Funders Only'}</span></td>
                  <td style={{ fontSize: 12 }}>{new Date(r.uploadedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-s btn-sm" onClick={() => shareResource(r)}>Share</button>
                      <button className="btn btn-danger btn-sm" onClick={() => deleteResource(r.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : !showAdd && (
        <div className="empty" style={{ padding: 48 }}>
          <div style={{ fontSize: 40, marginBottom: 12, opacity: .3 }}>📁</div>
          <div className="empty-t">No resources yet</div>
          <p style={{ color: 'var(--muted)', marginBottom: 16 }}>Upload impact reports, project updates, and documents for your funders</p>
          <button className="btn btn-p" onClick={() => setShowAdd(true)}>Upload First Resource</button>
        </div>
      )}
    </DashboardShell>
  );
}
