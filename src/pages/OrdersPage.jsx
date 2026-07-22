import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Package, ArrowRight, Award } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import api from '../utils/api';
import Icon from '../components/ui/Icon';

const STATUS_STYLES = {
  PENDING: { bg: 'rgba(255,173,0,.08)', border: 'rgba(255,173,0,.2)', color: '#b37800', label: 'Pending' },
  PROCESSING: { bg: 'rgba(59,130,246,.08)', border: 'rgba(59,130,246,.18)', color: '#3b82f6', label: 'Processing' },
  SHIPPED: { bg: 'rgba(139,92,246,.08)', border: 'rgba(139,92,246,.18)', color: '#8b5cf6', label: 'Shipped' },
  DELIVERED: { bg: 'rgba(23,124,29,.08)', border: 'rgba(23,124,29,.18)', color: '#177c1d', label: 'Delivered' },
  CANCELLED: { bg: 'rgba(220,38,38,.08)', border: 'rgba(220,38,38,.18)', color: '#dc2626', label: 'Cancelled' },
  REFUNDED: { bg: 'rgba(107,114,128,.08)', border: 'rgba(107,114,128,.18)', color: '#6b7280', label: 'Refunded' },
};

export default function OrdersPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useCart();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    api.getOrders().then(setOrders).catch(() => toast('Failed to load orders', 'err')).finally(() => setLoading(false));
  }, [user]);

  if (loading) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div>{[1,2,3].map(i => <div key={i} className="skel" style={{ height: 100, borderRadius: 'var(--rl)', marginBottom: 12, maxWidth: 700 }} />)}</div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--base)', paddingBottom: 80 }}>
      <div style={{ padding: '48px 48px 28px', borderBottom: '1px solid var(--border)' }}>
        <div className="wrap">
          <div className="breadcrumbs"><Link to="/">Home</Link><span className="sep">›</span><span className="current">My Orders</span></div>
          <h1 className="display" style={{ fontSize: 44 }}>Order History</h1>
          <p style={{ fontSize: 14, color: 'var(--muted)', marginTop: 6 }}>{orders.length} order{orders.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className="wrap" style={{ paddingTop: 28, maxWidth: 800 }}>
        {orders.length === 0 ? (
          <div className="empty">
            <div style={{ marginBottom: 16, opacity: .3, display: 'flex', justifyContent: 'center' }}><Icon icon={Package} size={48} /></div>
            <div className="empty-t">No orders yet</div>
            <p style={{ color: 'var(--muted)', marginBottom: 24 }}>Start collecting art that makes a difference</p>
            <button className="btn btn-p btn-lg" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={() => navigate('/shop')}>Browse Artworks <Icon icon={ArrowRight} size="inline" /></button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {orders.map(order => {
              const st = STATUS_STYLES[order.status] || STATUS_STYLES.PENDING;
              const isOpen = expanded === order.id;
              return (
                <div key={order.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  {/* Order header */}
                  <div style={{ padding: '16px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: 'background .15s' }}
                    onClick={() => setExpanded(isOpen ? null : order.id)}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--glass)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <div>
                      <div style={{ fontFamily: 'var(--fm)', fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>{order.id.slice(0, 16)}</div>
                      <div style={{ fontFamily: 'var(--fd)', fontSize: 18, fontWeight: 600 }}>{order.items?.length} item{order.items?.length !== 1 ? 's' : ''}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: 'var(--fd)', fontSize: 22, color: 'var(--accent)', fontWeight: 700 }}>£{Number(order.totalAmount).toFixed(2)}</div>
                        <div className="badge" style={{ background: st.bg, border: `1px solid ${st.border}`, color: st.color, marginTop: 4 }}>{st.label}</div>
                      </div>
                      <span style={{ fontSize: 18, color: 'var(--muted)', transition: 'transform .2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0)' }}>▾</span>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isOpen && (
                    <div style={{ padding: '0 22px 20px', borderTop: '1px solid var(--border)', animation: 'fadeUp .2s ease' }}>
                      {order.items?.map((item, i) => (
                        <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: i < order.items.length - 1 ? '1px solid var(--border)' : 'none' }}>
                          <div style={{ width: 56, height: 56, borderRadius: 6, overflow: 'hidden', flexShrink: 0, cursor: 'pointer', background: 'var(--glass)' }}
                            onClick={() => item.product?.slug && navigate(`/shop/${item.product.slug}`)}>
                            {item.product?.images?.[0]?.url ? <img src={item.product.images[0].url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', background: '#1B4332' }} />}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, fontWeight: 500 }}>{item.product?.title}</div>
                            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{item.product?.artist?.displayName} × {item.quantity}</div>
                            {item.product?.autoCertificate && item.product?.certificateId && (
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4, padding: '2px 8px', background: 'rgba(255,173,0,.08)', border: '1px solid rgba(255,173,0,.18)', borderRadius: 14, fontSize: 10, color: '#b37800', cursor: 'pointer' }}
                                onClick={() => toast('Certificate download ready!', 'info')}>
                                <Icon icon={Award} size="inline" /> Download Certificate
                              </div>
                            )}
                          </div>
                          <div style={{ fontFamily: 'var(--fd)', fontSize: 16, color: 'var(--accent)', fontWeight: 700, flexShrink: 0 }}>
                            £{(Number(item.unitPrice) * item.quantity).toFixed(2)}
                          </div>
                        </div>
                      ))}
                      
                      {/* Order totals */}
                      <div style={{ marginTop: 14, paddingTop: 10, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--muted)' }}>
                        <span>Shipping: {Number(order.shippingAmount) === 0 ? 'Free' : `£${Number(order.shippingAmount).toFixed(2)}`}</span>
                        <span>Platform: £{Number(order.platformFee).toFixed(2)}</span>
                        <span style={{ color: 'var(--sage)' }}>Charity: £{Number(order.charitySplit).toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
