import { useState, useEffect } from 'react';
import { Save, Truck, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/ui/Toast';
import { formatDateTime } from '../../lib/utils';
import type { StoreSettings } from '../../types';

const SYNC_FREQUENCY_OPTIONS = [
  { value: 'off', label: 'Off' },
  { value: 'hourly', label: 'Every hour' },
  { value: 'every_6h', label: 'Every 6 hours' },
  { value: 'every_12h', label: 'Every 12 hours' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
];

interface ShippingService {
  id: string;
  service_code: string;
  name: string;
  description: string | null;
  is_enabled: boolean;
}

export default function AdminSettings() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { addToast } = useToast();

  const [settings, setSettings] = useState<Partial<StoreSettings>>({
    store_name: '',
    contact_email: '',
    default_shipping_cost: 5,
    low_stock_threshold: 5,
    square_sync_frequency: 'off',
    square_last_synced_at: null,
  });
  const [shippingServices, setShippingServices] = useState<ShippingService[]>([]);

  // Square sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ synced: number; skipped: number; total: number } | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
    fetchShippingServices();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('store_settings')
        .select('*')
        .eq('id', 1)
        .single();

      if (error) throw error;

      if (data) {
        setSettings(data);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchShippingServices = async () => {
    try {
      const { data, error } = await supabase
        .from('shipping_services')
        .select('*')
        .order('name');

      if (error) throw error;
      setShippingServices(data || []);
    } catch (err) {
      console.error('Error fetching shipping services:', err);
    }
  };

  const toggleShippingService = async (service: ShippingService) => {
    const newValue = !service.is_enabled;

    // Optimistic update
    setShippingServices(services =>
      services.map(s => s.id === service.id ? { ...s, is_enabled: newValue } : s)
    );

    try {
      const { error } = await supabase
        .from('shipping_services')
        .update({ is_enabled: newValue, updated_at: new Date().toISOString() })
        .eq('id', service.id);

      if (error) throw error;
      addToast(`${service.name} ${newValue ? 'enabled' : 'disabled'}`, 'success');
    } catch (err) {
      // Revert on error
      setShippingServices(services =>
        services.map(s => s.id === service.id ? { ...s, is_enabled: !newValue } : s)
      );
      addToast('Failed to update shipping service', 'error');
    }
  };

  const handleSquareSync = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    setSyncError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setSyncError('Not authenticated');
        return;
      }

      const response = await fetch('/.netlify/functions/square-sync-catalog', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setSyncError(data.error || 'Sync failed');
        return;
      }

      setSyncResult({ synced: data.synced, skipped: data.skipped, total: data.total });

      // Update last synced timestamp in local state
      const now = new Date().toISOString();
      setSettings(prev => ({ ...prev, square_last_synced_at: now }));
      await supabase.from('store_settings').update({ square_last_synced_at: now }).eq('id', 1);

      addToast(`Synced ${data.synced} products from Square`, 'success');
    } catch (err: any) {
      setSyncError(err.message || 'Sync failed');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('store_settings')
        .update({
          store_name: settings.store_name,
          contact_email: settings.contact_email,
          default_shipping_cost: settings.default_shipping_cost,
          low_stock_threshold: settings.low_stock_threshold,
          square_sync_frequency: settings.square_sync_frequency,
        })
        .eq('id', 1);

      if (error) throw error;

      addToast('Settings saved successfully!', 'success');
    } catch (err) {
      console.error('Error saving settings:', err);
      addToast('Failed to save settings', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-8">Settings</h1>

      <div className="max-w-2xl space-y-6">
        <Card>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Store Information</h2>
          <div className="space-y-4">
            <Input
              label="Store Name"
              value={settings.store_name || ''}
              onChange={(e) => setSettings({ ...settings, store_name: e.target.value })}
              helperText="Displayed when no logo is set"
            />
            <Input
              label="Contact Email"
              type="email"
              value={settings.contact_email || ''}
              onChange={(e) => setSettings({ ...settings, contact_email: e.target.value })}
            />
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Shipping</h2>
          <div className="space-y-4">
            <Input
              label="Default Shipping Cost"
              type="number"
              value={settings.default_shipping_cost?.toString() || '5'}
              onChange={(e) =>
                setSettings({ ...settings, default_shipping_cost: parseFloat(e.target.value) })
              }
              step="0.01"
              min="0"
              helperText="Fallback rate if USPS API fails"
            />

            {shippingServices.length > 0 && (
              <div className="pt-4 border-t border-[var(--color-border)]">
                <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  Optional Shipping Services
                </h3>
                <p className="text-xs text-gray-500 mb-4">
                  Enable services below to let customers add them at checkout for an extra fee.
                </p>
                <div className="space-y-3">
                  {shippingServices.map((service) => (
                    <label
                      key={service.id}
                      className="flex items-start gap-3 p-3 bg-[var(--color-background)]/50 rounded-xl cursor-pointer hover:bg-[var(--color-background)] transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={service.is_enabled}
                        onChange={() => toggleShippingService(service)}
                        className="mt-1 w-4 h-4 rounded border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-900 font-medium">{service.name}</span>
                          {service.is_enabled && (
                            <span className="text-xs px-2 py-0.5 bg-[var(--color-primary)]/20 text-[var(--color-primary)] rounded-full">
                              Active
                            </span>
                          )}
                        </div>
                        {service.description && (
                          <p className="text-sm text-gray-400 mt-0.5">{service.description}</p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Inventory</h2>
          <Input
            label="Low Stock Threshold"
            type="number"
            value={settings.low_stock_threshold?.toString() || '5'}
            onChange={(e) =>
              setSettings({ ...settings, low_stock_threshold: parseInt(e.target.value) })
            }
            min="0"
            helperText="Alert when product stock falls below this number"
          />
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Square Catalog Sync</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Pull products and inventory directly from your Square catalog.
              </p>
            </div>
            <Button
              onClick={handleSquareSync}
              isLoading={isSyncing}
              disabled={isSyncing}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
              Sync Now
            </Button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Auto-sync frequency
              </label>
              <select
                value={settings.square_sync_frequency || 'off'}
                onChange={(e) => setSettings({ ...settings, square_sync_frequency: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              >
                {SYNC_FREQUENCY_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Save settings below to apply the new frequency.
              </p>
            </div>

            {settings.square_last_synced_at && (
              <p className="text-sm text-gray-500">
                Last synced: {formatDateTime(settings.square_last_synced_at)}
              </p>
            )}

            {syncResult && (
              <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-xl">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-green-700">
                  Synced <strong>{syncResult.synced}</strong> products
                  {syncResult.skipped > 0 && `, skipped ${syncResult.skipped}`}
                  {' '}from {syncResult.total} total Square catalog items.
                </p>
              </div>
            )}

            {syncError && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-600">{syncError}</p>
              </div>
            )}
          </div>
        </Card>

        <Button onClick={handleSave} size="lg" isLoading={isSaving}>
          <Save className="h-5 w-5 mr-2" />
          Save Settings
        </Button>
      </div>
    </div>
  );
}
