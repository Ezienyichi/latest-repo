import { Routes, Route } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { useCart } from './context/CartContext';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import Toasts from './components/ui/Toasts';
import Wordmark from './components/ui/Wordmark';
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import ShopPage from './pages/ShopPage';
import ProductPage from './pages/ProductPage';
import DigitalsPage from './pages/DigitalsPage';
import ArtistsPage from './pages/ArtistsPage';
import ArtistProfilePage from './pages/ArtistProfilePage';
import CharitiesPage from './pages/CharitiesPage';
import CharityProfilePage from './pages/CharityProfilePage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import OrderConfirmationPage from './pages/OrderConfirmationPage';
import OrdersPage from './pages/OrdersPage';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import SetupArtistPage from './pages/SetupArtistPage';
import SetupCharityPage from './pages/SetupCharityPage';
import ArtistOverview from './pages/dashboard/ArtistOverview';
import ArtworkManager from './pages/dashboard/ArtworkManager';
import ArtistOrders from './pages/dashboard/ArtistOrders';
import ArtistEarnings from './pages/dashboard/ArtistEarnings';
import ArtistProfileEditor from './pages/dashboard/ArtistProfileEditor';
import CharityOverview from './pages/dashboard/CharityOverview';
import CharityFunders from './pages/dashboard/CharityFunders';
import CharityMessages from './pages/dashboard/CharityMessages';
import CharityResources from './pages/dashboard/CharityResources';
import CharityProfileEditor from './pages/dashboard/CharityProfileEditor';
import DashboardRouter from './pages/dashboard/DashboardRouter';
import AdminDashboard from './pages/dashboard/AdminDashboard';
import VerifyCertificatePage from './pages/VerifyCertificatePage';
import MyCertificatesPage from './pages/MyCertificatesPage';

export default function App() {
  const { loading } = useAuth();
  const { toasts, dismissToast } = useCart();

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--base)' }}>
      <div style={{ textAlign: 'center' }}>
        <Wordmark style={{ fontFamily: 'var(--fd)', fontSize: 32, color: 'var(--accent)', marginBottom: 8, display: 'block' }} />
        <div style={{ color: 'var(--muted)', fontSize: 14 }}>Loading...</div>
      </div>
    </div>
  );

  return (
    <>
      <Toasts list={toasts} dismiss={dismissToast} />
      <Routes>
        {/* Auth pages — no nav/footer */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* All other pages — with nav/footer */}
        <Route path="*" element={<WithLayout />} />
      </Routes>
    </>
  );
}

function WithLayout() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/shop" element={<ShopPage />} />
        <Route path="/shop/:slug" element={<ProductPage />} />
        <Route path="/digitals" element={<DigitalsPage />} />
        <Route path="/artists" element={<ArtistsPage />} />
        <Route path="/artists/:id" element={<ArtistProfilePage />} />
        <Route path="/charities" element={<CharitiesPage />} />
        <Route path="/charities/:id" element={<CharityProfilePage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/order-confirmation" element={<OrderConfirmationPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/setup/artist" element={<SetupArtistPage />} />
        <Route path="/setup/charity" element={<SetupCharityPage />} />
        <Route path="/dashboard" element={<DashboardRouter />} />
        <Route path="/dashboard/artworks" element={<ArtworkManager />} />
        <Route path="/dashboard/orders" element={<ArtistOrders />} />
        <Route path="/dashboard/earnings" element={<ArtistEarnings />} />
        <Route path="/dashboard/profile" element={<ArtistProfileEditor />} />
        <Route path="/dashboard/funders" element={<CharityFunders />} />
        <Route path="/dashboard/messages" element={<CharityMessages />} />
        <Route path="/dashboard/resources" element={<CharityResources />} />
        <Route path="/dashboard/charity-profile" element={<CharityProfileEditor />} />
        <Route path="/dashboard/admin" element={<AdminDashboard />} />
        <Route path="/verify/:certId" element={<VerifyCertificatePage />} />
        <Route path="/certificates" element={<MyCertificatesPage />} />
        <Route path="*" element={<HomePage />} />
      </Routes>
      <Footer />
    </>
  );
}
