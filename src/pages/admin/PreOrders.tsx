import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Trash2, Package, Lightbulb, CheckCircle, XCircle,
  Clock, MapPin, Calendar, ChevronDown, ChevronUp, HelpCircle,
  Users, AlertTriangle, Printer, Download, Mail, X, Pencil,
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

interface ConfirmItem {
  product: string;
  size: string;
  flavor: string;
  qty: number;
  price: number;
  available: boolean;
  substitution: string;
}

interface PreOrder {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  pickup_city: string;
  delivery_date: string;
  items: { product: string; size: string; flavor: string; qty: number }[];
  notes: string | null;
  suggestions: string | null;
  status: string;
  created_at: string;
  confirmed_items: ConfirmItem[] | null;
  confirmed_total: number | null;
  payment_method: string | null;
  confirmation_sent_at: string | null;
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

  // Confirmation modal
  const [confirmingOrder, setConfirmingOrder] = useState<PreOrder | null>(null);
  const [editItems, setEditItems] = useState<ConfirmItem[]>([]);
  const [sendingConf, setSendingConf] = useState(false);

  // Controlled deadline input — separate from settings so it only saves on blur
  const [deadlineInput, setDeadlineInput] = useState('');

  const [newDate, setNewDate] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newCities, setNewCities] = useState<string[]>(['all']);
  const [newTime, setNewTime] = useState('');
  const [newLocationAddress, setNewLocationAddress] = useState('');

  // Inline editing state for existing dates
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editLabel, setEditLabel] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editCities, setEditCities] = useState<string[]>(['all']);

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
    if (!newDate) return;
    const label = newLabel || new Date(newDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    const updated: PreorderSettings = {
      ...settings,
      delivery_dates: [...settings.delivery_dates, {
        date: newDate, label, cities: newCities,
        time: newTime.trim() || undefined,
        location_address: newLocationAddress.trim() || undefined,
      }],
    };
    setSettings(updated);
    setNewDate(''); setNewLabel(''); setNewCities(['all']); setNewTime(''); setNewLocationAddress('');
    await persistDatesAndDeadline(updated);
  };

  const openEditDate = (idx: number) => {
    const d = settings.delivery_dates[idx];
    setEditingIdx(idx);
    setEditDate(d.date);
    setEditLabel(d.label);
    setEditTime(d.time || '');
    setEditAddress(d.location_address || '');
    setEditCities(d.cities);
  };

  const saveEditDate = async () => {
    if (editingIdx === null || !editDate) return;
    const label = editLabel || new Date(editDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    const updated: PreorderSettings = {
      ...settings,
      delivery_dates: settings.delivery_dates.map((d, i) => i === editingIdx
        ? { date: editDate, label, cities: editCities, time: editTime.trim() || undefined, location_address: editAddress.trim() || undefined }
        : d
      ),
    };
    setSettings(updated);
    setEditingIdx(null);
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

  const openConfirmModal = (order: PreOrder) => {
    const items: ConfirmItem[] = order.items.map(item => ({
      product: item.product,
      size: item.size,
      flavor: item.flavor,
      qty: item.qty,
      price: 0,
      available: true,
      substitution: '',
    }));
    setEditItems(items);
    setConfirmingOrder(order);
  };

  const updateEditItem = (idx: number, patch: Partial<ConfirmItem>) => {
    setEditItems(prev => prev.map((item, i) => i === idx ? { ...item, ...patch } : item));
  };

  const confirmTotal = editItems.filter(i => i.available).reduce((sum, i) => sum + i.price, 0);
  const cardTotal = confirmTotal * 1.035;

  const sendConfirmation = async () => {
    if (!confirmingOrder) return;
    setSendingConf(true);
    try {
      const res = await fetch('/.netlify/functions/confirm-preorder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ orderId: confirmingOrder.id, confirmedItems: editItems }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setOrders(prev => prev.map(o => o.id === confirmingOrder.id
        ? { ...o, status: 'confirmed', confirmed_items: editItems, confirmed_total: confirmTotal }
        : o
      ));
      addToast(data.emailSent ? '✅ Order confirmed & email sent!' : '✅ Order confirmed (no email on file)', 'success');
      setConfirmingOrder(null);
    } catch (err: any) {
      addToast(err.message || 'Failed to send confirmation', 'error');
    } finally {
      setSendingConf(false);
    }
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
                  {settings.delivery_dates.map((d, idx) => editingIdx === idx ? (
                    // ── Inline edit mode ──
                    <div key={idx} className="rounded-xl border-2 border-[#CC0000] bg-white p-4 space-y-3">
                      <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Date</label>
                        <input type="date" value={editDate} onChange={e => {
                          setEditDate(e.target.value);
                          setEditLabel(new Date(e.target.value + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }));
                        }} className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-gray-900 focus:outline-none focus:border-[#CC0000] transition-colors" />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">🕐 Time</label>
                        <input type="text" value={editTime} onChange={e => setEditTime(e.target.value)} placeholder="e.g. 10:00 AM – 2:00 PM"
                          className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-gray-900 focus:outline-none focus:border-[#CC0000] transition-colors" />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">📍 Pickup Address</label>
                        <input type="text" value={editAddress} onChange={e => setEditAddress(e.target.value)} placeholder="e.g. 123 Main St, Marshall, NC"
                          className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-gray-900 focus:outline-none focus:border-[#CC0000] transition-colors" />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Cities</label>
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={() => setEditCities(['all'])}
                            className={`px-3 py-1.5 rounded-full border-2 font-bold text-sm transition-colors ${editCities.includes('all') ? 'border-[#CC0000] bg-[#CC0000] text-white' : 'border-gray-200 text-gray-600'}`}>
                            All Cities
                          </button>
                          {CITIES.map(c => (
                            <button key={c} type="button"
                              onClick={() => {
                                if (editCities.includes('all')) setEditCities([c]);
                                else if (editCities.includes(c)) setEditCities(editCities.filter(x => x !== c));
                                else setEditCities([...editCities, c]);
                              }}
                              className={`px-3 py-1.5 rounded-full border-2 font-bold text-sm transition-colors ${!editCities.includes('all') && editCities.includes(c) ? 'border-[#CC0000] bg-[#CC0000] text-white' : 'border-gray-200 text-gray-600'}`}>
                              {c}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button onClick={saveEditDate} disabled={savingDates}
                          className="flex-1 bg-[#CC0000] text-white font-bold py-2.5 rounded-xl hover:bg-[#AA0000] transition-colors disabled:opacity-50">
                          {savingDates ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button onClick={() => setEditingIdx(null)}
                          className="px-4 py-2.5 border-2 border-gray-200 rounded-xl text-gray-600 font-bold hover:border-gray-300 transition-colors">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    // ── Display mode ──
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
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => openEditDate(idx)}
                          className="bg-blue-50 hover:bg-blue-100 text-blue-500 rounded-lg p-2 transition-colors border border-blue-200">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => removeDeliveryDate(idx)}
                          className="bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-700 rounded-lg p-2 transition-colors border border-red-200">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
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
                    <div className="sm:col-span-2">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Date <span className="text-red-500">*</span></label>
                      <input type="date" value={newDate} onChange={e => {
                        const d = e.target.value;
                        setNewDate(d);
                        if (d) {
                          // Auto-generate a nice label e.g. "Saturday, August 23, 2026"
                          const formatted = new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
                          setNewLabel(formatted);
                        }
                      }}
                        className="w-full border-2 border-gray-200 rounded-xl px-3 py-3 text-gray-900 focus:outline-none focus:border-[#CC0000] transition-colors" />
                      {newLabel && <p className="text-sm text-gray-500 mt-1.5">Customers will see: <strong>{newLabel}</strong></p>}
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
                    disabled={!newDate || savingDates}
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
              {/* Payment method */}
              {order.payment_method && (
                <p className="mt-3 text-sm font-bold bg-green-50 border border-green-200 text-green-700 rounded-lg px-3 py-2">
                  {{ cash: '💵 Paying with Cash', zelle: '💜 Paying with Zelle', card: '💳 Paying with Card (+3.5%)' }[order.payment_method] ?? order.payment_method}
                </p>
              )}
              {order.status === 'confirmed' && !order.payment_method && (
                <p className="mt-3 text-sm text-gray-400 italic">⏳ Awaiting customer payment choice</p>
              )}
              {/* Confirm button */}
              {order.status === 'pending' && (
                <button
                  onClick={() => openConfirmModal(order)}
                  className="mt-4 w-full flex items-center justify-center gap-2 bg-[#CC0000] hover:bg-[#AA0000] text-white font-bold text-sm px-4 py-3 rounded-xl transition-colors">
                  <Mail className="w-4 h-4" /> Price &amp; Confirm Order
                </button>
              )}
              {order.status === 'confirmed' && (
                <button
                  onClick={() => openConfirmModal(order)}
                  className="mt-4 w-full flex items-center justify-center gap-2 bg-white border-2 border-[#CC0000]/30 hover:border-[#CC0000] text-[#CC0000] font-bold text-sm px-4 py-3 rounded-xl transition-colors">
                  <Mail className="w-4 h-4" /> Resend Confirmation
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── CONFIRMATION MODAL ── */}
      {confirmingOrder && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !sendingConf && setConfirmingOrder(null)} />
          <div className="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] flex flex-col">

            {/* Modal header */}
            <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-gray-100 flex-shrink-0">
              <div>
                <h2 className="text-lg font-black text-gray-900">{confirmingOrder.customer_name}</h2>
                <p className="text-sm text-gray-500 mt-0.5">📍 {confirmingOrder.pickup_city} · 📅 {confirmingOrder.delivery_date}</p>
                <p className="text-sm text-gray-500">📱 {confirmingOrder.customer_phone}</p>
                {confirmingOrder.customer_email
                  ? <p className="text-sm text-green-600 font-medium mt-0.5">✉️ {confirmingOrder.customer_email}</p>
                  : <p className="text-sm text-red-500 font-medium mt-0.5">⚠️ No email — customer won't receive email</p>
                }
              </div>
              <button onClick={() => !sendingConf && setConfirmingOrder(null)} className="p-1 text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Items */}
            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Set price for each item — enter 0 or mark unavailable if you can't fill it</p>
              {editItems.map((item, idx) => {
                const label = [item.product, item.size && `(${item.size})`, item.flavor && `— ${item.flavor}`].filter(Boolean).join(' ');
                return (
                  <div key={idx} className={`rounded-2xl border-2 p-4 transition-colors ${item.available ? 'border-gray-200 bg-white' : 'border-red-200 bg-red-50'}`}>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <p className={`text-sm font-bold leading-snug ${item.available ? 'text-gray-900' : 'text-red-500 line-through'}`}>
                        {item.available ? '✅' : '❌'} {label}
                        {item.qty > 1 && <span className="font-normal text-gray-500"> × {item.qty}</span>}
                      </p>
                      <button
                        type="button"
                        onClick={() => updateEditItem(idx, { available: !item.available, price: item.available ? 0 : item.price })}
                        className={`flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-full border-2 transition-colors ${item.available
                          ? 'border-red-200 text-red-500 hover:bg-red-50'
                          : 'border-green-300 text-green-600 hover:bg-green-50'
                        }`}>
                        {item.available ? 'Mark unavailable' : 'Mark available'}
                      </button>
                    </div>

                    {item.available ? (
                      <div>
                        <label className="text-xs font-bold text-gray-500 block mb-1.5">Total price for this item</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                          <input
                            type="number"
                            min="0"
                            step="0.50"
                            value={item.price || ''}
                            onChange={e => updateEditItem(idx, { price: parseFloat(e.target.value) || 0 })}
                            placeholder="0.00"
                            className="w-full border-2 border-gray-200 rounded-xl pl-7 pr-3 py-2.5 text-gray-900 font-bold text-base focus:outline-none focus:border-[#CC0000] transition-colors"
                          />
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="text-xs font-bold text-gray-500 block mb-1.5">Substitution (optional)</label>
                        <input
                          type="text"
                          value={item.substitution}
                          onChange={e => updateEditItem(idx, { substitution: e.target.value })}
                          placeholder="e.g. Sweet Cheese Roll Medium ($8)"
                          className="w-full border-2 border-red-200 rounded-xl px-3 py-2.5 text-gray-900 text-sm focus:outline-none focus:border-red-400 transition-colors bg-white"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Totals + send button */}
            <div className="px-5 pb-5 pt-3 border-t border-gray-100 flex-shrink-0 bg-white rounded-b-3xl">
              <div className="flex justify-between items-baseline mb-1">
                <span className="text-sm text-gray-500">Order Total</span>
                <span className="text-xl font-black text-gray-900">${confirmTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-baseline mb-4">
                <span className="text-xs text-gray-400">Card total (+3.5%)</span>
                <span className="text-sm text-gray-400">${cardTotal.toFixed(2)}</span>
              </div>
              <button
                onClick={sendConfirmation}
                disabled={sendingConf || confirmTotal === 0}
                className="w-full flex items-center justify-center gap-2 bg-[#CC0000] hover:bg-[#AA0000] disabled:opacity-50 text-white font-black text-base px-4 py-4 rounded-2xl transition-colors">
                {sendingConf
                  ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Sending...</>
                  : <><Mail className="w-4 h-4" /> {confirmingOrder.customer_email ? 'Confirm & Send Email' : 'Confirm Order (no email)'}</>
                }
              </button>
              {confirmTotal === 0 && (
                <p className="text-center text-xs text-red-400 mt-2">Enter at least one price to confirm</p>
              )}
            </div>
          </div>
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
