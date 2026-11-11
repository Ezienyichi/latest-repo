import { useState } from 'react';
import api from '../../utils/api';
import {
  SubmitFrame, SubmitImage, SubmitGallery, SdgPicker, AgreementStep, ThankYou, agreementReady, agreementPayload,
  AGREEMENT_SLUG, num, EMAIL_RE, HTTP_RE, PHONE_OK,
} from './submitShared';

const STEPS = ['Your charity', 'Story & images', 'Terms'];
const SLUG = AGREEMENT_SLUG.charity;

export default function CharityForm({ token }) {
  const [step, setStep] = useState(0);
  const [f, setF] = useState({ contactName: '', contactEmail: '', contactPhone: '', name: '', mission: '', registrationNo: '', websiteUrl: '', logo: '', target: '', images: [], sdgIds: [] });
  const [ag, setAg] = useState({ accepted: false, name: '' });
  const [doc, setDoc] = useState(null);
  const [reload, setReload] = useState(0);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const s = (k) => (e) => setF(p => ({ ...p, [k]: e.target.value }));
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  const check0 = () => {
    if (f.contactName.trim().length < 2) return 'Please enter your name';
    if (!EMAIL_RE.test(f.contactEmail.trim())) return 'Please enter a valid email address';
    if (!PHONE_OK(f.contactPhone)) return 'That phone number doesn\'t look right';
    if (!f.name.trim()) return 'Please enter the charity name';
    if (!f.mission.trim()) return 'Please describe your mission';
    if (f.websiteUrl.trim() && !HTTP_RE.test(f.websiteUrl.trim())) return 'Website must start with http:// or https://';
    return '';
  };
  const check1 = () => (f.target !== '' && !(num(f.target) >= 0) ? 'Fundraising target must be a number' : '');
  const next = () => { const e = step === 0 ? check0() : check1(); setErr(e); if (!e) { setStep(step + 1); window.scrollTo({ top: 0 }); } };

  const submit = async () => {
    setBusy(true); setErr('');
    try {
      const { images, target, ...rest } = f;
      await api.submitCreate('charity', token, { ...rest, target: num(target), images: images.filter(Boolean), agreement: agreementPayload(SLUG, doc, ag) });
      setDone(true); window.scrollTo({ top: 0 });
    } catch (e) {
      setErr(e.message);
      if (e.status === 409) { setAg({ accepted: false, name: ag.name }); setReload(r => r + 1); }
    } finally { setBusy(false); }
  };

  if (done) return <ThankYou email={f.contactEmail.trim()} />;

  return (
    <SubmitFrame title="Register your charity" intro="Tell us about your organisation. Nothing appears on the site until our team has reviewed and approved it." steps={STEPS} step={step}>
      {err && <div className="alert alert-e" role="alert" data-submit-error style={{ marginBottom: 16 }}>{err}</div>}

      {step === 0 && (
        <div data-step="charity">
          <h2 className="submit-h2">Your contact details</h2>
          <p className="submit-note">Private — only our team sees these.</p>
          <div className="fg"><label className="fl">Your name *</label><input className="fi" value={f.contactName} onChange={s('contactName')} autoComplete="name" data-field="contactName" /></div>
          <div className="fg"><label className="fl">Email *</label><input className="fi" type="email" value={f.contactEmail} onChange={s('contactEmail')} autoComplete="email" data-field="contactEmail" /></div>
          <div className="fg"><label className="fl">Phone / WhatsApp</label><input className="fi" type="tel" value={f.contactPhone} onChange={s('contactPhone')} autoComplete="tel" /></div>
          <h2 className="submit-h2" style={{ marginTop: 24 }}>The charity</h2>
          <div className="fg"><label className="fl">Charity name *</label><input className="fi" value={f.name} onChange={s('name')} data-field="name" /></div>
          <div className="fg"><label className="fl">Mission *</label><textarea className="fi" rows={5} value={f.mission} onChange={s('mission')} maxLength={5000} data-field="mission" /></div>
          <div className="submit-row">
            <div className="fg"><label className="fl">Registration number</label><input className="fi" value={f.registrationNo} onChange={s('registrationNo')} /></div>
            <div className="fg"><label className="fl">Website</label><input className="fi" value={f.websiteUrl} onChange={s('websiteUrl')} placeholder="https://" inputMode="url" /></div>
          </div>
        </div>
      )}

      {step === 1 && (
        <div data-step="images">
          <SubmitImage type="charity" token={token} field="logo" value={f.logo} onChange={v => set('logo', v)} label="Logo" hint="JPG, PNG, WebP or GIF, 10 MB." />
          <div className="fg"><label className="fl">Fundraising target (USD)</label><input className="fi" inputMode="decimal" value={f.target} onChange={s('target')} style={{ maxWidth: 220 }} data-field="target" /></div>
          <SubmitGallery type="charity" token={token} value={f.images} onChange={v => set('images', v)} max={12} field="images" label="Photos" hint="Up to 12 images that show your work." />
          <SdgPicker value={f.sdgIds} onChange={v => set('sdgIds', v)} />
        </div>
      )}

      {step === 2 && <div data-step="terms"><AgreementStep slug={SLUG} value={ag} onChange={setAg} onDoc={setDoc} reloadKey={reload} /></div>}

      <div className="submit-nav">
        {step > 0 ? <button type="button" className="btn btn-s" onClick={() => { setStep(step - 1); setErr(''); }} disabled={busy}>Back</button> : <span />}
        {step < 2
          ? <button type="button" className="btn btn-p" onClick={next} data-next>Continue</button>
          : <button type="button" className="btn btn-p" onClick={submit} disabled={!agreementReady(doc, ag) || busy} data-submit>{busy ? 'Submitting…' : 'Submit'}</button>}
      </div>
    </SubmitFrame>
  );
}
