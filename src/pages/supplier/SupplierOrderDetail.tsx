import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Mail, Phone, Package, Truck, Save, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { formatPrice, formatDateTime } from '../../lib/utils';
import { FULFILLMENT_STATUSES } from '../../lib/constants';
import { useToast } from '../../components/ui/Toast';
import Spinner from '../../components/ui/Spinner';
import type { Order, OrderItem, FulfillmentStatus } from '../../types';

export default function SupplierOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { addToast } = useToast();

  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savingItemId, setSavingItemId] = useState<string | null>(null);

  // Per-item editing state
  const [itemEdits, setItemEdits] = useState<Record<string, {
    fulfillment_status: FulfillmentStatus;
    tracking_number: string;
  }>>({});

  useEffect(() => {
    if (id && user) fetchOrder();
  }, [id, user]);

  const fetchOrder = async () => {
    try {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', id)
        .single();

      if (orderError) throw orderError;

      const { data: itemsData, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', id)
        .eq('supplier_id', user!.id);

      if (itemsError) throw itemsError;

      setOrder(orderData);
      setItems(itemsData || []);

      // Initialize edit state from current DB values
      const edits: typeof itemEdits = {};
      for (const item of itemsData || []) {
        edits[item.id] = {
          fulfillment_status: item.fulfillment_status as FulfillmentStatus,
          tracking_number: item.tracking_number || '',
        };
      }
      setItemEdits(edits);
    } catch (err) {
      console.error('Error fetching order:', err);
      navigate('/supplier/orders');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveItem = async (itemId: string) => {
    const edits = itemEdits[itemId];
    if (!edits) return;

    setSavingItemId(itemId);
    try {
      const updatePayload: Record<string, unknown> = {
        fulfillment_status: edits.fulfillment_status,
        tracking_number: edits.tracking_number || null,
      };

      if (edits.fulfillment_status === 'shipped' && !items.find(i => i.id === itemId)?.shipped_at) {
        updatePayload.shipped_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('order_items')
        .update(updatePayload)
        .eq('id', itemId)
        .eq('supplier_id', user!.id);

      if (error) throw error;

      // Sync order-level fulfillment status
      await supabase.rpc('sync_order_fulfillment_status', { p_order_id: id });

      // Update local items state
      setItems(prev => prev.map(item =>
        item.id === itemId
          ? { ...item, ...updatePayload }
          : item
      ));

      addToast('Fulfillment updated', 'success');
    } catch (err: any) {
      addToast(err.message || 'Failed to update fulfillment', 'error');
    } finally {
      setSavingItemId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!order) return null;

  const addr = order.shipping_address;

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/supplier/orders')}
          className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Order #{order.order_number}</h1>
          <p className="text-gray-500 text-sm">{formatDateTime(order.created_at)}</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Customer & Shipping Info */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5">
          <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-[var(--color-primary)]" />
            Ship To
          </h2>
          <div className="space-y-1.5 text-sm">
            {order.guest_name && (
              <p className="font-semibold text-gray-900 text-base">{order.guest_name}</p>
            )}
            {addr && (
              <>
                <p className="text-gray-600">{addr.address_line_1}</p>
                {addr.address_line_2 && <p className="text-gray-600">{addr.address_line_2}</p>}
                <p className="text-gray-600">
                  {addr.city}, {addr.state} {addr.postal_code}
                </p>
                <p className="text-gray-600">{addr.country}</p>
              </>
            )}
            <div className="pt-2 space-y-1">
              {order.guest_email && (
                <p className="flex items-center gap-2 text-gray-500">
                  <Mail className="h-4 w-4" />
                  {order.guest_email}
                </p>
              )}
              {order.guest_phone && (
                <p className="flex items-center gap-2 text-gray-500">
                  <Phone className="h-4 w-4" />
                  {order.guest_phone}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* My Items + Fulfillment */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5">
          <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Package className="h-4 w-4 text-[var(--color-primary)]" />
            Your Items
          </h2>

          <div className="space-y-5">
            {items.map((item) => {
              const edit = itemEdits[item.id];
              const isSaving = savingItemId === item.id;
              const currentStatus = FULFILLMENT_STATUSES[item.fulfillment_status as FulfillmentStatus];

              return (
                <div key={item.id} className="border border-gray-100 rounded-xl p-4">
                  {/* Item info */}
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="font-semibold text-gray-900">{item.product_name}</p>
                      {item.variant_name && (
                        <p className="text-sm text-gray-400">{item.variant_name}</p>
                      )}
                      <p className="text-sm text-gray-500 mt-0.5">
                        Qty: {item.quantity} · {formatPrice(item.unit_price)} each
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">{formatPrice(item.total_price)}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${currentStatus?.color}`}>
                        {currentStatus?.label}
                      </span>
                    </div>
                  </div>

                  {/* Fulfillment controls */}
                  {edit && (
                    <div className="space-y-3 pt-3 border-t border-gray-100">
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">
                          Fulfillment Status
                        </label>
                        <select
                          value={edit.fulfillment_status}
                          onChange={(e) => setItemEdits(prev => ({
                            ...prev,
                            [item.id]: { ...prev[item.id], fulfillment_status: e.target.value as FulfillmentStatus },
                          }))}
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]"
                        >
                          {Object.entries(FULFILLMENT_STATUSES).map(([value, { label }]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">
                          Tracking Number
                        </label>
                        <div className="flex items-center gap-2">
                          <Truck className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <input
                            type="text"
                            value={edit.tracking_number}
                            onChange={(e) => setItemEdits(prev => ({
                              ...prev,
                              [item.id]: { ...prev[item.id], tracking_number: e.target.value },
                            }))}
                            placeholder="Enter tracking number..."
                            className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]"
                          />
                        </div>
                      </div>

                      <button
                        onClick={() => handleSaveItem(item.id)}
                        disabled={isSaving}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--color-primary)] text-white font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
                      >
                        {isSaving ? (
                          <Spinner size="sm" />
                        ) : (
                          <>
                            <Save className="h-4 w-4" />
                            Save Changes
                          </>
                        )}
                      </button>

                      {item.shipped_at && (
                        <p className="text-xs text-gray-400 flex items-center gap-1">
                          <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                          Shipped {formatDateTime(item.shipped_at)}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
