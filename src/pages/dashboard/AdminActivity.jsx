import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import DashboardShell from './DashboardShell';
import api from '../../utils/api';

const when = (d) => new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const nameOf = (a) => [a.firstName, a.lastName].filter(Boolean).join(' ') || a.email;
const detail = (r) => {
  const bits = [];
  if (r.before?.status && r.after?.status) bits.push(`${r.before.status} → ${r.after.status}`);
  else if (r.after?.title) bits.push(r.after.title);
  else if (r.after?.name) bits.push(r.after.name);
  else if (r.after?.email) bits.push(r.after.email);
  return bits.join(' · ');
};

// Admin → Activity (owner only): who did what, newest first. Names the person behind each action.
export default function AdminActivity() {
  const { user } = useAuth();
  const { toast } = useCart();
  const navigate = useNavigate();
  useEffect(() => { if (user && user.role !== 'ADMIN') navigate('/'); }, [user]);
  const [data, setData] = useState(null);
  const [people, setPeople] = useState([]);
  const [who, setWho] = useState('');
  const [page, setPage] = useState(1);
  useEffect(() => { api.getAdminUsers({ role: 'STAFF', limit: 100 }).then(d => setPeople(d.users || [])).catch(() => {}); }, []);
  useEffect(() => {
    setData(null);
    api.getAuditLog({ page, limit: 40, ...(who && { adminId: who }) }).then(setData).catch(e => toast(e.message || 'Failed to load', 'err'));
  }, [who, page]);

  return (
    <DashboardShell title="Activity">
      <p style={{ fontSize: 13, color: 'var(--muted)', maxWidth: 620, lineHeight: 1.65, marginBottom: 14 }}>Every change made in the admin area, with the person who made it. Passwords are never recorded.</p>
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <select className="fi fsel" value={who} onChange={e => { setWho(e.target.value); setPage(1); }} style={{ maxWidth: 260 }} aria-label="Filter by person" data-activity-filter>
          <option value="">Everyone</option>
          <option value={user?.id}>Me (owner)</option>
          {people.map(p => <option key={p.id} value={p.id}>{nameOf(p)} (staff)</option>)}
        </select>
      </div>
      {!data ? <div className="skel" style={{ height: 220, borderRadius: 12 }} /> : (
        <div className="card" style={{ padding: 0, overflow: 'auto' }}>
          <table className="tbl" style={{ minWidth: 620 }}>
            <thead><tr><th>When</th><th>Who</th><th>Action</th><th>Detail</th></tr></thead>
            <tbody>
              {data.items.length === 0 && <tr><td colSpan={4} style={{ color: 'var(--muted)', padding: 24 }}>Nothing recorded yet.</td></tr>}
              {data.items.map(r => (
                <tr key={r.id} data-audit-row={r.action}>
                  <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{when(r.createdAt)}</td>
                  <td><div style={{ fontWeight: 500 }}>{nameOf(r.admin)}</div><div style={{ fontSize: 11, color: 'var(--muted)' }}><span className={`badge ${r.admin.role === 'STAFF' ? 'b-gold' : 'b-red'}`} style={{ fontSize: 9 }}>{r.admin.role}</span> {r.admin.email}</div></td>
                  <td style={{ fontSize: 12.5 }}><code>{r.action}</code><div style={{ fontSize: 11, color: 'var(--muted)' }}>{r.targetType}</div></td>
                  <td style={{ fontSize: 12.5, overflowWrap: 'anywhere' }}>{detail(r)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && data.pages > 1 && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 12 }}>
          <button className="btn btn-s btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>Page {data.page} of {data.pages}</span>
          <button className="btn btn-s btn-sm" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      )}
    </DashboardShell>
  );
}
