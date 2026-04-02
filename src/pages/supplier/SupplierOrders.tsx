import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ShoppingBag, ChevronRight, MapPin, Mail, Phone } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { formatPrice, formatDate } from '../../lib/utils';
import { FULFILLMENT_STATUSES } from '../../lib/constants';
import Spinner from '../../components/ui/Spinner';
import type { FulfillmentStatus } from '../../types';

interface SupplierOrderSummary {
  order_id: string;
  order_number: number;
  created_at: string;
  guest_name: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  shipping_address: Record<string, string>;
  item_count: number;
  items_total: number;
  fulfillment_status: FulfillmentStatus;
}

export default function SupplierOrders() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<SupplierOrderSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<FulfillmentStatus | 'all'>('all');

  useEffect(() => {
    if (user) fetchOrders();
  }, [user]);

  const fetchOrders = async () => {
    try {
      // Fetch order_items for this supplier, joined with order info
      const { data, error } = await supabase
        .from('order_items')
        .select(`
          id,
          order_id,
          product_name,
          quantity,
          unit_price,
          total_price,
          fulfillment_status,
          tracking_number,
          orders!inner (
            id,
            order_number,
            created_at,
            guest_name,
            guest_email,
            guest_phone,
            shipping_address,
            status
          )
        `)
        .eq('supplier_id', user!.id)
        .order('created_at', { foreignTable: 'orders', ascending: false });

      if (error) throw error;

      // Group by order
      const orderMap = new Map<string, SupplierOrderSummary>();
      for (const item of data || []) {
        const order = (item as any).orders;
        if (!orderMap.has(item.order_id)) {
          orderMap.set(item.order_id, {
            order_id: item.order_id,
            order_number: order.order_number,
            created_at: order.created_at,
            guest_name: order.guest_name,
            guest_email: order.guest_email,
            guest_phone: order.guest_phone,
            shipping_address: order.shipping_address,
            item_count: 0,
            items_total: 0,
            fulfillment_status: item.fulfillment_status as FulfillmentStatus,
          });
        }
        const entry = orderMap.get(item.order_id)!;
        entry.item_count += item.quantity;
        entry.items_total += item.total_price;
        // Derive worst fulfillment status (pending < processing < shipped < delivered)
        const rank = { pending: 0, processing: 1, shipped: 2, delivered: 3 };
        if (rank[item.fulfillment_status as FulfillmentStatus] < rank[entry.fulfillment_status]) {
          entry.fulfillment_status = item.fulfillment_status as FulfillmentStatus;
        }
      }

      setOrders(Array.from(orderMap.values()));
    } catch (err) {
      console.error('Error fetching supplier orders:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = orders.filter((o) => {
    const q = search.toLowerCase();
    const matchesSearch =
      o.order_number.toString().includes(q) ||
      o.guest_name?.toLowerCase().includes(q) ||
      o.guest_email?.toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'all' || o.fulfillment_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
        <p className="text-gray-500 mt-1">{orders.length} orders containing your products</p>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all border ${
            statusFilter === 'all'
              ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
              : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
          }`}
        >
          All ({orders.length})
        </button>
        {(Object.entries(FULFILLMENT_STATUSES) as [FulfillmentStatus, { label: string }][]).map(([value, { label }]) => {
          const count = orders.filter(o => o.fulfillment_status === value).length;
          if (count === 0) return null;
          return (
            <button
              key={value}
              onClick={() => setStatusFilter(value)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all border ${
                statusFilter === value
                  ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
            >
              {label} ({count})
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search by order # or customer..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <ShoppingBag className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No orders found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => {
            const status = FULFILLMENT_STATUSES[order.fulfillment_status];
            return (
              <div
                key={order.order_id}
                onClick={() => navigate(`/supplier/orders/${order.order_id}`)}
                className="bg-white border border-gray-100 rounded-2xl p-4 cursor-pointer hover:shadow-md hover:border-gray-200 transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-gray-900">#{order.order_number}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.color}`}>
                        {status.label}
                      </span>
                    </div>

                    <div className="space-y-0.5 text-sm text-gray-500">
                      {order.guest_name && (
                        <p className="font-medium text-gray-700">{order.guest_name}</p>
                      )}
                      {order.guest_email && (
                        <p className="flex items-center gap-1">
                          <Mail className="h-3.5 w-3.5" />
                          {order.guest_email}
                        </p>
                      )}
                      {order.guest_phone && (
                        <p className="flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5" />
                          {order.guest_phone}
                        </p>
                      )}
                      {order.shipping_address && (
                        <p className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.postal_code}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-gray-900">{formatPrice(order.items_total)}</p>
                    <p className="text-xs text-gray-400">{order.item_count} item{order.item_count !== 1 ? 's' : ''}</p>
                    <p className="text-xs text-gray-400 mt-1">{formatDate(order.created_at)}</p>
                  </div>

                  <ChevronRight className="h-5 w-5 text-gray-300 flex-shrink-0 mt-1" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
