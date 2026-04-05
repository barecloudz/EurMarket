import { Link, useLocation } from 'react-router-dom';
import { Home, Search, ShoppingCart, User } from 'lucide-react';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import { useLoginModalStore } from '../../store/loginModalStore';

export default function BottomNav() {
  const location = useLocation();
  const { openCart, getItemCount } = useCartStore();
  const { user } = useAuthStore();
  const { open: openLoginModal } = useLoginModalStore();
  const itemCount = getItemCount();

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { href: '/', icon: Home, label: 'Home' },
    { href: '/products', icon: Search, label: 'Shop' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 md:hidden z-40">
      {/* White background with top border + shadow */}
      <div className="absolute inset-0 bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]" />

      {/* Nav content */}
      <div className="relative flex items-center justify-around h-[68px] px-2 pb-safe">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              to={item.href}
              className="flex flex-col items-center justify-center w-16 h-full gap-1 btn-press"
            >
              {/* Active indicator dot */}
              {active && (
                <span className="absolute top-1.5 w-1 h-1 rounded-full bg-[var(--color-primary)]" />
              )}
              <div
                className={`p-1.5 rounded-xl transition-all ${
                  active
                    ? 'text-[var(--color-primary)]'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <item.icon
                  className={`h-5 w-5 transition-all ${active ? 'fill-current scale-110' : ''}`}
                />
              </div>
              <span
                className={`text-[10px] font-semibold transition-colors leading-none ${
                  active ? 'text-[var(--color-primary)]' : 'text-gray-400'
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}

        {/* Cart — center raised button */}
        <button
          onClick={openCart}
          className="flex flex-col items-center justify-center w-16 h-full gap-1 btn-press"
        >
          <div className="relative p-3 bg-[var(--color-primary)] rounded-2xl shadow-neon-sm -mt-4 transition-transform hover:scale-105 active:scale-95">
            <ShoppingCart className="h-5 w-5 text-white" />
            {itemCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center shadow animate-scale-pop">
                {itemCount > 9 ? '9+' : itemCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-semibold text-gray-400 leading-none">Cart</span>
        </button>

        {/* Account */}
        {user ? (
          <Link
            to="/account"
            className="flex flex-col items-center justify-center w-16 h-full gap-1 btn-press"
          >
            {isActive('/account') && (
              <span className="absolute top-1.5 w-1 h-1 rounded-full bg-[var(--color-primary)]" />
            )}
            <div className={`p-1.5 rounded-xl transition-all ${isActive('/account') ? 'text-[var(--color-primary)]' : 'text-gray-400 hover:text-gray-600'}`}>
              <User className={`h-5 w-5 transition-all ${isActive('/account') ? 'fill-current scale-110' : ''}`} />
            </div>
            <span className={`text-[10px] font-semibold transition-colors leading-none ${isActive('/account') ? 'text-[var(--color-primary)]' : 'text-gray-400'}`}>
              Account
            </span>
          </Link>
        ) : (
          <button
            onClick={openLoginModal}
            className="flex flex-col items-center justify-center w-16 h-full gap-1 btn-press"
          >
            <div className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 transition-all">
              <User className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-semibold text-gray-400 leading-none">Sign In</span>
          </button>
        )}
      </div>
    </nav>
  );
}
