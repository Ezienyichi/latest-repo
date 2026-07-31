import { useState, useEffect, useRef } from 'react';
import { Check } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import Icon from './Icon';

// In-memory only, deliberately not localStorage (per spec — not supported
// here) — module scope survives client-side route changes within the same
// SPA session but resets on a real page reload, which is exactly "once per
// visitor per session" without any persistence layer.
let shownThisSession = false;

const TRIGGER_DELAY_MS = 20000;

export default function NewsletterPopup() {
  const { toast } = useCart();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [subbed, setSubbed] = useState(false);
  const dialogRef = useRef(null);

  useEffect(() => {
    if (shownThisSession) return;

    const trigger = () => {
      if (shownThisSession) return;
      shownThisSession = true;
      setOpen(true);
    };

    const timer = setTimeout(trigger, TRIGGER_DELAY_MS);
    // Exit-intent: cursor crosses the top edge of the viewport (heading for
    // the tab bar / address bar) — the standard heuristic, desktop-only by
    // nature since touch devices have no mouse to leave via.
    const onMouseLeave = (e) => { if (e.clientY <= 0) trigger(); };
    document.addEventListener('mouseleave', onMouseLeave);

    return () => { clearTimeout(timer); document.removeEventListener('mouseleave', onMouseLeave); };
  }, []);

  useEffect(() => {
    if (!open) return;
    dialogRef.current?.querySelector('input')?.focus();
    const onKeyDown = (e) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const close = () => setOpen(false);

  const subscribe = () => {
    if (!email.includes('@')) { toast('Enter a valid email', 'err'); return; }
    setSubbed(true);
    toast('Welcome! Check your inbox for updates.', 'ok');
    setTimeout(close, 1800);
  };

  if (!open) return null;

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && close()}>
      <div className="np-card" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="np-heading">
        <button className="mclose" onClick={close} aria-label="Close" style={{ position: 'absolute', top: 16, right: 16 }}>×</button>
        <div className="lbl" style={{ marginBottom: 10 }}>Before Anyone Else</div>
        <h2 id="np-heading" className="display" style={{ fontSize: 30, marginBottom: 10 }}>Get First Access to New Drops</h2>
        <p style={{ fontSize: 14, color: 'var(--txt2)', lineHeight: 1.7, marginBottom: 22 }}>
          Join for early access to new art releases and real updates on the SDG projects your purchases fund.
        </p>
        {subbed ? (
          <div className="alert alert-ok" style={{ fontSize: 14 }}><Icon icon={Check} size="inline" /> You're in! Welcome to the community.</div>
        ) : (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input className="fi" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && subscribe()} style={{ flex: '1 1 200px' }} />
            <button className="btn btn-gold" onClick={subscribe} style={{ flex: '0 0 auto' }}>Get Early Access</button>
          </div>
        )}
        <div style={{ marginTop: 14, fontSize: 11, color: 'var(--subtle)', textAlign: 'center' }}>No spam. Unsubscribe anytime.</div>
      </div>
    </div>
  );
}
