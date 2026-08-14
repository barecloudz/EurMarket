import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle, Package, ArrowRight, MapPin } from 'lucide-react';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import { supabase } from '../lib/supabase';
import { formatPrice } from '../lib/utils';
import type { Order, OrderItem } from '../types';

export default function OrderConfirmation() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!id) return;

      try {
        const { data, error } = await supabase
          .from('orders')
          .select(`
            *,
            items:order_items(*)
          `)
          .eq('id', id)
          .single();

        if (error) throw error;
        setOrder(data);
      } catch (err) {
        console.error('Error fetching order:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrder();
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FFF8F0] flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF8F0] py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Success header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-green-50 border-2 border-green-200 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="h-10 w-10 text-green-500" />
          </div>
          <h1 className="font-display text-3xl font-black text-gray-900 mb-3">Thank you for your order!</h1>
          <p className="text-gray-500">Your order has been placed successfully.</p>
          {order?.guest_email && (
            <p className="text-gray-500 text-sm mt-1">
              A confirmation email has been sent to <span className="font-semibold text-gray-700">{order.guest_email}</span>
            </p>
          )}
        </div>

        {order ? (
          <div className="bg-white rounded-2xl border border-[#CC0000]/10 shadow-sm p-6 mb-8">
            {/* Order header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-[#CC0000]/8 rounded-xl flex items-center justify-center">
                  <Package className="h-4 w-4 text-[#CC0000]" />
                </div>
                <span className="text-gray-900 font-semibold">
                  Order #{order.order_number || id?.slice(0, 8).toUpperCase()}
                </span>
              </div>
              <span className="text-gray-400 text-sm">
                {new Date(order.created_at).toLocaleDateString()}
              </span>
            </div>

            {/* Order Items */}
            <div className="space-y-3 mb-6">
              {order.items?.map((item: OrderItem) => (
                <div key={item.id} className="flex justify-between items-start">
                  <div>
                    <p className="text-gray-900 font-medium">{item.product_name}</p>
                    {item.variant_name && (
                      <p className="text-gray-500 text-sm">{item.variant_name}</p>
                    )}
                    <p className="text-gray-400 text-sm">Qty: {item.quantity}</p>
                  </div>
                  <span className="text-gray-900 font-semibold">{formatPrice(item.total_price)}</span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="border-t border-gray-100 pt-4 space-y-2">
              <div className="flex justify-between text-gray-500 text-sm">
                <span>Subtotal</span>
                <span>{formatPrice(order.subtotal)}</span>
              </div>
              {order.discount_amount && order.discount_amount > 0 && (
                <div className="flex justify-between text-green-600 text-sm">
                  <span>Discount</span>
                  <span>-{formatPrice(order.discount_amount)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-500 text-sm">
                <span>Shipping</span>
                <span>{formatPrice(order.shipping_cost)}</span>
              </div>
              {order.tax > 0 && (
                <div className="flex justify-between text-gray-500 text-sm">
                  <span>Tax</span>
                  <span>{formatPrice(order.tax)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-100">
                <span className="text-gray-900">Total</span>
                <span className="text-[#CC0000]">{formatPrice(order.total)}</span>
              </div>
            </div>

            {/* Shipping Address */}
            {order.shipping_address && (
              <div className="mt-5 pt-5 border-t border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="h-4 w-4 text-[#CC0000]" />
                  <span className="text-gray-900 font-semibold text-sm">Shipping to</span>
                </div>
                <p className="text-gray-500 text-sm leading-relaxed">
                  {order.shipping_address.address_line_1}
                  {order.shipping_address.address_line_2 && `, ${order.shipping_address.address_line_2}`}
                  <br />
                  {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.postal_code}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[#CC0000]/10 shadow-sm p-6 mb-8 text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Package className="h-5 w-5 text-[#CC0000]" />
              <span className="text-gray-900 font-semibold">Order #{id?.slice(0, 8).toUpperCase()}</span>
            </div>
            <p className="text-gray-500 text-sm">
              We'll send you shipping updates via email as your order is processed.
            </p>
          </div>
        )}

        <div className="text-center space-y-4">
          <Button as={Link} to="/products" size="lg">
            Continue Shopping <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          <div>
            <Link to="/account" className="text-[#CC0000] font-semibold hover:underline text-sm">
              View order history
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
