import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Inbox, Copy, RefreshCw, Check, X, ExternalLink } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { SDGs } from '../../data/constants';
import DashboardShell from './DashboardShell';
import ImageGallery from '../../components/ui/ImageGallery';
import Icon from '../../components/ui/Icon';
import api from '../../utils/api';
import { cur } from '../../utils/currency';

const TYPE_LABEL = { charity: 'Charity', campaign: 'Campaign', artwork: 'Artwork' };
const TYPE_PLURAL = { charity: 'Charities', campaign: 'Campaigns', artwork: 'Artworks' };
const STATUS_BADGE = { PENDING: 'b-blue', APPROVED: 'b-green', REJECTED: 'b-muted' };
const money = (n) => `${cur()}${Number(n || 0).toLocaleString('en-GB', { maximumFractionDigits: 2 })}`;
const fmt = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

function KV({ k, children }) {
  if (children === null || children === undefined || children === '' || children === false) return null;
  return <div className="sub-kv"><div className="k">{k}</div><div className="v">{children}</div></div>;
}
const Sdgs = ({ ids }) => (ids?.length ? <span style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap' }}>{ids.map(id => { const s = SDGs.find(x => x.id === id); return <span key={id} className="sdg" title={s?.n} style={{ background: s?.c, color: '#fff', width: 22, height: 22, fontSize: 9, borderRadius: 4 }}>{id}</span>; })}</span> : null);
const Link2 = ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>{children}</a>;

function Details({ item }) {
  const e = item.entity, x = item.extra || {};
  if (item.type === 'charity') return (
    <>
      <div className="sub-grid">
        <KV k="Registration no.">{e.registrationNo}</KV>
        <KV k="Website">{e.websiteUrl && <Link2 href={e.websiteUrl}>{e.websiteUrl}</Link2>}</KV>
        <KV k="Fundraising target">{Number(e.target) > 0 && money(e.target)}</KV>
        <KV k="SDG focus"><Sdgs ids={e.sdgIds} /></KV>
      </div>
      <KV k="Mission"><span style={{ whiteSpace: 'pre-wrap' }}>{e.mission}</span></KV>
      {e.logo && <div style={{ marginTop: 14 }}><div className="sub-kv"><div className="k">Logo</div></div><ImageGallery images={[{ url: e.logo }]} alt="Logo" minTile={90} /></div>}
      {e.images?.length > 0 && <div style={{ marginTop: 14 }}><div className="sub-kv"><div className="k">Gallery</div></div><ImageGallery images={e.images} minTile={90} /></div>}
    </>
  );
  if (item.type === 'campaign') return (
    <>
      <div className="sub-grid">
        <KV k="Target">{money(e.targetAmount)}</KV>
        <KV k="Dates">{(e.startDate || e.endDate) && `${fmt(e.startDate)} – ${fmt(e.endDate)}`}</KV>
        <KV k="Video">{e.campaignVideo && <Link2 href={e.campaignVideo}>{e.campaignVideo}</Link2>}</KV>
        <KV k="SDG focus"><Sdgs ids={e.sdgIds} /></KV>
      </div>
      <KV k="Story"><span style={{ whiteSpace: 'pre-wrap' }}>{e.story}</span></KV>
      {(e.headerImage || e.images?.length > 0) && <div style={{ marginTop: 14 }}><div className="sub-kv"><div className="k">Images</div></div><ImageGallery images={[...(e.headerImage ? [{ url: e.headerImage, label: 'Header image' }] : []), ...(e.images || [])]} minTile={90} /></div>}
      {x.charity && (
        <div className="card" style={{ padding: 16, marginTop: 16, background: 'var(--glass)' }}>
          <div className="sub-kv"><div className="k">Submitter's charity (not yet on the platform)</div></div>
          <div style={{ fontFamily: 'var(--fd)', fontSize: 20, fontWeight: 600, marginBottom: 4 }}>{x.charity.name}</div>
          <div className="sub-grid" style={{ margin: '8px 0' }}>
            <KV k="Registration no.">{x.charity.registrationNo}</KV>
            <KV k="Website">{x.charity.websiteUrl && <Link2 href={x.charity.websiteUrl}>{x.charity.websiteUrl}</Link2>}</KV>
            <KV k="SDG focus"><Sdgs ids={x.charity.sdgIds} /></KV>
          </div>
          <KV k="Mission"><span style={{ whiteSpace: 'pre-wrap' }}>{x.charity.mission}</span></KV>
          {x.charity.logo && <div style={{ marginTop: 10 }}><ImageGallery images={[{ url: x.charity.logo }]} alt="Charity logo" minTile={70} /></div>}
        </div>
      )}
    </>
  );
  return (
    <>
      <div className="sub-grid">
        <KV k="Price">{money(e.basePrice)}</KV>
        <KV k="Edition">{e.editionType}</KV>
        <KV k="Category">{e.category}</KV>
        <KV k="Medium">{e.medium}</KV>
        <KV k="Year">{e.year}</KV>
        <KV k="Dimensions">{e.dimensions}</KV>
        <KV k="SDG focus"><Sdgs ids={e.sdgIds} /></KV>
      </div>
      <KV k="Description"><span style={{ whiteSpace: 'pre-wrap' }}>{e.description}</span></KV>
      {e.images?.length > 0 && <div style={{ marginTop: 14 }}><div className="sub-kv"><div className="k">Images</div></div><ImageGallery images={e.images} minTile={110} /></div>}
      {x.artist && (
        <div className="card" style={{ padding: 16, marginTop: 16, background: 'var(--glass)' }}>
          <div className="sub-kv"><div className="k">Submitter's artist details (not yet on the platform)</div></div>
          <div style={{ fontFamily: 'var(--fd)', fontSize: 20, fontWeight: 600, marginBottom: 4 }}>{x.artist.displayName}</div>
          <div className="sub-grid" style={{ margin: '8px 0' }}>
            <KV k="Location">{x.artist.location}</KV>
            <KV k="Website">{x.artist.websiteUrl && <Link2 href={x.artist.websiteUrl}>{x.artist.websiteUrl}</Link2>}</KV>
          </div>
          <KV k="Biography"><span style={{ whiteSpace: 'pre-wrap' }}>{x.artist.biography}</span></KV>
        </div>
      )}
    </>
  );
}

// The decision panel. A campaign needs a charity and an artwork needs an
// artist before it can go live — either an existing one or one created from
// what the submitter entered.
function ReviewPanel({ item, charities, artists, onDone }) {
  const { toast } = useCart();
  const [mode, setMode] = useState('existing');
  const [pick, setPick] = useState('');
  const [verified, setVerified] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  const needsLink = item.type !== 'charity';
  const newName = item.type === 'campaign' ? item.extra?.charity?.name : item.extra?.artist?.displayName;
  const canApprove = !needsLink || (mode === 'existing' ? !!pick : !!newName);

  const approve = async () => {
    const body = { note: note.trim() || undefined };
    if (item.type === 'charity') body.verified = verified;
    if (item.type === 'campaign') { if (mode === 'existing') body.charityId = pick; else body.createCharity = true; }
    if (item.type === 'artwork') { if (mode === 'existing') body.artistId = pick; else body.createArtist = true; }
    setBusy(true);
    try { await api.approveSubmission(item.type, item.id, body); toast(`${TYPE_LABEL[item.type]} approved — it's now live`, 'ok'); onDone(); }
    catch (e) { toast(e.message || 'Approve failed', 'err'); }
    finally { setBusy(false); }
  };
  const reject = async () => {
    setBusy(true);
    try { await api.rejectSubmission(item.type, item.id, { note: note.trim() || undefined }); toast('Rejected — it stays hidden', 'ok'); onDone(); }
    catch (e) { toast(e.message || 'Reject failed', 'err'); }
    finally { setBusy(false); }
  };

  return (
    <div className="sub-review" data-review-panel>
      {needsLink && (
        <div style={{ marginBottom: 14 }}>
          <div className="fl" style={{ marginBottom: 8 }}>{item.type === 'campaign' ? 'Which charity runs this campaign?' : 'Who is the artist?'}</div>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, fontSize: 14, flexWrap: 'wrap' }}>
            <input type="radio" name={`mode-${item.id}`} checked={mode === 'existing'} onChange={() => setMode('existing')} />
            {item.type === 'campaign' ? 'Link an existing charity' : 'Assign an existing artist'}
            <select className="fi fsel" disabled={mode !== 'existing'} value={pick} onChange={e => setPick(e.target.value)} style={{ maxWidth: 320, flex: '1 1 200px' }} aria-label="Existing">
              <option value="">— Choose —</option>
              {(item.type === 'campaign' ? charities : artists).map(o => <option key={o.id} value={o.id}>{o.name || o.displayName}</option>)}
            </select>
          </label>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, flexWrap: 'wrap' }}>
            <input type="radio" name={`mode-${item.id}`} checked={mode === 'new'} onChange={() => setMode('new')} />
            {item.type === 'campaign' ? 'Create a new charity from the submission' : 'Create a new artist from the submission'}
            {newName && <strong>“{newName}”</strong>}
          </label>
        </div>
      )}
      {item.type === 'charity' && (
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, marginBottom: 14 }}>
          <input type="checkbox" checked={verified} onChange={e => setVerified(e.target.checked)} /> Also mark as verified <span style={{ color: 'var(--muted)', fontSize: 12 }}>— shows the verified badge publicly</span>
        </label>
      )}
      <input className="fi" value={note} onChange={e => setNote(e.target.value)} placeholder="Internal note (optional, never shown to the submitter or public)" maxLength={500} style={{ marginBottom: 12 }} />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn btn-p" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} disabled={busy || !canApprove} onClick={approve}><Icon icon={Check} size="inline" /> Approve &amp; publish</button>
        {item.status === 'PENDING' && (rejecting
          ? <button className="btn btn-s" style={{ color: '#dc2626', display: 'inline-flex', alignItems: 'center', gap: 6 }} disabled={busy} onClick={reject}><Icon icon={X} size="inline" /> Confirm reject</button>
          : <button className="btn btn-s" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} disabled={busy} onClick={() => setRejecting(true)}><Icon icon={X} size="inline" /> Reject</button>)}
        {rejecting && <button className="btn btn-g" onClick={() => setRejecting(false)}>Cancel</button>}
      </div>
    </div>
  );
}

function ShareLinks() {
  const { toast } = useCart();
  const [links, setLinks] = useState(null);
  const [open, setOpen] = useState(false);
  const load = () => api.getSubmissionLinks().then(d => setLinks(d.links)).catch(e => toast(e.message || 'Could not load links', 'err'));
  useEffect(() => { if (open && !links) load(); }, [open]);
  const full = (l) => `${window.location.origin}${l.path}`;
  const copy = async (l) => { try { await navigator.clipboard.writeText(full(l)); toast(`${TYPE_LABEL[l.type]} link copied`, 'ok'); } catch { toast('Copy failed — select the link and copy it manually', 'err'); } };
  const rotate = async (l) => {
    if (!window.confirm(`Replace the ${TYPE_LABEL[l.type].toLowerCase()} link? The current link stops working immediately for everyone you've already sent it to.`)) return;
    try { const r = await api.rotateSubmissionLink(l.type); setLinks(ls => ls.map(x => (x.type === l.type ? { ...x, token: r.token, path: r.path } : x))); toast('New link created — the old one no longer works', 'ok'); }
    catch (e) { toast(e.message || 'Rotate failed', 'err'); }
  };
  return (
    <div className="card" style={{ padding: 18, marginBottom: 20 }}>
      <button className="btn btn-g" style={{ padding: 0, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }} onClick={() => setOpen(o => !o)} aria-expanded={open}>
        {open ? '▾' : '▸'} Private submission links
      </button>
      {open && (
        <div style={{ marginTop: 12 }}>
          <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12, lineHeight: 1.6 }}>
            Share these with the charities and artists you want to hear from. Each link is permanent and works for everyone you send it to, but it is never shown anywhere on the site.
            Everything submitted stays hidden until you approve it below. Replace a link only if it has leaked.
          </p>
          {!links ? <div className="skel" style={{ height: 60 }} /> : links.map(l => (
            <div key={l.type} data-link-row style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
              <div style={{ width: 84, fontSize: 12, fontWeight: 700 }}>{TYPE_LABEL[l.type]}</div>
              <input className="fi" readOnly value={full(l)} onFocus={e => e.target.select()} style={{ flex: '1 1 260px', minWidth: 0, fontFamily: 'var(--fm)', fontSize: 12 }} aria-label={`${TYPE_LABEL[l.type]} form link`} />
              <button className="btn btn-s btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }} onClick={() => copy(l)}><Icon icon={Copy} size="inline" /> Copy</button>
              <button className="btn btn-s btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }} onClick={() => rotate(l)}><Icon icon={RefreshCw} size="inline" /> Replace</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminSubmissions() {
  const { user } = useAuth();
  const { toast } = useCart();
  const navigate = useNavigate();
  const [status, setStatus] = useState('PENDING');
  const [type, setType] = useState('');
  const [items, setItems] = useState([]);
  const [counts, setCounts] = useState({ charity: 0, campaign: 0, artwork: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [charities, setCharities] = useState([]);
  const [artists, setArtists] = useState([]);
  const [reviewing, setReviewing] = useState(null);

  useEffect(() => { if (user && user.role !== 'ADMIN') navigate('/'); }, [user]);
  useEffect(() => {
    api.getAdminCharities({ limit: 200, submission: 'APPROVED' }).then(d => setCharities(d.items || [])).catch(() => {});
    api.getAdminArtists({ limit: 100 }).then(d => setArtists(d.items || [])).catch(() => {});
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    const q = { status }; if (type) q.type = type;
    Promise.all([api.getSubmissions(q), api.getSubmissionCount()])
      .then(([d, c]) => { setItems(d.items || []); setCounts(c); })
      .catch(e => toast(e.message || 'Failed to load submissions', 'err'))
      .finally(() => setLoading(false));
  }, [status, type]);
  useEffect(() => { load(); }, [load]);

  const done = () => { setReviewing(null); window.dispatchEvent(new Event('ft-submissions-changed')); load(); if (type !== 'charity') api.getAdminCharities({ limit: 200, submission: 'APPROVED' }).then(d => setCharities(d.items || [])).catch(() => {}); };
  const editPath = (it) => (it.type === 'charity' ? `/dashboard/admin/charities/${it.id}` : it.type === 'campaign' ? `/dashboard/admin/projects/${it.id}` : '/dashboard/products');

  return (
    <DashboardShell title="Submissions">
      <ShareLinks />

      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        {[['PENDING', `Pending${counts.total ? ` (${counts.total})` : ''}`], ['REJECTED', 'Rejected'], ['APPROVED', 'Approved']].map(([s, l]) => (
          <button key={s} className={`btn ${status === s ? 'btn-p' : 'btn-s'} btn-sm`} onClick={() => { setStatus(s); setReviewing(null); }}>{l}</button>
        ))}
        <div style={{ flex: 1 }} />
        <select className="fi fsel" value={type} onChange={e => setType(e.target.value)} style={{ width: 200 }} aria-label="Filter by type">
          <option value="">All types</option>
          {Object.keys(TYPE_LABEL).map(t => <option key={t} value={t}>{TYPE_PLURAL[t]}{status === 'PENDING' ? ` (${counts[t]})` : ''}</option>)}
        </select>
      </div>

      {loading ? <div>{[1, 2].map(i => <div key={i} className="skel" style={{ height: 120, borderRadius: 12, marginBottom: 12 }} />)}</div> : items.length === 0 ? (
        <div className="empty" style={{ padding: 48 }}>
          <div style={{ marginBottom: 12, opacity: .3, display: 'flex', justifyContent: 'center' }}><Icon icon={Inbox} size={40} /></div>
          <div className="empty-t">{status === 'PENDING' ? 'Nothing waiting for review' : `No ${status.toLowerCase()} submissions`}</div>
          {status === 'PENDING' && <p style={{ color: 'var(--muted)' }}>New submissions from your private links will appear here.</p>}
        </div>
      ) : items.map(it => (
        <div key={`${it.type}-${it.id}`} className="card sub-card" data-submission={it.type}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
                <span className="badge b-gold" style={{ fontSize: 10 }}>{TYPE_LABEL[it.type].toUpperCase()}</span>
                <span className={`badge ${STATUS_BADGE[it.status]}`} style={{ fontSize: 10 }}>{it.status}</span>
              </div>
              <h3 style={{ fontFamily: 'var(--fd)', fontSize: 24, fontWeight: 600, wordBreak: 'break-word' }}>{it.title}</h3>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                Submitted {fmt(it.submittedAt)} by <strong style={{ color: 'var(--txt)' }}>{it.contact?.name}</strong> · <a href={`mailto:${it.contact?.email}`} style={{ color: 'var(--accent)' }}>{it.contact?.email}</a>{it.contact?.phone && <> · {it.contact.phone}</>}
              </div>
              {it.reviewNote && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Note: {it.reviewNote}</div>}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {it.status === 'APPROVED' && <button className="btn btn-s btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }} onClick={() => navigate(editPath(it))}><Icon icon={ExternalLink} size="inline" /> Open</button>}
              {it.status !== 'APPROVED' && reviewing !== it.id && <button className="btn btn-p btn-sm" onClick={() => setReviewing(it.id)}>Review</button>}
            </div>
          </div>
          <Details item={it} />
          {reviewing === it.id && <ReviewPanel item={it} charities={charities} artists={artists} onDone={done} />}
        </div>
      ))}
    </DashboardShell>
  );
}
