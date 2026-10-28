import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Palette, ArrowLeft, ArrowRight, Check, Save, Info } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { SDGs, FRAMED_CATEGORIES } from '../../data/constants';
import { CATEGORY_LABEL, BOOK_FORMAT_LABEL } from '../../utils/products';
import DashboardShell from './DashboardShell';
import Uploader from '../../components/ui/Uploader';
import Icon from '../../components/ui/Icon';
import api from '../../utils/api';
import { cur } from '../../utils/currency';

const STATUS_BADGE = { ACTIVE: 'b-green', DRAFT: 'b-gold', SOLD: 'b-muted', SUSPENDED: 'b-red' };
const ARTWORK_IMAGES = [{ url: '', label: 'Front View' }, { url: '', label: 'In Situ' }];
const BOOK_IMAGES = [{ url: '', label: 'Front cover' }, { url: '', label: 'Back cover' }];
const MUSIC_IMAGES = [{ url: '', label: 'Cover' }];
const EMPTY_FORM = {
  title: '', description: '', productType: 'SIMPLE', category: 'ARTWORK', editionType: 'ORIGINAL',
  basePrice: '', comparePrice: '', estimatedValue: '', sku: '', stockQuantity: '',
  medium: '', dimensions: '', year: new Date().getFullYear(), sdgIds: [], charityId: '', projectId: '',
  autoCertificate: true, featured: false, tags: '',
  // music + book
  creatorName: '', digitalAccessUrl: '',
  // book
  bookFormat: 'DIGITAL', digitalPrice: '', physicalPrice: '', isbn: '', publisher: '', language: '', pages: '',
  images: ARTWORK_IMAGES,
  galleryImages: [], galleryVideo: '',
};
const HTTP_URL = /^https?:\/\/\S+$/i;
const FORMAT_OPTIONS = [
  ['DIGITAL', 'Digital only', 'Read online via a link you paste'],
  ['PHYSICAL', 'Physical only', 'A printed copy that ships'],
  ['BOTH', 'Both', 'The buyer chooses; each edition has its own price'],
];

// Admin's own product manager — same create/edit form ArtworkManager.jsx
// used for artists, adapted so it: (1) lists every product regardless of
// status/owner via GET /admin/products (the public /products endpoint only
// ever returns ACTIVE), (2) can actually load an existing product back into
// the form for editing, and (3) surfaces Estimated Value (ORIGINAL only) and
// an actual charity picker in the SDGs & Charity step.
//
// The form is CATEGORY-ADAPTIVE: each category shows only the fields that
// make sense for it (the rest are not rendered, not just optional) —
//   ARTWORK  edition, estimated value, medium, dimensions, gallery, certificate…
//   MUSIC    title, artist, price, cover, listen/stream link
//   BOOK     author, ISBN/publisher/year/language/pages, digital | physical | both
//            (separate prices), read link
// MUSIC and digital BOOKS are delivered as a link (digitalAccessUrl) that the
// buyer receives after ordering; nothing is uploaded for them.
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
  const [projects, setProjects] = useState([]);
  const [showForm, setShowForm] = useState(params.get('new') === '1');
  const [editId, setEditId] = useState(null);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => { if (user && user.role !== 'ADMIN') navigate('/'); }, [user]);
  useEffect(() => { loadProducts(); }, []);
  useEffect(() => { api.getCharities().then(setCharities).catch(() => {}); }, []);
  useEffect(() => { api.getAdminProjects({ limit: 200 }).then(d => setProjects(d.items || [])).catch(() => {}); }, []);

  const loadProducts = () => {
    setLoading(true);
    const q = { limit: 50 };
    if (statusFilter) q.status = statusFilter;
    if (categoryFilter) q.category = categoryFilter;
    if (search) q.search = search;
    api.getAdminProducts(q).then(d => { setProducts(d.items || []); setTotal(d.total || 0); }).catch(() => {}).finally(() => setLoading(false));
  };

  const isArt = form.category === 'ARTWORK';
  const isMusic = form.category === 'MUSIC';
  const isBook = form.category === 'BOOK';
  const bookDigital = isBook && (form.bookFormat === 'DIGITAL' || form.bookFormat === 'BOTH');
  const bookPhysical = isBook && (form.bookFormat === 'PHYSICAL' || form.bookFormat === 'BOTH');
  const needsLink = isMusic || bookDigital;

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const setEditionType = (v) => setForm(p => ({ ...p, editionType: v, ...(v !== 'ORIGINAL' && { estimatedValue: '' }) }));
  const toggleSdg = (id) => setForm(p => ({ ...p, sdgIds: p.sdgIds.includes(id) ? p.sdgIds.filter(x => x !== id) : [...p.sdgIds, id] }));

  // Switching category swaps the media slots to that category's layout (keeping
  // anything already uploaded in the matching slot).
  const setCategory = (cat) => setForm(p => {
    const layout = cat === 'MUSIC' ? MUSIC_IMAGES : cat === 'BOOK' ? BOOK_IMAGES : ARTWORK_IMAGES;
    const images = layout.map((slot, i) => ({ url: p.images[i]?.url || '', label: p.images[i]?.label && cat === p.category ? p.images[i].label : slot.label }));
    if (cat === 'ARTWORK') images.push(...p.images.slice(images.length));
    return { ...p, category: cat, images, ...(cat !== 'ARTWORK' && { productType: 'SIMPLE' }) };
  });

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
    const cat = p.category || 'ARTWORK';
    const layout = cat === 'MUSIC' ? MUSIC_IMAGES : cat === 'BOOK' ? BOOK_IMAGES : ARTWORK_IMAGES;
    const have = p.images || [];
    // Always show every slot of the category's layout (e.g. the hover image of an artwork), even if empty.
    const images = cat === 'ARTWORK'
      ? (have.length > 1 ? have : [...(have.length ? have : [ARTWORK_IMAGES[0]]), ARTWORK_IMAGES[1]])
      : layout.map((slot, i) => ({ url: have[i]?.url || '', label: have[i]?.label || slot.label }));
    setForm({
      title: p.title || '', description: p.description || '', productType: p.productType || 'SIMPLE',
      category: cat, editionType: p.editionType || 'ORIGINAL',
      basePrice: p.basePrice != null ? String(p.basePrice) : '',
      comparePrice: p.comparePrice != null ? String(p.comparePrice) : '',
      estimatedValue: p.estimatedValue != null ? String(p.estimatedValue) : '',
      sku: p.sku || '', stockQuantity: p.stockQuantity != null ? String(p.stockQuantity) : '',
      medium: p.medium || '', dimensions: p.dimensions || '', year: p.year || new Date().getFullYear(),
      sdgIds: p.sdgIds || [], charityId: p.charityId || '', projectId: p.projectId || '',
      autoCertificate: !!p.autoCertificate, featured: !!p.featured, tags: (p.tags || []).join(', '),
      creatorName: p.creatorName || '', digitalAccessUrl: p.digitalAccessUrl || '',
      bookFormat: p.bookFormat || 'DIGITAL', digitalPrice: p.digitalPrice != null ? String(p.digitalPrice) : '', physicalPrice: p.physicalPrice != null ? String(p.physicalPrice) : '',
      isbn: p.isbn || '', publisher: p.publisher || '', language: p.language || '', pages: p.pages != null ? String(p.pages) : '',
      images,
      galleryImages: p.gallery?.images || [], galleryVideo: p.gallery?.video || '',
    });
    setEditId(p.id);
    setStep(1);
    setShowForm(true);
  };

  // Returns an error message, or null when the form is complete for its category.
  const validate = () => {
    if (!form.title.trim()) return 'Title is required';
    if (isArt) {
      if (!form.basePrice) return 'Price is required';
      // Empty slots are dropped on save, so a filled Image 2 with an empty Image 1
      // would silently become the main image.
      if (!form.images[0]?.url && form.images.some(i => i.url)) return 'Upload the main image (Image 1) first — Image 2 is the hover image';
      return null;
    }
    if (!form.creatorName.trim()) return isMusic ? 'Artist is required' : 'Author is required';
    if (!form.images[0]?.url) return isMusic ? 'Upload a cover image' : 'Upload the front cover';
    if (isMusic && !(Number(form.basePrice) > 0)) return 'Price must be greater than 0';
    if (needsLink && !HTTP_URL.test(form.digitalAccessUrl.trim())) return isMusic ? 'Paste the full listen / stream link (https://…)' : 'Paste the full read link (https://…)';
    if (bookDigital && !(Number(form.digitalPrice) > 0)) return 'Enter a digital price greater than 0';
    if (bookPhysical && !(Number(form.physicalPrice) > 0)) return 'Enter a physical price greater than 0';
    return null;
  };

  // Builds exactly the columns this category uses — nothing from another category's fields is sent.
  const buildPayload = () => {
    const common = {
      title: form.title.trim(), description: form.description, category: form.category,
      sdgIds: form.sdgIds, charityId: form.charityId || null, projectId: form.projectId || null,
      featured: form.featured, tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      images: form.images.filter(img => img.url),
    };
    if (isArt) {
      return {
        ...common, productType: form.productType, editionType: form.editionType,
        basePrice: parseFloat(form.basePrice), comparePrice: form.comparePrice ? parseFloat(form.comparePrice) : undefined,
        estimatedValue: form.editionType === 'ORIGINAL' && form.estimatedValue ? parseFloat(form.estimatedValue) : null,
        sku: form.sku || null, stockQuantity: form.stockQuantity ? parseInt(form.stockQuantity) : undefined,
        medium: form.medium || null, dimensions: form.dimensions || null, year: parseInt(form.year) || null,
        autoCertificate: form.autoCertificate,
        gallery: (() => {
          const galImages = form.galleryImages.filter(img => img.url);
          if (!galImages.length && !form.galleryVideo) return undefined;
          return { ...(galImages.length && { images: galImages }), ...(form.galleryVideo && { video: form.galleryVideo }) };
        })(),
      };
    }
    const base = {
      ...common, productType: 'SIMPLE', autoCertificate: false, creatorName: form.creatorName.trim(),
      // fields that only mean something for artworks are cleared, so a category change leaves nothing stale
      estimatedValue: null, medium: null, dimensions: null, comparePrice: null, sku: null,
    };
    if (isMusic) return { ...base, basePrice: parseFloat(form.basePrice), digitalAccessUrl: form.digitalAccessUrl.trim(), stockQuantity: null };
    return {
      ...base, bookFormat: form.bookFormat,
      digitalPrice: bookDigital ? parseFloat(form.digitalPrice) : null, physicalPrice: bookPhysical ? parseFloat(form.physicalPrice) : null,
      digitalAccessUrl: bookDigital ? form.digitalAccessUrl.trim() : null,
      // the server mirrors the cheapest edition into basePrice; sent too so a create passes the price check
      basePrice: Math.min(...[bookDigital && parseFloat(form.digitalPrice), bookPhysical && parseFloat(form.physicalPrice)].filter(Boolean)),
      isbn: form.isbn.trim() || null, publisher: form.publisher.trim() || null, language: form.language.trim() || null,
      year: parseInt(form.year) || null, pages: form.pages ? parseInt(form.pages) : null,
      stockQuantity: bookPhysical && form.stockQuantity ? parseInt(form.stockQuantity) : null,
    };
  };

  const handleSubmit = async () => {
    const problem = validate();
    if (problem) { toast(problem, 'err'); return; }
    try {
      const data = buildPayload();
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

  // One image slot (cover / front cover / back cover) for music and books.
  // (a render helper, not a component — a nested component would remount its Uploader on every render)
  const imageSlot = ({ index, label, hint, badge }) => (
    <div key={index} style={{ marginBottom: 16 }} data-image-slot={index}>
      <div className="fl" style={{ marginBottom: 4 }}>{label}</div>
      {hint && <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>{hint}</p>}
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        {badge && <span className={`badge ${index === 0 ? 'b-green' : 'b-gold'}`} style={{ fontSize: 10, minWidth: 56, textAlign: 'center', marginTop: 10 }}>{badge}</span>}
        <div style={{ flex: 1, maxWidth: 420 }}>
          <Uploader bucket="previews" accept="image/jpeg,image/png,image/webp,image/gif" maxBytes={15 * 1024 * 1024} kind="image"
            value={form.images[index]?.url ? { path: null, publicUrl: form.images[index].url } : null}
            onUploaded={({ publicUrl }) => updateImage(index, 'url', publicUrl)} label={label} />
        </div>
      </div>
    </div>
  );

  const stepLabels = ['Basic Info', 'Media', isArt ? 'Pricing' : 'Pricing & Delivery', 'SDGs & Charity', 'Review'];
  const linkHost = (() => { try { return new URL(form.digitalAccessUrl).hostname; } catch { return form.digitalAccessUrl ? 'invalid link' : '—'; } })();
  const reviewRows = [
    ['Title', form.title], ['Category', CATEGORY_LABEL[form.category]],
    ...(isArt ? [['Edition', form.editionType], ['Price', `${cur()}${form.basePrice}`],
      ...(form.editionType === 'ORIGINAL' && form.estimatedValue ? [['Estimated Value', `${cur()}${form.estimatedValue}`]] : []),
      ['Medium', form.medium || '—'], ['Dimensions', form.dimensions || '—'], ['SKU', form.sku || '—'], ['Stock', form.stockQuantity || '∞'],
      ['Certificate', form.autoCertificate ? 'Auto-generated' : 'None']] : []),
    ...(isMusic ? [['Artist', form.creatorName || '—'], ['Price', `${cur()}${form.basePrice}`], ['Listen link', linkHost]] : []),
    ...(isBook ? [['Author', form.creatorName || '—'], ['Format', BOOK_FORMAT_LABEL[form.bookFormat]],
      ...(bookDigital ? [['Digital price', `${cur()}${form.digitalPrice}`], ['Read link', linkHost]] : []),
      ...(bookPhysical ? [['Physical price', `${cur()}${form.physicalPrice}`], ['Stock', form.stockQuantity || '∞']] : []),
      ['ISBN', form.isbn || '—'], ['Publisher', form.publisher || '—'], ['Year', form.year || '—'], ['Language', form.language || '—'], ['Pages', form.pages || '—']] : []),
    ['Charity', charities.find(c => c.id === form.charityId)?.name || 'None'],
    ['SDGs', form.sdgIds.length ? form.sdgIds.join(', ') : 'None'],
  ];

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
                <option value="">All Categories</option><option value="ARTWORK">Artwork</option><option value="MUSIC">Music</option><option value="BOOK">Book</option>
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
                        <div className={`art-thumb${FRAMED_CATEGORIES.includes(p.category) ? ' pf-contain' : ''}`} style={{ '--tw': '32px' }}>
                          {p.images?.[0]?.url ? <img src={p.images[0].url.replace('w=1200', 'w=80')} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', background: '#1B4332', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: .4 }}><Icon icon={Palette} size="inline" /></div>}
                        </div>
                      </td>
                      <td style={{ fontWeight: 500 }}>{p.title}{p.creatorName && <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 400 }}>{p.creatorName}</div>}</td>
                      <td>
                        <span className="badge b-muted" style={{ fontSize: 10, textTransform: 'capitalize' }}>{p.category?.toLowerCase()}</span>
                        {p.category === 'BOOK' && p.bookFormat && <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 3 }}>{BOOK_FORMAT_LABEL[p.bookFormat]}</div>}
                      </td>
                      <td style={{ fontSize: 12, textTransform: 'capitalize' }}>{p.category === 'ARTWORK' ? p.editionType?.toLowerCase() : '—'}</td>
                      <td>
                        <div style={{ fontFamily: 'var(--fd)', fontWeight: 700, color: 'var(--accent)' }}>{p.category === 'BOOK' && p.bookFormat === 'BOTH' && <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', marginRight: 3 }}>from</span>}{cur()}{Number(p.basePrice).toLocaleString()}</div>
                        {p.category === 'ARTWORK' && p.editionType === 'ORIGINAL' && p.estimatedValue != null && <div style={{ fontSize: 10, color: 'var(--muted)' }}>Est. {cur()}{Number(p.estimatedValue).toLocaleString()}</div>}
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
            {stepLabels.map((l, i) => (
              <div key={l} className="step">
                <div className={`step-c ${step > i + 1 ? 'done' : step === i + 1 ? 'active' : 'pending'}`} onClick={() => setStep(i + 1)} style={{ cursor: 'pointer' }}>{step > i + 1 ? <Icon icon={Check} size="inline" /> : i + 1}</div>
                <span className={`step-lbl${step === i + 1 ? ' active' : ''}`}>{l}</span>
                {i < 4 && <div className="step-conn" />}
              </div>
            ))}
          </div>

          <div className="card" style={{ padding: 28 }} data-category-form={form.category}>
            {step === 1 && (<>
              <h3 style={{ fontFamily: 'var(--fd)', fontSize: 20, marginBottom: 16 }}>Basic Information</h3>
              <div className="fg"><label className="fl">Category</label>
                <select className="fi fsel" value={form.category} onChange={e => setCategory(e.target.value)} data-field="category">
                  <option value="ARTWORK">Artwork</option><option value="MUSIC">Music</option><option value="BOOK">Book</option>
                </select></div>
              <div className="fg"><label className="fl">Title *</label><input className="fi" value={form.title} onChange={e => set('title', e.target.value)} placeholder={isMusic ? 'Album / track title' : isBook ? 'Book title' : 'Product title'} required /></div>

              {isMusic && (
                <div className="fg"><label className="fl">Artist *</label><input className="fi" value={form.creatorName} onChange={e => set('creatorName', e.target.value)} placeholder="Name shown as the artist" data-field="creatorName" /></div>
              )}

              {isBook && (<>
                <div className="fg"><label className="fl">Author *</label><input className="fi" value={form.creatorName} onChange={e => set('creatorName', e.target.value)} placeholder="Name shown as the author" data-field="creatorName" /></div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14 }}>
                  <div className="fg" style={{ margin: 0 }}><label className="fl">Publisher</label><input className="fi" value={form.publisher} onChange={e => set('publisher', e.target.value)} data-field="publisher" /></div>
                  <div className="fg" style={{ margin: 0 }}><label className="fl">Publication Year</label><input className="fi" type="number" value={form.year} onChange={e => set('year', e.target.value)} data-field="year" /></div>
                  <div className="fg" style={{ margin: 0 }}><label className="fl">ISBN</label><input className="fi" value={form.isbn} onChange={e => set('isbn', e.target.value)} placeholder="978-…" data-field="isbn" /></div>
                  <div className="fg" style={{ margin: 0 }}><label className="fl">Language</label><input className="fi" value={form.language} onChange={e => set('language', e.target.value)} placeholder="e.g. English" data-field="language" /></div>
                  <div className="fg" style={{ margin: 0 }}><label className="fl">Pages</label><input className="fi" type="number" value={form.pages} onChange={e => set('pages', e.target.value)} data-field="pages" /></div>
                </div>
              </>)}

              <div className="fg" style={{ marginTop: isArt ? 0 : 14 }}><label className="fl">{isBook ? 'Description / blurb' : 'Description'}</label><textarea className="fi fta" value={form.description} onChange={e => set('description', e.target.value)} placeholder={isBook ? 'What is the book about?' : isMusic ? 'Tell listeners about this release…' : 'Describe the work...'} rows={4} /></div>

              {isArt && (<>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="fg" style={{ margin: 0 }}><label className="fl">Product Type</label>
                    <select className="fi fsel" value={form.productType} onChange={e => set('productType', e.target.value)}>
                      <option value="SIMPLE">Simple</option><option value="VARIABLE">Variable</option><option value="DOWNLOADABLE">Downloadable</option><option value="VIRTUAL">Virtual</option>
                    </select></div>
                  <div className="fg" style={{ margin: 0 }}><label className="fl">Subcategory / Medium <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(drives Shop's Artwork filter)</span></label>
                    <select className="fi fsel" value={form.medium} onChange={e => set('medium', e.target.value)} data-field="medium">
                      <option value="">— Select —</option>
                      <option value="Abstract">Abstract</option>
                      <option value="Oil">Oil</option>
                      <option value="Acrylic">Acrylic</option>
                    </select></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14 }}>
                  <div className="fg" style={{ margin: 0 }}><label className="fl">Year</label><input className="fi" type="number" value={form.year} onChange={e => set('year', e.target.value)} data-field="year" /></div>
                  <div className="fg" style={{ margin: 0 }}><label className="fl">Dimensions</label><input className="fi" value={form.dimensions} onChange={e => set('dimensions', e.target.value)} placeholder="e.g. 60 × 80 cm" data-field="dimensions" /></div>
                </div>
                <div className="fg" style={{ marginTop: 14 }}><label className="fl">Edition Type</label>
                  <select className="fi fsel" value={form.editionType} onChange={e => setEditionType(e.target.value)} data-field="editionType">
                    <option value="ORIGINAL">Original — one-of-a-kind piece</option>
                    <option value="PRINT">Print — reproduction of an original</option>
                    <option value="EDITION">Edition — numbered/limited run</option>
                  </select>
                </div>
              </>)}
            </>)}

            {step === 2 && (<>
              <h3 style={{ fontFamily: 'var(--fd)', fontSize: 20, marginBottom: 16 }}>{isArt ? 'Media & Images' : 'Cover Image'}</h3>

              {isMusic && imageSlot({ index: 0, label: 'Cover image *', hint: 'Shown on the product page and in listings. A square or portrait image works best.' })}
              {isBook && (<>
                {imageSlot({ index: 0, label: 'Front cover *', badge: 'MAIN', hint: 'The whole cover is shown, never cropped.' })}
                {imageSlot({ index: 1, label: 'Back cover (optional)', badge: 'HOVER', hint: 'Appears when a shopper hovers the product card.' })}
              </>)}

              {isArt && (<>
                <div style={{ marginBottom: 16 }}>
                  <div className="fl" style={{ marginBottom: 4 }}>Product Images</div>
                  <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>Image 1 is the main image. <strong>Image 2 appears when a shopper hovers the product card</strong> — an in-situ “shown in a room” shot works well.</p>
                  {form.images.map((img, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
                      <span className={`badge ${i === 0 ? 'b-green' : i === 1 ? 'b-gold' : 'b-muted'}`} style={{ fontSize: 10, minWidth: 56, textAlign: 'center', marginTop: 10 }}>{i === 0 ? 'MAIN' : i === 1 ? 'HOVER' : `EXTRA ${i - 1}`}</span>
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
              </>)}
            </>)}

            {step === 3 && (<>
              <h3 style={{ fontFamily: 'var(--fd)', fontSize: 20, marginBottom: 16 }}>{isArt ? 'Pricing & Inventory' : 'Pricing & Delivery'}</h3>

              {isArt && (<>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="fg" style={{ margin: 0 }}><label className="fl">Price ({cur()}) *</label><input className="fi" type="number" step="0.01" value={form.basePrice} onChange={e => set('basePrice', e.target.value)} placeholder="0.00" required data-field="basePrice" /></div>
                  <div className="fg" style={{ margin: 0 }}><label className="fl">Compare / Was Price ({cur()})</label><input className="fi" type="number" step="0.01" value={form.comparePrice} onChange={e => set('comparePrice', e.target.value)} placeholder="Original price for sale badge" /></div>
                </div>
                {form.editionType === 'ORIGINAL' && (
                  <div className="fg" style={{ marginTop: 14 }}>
                    <label className="fl">Estimated Value ({cur()}) <span style={{ fontWeight: 400, color: 'var(--muted)' }}>— appraised value shown to buyers for this one-of-a-kind piece</span></label>
                    <input className="fi" type="number" step="0.01" value={form.estimatedValue} onChange={e => set('estimatedValue', e.target.value)} placeholder="0.00" data-field="estimatedValue" />
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14 }}>
                  <div className="fg" style={{ margin: 0 }}><label className="fl">SKU</label><input className="fi" value={form.sku} onChange={e => set('sku', e.target.value)} placeholder="Unique product code" data-field="sku" /></div>
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

              {isMusic && (<>
                <div className="fg"><label className="fl">Price ({cur()}) *</label><input className="fi" type="number" step="0.01" min="0" value={form.basePrice} onChange={e => set('basePrice', e.target.value)} placeholder="0.00" style={{ maxWidth: 220 }} data-field="basePrice" /></div>
                <div className="fg"><label className="fl">Listen / stream link *</label>
                  <input className="fi" type="url" value={form.digitalAccessUrl} onChange={e => set('digitalAccessUrl', e.target.value)} placeholder="https://… (Spotify, Bandcamp, YouTube, SoundCloud, a private page…)" data-field="digitalAccessUrl" /></div>
              </>)}

              {isBook && (<>
                <div className="fg">
                  <label className="fl">Format availability *</label>
                  <div role="radiogroup" aria-label="Format availability" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 10 }}>
                    {FORMAT_OPTIONS.map(([v, label, sub]) => (
                      <button key={v} type="button" role="radio" aria-checked={form.bookFormat === v} data-format={v}
                        className={`format-opt${form.bookFormat === v ? ' on' : ''}`} onClick={() => set('bookFormat', v)}>
                        <span className="format-opt-label">{form.bookFormat === v && <Icon icon={Check} size="inline" />} {label}</span>
                        <span className="format-opt-sub">{sub}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14 }}>
                  {bookDigital && <div className="fg" style={{ margin: 0 }}><label className="fl">Digital price ({cur()}) *</label><input className="fi" type="number" step="0.01" min="0" value={form.digitalPrice} onChange={e => set('digitalPrice', e.target.value)} placeholder="0.00" data-field="digitalPrice" /></div>}
                  {bookPhysical && <div className="fg" style={{ margin: 0 }}><label className="fl">Physical price ({cur()}) *</label><input className="fi" type="number" step="0.01" min="0" value={form.physicalPrice} onChange={e => set('physicalPrice', e.target.value)} placeholder="0.00" data-field="physicalPrice" /></div>}
                  {bookPhysical && <div className="fg" style={{ margin: 0 }}><label className="fl">Printed copies in stock</label><input className="fi" type="number" min="0" value={form.stockQuantity} onChange={e => set('stockQuantity', e.target.value)} placeholder="Leave empty for unlimited" data-field="stockQuantity" /></div>}
                </div>
                {bookDigital && (
                  <div className="fg" style={{ marginTop: 14 }}><label className="fl">Read link *</label>
                    <input className="fi" type="url" value={form.digitalAccessUrl} onChange={e => set('digitalAccessUrl', e.target.value)} placeholder="https://… (where the buyer reads the book online)" data-field="digitalAccessUrl" /></div>
                )}
              </>)}

              {!isArt && (<>
                {needsLink && (
                  <div className="alert alert-i" style={{ fontSize: 13, marginBottom: 14 }}>
                    <Icon icon={Info} size="inline" />
                    <div>This link is <strong>never shown on the site</strong>. The buyer receives it on their order confirmation and in My Orders once they order{isBook ? ' the digital edition' : ''}.</div>
                  </div>
                )}
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                  <input type="checkbox" checked={form.featured} onChange={e => set('featured', e.target.checked)} /> Featured Product
                </label>
              </>)}
            </>)}

            {step === 4 && (<>
              <h3 style={{ fontFamily: 'var(--fd)', fontSize: 20, marginBottom: 16 }}>SDG Goals & Charity</h3>
              <div className="fg"><label className="fl">Tags (comma separated)</label><input className="fi" value={form.tags} onChange={e => set('tags', e.target.value)} placeholder={isMusic ? 'afrobeat, ambient, live' : isBook ? 'poetry, memoir, children' : 'landscape, water, Africa'} /></div>
              <div className="fg">
                <label className="fl">Charity <span style={{ fontWeight: 400, color: 'var(--muted)' }}>— which cause this product funds</span></label>
                <select className="fi fsel" value={form.charityId} onChange={e => set('charityId', e.target.value)}>
                  <option value="">— None —</option>
                  {charities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="fg">
                <label className="fl">Campaign <span style={{ fontWeight: 400, color: 'var(--muted)' }}>— the fundraising campaign this product supports</span></label>
                <select className="fi fsel" value={form.projectId} onChange={e => set('projectId', e.target.value)}>
                  <option value="">— None —</option>
                  {projects.map(pr => <option key={pr.id} value={pr.id}>{pr.title} · {pr.charity?.name}{pr.status !== 'ACTIVE' ? ` (${pr.status})` : ''}</option>)}
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
                {reviewRows.map(([k, v]) => (
                  <div key={k}><div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 2 }}>{k}</div><div style={{ fontSize: 14 }}>{v}</div></div>
                ))}
              </div>
              {form.images.filter(i => i.url).length > 0 && (
                <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                  {form.images.filter(i => i.url).map((img, i) => (
                    <div key={i} className={`art-thumb${FRAMED_CATEGORIES.includes(form.category) ? ' pf-contain' : ''}`} style={{ '--tw': '56px', border: '1px solid var(--border)' }}>
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
