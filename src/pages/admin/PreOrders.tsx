import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Trash2, Package, Lightbulb, CheckCircle, XCircle,
  Clock, MapPin, Calendar, ChevronDown, ChevronUp, HelpCircle,
  Users, AlertTriangle, Printer, Download,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { useToast } from '../../components/ui/Toast';

const CITIES = [
  'Hendersonville, NC', 'Asheville, NC', 'Marshall, NC', 'Burnsville, NC',
  'Swannanoa, NC', 'Hickory, NC', 'Indian Land, NC', 'Lexington, SC',
  'Columbia, SC', 'Greenville, SC', 'Anderson, SC',
];

interface DeliveryDate {
  date: string;
  label: string;
  cities: string[];
  time?: string;
  location_address?: string;
}

interface PreorderSettings {
  orders_open: boolean;
  order_deadline: string | null;
  delivery_dates: DeliveryDate[];
}

interface PreOrder {
  id: string;
  customer_name: string;
  customer_phone: string;
  pickup_city: string;
  delivery_date: string;
  items: { product: string; size: string; flavor: string; qty: number }[];
  notes: string | null;
  suggestions: string | null;
  status: string;
  created_at: string;
}

const STATUS_STYLES: Record<string, string> = {
  pending:   'border-amber-300  text-amber-700  bg-amber-50',
  confirmed: 'border-green-400  text-green-700  bg-green-50',
  ready:     'border-blue-400   text-blue-700   bg-blue-50',
  completed: 'border-gray-300   text-gray-500   bg-gray-50',
};
const STATUS_LABELS: Record<string, string> = {
  pending: '⏳ Pending', confirmed: '✅ Confirmed', ready: '🎉 Ready', completed: '✔️ Completed',
};

function HelpGuide() {
  const [open, setOpen] = useState(false);
  const steps = [
    { icon: '🟢', title: 'Step 1 — Open or close orders', body: 'Tap the big green/red button to let customers order (or stop them). It saves automatically.' },
    { icon: '⏰', title: 'Step 2 — Set a deadline (optional)', body: 'Pick a date & time for orders to close automatically. Leave blank to close manually.' },
    { icon: '📅', title: 'Step 3 — Add a market date', body: 'Fill in the date, label (like "Saturday, August 15"), time, and pickup address. Pick cities, then tap "Add This Date".' },
    { icon: '📦', title: 'Viewing orders', body: 'Click "Orders" to see all orders. Use the dropdown on each card to mark it Confirmed, Ready, or Completed.' },
    { icon: '🖨️', title: 'Print / Export', body: 'In the Orders tab, use Print for a market-day checklist or Export CSV to open in Excel.' },
    { icon: '💡', title: 'Customer suggestions', body: 'The "Ideas" tab shows what customers want to see — good for planning future markets.' },
  ];
  return (
    <div className="bg-white rounded-2xl border border-blue-100 shadow-sm overflow-hidden mb-6">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-blue-50 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
            <HelpCircle className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-left">
            <p className="font-bold text-gray-900 text-sm">How to use this page</p>
            <p className="text-xs text-gray-500">Step-by-step guide — tap to {open ? 'hide' : 'show'}</p>
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
      </button>
      {open && (
        <div className="border-t border-blue-100 divide-y divide-blue-50">
          {steps.map((step, i) => (
            <div key={i} className="flex gap-4 px-5 py-4">
              <span className="text-2xl flex-shrink-0 mt-0.5">{step.icon}</span>
              <div>
                <p className="font-bold text-gray-900 text-sm mb-1">{step.title}</p>
                <p className="text-sm text-gray-600 leading-relaxed">{step.body}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Aggregates all items across orders into a totals map. */
function buildSummary(orders: PreOrder[]) {
  const totals = new Map<string, number>();
  for (const order of orders) {
    if (order.status === 'completed') continue; // exclude already-done
    for (const item of order.items) {
      const key = [item.product, item.size, item.flavor].filter(Boolean).join(' · ');
      totals.set(key, (totals.get(key) ?? 0) + item.qty);
    }
  }
  return [...totals.entries()].sort((a, b) => b[1] - a[1]);
}

function exportCSV(orders: PreOrder[]) {
  const rows = [
    ['Name', 'Phone', 'City', 'Date', 'Status', 'Product', 'Size', 'Flavor', 'Qty', 'Notes'],
  ];
  for (const o of orders) {
    for (const item of o.items) {
      rows.push([
        o.customer_name, o.customer_phone, o.pickup_city, o.delivery_date, o.status,
        item.product, item.size ?? '', item.flavor ?? '', String(item.qty), o.notes ?? '',
      ]);
    }
  }
  const csv = rows.map(r => r.map(c => `"${c.replace(/"/g, '""').replace(/[\n\r]+/g, ' ')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `preorders-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminPreOrders() {
  const { addToast } = useToast();
  const { session } = useAuthStore();
  const [settings, setSettings] = useState<PreorderSettings>({
    orders_open: false,
    order_deadline: null,
    delivery_dates: [],
  });
  const [orders, setOrders] = useState<PreOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingOpen, setTogglingOpen] = useState(false);
  const [savingDates, setSavingDates] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'settings' | 'orders' | 'suggestions'>('settings');

  // Controlled deadline input — separate from settings so it only saves on blur
  const [deadlineInput, setDeadlineInput] = useState('');

  const [newDate, setNewDate] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newCities, setNewCities] = useState<string[]>(['all']);
  const [newTime, setNewTime] = useState('');
  const [newLocationAddress, setNewLocationAddress] = useState('');

  useEffect(() => {
    Promise.all([
      supabase.from('preorder_settings').select('*').eq('id', 1).single(),
      supabase.from('pre_orders').select('*').order('created_at', { ascending: false }),
    ]).then(([{ data: s }, { data: o }]) => {
      if (s) {
        const parsed = s as PreorderSettings;
        setSettings(parsed);
        setDeadlineInput(parsed.order_deadline ? parsed.order_deadline.slice(0, 16) : '');
      }
      if (o) setOrders(o as PreOrder[]);
    }).finally(() => setLoading(false));
  }, []);

  const updatePreorderSettings = async (patch: object): Promise<boolean> => {
    const res = await fetch('/.netlify/functions/update-preorder-settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify(patch),
    });
    return res.ok;
  };

  const toggleOrdersOpen = async () => {
    const newValue = !settings.orders_open;
    setSettings(prev => ({ ...prev, orders_open: newValue }));
    setTogglingOpen(true);
    const ok = await updatePreorderSettings({ orders_open: newValue });
    setTogglingOpen(false);
    if (!ok) {
      setSettings(prev => ({ ...prev, orders_open: !newValue }));
      addToast('Failed to update. Try again.', 'error');
    } else {
      addToast(newValue ? '✅ Orders are now OPEN!' : '🔒 Orders are now CLOSED.', 'success');
    }
  };

  const persistDatesAndDeadline = useCallback(async (updated: PreorderSettings) => {
    setSavingDates(true);
    const ok = await updatePreorderSettings({
      order_deadline: updated.order_deadline,
      delivery_dates: updated.delivery_dates,
    });
    setSavingDates(false);
    if (!ok) {
      addToast('Failed to save. Try again.', 'error');
    } else {
      addToast('Saved!', 'success');
    }
  }, [session]);

  // Fix #3: only saves when user leaves the field
  const handleDeadlineBlur = async () => {
    const iso = deadlineInput ? new Date(deadlineInput).toISOString() : null;
    const updated = { ...settings, order_deadline: iso };
    setSettings(updated);
    await persistDatesAndDeadline(updated);
  };

  const clearDeadline = async () => {
    setDeadlineInput('');
    const updated = { ...settings, order_deadline: null };
    setSettings(updated);
    await persistDatesAndDeadline(updated);
  };

  const addDeliveryDate = async () => {
    if (!newDate || !newLabel) return;
    const updated: PreorderSettings = {
      ...settings,
      delivery_dates: [...settings.delivery_dates, {
        date: newDate, label: newLabel, cities: newCities,
        time: newTime.trim() || undefined,
        location_address: newLocationAddress.trim() || undefined,
      }],
    };
    setSettings(updated);
    setNewDate(''); setNewLabel(''); setNewCities(['all']); setNewTime(''); setNewLocationAddress('');
    await persistDatesAndDeadline(updated);
  };

  const removeDeliveryDate = async (idx: number) => {
    const updated: PreorderSettings = {
      ...settings,
      delivery_dates: settings.delivery_dates.filter((_, i) => i !== idx),
    };
    setSettings(updated);
    await persistDatesAndDeadline(updated);
  };

  const updateOrderStatus = async (id: string, status: string) => {
    if (updatingStatus) return;
    setUpdatingStatus(id);
    await supabase.from('pre_orders').update({ status }).eq('id', id);
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
    setUpdatingStatus(null);
  };

  const suggestions = orders.filter(o => o.suggestions?.trim());
  const pendingOrders = orders.filter(o => o.status === 'pending');
  const summary = buildSummary(orders);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-[#CC0000] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">

      {/* Page header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Pre-Orders</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage market dates, open/close orders, view customer orders</p>
        </div>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold border-2 flex-shrink-0 ${
          settings.orders_open ? 'bg-green-50 text-green-700 border-green-300' : 'bg-gray-50 text-gray-500 border-gray-200'
        }`}>
          <span className={`w-2 h-2 rounded-full ${settings.orders_open ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
          {settings.orders_open ? 'OPEN' : 'CLOSED'}
        </div>
      </div>

      <HelpGuide />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Total Orders', value: orders.length, icon: Package, color: 'text-gray-700', bg: 'bg-gray-50 border-gray-200' },
          { label: 'Pending', value: pendingOrders.length, icon: AlertTriangle, color: pendingOrders.length > 0 ? 'text-amber-600' : 'text-gray-400', bg: pendingOrders.length > 0 ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200' },
          { label: 'Market Dates', value: settings.delivery_dates.length, icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={`rounded-2xl border p-4 ${bg}`}>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</p>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <p className={`text-3xl font-black ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5">
        {[
          { key: 'settings', label: 'Settings' },
          { key: 'orders', label: `Orders${pendingOrders.length > 0 ? ` (${pendingOrders.length} new)` : ` (${orders.length})`}` },
          { key: 'suggestions', label: `Ideas (${suggestions.length})` },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-colors ${
              activeTab === tab.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── SETTINGS TAB ── */}
      {activeTab === 'settings' && (
        <div className="space-y-4">

          {/* Step 1 */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 bg-gradient-to-r from-gray-50 to-white px-5 py-3 border-b border-gray-100">
              <span className="w-6 h-6 rounded-full bg-[#CC0000] text-white text-xs font-black flex items-center justify-center flex-shrink-0">1</span>
              <p className="font-bold text-gray-700 text-sm">Open or close orders</p>
            </div>
            <div className="p-5">
              <button onClick={toggleOrdersOpen} disabled={togglingOpen}
                className={`w-full rounded-2xl border-2 p-5 transition-all text-left flex items-center gap-5 active:scale-[0.99] ${
                  settings.orders_open ? 'bg-green-50 border-green-400 hover:bg-green-100' : 'bg-red-50 border-red-300 hover:bg-red-100'
                } disabled:opacity-60 disabled:cursor-not-allowed`}>
                {togglingOpen
                  ? <div className="w-12 h-12 border-4 border-gray-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                  : settings.orders_open
                    ? <CheckCircle className="w-12 h-12 text-green-500 flex-shrink-0" />
                    : <XCircle className="w-12 h-12 text-red-400 flex-shrink-0" />
                }
                <div>
                  <p className={`text-xl font-black ${settings.orders_open ? 'text-green-700' : 'text-red-600'}`}>
                    {settings.orders_open ? 'ORDERS ARE OPEN' : 'ORDERS ARE CLOSED'}
                  </p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {settings.orders_open ? 'Customers CAN order right now. Tap here to CLOSE.' : 'Customers CANNOT order. Tap here to OPEN orders.'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1.5 font-semibold">Saves automatically when tapped</p>
                </div>
              </button>
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 bg-gradient-to-r from-gray-50 to-white px-5 py-3 border-b border-gray-100">
              <span className="w-6 h-6 rounded-full bg-[#CC0000] text-white text-xs font-black flex items-center justify-center flex-shrink-0">2</span>
              <p className="font-bold text-gray-700 text-sm">Order deadline <span className="text-gray-400 font-normal">(optional)</span></p>
            </div>
            <div className="p-5">
              <p className="text-sm text-gray-500 mb-3">Orders close automatically at this time. Leave blank to close manually.</p>
              <input
                type="datetime-local"
                value={deadlineInput}
                onChange={e => setDeadlineInput(e.target.value)}
                onBlur={handleDeadlineBlur}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-base focus:outline-none focus:border-[#CC0000] transition-colors"
              />
              {settings.order_deadline && (
                <div className="mt-3 flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                  <p className="text-sm font-semibold text-amber-800">
                    ⏰ Auto-closes: {new Date(settings.order_deadline).toLocaleString('en-US', {
                      weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit',
                    })}
                  </p>
                  <button onClick={clearDeadline} className="text-sm text-red-500 font-bold hover:text-red-700 ml-4 flex-shrink-0">
                    Remove
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 bg-gradient-to-r from-gray-50 to-white px-5 py-3 border-b border-gray-100">
              <span className="w-6 h-6 rounded-full bg-[#CC0000] text-white text-xs font-black flex items-center justify-center flex-shrink-0">3</span>
              <p className="font-bold text-gray-700 text-sm">Market dates</p>
            </div>
            <div className="p-5">
              {settings.delivery_dates.length > 0 ? (
                <div className="space-y-2 mb-6">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Current dates</p>
                  {settings.delivery_dates.map((d, idx) => (
                    <div key={idx} className="flex items-start gap-3 bg-gradient-to-r from-gray-50 to-white rounded-xl px-4 py-4 border border-gray-200">
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-gray-900">{d.label}</p>
                        <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 flex-shrink-0" />
                          {d.cities.includes('all') ? 'All cities' : d.cities.join(', ')}
                        </p>
                        {d.time && <p className="text-sm text-gray-600 mt-1 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 flex-shrink-0 text-[#CC0000]" />{d.time}</p>}
                        {d.location_address && <p className="text-sm text-gray-600 mt-0.5 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 flex-shrink-0 text-[#CC0000]" />{d.location_address}</p>}
                      </div>
                      <button onClick={() => removeDeliveryDate(idx)}
                        className="flex-shrink-0 bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-700 rounded-lg p-2 transition-colors border border-red-200">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 mb-6 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                  <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 font-bold">No market dates yet</p>
                  <p className="text-gray-400 text-sm">Add one below</p>
                </div>
              )}

              <div className="border-t-2 border-dashed border-gray-100 pt-5">
                <p className="text-sm font-black text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-[#CC0000]" /> Add a new market date
                </p>
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Date <span className="text-red-500">*</span></label>
                      <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)}
                        className="w-full border-2 border-gray-200 rounded-xl px-3 py-3 text-gray-900 focus:outline-none focus:border-[#CC0000] transition-colors" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Label customers see <span className="text-red-500">*</span></label>
                      <input type="text" value={newLabel} onChange={e => setNewLabel(e.target.value)}
                        placeholder="e.g. Saturday, August 15"
                        className="w-full border-2 border-gray-200 rounded-xl px-3 py-3 text-gray-900 focus:outline-none focus:border-[#CC0000] transition-colors" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">🕐 Time</label>
                      <input type="text" value={newTime} onChange={e => setNewTime(e.target.value)}
                        placeholder="e.g. 10:00 AM – 2:00 PM"
                        className="w-full border-2 border-gray-200 rounded-xl px-3 py-3 text-gray-900 focus:outline-none focus:border-[#CC0000] transition-colors" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">📍 Pickup Address</label>
                      <input type="text" value={newLocationAddress} onChange={e => setNewLocationAddress(e.target.value)}
                        placeholder="e.g. 123 Main St, Swannanoa, NC"
                        className="w-full border-2 border-gray-200 rounded-xl px-3 py-3 text-gray-900 focus:outline-none focus:border-[#CC0000] transition-colors" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Which cities can order for this date?</label>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => setNewCities(['all'])}
                        className={`px-3 py-1.5 rounded-full border-2 font-bold text-sm transition-colors ${newCities.includes('all') ? 'border-[#CC0000] bg-[#CC0000] text-white' : 'border-gray-200 text-gray-600 hover:border-[#CC0000]/50'}`}>
                        All Cities
                      </button>
                      {CITIES.map(c => (
                        <button key={c} type="button"
                          onClick={() => {
                            if (newCities.includes('all')) setNewCities([c]);
                            else if (newCities.includes(c)) setNewCities(newCities.filter(x => x !== c));
                            else setNewCities([...newCities, c]);
                          }}
                          className={`px-3 py-1.5 rounded-full border-2 font-bold text-sm transition-colors ${!newCities.includes('all') && newCities.includes(c) ? 'border-[#CC0000] bg-[#CC0000] text-white' : 'border-gray-200 text-gray-600 hover:border-[#CC0000]/50'}`}>
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button type="button" onClick={addDeliveryDate}
                    disabled={!newDate || !newLabel || savingDates}
                    className="w-full flex items-center justify-center gap-2 bg-[#CC0000] text-white font-black text-base px-4 py-4 rounded-xl hover:bg-[#AA0000] disabled:opacity-40 transition-colors shadow-sm active:scale-[0.99]">
                    {savingDates ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Plus className="h-5 w-5" />}
                    {savingDates ? 'Saving...' : 'Add This Date'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ORDERS TAB ── */}
      {activeTab === 'orders' && (
        <div className="space-y-4">

          {orders.length > 0 && (
            <>
              {/* #2 — Production summary */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                  <p className="font-black text-gray-800 text-sm uppercase tracking-wider">📋 Production Summary</p>
                  <p className="text-xs text-gray-400">Excludes completed orders</p>
                </div>
                <div className="p-4 divide-y divide-gray-50">
                  {summary.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-3">All orders completed</p>
                  ) : summary.map(([key, qty]) => (
                    <div key={key} className="flex items-center justify-between py-2.5">
                      <p className="text-sm text-gray-700 leading-snug">{key}</p>
                      <span className="text-lg font-black text-[#CC0000] ml-4 flex-shrink-0">×{qty}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* #5 — Print / Export */}
              <div className="flex gap-2">
                <button onClick={() => window.print()}
                  className="flex-1 flex items-center justify-center gap-2 bg-white border-2 border-gray-200 hover:border-gray-300 text-gray-700 font-bold text-sm px-4 py-3 rounded-xl transition-colors">
                  <Printer className="w-4 h-4" /> Print Orders
                </button>
                <button onClick={() => exportCSV(orders)}
                  className="flex-1 flex items-center justify-center gap-2 bg-white border-2 border-gray-200 hover:border-gray-300 text-gray-700 font-bold text-sm px-4 py-3 rounded-xl transition-colors">
                  <Download className="w-4 h-4" /> Export CSV
                </button>
              </div>
            </>
          )}

          {orders.length === 0 ? (
            <div className="text-center py-20 text-gray-400 bg-white rounded-2xl border border-gray-200">
              <Package className="h-14 w-14 mx-auto mb-3 opacity-30" />
              <p className="text-lg font-bold">No orders yet</p>
              <p className="text-sm mt-1">Orders will appear here once customers submit them</p>
            </div>
          ) : orders.map(order => (
            <div key={order.id} className={`bg-white rounded-2xl border-2 shadow-sm p-5 ${order.status === 'pending' ? 'border-amber-300' : 'border-gray-100'}`}>
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <p className="text-lg font-black text-gray-900">{order.customer_name}</p>
                  <p className="text-sm text-gray-500 mt-0.5">📱 {order.customer_phone}</p>
                  <p className="text-sm text-gray-500">📍 {order.pickup_city}</p>
                  <p className="text-sm text-gray-500">📅 {order.delivery_date}</p>
                  <p className="text-xs text-gray-400 mt-1">{new Date(order.created_at).toLocaleString()}</p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <label className="text-xs font-bold text-gray-400 block mb-1">Update status</label>
                  <select value={order.status} onChange={e => updateOrderStatus(order.id, e.target.value)}
                    disabled={updatingStatus === order.id}
                    className={`text-sm font-bold px-3 py-2 rounded-xl border-2 focus:outline-none cursor-pointer disabled:opacity-60 ${STATUS_STYLES[order.status] ?? STATUS_STYLES.pending}`}>
                    {Object.entries(STATUS_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="border-t border-gray-100 pt-3 space-y-1">
                {order.items.map((item, i) => (
                  <p key={i} className="text-sm text-gray-700">
                    <span className="font-black text-[#CC0000]">×{item.qty}</span> {item.product}
                    {item.size ? <span className="text-gray-500"> ({item.size})</span> : null}
                    {item.flavor ? <span className="text-gray-500"> — {item.flavor}</span> : null}
                  </p>
                ))}
              </div>
              {order.notes && (
                <p className="mt-3 text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                  <span className="font-bold">📝 Notes:</span> {order.notes}
                </p>
              )}
              {order.suggestions && (
                <p className="mt-2 text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2 border border-amber-100">
                  <span className="font-bold">💡 Suggestion:</span> {order.suggestions}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── SUGGESTIONS TAB ── */}
      {activeTab === 'suggestions' && (
        <div>
          <p className="text-sm text-gray-500 mb-4">Products customers are asking for — great for planning future markets.</p>
          {suggestions.length === 0 ? (
            <div className="text-center py-20 text-gray-400 bg-white rounded-2xl border border-gray-200">
              <Lightbulb className="h-14 w-14 mx-auto mb-3 opacity-30" />
              <p className="text-lg font-bold">No suggestions yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {suggestions.map(order => (
                <div key={order.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <p className="font-bold text-gray-900 mb-1">
                    {order.customer_name}<span className="font-normal text-gray-500 text-sm"> · {order.pickup_city}</span>
                  </p>
                  <p className="text-gray-700 text-base leading-relaxed bg-amber-50 rounded-xl px-4 py-3 border border-amber-100">
                    💡 {order.suggestions}
                  </p>
                  <p className="text-xs text-gray-400 mt-2">{new Date(order.created_at).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
