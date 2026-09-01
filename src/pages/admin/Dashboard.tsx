import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, XCircle, Calendar, Clock, MapPin, Package, ChevronRight, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface DeliveryDate {
  date: string;
  label: string;
  time?: string;
  location_address?: string;
  cities: string[];
}

interface PreorderSettings {
  orders_open: boolean;
  order_deadline: string | null;
  delivery_dates: DeliveryDate[];
}

interface PreOrder {
  id: string;
  status: string;
  items: { product: string; size: string; flavor: string; qty: number }[];
}

function buildSummary(orders: PreOrder[]) {
  const totals = new Map<string, number>();
  for (const order of orders) {
    if (order.status === 'completed') continue;
    for (const item of order.items) {
      const key = [item.product, item.size, item.flavor].filter(Boolean).join(' · ');
      totals.set(key, (totals.get(key) ?? 0) + item.qty);
    }
  }
  return [...totals.entries()].sort((a, b) => b[1] - a[1]);
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<PreorderSettings | null>(null);
  const [orders, setOrders] = useState<PreOrder[]>([]);

  useEffect(() => {
    Promise.all([
      supabase.from('preorder_settings').select('orders_open,order_deadline,delivery_dates').eq('id', 1).single(),
      supabase.from('pre_orders').select('id,status,items'),
    ]).then(([{ data: s }, { data: o }]) => {
      if (s) setSettings(s as PreorderSettings);
      if (o) setOrders(o as PreOrder[]);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-[#CC0000] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const pending = orders.filter(o => o.status === 'pending');
  const confirmed = orders.filter(o => o.status === 'confirmed');
  const active = orders.filter(o => o.status !== 'completed');
  const summary = buildSummary(orders);

  const today = new Date().toISOString().split('T')[0];
  const parseTimeMinutes = (t?: string) => {
    if (!t) return 0;
    const m = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!m) return 0;
    let h = parseInt(m[1]);
    const min = parseInt(m[2]);
    if (m[3].toUpperCase() === 'PM' && h !== 12) h += 12;
    if (m[3].toUpperCase() === 'AM' && h === 12) h = 0;
    return h * 60 + min;
  };
  const upcomingDates = (settings?.delivery_dates ?? [])
    .filter(d => d.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date) || parseTimeMinutes(a.time) - parseTimeMinutes(b.time));

  const deadlinePassed = settings?.order_deadline
    ? new Date() > new Date(settings.order_deadline)
    : false;
  const ordersOpen = settings?.orders_open && !deadlinePassed;

  return (
    <div className="max-w-3xl mx-auto space-y-4">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-gray-900">Good morning 👋</h1>
        <p className="text-gray-500 text-sm mt-0.5">Here's what's happening with your pre-orders.</p>
      </div>

      {/* Orders open/closed status */}
      <Link to="/admin/preorders?tab=orders">
        <div className={`rounded-2xl border-2 p-5 flex items-center gap-5 transition-all hover:shadow-md ${
          ordersOpen ? 'bg-green-50 border-green-400' : 'bg-red-50 border-red-300'
        }`}>
          {ordersOpen
            ? <CheckCircle className="w-12 h-12 text-green-500 flex-shrink-0" />
            : <XCircle className="w-12 h-12 text-red-400 flex-shrink-0" />
          }
          <div className="flex-1 min-w-0">
            <p className={`text-xl font-black ${ordersOpen ? 'text-green-700' : 'text-red-600'}`}>
              {ordersOpen ? 'ORDERS ARE OPEN' : 'ORDERS ARE CLOSED'}
            </p>
            <p className="text-sm text-gray-500 mt-0.5">
              {ordersOpen ? 'Customers can order right now.' : 'Customers cannot place orders.'}
              {settings?.order_deadline && !deadlinePassed && (
                <> Auto-closes {new Date(settings.order_deadline).toLocaleString('en-US', {
                  weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                })}.</>
              )}
            </p>
          </div>
          <div className="flex-shrink-0 bg-white/80 border border-gray-200 rounded-xl px-3 py-1.5 flex items-center gap-1 text-sm font-bold text-gray-700">
            Manage <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      </Link>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {([
          { label: 'Pending', value: pending.length, color: pending.length > 0 ? 'text-amber-600' : 'text-gray-400', bg: pending.length > 0 ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200', icon: AlertTriangle },
          { label: 'Confirmed', value: confirmed.length, color: 'text-green-600', bg: 'bg-green-50 border-green-200', icon: CheckCircle },
          { label: 'Total Active', value: active.length, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200', icon: Package },
        ] as const).map(({ label, value, color, bg, icon: Icon }) => (
          <Link key={label} to="/admin/preorders?tab=orders">
            <div className={`rounded-2xl border p-4 ${bg} hover:shadow-sm transition-all`}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</p>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <p className={`text-3xl font-black ${color}`}>{value}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Pending orders alert */}
      {pending.length > 0 && (
        <Link to="/admin/preorders">
          <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl px-5 py-4 flex items-center justify-between gap-4 hover:shadow-md transition-all">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⏳</span>
              <div>
                <p className="font-black text-amber-800">
                  {pending.length} order{pending.length !== 1 ? 's' : ''} waiting for confirmation
                </p>
                <p className="text-sm text-amber-600 mt-0.5">Tap to review and set prices</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-amber-400 flex-shrink-0" />
          </div>
        </Link>
      )}

      {/* Upcoming market dates */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <p className="font-black text-gray-800 text-sm uppercase tracking-wider flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#CC0000]" /> Upcoming Dates
          </p>
          <Link to="/admin/preorders" className="text-xs font-bold text-white bg-[#CC0000] hover:bg-[#AA0000] rounded-lg px-2.5 py-1 transition-colors">
            Manage →
          </Link>
        </div>
        {upcomingDates.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <Calendar className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 font-bold text-sm">No upcoming dates</p>
            <Link to="/admin/preorders" className="text-xs text-[#CC0000] mt-1 block hover:underline">
              Add a market date →
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {upcomingDates.slice(0, 5).map((d, i) => (
              <div key={i} className="px-5 py-4">
                <p className="font-black text-gray-900 text-sm">{d.label}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                  {d.time && (
                    <p className="text-sm text-gray-600 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#CC0000] flex-shrink-0" />{d.time}
                    </p>
                  )}
                  {d.location_address && (
                    <p className="text-sm text-gray-600 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#CC0000] flex-shrink-0" />{d.location_address}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Production summary */}
      {summary.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
            <p className="font-black text-gray-800 text-sm uppercase tracking-wider flex items-center gap-2">
              <Package className="w-4 h-4 text-[#CC0000]" /> What to Make
            </p>
            <p className="text-xs text-gray-400">Excludes completed orders</p>
          </div>
          <div className="p-4 divide-y divide-gray-50">
            {summary.map(([key, qty]) => (
              <div key={key} className="flex items-center justify-between py-2.5">
                <p className="text-sm text-gray-700 leading-snug">{key}</p>
                <span className="text-lg font-black text-[#CC0000] ml-4 flex-shrink-0">×{qty}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {active.length === 0 && summary.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
          <span className="text-5xl">🥟</span>
          <p className="font-black text-gray-700 mt-3">No active orders yet</p>
          <p className="text-sm text-gray-400 mt-1">Open orders and share the pre-order link with customers.</p>
          <Link
            to="/admin/preorders"
            className="inline-block mt-4 bg-[#CC0000] text-white font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-[#AA0000] transition-colors"
          >
            Go to Pre-Orders
          </Link>
        </div>
      )}
    </div>
  );
}
