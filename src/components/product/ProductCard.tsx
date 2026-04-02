import { Link } from 'react-router-dom';
import { Package, ShoppingCart, Heart } from 'lucide-react';
import Badge from '../ui/Badge';
import { formatPrice, getStockStatus } from '../../lib/utils';
import { useCartStore } from '../../store/cartStore';
import { useWishlistStore } from '../../store/wishlistStore';
import { useAuthStore } from '../../store/authStore';
import type { Product } from '../../types';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addItem, openCart } = useCartStore();
  const { addItem: addToWishlist, removeItem: removeFromWishlist, isInWishlist } = useWishlistStore();
  const { user } = useAuthStore();
  const stockStatus = getStockStatus(product.stock_quantity, product.low_stock_threshold);
  const primaryImage = product.images?.find((img) => img.is_primary) || product.images?.[0];
  const inWishlist = isInWishlist(product.id);

  const isOnSale = product.compare_at_price && product.compare_at_price > product.price;
  const discountPercent = isOnSale
    ? Math.round(((product.compare_at_price! - product.price) / product.compare_at_price!) * 100)
    : 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product);
    openCart();
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
    <Link
      to={`/products/${product.slug}`}
      className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:border-[var(--color-primary)]/40 hover:shadow-lg transition-all duration-200 card-hover"
    >
      {/* Image */}
      <div className="aspect-square bg-gray-50 relative overflow-hidden">
        {primaryImage ? (
          <img
            src={primaryImage.image_url}
            alt={primaryImage.alt_text || product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="h-16 w-16 text-gray-300" />
          </div>
        )}

        {/* Badges */}
        {stockStatus !== 'in_stock' && (
          <div className="absolute top-2 left-2">
            <Badge variant={stockStatus === 'low_stock' ? 'warning' : 'danger'}>
              {stockStatus === 'low_stock' ? 'Low Stock' : 'Out of Stock'}
            </Badge>
          </div>
        )}

        {product.is_featured && !isOnSale && (
          <div className="absolute top-2 right-2">
            <Badge variant="success">Featured</Badge>
          </div>
        )}

        {isOnSale && (
          <div className="absolute top-2 right-2">
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-lg shadow-sm">
              {discountPercent}% OFF
            </span>
          </div>
        )}

        {/* Wishlist button */}
        <button
          onClick={handleWishlistToggle}
          className={`absolute bottom-2 left-2 p-2 rounded-full transition-all shadow-sm ${
            inWishlist
              ? 'bg-red-500 text-white'
              : 'bg-white/90 text-gray-400 hover:bg-white hover:text-red-500'
          }`}
        >
          <Heart className={`h-4 w-4 ${inWishlist ? 'fill-current' : ''}`} />
        </button>

        {/* Quick add — desktop hover */}
        <button
          onClick={handleAddToCart}
          disabled={stockStatus === 'out_of_stock' && !product.continue_selling_when_out_of_stock}
          className="absolute bottom-2 right-2 p-2 bg-[var(--color-primary)] text-white rounded-xl opacity-0 group-hover:opacity-100 transition-opacity shadow-sm disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
        >
          <ShoppingCart className="h-4 w-4" />
        </button>
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="text-gray-900 font-medium text-sm mb-1 truncate group-hover:text-[var(--color-primary)] transition-colors">
          {product.name}
        </h3>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-gray-900 font-bold text-sm">{formatPrice(product.price)}</span>
            {product.compare_at_price && (
              <span className="text-gray-400 text-xs line-through">
                {formatPrice(product.compare_at_price)}
              </span>
            )}
          </div>
          {/* Mobile add to cart */}
          <button
            onClick={handleAddToCart}
            disabled={stockStatus === 'out_of_stock' && !product.continue_selling_when_out_of_stock}
            className="md:hidden p-1.5 bg-[var(--color-primary)] text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-transform"
          >
            <ShoppingCart className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </Link>
  );
}
