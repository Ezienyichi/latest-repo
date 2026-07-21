import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { SDGs, DIGITAL_CATS } from '../../data/constants';
import DashboardShell from './DashboardShell';
import Uploader from '../../components/ui/Uploader';
import api from '../../utils/api';

const STATUS_BADGE = { ACTIVE: 'b-green', DRAFT: 'b-gold', SOLD: 'b-muted', SUSPENDED: 'b-red' };

export default function ArtworkManager() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { toast } = useCart();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(params.get('new') === '1');
  const [editId, setEditId] = useState(null);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    title: '', description: '', productType: 'SIMPLE', category: 'ARTWORK',
    basePrice: '', comparePrice: '', sku: '', stockQuantity: '',
    medium: '', year: new Date().getFullYear(), sdgIds: [], charityId: '',
    autoCertificate: true, featured: false, tags: '',
    fileFormat: '', pages: '', previewUrl: '',
    images: [{ url: '', label: 'Front View' }],
  });

  useEffect(() => { loadProducts(); }, []);

  const loadProducts = () => {
    setLoading(true);
    api.getArtistDashboard().then(d => setProducts(d.products || [])).catch(() => {}).finally(() => setLoading(false));
  };

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const toggleSdg = (id) => setForm(p => ({ ...p, sdgIds: p.sdgIds.includes(id) ? p.sdgIds.filter(x => x !== id) : [...p.sdgIds, id] }));

  const addImage = () => setForm(p => ({ ...p, images: [...p.images, { url: '', label: '' }] }));
  const updateImage = (i, field, val) => setForm(p => {
    const imgs = [...p.images]; imgs[i] = { ...imgs[i], [field]: val }; return { ...p, images: imgs };
  });
  const removeImage = (i) => setForm(p => ({ ...p, images: p.images.filter((_, j) => j !== i) }));

  const handleSubmit = async () => {
    if (!form.title || !form.basePrice) { toast('Title and price are required', 'err'); return; }
    try {
      const data = {
        ...form,
        basePrice: parseFloat(form.basePrice),
        comparePrice: form.comparePrice ? parseFloat(form.comparePrice) : undefined,
        stockQuantity: form.stockQuantity ? parseInt(form.stockQuantity) : undefined,
        year: parseInt(form.year),
        pages: form.pages ? parseInt(form.pages) : undefined,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        images: form.images.filter(img => img.url),
      };
      if (editId) {
        await api.updateProduct(editId, data);
        toast('Artwork updated!', 'ok');
      } else {
        await api.createProduct(data);
        toast('Artwork created as draft!', 'ok');
      }
      setShowForm(false); setEditId(null); setStep(1);
      setForm({ title: '', description: '', productType: 'SIMPLE', category: 'ARTWORK', basePrice: '', comparePrice: '', sku: '', stockQuantity: '', medium: '', year: new Date().getFullYear(), sdgIds: [], charityId: '', autoCertificate: true, featured: false, tags: '', fileFormat: '', pages: '', previewUrl: '', images: [{ url: '', label: 'Front View' }] });
      loadProducts();
    } catch (e) { toast(e.message, 'err'); }
  };

  const toggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'DRAFT' : 'ACTIVE';
    try {
      await api.updateProduct(id, { status: newStatus });
      toast(`Status changed to ${newStatus}`, 'ok');
      loadProducts();
    } catch (e) { toast(e.message, 'err'); }
  };

  const deleteProduct = async (id) => {
    if (!confirm('Delete this artwork? This cannot be undone.')) return;
    try { await api.deleteProduct(id); toast('Deleted', 'ok'); loadProducts(); }
    catch (e) { toast(e.message, 'err'); }
  };

  return (
    <DashboardShell title="Artworks">
      {!showForm ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>{products.length} artwork{products.length !== 1 ? 's' : ''}</div>
            <button className="btn btn-p" onClick={() => setShowForm(true)}>+ Add New Artwork</button>
          </div>

          {loading ? <div>{[1,2,3].map(i => <div key={i} className="skel" style={{ height: 60, borderRadius: 8, marginBottom: 8 }} />)}</div> : products.length === 0 ? (
            <div className="empty" style={{ padding: 48 }}>
              <div style={{ fontSize: 40, marginBottom: 12, opacity: .3 }}>🎨</div>
              <div className="empty-t">No artworks yet</div>
              <p style={{ color: 'var(--muted)', marginBottom: 20 }}>Start listing your creative works</p>
              <button className="btn btn-p" onClick={() => setShowForm(true)}>Create Your First Artwork</button>
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <table className="tbl">
                <thead><tr><th></th><th>Title</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th>Orders</th><th>Actions</th></tr></thead>
                <tbody>
                  {products.map(p => (
                    <tr key={p.id}>
                      <td style={{ width: 48 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 6, overflow: 'hidden', background: 'var(--glass)' }}>
                          {p.images?.[0]?.url ? <img src={p.images[0].url.replace('w=1200', 'w=80')} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', background: '#1B4332', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, opacity: .4 }}>🎨</div>}
                        </div>
                      </td>
                      <td style={{ fontWeight: 500 }}>{p.title}</td>
                      <td><span className="badge b-muted" style={{ fontSize: 10, textTransform: 'capitalize' }}>{p.category?.toLowerCase()}</span></td>
                      <td style={{ fontFamily: 'var(--fd)', fontWeight: 700, color: 'var(--accent)' }}>£{Number(p.basePrice).toLocaleString()}</td>
                      <td>{p.stockQuantity != null ? p.stockQuantity : '∞'}</td>
                      <td><span className={`badge ${STATUS_BADGE[p.status] || 'b-muted'}`} style={{ fontSize: 10 }}>{p.status}</span></td>
                      <td>{p._count?.orderItems || 0}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-s btn-sm" onClick={() => toggleStatus(p.id, p.status)}>{p.status === 'ACTIVE' ? 'Unpublish' : 'Publish'}</button>
                          <button className="btn btn-danger btn-sm" onClick={() => deleteProduct(p.id)}>×</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        /* ═══ MULTI-STEP CREATE/EDIT FORM ═══ */
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ fontFamily: 'var(--fd)', fontSize: 24 }}>{editId ? 'Edit Artwork' : 'New Artwork'}</h2>
            <button className="btn btn-g" onClick={() => { setShowForm(false); setEditId(null); setStep(1); }}>← Back to List</button>
          </div>

          {/* Stepper */}
          <div className="stepper" style={{ marginBottom: 24 }}>
            {[{ n: 1, l: 'Basic Info' }, { n: 2, l: 'Media' }, { n: 3, l: 'Pricing' }, { n: 4, l: 'SDGs & Charity' }, { n: 5, l: 'Review' }].map((s, i) => (
              <div key={s.n} className="step">
                <div className={`step-c ${step > s.n ? 'done' : step === s.n ? 'active' : 'pending'}`} onClick={() => setStep(s.n)} style={{ cursor: 'pointer' }}>{step > s.n ? '✓' : s.n}</div>
                <span className={`step-lbl${step === s.n ? ' active' : ''}`}>{s.l}</span>
                {i < 4 && <div className="step-conn" />}
              </div>
            ))}
          </div>

          <div className="card" style={{ padding: 28 }}>
            {step === 1 && (<>
              <h3 style={{ fontFamily: 'var(--fd)', fontSize: 20, marginBottom: 16 }}>Basic Information</h3>
              <div className="fg"><label className="fl">Title *</label><input className="fi" value={form.title} onChange={e => set('title', e.target.value)} placeholder="Artwork title" required /></div>
              <div className="fg"><label className="fl">Description</label><textarea className="fi fta" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Describe your work..." rows={4} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="fg" style={{ margin: 0 }}><label className="fl">Product Type</label>
                  <select className="fi fsel" value={form.productType} onChange={e => set('productType', e.target.value)}>
                    <option value="SIMPLE">Simple</option><option value="VARIABLE">Variable</option><option value="DOWNLOADABLE">Downloadable</option><option value="VIRTUAL">Virtual</option>
                  </select></div>
                <div className="fg" style={{ margin: 0 }}><label className="fl">Category</label>
                  <select className="fi fsel" value={form.category} onChange={e => set('category', e.target.value)}>
                    <option value="ARTWORK">Artwork</option><option value="EBOOK">eBook</option><option value="MUSIC">Music</option><option value="GRAPHIC">Graphic</option><option value="ANIMATION">Animation</option>
                  </select></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14 }}>
                <div className="fg" style={{ margin: 0 }}><label className="fl">Medium</label><input className="fi" value={form.medium} onChange={e => set('medium', e.target.value)} placeholder="e.g. Oil on Canvas" /></div>
                <div className="fg" style={{ margin: 0 }}><label className="fl">Year</label><input className="fi" type="number" value={form.year} onChange={e => set('year', e.target.value)} /></div>
              </div>
            </>)}

            {step === 2 && (<>
              <h3 style={{ fontFamily: 'var(--fd)', fontSize: 20, marginBottom: 16 }}>Media & Images</h3>
              <div style={{ marginBottom: 16 }}>
                <div className="fl" style={{ marginBottom: 8 }}>Product Images</div>
                {form.images.map((img, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
                    <div style={{ flex: 2 }}>
                      <Uploader
                        bucket="previews"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        maxBytes={15 * 1024 * 1024}
                        kind="image"
                        value={img.url ? { path: null, publicUrl: img.url } : null}
                        onUploaded={({ publicUrl }) => updateImage(i, 'url', publicUrl)}
                        label={img.label || `Image ${i + 1}`}
                      />
                    </div>
                    <input className="fi" value={img.label} onChange={e => updateImage(i, 'label', e.target.value)} placeholder="Label" style={{ flex: 1 }} />
                    {form.images.length > 1 && <button className="btn btn-danger btn-sm" onClick={() => removeImage(i)}>×</button>}
                  </div>
                ))}
                <button className="btn btn-s btn-sm" onClick={addImage}>+ Add Image</button>
              </div>
              {form.category !== 'ARTWORK' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="fg" style={{ margin: 0 }}><label className="fl">File Format</label><input className="fi" value={form.fileFormat} onChange={e => set('fileFormat', e.target.value)} placeholder="e.g. ePub + PDF" /></div>
                  <div className="fg" style={{ margin: 0 }}><label className="fl">Pages</label><input className="fi" type="number" value={form.pages} onChange={e => set('pages', e.target.value)} /></div>
                </div>
              )}
            </>)}

            {step === 3 && (<>
              <h3 style={{ fontFamily: 'var(--fd)', fontSize: 20, marginBottom: 16 }}>Pricing & Inventory</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="fg" style={{ margin: 0 }}><label className="fl">Price (£) *</label><input className="fi" type="number" step="0.01" value={form.basePrice} onChange={e => set('basePrice', e.target.value)} placeholder="0.00" required /></div>
                <div className="fg" style={{ margin: 0 }}><label className="fl">Compare / Was Price (£)</label><input className="fi" type="number" step="0.01" value={form.comparePrice} onChange={e => set('comparePrice', e.target.value)} placeholder="Original price for sale badge" /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14 }}>
                <div className="fg" style={{ margin: 0 }}><label className="fl">SKU</label><input className="fi" value={form.sku} onChange={e => set('sku', e.target.value)} placeholder="Unique product code" /></div>
                <div className="fg" style={{ margin: 0 }}><label className="fl">Stock Quantity</label><input className="fi" type="number" value={form.stockQuantity} onChange={e => set('stockQuantity', e.target.value)} placeholder="Leave empty for unlimited" /></div>
              </div>
              <div style={{ marginTop: 14, display: 'flex', gap: 14 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                  <input type="checkbox" checked={form.autoCertificate} onChange={e => set('autoCertificate', e.target.checked)} /> Auto-generate Certificate of Authenticity
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                  <input type="checkbox" checked={form.featured} onChange={e => set('featured', e.target.checked)} /> Featured Product
                </label>
              </div>
            </>)}

            {step === 4 && (<>
              <h3 style={{ fontFamily: 'var(--fd)', fontSize: 20, marginBottom: 16 }}>SDG Goals & Charity</h3>
              <div className="fg"><label className="fl">Tags (comma separated)</label><input className="fi" value={form.tags} onChange={e => set('tags', e.target.value)} placeholder="landscape, water, Africa" /></div>
              <div style={{ marginBottom: 16 }}>
                <div className="fl" style={{ marginBottom: 8 }}>SDG Alignment</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {SDGs.map(s => (
                    <div key={s.id} onClick={() => toggleSdg(s.id)} className={`pill${form.sdgIds.includes(s.id) ? ' on' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', fontSize: 11 }}>
                      <span className="sdg" style={{ background: s.c, color: '#fff', width: 18, height: 18, fontSize: 8, borderRadius: 3 }}>{s.id}</span>{s.n}
                    </div>
                  ))}
                </div>
              </div>
            </>)}

            {step === 5 && (<>
              <h3 style={{ fontFamily: 'var(--fd)', fontSize: 20, marginBottom: 16 }}>Review & Publish</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {[['Title', form.title], ['Category', form.category], ['Type', form.productType], ['Price', `£${form.basePrice}`], ['Medium', form.medium || '—'], ['SKU', form.sku || '—'], ['Stock', form.stockQuantity || '∞'], ['Certificate', form.autoCertificate ? 'Auto-generated' : 'None'], ['SDGs', form.sdgIds.length ? form.sdgIds.join(', ') : 'None']].map(([k, v]) => (
                  <div key={k}><div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 2 }}>{k}</div><div style={{ fontSize: 14 }}>{v}</div></div>
                ))}
              </div>
              {form.images.filter(i => i.url).length > 0 && (
                <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                  {form.images.filter(i => i.url).map((img, i) => (
                    <div key={i} style={{ width: 64, height: 64, borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border)' }}>
                      <img src={img.url.replace('w=1200', 'w=120')} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => e.target.style.display = 'none'} />
                    </div>
                  ))}
                </div>
              )}
              <div className="alert alert-i" style={{ marginTop: 16 }}>Your artwork will be saved as a <strong>Draft</strong>. You can publish it from the artworks table.</div>
            </>)}

            {/* Navigation buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 22 }}>
              {step > 1 ? <button className="btn btn-s" onClick={() => setStep(s => s - 1)}>← Previous</button> : <div />}
              {step < 5 ? <button className="btn btn-p" onClick={() => setStep(s => s + 1)}>Next →</button>
                : <button className="btn btn-p btn-lg" onClick={handleSubmit}>💾 Save Artwork</button>}
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
