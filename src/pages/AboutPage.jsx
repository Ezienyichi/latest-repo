import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Eye, AlertTriangle, Lightbulb } from 'lucide-react';
import CountUp from '../components/ui/CountUp';
import Icon from '../components/ui/Icon';
import PartnersCarousel from '../components/ui/PartnersCarousel';
import api from '../utils/api';

const PILLARS = [
  { key: 'vision', label: 'Vision', icon: Eye },
  { key: 'problem', label: 'Problem', icon: AlertTriangle },
  { key: 'solution', label: 'Solution', icon: Lightbulb },
];

export default function AboutPage() {
  const navigate = useNavigate();
  const [content, setContent] = useState(null);
  const [team, setTeam] = useState([]);

  useEffect(() => {
    api.getPageContent('about').then(r => setContent(r.body)).catch(() => {});
    api.getTeam().then(setTeam).catch(() => {});
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--base)' }}>
      {/* ═══ HERO BANNER ═══ */}
      <section className="about-hero">
        <img className="about-hero-img" src={content?.heroImage} alt="" loading="eager" />
        <div className="about-hero-scrim" />
        <div className="about-hero-content">
          <h1>{content?.heroHeading || 'About FastTackle Africa'}</h1>
        </div>
      </section>

      {/* ═══ THEORY OF CHANGE ═══ */}
      {content && (
        <section className="section" style={{ background: 'var(--panel)' }}>
          <div className="wrap about-theory-grid">
            <div>
              <div className="about-theory-kicker">{content.theoryKicker}</div>
              <h2 className="about-theory-heading">{content.theoryHeading}</h2>
              <p className="about-theory-para">{content.theoryText}</p>
              <button className="btn btn-p btn-lg" onClick={() => navigate('/shop')}>{content.theoryCta}</button>
            </div>
            <div className="about-theory-media">
              <img src={content.theoryImage} alt="" loading="lazy" />
              <div className="about-stat-band">
                {content.stats?.map(s => (
                  <div key={s.label} className="about-stat-item">
                    <div className="about-stat-val">
                      <CountUp end={s.end} decimals={s.decimals || 0} prefix={s.prefix || ''} suffix={s.suffix || ''} />
                    </div>
                    <div className="about-stat-lbl2">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ═══ VISION / PROBLEM / SOLUTION ═══ */}
      {content && (
        <section className="section" style={{ background: 'var(--base)' }}>
          <div className="wrap">
            <div className="g3" style={{ gap: 24 }}>
              {PILLARS.map(p => (
                <div key={p.key} className="about-pillar">
                  <div className="about-pillar-icon"><Icon icon={p.icon} size={26} /></div>
                  <h3>{p.label}</h3>
                  <p>{content[p.key]}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══ MEET THE TEAM ═══ */}
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

      {/* ═══ OUR PARTNERS — same shared carousel as the homepage ═══ */}
      <PartnersCarousel />
    </div>
  );
}
