import { Link, useNavigate } from 'react-router-dom';
import { Search, ArrowRight, ShoppingCart, Bell, RefreshCw, Heart, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import { useProductStore } from '../store/productStore';
import { useWishlistStore } from '../store/wishlistStore';
import { supabase } from '../lib/supabase';
import type { Category, BannerSlide } from '../types';

// Custom hook for touch/swipe support
function useSwipe(onSwipeLeft: () => void, onSwipeRight: () => void) {
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    touchEndX.current = null;
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const onTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    if (Math.abs(distance) >= minSwipeDistance) {
      if (distance > 0) {
        onSwipeLeft();
      } else {
        onSwipeRight();
      }
    }
  };

  return { onTouchStart, onTouchMove, onTouchEnd };
}

// Gradient colors for categories without images
const categoryGradients = [
  'from-emerald-500 to-teal-600',
  'from-orange-500 to-red-600',
  'from-purple-500 to-pink-600',
  'from-cyan-500 to-blue-600',
  'from-rose-500 to-pink-600',
  'from-indigo-500 to-purple-600',
];

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [banners, setBanners] = useState<BannerSlide[]>([]);
  const { user, profile } = useAuthStore();
  const { getItemCount, addItem } = useCartStore();
  const { items: wishlistItems, addItem: addToWishlist, removeItem: removeFromWishlist } = useWishlistStore();
  const navigate = useNavigate();
  const itemCount = getItemCount();

  const { products, isLoading, error, fetchProducts } = useProductStore();

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const { data, error } = await supabase
          .from('banner_slides')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true });
        if (error) throw error;
        setBanners(data || []);
      } catch (err) {
        console.error('Error fetching banners:', err);
      }
    };

    const fetchCategories = async () => {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true });
        if (error) throw error;
        setCategories(data || []);
      } catch (err) {
        console.error('Error fetching categories:', err);
      } finally {
        setCategoriesLoading(false);
      }
    };

    fetchBanners();
    fetchCategories();
  }, []);

  const isProductInWishlist = (productId: string) => wishlistItems.includes(productId);

  const handleQuickAdd = async (e: React.MouseEvent, product: any) => {
    e.preventDefault();
    e.stopPropagation();
    setAddingToCart(product.id);
    addItem(product, undefined, 1);
    setTimeout(() => setAddingToCart(null), 600);
  };

  const handleWishlist = (e: React.MouseEvent, product: any) => {
    e.preventDefault();
    e.stopPropagation();
    if (isProductInWishlist(product.id)) {
      removeFromWishlist(product.id);
    } else {
      addToWishlist(product.id);
    }
  };

  useEffect(() => {
    if (currentSlide >= banners.length) {
      setCurrentSlide(0);
    }
  }, [banners.length, currentSlide]);

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % banners.length);
  }, [banners.length]);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + banners.length) % banners.length);
  }, [banners.length]);

  const bannerSwipe = useSwipe(nextSlide, prevSlide);

  useEffect(() => {
    if (banners.length === 0) return;
    const timer = setInterval(nextSlide, 5000);
    return () => clearInterval(timer);
  }, [nextSlide, banners.length]);

  const categoryContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkCategoryScroll = useCallback(() => {
    const container = categoryContainerRef.current;
    if (!container) return;
    setCanScrollLeft(container.scrollLeft > 0);
    setCanScrollRight(container.scrollLeft < container.scrollWidth - container.clientWidth - 1);
  }, []);

  useEffect(() => {
    checkCategoryScroll();
    const container = categoryContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkCategoryScroll);
      window.addEventListener('resize', checkCategoryScroll);
    }
    return () => {
      if (container) container.removeEventListener('scroll', checkCategoryScroll);
      window.removeEventListener('resize', checkCategoryScroll);
    };
  }, [checkCategoryScroll, categories]);

  const scrollCategories = (direction: 'left' | 'right') => {
    const container = categoryContainerRef.current;
    if (!container) return;
    container.scrollBy({
      left: direction === 'left' ? -(container.clientWidth * 0.8) : container.clientWidth * 0.8,
      behavior: 'smooth',
    });
  };

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const featuredProducts = products.filter((p) => p.is_featured).slice(0, 6);

  // Get user's first name
  const firstName =
    profile?.first_name ||
    user?.user_metadata?.full_name?.split(' ')[0] ||
    user?.email?.split('@')[0] ||
    'Guest';

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      {/* ── Greeting & Search ── */}
      <div className="px-4 pt-5 pb-4">
        <div className="max-w-7xl mx-auto">
          {/* Greeting row */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-gray-500 text-sm">Hello,</p>
              <h1 className="text-xl font-bold text-gray-900">{firstName} 👋</h1>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 text-gray-400 hover:text-gray-700 transition-colors">
                <Bell className="h-5 w-5" />
              </button>
              <Link
                to="/cart"
                className="relative p-2 text-gray-400 hover:text-gray-700 transition-colors"
              >
                <ShoppingCart className="h-5 w-5" />
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[var(--color-primary)] text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                    {itemCount > 9 ? '9+' : itemCount}
                  </span>
                )}
              </Link>
            </div>
          </div>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products..."
              className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent shadow-sm text-sm"
            />
          </form>
        </div>
      </div>

      {/* ── Banner Carousel ── */}
      {banners.length > 0 && (
        <div className="px-4 mb-6">
          <div className="max-w-7xl mx-auto">
            <div
              className="relative overflow-hidden rounded-2xl shadow-sm"
              onTouchStart={bannerSwipe.onTouchStart}
              onTouchMove={bannerSwipe.onTouchMove}
              onTouchEnd={bannerSwipe.onTouchEnd}
            >
              <div
                className="flex transition-transform duration-500 ease-out"
                style={{ transform: `translateX(-${currentSlide * 100}%)` }}
              >
                {banners.map((slide) => (
                  <div
                    key={slide.id}
                    className={`w-full flex-shrink-0 relative bg-gradient-to-r ${slide.gradient} p-6 md:p-8`}
                    style={{ minHeight: '160px' }}
                  >
                    {slide.image_url && (
                      <img
                        src={slide.image_url}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    )}
                    <div className="relative z-10 ml-8 mr-8">
                      {slide.badge && (
                        <div className="inline-block bg-black/20 rounded-lg px-3 py-1 text-xs font-medium text-white mb-2">
                          {slide.badge}
                        </div>
                      )}
                      <h2
                        className={`text-2xl md:text-3xl font-bold ${
                          slide.text_color === 'dark' ? 'text-gray-900' : 'text-white'
                        } mb-1`}
                      >
                        {slide.title}
                      </h2>
                      <p
                        className={`text-base md:text-lg font-medium ${
                          slide.text_color === 'dark' ? 'text-gray-700' : 'text-white/80'
                        } mb-4`}
                      >
                        {slide.subtitle}
                      </p>
                      <Link
                        to={slide.cta_link}
                        className={`inline-flex items-center gap-2 ${
                          slide.text_color === 'dark'
                            ? 'bg-gray-900 text-white hover:bg-gray-800'
                            : 'bg-white text-gray-900 hover:bg-white/90'
                        } px-4 py-2 rounded-xl font-semibold text-sm transition-colors btn-press`}
                      >
                        {slide.cta_text} <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                    <div className="absolute -right-8 -top-8 w-36 h-36 bg-white/10 rounded-full" />
                    <div className="absolute -right-4 -bottom-8 w-28 h-28 bg-white/10 rounded-full" />
                  </div>
                ))}
              </div>

              {/* Arrows */}
              <button
                onClick={prevSlide}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/20 text-white hover:bg-black/40 transition-colors btn-press"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={nextSlide}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/20 text-white hover:bg-black/40 transition-colors btn-press"
              >
                <ChevronRight className="h-4 w-4" />
              </button>

              {/* Dots */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {banners.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentSlide(index)}
                    className={`transition-all ${
                      currentSlide === index
                        ? 'w-5 h-1.5 bg-white rounded-full'
                        : 'w-1.5 h-1.5 bg-white/50 rounded-full hover:bg-white/70'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Categories ── */}
      <div className="px-4 mb-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-base font-bold text-gray-900 mb-3">Categories</h2>
          <div className="relative">
            <div
              ref={categoryContainerRef}
              className="flex gap-3 overflow-x-auto pb-1"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {categoriesLoading ? (
                [1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="w-36 h-36 flex-shrink-0 rounded-2xl bg-gray-100 animate-pulse"
                  />
                ))
              ) : categories.length > 0 ? (
                categories.map((category, index) => (
                  <Link
                    key={category.id}
                    to={`/products?category=${category.slug}`}
                    className={`relative overflow-hidden rounded-2xl w-36 h-36 flex-shrink-0 p-3 flex flex-col justify-end group card-hover btn-press shadow-sm ${
                      !category.image_url
                        ? `bg-gradient-to-br ${categoryGradients[index % categoryGradients.length]}`
                        : ''
                    }`}
                  >
                    {category.image_url && (
                      <img
                        src={category.image_url}
                        alt={category.name}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                    <span className="relative z-10 text-white font-semibold text-sm drop-shadow">
                      {category.name}
                    </span>
                  </Link>
                ))
              ) : (
                <div className="w-full text-center py-8 text-gray-400 text-sm">
                  No categories available yet.
                </div>
              )}
            </div>

            {canScrollLeft && (
              <button
                onClick={() => scrollCategories('left')}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 p-1.5 rounded-full bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 shadow-sm transition-colors btn-press z-10"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            {canScrollRight && (
              <button
                onClick={() => scrollCategories('right')}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 p-1.5 rounded-full bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 shadow-sm transition-colors btn-press z-10"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Featured Products ── */}
      <div className="px-4 pb-24 md:pb-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-gray-900">Hot Products</h2>
            <Link
              to="/products"
              className="text-[var(--color-primary)] hover:opacity-80 transition-opacity flex items-center text-sm font-semibold"
            >
              View All <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {isLoading ? (
              [1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl border border-gray-100 p-3 shadow-sm"
                >
                  <div className="aspect-square bg-gray-100 rounded-xl mb-3 animate-pulse" />
                  <div className="h-3.5 bg-gray-100 rounded w-3/4 mb-2 animate-pulse" />
                  <div className="h-3.5 bg-gray-100 rounded w-1/2 animate-pulse" />
                </div>
              ))
            ) : error ? (
              <div className="col-span-full text-center py-12">
                <p className="text-red-500 mb-2 font-medium">Failed to load products</p>
                <p className="text-gray-400 text-sm mb-4">{error.message}</p>
                <button
                  onClick={() => fetchProducts(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-gray-700 hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors text-sm font-medium shadow-sm"
                >
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </button>
              </div>
            ) : featuredProducts.length > 0 ? (
              featuredProducts.map((product) => {
                const primaryImage =
                  product.images?.find((img) => img.is_primary) || product.images?.[0];
                const inWishlist = isProductInWishlist(product.id);
                const isAdding = addingToCart === product.id;
                return (
                  <Link
                    key={product.id}
                    to={`/products/${product.slug}`}
                    className="bg-white rounded-2xl border border-gray-100 p-3 card-hover group relative overflow-hidden shadow-sm hover:border-[var(--color-primary)]/30 hover:shadow-md transition-all"
                  >
                    {/* Sale badge */}
                    {product.compare_at_price && product.compare_at_price > product.price && (
                      <div className="absolute top-4 left-4 z-20 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-lg shadow-sm">
                        SALE
                      </div>
                    )}

                    {/* Wishlist button */}
                    <button
                      onClick={(e) => handleWishlist(e, product)}
                      className={`absolute top-4 right-4 z-20 p-1.5 rounded-xl transition-all btn-press shadow-sm ${
                        inWishlist
                          ? 'bg-red-500 text-white'
                          : 'bg-white/90 text-gray-400 hover:bg-white hover:text-red-500'
                      }`}
                    >
                      <Heart className={`h-3.5 w-3.5 ${inWishlist ? 'fill-current' : ''}`} />
                    </button>

                    {/* Image */}
                    <div className="aspect-square bg-gray-50 rounded-xl mb-3 overflow-hidden relative">
                      {primaryImage ? (
                        <img
                          src={primaryImage.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">
                          No image
                        </div>
                      )}
                    </div>

                    {/* Name */}
                    <h3 className="font-medium text-gray-900 text-sm mb-1 line-clamp-2 group-hover:text-[var(--color-primary)] transition-colors">
                      {product.name}
                    </h3>

                    {/* Price + Quick add */}
                    <div className="flex items-center justify-between mt-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-900 font-bold text-sm">
                          ${product.price.toFixed(2)}
                        </span>
                        {product.compare_at_price && product.compare_at_price > product.price && (
                          <span className="text-gray-400 line-through text-xs">
                            ${product.compare_at_price.toFixed(2)}
                          </span>
                        )}
                      </div>

                      <button
                        onClick={(e) => handleQuickAdd(e, product)}
                        disabled={isAdding}
                        className={`p-1.5 rounded-xl transition-all btn-press ${
                          isAdding
                            ? 'bg-[var(--color-primary)] text-white animate-cart-bounce'
                            : 'bg-gray-100 text-gray-500 hover:bg-[var(--color-primary)] hover:text-white'
                        }`}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {product.stock_quantity !== undefined &&
                      product.stock_quantity < 10 &&
                      product.stock_quantity > 0 && (
                        <span className="text-xs text-orange-500 mt-1.5 block font-medium">
                          Only {product.stock_quantity} left
                        </span>
                      )}
                  </Link>
                );
              })
            ) : (
              <div className="col-span-full text-center py-12 text-gray-400 text-sm">
                No products available yet. Check back soon!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
