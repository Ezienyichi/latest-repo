import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User } from 'lucide-react';
import CountUp from '../components/ui/CountUp';
import Icon from '../components/ui/Icon';
import api from '../utils/api';

export default function AboutPage() {
  const [content, setContent] = useState(null);
  const [theory, setTheory] = useState(null);
  const [team, setTeam] = useState([]);

  useEffect(() => {
    api.getPageContent('about').then(r => setContent(r.body)).catch(() => {});
    api.getPublicSettings().then(setTheory).catch(() => {});
    api.getTeam().then(setTeam).catch(() => {});
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--base)' }}>
      {/* Header */}
      <div style={{ padding: '48px 48px 28px', borderBottom: '1px solid var(--border)' }}>
        <div className="wrap">
          <div className="breadcrumbs"><Link to="/">Home</Link><span className="sep">›</span><span className="current">About</span></div>
          <div className="lbl" style={{ marginBottom: 8 }}>Our Mission</div>
          <h1 className="display" style={{ fontSize: 48 }}>About Change Art Gallery</h1>
          <p style={{ fontSize: 14, color: 'var(--muted)', marginTop: 8, maxWidth: 560 }}>
            Where creativity becomes a sustainable engine for measurable social change.
          </p>
        </div>
      </div>

      {/* Vision / Problem / Solution */}
      {content && (
        <section className="section" style={{ background: 'var(--base)' }}>
          <div className="wrap">
            <div className="g3" style={{ gap: 24 }}>
              <div className="about-card">
                <div className="about-card-tag">Vision</div>
                <p className="about-card-text">{content.vision}</p>
              </div>
              <div className="about-card">
                <div className="about-card-tag">Problem</div>
                <p className="about-card-text">{content.problem}</p>
              </div>
              <div className="about-card">
                <div className="about-card-tag">Solution</div>
                <p className="about-card-text">{content.solution}</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Theory of Change — same three-beat treatment, same SiteSetting keys, as the homepage */}
      {theory && (
        <section style={{ background: 'linear-gradient(135deg,#0d2318 0%,#1B4332 50%,#0d2318 100%)', padding: '90px 0' }}>
          <div className="wrap">
            <div style={{ textAlign: 'center', marginBottom: 52 }}>
              <div className="lbl" style={{ marginBottom: 10, color: 'var(--gold)' }}>Theory of Change</div>
              <h2 className="display" style={{ fontSize: 44, color: '#fff' }}>How Change Compounds</h2>
            </div>
            <div className="theory-flow">
              <div className="theory-card">
                <div className="theory-tag">If</div>
                <p className="theory-text">{theory.theory_if}</p>
              </div>
              <div className="theory-connector">→</div>
              <div className="theory-card">
                <div className="theory-tag">And If</div>
                <p className="theory-text">{theory.theory_and_if}</p>
              </div>
              <div className="theory-connector">→</div>
              <div className="theory-card then">
                <div className="theory-tag">Then</div>
                <p className="theory-text">{theory.theory_then}</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Outcomes */}
      {content && (
        <section className="section" style={{ background: 'var(--panel)' }}>
          <div className="wrap">
            <div style={{ textAlign: 'center', marginBottom: 44 }}>
              <div className="lbl" style={{ marginBottom: 10 }}>Outcomes</div>
              <h2 className="display" style={{ fontSize: 44 }}>What Success Looks Like</h2>
            </div>
            <div className="g2" style={{ gap: 24 }}>
              <div className="about-card">
                <div className="about-card-tag">Short-Term</div>
                <p className="about-card-text">{content.outcomesShortTerm}</p>
              </div>
              <div className="about-card">
                <div className="about-card-tag" style={{ color: 'var(--gold)' }}>Long-Term</div>
                <p className="about-card-text">{content.outcomesLongTerm}</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Stats — scroll-triggered count-up */}
      <section className="section" style={{ background: 'var(--base)' }}>
        <div className="wrap">
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div className="lbl" style={{ marginBottom: 10 }}>The Opportunity</div>
            <h2 className="display" style={{ fontSize: 44 }}>Why This Matters, At Scale</h2>
          </div>
          <div className="about-stats">
            <div>
              <div className="about-stat-val"><CountUp end={59} prefix="$" suffix="B" /></div>
              <div className="about-stat-lbl">Total size of Africa's creative economy (TAM)</div>
            </div>
            <div>
              <div className="about-stat-val"><CountUp end={5.6} decimals={1} prefix="$" suffix="B" /></div>
              <div className="about-stat-lbl">Global art market potential, reflecting rising recognition of African creatives</div>
            </div>
            <div>
              <div className="about-stat-val"><CountUp end={200} prefix="$" suffix="B" /></div>
              <div className="about-stat-lbl">Potential contribution of Africa's creative industries to global creative-goods exports (up to 10%) by 2030, with improved investment and market access</div>
            </div>
          </div>
        </div>
      </section>

      {/* Meet the Team */}
      {team.length > 0 && (
        <section className="section" style={{ background: 'var(--panel)' }}>
          <div className="wrap">
            <div style={{ textAlign: 'center', marginBottom: 44 }}>
              <div className="lbl" style={{ marginBottom: 10 }}>Who We Are</div>
              <h2 className="display" style={{ fontSize: 44 }}>Meet the Team</h2>
            </div>
            <div className="team-grid">
              {team.map(m => (
                <div key={m.id} className="team-card">
                  {m.photoPath ? (
                    <img className="team-photo" src={m.photoPath} alt={m.name} />
                  ) : (
                    <div className="team-photo-fallback"><Icon icon={User} size={32} /></div>
                  )}
                  <div className="team-name">{m.name}</div>
                  <div className="team-role">{m.role}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
