import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Leaf, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { SDGs } from '../data/constants';
import Icon from '../components/ui/Icon';

export default function SetupCharityPage() {
  const { user, setupCharityProfile } = useAuth();
  const { toast } = useCart();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '', mission: '', registrationNo: '', websiteUrl: '', target: 50000, sdgIds: [],
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const toggleSdg = (id) => setForm(p => ({
    ...p, sdgIds: p.sdgIds.includes(id) ? p.sdgIds.filter(x => x !== id) : [...p.sdgIds, id]
  }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.registrationNo.trim()) { toast('Name and registration number are required', 'err'); return; }
    setLoading(true);
    try {
      await setupCharityProfile(form);
      toast('Charity profile created! Pending verification.', 'ok');
      navigate('/');
    } catch (err) { toast(err.message, 'err'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '80vh', background: 'var(--base)', padding: '48px 0 80px' }}>
      <div className="wrap" style={{ maxWidth: 680 }}>
        <div style={{ marginBottom: 32 }}>
          <div className="lbl" style={{ marginBottom: 8 }}>Charity Registration</div>
          <h1 className="display" style={{ fontSize: 42, marginBottom: 8 }}>Register Your Charity</h1>
          <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.7 }}>
            Complete the form below to create your charity account. Once verified, you'll gain access to fundraising tools,
            artist partnership management, and donor engagement features.
          </p>
        </div>

        <div className="alert alert-ok" style={{ marginBottom: 24 }}>
          <Icon icon={Leaf} />
          <div>
            <strong>What we provide for charities:</strong> High possibility to receive capital campaigns, major gifts,
            recurrent donations, and publicity. Our platform connects your mission directly to value-driven art buyers and collectors.
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="card" style={{ padding: 28, marginBottom: 20 }}>
            <h3 style={{ fontFamily: 'var(--fd)', fontSize: 22, marginBottom: 18 }}>Organisation Details</h3>
            <div className="fg">
              <label className="fl">Charity Name *</label>
              <input className="fi" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. WaterAid UK" required />
            </div>
            <div className="fg">
              <label className="fl">Registration Number *</label>
              <input className="fi" value={form.registrationNo} onChange={e => set('registrationNo', e.target.value)} placeholder="e.g. 288701" required />
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Your official charity registration number for verification</div>
            </div>
            <div className="fg">
              <label className="fl">Mission Statement</label>
              <textarea className="fi fta" value={form.mission} onChange={e => set('mission', e.target.value)}
                placeholder="Describe your organisation's mission and impact areas..." rows={4} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="fg" style={{ margin: 0 }}>
                <label className="fl">Website</label>
                <input className="fi" value={form.websiteUrl} onChange={e => set('websiteUrl', e.target.value)} placeholder="https://charity.org" />
              </div>
              <div className="fg" style={{ margin: 0 }}>
                <label className="fl">Fundraising Target (£)</label>
                <input className="fi" type="number" value={form.target} onChange={e => set('target', Number(e.target.value))} min={1000} />
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: 28, marginBottom: 20 }}>
            <h3 style={{ fontFamily: 'var(--fd)', fontSize: 22, marginBottom: 18 }}>SDG Alignment</h3>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>Select the UN Sustainable Development Goals your charity supports:</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {SDGs.map(s => (
                <div key={s.id} onClick={() => toggleSdg(s.id)}
                  className={`pill${form.sdgIds.includes(s.id) ? ' on' : ''}`}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="sdg" style={{ background: s.c, color: '#fff', width: 20, height: 20, fontSize: 9, borderRadius: 4 }}>{s.id}</span>
                  {s.n}
                </div>
              ))}
            </div>
          </div>

          <button className="btn btn-p btn-lg" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {loading ? 'Submitting...' : <>Submit Charity Application for Review <Icon icon={ArrowRight} size="inline" /></>}
          </button>
        </form>
      </div>
    </div>
  );
}
