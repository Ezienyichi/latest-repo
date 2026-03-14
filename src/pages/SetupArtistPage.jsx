import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { SDGs } from '../data/constants';

export default function SetupArtistPage() {
  const { user, setupArtistProfile } = useAuth();
  const { toast } = useCart();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    displayName: (user?.firstName || '') + ' ' + (user?.lastName || ''),
    artistStatement: '', biography: '', location: '',
    instagram: '', twitter: '', website: '',
    sdgIds: [],
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const toggleSdg = (id) => setForm(p => ({
    ...p, sdgIds: p.sdgIds.includes(id) ? p.sdgIds.filter(x => x !== id) : [...p.sdgIds, id]
  }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.displayName.trim()) { toast('Display name is required', 'err'); return; }
    setLoading(true);
    try {
      await setupArtistProfile({
        displayName: form.displayName,
        artistStatement: form.artistStatement,
        biography: form.biography,
        location: form.location,
        socialLinks: { instagram: form.instagram, twitter: form.twitter, website: form.website },
        sdgIds: form.sdgIds,
      });
      toast('Artist profile created! Pending verification.', 'ok');
      navigate('/');
    } catch (err) { toast(err.message, 'err'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '80vh', background: 'var(--base)', padding: '48px 0 80px' }}>
      <div className="wrap" style={{ maxWidth: 680 }}>
        <div style={{ marginBottom: 32 }}>
          <div className="lbl" style={{ marginBottom: 8 }}>Artist Registration</div>
          <h1 className="display" style={{ fontSize: 42, marginBottom: 8 }}>Complete Your Artist Profile</h1>
          <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.7 }}>
            Fill in the details below to set up your artist account. Your profile will be reviewed and verified by our team.
            Once verified, you can start listing artwork and connecting with charity partners.
          </p>
        </div>

        <div className="alert alert-i" style={{ marginBottom: 24 }}>
          <span>🎨</span>
          <div>
            <strong>What we provide for artists:</strong> Value-driven buyers and collectors, increased visibility for your creative works,
            automatic Certificate of Authenticity generation, and direct connection to verified SDG-aligned charity projects.
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="card" style={{ padding: 28, marginBottom: 20 }}>
            <h3 style={{ fontFamily: 'var(--fd)', fontSize: 22, marginBottom: 18 }}>Basic Information</h3>
            <div className="fg">
              <label className="fl">Display Name *</label>
              <input className="fi" value={form.displayName} onChange={e => set('displayName', e.target.value)} placeholder="Your artist name" required />
            </div>
            <div className="fg">
              <label className="fl">Location</label>
              <input className="fi" value={form.location} onChange={e => set('location', e.target.value)} placeholder="e.g. Lagos, Nigeria · London, UK" />
            </div>
            <div className="fg">
              <label className="fl">Artist Statement</label>
              <textarea className="fi fta" value={form.artistStatement} onChange={e => set('artistStatement', e.target.value)}
                placeholder="Describe your practice, medium, and what drives your work..." rows={4} />
            </div>
            <div className="fg">
              <label className="fl">Biography</label>
              <textarea className="fi fta" value={form.biography} onChange={e => set('biography', e.target.value)}
                placeholder="Your background, education, exhibitions, collections..." rows={4} />
            </div>
          </div>

          <div className="card" style={{ padding: 28, marginBottom: 20 }}>
            <h3 style={{ fontFamily: 'var(--fd)', fontSize: 22, marginBottom: 18 }}>SDG Focus Areas</h3>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>Select the Sustainable Development Goals your work aligns with:</p>
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

          <div className="card" style={{ padding: 28, marginBottom: 20 }}>
            <h3 style={{ fontFamily: 'var(--fd)', fontSize: 22, marginBottom: 18 }}>Social Links</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="fg" style={{ margin: 0 }}>
                <label className="fl">Instagram</label>
                <input className="fi" value={form.instagram} onChange={e => set('instagram', e.target.value)} placeholder="@username" />
              </div>
              <div className="fg" style={{ margin: 0 }}>
                <label className="fl">Twitter / X</label>
                <input className="fi" value={form.twitter} onChange={e => set('twitter', e.target.value)} placeholder="@username" />
              </div>
            </div>
            <div className="fg" style={{ marginTop: 14 }}>
              <label className="fl">Website</label>
              <input className="fi" value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://yoursite.com" />
            </div>
          </div>

          <button className="btn btn-p btn-lg" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
            {loading ? 'Creating Profile...' : 'Submit Artist Profile for Review →'}
          </button>
        </form>
      </div>
    </div>
  );
}
