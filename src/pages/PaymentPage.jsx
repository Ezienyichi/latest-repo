import { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Lock, FlaskConical, CheckCircle2, XCircle } from 'lucide-react';
import { useCart } from '../context/CartContext';
import Icon from '../components/ui/Icon';
import api from '../utils/api';
import { cur } from '../utils/currency';

// The payment step. The order already exists (PENDING); nothing is paid and
// nothing is delivered until the payment module confirms it.
//
// TEST MODE (today): no processor is connected, so this page stands in for the
// processor's hosted page — "Simulate successful / failed payment" calls the
// same confirm endpoint the real return step will call.
//
// PAYSTACK LATER: initiatePayment() will return a `checkoutUrl`; this page then
// just sends the buyer there ("Pay securely"), and the return page calls
// api.confirmPayment(reference) — which verifies with Paystack. Nothing else here changes.
export default function PaymentPage() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { clearCart, toast } = useCart();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const order = state?.order, payment = state?.payment, summary = state?.summary;

  if (!order || !payment) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="empty"><div className="empty-t">No payment in progress</div><p style={{ color: 'var(--muted)', marginBottom: 14 }}>Your basket is untouched.</p><Link to="/cart" className="btn btn-p">Back to cart</Link></div>
    </div>
  );

  const settle = async (outcome) => {
    setBusy(true); setFailed(false);
    try {
      const res = await api.confirmPayment(payment.reference, outcome);
      if (res.status === 'paid') {
        clearCart();
        toast('Payment received — thank you!', 'ok');
        navigate('/order-confirmation', { replace: true, state: { order: res.order, summary, testMode: res.testMode } });
      } else {
        setFailed(true);
      }
    } catch (e) { toast(e.message || 'Could not confirm the payment', 'err'); }
    finally { setBusy(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--base)', paddingBottom: 80 }}>
      <div className="wrap" style={{ paddingTop: 40, maxWidth: 640 }}>
        <h1 className="display" style={{ fontSize: 38, marginBottom: 6 }}>Complete your payment</h1>
        <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 22 }}>Order <span style={{ fontFamily: 'var(--fm)' }}>{order.id?.slice(0, 12)}</span> is reserved and waiting for payment.</p>

        {payment.testMode && (
          <div className="alert alert-w" data-test-mode style={{ marginBottom: 18, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <Icon icon={FlaskConical} size="inline" />
            <div><strong>Test mode — no real money is taken.</strong> A payment processor isn't connected yet, so choose how this payment should end to try the whole flow.</div>
          </div>
        )}

        <div className="card" style={{ padding: 24, marginBottom: 18 }}>
          {order.items?.map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 0', fontSize: 14, borderBottom: i < order.items.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <span>{item.product?.title}{item.format === 'DIGITAL' ? ' · digital' : item.quantity > 1 ? ` × ${item.quantity}` : ''}</span>
              <span>{cur()}{(Number(item.unitPrice) * item.quantity).toFixed(2)}</span>
            </div>
          ))}
          {Number(order.shippingAmount) > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: 14, color: 'var(--muted)' }}><span>Shipping</span><span>{cur()}{Number(order.shippingAmount).toFixed(2)}</span></div>}
          <div style={{ borderTop: '2px solid var(--border)', marginTop: 8, paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontWeight: 700 }}>Total to pay</span>
            <span style={{ fontFamily: 'var(--fd)', fontSize: 30, color: 'var(--accent)', fontWeight: 700 }}>{cur()}{Number(payment.amount ?? order.totalAmount).toFixed(2)}</span>
          </div>
        </div>

        {failed && (
          <div className="alert alert-w" data-payment-failed style={{ marginBottom: 16, display: 'flex', gap: 10 }}>
            <Icon icon={XCircle} size="inline" /><div><strong>The payment didn't go through.</strong> You haven't been charged and your order is still reserved — try again.</div>
          </div>
        )}

        {payment.checkoutUrl ? (
          <button className="btn btn-p btn-lg" style={{ width: '100%', justifyContent: 'center', display: 'inline-flex', alignItems: 'center', gap: 8 }} onClick={() => window.location.assign(payment.checkoutUrl)}>
            <Icon icon={Lock} size="inline" /> Pay securely
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn btn-p btn-lg" data-simulate="success" style={{ flex: '2 1 240px', justifyContent: 'center', display: 'inline-flex', alignItems: 'center', gap: 8 }} disabled={busy} onClick={() => settle('success')}>
              <Icon icon={CheckCircle2} size="inline" /> {busy ? 'Processing…' : `Simulate successful payment — ${cur()}${Number(payment.amount ?? order.totalAmount).toFixed(2)}`}
            </button>
            <button className="btn btn-s btn-lg" data-simulate="failed" style={{ flex: '1 1 160px', justifyContent: 'center' }} disabled={busy} onClick={() => settle('failed')}>Simulate failed payment</button>
          </div>
        )}
        <div style={{ textAlign: 'center', marginTop: 16 }}><Link to="/cart" style={{ fontSize: 13, color: 'var(--muted)' }}>Cancel and go back to my basket</Link></div>
      </div>
    </div>
  );
}
