import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShoppingCart, User, LogOut, LayoutDashboard, Settings, ChevronDown, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
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

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setDropdownOpen(false); }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    setDropdownOpen(false);
    await signOut();
    navigate('/');
  };

  const getInitials = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase();
    }
    if (user?.email) return user.email[0].toUpperCase();
    return null;
  };

  const initials = getInitials();
  const displayName = profile?.first_name || user?.email?.split('@')[0] || 'Account';

  const Avatar = ({ size = 'md' }: { size?: 'sm' | 'md' }) => {
    const cls = size === 'sm' ? 'w-7 h-7 text-xs' : 'w-8 h-8 text-xs';
    return initials ? (
      <div className={`${cls} rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white font-bold shadow-sm flex-shrink-0`}>
        {initials}
      </div>
    ) : (
      <div className={`${cls} rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0`}>
        <User className="h-4 w-4 text-gray-500" />
      </div>
    );
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── MOBILE HEADER ── */}
        <div className="flex items-center justify-between h-14 md:hidden">
          {/* Cart left */}
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

          {/* Logo center */}
          <Link to="/" className="absolute left-1/2 -translate-x-1/2">
            <img src="/images/logo.png" alt="Genova's Merch" className="h-9 w-auto object-contain" />
          </Link>

          {/* Avatar right — dropdown on mobile */}
          {user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="relative p-1"
                aria-label="Account menu"
              >
                <Avatar />
                {dropdownOpen && (
                  <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-white rounded-full flex items-center justify-center">
                    <X className="h-2.5 w-2.5 text-gray-500" />
                  </span>
                )}
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 top-12 w-52 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50">
                  <div className="px-4 py-2 border-b border-gray-100 mb-1">
                    <p className="text-xs text-gray-400">Signed in as</p>
                    <p className="text-sm font-semibold text-gray-900 truncate">{displayName}</p>
                  </div>
                  <Link
                    to="/account"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Settings className="h-4 w-4 text-gray-400" />
                    Account Settings
                  </Link>
                  {isAdmin && (
                    <Link
                      to="/admin"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 transition-colors font-medium"
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      Admin Dashboard
                    </Link>
                  )}
                  <div className="border-t border-gray-100 mt-1 pt-1">
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={openLoginModal}
              className="relative p-1"
              aria-label="Sign In"
            >
              <div className="w-8 h-8 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center hover:bg-gray-200 transition-colors">
                <User className="h-4 w-4 text-gray-500" />
              </div>
            </button>
          )}
        </div>

        {/* ── DESKTOP HEADER ── */}
        <div className="hidden md:flex items-center h-20 gap-10">
          {/* Logo + Brand */}
          <Link to="/" className="flex items-center gap-3 flex-shrink-0">
            <img src="/images/logo.png" alt="Genova's Merch" className="h-14 w-auto object-contain" />
            <div className="flex flex-col leading-tight">
              <span className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold">Genova's</span>
              <span className="text-lg font-black text-gray-900 tracking-tight leading-none">Official Merch</span>
            </div>
          </Link>

          {/* Nav — centered */}
          <nav className="flex items-center gap-8 flex-1 justify-center">
            <Link
              to="/products"
              className="text-gray-500 hover:text-gray-900 font-semibold tracking-wide transition-colors text-sm uppercase"
            >
              Shop
            </Link>
            <Link
              to="/wishlist"
              className="text-gray-500 hover:text-gray-900 font-semibold tracking-wide transition-colors text-sm uppercase"
            >
              Wishlist
              {wishlistCount > 0 && (
                <span className="ml-1.5 text-[10px] bg-red-500 text-white rounded-full px-1.5 py-0.5 font-bold">
                  {wishlistCount}
                </span>
              )}
            </Link>
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Cart */}
            <button
              onClick={openCart}
              className="relative flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all"
              aria-label="Cart"
            >
              <ShoppingCart className="h-4 w-4 text-gray-700" />
              <span className="text-sm font-semibold text-gray-700">Cart</span>
              {itemCount > 0 && (
                <span className="bg-[var(--color-primary)] text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                  {itemCount > 9 ? '9+' : itemCount}
                </span>
              )}
            </button>

            {/* User dropdown or Sign In */}
            {user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 bg-white border border-gray-200 hover:border-gray-300 rounded-xl transition-all shadow-sm"
                >
                  <Avatar size="sm" />
                  <span className="text-sm font-semibold text-gray-800 max-w-[110px] truncate">
                    {displayName}
                  </span>
                  <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform flex-shrink-0 ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 top-14 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-50">
                    <div className="px-4 py-3 border-b border-gray-100 mb-1">
                      <p className="text-xs text-gray-400 mb-0.5">Signed in as</p>
                      <p className="text-sm font-bold text-gray-900 truncate">{user.email}</p>
                    </div>
                    <Link
                      to="/account"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Settings className="h-4 w-4 text-gray-400" />
                      Account Settings
                    </Link>
                    {isAdmin && (
                      <Link
                        to="/admin"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 transition-colors"
                      >
                        <LayoutDashboard className="h-4 w-4" />
                        Admin Dashboard
                      </Link>
                    )}
                    <div className="border-t border-gray-100 mt-1 pt-1">
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={openLoginModal}
                className="px-5 py-2.5 bg-[var(--color-primary)] text-white text-sm font-bold rounded-xl hover:opacity-90 active:scale-95 transition-all shadow-sm tracking-wide"
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
