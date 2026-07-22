import { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { SDGs } from '../../data/constants';
import DashboardShell from './DashboardShell';
import Uploader from '../../components/ui/Uploader';
import Icon from '../../components/ui/Icon';
import api from '../../utils/api';

export default function ArtistProfileEditor() {
  const { toast } = useCart();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('basic');
  const [form, setForm] = useState({});

  useEffect(() => {
    api.getArtistDashboard().then(d => {
      setProfile(d.profile);
      const p = d.profile;
      setForm({
        displayName: p.displayName || '', artistStatement: p.artistStatement || '', biography: p.biography || '',
        location: p.location || '', avatarUrl: p.avatarUrl || '', sdgIds: p.sdgIds || [],
        instagram: p.socialLinks?.instagram || '', twitter: p.socialLinks?.twitter || '', website: p.socialLinks?.website || '',
        exhibitions: p.exhibitions || [], awards: p.awards || [],
      });
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const toggleSdg = (id) => setForm(p => ({ ...p, sdgIds: p.sdgIds.includes(id) ? p.sdgIds.filter(x => x !== id) : [...p.sdgIds, id] }));

  const addExhibition = () => setForm(p => ({ ...p, exhibitions: [...p.exhibitions, { yr: new Date().getFullYear().toString(), title: '', venue: '', type: '' }] }));
  const updateExh = (i, field, val) => setForm(p => { const e = [...p.exhibitions]; e[i] = { ...e[i], [field]: val }; return { ...p, exhibitions: e }; });
  const removeExh = (i) => setForm(p => ({ ...p, exhibitions: p.exhibitions.filter((_, j) => j !== i) }));

  const addAward = () => setForm(p => ({ ...p, awards: [...p.awards, { yr: new Date().getFullYear().toString(), title: '', org: '' }] }));
  const updateAward = (i, field, val) => setForm(p => { const a = [...p.awards]; a[i] = { ...a[i], [field]: val }; return { ...p, awards: a }; });
  const removeAward = (i) => setForm(p => ({ ...p, awards: p.awards.filter((_, j) => j !== i) }));

  const save = async () => {
    setSaving(true);
    try {
      await api.patch('/dashboard/artist/profile', {
        displayName: form.displayName, artistStatement: form.artistStatement, biography: form.biography,
        location: form.location, avatarUrl: form.avatarUrl, sdgIds: form.sdgIds,
        socialLinks: { instagram: form.instagram, twitter: form.twitter, website: form.website },
        exhibitions: form.exhibitions.filter(e => e.title), awards: form.awards.filter(a => a.title),
      });
      toast('Profile updated!', 'ok');
    } catch (e) { toast(e.message, 'err'); }
    finally { setSaving(false); }
  };

  if (loading) return <DashboardShell title="Edit Profile"><div className="skel" style={{ height: 300, borderRadius: 'var(--rl)' }} /></DashboardShell>;

  return (
    <DashboardShell title="Edit Profile">
      {profile?.verified && <div className="alert alert-ok" style={{ marginBottom: 20 }}><Icon icon={Check} size="inline" /> Your artist profile is verified</div>}
      {!profile?.verified && <div className="alert alert-w" style={{ marginBottom: 20 }}>⏳ Your profile is pending verification</div>}

      <div className="tabs-container" style={{ marginBottom: 24 }}>
        {['basic', 'statement', 'exhibitions', 'awards', 'social'].map(t => (
          <button key={t} className={`tab-btn${tab === t ? ' active' : ''}`} onClick={() => setTab(t)} style={{ textTransform: 'capitalize' }}>{t}</button>
        ))}
      </div>

      <div className="card" style={{ padding: 28 }}>
        {tab === 'basic' && (<>
          <div className="fg"><label className="fl">Display Name</label><input className="fi" value={form.displayName} onChange={e => set('displayName', e.target.value)} /></div>
          <div className="fg"><label className="fl">Location</label><input className="fi" value={form.location} onChange={e => set('location', e.target.value)} placeholder="e.g. Lagos, Nigeria · London, UK" /></div>
          <div className="fg">
            <label className="fl">Avatar</label>
            <Uploader
              bucket="avatars"
              accept="image/jpeg,image/png,image/webp"
              maxBytes={5 * 1024 * 1024}
              kind="image"
              value={form.avatarUrl ? { path: null, publicUrl: form.avatarUrl } : null}
              onUploaded={({ publicUrl }) => set('avatarUrl', publicUrl)}
              label="Upload a profile photo"
            />
          </div>
          <div className="fg">
            <label className="fl">SDG Focus</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {SDGs.map(s => (
                <div key={s.id} onClick={() => toggleSdg(s.id)} className={`pill${form.sdgIds.includes(s.id) ? ' on' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', fontSize: 11 }}>
                  <span className="sdg" style={{ background: s.c, color: '#fff', width: 18, height: 18, fontSize: 8, borderRadius: 3 }}>{s.id}</span>{s.n}
                </div>
              ))}
            </div>
          </div>
        </>)}

        {tab === 'statement' && (<>
          <div className="fg"><label className="fl">Artist Statement</label><textarea className="fi fta" value={form.artistStatement} onChange={e => set('artistStatement', e.target.value)} rows={5} placeholder="Describe your practice..." /></div>
          <div className="fg"><label className="fl">Biography</label><textarea className="fi fta" value={form.biography} onChange={e => set('biography', e.target.value)} rows={6} placeholder="Your background, education, collections..." /></div>
        </>)}

        {tab === 'exhibitions' && (<>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div className="fl">Exhibitions & Shows</div>
            <button className="btn btn-s btn-sm" onClick={addExhibition}>+ Add Exhibition</button>
          </div>
          {form.exhibitions.map((e, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'flex-start' }}>
              <input className="fi" value={e.yr} onChange={ev => updateExh(i, 'yr', ev.target.value)} placeholder="Year" style={{ width: 70 }} />
              <input className="fi" value={e.title} onChange={ev => updateExh(i, 'title', ev.target.value)} placeholder="Exhibition title" style={{ flex: 1 }} />
              <input className="fi" value={e.venue} onChange={ev => updateExh(i, 'venue', ev.target.value)} placeholder="Venue" style={{ flex: 1 }} />
              <input className="fi" value={e.type} onChange={ev => updateExh(i, 'type', ev.target.value)} placeholder="Type" style={{ width: 80 }} />
              <button className="btn btn-danger btn-sm" onClick={() => removeExh(i)}>×</button>
            </div>
          ))}
          {form.exhibitions.length === 0 && <div style={{ color: 'var(--muted)', fontSize: 13 }}>No exhibitions added yet</div>}
        </>)}

        {tab === 'awards' && (<>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div className="fl">Awards & Recognition</div>
            <button className="btn btn-s btn-sm" onClick={addAward}>+ Add Award</button>
          </div>
          {form.awards.map((a, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <input className="fi" value={a.yr} onChange={ev => updateAward(i, 'yr', ev.target.value)} placeholder="Year" style={{ width: 70 }} />
              <input className="fi" value={a.title} onChange={ev => updateAward(i, 'title', ev.target.value)} placeholder="Award title" style={{ flex: 1 }} />
              <input className="fi" value={a.org} onChange={ev => updateAward(i, 'org', ev.target.value)} placeholder="Organisation" style={{ flex: 1 }} />
              <button className="btn btn-danger btn-sm" onClick={() => removeAward(i)}>×</button>
            </div>
          ))}
          {form.awards.length === 0 && <div style={{ color: 'var(--muted)', fontSize: 13 }}>No awards added yet</div>}
        </>)}

        {tab === 'social' && (<>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="fg" style={{ margin: 0 }}><label className="fl">Instagram</label><input className="fi" value={form.instagram} onChange={e => set('instagram', e.target.value)} placeholder="@username" /></div>
            <div className="fg" style={{ margin: 0 }}><label className="fl">Twitter / X</label><input className="fi" value={form.twitter} onChange={e => set('twitter', e.target.value)} placeholder="@username" /></div>
          </div>
          <div className="fg" style={{ marginTop: 14 }}><label className="fl">Website</label><input className="fi" value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://..." /></div>
        </>)}

        <button className="btn btn-p btn-lg" style={{ width: '100%', justifyContent: 'center', marginTop: 22 }} onClick={save} disabled={saving}>
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </div>
    </DashboardShell>
  );
}
