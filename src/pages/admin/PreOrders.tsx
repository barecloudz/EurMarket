import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Package, AlertTriangle, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { useToast } from '../../components/ui/Toast';
import type {
  PreorderSettings, PreOrder, MenuItem, ConfirmItem, DeliveryDate,
} from './preorders/types';
import { DEFAULT_MENU } from './preorders/types';
import { SettingsTab } from './preorders/SettingsTab';
import { OrdersTab } from './preorders/OrdersTab';
import { MenuTab } from './preorders/MenuTab';
import { SuggestionsTab } from './preorders/SuggestionsTab';

const POLL_INTERVAL = 60_000;

export default function AdminPreOrders() {
  const { addToast } = useToast();
  const { session } = useAuthStore();
  const [searchParams] = useSearchParams();

  const [settings, setSettings] = useState<PreorderSettings>({
    orders_open: false,
    order_deadline: null,
    delivery_dates: [],
    served_cities: [],
  });
  const [orders, setOrders] = useState<PreOrder[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>(DEFAULT_MENU);
  const [loading, setLoading] = useState(true);

  // Loading states
  const [togglingOpen, setTogglingOpen] = useState(false);
  const [savingDates, setSavingDates] = useState(false);
  const [savingMenu, setSavingMenu] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [sendingConf, setSendingConf] = useState(false);

  const [activeTab, setActiveTab] = useState<'settings' | 'orders' | 'menu' | 'suggestions'>(
    (searchParams.get('tab') as 'settings' | 'orders' | 'menu' | 'suggestions') ?? 'settings'
  );

  // Sync tab from URL when navigating to this page while it's already mounted
  useEffect(() => {
    const tab = searchParams.get('tab') as 'settings' | 'orders' | 'menu' | 'suggestions' | null;
    if (tab) setActiveTab(tab);
  }, [searchParams]);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    const [{ data: s }, { data: o }] = await Promise.all([
      supabase.from('preorder_settings').select('*').eq('id', 1).single(),
      supabase.from('pre_orders').select('*').order('created_at', { ascending: false }),
    ]);

    if (s) {
      const parsed = s as PreorderSettings & { menu?: MenuItem[] };

      // Seed served_cities from existing delivery_dates on first load if empty
      let seededCities: string[] = parsed.served_cities ?? [];
      if (seededCities.length === 0 && parsed.delivery_dates?.length > 0) {
        const unique = Array.from(new Set(
          parsed.delivery_dates.flatMap(d => d.cities).filter(c => c !== 'all')
        ));
        if (unique.length > 0) {
          await supabase.from('preorder_settings').update({ served_cities: unique }).eq('id', 1);
          seededCities = unique;
        }
      }

      const fullSettings: PreorderSettings = { ...parsed, served_cities: seededCities };
      setSettings(fullSettings);

      if (parsed.menu && parsed.menu.length > 0) setMenu(parsed.menu);
    }

    if (o) setOrders(o as PreOrder[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchAll]);

  // ── Settings mutations (via Netlify function) ──────────────────────────────

  const updatePreorderSettings = useCallback(async (patch: object): Promise<boolean> => {
    const res = await fetch('/.netlify/functions/update-preorder-settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify(patch),
    });
    return res.ok;
  }, [session]);

  // ── Settings tab handlers ──────────────────────────────────────────────────

  const handleToggleOpen = async () => {
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

  const handleDeadlineBlur = async (value: string) => {
    const iso = value ? new Date(value).toISOString() : null;
    setSettings(prev => ({ ...prev, order_deadline: iso }));
    setSavingDates(true);
    const ok = await updatePreorderSettings({ order_deadline: iso, delivery_dates: settings.delivery_dates });
    setSavingDates(false);
    if (!ok) addToast('Failed to save. Try again.', 'error');
  };

  const handleClearDeadline = async () => {
    setSettings(prev => ({ ...prev, order_deadline: null }));
    setSavingDates(true);
    const ok = await updatePreorderSettings({ order_deadline: null, delivery_dates: settings.delivery_dates });
    setSavingDates(false);
    if (!ok) addToast('Failed to save. Try again.', 'error');
  };

  const handleAddDate = async (date: DeliveryDate) => {
    const updatedDates = [...settings.delivery_dates, date];
    setSettings(prev => ({ ...prev, delivery_dates: updatedDates }));
    setSavingDates(true);
    const ok = await updatePreorderSettings({
      order_deadline: settings.order_deadline,
      delivery_dates: updatedDates,
    });
    setSavingDates(false);
    if (!ok) {
      setSettings(prev => ({ ...prev, delivery_dates: settings.delivery_dates }));
      addToast('Failed to save. Try again.', 'error');
    } else {
      addToast('Saved!', 'success');
    }
  };

  const handleEditDate = async (idx: number, date: DeliveryDate) => {
    const updatedDates = settings.delivery_dates.map((d, i) => i === idx ? date : d);
    setSettings(prev => ({ ...prev, delivery_dates: updatedDates }));
    setSavingDates(true);
    const ok = await updatePreorderSettings({
      order_deadline: settings.order_deadline,
      delivery_dates: updatedDates,
    });
    setSavingDates(false);
    if (!ok) {
      setSettings(prev => ({ ...prev, delivery_dates: settings.delivery_dates }));
      addToast('Failed to save. Try again.', 'error');
    } else {
      addToast('Saved!', 'success');
    }
  };

  const handleDeleteDate = async (idx: number) => {
    const updatedDates = settings.delivery_dates.filter((_, i) => i !== idx);
    setSettings(prev => ({ ...prev, delivery_dates: updatedDates }));
    setSavingDates(true);
    const ok = await updatePreorderSettings({
      order_deadline: settings.order_deadline,
      delivery_dates: updatedDates,
    });
    setSavingDates(false);
    if (!ok) {
      setSettings(prev => ({ ...prev, delivery_dates: settings.delivery_dates }));
      addToast('Failed to save. Try again.', 'error');
    }
  };

  const handleAddCity = async (city: string) => {
    const updatedCities = [...settings.served_cities, city];
    setSettings(prev => ({ ...prev, served_cities: updatedCities }));
    const ok = await updatePreorderSettings({ served_cities: updatedCities });
    if (!ok) {
      setSettings(prev => ({ ...prev, served_cities: settings.served_cities }));
      addToast('Failed to save city. Try again.', 'error');
    }
  };

  const handleRemoveCity = async (city: string) => {
    const updatedCities = settings.served_cities.filter(c => c !== city);
    setSettings(prev => ({ ...prev, served_cities: updatedCities }));
    const ok = await updatePreorderSettings({ served_cities: updatedCities });
    if (!ok) {
      setSettings(prev => ({ ...prev, served_cities: settings.served_cities }));
      addToast('Failed to remove city. Try again.', 'error');
    }
  };

  // ── Orders tab handlers ────────────────────────────────────────────────────

  const handleUpdateStatus = async (id: string, status: string) => {
    if (updatingStatus) return;
    setUpdatingStatus(id);
    await supabase.from('pre_orders').update({ status }).eq('id', id);
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
    setUpdatingStatus(null);
  };

  const handleSendConfirmation = async (order: PreOrder, items: ConfirmItem[]) => {
    setSendingConf(true);
    try {
      const res = await fetch('/.netlify/functions/confirm-preorder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ orderId: order.id, confirmedItems: items }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      const confirmTotal = items.filter(i => i.available).reduce((sum, i) => sum + i.price, 0);
      setOrders(prev => prev.map(o => o.id === order.id
        ? { ...o, status: 'confirmed', confirmed_items: items, confirmed_total: confirmTotal }
        : o
      ));
      const toastMsg = data.emailSent
        ? '✅ Order confirmed & email sent!'
        : data.emailError
          ? '✅ Order confirmed — email failed to send (check Resend config)'
          : '✅ Order confirmed (customer has no email on file)';
      addToast(toastMsg, data.emailError ? 'error' : 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send confirmation';
      addToast(msg, 'error');
    } finally {
      setSendingConf(false);
    }
  };

  // ── Menu tab handlers ──────────────────────────────────────────────────────

  const handleSaveMenu = async (updated: MenuItem[]) => {
    setSavingMenu(true);
    const ok = await updatePreorderSettings({ menu: updated });
    setSavingMenu(false);
    if (!ok) {
      addToast('Failed to save menu. Try again.', 'error');
    } else {
      addToast('Menu saved!', 'success');
    }
  };

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-[#CC0000] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const pendingOrders = orders.filter(o => o.status === 'pending');
  const suggestions = orders.filter(o => o.suggestions?.trim());
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="max-w-3xl mx-auto">

      {/* Page header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Pre-Orders</h1>
          <p className="text-gray-500 text-sm mt-0.5">{greeting}! Manage market dates, open/close orders, view customer orders</p>
        </div>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold border-2 flex-shrink-0 ${
          settings.orders_open ? 'bg-green-50 text-green-700 border-green-300' : 'bg-gray-50 text-gray-500 border-gray-200'
        }`}>
          <span className={`w-2 h-2 rounded-full ${settings.orders_open ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
          {settings.orders_open ? 'OPEN' : 'CLOSED'}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Orders', value: orders.length, icon: Package, color: 'text-gray-700', bg: 'bg-gray-50 border-gray-200' },
          { label: 'Pending', value: pendingOrders.length, icon: AlertTriangle, color: pendingOrders.length > 0 ? 'text-amber-600' : 'text-gray-400', bg: pendingOrders.length > 0 ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200' },
          { label: 'Dates', value: settings.delivery_dates.length, icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={`rounded-2xl border p-3 sm:p-4 ${bg}`}>
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider leading-tight">{label}</p>
              <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${color} flex-shrink-0`} />
            </div>
            <p className={`text-2xl sm:text-3xl font-black ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5 overflow-x-auto">
        {[
          { key: 'settings', label: 'Settings' },
          { key: 'orders', label: `Orders${pendingOrders.length > 0 ? ` (${pendingOrders.length})` : ` (${orders.length})`}` },
          { key: 'menu', label: 'Menu' },
          { key: 'suggestions', label: `Ideas (${suggestions.length})` },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`flex-shrink-0 flex-1 py-2.5 text-sm font-bold rounded-lg transition-colors whitespace-nowrap px-3 ${
              activeTab === tab.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'settings' && (
        <SettingsTab
          settings={settings}
          togglingOpen={togglingOpen}
          savingDates={savingDates}
          onToggleOpen={handleToggleOpen}
          onDeadlineBlur={handleDeadlineBlur}
          onClearDeadline={handleClearDeadline}
          onAddDate={handleAddDate}
          onEditDate={handleEditDate}
          onDeleteDate={handleDeleteDate}
          onAddCity={handleAddCity}
          onRemoveCity={handleRemoveCity}
        />
      )}

      {activeTab === 'orders' && (
        <OrdersTab
          settings={settings}
          orders={orders}
          menu={menu}
          updatingStatus={updatingStatus}
          sendingConf={sendingConf}
          onUpdateStatus={handleUpdateStatus}
          onSendConfirmation={handleSendConfirmation}
        />
      )}

      {activeTab === 'menu' && (
        <MenuTab
          settings={settings}
          menu={menu}
          savingMenu={savingMenu}
          onMenuChange={setMenu}
          onSaveMenu={handleSaveMenu}
        />
      )}

      {activeTab === 'suggestions' && (
        <SuggestionsTab orders={orders} />
      )}
    </div>
  );
}
