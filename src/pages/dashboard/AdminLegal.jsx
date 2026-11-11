import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FileText, ArrowLeft, ExternalLink, Send } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import DashboardShell from './DashboardShell';
import Markdown from '../../components/ui/Markdown';
import Icon from '../../components/ui/Icon';
import api from '../../utils/api';
import { legalPath } from '../../data/legal';

const fmt = (d) => (d ? new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');

// Admin → Legal. Each page is versioned: publishing ADDS version n+1 and the
// old versions stay stored and viewable — nothing here can edit or delete one.
export default function AdminLegal() {
  const { slug } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (user && user.role !== 'ADMIN') navigate('/'); }, [user]);
  return slug ? <Editor slug={slug} /> : <List />;
}

function List() {
  const { toast } = useCart();
  const navigate = useNavigate();
  const [items, setItems] = useState(null);
  useEffect(() => { api.getAdminLegal().then(d => setItems(d.items)).catch(e => toast(e.message || 'Failed to load', 'err')); }, []);
  return (
    <DashboardShell title="Legal Pages">
      <p style={{ fontSize: 13, color: 'var(--muted)', maxWidth: 620, lineHeight: 1.65, marginBottom: 18 }}>
        The five legal pages shown at <code>/legal/…</code> and linked in the footer. Publishing a change creates a <strong>new version</strong>; earlier versions are kept and what each buyer, creator or charity accepted stays on record.
      </p>
      {!items ? <div className="skel" style={{ height: 200, borderRadius: 12 }} /> : items.map(d => (
        <div key={d.slug} className="card" data-legal-row={d.slug} style={{ padding: '16px 20px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 260px', minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 15 }}>{d.title}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>/legal/{d.slug}</div>
          </div>
          <div style={{ fontSize: 12 }}>
            {d.version ? <><span className="badge b-green" style={{ fontSize: 10 }}>v{d.version}</span> <span style={{ color: 'var(--muted)' }}>published {fmt(d.publishedAt)} · {d.versionCount} version{d.versionCount > 1 ? 's' : ''}</span></> : <span className="badge b-gold" style={{ fontSize: 10 }}>NOT PUBLISHED</span>}
          </div>
          <button className="btn btn-p btn-sm" onClick={() => navigate(`/dashboard/admin/legal/${d.slug}`)}>{d.version ? 'Edit' : 'Write'}</button>
        </div>
      ))}
    </DashboardShell>
  );
}

function Editor({ slug }) {
  const { toast } = useCart();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [body, setBody] = useState('');
  const [note, setNote] = useState('');
  const [tab, setTab] = useState('write');
  const [viewing, setViewing] = useState(null);   // an old version being read
  const [busy, setBusy] = useState(false);

  const load = () => api.getAdminLegalDoc(slug).then(d => { setData(d); setBody(d.current?.body || ''); })
    .catch(e => { toast(e.message || 'Failed to load', 'err'); navigate('/dashboard/admin/legal'); });
  useEffect(() => { load(); }, [slug]);

  if (!data) return <DashboardShell title="Legal Pages"><div className="skel" style={{ height: 320, borderRadius: 12 }} /></DashboardShell>;
  const cur = data.current; const next = (cur?.version || 0) + 1;
  const unchanged = body.replace(/\r\n/g, '\n').trim() === (cur?.body || '').trim();

  const publish = async () => {
    if (!window.confirm(`Publish version ${next} of "${data.title}"?\n\nIt goes live immediately.${cur ? ` Version ${cur.version} is kept.` : ''}`)) return;
    setBusy(true);
    try { const r = await api.publishLegal(slug, body, note.trim() || undefined); toast(`Version ${r.version} published — live now`, 'ok'); setNote(''); setViewing(null); await load(); }
    catch (e) { toast(e.message || 'Publish failed', 'err'); }
    finally { setBusy(false); }
  };
  const openVersion = async (n) => { try { setViewing(await api.getAdminLegalVersion(slug, n)); } catch (e) { toast(e.message || 'Could not load that version', 'err'); } };

  return (
    <DashboardShell title={data.title}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
        <button className="btn btn-g" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={() => navigate('/dashboard/admin/legal')}><Icon icon={ArrowLeft} size="inline" /> All legal pages</button>
        {cur && <a className="btn btn-s btn-sm" href={legalPath(slug)} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}><Icon icon={ExternalLink} size="inline" /> View live page</a>}
      </div>

      <div className="card" style={{ padding: 22, marginBottom: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
          <div style={{ fontSize: 13 }}>{cur ? <>Live: <strong data-live-version>version {cur.version}</strong> <span style={{ color: 'var(--muted)' }}>· {fmt(cur.publishedAt)}</span></> : <strong>Not published yet</strong>}</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {['write', 'preview'].map(t => <button key={t} className={`btn btn-sm ${tab === t ? 'btn-p' : 'btn-s'}`} onClick={() => setTab(t)} style={{ textTransform: 'capitalize' }}>{t}</button>)}
          </div>
        </div>
        {tab === 'write'
          ? <textarea className="fi" data-legal-editor value={body} onChange={e => setBody(e.target.value)} rows={26} spellCheck style={{ fontFamily: 'var(--fm)', fontSize: 13, lineHeight: 1.6, width: '100%' }} placeholder="Paste or write the page in Markdown. Use ## for section headings and | tables | like | this |." />
          : <div data-legal-preview style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 20, maxHeight: 560, overflow: 'auto' }}>{body.trim() ? <Markdown className="legal-doc">{body}</Markdown> : <span style={{ color: 'var(--muted)' }}>Nothing to preview yet.</span>}</div>}
        <div className="fg" style={{ marginTop: 14 }}>
          <label className="fl">What changed? <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(optional · shown in the version history)</span></label>
          <input className="fi" value={note} onChange={e => setNote(e.target.value)} maxLength={300} data-legal-note placeholder="e.g. Updated refund window to 30 days" />
        </div>
        <button className="btn btn-p btn-lg" data-publish style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }} onClick={publish} disabled={busy || !body.trim() || unchanged}>
          <Icon icon={Send} size="inline" /> {busy ? 'Publishing…' : `Publish as version ${next}`}
        </button>
        {cur && unchanged && <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 12 }}>No changes yet.</span>}
      </div>

      <div className="card" data-legal-history style={{ padding: 22 }}>
        <h3 style={{ fontFamily: 'var(--fd)', fontSize: 20, marginBottom: 12 }}>Version history</h3>
        {data.versions.length === 0 ? <p style={{ color: 'var(--muted)', fontSize: 13 }}>No versions yet.</p> : (
          <table className="tbl">
            <thead><tr><th>Version</th><th>Published</th><th>Note</th><th></th></tr></thead>
            <tbody>
              {data.versions.map(v => (
                <tr key={v.version} data-version={v.version}>
                  <td><span className={`badge ${v.version === cur.version ? 'b-green' : 'b-muted'}`} style={{ fontSize: 10 }}>v{v.version}{v.version === cur.version ? ' · live' : ''}</span></td>
                  <td style={{ fontSize: 12 }}>{fmt(v.publishedAt)}</td>
                  <td style={{ fontSize: 12, color: 'var(--muted)' }}>{v.changeNote || '—'}</td>
                  <td style={{ textAlign: 'right' }}><button className="btn btn-s btn-sm" onClick={() => openVersion(v.version)}>View</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {viewing && (
          <div data-version-view style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
              <strong>Version {viewing.version} <span style={{ fontWeight: 400, color: 'var(--muted)' }}>· read-only · {fmt(viewing.publishedAt)}</span></strong>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-s btn-sm" onClick={() => { setBody(viewing.body); setTab('write'); window.scrollTo({ top: 0, behavior: 'smooth' }); toast(`Loaded version ${viewing.version} into the editor — publish to make it the new version`, 'info'); }}>Start a new version from this</button>
                <button className="btn btn-g btn-sm" onClick={() => setViewing(null)}>Close</button>
              </div>
            </div>
            <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 20, maxHeight: 420, overflow: 'auto' }}><Markdown className="legal-doc">{viewing.body}</Markdown></div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
