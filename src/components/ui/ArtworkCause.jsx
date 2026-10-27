import { Link } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import Icon from './Icon';
import CharityLogo from './CharityLogo';

// "This artwork supports: Campaign · Charity" — the cause is the value
// proposition, so it sits right under the price. The campaign comes from
// product.project (the API only sends it when it's public). The charity is the
// campaign's charity when a campaign is linked, otherwise the product's own.
export default function ArtworkCause({ product }) {
  const project = product.project || null;
  const charity = project?.charity || product.charity || null;
  if (!project && !charity) return null;
  const funded = project?.status === 'COMPLETED';
  return (
    <section className="cause-block" aria-label="What this artwork supports">
      <div className="cause-title">This artwork supports</div>
      <div className="cause-grid">
        {project && (
          <Link className="cause-tile" to={`/campaigns/${project.slug}`}>
            <span className="cause-text">
              <span className="cause-k">Campaign</span>
              <span className="cause-v">{project.title}{funded && <span className="badge b-green cause-badge"><Icon icon={Check} size="inline" /> Funded</span>}</span>
            </span>
            <Icon icon={ArrowRight} size="inline" />
          </Link>
        )}
        {charity && (
          <Link className="cause-tile" to={`/charities/${charity.id}`}>
            <CharityLogo logo={charity.logo} size={32} />
            <span className="cause-text">
              <span className="cause-k">Charity</span>
              <span className="cause-v">{charity.name}</span>
            </span>
            <Icon icon={ArrowRight} size="inline" />
          </Link>
        )}
      </div>
      {charity && <p className="cause-note">10% of this sale goes directly to their SDG-aligned projects.</p>}
    </section>
  );
}
