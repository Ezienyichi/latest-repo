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
const VIDEO_URL_RE = /^https?:\/\/.+\.(mp4|webm|ogg)(\?.*)?$/i;
const IMAGE_URL_RE = /^https?:\/\/.+\.(jpe?g|png|webp|gif|svg)(\?.*)?$/i;
const SUPABASE_PUBLIC_URL_RE = /^https?:\/\/.+\/storage\/v1\/object\/public\//i;
const isValidImageUrl = (url) => !!url && (IMAGE_URL_RE.test(url) || SUPABASE_PUBLIC_URL_RE.test(url));

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
  const [videoPreviewError, setVideoPreviewError] = useState(false);
  const [imagePreviewError, setImagePreviewError] = useState(false);
  const [theoryBg, setTheoryBg] = useState('');
  const [theoryBgPreviewError, setTheoryBgPreviewError] = useState(false);
  const [savingTheoryBg, setSavingTheoryBg] = useState(false);

  useEffect(() => { if (user && user.role !== 'ADMIN') navigate('/'); }, [user]);

  useEffect(() => {
    api.getAdminSettings().then(s => {
      setHero({
        hero_media_type: s.hero_media_type || 'video',
        hero_video_url: s.hero_video_url || '',
        hero_poster_url: s.hero_poster_url || '',
        hero_image_url: s.hero_image_url || '',
      });
      setTheoryBg(s.theory_bg_image || '');
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

  const saveTheoryBg = async () => {
    setSavingTheoryBg(true);
    try {
      await api.updateAdminSetting('theory_bg_image', theoryBg || null);
      toast('Theory of Change background updated — live on the homepage now', 'ok');
    } catch (e) { toast(e.message, 'err'); }
    finally { setSavingTheoryBg(false); }
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
              <input className="fi" value={hero.hero_video_url} onChange={e => { set('hero_video_url', e.target.value); setVideoPreviewError(false); }} placeholder="https://example.com/hero.mp4" />
              <div className="alert alert-i" style={{ marginTop: 8, fontSize: 12 }}>
                <Icon icon={Info} size="inline" />
                <div>Must be a direct link to an <strong>.mp4</strong> file, not a YouTube or Vimeo page — those can't be embedded as a background video.</div>
              </div>
            </div>

            <div className="fg">
              <label className="fl">Preview</label>
              <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', borderRadius: 'var(--r)', overflow: 'hidden', background: 'var(--border)' }}>
                {VIDEO_URL_RE.test(hero.hero_video_url) && !videoPreviewError ? (
                  <video
                    key={hero.hero_video_url}
                    src={hero.hero_video_url}
                    poster={hero.hero_poster_url || undefined}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    muted loop autoPlay playsInline controls
                    onError={() => setVideoPreviewError(true)}
                  />
                ) : hero.hero_poster_url ? (
                  <img src={hero.hero_poster_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 12, textAlign: 'center', padding: 16 }}>
                    {hero.hero_video_url ? 'No preview yet — waiting for a valid .mp4/.webm/.ogg URL' : 'Add a video URL or poster image to preview the hero'}
                  </div>
                )}
              </div>
              {videoPreviewError && (
                <div className="alert alert-w" style={{ marginTop: 8, fontSize: 12 }}>
                  <Icon icon={Info} size="inline" />
                  <div>This URL didn't load as a video — double-check it's a direct .mp4 link, not a page URL.</div>
                </div>
              )}
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
          <>
            <div className="fg">
              <label className="fl">Hero Image URL</label>
              <input className="fi" value={hero.hero_image_url} onChange={e => { set('hero_image_url', e.target.value); setImagePreviewError(false); }} placeholder="https://example.com/hero.jpg" />
              <div className="alert alert-i" style={{ marginTop: 8, fontSize: 12 }}>
                <Icon icon={Info} size="inline" />
                <div>Paste a direct image link (.jpg/.png/.webp/.gif/.svg) or a Supabase Storage public URL — or upload one below instead.</div>
              </div>
              {hero.hero_image_url && !isValidImageUrl(hero.hero_image_url) && (
                <div className="alert alert-w" style={{ marginTop: 8, fontSize: 12 }}>
                  <Icon icon={Info} size="inline" />
                  <div>This doesn't look like a direct image URL — make sure it ends in an image extension (.jpg/.png/.webp/.gif/.svg) or is a Supabase Storage public link.</div>
                </div>
              )}
            </div>

            <div className="fg">
              <label className="fl">Or Upload <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(fills in the URL above automatically)</span></label>
              <Uploader
                bucket="previews" accept="image/jpeg,image/png,image/webp" maxBytes={15 * 1024 * 1024} kind="image"
                value={hero.hero_image_url ? { path: null, publicUrl: hero.hero_image_url } : null}
                onUploaded={({ publicUrl }) => { set('hero_image_url', publicUrl); setImagePreviewError(false); }}
                label="Upload the hero background image"
              />
            </div>

            <div className="fg">
              <label className="fl">Preview</label>
              <div style={{ width: '100%', aspectRatio: '16/9', borderRadius: 'var(--r)', overflow: 'hidden', background: 'var(--border)' }}>
                {hero.hero_image_url && !imagePreviewError ? (
                  <img key={hero.hero_image_url} src={hero.hero_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setImagePreviewError(true)} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 12, textAlign: 'center', padding: 16 }}>
                    {hero.hero_image_url ? "Image didn't load — check the URL" : 'Paste a URL or upload an image to preview the hero'}
                  </div>
                )}
              </div>
              {imagePreviewError && (
                <div className="alert alert-w" style={{ marginTop: 8, fontSize: 12 }}>
                  <Icon icon={Info} size="inline" />
                  <div>This URL didn't load as an image — double-check it's a direct, publicly-accessible image link.</div>
                </div>
              )}
            </div>
          </>
        )}

        <button className="btn btn-p btn-lg" style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={saveHero} disabled={saving}>
          <Icon icon={Save} size="inline" /> {saving ? 'Saving...' : 'Save Hero Background'}
        </button>
      </div>

      <div className="card" style={{ padding: 28, maxWidth: 640, marginTop: 24 }}>
        <h3 style={{ fontFamily: 'var(--fd)', fontSize: 20, marginBottom: 6 }}>Theory of Change Background</h3>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>The full-bleed background image behind the Theory of Change statement on the homepage. Changes go live immediately, no redeploy.</p>

        <div className="fg">
          <label className="fl">Background Image URL</label>
          <input className="fi" value={theoryBg} onChange={e => { setTheoryBg(e.target.value); setTheoryBgPreviewError(false); }} placeholder="https://example.com/theory-bg.jpg" />
          <div className="alert alert-i" style={{ marginTop: 8, fontSize: 12 }}>
            <Icon icon={Info} size="inline" />
            <div>Paste a direct image link (.jpg/.png/.webp/.gif/.svg) or a Supabase Storage public URL — or upload one below instead.</div>
          </div>
          {theoryBg && !isValidImageUrl(theoryBg) && (
            <div className="alert alert-w" style={{ marginTop: 8, fontSize: 12 }}>
              <Icon icon={Info} size="inline" />
              <div>This doesn't look like a direct image URL — make sure it ends in an image extension (.jpg/.png/.webp/.gif/.svg) or is a Supabase Storage public link.</div>
            </div>
          )}
        </div>

        <div className="fg">
          <label className="fl">Or Upload <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(fills in the URL above automatically)</span></label>
          <Uploader
            bucket="previews" accept="image/jpeg,image/png,image/webp" maxBytes={15 * 1024 * 1024} kind="image"
            value={theoryBg ? { path: null, publicUrl: theoryBg } : null}
            onUploaded={({ publicUrl }) => { setTheoryBg(publicUrl); setTheoryBgPreviewError(false); }}
            label="Upload the background image"
          />
        </div>

        <div className="fg">
          <label className="fl">Preview</label>
          <div style={{ width: '100%', aspectRatio: '16/9', borderRadius: 'var(--r)', overflow: 'hidden', background: 'var(--border)' }}>
            {theoryBg && !theoryBgPreviewError ? (
              <img key={theoryBg} src={theoryBg} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setTheoryBgPreviewError(true)} />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 12, textAlign: 'center', padding: 16 }}>
                {theoryBg ? "Image didn't load — check the URL" : 'Paste a URL or upload an image to preview — leave empty to use the default placeholder'}
              </div>
            )}
          </div>
          {theoryBgPreviewError && (
            <div className="alert alert-w" style={{ marginTop: 8, fontSize: 12 }}>
              <Icon icon={Info} size="inline" />
              <div>This URL didn't load as an image — double-check it's a direct, publicly-accessible image link.</div>
            </div>
          )}
        </div>

        <button className="btn btn-p btn-lg" style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={saveTheoryBg} disabled={savingTheoryBg}>
          <Icon icon={Save} size="inline" /> {savingTheoryBg ? 'Saving...' : 'Save Background'}
        </button>
      </div>
    </DashboardShell>
  );
}
