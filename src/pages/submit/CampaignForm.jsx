import { useState } from 'react';
import api from '../../utils/api';
import {
  SubmitFrame, SubmitImage, SubmitGallery, SdgPicker, AgreementStep, ThankYou, agreementReady, agreementPayload,
  AGREEMENT_SLUG, num, EMAIL_RE, HTTP_RE, PHONE_OK,
} from './submitShared';

const STEPS = ['The charity', 'The campaign', 'Terms'];
const SLUG = AGREEMENT_SLUG.campaign;

export default function CampaignForm({ token }) {
  const [step, setStep] = useState(0);
  const [c, setC] = useState({ contactName: '', contactEmail: '', contactPhone: '' });
  const [ch, setCh] = useState({ name: '', mission: '', registrationNo: '', websiteUrl: '', logo: '', sdgIds: [] });
  const [p, setP] = useState({ title: '', story: '', targetAmount: '', startDate: '', endDate: '', campaignVideo: '', headerImage: '', images: [], sdgIds: [] });
  const [ag, setAg] = useState({ accepted: false, name: '' });
  const [doc, setDoc] = useState(null);
  const [reload, setReload] = useState(0);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const sc = (k) => (e) => setC(x => ({ ...x, [k]: e.target.value }));
  const sh = (k) => (e) => setCh(x => ({ ...x, [k]: e.target.value }));
  const sp = (k) => (e) => setP(x => ({ ...x, [k]: e.target.value }));

  const check0 = () => {
    if (c.contactName.trim().length < 2) return 'Please enter your name';
    if (!EMAIL_RE.test(c.contactEmail.trim())) return 'Please enter a valid email address';
    if (!PHONE_OK(c.contactPhone)) return 'That phone number doesn\'t look right';
    if (!ch.name.trim()) return 'Please enter the charity name';
    if (ch.websiteUrl.trim() && !HTTP_RE.test(ch.websiteUrl.trim())) return 'Website must start with http:// or https://';
    return '';
  };
  const check1 = () => {
    if (!p.title.trim()) return 'Please enter a campaign title';
    if (p.story.trim().length < 20) return 'Please tell the campaign story (at least 20 characters)';
    if (!(num(p.targetAmount) > 0)) return 'Enter a target amount greater than 0';
    if (!p.headerImage) return 'Please upload a header image';
    if (!p.startDate || !p.endDate) return 'Please choose start and end dates';
    if (p.endDate < p.startDate) return 'End date must be after the start date';
    if (p.campaignVideo.trim() && !HTTP_RE.test(p.campaignVideo.trim())) return 'Video link must start with http:// or https://';
    return '';
  };
  const next = () => { const e = step === 0 ? check0() : check1(); setErr(e); if (!e) { setStep(step + 1); window.scrollTo({ top: 0 }); } };

  const submit = async () => {
    setBusy(true); setErr('');
    try {
      await api.submitCreate('campaign', token, {
        ...c, charity: ch, title: p.title, story: p.story, targetAmount: num(p.targetAmount), startDate: p.startDate, endDate: p.endDate,
        campaignVideo: p.campaignVideo, headerImage: p.headerImage, images: p.images.filter(Boolean), sdgIds: p.sdgIds,
        agreement: agreementPayload(SLUG, doc, ag),
      });
      setDone(true); window.scrollTo({ top: 0 });
    } catch (e) {
      setErr(e.message);
      if (e.status === 409) { setAg({ accepted: false, name: ag.name }); setReload(r => r + 1); }
    } finally { setBusy(false); }
  };

  if (done) return <ThankYou email={c.contactEmail.trim()} />;

  return (
    <SubmitFrame title="Propose a campaign" intro="Tell us about your organisation and the campaign you'd like to run. Nothing appears on the site until our team has reviewed and approved it." steps={STEPS} step={step}>
      {err && <div className="alert alert-e" role="alert" data-submit-error style={{ marginBottom: 16 }}>{err}</div>}

      {step === 0 && (
        <div data-step="charity">
          <h2 className="submit-h2">Your contact details</h2>
          <p className="submit-note">Private — only our team sees these.</p>
          <div className="fg"><label className="fl">Your name *</label><input className="fi" value={c.contactName} onChange={sc('contactName')} autoComplete="name" data-field="contactName" /></div>
          <div className="fg"><label className="fl">Email *</label><input className="fi" type="email" value={c.contactEmail} onChange={sc('contactEmail')} autoComplete="email" data-field="contactEmail" /></div>
          <div className="fg"><label className="fl">Phone / WhatsApp</label><input className="fi" type="tel" value={c.contactPhone} onChange={sc('contactPhone')} autoComplete="tel" /></div>
          <h2 className="submit-h2" style={{ marginTop: 24 }}>The charity running the campaign</h2>
          <div className="fg"><label className="fl">Charity name *</label><input className="fi" value={ch.name} onChange={sh('name')} data-field="charityName" /></div>
          <div className="fg"><label className="fl">Mission</label><textarea className="fi" rows={4} value={ch.mission} onChange={sh('mission')} maxLength={5000} /></div>
          <div className="submit-row">
            <div className="fg"><label className="fl">Registration number</label><input className="fi" value={ch.registrationNo} onChange={sh('registrationNo')} /></div>
            <div className="fg"><label className="fl">Website</label><input className="fi" value={ch.websiteUrl} onChange={sh('websiteUrl')} placeholder="https://" inputMode="url" /></div>
          </div>
          <SubmitImage type="campaign" token={token} field="charityLogo" value={ch.logo} onChange={v => setCh(x => ({ ...x, logo: v }))} label="Charity logo" />
        </div>
      )}

      {step === 1 && (
        <div data-step="campaign">
          <div className="fg"><label className="fl">Campaign title *</label><input className="fi" value={p.title} onChange={sp('title')} data-field="title" /></div>
          <div className="fg"><label className="fl">The story *</label><textarea className="fi" rows={7} value={p.story} onChange={sp('story')} maxLength={20000} data-field="story" /></div>
          <div className="submit-row">
            <div className="fg"><label className="fl">Target amount (USD) *</label><input className="fi" inputMode="decimal" value={p.targetAmount} onChange={sp('targetAmount')} data-field="targetAmount" /></div>
            <div className="fg"><label className="fl">Video link</label><input className="fi" value={p.campaignVideo} onChange={sp('campaignVideo')} placeholder="https://" inputMode="url" /></div>
          </div>
          <div className="submit-row">
            <div className="fg"><label className="fl">Start date *</label><input className="fi" type="date" value={p.startDate} onChange={sp('startDate')} data-field="startDate" /></div>
            <div className="fg"><label className="fl">End date *</label><input className="fi" type="date" value={p.endDate} onChange={sp('endDate')} data-field="endDate" /></div>
          </div>
          <SubmitImage type="campaign" token={token} field="headerImage" value={p.headerImage} onChange={v => setP(x => ({ ...x, headerImage: v }))} label="Header image *" hint="A wide image shown at the top of the campaign page." />
          <SubmitGallery type="campaign" token={token} value={p.images} onChange={v => setP(x => ({ ...x, images: v }))} max={12} field="images" label="Gallery" hint="Up to 12 more images." />
          <SdgPicker value={p.sdgIds} onChange={v => setP(x => ({ ...x, sdgIds: v }))} />
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
