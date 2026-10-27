import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brush, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import DashboardShell from './DashboardShell';
import Uploader from '../../components/ui/Uploader';
import ArtistAvatar, { ARTIST_BANNER_PLACEHOLDER } from '../../components/ui/ArtistAvatar';
import Icon from '../../components/ui/Icon';
import api from '../../utils/api';

export default function AdminArtists() {
  const { user } = useAuth();
  const { toast } = useCart();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);   // artist row being edited
  const [form, setForm] = useState({ avatarUrl: '', bannerUrl: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (user && user.role !== 'ADMIN') navigate('/'); }, [user]);

  const load = (p = 1) => {
    setLoading(true);
    const q = { page: p, limit: 20 };
    if (search.trim()) q.search = search.trim();
    api.getAdminArtists(q).then(d => { setItems(d.items || []); setTotal(d.total || 0); setPages(d.pages || 1); setPage(d.page || 1); })
      .catch(e => toast(e.message || 'Failed to load artists', 'err')).finally(() => setLoading(false));
  };
  useEffect(() => { load(1); }, []);

  const open = (a) => { setEditing(a); setForm({ avatarUrl: a.avatarUrl || '', bannerUrl: a.bannerUrl || '' }); };
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      const updated = await api.updateArtistImages(editing.id, { avatarUrl: form.avatarUrl.trim(), bannerUrl: form.bannerUrl.trim() });
      setItems(list => list.map(a => a.id === updated.id ? { ...a, avatarUrl: updated.avatarUrl, bannerUrl: updated.bannerUrl } : a));
      toast('Artist images saved', 'ok');
      setEditing(null);
    } catch (e) { toast(e.message || 'Save failed', 'err'); }
    finally { setSaving(false); }
  };

  const previewArtist = editing ? { displayName: editing.displayName, avatarUrl: form.avatarUrl.trim() || null } : null;

  return (
    <DashboardShell title="Artists">
      <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
        <input className="fi" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search artists..." style={{ width: 240 }} onKeyDown={e => e.key === 'Enter' && load(1)} />
        <button className="btn btn-s" onClick={() => load(1)}>Search</button>
      </div>

      {loading ? <div>{[1, 2, 3].map(i => <div key={i} className="skel" style={{ height: 56, borderRadius: 8, marginBottom: 8 }} />)}</div> : items.length === 0 ? (
        <div className="empty" style={{ padding: 48 }}>
          <div style={{ marginBottom: 12, opacity: .3, display: 'flex', justifyContent: 'center' }}><Icon icon={Brush} size={40} /></div>
          <div className="empty-t">No artists found</div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'auto' }}>
          <table className="tbl">
            <thead><tr><th>Artist</th><th>Banner</th><th>Works</th><th></th></tr></thead>
            <tbody>
              {items.map(a => (
                <tr key={a.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <ArtistAvatar artist={a} size={36} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>{a.displayName}{a.verified && <span className="badge b-green" style={{ fontSize: 9, display: 'inline-flex', gap: 3, alignItems: 'center' }}><Icon icon={Check} size="inline" /> Verified</span>}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{a.user?.email}</div>
                      </div>
                    </div>
                  </td>
                  <td><div style={{ width: 96, height: 24, borderRadius: 4, overflow: 'hidden', background: 'var(--glass)' }}><img src={a.bannerUrl || ARTIST_BANNER_PLACEHOLDER} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div></td>
                  <td style={{ fontSize: 12 }}>{a._count?.products ?? 0}</td>
                  <td style={{ textAlign: 'right' }}><button className="btn btn-s btn-sm" onClick={() => open(a)}>Edit images</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>{total} artist{total !== 1 ? 's' : ''}</div>
        {pages > 1 && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="btn btn-s btn-sm" disabled={page <= 1} onClick={() => load(page - 1)}>Previous</button>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>Page {page} of {pages}</span>
            <button className="btn btn-s btn-sm" disabled={page >= pages} onClick={() => load(page + 1)}>Next</button>
          </div>
        )}
      </div>

      {editing && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setEditing(null)}>
          <div className="modal" style={{ maxWidth: 640, padding: 24, position: 'relative' }}>
            <button className="mclose" onClick={() => setEditing(null)} aria-label="Close" style={{ position: 'absolute', top: 16, right: 16 }}>×</button>
            <h3 style={{ fontFamily: 'var(--fd)', fontSize: 22, marginBottom: 16 }}>{editing.displayName} — images</h3>

            {/* Live preview, as it appears on the public page */}
            <div style={{ position: 'relative', height: 140, borderRadius: 10, overflow: 'hidden', marginBottom: 56, background: 'var(--glass)' }}>
              <img src={form.bannerUrl.trim() || ARTIST_BANNER_PLACEHOLDER} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <ArtistAvatar artist={previewArtist} size={84} style={{ position: 'absolute', left: 20, bottom: -42, border: '3px solid var(--panel)' }} />
            </div>

            <div className="fg">
              <label className="fl">Profile Picture <span style={{ fontWeight: 400, color: 'var(--muted)' }}>— shown small and circular; square images work best</span></label>
              <input className="fi" value={form.avatarUrl} onChange={e => set('avatarUrl', e.target.value)} placeholder="https://… (or upload below)" style={{ marginBottom: 8 }} />
              <Uploader bucket="avatars" accept="image/jpeg,image/png,image/webp" maxBytes={5 * 1024 * 1024} kind="image"
                value={form.avatarUrl ? { path: null, publicUrl: form.avatarUrl } : null}
                onUploaded={({ publicUrl }) => set('avatarUrl', publicUrl)} label="Upload a profile picture" />
            </div>
            <div className="fg">
              <label className="fl">Banner <span style={{ fontWeight: 400, color: 'var(--muted)' }}>— wide image, about 1600×400</span></label>
              <input className="fi" value={form.bannerUrl} onChange={e => set('bannerUrl', e.target.value)} placeholder="https://… (or upload below)" style={{ marginBottom: 8 }} />
              <Uploader bucket="previews" accept="image/jpeg,image/png,image/webp" maxBytes={15 * 1024 * 1024} kind="image"
                value={form.bannerUrl ? { path: null, publicUrl: form.bannerUrl } : null}
                onUploaded={({ publicUrl }) => set('bannerUrl', publicUrl)} label="Upload a banner" />
            </div>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>Leave a field empty to show the built-in placeholder (initials / abstract banner).</p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn btn-g" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn btn-p" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
