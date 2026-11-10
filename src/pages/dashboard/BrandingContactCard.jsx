import { useState, useEffect } from 'react';
import { Save, Info, X } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import Uploader from '../../components/ui/Uploader';
import Icon from '../../components/ui/Icon';
import api from '../../utils/api';
import { EMAIL_RE, normalizePhone, telHref, waHref } from '../../utils/contact';

const KEYS = ['site_logo_url', 'site_logo_dark_url', 'site_favicon_url', 'contact_email', 'contact_phone', 'whatsapp_number', 'business_hours'];
const EMPTY = Object.fromEntries(KEYS.map(k => [k, '']));
const URL_RE = /^https?:\/\/\S+$/;

// One image setting: live preview on the background it will really sit on,
// a URL field, and an upload (PNG / WebP / JPEG — the image bucket has no SVG).
function ImageSetting({ label, hint, value, onChange, error, variant = 'light', fallback, fallbackNote, favicon = false, field }) {
  const shown = value || fallback || '';
  return (
    <div className="fg" data-setting={field}>
      <label className="fl">{label}</label>
      {hint && <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8, lineHeight: 1.6 }}>{hint}</p>}
      {favicon ? (
        <div className="fav-preview" data-preview={field}>
          {[32, 16].map(px => <div key={px} style={{ width: px + 8, height: px + 8 }}>{shown ? <img src={shown} alt="" style={{ width: px, height: px }} /> : <span style={{ fontSize: 9, color: 'var(--muted)' }}>—</span>}</div>)}
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>{shown ? 'Tab icon preview (32px and 16px)' : 'Not set — the built-in icon is used'}</span>
        </div>
      ) : (
        <div className={`brand-preview ${variant}`} data-preview={field}>
          {shown ? <img src={shown} alt="Logo preview" /> : <span className="none">Not set — the site name is shown as text</span>}
        </div>
      )}
      {!value && fallback && <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>{fallbackNote}</div>}
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <input className="fi" value={value} onChange={e => onChange(e.target.value)} placeholder="https://… (or upload below)" data-field={field} style={{ flex: 1, minWidth: 0 }} />
        {value && <button type="button" className="btn btn-s btn-sm" onClick={() => onChange('')} aria-label={`Clear ${label}`}><Icon icon={X} size="inline" /></button>}
      </div>
      <Uploader bucket="previews" accept="image/png,image/webp,image/jpeg" maxBytes={5 * 1024 * 1024} kind="image"
        value={value ? { path: null, publicUrl: value } : null} onUploaded={({ publicUrl }) => onChange(publicUrl)} label={`Upload ${label.toLowerCase()}`} />
      {error && <div data-error={field} style={{ fontSize: 12, color: '#dc2626', marginTop: 6 }}>{error}</div>}
    </div>
  );
}

export default function BrandingContactCard() {
  const { toast } = useCart();
  const [form, setForm] = useState(EMPTY);
  const [orig, setOrig] = useState(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    api.getAdminSettings().then(s => {
      const v = Object.fromEntries(KEYS.map(k => [k, typeof s[k] === 'string' ? s[k] : '']));
      setForm(v); setOrig(v);
    }).catch(() => {}).finally(() => setLoaded(true));
  }, []);

  const set = (k, v) => { setForm(p => ({ ...p, [k]: v })); setErrors(p => ({ ...p, [k]: undefined })); };

  // Mirrors the server's rules so mistakes are caught before saving.
  const validate = () => {
    const e = {};
    const f = Object.fromEntries(KEYS.map(k => [k, form[k].trim()]));
    if (!EMAIL_RE.test(f.contact_email)) e.contact_email = 'Enter a valid email address';
    for (const k of ['contact_phone', 'whatsapp_number']) if (f[k] && !normalizePhone(f[k])) e[k] = 'Use international format with the country code, e.g. +234 801 234 5678';
    for (const k of ['site_logo_url', 'site_logo_dark_url', 'site_favicon_url']) if (f[k] && !URL_RE.test(f[k])) e[k] = 'Must be a full http(s) link';
    if (f.business_hours.length > 200) e.business_hours = 'At most 200 characters';
    return e;
  };

  const save = async () => {
    const e = validate(); setErrors(e);
    if (Object.keys(e).length) return toast('Fix the highlighted fields first', 'err');
    const changed = KEYS.filter(k => form[k].trim() !== orig[k]);
    if (!changed.length) return toast('Nothing to save — no changes', 'info');
    setSaving(true);
    const results = await Promise.allSettled(changed.map(k => api.updateAdminSetting(k, form[k].trim() === '' && k !== 'contact_email' ? null : form[k].trim())));
    const ok = changed.filter((k, i) => results[i].status === 'fulfilled');
    const bad = changed.map((k, i) => [k, results[i]]).filter(([, r]) => r.status === 'rejected');
    setOrig(p => ({ ...p, ...Object.fromEntries(ok.map(k => [k, form[k].trim()])) }));
    setForm(p => ({ ...p, ...Object.fromEntries(ok.map(k => [k, form[k].trim()])) }));
    if (bad.length) { setErrors(Object.fromEntries(bad.map(([k, r]) => [k, r.reason?.message || 'Could not save']))); toast(`${bad.length} field${bad.length > 1 ? 's' : ''} could not be saved`, 'err'); }
    if (ok.length) { window.dispatchEvent(new Event('ft-settings-changed')); toast(`${ok.length} setting${ok.length > 1 ? 's' : ''} saved — live on the site now`, 'ok'); }
    setSaving(false);
  };

  if (!loaded) return <div className="skel" style={{ height: 320, borderRadius: 'var(--rl)', maxWidth: 640, marginBottom: 24 }} />;
  const phoneLink = form.contact_phone.trim() && normalizePhone(form.contact_phone) ? telHref(form.contact_phone) : null;
  const waLink = form.whatsapp_number.trim() ? waHref(form.whatsapp_number) : null;

  return (
    <div className="card" data-branding-card style={{ padding: 28, maxWidth: 640, marginBottom: 24 }}>
      <h3 style={{ fontFamily: 'var(--fd)', fontSize: 20, marginBottom: 6 }}>Branding &amp; Contact</h3>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>Your logo, tab icon and contact details. Changes go live on the site straight away — no redeploy.</p>

      <div className="lbl" style={{ marginBottom: 10 }}>Logo</div>
      <ImageSetting field="site_logo_url" label="Logo" variant="light" value={form.site_logo_url} onChange={v => set('site_logo_url', v)} error={errors.site_logo_url}
        hint="Shown in the navigation bar (light background) and on the sign-in pages. PNG or WebP with a transparent background works best; SVG can't be uploaded." />
      <ImageSetting field="site_logo_dark_url" label="Light logo for dark backgrounds" variant="dark" value={form.site_logo_dark_url} onChange={v => set('site_logo_dark_url', v)} error={errors.site_logo_dark_url}
        fallback={form.site_logo_url} fallbackNote="No light version set — the main logo is used on dark backgrounds (the footer)."
        hint="A white or light version of the logo, used in the footer. If you leave it empty the main logo is used there too." />
      <ImageSetting field="site_favicon_url" label="Favicon" favicon value={form.site_favicon_url} onChange={v => set('site_favicon_url', v)} error={errors.site_favicon_url}
        hint="The small icon in the browser tab. A square PNG, at least 64×64. Browsers cache tab icons, so a change can take a refresh to appear." />
      <div className="alert alert-i" style={{ fontSize: 12, marginBottom: 22, display: 'flex', gap: 8 }}><Icon icon={Info} size="inline" /><span>Logos are scaled down to fit (height-capped on phones too), so any proportions work. The alt text is always your site name.</span></div>

      <div className="lbl" style={{ marginBottom: 10 }}>Contact details</div>
      <div className="fg"><label className="fl">Email *</label>
        <input className="fi" type="email" value={form.contact_email} onChange={e => set('contact_email', e.target.value)} data-field="contact_email" />
        {errors.contact_email && <div data-error="contact_email" style={{ fontSize: 12, color: '#dc2626', marginTop: 6 }}>{errors.contact_email}</div>}</div>
      <div className="fg"><label className="fl">Phone</label>
        <input className="fi" value={form.contact_phone} onChange={e => set('contact_phone', e.target.value)} placeholder="+234 801 234 5678" data-field="contact_phone" />
        {errors.contact_phone ? <div data-error="contact_phone" style={{ fontSize: 12, color: '#dc2626', marginTop: 6 }}>{errors.contact_phone}</div>
          : <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>{phoneLink ? <>Links to <code data-link="phone">{phoneLink}</code></> : 'International format. Leave empty to hide it.'}</div>}</div>
      <div className="fg"><label className="fl">WhatsApp number</label>
        <input className="fi" value={form.whatsapp_number} onChange={e => set('whatsapp_number', e.target.value)} placeholder="+234 802 345 6789" data-field="whatsapp_number" />
        {errors.whatsapp_number ? <div data-error="whatsapp_number" style={{ fontSize: 12, color: '#dc2626', marginTop: 6 }}>{errors.whatsapp_number}</div>
          : <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>{waLink ? <>Links to <code data-link="whatsapp">{waLink}</code></> : 'International format. Leave empty to hide it.'}</div>}</div>
      <div className="fg"><label className="fl">Business hours</label>
        <input className="fi" value={form.business_hours} onChange={e => set('business_hours', e.target.value)} placeholder="Mon–Fri, 9am–6pm WAT" maxLength={200} data-field="business_hours" />
        {errors.business_hours && <div data-error="business_hours" style={{ fontSize: 12, color: '#dc2626', marginTop: 6 }}>{errors.business_hours}</div>}
        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>Shown in the footer and on the About page. (The top-bar message is the separate “announcement message”.)</div></div>

      <button className="btn btn-p btn-lg" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={save} disabled={saving}>
        <Icon icon={Save} size="inline" /> {saving ? 'Saving…' : 'Save Branding & Contact'}
      </button>
    </div>
  );
}
