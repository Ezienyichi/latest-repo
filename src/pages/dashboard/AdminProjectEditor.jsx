import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Trash2, Link2, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { SDGs } from '../../data/constants';
import DashboardShell from './DashboardShell';
import Uploader from '../../components/ui/Uploader';
import Icon from '../../components/ui/Icon';
import api from '../../utils/api';
import { cur } from '../../utils/currency';

const EMPTY = { title: '', charityId: '', story: '', headerImage: '', campaignVideo: '', targetAmount: '', status: 'DRAFT', sdgIds: [], startDate: '', endDate: '' };
const toDateInput = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');
const money = (n) => `${cur()}${Number(n || 0).toLocaleString('en-GB', { maximumFractionDigits: 2 })}`;

export default function AdminProjectEditor() {
  const { id } = useParams();
  const isNew = !id;
  const { user } = useAuth();
  const { toast } = useCart();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [project, setProject] = useState(null);
  const [charities, setCharities] = useState([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  // Artwork linking
  const [productQuery, setProductQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);

  useEffect(() => { if (user && user.role !== 'ADMIN') navigate('/'); }, [user]);
  useEffect(() => { api.getCharities().then(setCharities).catch(() => {}); }, []);

  const fill = (p) => setForm({
    title: p.title || '', charityId: p.charityId || '', story: p.story || '',
    headerImage: p.headerImage || '', campaignVideo: p.campaignVideo || '',
    targetAmount: p.targetAmount != null ? String(Number(p.targetAmount)) : '', status: p.status || 'DRAFT',
    sdgIds: p.sdgIds || [], startDate: toDateInput(p.startDate), endDate: toDateInput(p.endDate),
  });

  const load = () => api.getAdminProject(id).then(p => { setProject(p); fill(p); })
    .catch(e => { toast(e.message || 'Failed to load campaign', 'err'); navigate('/dashboard/admin/projects'); })
    .finally(() => setLoading(false));
  useEffect(() => { if (!isNew) load(); }, [id]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const toggleSdg = (n) => setForm(p => ({ ...p, sdgIds: p.sdgIds.includes(n) ? p.sdgIds.filter(x => x !== n) : [...p.sdgIds, n] }));

  const save = async () => {
    if (!form.title.trim()) return toast('Title is required', 'err');
    if (!form.charityId) return toast('Choose a charity', 'err');
    if (!form.story.trim()) return toast('Story is required', 'err');
    if (!(Number(form.targetAmount) > 0)) return toast('Target amount must be greater than 0', 'err');
    if (form.startDate && form.endDate && form.endDate < form.startDate) return toast('End date must be after the start date', 'err');
    const body = {
      title: form.title, charityId: form.charityId, story: form.story,
      headerImage: form.headerImage.trim() || null, campaignVideo: form.campaignVideo.trim() || null,
      targetAmount: Number(form.targetAmount), status: form.status, sdgIds: form.sdgIds,
      startDate: form.startDate || null, endDate: form.endDate || null,
    };
    setSaving(true);
    try {
      if (isNew) {
        const created = await api.createAdminProject(body);
        toast('Campaign created', 'ok');
        navigate(`/dashboard/admin/projects/${created.id}`, { replace: true });
      } else {
        await api.updateAdminProject(id, body);
        toast('Campaign saved', 'ok');
        await load();
      }
    } catch (e) { toast(e.message || 'Save failed', 'err'); }
    finally { setSaving(false); }
  };

  const remove = async () => {
    const n = project?.products?.length || 0;
    if (!window.confirm(`Delete "${project.title}"?${n ? ` Its ${n} linked artwork${n > 1 ? 's' : ''} will be unlinked, not deleted.` : ''}`)) return;
    try { await api.deleteAdminProject(id); toast('Campaign deleted', 'ok'); navigate('/dashboard/admin/projects'); }
    catch (e) { toast(e.message || 'Delete failed', 'err'); }
  };

  const searchProducts = () => {
    api.getAdminProducts({ search: productQuery.trim(), limit: 20 }).then(d => { setResults(d.items || []); setSearched(true); })
      .catch(e => toast(e.message || 'Search failed', 'err'));
  };
  const linkedIds = new Set((project?.products || []).map(p => p.id));
  const link = async (productId) => {
    try { await api.linkProjectProduct(id, productId); toast('Artwork linked', 'ok'); setResults(r => r.map(x => x.id === productId ? { ...x, projectId: id } : x)); await load(); }
    catch (e) { toast(e.message || 'Link failed', 'err'); }
  };
  const unlink = async (productId) => {
    try { await api.unlinkProjectProduct(id, productId); toast('Artwork unlinked', 'ok'); setResults(r => r.map(x => x.id === productId ? { ...x, projectId: null } : x)); await load(); }
    catch (e) { toast(e.message || 'Unlink failed', 'err'); }
  };

  if (loading) return <DashboardShell title="Campaign"><div className="skel" style={{ height: 300, borderRadius: 12 }} /></DashboardShell>;

  return (
    <DashboardShell title={isNew ? 'New Campaign' : 'Edit Campaign'}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <button className="btn btn-g" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={() => navigate('/dashboard/admin/projects')}><Icon icon={ArrowLeft} size="inline" /> Back to Campaigns</button>
        <div style={{ display: 'flex', gap: 8 }}>
          {!isNew && <button className="btn btn-s" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#dc2626' }} onClick={remove}><Icon icon={Trash2} size="inline" /> Delete</button>}
          <button className="btn btn-p" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={save} disabled={saving}><Icon icon={Save} size="inline" /> {saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>

      {!isNew && project && (
        <div className="card" style={{ marginBottom: 18, display: 'flex', gap: 32, flexWrap: 'wrap' }}>
          <div><div className="lbl">Raised</div><div style={{ fontFamily: 'var(--fd)', fontSize: 26, fontWeight: 700, color: 'var(--accent)' }}>{money(project.raisedAmount)}</div></div>
          <div><div className="lbl">Target</div><div style={{ fontFamily: 'var(--fd)', fontSize: 26, fontWeight: 700 }}>{money(project.targetAmount)}</div></div>
          <div><div className="lbl">Charity total (all campaigns)</div><div style={{ fontFamily: 'var(--fd)', fontSize: 26, fontWeight: 700 }}>{money(project.charityRaised)}</div></div>
          <div style={{ fontSize: 12, color: 'var(--muted)', alignSelf: 'center', maxWidth: 300 }}>Raised is recorded by the donation flow and can’t be edited here.</div>
        </div>
      )}

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="fg"><label className="fl">Title *</label><input className="fi" value={form.title} onChange={e => set('title', e.target.value)} maxLength={140} /></div>
        <div className="fg">
          <label className="fl">Charity *</label>
          <select className="fi fsel" value={form.charityId} onChange={e => set('charityId', e.target.value)}>
            <option value="">— Choose a charity —</option>
            {charities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="fg"><label className="fl">Story *</label><textarea className="fi" rows={8} value={form.story} onChange={e => set('story', e.target.value)} placeholder="What is this campaign, who does it help, and what will the money do?" /></div>

        <div className="fg">
          <label className="fl">Header Image</label>
          <input className="fi" value={form.headerImage} onChange={e => set('headerImage', e.target.value)} placeholder="https://… (or upload below)" style={{ marginBottom: 8 }} />
          <Uploader bucket="previews" accept="image/jpeg,image/png,image/webp" maxBytes={15 * 1024 * 1024} kind="image"
            value={form.headerImage ? { path: null, publicUrl: form.headerImage } : null}
            onUploaded={({ publicUrl }) => set('headerImage', publicUrl)} label="Upload a header image" />
        </div>
        <div className="fg">
          <label className="fl">Campaign Video <span style={{ fontWeight: 400, color: 'var(--muted)' }}>— direct link to a video file (optional)</span></label>
          <input className="fi" value={form.campaignVideo} onChange={e => set('campaignVideo', e.target.value)} placeholder="https://example.com/campaign.mp4" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
          <div className="fg"><label className="fl">Target Amount ({cur()}) *</label><input className="fi" type="number" min="1" step="0.01" value={form.targetAmount} onChange={e => set('targetAmount', e.target.value)} /></div>
          <div className="fg">
            <label className="fl">Status</label>
            <select className="fi fsel" value={form.status} onChange={e => set('status', e.target.value)}>
              {['DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="fg"><label className="fl">Start Date</label><input className="fi" type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} /></div>
          <div className="fg"><label className="fl">End Date</label><input className="fi" type="date" value={form.endDate} onChange={e => set('endDate', e.target.value)} /></div>
        </div>

        <div>
          <div className="fl" style={{ marginBottom: 8 }}>SDG Alignment</div>
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
        <div className="alert alert-i" style={{ fontSize: 13 }}>Save the campaign first, then you can link artworks to it.</div>
      ) : (
        <div className="card">
          <h3 style={{ fontFamily: 'var(--fd)', fontSize: 20, marginBottom: 14 }}>Linked Artworks ({project?.products?.length || 0})</h3>
          {project?.products?.length ? (
            <table className="tbl" style={{ marginBottom: 20 }}>
              <thead><tr><th></th><th>Artwork</th><th>Artist</th><th>Status</th><th>Price</th><th></th></tr></thead>
              <tbody>
                {project.products.map(p => (
                  <tr key={p.id}>
                    <td style={{ width: 44 }}><div style={{ width: 36, height: 36, borderRadius: 6, overflow: 'hidden', background: 'var(--glass)' }}>{p.images?.[0]?.url && <img src={p.images[0].url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}</div></td>
                    <td style={{ fontSize: 13 }}>{p.title}</td>
                    <td style={{ fontSize: 12 }}>{p.artist?.displayName}</td>
                    <td><span className="badge b-muted" style={{ fontSize: 10 }}>{p.status}</span></td>
                    <td style={{ fontSize: 12 }}>{money(p.basePrice)}</td>
                    <td><button className="btn btn-s btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }} onClick={() => unlink(p.id)}><Icon icon={X} size="inline" /> Unlink</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 20 }}>No artworks linked yet.</p>}

          <div className="fl" style={{ marginBottom: 6 }}>Add artworks</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <input className="fi" value={productQuery} onChange={e => setProductQuery(e.target.value)} placeholder="Search artworks by title…" onKeyDown={e => e.key === 'Enter' && searchProducts()} style={{ maxWidth: 320 }} />
            <button className="btn btn-s" onClick={searchProducts}>Search</button>
          </div>
          {searched && (results.length === 0 ? <p style={{ color: 'var(--muted)', fontSize: 13 }}>No artworks match.</p> : (
            <table className="tbl">
              <tbody>
                {results.map(p => {
                  const here = linkedIds.has(p.id);
                  const elsewhere = !here && p.projectId;
                  return (
                    <tr key={p.id}>
                      <td style={{ fontSize: 13 }}>{p.title}{elsewhere && <span style={{ color: 'var(--muted)', fontSize: 11 }}> · in another campaign</span>}</td>
                      <td style={{ fontSize: 12 }}>{p.artist?.displayName}</td>
                      <td style={{ textAlign: 'right' }}>
                        {here ? <span style={{ fontSize: 12, color: 'var(--muted)' }}>Linked</span>
                          : <button className="btn btn-s btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }} onClick={() => link(p.id)}><Icon icon={Link2} size="inline" /> {elsewhere ? 'Move here' : 'Link'}</button>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
