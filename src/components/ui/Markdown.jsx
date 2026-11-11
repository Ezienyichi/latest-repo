import { Children, isValidElement } from 'react';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Anchor ids for headings (and the "On this page" list built from them).
export const slugifyHeading = (t) => String(t).toLowerCase().replace(/[`*_~]/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'section';

// h2 / h3 lines of a Markdown document, ignoring code fences.
export function extractHeadings(md) {
  const out = []; let fence = false;
  for (const line of String(md || '').split('\n')) {
    if (/^\s*```/.test(line)) { fence = !fence; continue; }
    if (fence) continue;
    const m = /^(#{2,3})\s+(.+?)\s*#*\s*$/.exec(line);
    if (m) { const text = m[2].replace(/[*_`]/g, ''); out.push({ level: m[1].length, text, id: slugifyHeading(text) }); }
  }
  return out;
}

const flat = (children) => Children.toArray(children).map(c => (typeof c === 'string' ? c : isValidElement(c) ? flat(c.props.children) : '')).join('');
const heading = (Tag) => ({ children }) => <Tag id={slugifyHeading(flat(children))}>{children}</Tag>;

// Renders admin-authored Markdown: headings, lists, GitHub-style TABLES (wrapped so a wide table
// scrolls sideways on a phone instead of breaking the page), blockquotes, links. Raw HTML in the
// source is NOT rendered (react-markdown's default), so a pasted <script> can't run.
export default function Markdown({ children, className = '' }) {
  return (
    <div className={`md-doc ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: heading('h1'), h2: heading('h2'), h3: heading('h3'), h4: heading('h4'),
          table: ({ children: c }) => <div className="md-table-wrap" tabIndex={0} role="region" aria-label="Table"><table>{c}</table></div>,
          a: ({ href, children: c }) => (href && href.startsWith('/') && !href.startsWith('//')
            ? <Link to={href}>{c}</Link>
            : <a href={href} target={href?.startsWith('#') ? undefined : '_blank'} rel="noopener noreferrer">{c}</a>),
        }}
      >{children || ''}</ReactMarkdown>
    </div>
  );
}
