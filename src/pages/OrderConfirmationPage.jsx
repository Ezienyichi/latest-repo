import { useLocation, useNavigate, Link } from 'react-router-dom';
import { SDGs } from '../data/constants';

function SdgDot({ id }) {
  const s = SDGs.find(x => x.id === id); if (!s) return null;
  return <span className="sdg" title={s.n} style={{ background: s.c, color: '#fff', width: 20, height: 20, fontSize: 9, borderRadius: 4 }}>{id}</span>;
}

export default function OrderConfirmationPage() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const order = state?.order;
  const summary = state?.summary;

  if (!order) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="empty"><div className="empty-t">No order found</div><button className="btn btn-p" onClick={() => navigate('/')}>Go Home</button></div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--base)', paddingBottom: 80 }}>
      {/* Success banner */}
      <div style={{ background: 'linear-gradient(135deg,#0d2318 0%,#1B4332 60%,#177c1d22 100%)', padding: '48px 0', textAlign: 'center' }}>
        <div className="wrap">
          <div style={{ fontSize: 56, marginBottom: 12, animation: 'pop .5s cubic-bezier(.34,1.56,.64,1)' }}>✅</div>
          <h1 style={{ fontFamily: 'var(--fd)', fontSize: 42, color: '#fff', fontWeight: 600, marginBottom: 8 }}>Order Confirmed!</h1>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,.6)', maxWidth: 460, margin: '0 auto' }}>
            Thank you for your purchase. Your order has been placed and you'll receive a confirmation email shortly.
          </p>
          <div style={{ fontFamily: 'var(--fm)', fontSize: 13, color: 'var(--gold)', marginTop: 14, letterSpacing: 1 }}>
            Order ID: {order.id?.slice(0, 16)}
          </div>
        </div>
      </div>

      <div className="wrap" style={{ paddingTop: 32, maxWidth: 800 }}>
        {/* Order items */}
        <div className="card" style={{ padding: 24, marginBottom: 20 }}>
          <h3 style={{ fontFamily: 'var(--fd)', fontSize: 22, marginBottom: 18 }}>Order Items</h3>
          {order.items?.map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: 14, padding: '14px 0', borderBottom: i < order.items.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ width: 68, height: 68, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: 'var(--glass)' }}>
                {item.product?.images?.[0]?.url ? <img src={item.product.images[0].url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', background: '#1B4332' }} />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 2, cursor: 'pointer', color: 'var(--txt)' }}
                  onClick={() => navigate(`/shop/${item.product?.slug}`)}>{item.product?.title}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>by {item.product?.artist?.displayName} × {item.quantity}</div>
                {item.product?.charity?.name && <div style={{ fontSize: 11, color: 'var(--sage)', marginTop: 2 }}>🌿 Supporting: {item.product.charity.name}</div>}
                {item.product?.autoCertificate && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 6, padding: '3px 10px', background: 'rgba(255,173,0,.08)', border: '1px solid rgba(255,173,0,.2)', borderRadius: 20, fontSize: 10, color: '#b37800', fontWeight: 600 }}>
                    🏛 Certificate: {item.product.certificateId}
                  </div>
                )}
              </div>
              <div style={{ fontFamily: 'var(--fd)', fontSize: 18, color: 'var(--accent)', fontWeight: 700, flexShrink: 0 }}>
                £{Number(item.unitPrice * item.quantity).toLocaleString()}
              </div>
            </div>
          ))}
        </div>

        {/* Payment summary */}
        <div className="card" style={{ padding: 24, marginBottom: 20 }}>
          <h3 style={{ fontFamily: 'var(--fd)', fontSize: 22, marginBottom: 16 }}>Payment Summary</h3>
          {summary && [
            ['Subtotal', `£${summary.subtotal?.toFixed(2)}`],
            ...(summary.discount > 0 ? [['Discount', `-£${summary.discount.toFixed(2)}`, 'var(--sage)']] : []),
            ['Platform fee', `£${summary.platformFee?.toFixed(2)}`],
            ['Charity contribution', `£${summary.charitySplit?.toFixed(2)}`],
            ['Shipping', summary.shipping === 0 ? 'Free' : `£${summary.shipping?.toFixed(2)}`],
          ].map(([k, v, c]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14 }}>
              <span style={{ color: 'var(--muted)' }}>{k}</span><span style={{ color: c || (v === 'Free' ? 'var(--sage)' : '') }}>{v}</span>
            </div>
          ))}
          <div style={{ borderTop: '2px solid var(--border)', marginTop: 10, paddingTop: 10, display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 16 }}>
            <span>Total Paid</span>
            <span style={{ fontFamily: 'var(--fd)', fontSize: 26, color: 'var(--accent)' }}>£{Number(order.totalAmount).toFixed(2)}</span>
          </div>
        </div>

        {/* Impact card */}
        <div className="card" style={{ padding: 24, marginBottom: 20, background: 'rgba(23,124,29,.04)', border: '1px solid rgba(23,124,29,.15)' }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <div style={{ fontSize: 36 }}>🌍</div>
            <div>
              <h3 style={{ fontFamily: 'var(--fd)', fontSize: 20, marginBottom: 4, color: 'var(--accent)' }}>Your Impact</h3>
              <p style={{ fontSize: 14, color: 'var(--txt2)', lineHeight: 1.6 }}>
                <strong>£{Number(order.charitySplit).toFixed(2)}</strong> from this order goes directly to verified charity projects supporting the UN Sustainable Development Goals.
              </p>
            </div>
          </div>
        </div>

        {/* Shipping info */}
        {order.shippingAddress && (
          <div className="card" style={{ padding: 24, marginBottom: 20 }}>
            <h3 style={{ fontFamily: 'var(--fd)', fontSize: 18, marginBottom: 10 }}>Shipping To</h3>
            <div style={{ fontSize: 14, color: 'var(--txt2)', lineHeight: 1.7 }}>
              <div>{order.shippingAddress.firstName} {order.shippingAddress.lastName}</div>
              <div>{order.shippingAddress.address1}</div>
              {order.shippingAddress.address2 && <div>{order.shippingAddress.address2}</div>}
              <div>{order.shippingAddress.city}, {order.shippingAddress.postcode}</div>
              <div>{order.shippingAddress.country}</div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 28 }}>
          <button className="btn btn-p btn-lg" onClick={() => navigate('/orders')}>View My Orders</button>
          <button className="btn btn-s btn-lg" onClick={() => navigate('/shop')}>Continue Shopping</button>
        </div>
      </div>
    </div>
  );
}
