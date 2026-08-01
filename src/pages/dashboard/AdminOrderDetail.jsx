import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { FRAMED_CATEGORIES } from '../../data/constants';
import DashboardShell from './DashboardShell';
import Icon from '../../components/ui/Icon';
import api from '../../utils/api';

const STATUS_STYLES = {
  PENDING: { bg: 'rgba(255,173,0,.08)', border: 'rgba(255,173,0,.2)', color: '#b37800' },
  PROCESSING: { bg: 'rgba(59,130,246,.08)', border: 'rgba(59,130,246,.18)', color: '#3b82f6' },
  SHIPPED: { bg: 'rgba(139,92,246,.08)', border: 'rgba(139,92,246,.18)', color: '#8b5cf6' },
  DELIVERED: { bg: 'rgba(23,124,29,.08)', border: 'rgba(23,124,29,.18)', color: '#177c1d' },
  CANCELLED: { bg: 'rgba(220,38,38,.08)', border: 'rgba(220,38,38,.18)', color: '#dc2626' },
  REFUNDED: { bg: 'rgba(107,114,128,.08)', border: 'rgba(107,114,128,.18)', color: '#6b7280' },
};
const STATUSES = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'];

function Field({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 14 }}>{value || '—'}</div>
    </div>
  );
}

export default function AdminOrderDetail() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useCart();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newStatus, setNewStatus] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (user && user.role !== 'ADMIN') navigate('/'); }, [user]);

  const load = () => {
    setLoading(true);
    api.getAdminOrder(id).then(o => { setOrder(o); setNewStatus(o.status); }).catch(() => toast('Failed to load order', 'err')).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const updateStatus = async () => {
    if (newStatus === order.status) return;
    setSaving(true);
    try {
      await api.updateOrderStatus(id, newStatus);
      toast(`Status changed to ${newStatus}`, 'ok');
      load();
    } catch (e) { toast(e.message, 'err'); }
    finally { setSaving(false); }
  };

  if (loading) return <DashboardShell title="Order"><div className="skel" style={{ height: 400, borderRadius: 'var(--rl)' }} /></DashboardShell>;
  if (!order) return <DashboardShell title="Order"><div className="empty" style={{ padding: 48 }}><div className="empty-t">Order not found</div></div></DashboardShell>;

  const st = STATUS_STYLES[order.status] || STATUS_STYLES.PENDING;
  const addr = order.shippingAddress || {};

  return (
    <DashboardShell title="Order Detail">
      <button className="btn btn-g" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 18 }} onClick={() => navigate('/dashboard/admin/orders')}>
        <Icon icon={ArrowLeft} size="inline" /> Back to Orders
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14, marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: 'var(--fm)', fontSize: 12, color: 'var(--muted)' }}>{order.id}</div>
          <div style={{ fontFamily: 'var(--fd)', fontSize: 26, fontWeight: 700, marginTop: 4 }}>£{Number(order.totalAmount).toFixed(2)}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Placed {new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
        </div>
        <div className="card" style={{ padding: 16, minWidth: 260 }}>
          <div className="fl" style={{ marginBottom: 8 }}>Status</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className="badge" style={{ background: st.bg, border: `1px solid ${st.border}`, color: st.color }}>{order.status}</span>
            <select className="fi fsel" value={newStatus} onChange={e => setNewStatus(e.target.value)} style={{ flex: 1 }}>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button className="btn btn-p btn-sm" disabled={saving || newStatus === order.status} onClick={updateStatus} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Icon icon={Save} size="inline" /> Update
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>Buyer</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="Name" value={order.buyer ? `${order.buyer.firstName || ''} ${order.buyer.lastName || ''}`.trim() || 'Guest' : `${addr.firstName || ''} ${addr.lastName || ''}`.trim() || 'Guest'} />
            <Field label="Email" value={order.buyer?.email || order.buyerEmail} />
            <Field label="Phone" value={order.buyer?.phone || addr.phone} />
            <Field label="Account" value={order.buyer ? 'Registered' : 'Guest checkout'} />
          </div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>Shipping Address</h3>
          {order.shippingAddress ? (
            <div style={{ fontSize: 13, lineHeight: 1.7 }}>
              <div>{addr.firstName} {addr.lastName}</div>
              <div>{addr.address1}</div>
              {addr.address2 && <div>{addr.address2}</div>}
              <div>{addr.city}, {addr.postcode}</div>
              <div>{addr.country}</div>
            </div>
          ) : <div style={{ fontSize: 13, color: 'var(--muted)' }}>No shipping address on file</div>}
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
        <table className="tbl">
          <thead><tr><th></th><th>Product</th><th>Qty</th><th>Unit Price</th><th>Line Total</th><th>Charity Split</th><th>Platform Fee</th><th>Artist Payout</th></tr></thead>
          <tbody>
            {order.items.map(item => (
              <tr key={item.id}>
                <td style={{ width: 48 }}>
                  <div className={FRAMED_CATEGORIES.includes(item.product?.category) ? 'pf-contain' : ''} style={{ width: 40, height: 40, borderRadius: 6, overflow: 'hidden', background: 'var(--glass)' }}>
                    {item.product?.images?.[0]?.url ? <img src={item.product.images[0].url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', background: '#1B4332' }} />}
                  </div>
                </td>
                <td>
                  <div style={{ fontWeight: 500 }}>{item.product?.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{item.product?.artist?.displayName} · {item.product?.charity?.name || 'Unaffiliated'}</div>
                </td>
                <td>{item.quantity}</td>
                <td>£{Number(item.unitPrice).toFixed(2)}</td>
                <td style={{ fontWeight: 600 }}>£{Number(item.lineTotal).toFixed(2)}</td>
                <td style={{ color: 'var(--sage)' }}>£{Number(item.charitySplitAmt).toFixed(2)}</td>
                <td style={{ color: 'var(--gold)' }}>£{Number(item.platformFeeAmt).toFixed(2)}</td>
                <td style={{ color: 'var(--accent)', fontWeight: 600 }}>£{Number(item.artistPayout).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card" style={{ padding: 20, maxWidth: 360, marginLeft: 'auto' }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>Order Totals</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--muted)' }}>Shipping</span><span>{Number(order.shippingAmount) === 0 ? 'Free' : `£${Number(order.shippingAmount).toFixed(2)}`}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--muted)' }}>Platform Fee</span><span>£{Number(order.platformFee).toFixed(2)}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--sage)' }}>Charity Split</span><span style={{ color: 'var(--sage)' }}>£{Number(order.charitySplit).toFixed(2)}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid var(--border)', fontFamily: 'var(--fd)', fontWeight: 700, fontSize: 16 }}><span>Total</span><span style={{ color: 'var(--accent)' }}>£{Number(order.totalAmount).toFixed(2)}</span></div>
        </div>
      </div>
    </DashboardShell>
  );
}
