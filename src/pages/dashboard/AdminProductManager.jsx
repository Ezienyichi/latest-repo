import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Palette, ArrowLeft, ArrowRight, Check, Save } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { SDGs, FRAMED_CATEGORIES } from '../../data/constants';
import DashboardShell from './DashboardShell';
import Uploader from '../../components/ui/Uploader';
import Icon from '../../components/ui/Icon';
import api from '../../utils/api';

const STATUS_BADGE = { ACTIVE: 'b-green', DRAFT: 'b-gold', SOLD: 'b-muted', SUSPENDED: 'b-red' };
const EMPTY_FORM = {
  title: '', description: '', productType: 'SIMPLE', category: 'ARTWORK', editionType: 'ORIGINAL',
  basePrice: '', comparePrice: '', estimatedValue: '', sku: '', stockQuantity: '',
  medium: '', year: new Date().getFullYear(), sdgIds: [], charityId: '',
  autoCertificate: true, featured: false, tags: '',
  fileFormat: '', pages: '', previewUrl: '', fileUrl: '',
  images: [{ url: '', label: 'Front View' }],
  galleryImages: [], galleryVideo: '',
};

// Admin's own product manager — same create/edit form ArtworkManager.jsx
// uses for artists, adapted so it: (1) lists every product regardless of
// status/owner via GET /admin/products (the public /products endpoint only
// ever returns ACTIVE), (2) can actually load an existing product back into
// the form for editing (ArtworkManager tracks an editId but nothing ever
// populates the form or sets it — there's no edit entry point today), and
// (3) surfaces Estimated Value (ORIGINAL only) and an actual charity picker
// in the SDGs & Charity step (ArtworkManager's charityId field exists in
// its form state but has no matching UI control).
export default function AdminProductManager() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { toast } = useCart();
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [search, setSearch] = useState('');
  const [charities, setCharities] = useState([]);
  const [showForm, setShowForm] = useState(params.get('new') === '1');
  const [editId, setEditId] = useState(null);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => { if (user && user.role !== 'ADMIN') navigate('/'); }, [user]);
  useEffect(() => { loadProducts(); }, []);
  useEffect(() => { api.getCharities().then(setCharities).catch(() => {}); }, []);

  const loadProducts = () => {
    setLoading(true);
    const q = { limit: 50 };
    if (statusFilter) q.status = statusFilter;
    if (categoryFilter) q.category = categoryFilter;
    if (search) q.search = search;
    api.getAdminProducts(q).then(d => { setProducts(d.items || []); setTotal(d.total || 0); }).catch(() => {}).finally(() => setLoading(false));
  };

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const setEditionType = (v) => setForm(p => ({ ...p, editionType: v, ...(v !== 'ORIGINAL' && { estimatedValue: '' }) }));
  const toggleSdg = (id) => setForm(p => ({ ...p, sdgIds: p.sdgIds.includes(id) ? p.sdgIds.filter(x => x !== id) : [...p.sdgIds, id] }));

  const addImage = () => setForm(p => ({ ...p, images: [...p.images, { url: '', label: '' }] }));
  const updateImage = (i, field, val) => setForm(p => {
    const imgs = [...p.images]; imgs[i] = { ...imgs[i], [field]: val }; return { ...p, images: imgs };
  });
  const removeImage = (i) => setForm(p => ({ ...p, images: p.images.filter((_, j) => j !== i) }));

  const addGalleryImage = () => setForm(p => ({ ...p, galleryImages: [...p.galleryImages, { url: '', label: '' }] }));
  const updateGalleryImage = (i, field, val) => setForm(p => {
    const imgs = [...p.galleryImages]; imgs[i] = { ...imgs[i], [field]: val }; return { ...p, galleryImages: imgs };
  });
  const removeGalleryImage = (i) => setForm(p => ({ ...p, galleryImages: p.galleryImages.filter((_, j) => j !== i) }));

  const openCreate = () => { setForm(EMPTY_FORM); setEditId(null); setStep(1); setShowForm(true); };

  const openEdit = (p) => {
    setForm({
      title: p.title || '', description: p.description || '', productType: p.productType || 'SIMPLE',
      category: p.category || 'ARTWORK', editionType: p.editionType || 'ORIGINAL',
      basePrice: p.basePrice != null ? String(p.basePrice) : '',
      comparePrice: p.comparePrice != null ? String(p.comparePrice) : '',
      estimatedValue: p.estimatedValue != null ? String(p.estimatedValue) : '',
      sku: p.sku || '', stockQuantity: p.stockQuantity != null ? String(p.stockQuantity) : '',
      medium: p.medium || '', year: p.year || new Date().getFullYear(),
      sdgIds: p.sdgIds || [], charityId: p.charityId || '',
      autoCertificate: !!p.autoCertificate, featured: !!p.featured, tags: (p.tags || []).join(', '),
      fileFormat: p.fileFormat || '', pages: p.pages != null ? String(p.pages) : '', previewUrl: p.previewUrl || '', fileUrl: p.fileUrl || '',
      images: p.images?.length ? p.images : [{ url: '', label: 'Front View' }],
      galleryImages: p.gallery?.images || [], galleryVideo: p.gallery?.video || '',
    });
    setEditId(p.id);
    setStep(1);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.title || !form.basePrice) { toast('Title and price are required', 'err'); return; }
    try {
      const data = {
        ...form,
        basePrice: parseFloat(form.basePrice),
        comparePrice: form.comparePrice ? parseFloat(form.comparePrice) : undefined,
        estimatedValue: form.editionType === 'ORIGINAL' && form.estimatedValue ? parseFloat(form.estimatedValue) : null,
        stockQuantity: form.stockQuantity ? parseInt(form.stockQuantity) : undefined,
        year: parseInt(form.year),
        pages: form.pages ? parseInt(form.pages) : undefined,
        charityId: form.charityId || null,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        images: form.images.filter(img => img.url),
        fileUrl: form.fileUrl || undefined,
        gallery: (() => {
          const galImages = form.galleryImages.filter(img => img.url);
          if (!galImages.length && !form.galleryVideo) return undefined;
          return { ...(galImages.length && { images: galImages }), ...(form.galleryVideo && { video: form.galleryVideo }) };
        })(),
      };
      delete data.galleryImages;
      delete data.galleryVideo;
      if (editId) {
        await api.updateProduct(editId, data);
        toast('Product updated!', 'ok');
      } else {
        await api.createProduct(data);
        toast('Product created as draft!', 'ok');
      }
      setShowForm(false); setEditId(null); setStep(1);
      setForm(EMPTY_FORM);
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
    if (!confirm('Delete this product? This cannot be undone.')) return;
    try { await api.deleteProduct(id); toast('Deleted', 'ok'); loadProducts(); }
    catch (e) { toast(e.message, 'err'); }
  };

  return (
    <DashboardShell title="Products">
      {!showForm ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="fi" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search title..." style={{ width: 220 }} onKeyDown={e => e.key === 'Enter' && loadProducts()} />
              <select className="fi fsel" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ width: 140 }}>
                <option value="">All Statuses</option><option value="DRAFT">Draft</option><option value="ACTIVE">Active</option><option value="SOLD">Sold</option><option value="SUSPENDED">Suspended</option>
              </select>
              <select className="fi fsel" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} style={{ width: 140 }}>
                <option value="">All Categories</option><option value="ARTWORK">Artwork</option><option value="MUSIC">Music</option><option value="GRAPHIC">Graphic</option>
              </select>
              <button className="btn btn-s" onClick={loadProducts}>Filter</button>
            </div>
            <button className="btn btn-p" onClick={openCreate}>+ Add New Product</button>
          </div>

          {loading ? <div>{[1, 2, 3].map(i => <div key={i} className="skel" style={{ height: 60, borderRadius: 8, marginBottom: 8 }} />)}</div> : products.length === 0 ? (
            <div className="empty" style={{ padding: 48 }}>
              <div style={{ marginBottom: 12, opacity: .3, display: 'flex', justifyContent: 'center' }}><Icon icon={Palette} size={40} /></div>
              <div className="empty-t">No products found</div>
              <p style={{ color: 'var(--muted)', marginBottom: 20 }}>Try different filters, or add the first one</p>
              <button className="btn btn-p" onClick={openCreate}>Create Your First Product</button>
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <table className="tbl">
                <thead><tr><th></th><th>Title</th><th>Category</th><th>Edition</th><th>Price</th><th>Charity</th><th>Status</th><th>Orders</th><th>Actions</th></tr></thead>
                <tbody>
                  {products.map(p => (
                    <tr key={p.id}>
                      <td style={{ width: 48 }}>
                        <div className={FRAMED_CATEGORIES.includes(p.category) ? 'pf-contain' : ''} style={{ width: 40, height: 40, borderRadius: 6, overflow: 'hidden', background: 'var(--glass)' }}>
                          {p.images?.[0]?.url ? <img src={p.images[0].url.replace('w=1200', 'w=80')} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', background: '#1B4332', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: .4 }}><Icon icon={Palette} size="inline" /></div>}
                        </div>
                      </td>
                      <td style={{ fontWeight: 500 }}>{p.title}</td>
                      <td><span className="badge b-muted" style={{ fontSize: 10, textTransform: 'capitalize' }}>{p.category?.toLowerCase()}</span></td>
                      <td style={{ fontSize: 12, textTransform: 'capitalize' }}>{p.editionType?.toLowerCase()}</td>
                      <td>
                        <div style={{ fontFamily: 'var(--fd)', fontWeight: 700, color: 'var(--accent)' }}>£{Number(p.basePrice).toLocaleString()}</div>
                        {p.editionType === 'ORIGINAL' && p.estimatedValue != null && <div style={{ fontSize: 10, color: 'var(--muted)' }}>Est. £{Number(p.estimatedValue).toLocaleString()}</div>}
                      </td>
                      <td style={{ fontSize: 12 }}>{p.charity?.name || '—'}</td>
                      <td><span className={`badge ${STATUS_BADGE[p.status] || 'b-muted'}`} style={{ fontSize: 10 }}>{p.status}</span></td>
                      <td>{p._count?.orderItems || 0}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-s btn-sm" onClick={() => openEdit(p)}>Edit</button>
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
          <div style={{ marginTop: 10, fontSize: 12, color: 'var(--muted)' }}>{total} total product{total !== 1 ? 's' : ''}</div>
        </>
      ) : (
        /* ═══ MULTI-STEP CREATE/EDIT FORM ═══ */
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ fontFamily: 'var(--fd)', fontSize: 24 }}>{editId ? 'Edit Product' : 'New Product'}</h2>
            <button className="btn btn-g" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={() => { setShowForm(false); setEditId(null); setStep(1); }}><Icon icon={ArrowLeft} size="inline" /> Back to List</button>
          </div>

          {/* Stepper */}
          <div className="stepper" style={{ marginBottom: 24 }}>
            {[{ n: 1, l: 'Basic Info' }, { n: 2, l: 'Media' }, { n: 3, l: 'Pricing' }, { n: 4, l: 'SDGs & Charity' }, { n: 5, l: 'Review' }].map((s, i) => (
              <div key={s.n} className="step">
                <div className={`step-c ${step > s.n ? 'done' : step === s.n ? 'active' : 'pending'}`} onClick={() => setStep(s.n)} style={{ cursor: 'pointer' }}>{step > s.n ? <Icon icon={Check} size="inline" /> : s.n}</div>
                <span className={`step-lbl${step === s.n ? ' active' : ''}`}>{s.l}</span>
                {i < 4 && <div className="step-conn" />}
              </div>
            ))}
          </div>

          <div className="card" style={{ padding: 28 }}>
            {step === 1 && (<>
              <h3 style={{ fontFamily: 'var(--fd)', fontSize: 20, marginBottom: 16 }}>Basic Information</h3>
              <div className="fg"><label className="fl">Title *</label><input className="fi" value={form.title} onChange={e => set('title', e.target.value)} placeholder="Product title" required /></div>
              <div className="fg"><label className="fl">Description</label><textarea className="fi fta" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Describe the work..." rows={4} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="fg" style={{ margin: 0 }}><label className="fl">Product Type</label>
                  <select className="fi fsel" value={form.productType} onChange={e => set('productType', e.target.value)}>
                    <option value="SIMPLE">Simple</option><option value="VARIABLE">Variable</option><option value="DOWNLOADABLE">Downloadable</option><option value="VIRTUAL">Virtual</option>
                  </select></div>
                <div className="fg" style={{ margin: 0 }}><label className="fl">Category</label>
                  <select className="fi fsel" value={form.category} onChange={e => set('category', e.target.value)}>
                    <option value="ARTWORK">Artwork</option><option value="MUSIC">Music</option><option value="GRAPHIC">Graphic</option>
                  </select></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14 }}>
                {form.category === 'ARTWORK' ? (
                  <div className="fg" style={{ margin: 0 }}><label className="fl">Subcategory / Medium <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(drives Shop's Artwork filter)</span></label>
                    <select className="fi fsel" value={form.medium} onChange={e => set('medium', e.target.value)}>
                      <option value="">— Select —</option>
                      <option value="Abstract">Abstract</option>
                      <option value="Oil">Oil</option>
                      <option value="Acrylic">Acrylic</option>
                    </select></div>
                ) : (
                  <div className="fg" style={{ margin: 0 }}><label className="fl">Medium <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(optional)</span></label>
                    <input className="fi" value={form.medium} onChange={e => set('medium', e.target.value)} placeholder="e.g. Digital / Mixed" /></div>
                )}
                <div className="fg" style={{ margin: 0 }}><label className="fl">Year</label><input className="fi" type="number" value={form.year} onChange={e => set('year', e.target.value)} /></div>
              </div>
              <div className="fg" style={{ marginTop: 14 }}><label className="fl">Edition Type</label>
                <select className="fi fsel" value={form.editionType} onChange={e => setEditionType(e.target.value)}>
                  <option value="ORIGINAL">Original — one-of-a-kind piece</option>
                  <option value="PRINT">Print — reproduction of an original</option>
                  <option value="EDITION">Edition — numbered/limited run</option>
                </select>
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

              <div style={{ marginBottom: 16 }}>
                <div className="fl" style={{ marginBottom: 8 }}>Gallery (optional — extra detail shots shown in the product viewer)</div>
                {form.galleryImages.map((img, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
                    <div style={{ flex: 2 }}>
                      <Uploader
                        bucket="previews"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        maxBytes={15 * 1024 * 1024}
                        kind="image"
                        value={img.url ? { path: null, publicUrl: img.url } : null}
                        onUploaded={({ publicUrl }) => updateGalleryImage(i, 'url', publicUrl)}
                        label={img.label || `Gallery image ${i + 1}`}
                      />
                    </div>
                    <input className="fi" value={img.label} onChange={e => updateGalleryImage(i, 'label', e.target.value)} placeholder="Label" style={{ flex: 1 }} />
                    <button className="btn btn-danger btn-sm" onClick={() => removeGalleryImage(i)}>×</button>
                  </div>
                ))}
                <button className="btn btn-s btn-sm" onClick={addGalleryImage}>+ Add Gallery Image</button>
              </div>

              <div className="fg">
                <label className="fl">YouTube Video ID (optional)</label>
                <input className="fi" value={form.galleryVideo} onChange={e => set('galleryVideo', e.target.value)} placeholder="e.g. dQw4w9WgXcQ" />
              </div>

              {form.category !== 'ARTWORK' && (<>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="fg" style={{ margin: 0 }}><label className="fl">File Format</label><input className="fi" value={form.fileFormat} onChange={e => set('fileFormat', e.target.value)} placeholder="e.g. ePub + PDF" /></div>
                  <div className="fg" style={{ margin: 0 }}><label className="fl">Pages</label><input className="fi" type="number" value={form.pages} onChange={e => set('pages', e.target.value)} /></div>
                </div>
                <div style={{ marginTop: 14 }}>
                  <div className="fl" style={{ marginBottom: 8 }}>Downloadable File * <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(what the buyer receives after purchase — private until then)</span></div>
                  <Uploader
                    bucket="artwork"
                    accept="application/pdf,application/epub+zip,application/zip,audio/mpeg,audio/wav,audio/flac,video/mp4,video/quicktime,image/vnd.adobe.photoshop,application/postscript"
                    maxBytes={50 * 1024 * 1024}
                    kind="file"
                    value={form.fileUrl ? { path: form.fileUrl } : null}
                    onUploaded={({ path }) => set('fileUrl', path)}
                    label="Upload the downloadable file"
                  />
                </div>
              </>)}
            </>)}

            {step === 3 && (<>
              <h3 style={{ fontFamily: 'var(--fd)', fontSize: 20, marginBottom: 16 }}>Pricing & Inventory</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="fg" style={{ margin: 0 }}><label className="fl">Price (£) *</label><input className="fi" type="number" step="0.01" value={form.basePrice} onChange={e => set('basePrice', e.target.value)} placeholder="0.00" required /></div>
                <div className="fg" style={{ margin: 0 }}><label className="fl">Compare / Was Price (£)</label><input className="fi" type="number" step="0.01" value={form.comparePrice} onChange={e => set('comparePrice', e.target.value)} placeholder="Original price for sale badge" /></div>
              </div>
              {form.editionType === 'ORIGINAL' && (
                <div className="fg" style={{ marginTop: 14 }}>
                  <label className="fl">Estimated Value (£) <span style={{ fontWeight: 400, color: 'var(--muted)' }}>— appraised value shown to buyers for this one-of-a-kind piece</span></label>
                  <input className="fi" type="number" step="0.01" value={form.estimatedValue} onChange={e => set('estimatedValue', e.target.value)} placeholder="0.00" />
                </div>
              )}
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
              <div className="fg">
                <label className="fl">Charity <span style={{ fontWeight: 400, color: 'var(--muted)' }}>— which cause this product funds</span></label>
                <select className="fi fsel" value={form.charityId} onChange={e => set('charityId', e.target.value)}>
                  <option value="">— None —</option>
                  {charities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
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
                {[
                  ['Title', form.title], ['Category', form.category], ['Edition', form.editionType], ['Price', `£${form.basePrice}`],
                  ...(form.editionType === 'ORIGINAL' && form.estimatedValue ? [['Estimated Value', `£${form.estimatedValue}`]] : []),
                  ['Charity', charities.find(c => c.id === form.charityId)?.name || 'None'],
                  ['Medium', form.medium || '—'], ['SKU', form.sku || '—'], ['Stock', form.stockQuantity || '∞'],
                  ['Certificate', form.autoCertificate ? 'Auto-generated' : 'None'], ['SDGs', form.sdgIds.length ? form.sdgIds.join(', ') : 'None'],
                ].map(([k, v]) => (
                  <div key={k}><div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 2 }}>{k}</div><div style={{ fontSize: 14 }}>{v}</div></div>
                ))}
              </div>
              {form.images.filter(i => i.url).length > 0 && (
                <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                  {form.images.filter(i => i.url).map((img, i) => (
                    <div key={i} className={FRAMED_CATEGORIES.includes(form.category) ? 'pf-contain' : ''} style={{ width: 64, height: 64, borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border)' }}>
                      <img src={img.url.replace('w=1200', 'w=120')} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => e.target.style.display = 'none'} />
                    </div>
                  ))}
                </div>
              )}
              <div className="alert alert-i" style={{ marginTop: 16 }}>{editId ? 'Changes will be saved immediately.' : <>Your product will be saved as a <strong>Draft</strong>. Publish it from the products table.</>}</div>
            </>)}

            {/* Navigation buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 22 }}>
              {step > 1 ? <button className="btn btn-s" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={() => setStep(s => s - 1)}><Icon icon={ArrowLeft} size="inline" /> Previous</button> : <div />}
              {step < 5 ? <button className="btn btn-p" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={() => setStep(s => s + 1)}>Next <Icon icon={ArrowRight} size="inline" /></button>
                : <button className="btn btn-p btn-lg" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={handleSubmit}><Icon icon={Save} size="inline" /> Save Product</button>}
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
