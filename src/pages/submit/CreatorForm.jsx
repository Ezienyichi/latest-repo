import { useState } from 'react';
import api from '../../utils/api';
import {
  SubmitFrame, SubmitImage, SubmitGallery, SdgPicker, AgreementStep, ThankYou, agreementReady, agreementPayload,
  AGREEMENT_SLUG, num, EMAIL_RE, HTTP_RE, PHONE_OK,
} from './submitShared';

const STEPS = ['About you', 'Your work', 'Terms'];
const CATS = [{ id: 'ARTWORK', label: 'Artwork' }, { id: 'MUSIC', label: 'Music' }, { id: 'BOOK', label: 'Book' }];
const BOOK_FORMATS = [{ id: 'DIGITAL', label: 'Digital' }, { id: 'PHYSICAL', label: 'Physical' }, { id: 'BOTH', label: 'Both' }];
const SLUG = AGREEMENT_SLUG.artwork;

// One form for ARTWORK, MUSIC and BOOK: the work-details step adapts to the category,
// mirroring the admin product form (same fields, same rules the server enforces).
export default function CreatorForm({ token }) {
  const [step, setStep] = useState(0);
  const [c, setC] = useState({ contactName: '', contactEmail: '', contactPhone: '' });
  const [a, setA] = useState({ displayName: '', biography: '', location: '', websiteUrl: '' });
  const [cat, setCat] = useState('ARTWORK');
  const [w, setW] = useState({
    title: '', description: '', year: '', images: [], sdgIds: [],
    editionType: 'ORIGINAL', basePrice: '', medium: '', dimensions: '',
    outright: false, consignment: false, printLicence: false, editionSize: '',
    digitalAccessUrl: '', bookFormat: 'DIGITAL', digitalPrice: '', physicalPrice: '', isbn: '', publisher: '', language: '', pages: '',
  });
  const [ag, setAg] = useState({ accepted: false, name: '' });
  const [doc, setDoc] = useState(null);
  const [reload, setReload] = useState(0);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const sc = (k) => (e) => setC(p => ({ ...p, [k]: e.target.value }));
  const sa = (k) => (e) => setA(p => ({ ...p, [k]: e.target.value }));
  const sw = (k) => (e) => setW(p => ({ ...p, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const setWv = (k, v) => setW(p => ({ ...p, [k]: v }));
  const imgs = w.images.filter(Boolean);

  const check0 = () => {
    if (c.contactName.trim().length < 2) return 'Please enter your name';
    if (!EMAIL_RE.test(c.contactEmail.trim())) return 'Please enter a valid email address';
    if (!PHONE_OK(c.contactPhone)) return 'That phone number doesn\'t look right';
    if (!a.displayName.trim()) return 'Please enter the name you want shown publicly';
    if (a.websiteUrl.trim() && !HTTP_RE.test(a.websiteUrl.trim())) return 'Website must start with http:// or https://';
    return '';
  };
  const check1 = () => {
    if (!w.title.trim()) return 'Please enter a title';
    if (!imgs.length) return cat === 'ARTWORK' ? 'Please upload at least one image' : 'Please upload a cover image';
    if (w.year !== '' && !(Number.isInteger(+w.year) && +w.year >= 1800 && +w.year <= new Date().getFullYear() + 1)) return 'Year is not valid';
    if (cat === 'ARTWORK') {
      if (!(num(w.basePrice) > 0)) return 'Enter a price greater than 0';
      if (!w.outright && !w.consignment && !w.printLicence) return 'Choose at least one: outright sale, consignment or print licence';
      if (w.printLicence && !(Number.isInteger(+w.editionSize) && +w.editionSize >= 2 && +w.editionSize <= 10000)) return 'Edition size must be a whole number from 2 to 10,000';
      return '';
    }
    if (w.digitalAccessUrl.trim() && !HTTP_RE.test(w.digitalAccessUrl.trim())) return 'The link must start with http:// or https://';
    if (cat === 'MUSIC') {
      if (!w.digitalAccessUrl.trim()) return 'A listen / stream link is required';
      if (!(num(w.basePrice) > 0)) return 'Enter a price greater than 0';
      return '';
    }
    const dig = w.bookFormat !== 'PHYSICAL', phys = w.bookFormat !== 'DIGITAL';
    if (dig && !w.digitalAccessUrl.trim()) return 'A read link is required for the digital edition';
    if (dig && !(num(w.digitalPrice) > 0)) return 'Enter a digital price greater than 0';
    if (phys && !(num(w.physicalPrice) > 0)) return 'Enter a physical price greater than 0';
    return '';
  };
  const next = () => { const e = step === 0 ? check0() : check1(); setErr(e); if (!e) { setStep(step + 1); window.scrollTo({ top: 0 }); } };

  const payload = () => {
    const base = {
      ...c, artist: a, category: cat, title: w.title, description: w.description, year: w.year === '' ? undefined : +w.year,
      images: imgs, sdgIds: w.sdgIds,
    };
    if (cat === 'ARTWORK') {
      return { ...base, editionType: w.editionType, basePrice: num(w.basePrice), medium: w.medium, dimensions: w.dimensions,
        offer: { outright: w.outright, consignment: w.consignment, printLicence: w.printLicence, editionSize: w.printLicence ? +w.editionSize : undefined } };
    }
    if (cat === 'MUSIC') return { ...base, digitalAccessUrl: w.digitalAccessUrl, basePrice: num(w.basePrice) };
    return { ...base, digitalAccessUrl: w.digitalAccessUrl, bookFormat: w.bookFormat, digitalPrice: num(w.digitalPrice), physicalPrice: num(w.physicalPrice),
      isbn: w.isbn, publisher: w.publisher, language: w.language, pages: num(w.pages) };
  };

  const submit = async () => {
    setBusy(true); setErr('');
    try {
      await api.submitCreate('artwork', token, { ...payload(), agreement: agreementPayload(SLUG, doc, ag) });
      setDone(true); window.scrollTo({ top: 0 });
    } catch (e) {
      setErr(e.message);
      if (e.status === 409) { setAg({ accepted: false, name: ag.name }); setReload(r => r + 1); }   // the agreement changed: show the new text, ask again
    } finally { setBusy(false); }
  };

  if (done) return <ThankYou email={c.contactEmail.trim()} />;
  const ready = agreementReady(doc, ag);

  return (
    <SubmitFrame title="Share your work with FastTackle Africa" intro="Tell us about yourself and the work you'd like to offer. Nothing appears on the site until our team has reviewed and approved it." steps={STEPS} step={step}>
      {err && <div className="alert alert-e" role="alert" data-submit-error style={{ marginBottom: 16 }}>{err}</div>}

      {step === 0 && (
        <div data-step="about">
          <h2 className="submit-h2">Your contact details</h2>
          <p className="submit-note">Private — only our team sees these.</p>
          <div className="fg"><label className="fl">Your name *</label><input className="fi" value={c.contactName} onChange={sc('contactName')} autoComplete="name" data-field="contactName" /></div>
          <div className="fg"><label className="fl">Email *</label><input className="fi" type="email" value={c.contactEmail} onChange={sc('contactEmail')} autoComplete="email" data-field="contactEmail" /></div>
          <div className="fg"><label className="fl">Phone / WhatsApp</label><input className="fi" type="tel" value={c.contactPhone} onChange={sc('contactPhone')} autoComplete="tel" data-field="contactPhone" /></div>
          <h2 className="submit-h2" style={{ marginTop: 24 }}>Your public profile</h2>
          <p className="submit-note">How you'll appear on the site once approved.</p>
          <div className="fg"><label className="fl">Name as it should appear *</label><input className="fi" value={a.displayName} onChange={sa('displayName')} data-field="displayName" /></div>
          <div className="fg"><label className="fl">Biography</label><textarea className="fi" rows={4} value={a.biography} onChange={sa('biography')} maxLength={3000} /></div>
          <div className="submit-row">
            <div className="fg"><label className="fl">Location</label><input className="fi" value={a.location} onChange={sa('location')} placeholder="e.g. Lagos, Nigeria" /></div>
            <div className="fg"><label className="fl">Website</label><input className="fi" value={a.websiteUrl} onChange={sa('websiteUrl')} placeholder="https://" inputMode="url" /></div>
          </div>
        </div>
      )}

      {step === 1 && (
        <div data-step="work">
          <h2 className="submit-h2">What are you submitting?</h2>
          <div className="submit-cats" role="radiogroup" aria-label="Category">
            {CATS.map(x => <button type="button" key={x.id} role="radio" aria-checked={cat === x.id} data-cat={x.id} className={`pill${cat === x.id ? ' on' : ''}`} onClick={() => { setCat(x.id); setErr(''); }}>{x.label}</button>)}
          </div>

          <div className="fg"><label className="fl">{cat === 'BOOK' ? 'Book title' : cat === 'MUSIC' ? 'Title of the track / album' : 'Title of the work'} *</label><input className="fi" value={w.title} onChange={sw('title')} data-field="title" /></div>
          <div className="fg"><label className="fl">Description</label><textarea className="fi" rows={4} value={w.description} onChange={sw('description')} maxLength={5000} /></div>

          {cat === 'ARTWORK' ? (
            <SubmitGallery type="artwork" token={token} value={w.images} onChange={v => setWv('images', v)} max={8} field="images" label="Photos of the work *" hint="Up to 8 images. The first is the main image. JPG, PNG, WebP or GIF, 10 MB each." />
          ) : (
            <SubmitImage type="artwork" token={token} field="cover" value={w.images[0] || ''} onChange={u => setWv('images', u ? [u] : [])} label={cat === 'BOOK' ? 'Cover image *' : 'Cover art *'} hint="JPG, PNG, WebP or GIF, 10 MB." />
          )}

          {cat === 'ARTWORK' && (
            <>
              <div className="submit-row">
                <div className="fg"><label className="fl">Type</label>
                  <select className="fi" value={w.editionType} onChange={sw('editionType')}><option value="ORIGINAL">Original</option><option value="PRINT">Print</option><option value="EDITION">Limited edition</option></select></div>
                <div className="fg"><label className="fl">Your asking price (USD) *</label><input className="fi" inputMode="decimal" value={w.basePrice} onChange={sw('basePrice')} data-field="basePrice" /></div>
              </div>
              <div className="submit-row">
                <div className="fg"><label className="fl">Medium</label><input className="fi" value={w.medium} onChange={sw('medium')} placeholder="e.g. Oil on canvas" /></div>
                <div className="fg"><label className="fl">Dimensions</label><input className="fi" value={w.dimensions} onChange={sw('dimensions')} placeholder="e.g. 60 × 80 cm" /></div>
              </div>
              <div className="fg"><label className="fl">Year</label><input className="fi" inputMode="numeric" value={w.year} onChange={sw('year')} style={{ maxWidth: 140 }} /></div>

              <fieldset className="submit-offer" data-offer>
                <legend>How would you like to offer this work? * <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(pick any that apply)</span></legend>
                <label className="agree-check"><input type="checkbox" checked={w.outright} onChange={sw('outright')} data-offer-opt="outright" /><span><strong>Outright sale to FastTackle</strong> — we buy the work and sell it on.</span></label>
                <label className="agree-check"><input type="checkbox" checked={w.consignment} onChange={sw('consignment')} data-offer-opt="consignment" /><span><strong>Consignment</strong> — you keep ownership; we sell it for you and pay you when it sells.</span></label>
                <label className="agree-check"><input type="checkbox" checked={w.printLicence} onChange={sw('printLicence')} data-offer-opt="printLicence" /><span><strong>Print licence</strong> — you license us to produce prints of the work in a limited edition.</span></label>
                {w.printLicence && (
                  <div className="fg" style={{ marginTop: 10 }}><label className="fl">Edition size (number of prints) *</label>
                    <input className="fi" inputMode="numeric" value={w.editionSize} onChange={sw('editionSize')} data-field="editionSize" style={{ maxWidth: 180 }} placeholder="e.g. 50" /></div>
                )}
              </fieldset>
            </>
          )}

          {cat === 'MUSIC' && (
            <>
              <div className="fg"><label className="fl">Listen / stream link *</label><input className="fi" value={w.digitalAccessUrl} onChange={sw('digitalAccessUrl')} placeholder="https://" inputMode="url" data-field="digitalAccessUrl" />
                <div className="submit-note" style={{ marginTop: 6 }}>Buyers are given this link after they purchase. It is never shown publicly.</div></div>
              <div className="submit-row">
                <div className="fg"><label className="fl">Price (USD) *</label><input className="fi" inputMode="decimal" value={w.basePrice} onChange={sw('basePrice')} data-field="basePrice" /></div>
                <div className="fg"><label className="fl">Year</label><input className="fi" inputMode="numeric" value={w.year} onChange={sw('year')} /></div>
              </div>
            </>
          )}

          {cat === 'BOOK' && (
            <>
              <div className="fg"><label className="fl">Format *</label>
                <div className="submit-cats" role="radiogroup" aria-label="Book format">
                  {BOOK_FORMATS.map(x => <button type="button" key={x.id} role="radio" aria-checked={w.bookFormat === x.id} data-format={x.id} className={`pill${w.bookFormat === x.id ? ' on' : ''}`} onClick={() => setWv('bookFormat', x.id)}>{x.label}</button>)}
                </div></div>
              {w.bookFormat !== 'PHYSICAL' && (
                <div className="fg"><label className="fl">Read link (digital edition) *</label><input className="fi" value={w.digitalAccessUrl} onChange={sw('digitalAccessUrl')} placeholder="https://" inputMode="url" data-field="digitalAccessUrl" /></div>
              )}
              <div className="submit-row">
                {w.bookFormat !== 'PHYSICAL' && <div className="fg"><label className="fl">Digital price (USD) *</label><input className="fi" inputMode="decimal" value={w.digitalPrice} onChange={sw('digitalPrice')} data-field="digitalPrice" /></div>}
                {w.bookFormat !== 'DIGITAL' && <div className="fg"><label className="fl">Physical price (USD) *</label><input className="fi" inputMode="decimal" value={w.physicalPrice} onChange={sw('physicalPrice')} data-field="physicalPrice" /></div>}
              </div>
              <div className="submit-row">
                <div className="fg"><label className="fl">ISBN</label><input className="fi" value={w.isbn} onChange={sw('isbn')} /></div>
                <div className="fg"><label className="fl">Publisher</label><input className="fi" value={w.publisher} onChange={sw('publisher')} /></div>
              </div>
              <div className="submit-row">
                <div className="fg"><label className="fl">Language</label><input className="fi" value={w.language} onChange={sw('language')} /></div>
                <div className="fg"><label className="fl">Pages</label><input className="fi" inputMode="numeric" value={w.pages} onChange={sw('pages')} /></div>
              </div>
              <div className="fg"><label className="fl">Year published</label><input className="fi" inputMode="numeric" value={w.year} onChange={sw('year')} style={{ maxWidth: 140 }} /></div>
            </>
          )}

          <SdgPicker value={w.sdgIds} onChange={v => setWv('sdgIds', v)} />
        </div>
      )}

      {step === 2 && (
        <div data-step="terms">
          <AgreementStep slug={SLUG} value={ag} onChange={setAg} onDoc={setDoc} reloadKey={reload} />
        </div>
      )}

      <div className="submit-nav">
        {step > 0 ? <button type="button" className="btn btn-s" onClick={() => { setStep(step - 1); setErr(''); }} disabled={busy}>Back</button> : <span />}
        {step < 2
          ? <button type="button" className="btn btn-p" onClick={next} data-next>Continue</button>
          : <button type="button" className="btn btn-p" onClick={submit} disabled={!ready || busy} data-submit>{busy ? 'Submitting…' : 'Submit'}</button>}
      </div>
    </SubmitFrame>
  );
}
