import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import ArtistOverview from './ArtistOverview';
import CharityOverview from './CharityOverview';
import AdminDashboard from './AdminDashboard';
import BuyerOverview from './BuyerOverview';

export default function DashboardRouter() {
  const { user } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (!user) navigate('/login'); }, [user]);
  if (!user) return null;
  if (user.role === 'ADMIN') return <AdminDashboard />;
  if (user.role === 'CHARITY' || user.charityProfile) return <CharityOverview />;
  if (user.role === 'ARTIST' || user.artistProfile) return <ArtistOverview />;
  return <BuyerOverview />;
}
