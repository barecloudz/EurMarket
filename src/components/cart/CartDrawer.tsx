import { X, ShoppingBag, Minus, Plus, Trash2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCartStore } from '../../store/cartStore';
import { formatPrice } from '../../lib/utils';

export default function CartDrawer() {
  const { items, isOpen, closeCart, updateQuantity, removeItem, getSubtotal } = useCartStore();
  const subtotal = getSubtotal();

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" onClick={closeCart} />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-[#FFF8F0] z-50 flex flex-col shadow-2xl animate-slide-up">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-[#CC0000] text-white flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="h-5 w-5" />
            <h2 className="font-display text-lg font-bold">Your Cart</h2>
            {items.length > 0 && (
              <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {items.length}
              </span>
            )}
          </div>
          <button onClick={closeCart} className="p-1.5 hover:bg-white/15 rounded-lg transition-colors" aria-label="Close cart">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-auto p-4 space-y-3">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-16">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center border-2 border-[#CC0000]/15 shadow-sm mb-5">
                <ShoppingBag className="h-9 w-9 text-[#CC0000]/40" />
              </div>
              <h3 className="font-display text-xl font-bold text-gray-900 mb-2">Your cart is empty</h3>
              <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                Discover our fresh European specialties and imported groceries.
              </p>
              <Link
                to="/products"
                onClick={closeCart}
                className="inline-flex items-center gap-2 bg-[#CC0000] text-white font-bold px-6 py-3 rounded-xl hover:bg-[#AA0000] transition-colors btn-press"
              >
                Start Shopping <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            items.map((item) => {
              const itemPrice = item.product.price + (item.variant?.price_adjustment || 0);
              const img = item.product.images?.find(i => i.is_primary) || item.product.images?.[0];
              return (
                <div
                  key={`${item.product.id}-${item.variant?.id || 'default'}`}
                  className="flex gap-3 bg-white rounded-2xl p-3 shadow-sm border border-[#CC0000]/8"
                >
                  {/* Image */}
                  <div className="w-18 h-18 w-[72px] h-[72px] bg-gray-50 rounded-xl overflow-hidden flex-shrink-0 border border-gray-100">
                    {img?.image_url ? (
                      <img src={img.image_url} alt={item.product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag className="h-6 w-6 text-gray-200" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-gray-900 font-semibold text-sm leading-tight line-clamp-2 mb-0.5">
                      {item.product.name}
                    </h3>
                    {item.variant && (
                      <p className="text-gray-400 text-xs mb-1">{item.variant.name}</p>
                    )}
                    <p className="text-[#CC0000] font-bold text-sm">{formatPrice(itemPrice)}</p>

                    {/* Quantity + remove */}
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1, item.variant?.id)}
                          className="w-7 h-7 flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-white rounded-md transition-all btn-press"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="text-gray-900 text-sm font-bold w-6 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1, item.variant?.id)}
                          className="w-7 h-7 flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-white rounded-md transition-all btn-press"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <button
                        onClick={() => removeItem(item.product.id, item.variant?.id)}
                        className="p-1.5 text-gray-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
                        aria-label="Remove item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="p-4 border-t-2 border-[#CC0000]/10 bg-white flex-shrink-0 space-y-3">
            {/* Subtotal */}
            <div className="flex items-center justify-between">
              <span className="text-gray-500 text-sm">Subtotal</span>
              <span className="font-display text-xl font-black text-gray-900">{formatPrice(subtotal)}</span>
            </div>
            <p className="text-gray-400 text-xs">Shipping &amp; taxes calculated at checkout</p>

            <div className="space-y-2 pt-1">
              <Link
                to="/checkout"
                onClick={closeCart}
                className="flex items-center justify-center gap-2 w-full bg-[#CC0000] text-white font-bold py-3.5 rounded-xl hover:bg-[#AA0000] transition-colors btn-press shadow-md text-base"
              >
                Checkout <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/cart"
                onClick={closeCart}
                className="flex items-center justify-center w-full bg-white text-gray-700 font-semibold py-3 rounded-xl border-2 border-gray-200 hover:border-[#CC0000]/30 transition-colors text-sm"
              >
                View Full Cart
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
