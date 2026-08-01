import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, Info } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import DashboardShell from './DashboardShell';
import Uploader from '../../components/ui/Uploader';
import Icon from '../../components/ui/Icon';
import api from '../../utils/api';

const EMPTY_HERO = { hero_media_type: 'video', hero_video_url: '', hero_poster_url: '', hero_image_url: '' };

// Only the Hero Media settings today — a focused first slice of the wider
// admin settings surface (SiteSetting already supports far more keys via
// GET/PUT /admin/settings; this page just doesn't have a section for them
// yet). Add more sections here as they're built, same PUT-per-key pattern.
export default function AdminSettings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useCart();
  const [hero, setHero] = useState(EMPTY_HERO);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (user && user.role !== 'ADMIN') navigate('/'); }, [user]);

  useEffect(() => {
    api.getAdminSettings().then(s => {
      setHero({
        hero_media_type: s.hero_media_type || 'video',
        hero_video_url: s.hero_video_url || '',
        hero_poster_url: s.hero_poster_url || '',
        hero_image_url: s.hero_image_url || '',
      });
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const set = (k, v) => setHero(p => ({ ...p, [k]: v }));

  const saveHero = async () => {
    setSaving(true);
    try {
      await Promise.all([
        api.updateAdminSetting('hero_media_type', hero.hero_media_type),
        api.updateAdminSetting('hero_video_url', hero.hero_video_url || null),
        api.updateAdminSetting('hero_poster_url', hero.hero_poster_url || null),
        api.updateAdminSetting('hero_image_url', hero.hero_image_url || null),
      ]);
      toast('Hero background updated — live on the homepage now', 'ok');
    } catch (e) { toast(e.message, 'err'); }
    finally { setSaving(false); }
  };

  if (loading) return <DashboardShell title="Settings"><div className="skel" style={{ height: 320, borderRadius: 'var(--rl)' }} /></DashboardShell>;

  return (
    <DashboardShell title="Settings">
      <div className="card" style={{ padding: 28, maxWidth: 640 }}>
        <h3 style={{ fontFamily: 'var(--fd)', fontSize: 20, marginBottom: 6 }}>Homepage Hero Background</h3>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>Choose whether the homepage hero plays a video or shows a still image. Changes go live immediately, no redeploy.</p>

        <div className="fg">
          <label className="fl">Background Type</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {['video', 'image'].map(t => (
              <button key={t} className={`btn ${hero.hero_media_type === t ? 'btn-p' : 'btn-s'}`} style={{ textTransform: 'capitalize', flex: 1, justifyContent: 'center' }}
                onClick={() => set('hero_media_type', t)}>{t}</button>
            ))}
          </div>
        </div>

        {hero.hero_media_type === 'video' ? (
          <>
            <div className="fg">
              <label className="fl">Video URL</label>
              <input className="fi" value={hero.hero_video_url} onChange={e => set('hero_video_url', e.target.value)} placeholder="https://example.com/hero.mp4" />
              <div className="alert alert-i" style={{ marginTop: 8, fontSize: 12 }}>
                <Icon icon={Info} size="inline" />
                <div>Must be a direct link to an <strong>.mp4</strong> file, not a YouTube or Vimeo page — those can't be embedded as a background video.</div>
              </div>
            </div>
            <div className="fg">
              <label className="fl">Poster Image <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(shown while the video loads, and instead of it if reduced-motion is on)</span></label>
              <Uploader
                bucket="previews" accept="image/jpeg,image/png,image/webp" maxBytes={15 * 1024 * 1024} kind="image"
                value={hero.hero_poster_url ? { path: null, publicUrl: hero.hero_poster_url } : null}
                onUploaded={({ publicUrl }) => set('hero_poster_url', publicUrl)}
                label="Upload a poster image"
              />
            </div>
          </>
        ) : (
          <div className="fg">
            <label className="fl">Hero Image</label>
            <Uploader
              bucket="previews" accept="image/jpeg,image/png,image/webp" maxBytes={15 * 1024 * 1024} kind="image"
              value={hero.hero_image_url ? { path: null, publicUrl: hero.hero_image_url } : null}
              onUploaded={({ publicUrl }) => set('hero_image_url', publicUrl)}
              label="Upload the hero background image"
            />
          </div>
        )}

        <button className="btn btn-p btn-lg" style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={saveHero} disabled={saving}>
          <Icon icon={Save} size="inline" /> {saving ? 'Saving...' : 'Save Hero Background'}
        </button>
      </div>
    </DashboardShell>
  );
}
