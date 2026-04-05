import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Package, ShoppingBag, Truck, X } from 'lucide-react';
import SupplierSidebar from './SupplierSidebar';
import { useAuthStore } from '../../store/authStore';

const WELCOME_KEY = 'supplier_welcome_seen';

export default function SupplierLayout() {
  const { user } = useAuthStore();
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    if (user && !localStorage.getItem(`${WELCOME_KEY}_${user.id}`)) {
      setShowWelcome(true);
    }
  }, [user]);

  const dismiss = () => {
    if (user) localStorage.setItem(`${WELCOME_KEY}_${user.id}`, '1');
    setShowWelcome(false);
  };

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: 'var(--color-background)' }}>
      <SupplierSidebar />
      <main className="flex-1 pt-[72px] md:pt-8 px-4 pb-6 md:px-8 overflow-auto">
        <Outlet />
      </main>

      {/* Welcome modal */}
      {showWelcome && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">

            {/* Header */}
            <div className="bg-[#2E7D32] px-8 pt-8 pb-6 text-white relative">
              <button
                onClick={dismiss}
                className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
              <img src="/images/logo.png" alt="Genova's Merch" className="h-12 w-auto object-contain mb-4" />
              <h2 className="text-2xl font-black leading-tight">Welcome to your<br />supplier dashboard</h2>
              <p className="text-white/75 text-sm mt-1">Here's what you can do</p>
            </div>

            {/* Features */}
            <div className="px-8 py-6 space-y-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Package className="h-5 w-5 text-[#2E7D32]" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">Add &amp; manage products</p>
                  <p className="text-sm text-gray-500 mt-0.5">Upload your products with photos, pricing, and stock levels. They'll appear in the store once published.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <ShoppingBag className="h-5 w-5 text-[#2E7D32]" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">View your orders</p>
                  <p className="text-sm text-gray-500 mt-0.5">See every order that includes your products, with customer details and shipping addresses.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Truck className="h-5 w-5 text-[#2E7D32]" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">Track fulfillment</p>
                  <p className="text-sm text-gray-500 mt-0.5">Update shipping status and enter tracking numbers so customers stay informed.</p>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="px-8 pb-8">
              <button
                onClick={dismiss}
                className="w-full py-3 bg-[#2E7D32] text-white font-bold rounded-xl hover:opacity-90 transition-opacity"
              >
                Get Started
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
