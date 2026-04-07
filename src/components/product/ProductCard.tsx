import { Link } from 'react-router-dom';
import { Package, Plus, Heart } from 'lucide-react';
import Badge from '../ui/Badge';
import { formatPrice, getStockStatus } from '../../lib/utils';
import { useCartStore } from '../../store/cartStore';
import { useWishlistStore } from '../../store/wishlistStore';
import { useAuthStore } from '../../store/authStore';
import type { Product } from '../../types';
import { useState } from 'react';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCartStore();
  const { addItem: addToWishlist, removeItem: removeFromWishlist, isInWishlist } = useWishlistStore();
  const { user } = useAuthStore();
  const [adding, setAdding] = useState(false);

  const stockStatus = getStockStatus(product.stock_quantity, product.low_stock_threshold);
  const primaryImage = product.images?.find((img) => img.is_primary) || product.images?.[0];
  const inWishlist = isInWishlist(product.id);
  const isOnSale = product.compare_at_price && product.compare_at_price > product.price;
  const discountPercent = isOnSale
    ? Math.round(((product.compare_at_price! - product.price) / product.compare_at_price!) * 100)
    : 0;
  const outOfStock = stockStatus === 'out_of_stock' && !product.continue_selling_when_out_of_stock;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (outOfStock) return;
    setAdding(true);
    addItem(product);
    setTimeout(() => setAdding(false), 600);
  };

  const handleWishlistToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (inWishlist) {
      removeFromWishlist(product.id, user?.id);
    } else {
      addToWishlist(product.id, user?.id);
    }
  };

  return (
    <Link to={`/products/${product.slug}`}
      className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:border-[var(--color-primary)]/30 hover:shadow-lg transition-all duration-200 card-hover relative">

      {/* Image */}
      <div className="aspect-square bg-gray-50 relative overflow-hidden">
        {primaryImage ? (
          <img src={primaryImage.image_url} alt={primaryImage.alt_text || product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="h-14 w-14 text-gray-200" />
          </div>
        )}

        {/* Sale badge */}
        {isOnSale && (
          <div className="absolute top-2.5 left-2.5 z-10">
            <span className="bg-[var(--color-primary)] text-white text-[10px] font-bold px-2 py-0.5 rounded-lg shadow-sm">
              {discountPercent}% OFF
            </span>
          </div>
        )}

        {/* Stock badge */}
        {stockStatus === 'low_stock' && (
          <div className="absolute top-2.5 left-2.5 z-10">
            <Badge variant="warning">Low Stock</Badge>
          </div>
        )}
        {stockStatus === 'out_of_stock' && (
          <div className="absolute top-2.5 left-2.5 z-10">
            <Badge variant="danger">Out of Stock</Badge>
          </div>
        )}

        {/* Wishlist button */}
        <button onClick={handleWishlistToggle}
          className={`absolute top-2.5 right-2.5 z-10 p-1.5 rounded-full transition-all btn-press shadow-sm ${
            inWishlist ? 'bg-red-500 text-white' : 'bg-white/90 text-gray-400 hover:bg-white hover:text-red-500'
          }`}>
          <Heart className={`h-3.5 w-3.5 ${inWishlist ? 'fill-current' : ''}`} />
        </button>
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="text-gray-900 font-semibold text-sm mb-0.5 line-clamp-2 group-hover:text-[var(--color-primary)] transition-colors leading-tight">
          {product.name}
        </h3>

        {product.category && (
          <p className="text-gray-400 text-[11px] mb-2">{product.category.name}</p>
        )}

        <div className="flex items-center justify-between">
          <div>
            <span className="text-gray-900 font-bold text-sm">{formatPrice(product.price)}</span>
            {product.compare_at_price && product.compare_at_price > product.price && (
              <span className="text-gray-400 text-xs line-through ml-1.5">
                {formatPrice(product.compare_at_price)}
              </span>
            )}
          </div>

          {/* Circular + add button */}
          <button onClick={handleAddToCart} disabled={outOfStock}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all btn-press shadow-sm flex-shrink-0 ${
              adding
                ? 'bg-[var(--color-primary-light)] text-white scale-90'
                : outOfStock
                ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                : 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-light)]'
            }`}>
            <Plus className={`h-4 w-4 ${adding ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {stockStatus === 'low_stock' && (
          <p className="text-orange-500 text-[11px] mt-1.5 font-medium">
            Only {product.stock_quantity} left
          </p>
        )}
      </div>
    </Link>
  );
}
