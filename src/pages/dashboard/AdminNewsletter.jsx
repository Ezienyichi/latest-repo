import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Download } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import DashboardShell from './DashboardShell';
import Icon from '../../components/ui/Icon';
import api from '../../utils/api';

export default function AdminNewsletter() {
  const { user } = useAuth();
  const { toast } = useCart();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => { if (user && user.role !== 'ADMIN') navigate('/'); }, [user]);

  const load = (p = 1) => {
    setLoading(true);
    api.getAdminNewsletter({ page: p, limit: 25 }).then(d => {
      setItems(d.items || []); setTotal(d.total || 0); setPages(d.pages || 1); setPage(d.page || 1);
    }).catch(e => toast(e.message || 'Failed to load subscribers', 'err')).finally(() => setLoading(false));
  };

  useEffect(() => { load(1); }, []);

  const download = async () => {
    setExporting(true);
    try { await api.downloadNewsletterCsv(); }
    catch (e) { toast(e.message || 'Export failed', 'err'); }
    finally { setExporting(false); }
  };

  return (
    <DashboardShell title="Newsletter">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ fontSize: 13, color: 'var(--muted)' }}><strong style={{ color: 'var(--txt)', fontSize: 18 }}>{total}</strong> subscriber{total !== 1 ? 's' : ''}</div>
        <button className="btn btn-s" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={download} disabled={exporting || total === 0}>
          <Icon icon={Download} size="inline" /> {exporting ? 'Preparing…' : 'Download CSV'}
        </button>
      </div>

      {loading ? <div>{[1, 2, 3].map(i => <div key={i} className="skel" style={{ height: 48, borderRadius: 8, marginBottom: 8 }} />)}</div> : items.length === 0 ? (
        <div className="empty" style={{ padding: 48 }}>
          <div style={{ marginBottom: 12, opacity: .3, display: 'flex', justifyContent: 'center' }}><Icon icon={Mail} size={40} /></div>
          <div className="empty-t">No subscribers yet</div>
          <p style={{ color: 'var(--muted)' }}>Signups from the homepage form and the popup will appear here</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'auto' }}>
          <table className="tbl">
            <thead><tr><th>Email</th><th>Source</th><th>Signed up</th></tr></thead>
            <tbody>
              {items.map(s => (
                <tr key={s.id}>
                  <td style={{ fontSize: 13, wordBreak: 'break-all' }}>{s.email}</td>
                  <td><span className={`badge ${s.source === 'popup' ? 'b-blue' : 'b-green'}`} style={{ fontSize: 10 }}>{s.source}</span></td>
                  <td style={{ fontSize: 12 }}>{new Date(s.createdAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, alignItems: 'center', marginTop: 14 }}>
          <button className="btn btn-s btn-sm" disabled={page <= 1} onClick={() => load(page - 1)}>Previous</button>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>Page {page} of {pages}</span>
          <button className="btn btn-s btn-sm" disabled={page >= pages} onClick={() => load(page + 1)}>Next</button>
        </div>
      )}
    </DashboardShell>
  );
}
