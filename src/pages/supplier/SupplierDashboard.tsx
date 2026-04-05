import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, ShoppingBag, TrendingUp, LayoutGrid } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import Spinner from '../../components/ui/Spinner';

interface Stats {
  totalProducts: number;
  pendingOrders: number;
  shippedItems: number;
  totalOrders: number;
}

export default function SupplierDashboard() {
  const { user, profile } = useAuthStore();
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) fetchStats();
  }, [user]);

  const fetchStats = async () => {
    try {
      const [productsRes, pendingRes, shippedRes, totalRes] = await Promise.all([
        // Total products
        supabase
          .from('products')
          .select('id', { count: 'exact', head: true })
          .eq('supplier_id', user!.id),

        // Pending orders (distinct order_ids)
        supabase
          .from('order_items')
          .select('order_id')
          .eq('supplier_id', user!.id)
          .eq('fulfillment_status', 'pending'),

        // Shipped items count
        supabase
          .from('order_items')
          .select('id', { count: 'exact', head: true })
          .eq('supplier_id', user!.id)
          .eq('fulfillment_status', 'shipped'),

        // Total distinct order_ids
        supabase
          .from('order_items')
          .select('order_id')
          .eq('supplier_id', user!.id),
      ]);

      const pendingOrderIds = new Set((pendingRes.data || []).map((r) => r.order_id));
      const totalOrderIds = new Set((totalRes.data || []).map((r) => r.order_id));

      setStats({
        totalProducts: productsRes.count ?? 0,
        pendingOrders: pendingOrderIds.size,
        shippedItems: shippedRes.count ?? 0,
        totalOrders: totalOrderIds.size,
      });
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  const statCards = [
    {
      label: 'Total Products',
      value: stats?.totalProducts ?? 0,
      icon: Package,
    },
    {
      label: 'Pending Orders',
      value: stats?.pendingOrders ?? 0,
      icon: ShoppingBag,
    },
    {
      label: 'Shipped Items',
      value: stats?.shippedItems ?? 0,
      icon: TrendingUp,
    },
    {
      label: 'Total Orders',
      value: stats?.totalOrders ?? 0,
      icon: LayoutGrid,
    },
  ];

  return (
    <div>
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        {profile && (
          <p className="text-gray-500 mt-1">
            Welcome back, {profile.first_name || 'Supplier'}
          </p>
        )}
      </div>

      {/* Stat cards — 2x2 grid */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        {statCards.map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-xl bg-[var(--color-primary)]/10">
                <Icon className="h-5 w-5 text-[var(--color-primary)]" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Quick Links */}
      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-900 mb-3">Quick Links</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            to="/supplier/orders"
            className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-gray-200 transition-all flex items-center gap-4"
          >
            <div className="p-3 rounded-xl bg-[var(--color-primary)]/10 flex-shrink-0">
              <ShoppingBag className="h-6 w-6 text-[var(--color-primary)]" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">My Orders</p>
              <p className="text-sm text-gray-500">View and fulfill your orders</p>
            </div>
          </Link>

          <Link
            to="/supplier/products"
            className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-gray-200 transition-all flex items-center gap-4"
          >
            <div className="p-3 rounded-xl bg-[var(--color-primary)]/10 flex-shrink-0">
              <Package className="h-6 w-6 text-[var(--color-primary)]" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">My Products</p>
              <p className="text-sm text-gray-500">Manage your product listings</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
