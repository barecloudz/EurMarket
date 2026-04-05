import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Package, ShoppingBag, ArrowLeft, Menu, X, LogOut, LayoutDashboard, Settings } from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';

const navItems = [
  { href: '/supplier/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/supplier/orders', icon: ShoppingBag, label: 'My Orders' },
  { href: '/supplier/products', icon: Package, label: 'My Products' },
  { href: '/supplier/account', icon: Settings, label: 'Account Settings' },
];

export default function SupplierSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (path: string) => location.pathname.startsWith(path);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const pageTitle = [...navItems].reverse().find(item => isActive(item.href))?.label ?? 'Supplier Portal';

  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <>
      {/* Logo */}
      <div className={`p-5 border-b ${isMobile ? 'border-gray-200 bg-white' : 'border-gray-200'}`}>
        <Link to="/supplier/dashboard" className="flex items-center gap-2" onClick={() => setMobileOpen(false)}>
          <img src="/images/logo.png" alt="Genova's Merch" className="h-8 w-auto object-contain" />
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded font-medium">Supplier</span>
        </Link>
        {profile && (
          <p className="mt-2 text-xs text-gray-400 truncate">
            {profile.first_name} {profile.last_name} · {profile.email}
          </p>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${
              isActive(item.href)
                ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-transparent'
            }`}
          >
            <item.icon className={`h-5 w-5 ${isActive(item.href) ? 'text-[var(--color-primary)]' : ''}`} />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Bottom */}
      <div className={`p-4 border-t border-gray-200 space-y-1`}>
        <Link
          to="/"
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-3 px-4 py-3 text-gray-500 hover:text-gray-900 transition-colors rounded-xl hover:bg-gray-100"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="font-medium">Back to Store</span>
        </Link>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors rounded-xl"
        >
          <LogOut className="h-5 w-5" />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 h-14 flex items-center px-4">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
        <h1 className="absolute left-1/2 transform -translate-x-1/2 text-gray-900 font-semibold">
          {pageTitle}
        </h1>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 bg-black/40 z-40" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`md:hidden fixed top-14 bottom-0 left-0 z-50 w-72 bg-white border-r border-gray-200 flex flex-col transform transition-transform shadow-xl ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SidebarContent isMobile={true} />
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 bg-white border-r border-gray-200 flex-col">
        <SidebarContent />
      </aside>
    </>
  );
}
