import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Check, ExternalLink } from 'lucide-react';
import { SDGs, FRAMED_CATEGORIES } from '../data/constants';
import api from '../utils/api';
import Icon from '../components/ui/Icon';
import CharityLogo from '../components/ui/CharityLogo';
import EditionBadge, { priceLabel, priceAmount } from '../components/ui/EditionBadge';
import { ArtistCredit } from '../components/ui/ArtistAvatar';
import { CampaignProgress, SdgDot, money } from './CampaignsPage';
import { cur } from '../utils/currency';
import CampaignVideo from '../components/ui/CampaignVideo';
import ImageGallery from '../components/ui/ImageGallery';
import { parseVideo } from '../utils/video';

const fmtDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

const STORY_WORD_LIMIT = 150;

// Collapsed by default past STORY_WORD_LIMIT words; the full story stays one
// click away. Cuts on a word boundary so formatting (paragraph breaks) in the
// kept part is untouched.
function truncateWords(text, limit) {
  let n = 0, m;
  const re = /\S+/g;
  while ((m = re.exec(text))) { if (++n === limit) { const end = m.index + m[0].length; return /\S/.test(text.slice(end)) ? text.slice(0, end) : null; } }
  return null; // at or under the limit
}

function Story({ text }) {
  const [open, setOpen] = useState(false);
  const short = truncateWords(text, STORY_WORD_LIMIT);
  const id = 'campaign-story-text';
  return (
    <>
      <div id={id} className="campaign-story">{short === null || open ? text : short + '…'}</div>
      {short !== null && (
        <button type="button" className="story-toggle" aria-expanded={open} aria-controls={id} onClick={() => setOpen(o => !o)}>
          {open ? 'Show less' : 'Read more'}
        </button>
      )}
    </>
  );
}

export default function CampaignDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [p, setP] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true); setP(null);
    api.getProject(slug).then(setP).catch(() => {}).finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (!p) return;
    const prev = document.title;
    document.title = `${p.title} — Impact Campaigns`;
    return () => { document.title = prev; };
  }, [p]);

  if (loading) return <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="skel" style={{ width: 240, height: 24 }} /></div>;
  if (!p) return (
    <div className="wrap" style={{ padding: '80px 0', textAlign: 'center' }}>
      <h2 className="display" style={{ fontSize: 32, marginBottom: 10 }}>Campaign not found</h2>
      <p style={{ color: 'var(--muted)', marginBottom: 18 }}>It may have ended or isn’t available.</p>
      <Link to="/campaigns" className="btn btn-p">Browse campaigns</Link>
    </div>
  );

  const funded = p.status === 'COMPLETED';
  const sdgs = (p.sdgIds || []).map(id => SDGs.find(s => s.id === id)).filter(Boolean);
  const products = p.products || [];
  const hasVideo = !!parseVideo(p.campaignVideo);
  const gallery = (Array.isArray(p.images) ? p.images : []).filter(i => i?.url);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--base)' }}>
      <div className="campaign-banner">
        {p.headerImage && <img src={p.headerImage} alt="" />}
      </div>

      <div className="wrap" style={{ paddingTop: 28, paddingBottom: 80 }}>
        <div className="breadcrumbs" style={{ marginBottom: 14 }}>
          <Link to="/">Home</Link><span className="sep">›</span>
          <Link to="/campaigns">Campaigns</Link><span className="sep">›</span>
          <span className="current">{p.title}</span>
        </div>

        {funded && <span className="badge b-green" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 10 }}><Icon icon={Check} size="inline" /> Funded</span>}
        <h1 className="display" style={{ fontSize: 'clamp(30px,5vw,46px)', marginBottom: 10 }}>{p.title}</h1>
        <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 32 }}>
          A campaign by <Link to={`/charities/${p.charity.id}`} style={{ color: 'var(--accent)', fontWeight: 500 }}>{p.charity.name}</Link>
          {(p.startDate || p.endDate) && <> · {p.startDate && fmtDate(p.startDate)}{p.startDate && p.endDate && ' – '}{p.endDate && fmtDate(p.endDate)}</>}
        </p>

        <div className={`campaign-body${hasVideo ? '' : ' no-video'}`}>
          <div className="cb-info">
            <div className="card" style={{ padding: 22 }}>
              <div className="lbl" style={{ marginBottom: 10 }}>{funded ? 'Funded' : 'Progress'}</div>
              <div style={{ fontFamily: 'var(--fd)', fontSize: 32, fontWeight: 700, color: 'var(--accent)', lineHeight: 1 }}>{money(p.raisedAmount)}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', margin: '4px 0 14px' }}>raised of {money(p.targetAmount)} target</div>
              <CampaignProgress project={p} />
              {!funded && products.length > 0 && <a href="#artworks" className="btn btn-p" style={{ width: '100%', justifyContent: 'center', marginTop: 16 }}>Support with art</a>}
            </div>

            <div className="card" style={{ padding: 22 }}>
              <div className="lbl" style={{ marginBottom: 10 }}>Global Goals</div>
              {sdgs.length === 0 ? <div style={{ fontSize: 13, color: 'var(--muted)' }}>No goals tagged yet.</div> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {sdgs.map(s => <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}><SdgDot id={s.id} size={24} />{s.n}</div>)}
                </div>
              )}
            </div>

            <div className="card card-h" style={{ padding: 22, cursor: 'pointer' }} onClick={() => navigate(`/charities/${p.charity.id}`)}>
              <div className="lbl" style={{ marginBottom: 10 }}>The Charity</div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 10 }}>
                <CharityLogo logo={p.charity.logo} size={36} />
                <div style={{ fontFamily: 'var(--fd)', fontSize: 20, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  {p.charity.name}{p.charity.verified && <span className="badge b-green" style={{ fontSize: 9, display: 'inline-flex', alignItems: 'center', gap: 3 }}><Icon icon={Check} size="inline" /> Verified</span>}
                </div>
              </div>
              {p.charity.mission && <p style={{ fontSize: 12, color: 'var(--txt2)', lineHeight: 1.7, marginBottom: 10, display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.charity.mission}</p>}
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>{money(p.charityRaised)} raised across all their campaigns</div>
              <div style={{ fontSize: 12, color: 'var(--accent)', marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 4 }}>View charity <Icon icon={ExternalLink} size="inline" /></div>
            </div>
          </div>

          <div className="cb-story">
            <div className="lbl" style={{ marginBottom: 10 }}>The Story</div>
            <Story key={p.id} text={p.story} />
          </div>

          {hasVideo && (
            <div className="cb-video">
              <CampaignVideo url={p.campaignVideo} poster={p.headerImage} title={`${p.title} — campaign video`} />
              {/* Directly under the video; capped so the sticky column stays shorter than the viewport. */}
              <ImageGallery images={gallery} alt={p.title} max={8} minTile={110} />
            </div>
          )}
        </div>

        {/* No video → nothing to sit under, so the gallery gets its own block after the story. */}
        {!hasVideo && gallery.length > 0 && (
          <div id="gallery" style={{ marginTop: 40, maxWidth: 760 }}>
            <div className="lbl" style={{ marginBottom: 10 }}>Gallery</div>
            <ImageGallery images={gallery} alt={p.title} minTile={150} />
          </div>
        )}

        <div id="artworks" style={{ marginTop: 56, scrollMarginTop: 90 }}>
          <div className="lbl" style={{ marginBottom: 8 }}>Art For This Campaign</div>
          <h2 className="display" style={{ fontSize: 32, marginBottom: 20 }}>Artworks Supporting {p.title}</h2>
          {products.length === 0 ? (
            <div className="empty"><div className="empty-t">No artworks linked yet</div><p style={{ color: 'var(--muted)' }}>Artworks supporting this campaign will appear here.</p></div>
          ) : (
            <div className="product-grid">
              {products.map(a => (
                <div key={a.id} className="product-card" onClick={() => navigate(`/shop/${a.slug}`)} role="link" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter') navigate(`/shop/${a.slug}`); }}>
                  <div className={`product-card-img${FRAMED_CATEGORIES.includes(a.category) ? ' pf-framed' : ''}`}>
                    {a.images?.[0]?.url ? (
                      <div className={`imgswap${a.images[1]?.url ? ' has-second' : ''}`}>
                        <img className="imgswap-main" src={a.images[0].url} alt={a.title} loading="lazy" />
                        {a.images[1]?.url && <img className="imgswap-hover" src={a.images[1].url} alt="" loading="lazy" />}
                      </div>
                    ) : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(145deg,#1B4332,#2D6A4F)' }} />}
                    <EditionBadge editionType={a.editionType} style={{ position: 'absolute', top: 10, right: 10, zIndex: 3 }} />
                  </div>
                  <div className="product-card-body">
                    <div style={{ display: 'flex', gap: 3, marginBottom: 6 }}>{a.sdgIds?.map(id => <SdgDot key={id} id={id} />)}</div>
                    <h3 style={{ fontFamily: 'var(--fd)', fontSize: 18, fontWeight: 600, marginBottom: 3 }}>{a.title}</h3>
                    <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}><ArtistCredit artist={a.artist} prefix="by " /></p>
                    {priceLabel(a) && <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: .6, textTransform: 'uppercase', color: 'var(--muted)' }}>{priceLabel(a)}</div>}
                    <div style={{ fontFamily: 'var(--fd)', fontSize: 18, color: 'var(--accent)', fontWeight: 700 }}>{cur()}{priceAmount(a).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
