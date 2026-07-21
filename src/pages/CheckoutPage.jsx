import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

// Matches the backend fallback in functions/_lib/split.js — used only until
// the real rates load, so the numbers never visibly jump for the common
// case where the admin hasn't changed them from the default.
const DEFAULT_RATES = { charity_pct: 0.10, platform_pct: 0.10 };

export default function CheckoutPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { cart, cartTotal, clearCart, toast } = useCart();
  const [step, setStep] = useState(1); // 1: shipping, 2: payment, 3: review
  const [loading, setLoading] = useState(false);
  const [shipping, setShipping] = useState({ firstName: user?.firstName || '', lastName: user?.lastName || '', email: user?.email || '', phone: '', address1: '', address2: '', city: '', postcode: '', country: 'United Kingdom' });
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [rates, setRates] = useState(DEFAULT_RATES);

  useEffect(() => { api.getPublicSettings().then(setRates).catch(() => {}); }, []);

  const discountAmt = location.state?.discount || 0;
  const couponCode = location.state?.couponCode || null;
  const afterDiscount = cartTotal - discountAmt;
  const shippingCost = afterDiscount > 500 ? 0 : 12.99;
  const hasDigitalOnly = cart.every(item => item.price < 100); // rough heuristic
  const platformFee = afterDiscount * rates.platform_pct;
  const charitySplit = afterDiscount * rates.charity_pct;
  const grandTotal = afterDiscount + shippingCost;

  const set = (k, v) => setShipping(p => ({ ...p, [k]: v }));

  if (!user) { navigate('/login'); return null; }
  if (cart.length === 0) { navigate('/cart'); return null; }

  const validateShipping = () => {
    if (!shipping.firstName || !shipping.lastName || !shipping.email) {
      toast('Please fill in all required fields', 'err'); return false;
    }
    if (!shipping.address1 || !shipping.city || !shipping.postcode) {
      toast('Please complete your shipping address', 'err'); return false;
    }
    return true;
  };

  const placeOrder = async () => {
    setLoading(true);
    try {
      const items = cart.map(c => ({
        productId: c.productId,
        variationId: c.variation?.id || null,
        quantity: c.qty,
        addons: c.addons || null,
      }));
      
      const res = await api.createOrder({
        items,
        shippingAddress: shipping,
        couponCode,
      });

      clearCart();
      toast('Order placed successfully!', 'ok');
      navigate('/order-confirmation', { state: { order: res.order, summary: { subtotal: cartTotal, discount: discountAmt, shipping: shippingCost, platformFee, charitySplit, total: grandTotal } } });
    } catch (e) {
      toast(e.message || 'Order failed — please try again', 'err');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--base)', paddingBottom: 80 }}>
      <div style={{ padding: '36px 48px 24px', borderBottom: '1px solid var(--border)' }}>
        <div className="wrap">
          <div className="breadcrumbs"><Link to="/">Home</Link><span className="sep">›</span><Link to="/cart">Cart</Link><span className="sep">›</span><span className="current">Checkout</span></div>
          <h1 className="display" style={{ fontSize: 40 }}>Checkout</h1>
        </div>
      </div>

      <div className="wrap" style={{ paddingTop: 24 }}>
        {/* Stepper */}
        <div className="stepper" style={{ justifyContent: 'center', marginBottom: 32 }}>
          {[{ n: 1, l: 'Shipping' }, { n: 2, l: 'Payment' }, { n: 3, l: 'Review' }].map((s, i) => (
            <div key={s.n} className="step">
              <div className={`step-c ${step > s.n ? 'done' : step === s.n ? 'active' : 'pending'}`} onClick={() => s.n < step && setStep(s.n)} style={{ cursor: s.n < step ? 'pointer' : 'default' }}>{step > s.n ? '✓' : s.n}</div>
              <span className={`step-lbl${step === s.n ? ' active' : ''}`}>{s.l}</span>
              {i < 2 && <div className="step-conn" />}
            </div>
          ))}
        </div>

        <div className="detail-layout" style={{ gap: 28 }}>
          {/* Left — form */}
          <div>
            {step === 1 && (
              <div className="card" style={{ padding: 28 }}>
                <h3 style={{ fontFamily: 'var(--fd)', fontSize: 22, marginBottom: 20 }}>Shipping Details</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                  <div className="fg" style={{ margin: 0 }}><label className="fl">First Name *</label><input className="fi" value={shipping.firstName} onChange={e => set('firstName', e.target.value)} required /></div>
                  <div className="fg" style={{ margin: 0 }}><label className="fl">Last Name *</label><input className="fi" value={shipping.lastName} onChange={e => set('lastName', e.target.value)} required /></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                  <div className="fg" style={{ margin: 0 }}><label className="fl">Email *</label><input className="fi" type="email" value={shipping.email} onChange={e => set('email', e.target.value)} required /></div>
                  <div className="fg" style={{ margin: 0 }}><label className="fl">Phone</label><input className="fi" type="tel" value={shipping.phone} onChange={e => set('phone', e.target.value)} /></div>
                </div>
                <div className="fg"><label className="fl">Address Line 1 *</label><input className="fi" value={shipping.address1} onChange={e => set('address1', e.target.value)} placeholder="123 High Street" required /></div>
                <div className="fg"><label className="fl">Address Line 2</label><input className="fi" value={shipping.address2} onChange={e => set('address2', e.target.value)} placeholder="Flat, unit, floor (optional)" /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                  <div className="fg" style={{ margin: 0 }}><label className="fl">City *</label><input className="fi" value={shipping.city} onChange={e => set('city', e.target.value)} required /></div>
                  <div className="fg" style={{ margin: 0 }}><label className="fl">Postcode *</label><input className="fi" value={shipping.postcode} onChange={e => set('postcode', e.target.value)} required /></div>
                  <div className="fg" style={{ margin: 0 }}><label className="fl">Country</label><select className="fi fsel" value={shipping.country} onChange={e => set('country', e.target.value)}><option>United Kingdom</option><option>United States</option><option>Nigeria</option><option>Ghana</option><option>Kenya</option><option>South Africa</option><option>France</option><option>Germany</option></select></div>
                </div>
                <button className="btn btn-p btn-lg" style={{ width: '100%', justifyContent: 'center', marginTop: 18 }} onClick={() => { if (validateShipping()) setStep(2); }}>
                  Continue to Payment →
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="card" style={{ padding: 28 }}>
                <h3 style={{ fontFamily: 'var(--fd)', fontSize: 22, marginBottom: 20 }}>Payment Method</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                  {[
                    { id: 'card', label: 'Credit / Debit Card', icon: '💳', desc: 'Visa, Mastercard, Amex — powered by Stripe' },
                    { id: 'demo', label: 'Demo Mode (Skip Payment)', icon: '🧪', desc: 'Place order without real payment — for testing' },
                  ].map(m => (
                    <div key={m.id} onClick={() => setPaymentMethod(m.id)} style={{
                      padding: '16px 20px', borderRadius: 'var(--r)', cursor: 'pointer',
                      border: `2px solid ${paymentMethod === m.id ? 'var(--mint)' : 'var(--border)'}`,
                      background: paymentMethod === m.id ? 'rgba(23,124,29,.06)' : 'var(--glass)',
                      display: 'flex', gap: 14, alignItems: 'center', transition: 'all .18s',
                    }}>
                      <span style={{ fontSize: 24 }}>{m.icon}</span>
                      <div><div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{m.label}</div><div style={{ fontSize: 11, color: 'var(--muted)' }}>{m.desc}</div></div>
                    </div>
                  ))}
                </div>

                {paymentMethod === 'card' && (
                  <div style={{ marginBottom: 20 }}>
                    <div className="fg"><label className="fl">Card Number</label><input className="fi stripe-field" placeholder="4242 4242 4242 4242" maxLength={19} /></div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      <div className="fg" style={{ margin: 0 }}><label className="fl">Expiry</label><input className="fi stripe-field" placeholder="MM / YY" /></div>
                      <div className="fg" style={{ margin: 0 }}><label className="fl">CVC</label><input className="fi stripe-field" placeholder="123" maxLength={4} /></div>
                    </div>
                    <div className="alert alert-i" style={{ marginTop: 10 }}><span>🔒</span><div>Payment is processed securely via Stripe. We never store your card details.</div></div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn btn-s btn-lg" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setStep(1)}>← Back</button>
                  <button className="btn btn-p btn-lg" style={{ flex: 2, justifyContent: 'center' }} onClick={() => setStep(3)}>Review Order →</button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <div className="card" style={{ padding: 24, marginBottom: 16 }}>
                  <h3 style={{ fontFamily: 'var(--fd)', fontSize: 22, marginBottom: 16 }}>Order Review</h3>
                  
                  {/* Shipping summary */}
                  <div style={{ marginBottom: 18, padding: 14, background: 'var(--glass)', borderRadius: 'var(--r)' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>Ship to</div>
                    <div style={{ fontSize: 14 }}>{shipping.firstName} {shipping.lastName}</div>
                    <div style={{ fontSize: 12, color: 'var(--txt2)' }}>{shipping.address1}{shipping.address2 ? `, ${shipping.address2}` : ''}</div>
                    <div style={{ fontSize: 12, color: 'var(--txt2)' }}>{shipping.city}, {shipping.postcode}, {shipping.country}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{shipping.email}</div>
                  </div>

                  {/* Items */}
                  {cart.map(item => (
                    <div key={item.id} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ width: 52, height: 52, borderRadius: 6, overflow: 'hidden', flexShrink: 0, background: 'var(--glass)' }}>
                        {item.image ? <img src={item.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', background: '#1B4332' }} />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 500 }}>{item.title}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>by {item.artist} × {item.qty}</div>
                      </div>
                      <div style={{ fontFamily: 'var(--fd)', fontSize: 16, color: 'var(--accent)', fontWeight: 700 }}>£{(item.price * item.qty).toLocaleString()}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn btn-s btn-lg" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setStep(2)}>← Back</button>
                  <button className="btn btn-p btn-lg" style={{ flex: 2, justifyContent: 'center' }} onClick={placeOrder} disabled={loading}>
                    {loading ? 'Processing...' : `Place Order — £${grandTotal.toFixed(2)}`}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right — order summary (persistent) */}
          <div style={{ position: 'sticky', top: 90 }}>
            <div className="card" style={{ padding: 22 }}>
              <h4 style={{ fontFamily: 'var(--fd)', fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Summary</h4>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>{cart.length} item{cart.length !== 1 ? 's' : ''}</div>
              {[
                ['Subtotal', `£${cartTotal.toFixed(2)}`],
                ...(discountAmt > 0 ? [[`Discount (${couponCode})`, `-£${discountAmt.toFixed(2)}`, 'var(--sage)']] : []),
                [`Platform (${Math.round(rates.platform_pct * 100)}%)`, `£${platformFee.toFixed(2)}`],
                [`Charity (${Math.round(rates.charity_pct * 100)}%)`, `£${charitySplit.toFixed(2)}`],
                ['Shipping', shippingCost === 0 ? 'Free' : `£${shippingCost.toFixed(2)}`],
              ].map(([k, v, c]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7, fontSize: 13 }}>
                  <span style={{ color: 'var(--muted)' }}>{k}</span><span style={{ color: c || (v === 'Free' ? 'var(--sage)' : '') }}>{v}</span>
                </div>
              ))}
              <div style={{ borderTop: '2px solid var(--border)', marginTop: 10, paddingTop: 10, display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                <span>Total</span>
                <span style={{ fontFamily: 'var(--fd)', fontSize: 22, color: 'var(--accent)' }}>£{grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
