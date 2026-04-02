import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShoppingCart, User, Heart, LogOut } from 'lucide-react';
import { useEffect } from 'react';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import { useWishlistStore } from '../../store/wishlistStore';
import { useLoginModalStore } from '../../store/loginModalStore';

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { openCart, getItemCount } = useCartStore();
  const { user, isAdmin, signOut, profile } = useAuthStore();
  const { items: wishlistItems } = useWishlistStore();
  const { open: openLoginModal } = useLoginModalStore();
  const itemCount = getItemCount();
  const wishlistCount = wishlistItems.length;

  // Close mobile menu on route change (no-op now, kept for safety)
  useEffect(() => {}, [location.pathname]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleUserClick = () => {
    if (user) {
      navigate('/account');
    } else {
      openLoginModal();
    }
  };

  // Get user initials for avatar
  const getInitials = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase();
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return null;
  };

  const initials = getInitials();

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ── MOBILE HEADER ── */}
        <div className="flex items-center justify-between h-14 md:hidden">
          {/* Cart (left) */}
          <button
            onClick={openCart}
            className="relative p-2 text-gray-500 hover:text-gray-900 transition-colors"
            aria-label="Cart"
          >
            <ShoppingCart className="h-6 w-6" />
            {itemCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-[var(--color-primary)] text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center leading-none">
                {itemCount > 9 ? '9+' : itemCount}
              </span>
            )}
          </button>

          {/* Logo (center) */}
          <Link to="/" className="absolute left-1/2 -translate-x-1/2">
            <img
              src="/images/logo.png"
              alt="Genova's Merch"
              className="h-9 w-auto object-contain"
            />
          </Link>

          {/* User avatar (right) */}
          <button
            onClick={handleUserClick}
            className="relative p-1"
            aria-label={user ? 'My Account' : 'Sign In'}
          >
            {initials ? (
              <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white text-xs font-bold shadow-sm">
                {initials}
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center hover:bg-gray-200 transition-colors">
                <User className="h-4 w-4 text-gray-500" />
              </div>
            )}
          </button>
        </div>

        {/* ── DESKTOP HEADER ── */}
        <div className="hidden md:flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <img
              src="/images/logo.png"
              alt="Genova's Merch"
              className="h-12 w-auto object-contain"
            />
          </Link>

          {/* Nav links */}
          <nav className="flex items-center gap-8">
            <Link
              to="/products"
              className="text-gray-600 hover:text-gray-900 font-medium transition-colors text-sm"
            >
              Products
            </Link>
            {isAdmin && (
              <Link
                to="/admin"
                className="text-[var(--color-primary)] hover:opacity-80 font-medium transition-opacity text-sm"
              >
                Admin
              </Link>
            )}
          </nav>

          {/* Right icons */}
          <div className="flex items-center gap-1">
            {/* Wishlist */}
            <Link
              to="/wishlist"
              className="relative p-2.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all"
              aria-label="Wishlist"
            >
              <Heart className="h-5 w-5" />
              {wishlistCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                  {wishlistCount > 9 ? '9+' : wishlistCount}
                </span>
              )}
            </Link>

            {/* Cart */}
            <button
              onClick={openCart}
              className="relative p-2.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all"
              aria-label="Cart"
            >
              <ShoppingCart className="h-5 w-5" />
              {itemCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-[var(--color-primary)] text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                  {itemCount > 9 ? '9+' : itemCount}
                </span>
              )}
            </button>

            {/* User */}
            {user ? (
              <div className="flex items-center gap-1 ml-1">
                <Link
                  to="/account"
                  className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-100 rounded-xl transition-all"
                >
                  {initials ? (
                    <div className="w-7 h-7 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white text-xs font-bold">
                      {initials}
                    </div>
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center">
                      <User className="h-4 w-4 text-gray-600" />
                    </div>
                  )}
                  <span className="text-sm font-medium text-gray-700">
                    {profile?.first_name || user.email?.split('@')[0]}
                  </span>
                </Link>
                <button
                  onClick={handleSignOut}
                  className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                  title="Sign Out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={openLoginModal}
                className="ml-2 px-4 py-2 bg-[var(--color-primary)] text-white text-sm font-bold rounded-xl hover:opacity-90 active:scale-95 transition-all shadow-sm"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
