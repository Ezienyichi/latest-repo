import { Link } from 'react-router-dom';
import { LEGAL_DOCS, legalPath } from '../../data/legal';

// A compact row of the five legal pages — for screens that have no footer (sign-in, register).
export default function LegalLinks({ style }) {
  return (
    <nav aria-label="Legal" className="legal-links" data-legal-links style={style}>
      {LEGAL_DOCS.map(d => <Link key={d.slug} to={legalPath(d.slug)}>{d.short}</Link>)}
    </nav>
  );
}
