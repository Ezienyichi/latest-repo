import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Markdown, { extractHeadings } from '../components/ui/Markdown';
import { LEGAL_DOCS, legalDoc, legalPath } from '../data/legal';
import api from '../utils/api';

const fmt = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

// /legal/:slug — the current published version of one legal page.
export default function LegalPage() {
  const { slug } = useParams();
  const meta = legalDoc(slug);
  const [doc, setDoc] = useState(null);
  const [state, setState] = useState('loading');   // loading | ok | unpublished | error

  useEffect(() => {
    setDoc(null); setState('loading');
    if (!meta) return;
    api.getLegal(slug).then(d => { setDoc(d); setState('ok'); })
      .catch(e => setState(/not been published/i.test(e.message || '') ? 'unpublished' : 'error'));
  }, [slug]);

  useEffect(() => {
    if (!meta) return;
    const prev = document.title; document.title = `${meta.title} — FastTackle Africa`;
    return () => { document.title = prev; };
  }, [slug]);

  if (!meta) return (
    <div className="wrap" style={{ padding: '80px 0', textAlign: 'center' }}>
      <h1 className="display" style={{ fontSize: 34, marginBottom: 10 }}>Page not found</h1>
      <p style={{ color: 'var(--muted)', marginBottom: 18 }}>We don't have a legal page at that address.</p>
      <Link to="/" className="btn btn-p">Back to home</Link>
    </div>
  );

  const toc = doc ? extractHeadings(doc.body).filter(h => h.level === 2) : [];

  return (
    <div style={{ minHeight: '60vh', background: 'var(--base)' }}>
      <div className="wrap legal-wrap">
        <div className="breadcrumbs" style={{ marginBottom: 14 }}>
          <Link to="/">Home</Link><span className="sep">›</span><span>Legal</span><span className="sep">›</span><span className="current">{meta.title}</span>
        </div>
        <h1 className="display" style={{ fontSize: 'clamp(30px,5vw,44px)', marginBottom: 10 }}>{meta.title}</h1>

        {state === 'loading' && <div className="skel" style={{ height: 240, borderRadius: 12, marginTop: 18 }} />}
        {state === 'unpublished' && <div className="alert alert-i" style={{ marginTop: 18 }}>This page hasn't been published yet. Please check back soon.</div>}
        {state === 'error' && <div className="alert alert-w" style={{ marginTop: 18 }}>We couldn't load this page. Please try again in a moment.</div>}

        {state === 'ok' && doc && (
          <>
            <div className="legal-meta" data-legal-meta>
              <span>Last updated <strong>{fmt(doc.publishedAt)}</strong></span>
              <span aria-hidden="true">·</span>
              <span>Version <strong>{doc.version}</strong></span>
            </div>
            {toc.length >= 3 && (
              <nav className="legal-toc" aria-label="On this page" data-legal-toc>
                <div className="lbl" style={{ marginBottom: 8 }}>On this page</div>
                <ol>{toc.map(h => <li key={h.id}><a href={`#${h.id}`}>{h.text}</a></li>)}</ol>
              </nav>
            )}
            <Markdown className="legal-doc">{doc.body}</Markdown>
          </>
        )}

        <div className="legal-others">
          <div className="lbl" style={{ marginBottom: 8 }}>Other legal pages</div>
          <ul>{LEGAL_DOCS.filter(d => d.slug !== slug).map(d => <li key={d.slug}><Link to={legalPath(d.slug)}>{d.title}</Link></li>)}</ul>
        </div>
      </div>
    </div>
  );
}
