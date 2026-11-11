import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Check, CheckCircle2, ExternalLink, X, Plus } from 'lucide-react';
import { SDGs } from '../../data/constants';
import { legalDoc, legalPath } from '../../data/legal';
import Uploader from '../../components/ui/Uploader';
import Markdown from '../../components/ui/Markdown';
import LegalLinks from '../../components/ui/LegalLinks';
import Wordmark from '../../components/ui/Wordmark';
import Icon from '../../components/ui/Icon';
import api from '../../utils/api';

// How long we tell people a review takes (shown on the confirmation page).
export const REVIEW_DAYS = 5;

// The three agreements, by form.
export const AGREEMENT_SLUG = { artwork: 'creator-agreement', charity: 'partner-agreement', campaign: 'partner-agreement' };

// These pages are private: keep them out of search engines and don't leak the link in a Referer.
export function usePrivatePage() {
  useEffect(() => {
    const els = [['robots', 'noindex, nofollow'], ['referrer', 'no-referrer']].map(([name, content]) => { const m = document.createElement('meta'); m.name = name; m.content = content; document.head.appendChild(m); return m; });
    const prev = document.title; document.title = 'Submit — FastTackle Africa';
    return () => { els.forEach(m => m.remove()); document.title = prev; };
  }, []);
}

// Calls the token check once on load. 'invalid' covers a wrong / replaced token and an unknown form type.
export function useGate(type, token) {
  const [state, setState] = useState('checking');   // checking | ok | invalid | limited
  useEffect(() => {
    let live = true;
    api.submitCheck(type, token).then(() => live && setState('ok'))
      .catch(e => live && setState(e.status === 429 ? 'limited' : 'invalid'));
    return () => { live = false; };
  }, [type, token]);
  return state;
}

export function SubmitFrame({ title, intro, steps, step, children }) {
  return (
    <div className="submit-page">
      <div className="submit-head"><Wordmark size="card" style={{ fontFamily: 'var(--fd)', fontSize: 26, fontWeight: 700, color: 'var(--accent)' }} /></div>
      <div className="submit-card">
        <h1 className="display" style={{ fontSize: 'clamp(28px,5vw,38px)', marginBottom: 6 }}>{title}</h1>
        {intro && <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.65, marginBottom: 20 }}>{intro}</p>}
        {steps && (
          <ol className="submit-steps" aria-label="Progress" data-submit-steps>
            {steps.map((s, i) => (
              <li key={s} className={i === step ? 'on' : i < step ? 'done' : ''} aria-current={i === step ? 'step' : undefined}>
                <span className="n">{i < step ? <Icon icon={Check} size="inline" /> : i + 1}</span><span className="t">{s}</span>
              </li>
            ))}
          </ol>
        )}
        {children}
      </div>
      <LegalLinks style={{ marginTop: 18 }} />
    </div>
  );
}

export function InvalidLink({ limited }) {
  return (
    <div className="submit-page">
      <div className="submit-head"><Wordmark size="card" style={{ fontFamily: 'var(--fd)', fontSize: 26, fontWeight: 700, color: 'var(--accent)' }} /></div>
      <div className="submit-card" data-invalid-link style={{ textAlign: 'center' }}>
        <h1 className="display" style={{ fontSize: 32, marginBottom: 10 }}>{limited ? 'Please try again later' : 'This link is not valid'}</h1>
        <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.7, marginBottom: 20 }}>
          {limited ? 'Too many attempts from this connection. Wait a few minutes and try again.' : 'It may have been copied incompletely, or replaced by a newer one. Please use the full link you were sent, or ask us for a fresh one.'}
        </p>
        <Link to="/" className="btn btn-p">Go to the homepage</Link>
      </div>
    </div>
  );
}

export function ThankYou({ email }) {
  return (
    <div className="submit-page">
      <div className="submit-head"><Wordmark size="card" style={{ fontFamily: 'var(--fd)', fontSize: 26, fontWeight: 700, color: 'var(--accent)' }} /></div>
      <div className="submit-card" data-thank-you style={{ textAlign: 'center' }}>
        <div style={{ color: 'var(--sage)', display: 'flex', justifyContent: 'center', marginBottom: 10 }}><Icon icon={CheckCircle2} size={52} /></div>
        <h1 className="display" style={{ fontSize: 34, marginBottom: 10 }}>Thank you</h1>
        <p style={{ fontSize: 15, color: 'var(--txt2)', lineHeight: 1.75, marginBottom: 22 }}>
          We've received your submission. We'll review it within <strong>{REVIEW_DAYS} working days</strong> and contact you at <strong data-thank-email style={{ overflowWrap: 'anywhere' }}>{email}</strong>.
        </p>
        <Link to="/" className="btn btn-p btn-lg">Back to the homepage</Link>
      </div>
    </div>
  );
}

// An image slot that uploads through the submissions-scoped endpoint (the only place a logged-out submitter may write).
export function SubmitImage({ type, token, value, onChange, label, hint, field }) {
  const signer = useMemo(() => ({ filename, contentType, fileSize }) => api.submitSign(type, token, { filename, contentType, fileSize }), [type, token]);
  return (
    <div className="fg" data-image-field={field}>
      <label className="fl">{label}</label>
      {hint && <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>{hint}</p>}
      <Uploader bucket="previews" accept="image/jpeg,image/png,image/webp,image/gif" maxBytes={10 * 1024 * 1024} kind="image" signer={signer}
        value={value ? { path: null, publicUrl: value } : null} onUploaded={({ publicUrl }) => onChange(publicUrl)} label={label} />
      {value && <button type="button" className="btn btn-g btn-sm" style={{ marginTop: 6 }} onClick={() => onChange('')}>Remove</button>}
    </div>
  );
}

// A list of images (artwork photos / campaign gallery). value: string[] of uploaded URLs.
export function SubmitGallery({ type, token, value, onChange, max, label, hint, field }) {
  const signer = useMemo(() => ({ filename, contentType, fileSize }) => api.submitSign(type, token, { filename, contentType, fileSize }), [type, token]);
  const items = value.length ? value : [''];
  const set = (i, url) => onChange(items.map((u, j) => (j === i ? url : u)));
  return (
    <div className="fg" data-gallery-field={field}>
      <label className="fl">{label}</label>
      {hint && <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>{hint}</p>}
      {items.map((u, i) => (
        <div key={i} data-gallery-slot={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Uploader bucket="previews" accept="image/jpeg,image/png,image/webp,image/gif" maxBytes={10 * 1024 * 1024} kind="image" signer={signer}
              value={u ? { path: null, publicUrl: u } : null} onUploaded={({ publicUrl }) => set(i, publicUrl)} label={`Image ${i + 1}`} />
          </div>
          {items.length > 1 && <button type="button" className="btn btn-danger btn-sm" onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label={`Remove image ${i + 1}`}><Icon icon={X} size="inline" /></button>}
        </div>
      ))}
      {items.length < max && <button type="button" className="btn btn-s btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }} onClick={() => onChange([...items, ''])}><Icon icon={Plus} size="inline" /> Add another image</button>}
    </div>
  );
}

export function SdgPicker({ value, onChange }) {
  return (
    <div className="fg">
      <div className="fl" style={{ marginBottom: 8 }}>Global Goals <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(optional)</span></div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {SDGs.map(s => (
          <button type="button" key={s.id} onClick={() => onChange(value.includes(s.id) ? value.filter(x => x !== s.id) : [...value, s.id])} aria-pressed={value.includes(s.id)}
            className={`pill${value.includes(s.id) ? ' on' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', fontSize: 11, fontFamily: 'inherit' }}>
            <span className="sdg" style={{ background: s.c, color: '#fff', width: 18, height: 18, fontSize: 8, borderRadius: 3 }}>{s.id}</span>{s.n}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── the terms step (last step of every form) ────────────────────────────────
// Shows the full CURRENT agreement in a scrollable box + a link to its /legal page, a required
// "I have read and agree to the <name>, version <n>" box and the typed full name (the signature).
// `value` = { accepted, name }; `onDoc` receives the loaded document (the parent sends its version).
export function AgreementStep({ slug, value, onChange, onDoc, reloadKey = 0 }) {
  const meta = legalDoc(slug);
  const [doc, setDoc] = useState(null);
  const [state, setState] = useState('loading');   // loading | ok | missing
  useEffect(() => {
    let live = true; setState('loading'); setDoc(null); onDoc?.(null);
    api.getLegal(slug).then(d => { if (live) { setDoc(d); setState('ok'); onDoc?.(d); } }).catch(() => live && setState('missing'));
    return () => { live = false; };
  }, [slug, reloadKey]);

  return (
    <div data-agreement-step>
      <h2 style={{ fontFamily: 'var(--fd)', fontSize: 24, marginBottom: 6 }}>{meta.title}</h2>
      {state === 'loading' && <div className="skel" style={{ height: 220, borderRadius: 10 }} />}
      {state === 'missing' && <div className="alert alert-w" data-agreement-missing>The {meta.title} isn't available right now, so we can't take your submission yet. Please try again later.</div>}
      {state === 'ok' && doc && (
        <>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 10 }}>
            Please read the agreement below in full. <strong>Version {doc.version}</strong>, last updated {new Date(doc.publishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.{' '}
            <a href={legalPath(slug)} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>Open it on its own page <Icon icon={ExternalLink} size="inline" /></a>
          </p>
          <div className="agreement-box" data-agreement-box tabIndex={0} role="region" aria-label={`${meta.title}, version ${doc.version}`}><Markdown className="legal-doc">{doc.body}</Markdown></div>
          <label className="agree-check" data-agree-check>
            <input type="checkbox" checked={value.accepted} onChange={e => onChange({ ...value, accepted: e.target.checked })} />
            <span>I have read and agree to the <strong>{meta.title}</strong>, version <strong>{doc.version}</strong></span>
          </label>
          <div className="fg" style={{ marginTop: 12 }}>
            <label className="fl">Your full name — typed as your signature *</label>
            <input className="fi" value={value.name} onChange={e => onChange({ ...value, name: e.target.value })} autoComplete="name" maxLength={100} data-field="signature" placeholder="e.g. Amara Okafor" />
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>Typing your name here is your electronic signature. We record the version, the date and time, and your connection's IP address with your submission.</div>
          </div>
        </>
      )}
    </div>
  );
}

// true once the agreement is loaded, ticked and signed — the Submit button's only condition.
export const agreementReady = (doc, v) => !!doc && v.accepted && v.name.trim().length >= 2;
export const agreementPayload = (slug, doc, v) => ({ slug, version: doc.version, accepted: true, typedName: v.name.trim() });

export const num = (v) => (v === '' || v == null ? undefined : Number(v));
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const HTTP_RE = /^https?:\/\/\S+$/i;
export const PHONE_OK = (v) => !v.trim() || /^[0-9+()\-.\s]{5,30}$/.test(v.trim());
