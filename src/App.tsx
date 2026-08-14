import { useEffect, useState, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useSettingsStore } from './store/settingsStore';
import { useProductStore } from './store/productStore';

// Layouts
import MainLayout from './components/layout/MainLayout';
import AdminLayout from './components/layout/AdminLayout';
import SupplierLayout from './components/layout/SupplierLayout';

// Public Pages
import Home from './pages/Home';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import OrderConfirmation from './pages/OrderConfirmation';
import Wishlist from './pages/Wishlist';
import ReturnPolicy from './pages/ReturnPolicy';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Login from './pages/Login';
import Register from './pages/Register';
import Account from './pages/Account';
import PreOrder from './pages/PreOrder';
import NotFound from './pages/NotFound';
import AuthCallback from './pages/AuthCallback';
import ResetPassword from './pages/ResetPassword';

// Admin Pages — lazy loaded so customers never download this code
const AdminDashboard      = lazy(() => import('./pages/admin/Dashboard'));
const AdminProducts       = lazy(() => import('./pages/admin/Products'));
const AdminProductEdit    = lazy(() => import('./pages/admin/ProductEdit'));
const AdminCategories     = lazy(() => import('./pages/admin/Categories'));
const AdminOrders         = lazy(() => import('./pages/admin/Orders'));
const AdminOrderDetail    = lazy(() => import('./pages/admin/OrderDetail'));
const AdminCustomers      = lazy(() => import('./pages/admin/Customers'));
const AdminSettings       = lazy(() => import('./pages/admin/Settings'));
const AdminPreOrders      = lazy(() => import('./pages/admin/PreOrders'));
const AdminThemes         = lazy(() => import('./pages/admin/Themes'));
const AdminPromoCodes     = lazy(() => import('./pages/admin/PromoCodes'));
const AdminEmailSubscribers = lazy(() => import('./pages/admin/EmailSubscribers'));
const AdminReviews        = lazy(() => import('./pages/admin/Reviews'));
const AdminTeam           = lazy(() => import('./pages/admin/Team'));
const AdminBanners        = lazy(() => import('./pages/admin/Banners'));
const AdminSuppliers      = lazy(() => import('./pages/admin/Suppliers'));
const AdminPayouts        = lazy(() => import('./pages/admin/Payouts'));

// Supplier Pages — lazy loaded
const SupplierDashboard   = lazy(() => import('./pages/supplier/SupplierDashboard'));
const SupplierOrders      = lazy(() => import('./pages/supplier/SupplierOrders'));
const SupplierOrderDetail = lazy(() => import('./pages/supplier/SupplierOrderDetail'));
const SupplierProducts    = lazy(() => import('./pages/supplier/SupplierProducts'));
const SupplierAccount     = lazy(() => import('./pages/supplier/SupplierAccount'));
const SupplierPayouts     = lazy(() => import('./pages/supplier/SupplierPayouts'));
const SetPassword         = lazy(() => import('./pages/supplier/SetPassword'));

// Components
import ProtectedRoute from './components/ProtectedRoute';
import CartDrawer from './components/cart/CartDrawer';
import UpdateBanner from './components/UpdateBanner';
import ScrollToTop from './components/ScrollToTop';
import { ToastContainer } from './components/ui/Toast';

function App() {
  const { initialize, isLoading, setLoading } = useAuthStore();
  const { fetchSettings } = useSettingsStore();
  const { fetchProducts } = useProductStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Skip auth initialization on reset-password — the PKCE code in the URL
    // is single-use and must be consumed by the ResetPassword page itself.
    if (!window.location.pathname.startsWith('/reset-password')) {
      initialize();
    } else {
      setLoading(false);
    }
    fetchSettings();
    // Pre-fetch products so they're ready when user navigates
    fetchProducts();

    // Failsafe: proceed after 3 seconds even if auth hangs
    const timeout = setTimeout(() => {
      setLoading(false);
      setReady(true);
    }, 3000);

    return () => clearTimeout(timeout);
  }, [initialize, fetchSettings, fetchProducts, setLoading]);

  // Update ready state when loading finishes normally
  useEffect(() => {
    if (!isLoading) {
      setReady(true);
    }
  }, [isLoading]);

  // Show loading screen while auth initializes (max 3 seconds)
  if (!ready) {
    return (
      <div className="min-h-screen bg-brand-black flex items-center justify-center">
        <div className="text-center">
          <img
            src="/logo.jpg"
            alt="European Market"
            className="w-48 h-48 object-contain mx-auto mb-6"
          />
          <div className="w-10 h-10 border-4 border-brand-neon border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Home />} />
          <Route path="products" element={<Products />} />
          <Route path="products/:slug" element={<ProductDetail />} />
          <Route path="cart" element={<Cart />} />
          <Route path="checkout" element={<Checkout />} />
          <Route path="order-confirmation/:id" element={<OrderConfirmation />} />

          <Route path="return-policy" element={<ReturnPolicy />} />
          <Route path="privacy-policy" element={<PrivacyPolicy />} />
          <Route path="preorder" element={<PreOrder />} />
          <Route path="wishlist" element={<Wishlist />} />
          <Route path="auth/callback" element={<AuthCallback />} />
          <Route path="reset-password" element={<ResetPassword />} />
          <Route path="supplier/set-password" element={<SetPassword />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route
            path="account"
            element={
              <ProtectedRoute>
                <Account />
              </ProtectedRoute>
            }
          />
          {/* 404 inside MainLayout for proper styling */}
          <Route path="*" element={<NotFound />} />
        </Route>

        {/* Admin Routes */}
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute requireAdmin>
              <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-[#CC0000] border-t-transparent rounded-full animate-spin" /></div>}>
                <AdminLayout />
              </Suspense>
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="products/new" element={<AdminProductEdit />} />
          <Route path="products/:id/edit" element={<AdminProductEdit />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="orders/:id" element={<AdminOrderDetail />} />
          <Route path="preorders" element={<AdminPreOrders />} />
          <Route path="payouts" element={<AdminPayouts />} />
          <Route path="customers" element={<AdminCustomers />} />
          <Route path="team" element={<AdminTeam />} />
          <Route path="promo-codes" element={<AdminPromoCodes />} />
          <Route path="subscribers" element={<AdminEmailSubscribers />} />
          <Route path="reviews" element={<AdminReviews />} />
          <Route path="themes" element={<AdminThemes />} />
          <Route path="banners" element={<AdminBanners />} />
          <Route path="suppliers" element={<AdminSuppliers />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>

        {/* Supplier Routes */}
        <Route
          path="/supplier/*"
          element={
            <ProtectedRoute requireSupplier>
              <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-[#CC0000] border-t-transparent rounded-full animate-spin" /></div>}>
                <SupplierLayout />
              </Suspense>
            </ProtectedRoute>
          }
        >
          <Route index element={<SupplierDashboard />} />
          <Route path="dashboard" element={<SupplierDashboard />} />
          <Route path="orders" element={<SupplierOrders />} />
          <Route path="orders/:id" element={<SupplierOrderDetail />} />
          <Route path="products" element={<SupplierProducts />} />
          <Route path="products/new" element={<AdminProductEdit />} />
          <Route path="products/:id/edit" element={<AdminProductEdit />} />
          <Route path="payouts" element={<SupplierPayouts />} />
          <Route path="account" element={<SupplierAccount />} />
        </Route>
      </Routes>

      {/* Global Cart Drawer */}
      <CartDrawer />

      {/* Update Banner */}
      <UpdateBanner />

      {/* Toast Notifications */}
      <ToastContainer />
    </BrowserRouter>
  );
}

export default App;
