import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Minus, Plus, Trash2, ChevronLeft, ShoppingCart, Sparkles } from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import { formatPrice } from '../lib/utils';
import Button from '../components/ui/Button';
import { DEFAULT_SHIPPING_COST } from '../lib/constants';

export default function Cart() {
  const navigate = useNavigate();
  const { items, updateQuantity, removeItem, getSubtotal } = useCartStore();
  const subtotal = getSubtotal();
  const shipping = items.length > 0 ? DEFAULT_SHIPPING_COST : 0;
  const total = subtotal + shipping;
  const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center animate-fade-in">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gray-100 flex items-center justify-center">
            <ShoppingBag className="h-12 w-12 text-gray-300" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h1>
          <p className="text-gray-500 mb-8 max-w-sm text-sm leading-relaxed">
            Looks like you haven't added any items to your cart yet. Let's find something awesome!
          </p>
          <Link
            to="/products"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--color-primary)] text-white font-semibold rounded-xl hover:opacity-90 transition-all btn-press shadow-sm"
          >
            <Sparkles className="h-5 w-5" />
            Start Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-48 md:pb-8" style={{ backgroundColor: 'var(--color-background)' }}>
      {/* Sticky header */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 -ml-2 text-gray-500 hover:text-gray-900 transition-colors btn-press"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Shopping Cart</h1>
              <p className="text-gray-400 text-xs">{itemCount} {itemCount === 1 ? 'item' : 'items'}</p>
            </div>
          </div>
          <Link
            to="/products"
            className="text-[var(--color-primary)] text-sm font-semibold hover:opacity-80 transition-opacity"
          >
            Continue Shopping
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-5">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-3 animate-fade-in-stagger">
            {items.map((item, index) => {
              const itemPrice = item.product.price + (item.variant?.price_adjustment || 0);
              const primaryImage = item.product.images?.find(img => img.is_primary) || item.product.images?.[0];
              return (
                <div
                  key={`${item.product.id}-${item.variant?.id || 'default'}`}
                  className="bg-white rounded-2xl border border-gray-100 p-4 card-hover shadow-sm"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="flex gap-4">
                    {/* Image */}
                    <Link
                      to={`/products/${item.product.slug}`}
                      className="w-22 h-22 bg-gray-50 rounded-xl flex-shrink-0 overflow-hidden group"
                      style={{ width: '88px', height: '88px' }}
                    >
                      {primaryImage?.image_url ? (
                        <img
                          src={primaryImage.image_url}
                          alt={item.product.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ShoppingBag className="h-8 w-8 text-gray-300" />
                        </div>
                      )}
                    </Link>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0">
                          <Link
                            to={`/products/${item.product.slug}`}
                            className="text-gray-900 font-semibold text-sm hover:text-[var(--color-primary)] transition-colors line-clamp-2"
                          >
                            {item.product.name}
                          </Link>
                          {item.variant && (
                            <p className="text-gray-400 text-xs mt-0.5">{item.variant.name}</p>
                          )}
                        </div>
                        <button
                          onClick={() => removeItem(item.product.id, item.variant?.id)}
                          className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all btn-press flex-shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between mt-3">
                        {/* Quantity controls */}
                        <div className="inline-flex items-center bg-gray-100 rounded-xl">
                          <button
                            onClick={() =>
                              updateQuantity(item.product.id, item.quantity - 1, item.variant?.id)
                            }
                            className="p-2 text-gray-500 hover:text-gray-900 transition-colors btn-press"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="text-gray-900 w-7 text-center font-semibold text-sm">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() =>
                              updateQuantity(item.product.id, item.quantity + 1, item.variant?.id)
                            }
                            className="p-2 text-gray-500 hover:text-gray-900 transition-colors btn-press"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {/* Price */}
                        <div className="text-right">
                          <span className="text-gray-900 font-bold text-sm">
                            {formatPrice(itemPrice * item.quantity)}
                          </span>
                          {item.quantity > 1 && (
                            <p className="text-gray-400 text-xs">
                              {formatPrice(itemPrice)} each
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div
              className="bg-white rounded-2xl border border-gray-100 p-6 sticky top-20 shadow-sm animate-fade-in"
              style={{ animationDelay: '0.2s' }}
            >
              <h2 className="text-base font-bold text-gray-900 mb-5 flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-[var(--color-primary)]" />
                Order Summary
              </h2>

              <div className="space-y-3 mb-5">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal ({itemCount} items)</span>
                  <span className="text-gray-900 font-medium">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Shipping</span>
                  <span className="text-gray-900 font-medium">{formatPrice(shipping)}</span>
                </div>
                <div className="border-t border-gray-100 pt-3 flex justify-between">
                  <span className="text-gray-900 font-bold">Total</span>
                  <span className="text-[var(--color-primary)] font-bold text-lg">{formatPrice(total)}</span>
                </div>
              </div>

              <Button as={Link} to="/checkout" className="w-full btn-press" size="lg">
                Checkout — {formatPrice(total)}
              </Button>

              <div className="mt-4 flex items-center justify-center gap-2 text-gray-400 text-xs">
                <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
                </svg>
                Secure checkout with Stripe
              </div>
            </div>

            <div
              className="mt-3 bg-white rounded-2xl border border-gray-100 p-4 text-center shadow-sm animate-fade-in"
              style={{ animationDelay: '0.3s' }}
            >
              <p className="text-gray-400 text-sm mb-2">Need more items?</p>
              <Link
                to="/products"
                className="inline-flex items-center gap-1.5 text-[var(--color-primary)] font-semibold text-sm hover:opacity-80 transition-opacity"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Browse Products
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Checkout Bar */}
      <div className="fixed bottom-[68px] left-0 right-0 md:hidden z-30 px-4 pb-3">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-500 text-sm">Total</span>
            <span className="text-xl font-bold text-gray-900">{formatPrice(total)}</span>
          </div>
          <Button as={Link} to="/checkout" className="w-full btn-press" size="lg">
            Checkout
          </Button>
        </div>
      </div>
    </div>
  );
}
