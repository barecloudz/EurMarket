import { useState, useEffect } from 'react';
import { Plus, Trash2, ToggleLeft, ToggleRight, Save, Package, Lightbulb } from 'lucide-react';
import { supabase } from '../../lib/supabase';
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

export default function AdminPreOrders() {
  const { addToast } = useToast();
  const [settings, setSettings] = useState<PreorderSettings>({
    orders_open: false,
    order_deadline: null,
    delivery_dates: [],
  });
  const [orders, setOrders] = useState<PreOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'settings' | 'orders' | 'suggestions'>('settings');

  // New date form
  const [newDate, setNewDate] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newCities, setNewCities] = useState<string[]>(['all']);

  useEffect(() => {
    Promise.all([
      supabase.from('preorder_settings').select('*').eq('id', 1).single(),
      supabase.from('pre_orders').select('*').order('created_at', { ascending: false }),
    ]).then(([{ data: s }, { data: o }]) => {
      if (s) setSettings(s as PreorderSettings);
      if (o) setOrders(o as PreOrder[]);
    }).finally(() => setLoading(false));
  }, []);

  const saveSettings = async () => {
    setSaving(true);
    const { error } = await supabase.from('preorder_settings')
      .upsert({ id: 1, ...settings, updated_at: new Date().toISOString() });
    setSaving(false);
    if (error) {
      addToast('Failed to save settings', 'error');
    } else {
      addToast('Settings saved!', 'success');
    }
  };

  const addDeliveryDate = () => {
    if (!newDate || !newLabel) return;
    setSettings(prev => ({
      ...prev,
      delivery_dates: [...prev.delivery_dates, { date: newDate, label: newLabel, cities: newCities }],
    }));
    setNewDate('');
    setNewLabel('');
    setNewCities(['all']);
  };

  const removeDeliveryDate = (idx: number) => {
    setSettings(prev => ({
      ...prev,
      delivery_dates: prev.delivery_dates.filter((_, i) => i !== idx),
    }));
  };

  const updateOrderStatus = async (id: string, status: string) => {
    await supabase.from('pre_orders').update({ status }).eq('id', id);
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
  };

  const suggestions = orders.filter(o => o.suggestions?.trim());

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-[#CC0000] border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Pre-Order Management</h1>
          <p className="text-gray-500 text-sm mt-0.5">{orders.length} total orders received</p>
        </div>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${settings.orders_open ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          <span className={`w-2 h-2 rounded-full ${settings.orders_open ? 'bg-green-500' : 'bg-gray-400'}`} />
          {settings.orders_open ? 'Orders OPEN' : 'Orders CLOSED'}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6">
        {[
          { key: 'settings', label: 'Settings' },
          { key: 'orders', label: `Orders (${orders.length})` },
          { key: 'suggestions', label: `Suggestions (${suggestions.length})` },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === tab.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── SETTINGS TAB ── */}
      {activeTab === 'settings' && (
        <div className="space-y-5">

          {/* Open/Close toggle */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Order Registration</h2>
            <button onClick={() => setSettings(prev => ({ ...prev, orders_open: !prev.orders_open }))}
              className={`flex items-center gap-3 w-full p-4 rounded-xl border-2 transition-colors ${settings.orders_open ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-gray-50 hover:border-[#CC0000]/40'}`}>
              {settings.orders_open
                ? <ToggleRight className="h-8 w-8 text-green-600 flex-shrink-0" />
                : <ToggleLeft className="h-8 w-8 text-gray-400 flex-shrink-0" />}
              <div className="text-left">
                <p className="text-lg font-bold text-gray-900">
                  Orders are currently <span className={settings.orders_open ? 'text-green-600' : 'text-red-500'}>{settings.orders_open ? 'OPEN' : 'CLOSED'}</span>
                </p>
                <p className="text-sm text-gray-500">Click to {settings.orders_open ? 'close' : 'open'} order registration</p>
              </div>
            </button>
          </div>

          {/* Order deadline */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Order Deadline</h2>
            <p className="text-sm text-gray-500 mb-4">After this date/time, orders will automatically close.</p>
            <input type="datetime-local" value={settings.order_deadline ? settings.order_deadline.slice(0, 16) : ''}
              onChange={(e) => setSettings(prev => ({ ...prev, order_deadline: e.target.value ? new Date(e.target.value).toISOString() : null }))}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-[#CC0000] transition-colors" />
            {settings.order_deadline && (
              <button onClick={() => setSettings(prev => ({ ...prev, order_deadline: null }))}
                className="mt-2 text-sm text-red-500 hover:text-red-700">Clear deadline</button>
            )}
          </div>

          {/* Delivery dates */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Delivery Dates</h2>
            <p className="text-sm text-gray-500 mb-4">Add the dates customers can choose for pickup. You can restrict dates to specific cities.</p>

            {/* Existing dates */}
            {settings.delivery_dates.length > 0 ? (
              <div className="space-y-2 mb-5">
                {settings.delivery_dates.map((d, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-3 bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                    <div>
                      <p className="font-semibold text-gray-900">{d.label}</p>
                      <p className="text-xs text-gray-500">{d.date} · {d.cities.includes('all') ? 'All cities' : d.cities.join(', ')}</p>
                    </div>
                    <button onClick={() => removeDeliveryDate(idx)} className="text-red-400 hover:text-red-600 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-sm italic mb-5">No delivery dates added yet.</p>
            )}

            {/* Add new date */}
            <div className="border-t border-gray-100 pt-4">
              <p className="text-sm font-bold text-gray-700 mb-3">Add a date</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Date</label>
                  <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-gray-900 focus:outline-none focus:border-[#CC0000]" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Label shown to customers</label>
                  <input type="text" value={newLabel} onChange={(e) => setNewLabel(e.target.value)}
                    placeholder="e.g. Saturday, August 15"
                    className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-gray-900 focus:outline-none focus:border-[#CC0000]" />
                </div>
              </div>
              <div className="mb-3">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">Available cities</label>
                <div className="flex flex-wrap gap-2">
                  <button type="button"
                    onClick={() => setNewCities(['all'])}
                    className={`text-xs px-3 py-1.5 rounded-full border-2 font-semibold transition-colors ${newCities.includes('all') ? 'border-[#CC0000] bg-[#CC0000] text-white' : 'border-gray-200 text-gray-600 hover:border-[#CC0000]/50'}`}>
                    All Cities
                  </button>
                  {CITIES.map(c => (
                    <button key={c} type="button"
                      onClick={() => {
                        if (newCities.includes('all')) {
                          setNewCities([c]);
                        } else if (newCities.includes(c)) {
                          setNewCities(newCities.filter(x => x !== c));
                        } else {
                          setNewCities([...newCities, c]);
                        }
                      }}
                      className={`text-xs px-3 py-1.5 rounded-full border-2 font-semibold transition-colors ${!newCities.includes('all') && newCities.includes(c) ? 'border-[#CC0000] bg-[#CC0000] text-white' : 'border-gray-200 text-gray-600 hover:border-[#CC0000]/50'}`}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <button type="button" onClick={addDeliveryDate}
                disabled={!newDate || !newLabel}
                className="flex items-center gap-2 bg-[#CC0000] text-white font-bold px-4 py-2.5 rounded-xl hover:bg-[#AA0000] disabled:opacity-40 transition-colors text-sm">
                <Plus className="h-4 w-4" /> Add Date
              </button>
            </div>
          </div>

          <button onClick={saveSettings} disabled={saving}
            className="flex items-center gap-2 bg-[#CC0000] text-white font-bold px-6 py-3 rounded-xl hover:bg-[#AA0000] disabled:opacity-60 transition-colors shadow-md">
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save All Settings'}
          </button>
        </div>
      )}

      {/* ── ORDERS TAB ── */}
      {activeTab === 'orders' && (
        <div className="space-y-3">
          {orders.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p className="text-lg font-semibold">No orders yet</p>
            </div>
          ) : orders.map(order => (
            <div key={order.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <p className="text-lg font-bold text-gray-900">{order.customer_name}</p>
                  <p className="text-sm text-gray-500">{order.customer_phone} · {order.pickup_city} · {order.delivery_date}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{new Date(order.created_at).toLocaleString()}</p>
                </div>
                <select value={order.status}
                  onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-full border-2 focus:outline-none ${
                    order.status === 'confirmed' ? 'border-green-400 text-green-700 bg-green-50' :
                    order.status === 'ready' ? 'border-blue-400 text-blue-700 bg-blue-50' :
                    order.status === 'completed' ? 'border-gray-400 text-gray-600 bg-gray-50' :
                    'border-amber-400 text-amber-700 bg-amber-50'
                  }`}>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="ready">Ready</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div className="border-t border-gray-100 pt-3 space-y-1">
                {order.items.map((item, i) => (
                  <p key={i} className="text-sm text-gray-700">
                    <span className="font-semibold">×{item.qty}</span> {item.product}
                    {item.size ? <span className="text-gray-500"> ({item.size})</span> : null}
                    {item.flavor ? <span className="text-gray-500"> — {item.flavor}</span> : null}
                  </p>
                ))}
              </div>
              {order.notes && (
                <p className="mt-3 text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2"><span className="font-semibold">Notes:</span> {order.notes}</p>
              )}
              {order.suggestions && (
                <p className="mt-2 text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2"><span className="font-semibold">💡 Suggestion:</span> {order.suggestions}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── SUGGESTIONS TAB ── */}
      {activeTab === 'suggestions' && (
        <div>
          <p className="text-sm text-gray-500 mb-4">Customer ideas for new homemade products or items to carry.</p>
          {suggestions.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Lightbulb className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p className="text-lg font-semibold">No suggestions yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {suggestions.map(order => (
                <div key={order.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <p className="font-bold text-gray-900 mb-1">{order.customer_name} <span className="font-normal text-gray-500 text-sm">· {order.pickup_city}</span></p>
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
