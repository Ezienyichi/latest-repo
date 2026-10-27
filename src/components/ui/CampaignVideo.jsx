import { useState, useEffect } from 'react';
import { Play, ExternalLink } from 'lucide-react';
import { parseVideo, youtubeThumb, youtubeEmbed } from '../../utils/video';

// Campaign video: a normal, clickable player (not a background).
//  - YouTube: thumbnail + play button; the iframe only loads (and plays, in
//    place) after the click, so the page stays light.
//  - Direct file: native <video controls> with a poster.
export default function CampaignVideo({ url, poster, title = 'Campaign video' }) {
  const v = parseVideo(url);
  const [playing, setPlaying] = useState(false);
  const [thumb, setThumb] = useState(v?.kind === 'youtube' ? youtubeThumb(v.id) : null);
  const [failed, setFailed] = useState(false);
  useEffect(() => { setPlaying(false); setFailed(false); setThumb(v?.kind === 'youtube' ? youtubeThumb(v.id) : null); }, [url]);

  if (!v) return null;

  if (v.kind === 'youtube') {
    if (playing) return (
      <div className="vid-frame">
        <iframe src={youtubeEmbed(v.id, v.start)} title={title} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
      </div>
    );
    return (
      <button type="button" className="vid-frame vid-facade" onClick={() => setPlaying(true)} aria-label={`Play video: ${title}`}>
        {thumb && (
          <img src={thumb} alt="" loading="lazy"
            // maxres doesn't exist for every video; YouTube serves a 120px grey stub (not a 404) in that case
            onLoad={e => { if (e.target.naturalWidth <= 120 && thumb.includes('maxresdefault')) setThumb(youtubeThumb(v.id, 'hqdefault')); }}
            onError={() => thumb.includes('maxresdefault') ? setThumb(youtubeThumb(v.id, 'hqdefault')) : setThumb(poster || null)} />
        )}
        <span className="vid-play"><Play size={28} fill="currentColor" strokeWidth={0} aria-hidden="true" /></span>
      </button>
    );
  }

  if (failed) return (
    <a className="vid-frame vid-fallback" href={v.url} target="_blank" rel="noopener noreferrer">
      <span>Watch the campaign video <ExternalLink size={14} aria-hidden="true" style={{ verticalAlign: -2 }} /></span>
    </a>
  );
  return (
    <div className="vid-frame">
      <video controls playsInline preload="metadata" poster={poster || undefined} src={v.url} onError={() => setFailed(true)} aria-label={title} />
    </div>
  );
}
