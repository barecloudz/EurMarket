import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Package, LogOut, Settings, ChevronRight, MapPin, Clock } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';
import Spinner from '../components/ui/Spinner';
import { useToast } from '../components/ui/Toast';
import { formatDate, formatPrice } from '../lib/utils';
import { ORDER_STATUSES } from '../lib/constants';
import type { Order, OrderItem } from '../types';

interface OrderWithItems extends Order {
  items: OrderItem[];
}

export default function Account() {
  const navigate = useNavigate();
  const { user, profile, signOut, updateProfile } = useAuthStore();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<'orders' | 'settings'>('orders');
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    firstName: profile?.first_name || '',
    lastName: profile?.last_name || '',
    phone: profile?.phone || '',
    marketingOptIn: profile?.marketing_opt_in || false,
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        firstName: profile.first_name || '',
        lastName: profile.last_name || '',
        phone: profile.phone || '',
        marketingOptIn: profile.marketing_opt_in || false,
      });
    }
  }, [profile]);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user) { setIsLoading(false); return; }

      try {
        const { data, error } = await supabase
          .from('orders')
          .select(`
            *,
            items:order_items(*)
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setOrders(data || []);
      } catch (err) {
        console.error('Error fetching orders:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      await updateProfile({
        first_name: formData.firstName,
        last_name: formData.lastName,
        phone: formData.phone || null,
        marketing_opt_in: formData.marketingOptIn,
      });

      addToast('Settings saved successfully', 'success');

      // Update email subscriber separately — non-blocking, failure won't affect save
      if (user?.email) {
        supabase
          .from('email_subscribers')
          .select('id')
          .eq('email', user.email.toLowerCase())
          .maybeSingle()
          .then(({ data: existingSub }) => {
            if (existingSub) {
              supabase
                .from('email_subscribers')
                .update({
                  is_subscribed: formData.marketingOptIn,
                  first_name: formData.firstName || null,
                  last_name: formData.lastName || null,
                  unsubscribed_at: formData.marketingOptIn ? null : new Date().toISOString(),
                })
                .eq('id', existingSub.id)
                .then(() => {});
            } else if (formData.marketingOptIn) {
              supabase.from('email_subscribers').insert({
                email: user.email!.toLowerCase(),
                first_name: formData.firstName || null,
                last_name: formData.lastName || null,
                source: 'register',
                is_subscribed: true,
                subscribed_at: new Date().toISOString(),
              }).then(() => {});
            }
          });
      }
    } catch (err) {
      console.error('Error saving settings:', err);
      addToast('Failed to save settings', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusVariant = (status: string): 'success' | 'danger' | 'info' | 'warning' | 'default' => {
    switch (status) {
      case 'delivered': return 'success';
      case 'cancelled': return 'danger';
      case 'shipped': return 'info';
      case 'processing': return 'warning';
      default: return 'default';
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF8F0]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center border-2 border-[#CC0000]/20 shadow-sm">
              <User className="h-8 w-8 text-[#CC0000]" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-black text-gray-900">
                {profile?.first_name
                  ? `${profile.first_name} ${profile.last_name || ''}`
                  : 'My Account'}
              </h1>
              <p className="text-gray-500 text-sm">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('orders')}
            className={`pb-3 px-1 font-semibold transition-colors flex items-center gap-2 text-sm ${
              activeTab === 'orders'
                ? 'text-[#CC0000] border-b-2 border-[#CC0000]'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Package className="h-4 w-4" />
            Orders
            {orders.length > 0 && (
              <span className="text-xs bg-[#CC0000]/10 text-[#CC0000] px-2 py-0.5 rounded-full font-bold">
                {orders.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`pb-3 px-1 font-semibold transition-colors flex items-center gap-2 text-sm ${
              activeTab === 'settings'
                ? 'text-[#CC0000] border-b-2 border-[#CC0000]'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Settings className="h-4 w-4" />
            Settings
          </button>
        </div>

        {/* Content */}
        {activeTab === 'orders' ? (
          <div>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Spinner size="lg" />
              </div>
            ) : orders.length === 0 ? (
              <div className="bg-white rounded-2xl border border-[#CC0000]/10 shadow-sm p-8 text-center">
                <div className="w-16 h-16 bg-[#CC0000]/8 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Package className="h-8 w-8 text-[#CC0000]/40" />
                </div>
                <p className="font-display text-lg font-bold text-gray-900 mb-1">No orders yet</p>
                <p className="text-gray-500 text-sm mb-5">Your order history will appear here.</p>
                <Button onClick={() => navigate('/products')}>Start Shopping</Button>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map((order) => (
                  <div key={order.id} className="bg-white rounded-2xl border border-[#CC0000]/10 shadow-sm overflow-hidden">
                    <button
                      onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                      className="w-full p-4 flex items-center justify-between hover:bg-[#CC0000]/3 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-[#CC0000]/8 rounded-xl flex items-center justify-center">
                          <Package className="h-5 w-5 text-[#CC0000]" />
                        </div>
                        <div className="text-left">
                          <p className="text-gray-900 font-semibold">Order #{order.order_number}</p>
                          <p className="text-gray-500 text-sm flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(order.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <Badge variant={getStatusVariant(order.status)}>
                            {ORDER_STATUSES[order.status as keyof typeof ORDER_STATUSES]?.label || order.status}
                          </Badge>
                          <p className="text-[#CC0000] font-bold mt-1">
                            {formatPrice(order.total)}
                          </p>
                        </div>
                        <ChevronRight className={`h-5 w-5 text-gray-400 transition-transform ${expandedOrder === order.id ? 'rotate-90' : ''}`} />
                      </div>
                    </button>

                    {/* Expanded Order Details */}
                    {expandedOrder === order.id && (
                      <div className="border-t border-gray-100 p-4 bg-[#FFF8F0]">
                        {/* Items */}
                        <div className="space-y-3 mb-4">
                          {order.items.map((item) => (
                            <div key={item.id} className="flex justify-between items-center">
                              <div>
                                <p className="text-gray-900 font-medium">{item.product_name}</p>
                                {item.variant_name && (
                                  <p className="text-gray-500 text-sm">{item.variant_name}</p>
                                )}
                                <p className="text-gray-500 text-sm">Qty: {item.quantity}</p>
                              </div>
                              <span className="text-gray-900 font-semibold">{formatPrice(item.total_price)}</span>
                            </div>
                          ))}
                        </div>

                        {/* Totals */}
                        <div className="border-t border-gray-200 pt-4 space-y-1.5 text-sm">
                          <div className="flex justify-between text-gray-500">
                            <span>Subtotal</span>
                            <span>{formatPrice(order.subtotal)}</span>
                          </div>
                          {order.discount_amount && order.discount_amount > 0 && (
                            <div className="flex justify-between text-green-600">
                              <span>Discount</span>
                              <span>-{formatPrice(order.discount_amount)}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-gray-500">
                            <span>Shipping</span>
                            <span>{formatPrice(order.shipping_cost)}</span>
                          </div>
                          {order.tax > 0 && (
                            <div className="flex justify-between text-gray-500">
                              <span>Tax</span>
                              <span>{formatPrice(order.tax)}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-gray-900 font-bold pt-2 border-t border-gray-200">
                            <span>Total</span>
                            <span>{formatPrice(order.total)}</span>
                          </div>
                        </div>

                        {/* Shipping Address */}
                        {order.shipping_address && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <div className="flex items-center gap-2 mb-2 text-gray-500 text-sm">
                              <MapPin className="h-4 w-4" />
                              <span>Shipped to</span>
                            </div>
                            <p className="text-gray-700 text-sm">
                              {order.shipping_address.address_line_1}
                              {order.shipping_address.address_line_2 && `, ${order.shipping_address.address_line_2}`}
                              <br />
                              {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.postal_code}
                            </p>
                          </div>
                        )}

                        {/* Tracking */}
                        {order.tracking_number && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <p className="text-gray-700 text-sm">
                              <span className="text-gray-500">Tracking:</span>{' '}
                              <span className="font-mono">{order.tracking_number}</span>
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[#CC0000]/10 shadow-sm p-6">
            <h2 className="font-display text-xl font-bold text-gray-900 mb-6">Account Settings</h2>
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="First Name"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                />
                <Input
                  label="Last Name"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                />
              </div>

              <Input
                label="Phone (optional)"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />

              <div className="flex items-start gap-2 pt-2">
                <input
                  type="checkbox"
                  id="marketingOptIn"
                  checked={formData.marketingOptIn}
                  onChange={(e) => setFormData({ ...formData, marketingOptIn: e.target.checked })}
                  className="mt-1 w-4 h-4 rounded border-gray-300 text-[#CC0000] focus:ring-[#CC0000]"
                />
                <label htmlFor="marketingOptIn" className="text-gray-500 text-sm leading-snug">
                  I want to receive marketing emails about new products, offers, and updates
                </label>
              </div>

              <div className="pt-4">
                <Button type="submit" isLoading={isSaving}>
                  Save Changes
                </Button>
              </div>
            </form>

            <div className="mt-8 pt-6 border-t border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-4">Account Information</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Email</span>
                  <span className="text-gray-900">{user?.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Member since</span>
                  <span className="text-gray-900">
                    {user?.created_at ? formatDate(user.created_at) : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-100">
              <Button variant="outline" onClick={handleSignOut} className="w-full sm:w-auto">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
