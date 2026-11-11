import { useParams } from 'react-router-dom';
import { Suspense } from 'react';
import { InvalidLink, useGate, usePrivatePage } from './submitShared';
import CreatorForm from './CreatorForm';
import CharityForm from './CharityForm';
import CampaignForm from './CampaignForm';

// /submit/<type>/<token> — the private invite links. Never linked from anywhere on the site.
const FORMS = { artwork: CreatorForm, charity: CharityForm, campaign: CampaignForm };

export default function SubmitPage() {
  const { type, token } = useParams();
  usePrivatePage();
  const Form = FORMS[type];
  const gate = useGate(Form ? type : 'none', token);
  if (!Form) return <InvalidLink />;
  if (gate === 'checking') return <div className="submit-page"><div className="submit-card"><div className="skel" style={{ height: 240, borderRadius: 12 }} /></div></div>;
  if (gate !== 'ok') return <InvalidLink limited={gate === 'limited'} />;
  return <Suspense fallback={null}><Form token={token} /></Suspense>;
}
