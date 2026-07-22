import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShoppingCart, ArrowRight, ArrowLeft, Palette, Leaf, Truck, Check, Lock, CreditCard, Award } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import Icon from '../components/ui/Icon';

export default function CartPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cart, removeFromCart, updateQty, cartTotal, toast } = useCart();
  const [coupon, setCoupon] = useState('');
  const [discount, setDiscount] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);

  const shipping = cartTotal > 500 ? 0 : 12.99;
  const discountAmt = discount?.discount || 0;
  const afterDiscount = cartTotal - discountAmt;
  const platformFee = afterDiscount * 0.1;
  const charitySplit = afterDiscount * 0.1;
  const grandTotal = afterDiscount + shipping;

  const applyCoupon = async () => {
    if (!coupon.trim()) return;
    setCouponLoading(true);
    try {
      const res = await api.post('/orders/validate-coupon', { code: coupon, subtotal: cartTotal });
      setDiscount(res);
      toast(`Coupon applied! You save £${res.discount.toFixed(2)}`, 'ok');
    } catch (e) { toast(e.message, 'err'); setDiscount(null); }
    finally { setCouponLoading(false); }
  };

  const proceedToCheckout = () => {
    if (!user) { toast('Please sign in to checkout', 'info'); navigate('/login'); return; }
    navigate('/checkout', { state: { discount: discountAmt, couponCode: discount?.code } });
  };

  if (cart.length === 0) return (
    <div style={{ minHeight: '70vh', background: 'var(--base)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="empty">
        <div style={{ marginBottom: 16, opacity: .3, display: 'flex', justifyContent: 'center' }}><Icon icon={ShoppingCart} size={48} /></div>
        <div className="empty-t">Your cart is empty</div>
        <p style={{ color: 'var(--muted)', marginBottom: 24 }}>Discover art that makes a difference</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button className="btn btn-p btn-lg" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={() => navigate('/shop')}>Browse Artworks <Icon icon={ArrowRight} size="inline" /></button>
          <button className="btn btn-s btn-lg" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={() => navigate('/digitals')}>Digital Store <Icon icon={ArrowRight} size="inline" /></button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--base)', paddingBottom: 80 }}>
      <div style={{ padding: '48px 48px 28px', borderBottom: '1px solid var(--border)' }}>
        <div className="wrap">
          <div className="breadcrumbs"><Link to="/">Home</Link><span className="sep">›</span><span className="current">Cart ({cart.length} item{cart.length !== 1 ? 's' : ''})</span></div>
          <div className="back" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, cursor: 'pointer' }} onClick={() => navigate('/shop')}><Icon icon={ArrowLeft} size="inline" /> Continue Shopping</div>
          <h1 className="display" style={{ fontSize: 44 }}>Your Cart</h1>
        </div>
      </div>
      <div className="wrap" style={{ paddingTop: 28 }}>
        <div className="detail-layout" style={{ gap: 28 }}>
          {/* Items */}
          <div>
            {cart.map(item => (
              <div key={item.id} className="card" style={{ display: 'flex', gap: 18, marginBottom: 12, padding: 18, animation: 'fadeUp .3s ease' }}>
                <div style={{ width: 96, height: 96, borderRadius: 'var(--r)', overflow: 'hidden', flexShrink: 0, background: 'var(--glass)', cursor: 'pointer' }}
                  onClick={() => navigate(`/shop/${item.slug}`)}>
                  {item.image ? <img src={item.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', background: '#1B4332', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: .3 }}><Icon icon={Palette} size={24} /></div>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--fd)', fontSize: 18, fontWeight: 600, marginBottom: 3, cursor: 'pointer' }} onClick={() => navigate(`/shop/${item.slug}`)}>{item.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 3 }}>by {item.artist}</div>
                  {item.variation && <div style={{ fontSize: 11, color: 'var(--accent)', marginBottom: 3 }}>{Object.values(item.variation.attributeCombination || item.variation.attrs || {}).join(' · ')}</div>}
                  {item.charityName && <div style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}><Icon icon={Leaf} size="inline" style={{ color: 'var(--sage)' }} /> Supporting: {item.charityName}</div>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10, flexShrink: 0 }}>
                  <span style={{ fontFamily: 'var(--fd)', fontSize: 20, color: 'var(--accent)', fontWeight: 700 }}>£{(item.price * item.qty).toLocaleString()}</span>
                  <div className="qty">
                    <button className="qty-b" onClick={() => updateQty(item.id, item.qty - 1)}>−</button>
                    <input className="qty-i" type="number" value={item.qty} min={1} readOnly />
                    <button className="qty-b" onClick={() => updateQty(item.id, item.qty + 1)}>+</button>
                  </div>
                  <button className="btn btn-danger btn-sm" onClick={() => removeFromCart(item.id)}>Remove</button>
                </div>
              </div>
            ))}

            {/* Free shipping nudge */}
            {cartTotal < 500 && cartTotal > 300 && (
              <div className="alert alert-i" style={{ marginTop: 12 }}>
                <Icon icon={Truck} size="inline" />
                <div>Add <strong>£{(500 - cartTotal).toFixed(2)}</strong> more for <strong>free shipping</strong>!</div>
              </div>
            )}
          </div>

          {/* Summary */}
          <div style={{ position: 'sticky', top: 90 }}>
            <div className="card" style={{ padding: 24 }}>
              <h3 style={{ fontFamily: 'var(--fd)', fontSize: 22, fontWeight: 600, marginBottom: 20 }}>Order Summary</h3>
              
              {[
                ['Subtotal', `£${cartTotal.toFixed(2)}`],
                ...(discountAmt > 0 ? [['Discount (' + discount.code + ')', `-£${discountAmt.toFixed(2)}`, 'var(--sage)']] : []),
                ['Platform fee (10%)', `£${platformFee.toFixed(2)}`],
                ['Charity contribution (10%)', `£${charitySplit.toFixed(2)}`],
                ['Shipping', shipping === 0 ? 'Free' : `£${shipping.toFixed(2)}`],
              ].map(([k, v, color]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 14 }}>
                  <span style={{ color: 'var(--muted)' }}>{k}</span>
                  <span style={{ color: color || (v === 'Free' ? 'var(--sage)' : '') }}>{v}</span>
                </div>
              ))}

              <div style={{ borderTop: '2px solid var(--border)', marginTop: 14, paddingTop: 14, display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: 16 }}>
                <span>Total</span>
                <span style={{ fontFamily: 'var(--fd)', fontSize: 26, color: 'var(--accent)' }}>£{grandTotal.toFixed(2)}</span>
              </div>

              {/* Coupon code */}
              <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                <div className="fl" style={{ marginBottom: 6 }}>Coupon Code</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input className="fi" value={coupon} onChange={e => setCoupon(e.target.value)} placeholder="Enter code"
                    style={{ flex: 1, fontSize: 13, fontFamily: 'var(--fm)', textTransform: 'uppercase' }}
                    onKeyDown={e => e.key === 'Enter' && applyCoupon()} />
                  <button className="btn btn-s btn-sm" onClick={applyCoupon} disabled={couponLoading}>
                    {couponLoading ? '...' : 'Apply'}
                  </button>
                </div>
                {discount && <div style={{ fontSize: 11, color: 'var(--sage)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}><Icon icon={Check} size="inline" /> {discount.code} — saving £{discount.discount.toFixed(2)}</div>}
                <div style={{ fontSize: 10, color: 'var(--subtle)', marginTop: 4 }}>Try: IMPACT10, WELCOME15, ARTFREE</div>
              </div>

              <button className="btn btn-p btn-lg" style={{ width: '100%', justifyContent: 'center', marginTop: 18, display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={proceedToCheckout}>
                Proceed to Checkout <Icon icon={ArrowRight} size="inline" />
              </button>

              {/* Trust badges */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 14, fontSize: 11, color: 'var(--muted)' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon icon={Lock} size="inline" /> Secure</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon icon={CreditCard} size="inline" /> Stripe</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon icon={Award} size="inline" /> Certified</span>
              </div>
            </div>

            {/* Impact summary */}
            <div className="card" style={{ padding: 18, marginTop: 12, background: 'rgba(23,124,29,.04)', border: '1px solid rgba(23,124,29,.12)' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}><Icon icon={Leaf} size="inline" /> Your Impact</div>
              <div style={{ fontSize: 13, color: 'var(--txt2)', lineHeight: 1.65 }}>
                This purchase directs <strong style={{ color: 'var(--accent)' }}>£{charitySplit.toFixed(2)}</strong> to verified charity projects aligned with the UN Sustainable Development Goals.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
