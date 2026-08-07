import { Link, useNavigate } from 'react-router-dom';
import { Search, ArrowRight, Plus, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useCartStore } from '../store/cartStore';
import { useProductStore } from '../store/productStore';
import { supabase } from '../lib/supabase';
import type { Category, BannerSlide } from '../types';

function useSwipe(onLeft: () => void, onRight: () => void) {
  const startX = useRef<number | null>(null);
  const endX = useRef<number | null>(null);
  const min = 50;
  return {
    onTouchStart: (e: React.TouchEvent) => { endX.current = null; startX.current = e.targetTouches[0].clientX; },
    onTouchMove:  (e: React.TouchEvent) => { endX.current = e.targetTouches[0].clientX; },
    onTouchEnd:   () => {
      if (!startX.current || !endX.current) return;
      const d = startX.current - endX.current;
      if (Math.abs(d) >= min) d > 0 ? onLeft() : onRight();
    },
  };
}

const SPECIALTIES = [
  { name: 'Pierogies',     emoji: '🥟' },
  { name: 'Cabbage Rolls', emoji: '🥬' },
  { name: 'Borscht',       emoji: '🍲' },
  { name: 'Kapusta',       emoji: '🥗' },
  { name: 'Blintzes',      emoji: '🫔' },
];

const COUNTRY_FLAGS = [
  { code: 'de', name: 'Germany'    },
  { code: 'pl', name: 'Poland'     },
  { code: 'gb', name: 'England'    },
  { code: 'ie', name: 'Ireland'    },
  { code: 'ua', name: 'Ukraine'    },
  { code: 'cz', name: 'Czech Rep.' },
  { code: 'hu', name: 'Hungary'    },
  { code: 'ro', name: 'Romania'    },
  { code: 'ru', name: 'Russia'     },
  { code: 'sk', name: 'Slovakia'   },
  { code: 'lt', name: 'Lithuania'  },
  { code: 'lv', name: 'Latvia'     },
];

const CATEGORY_GRADIENTS = [
  'from-red-600 to-rose-800',
  'from-amber-500 to-orange-600',
  'from-amber-600 to-orange-700',
  'from-blue-600 to-indigo-700',
  'from-purple-600 to-pink-700',
  'from-slate-600 to-gray-800',
];

export default function Home() {
  const [searchQuery, setSearchQuery]           = useState('');
  const [addingToCart, setAddingToCart]         = useState<string | null>(null);
  const [currentSlide, setCurrentSlide]         = useState(0);
  const [categories, setCategories]             = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [banners, setBanners]                   = useState<BannerSlide[]>([]);
  const { addItem } = useCartStore();
  const navigate                                = useNavigate();
  const { products, isLoading, error, fetchProducts } = useProductStore();
  const categoryContainerRef                    = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft]       = useState(false);
  const [canScrollRight, setCanScrollRight]     = useState(false);

  useEffect(() => {
    const fetchBanners = async () => {
      const { data } = await supabase.from('banner_slides').select('*').eq('is_active', true).order('display_order');
      setBanners(data || []);
    };
    const fetchCategories = async () => {
      const { data } = await supabase.from('categories').select('*').eq('is_active', true).order('display_order');
      setCategories(data || []);
      setCategoriesLoading(false);
    };
    fetchBanners();
    fetchCategories();
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    if (currentSlide >= banners.length && banners.length > 0) setCurrentSlide(0);
  }, [banners.length, currentSlide]);

  const nextSlide = useCallback(() => setCurrentSlide((p) => (p + 1) % banners.length), [banners.length]);
  const prevSlide = useCallback(() => setCurrentSlide((p) => (p - 1 + banners.length) % banners.length), [banners.length]);
  const bannerSwipe = useSwipe(nextSlide, prevSlide);

  useEffect(() => {
    if (banners.length === 0) return;
    const t = setInterval(nextSlide, 5000);
    return () => clearInterval(t);
  }, [nextSlide, banners.length]);

  const checkScroll = useCallback(() => {
    const el = categoryContainerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = categoryContainerRef.current;
    el?.addEventListener('scroll', checkScroll);
    window.addEventListener('resize', checkScroll);
    return () => { el?.removeEventListener('scroll', checkScroll); window.removeEventListener('resize', checkScroll); };
  }, [checkScroll, categories]);

  const scrollCats = (dir: 'left' | 'right') => {
    categoryContainerRef.current?.scrollBy({ left: dir === 'left' ? -250 : 250, behavior: 'smooth' });
  };

  const handleQuickAdd = (e: React.MouseEvent, product: any) => {
    e.preventDefault();
    e.stopPropagation();
    setAddingToCart(product.id);
    addItem(product, undefined, 1);
    setTimeout(() => setAddingToCart(null), 600);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
  };

  const featuredProducts = products.filter((p) => p.is_featured).slice(0, 8);
  const allProducts = products.slice(0, 8);
  const displayProducts = featuredProducts.length > 0 ? featuredProducts : allProducts;

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>

      {/* ── Hero / Banner ── */}
      {banners.length > 0 ? (
        <div className="relative overflow-hidden"
          onTouchStart={bannerSwipe.onTouchStart}
          onTouchMove={bannerSwipe.onTouchMove}
          onTouchEnd={bannerSwipe.onTouchEnd}>
          <div className="flex transition-transform duration-500 ease-out" style={{ transform: `translateX(-${currentSlide * 100}%)` }}>
            {banners.map((slide) => (
              <div key={slide.id}
                className={`w-full flex-shrink-0 relative bg-gradient-to-r ${slide.gradient} px-6 py-12 md:py-20`}
                style={{ minHeight: '220px' }}>
                {slide.image_url && (
                  <img src={slide.image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
                )}
                <div className="relative z-10 max-w-7xl mx-auto">
                  {slide.badge && (
                    <span className="inline-block bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full mb-3 uppercase tracking-wide">
                      {slide.badge}
                    </span>
                  )}
                  <h2 className={`text-3xl md:text-4xl font-black mb-2 ${slide.text_color === 'dark' ? 'text-gray-900' : 'text-white'}`}>
                    {slide.title}
                  </h2>
                  <p className={`text-base mb-5 ${slide.text_color === 'dark' ? 'text-gray-700' : 'text-white/80'}`}>
                    {slide.subtitle}
                  </p>
                  <Link to={slide.cta_link}
                    className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-colors btn-press ${
                      slide.text_color === 'dark' ? 'bg-gray-900 text-white hover:bg-gray-800' : 'bg-white text-[var(--color-primary)] hover:bg-gray-50'
                    }`}>
                    {slide.cta_text} <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
                <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/8 rounded-full" />
                <div className="absolute -right-4 -bottom-8 w-32 h-32 bg-white/8 rounded-full" />
              </div>
            ))}
          </div>
          <button onClick={prevSlide} className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/25 text-white hover:bg-black/40 btn-press">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={nextSlide} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/25 text-white hover:bg-black/40 btn-press">
            <ChevronRight className="h-4 w-4" />
          </button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {banners.map((_, i) => (
              <button key={i} onClick={() => setCurrentSlide(i)}
                className={`transition-all ${i === currentSlide ? 'w-5 h-1.5 bg-white rounded-full' : 'w-1.5 h-1.5 bg-white/50 rounded-full'}`} />
            ))}
          </div>
        </div>
      ) : (
        /* Default hero — farmers market / delicatessen aesthetic */
        <div className="relative overflow-hidden bg-[#FFF8F0]">
          {/* Top red banner */}
          <div className="bg-[#CC0000] text-white text-center py-2.5 px-4">
            <p className="font-display font-black text-lg md:text-xl tracking-tight leading-none">
              European Market <span className="font-normal text-white/70 text-sm mx-2">·</span> Columbus, NC
            </p>
          </div>

          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-6 md:pt-12 md:pb-10">
            {/* Script intro line */}
            <p className="font-script text-xl md:text-2xl text-gray-500 text-center mb-1">
              Authentic European Goodies — Fresh & Homemade
            </p>

            {/* Ornamental divider */}
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="h-px bg-[#CC0000]/30 flex-1 max-w-[80px]" />
              <span className="text-[#CC0000]/60 text-base select-none">✦</span>
              <div className="h-px bg-[#CC0000]/30 flex-1 max-w-[80px]" />
            </div>

            {/* Two-column layout: left = market identity, right = store info card */}
            <div className="flex flex-col md:flex-row gap-6 md:gap-10 items-start">

              {/* Left — identity + dishes */}
              <div className="flex-1">
                <h1 className="font-display text-4xl md:text-5xl font-black text-[#CC0000] leading-tight mb-3">
                  Your Local European<br />Farmers Market
                </h1>
                <p className="text-gray-600 text-sm md:text-base mb-4 leading-relaxed">
                  We bring the taste of 25+ countries straight to your table — from Poland, Germany, Ukraine, Ireland & beyond. Shop our store or find us at local markets and vendor events throughout the region.
                </p>

                {/* Signature dishes */}
                <div className="flex flex-wrap gap-2 mb-5">
                  {['Cabbage Rolls','Pierogies','Poppyseed Rolls','Sweet Cheese Rolls','German Pretzels','Borscht','Blintzes'].map((dish) => (
                    <span key={dish} className="text-xs bg-white border border-[#CC0000]/20 text-[#CC0000] font-semibold px-2.5 py-1 rounded-full">
                      {dish}
                    </span>
                  ))}
                </div>

                <div className="flex flex-wrap gap-3">
                  <Link to="/preorder"
                    className="inline-flex items-center gap-2 bg-[#CC0000] text-white font-bold px-6 py-2.5 rounded-xl hover:bg-[#AA0000] transition-colors btn-press shadow-md text-sm">
                    Pre-Order Now <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link to="/products"
                    className="inline-flex items-center gap-2 bg-white text-[#CC0000] font-bold px-6 py-2.5 rounded-xl border-2 border-[#CC0000] hover:bg-[#CC0000]/5 transition-colors btn-press text-sm">
                    Shop Online
                  </Link>
                </div>
              </div>

              {/* Right — store info card */}
              <div className="w-full md:w-64 bg-white border-2 border-[#CC0000]/20 rounded-2xl p-5 shadow-sm flex-shrink-0">
                <div className="text-center mb-3">
                  <div className="inline-block bg-[#CC0000] text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-2">
                    Visit Us
                  </div>
                  <p className="font-display font-bold text-gray-900 text-sm leading-tight">
                    155 W Mills Street<br />Columbus, NC 28722
                  </p>
                </div>
                <div className="border-t border-gray-100 pt-3 mb-3">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Store Hours</p>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 font-medium">Mon – Thu</span>
                    <span className="font-bold text-gray-900">11AM – 6PM</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-gray-600 font-medium">Fri – Sun</span>
                    <span className="font-semibold text-gray-400">Closed</span>
                  </div>
                </div>
                <a href="tel:8645906760"
                  className="flex items-center justify-center gap-2 w-full bg-[#FFF8F0] hover:bg-[#CC0000]/5 text-[#CC0000] font-bold text-sm py-2 rounded-xl transition-colors border border-[#CC0000]/20">
                  (864) 590-6760
                </a>
                <div className="border-t border-gray-100 mt-3 pt-3">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Also Find Us At</p>
                  <p className="text-xs text-gray-600 leading-relaxed">Local farmers markets &amp; vendor events throughout NC — follow our Facebook for dates!</p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom red stripe */}
          <div className="h-2 bg-[#CC0000]" />
        </div>
      )}

      {/* ── Search bar (mobile) ── */}
      <div className="px-4 pt-4 pb-2 md:hidden">
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search European products..."
            className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent shadow-sm text-sm"
          />
        </form>
      </div>

      {/* ── Categories ── */}
      <div className="px-4 py-5">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-gray-900">Browse Categories</h2>
            <Link to="/products" className="text-[var(--color-primary)] text-sm font-semibold hover:opacity-80 flex items-center gap-1">
              All <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="relative">
            <div ref={categoryContainerRef}
              className="flex gap-3 overflow-x-auto pb-1"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {categoriesLoading ? (
                [1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-32 h-32 flex-shrink-0 rounded-2xl bg-gray-100 animate-pulse" />
                ))
              ) : categories.length > 0 ? (
                categories.map((cat, idx) => (
                  <Link key={cat.id} to={`/products?category=${cat.slug}`}
                    className={`relative overflow-hidden rounded-2xl w-32 h-32 flex-shrink-0 p-3 flex flex-col justify-end group card-hover btn-press shadow-sm ${
                      !cat.image_url ? `bg-gradient-to-br ${CATEGORY_GRADIENTS[idx % CATEGORY_GRADIENTS.length]}` : ''
                    }`}>
                    {cat.image_url && (
                      <img src={cat.image_url} alt={cat.name} className="absolute inset-0 w-full h-full object-cover" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                    <span className="relative z-10 text-white font-bold text-xs drop-shadow">{cat.name}</span>
                  </Link>
                ))
              ) : (
                /* Placeholder categories while DB is being populated */
                ['Meats & Deli', 'Dairy & Cheese', 'Fresh Bakery', 'Beverages', 'Sweets', 'Pantry'].map((name, idx) => (
                  <Link key={name} to={`/products?search=${encodeURIComponent(name)}`}
                    className={`relative overflow-hidden rounded-2xl w-32 h-32 flex-shrink-0 p-3 flex flex-col justify-end group card-hover btn-press shadow-sm bg-gradient-to-br ${CATEGORY_GRADIENTS[idx % CATEGORY_GRADIENTS.length]}`}>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    <span className="relative z-10 text-white font-bold text-xs drop-shadow">{name}</span>
                  </Link>
                ))
              )}
            </div>
            {canScrollLeft && (
              <button onClick={() => scrollCats('left')}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 p-1.5 rounded-full bg-white border border-gray-200 text-gray-600 shadow-sm btn-press z-10">
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            {canScrollRight && (
              <button onClick={() => scrollCats('right')}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 p-1.5 rounded-full bg-white border border-gray-200 text-gray-600 shadow-sm btn-press z-10">
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Featured Products ── */}
      <div className="px-4 pb-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-gray-900">Featured Products</h2>
            <Link to="/products" className="text-[var(--color-primary)] hover:opacity-80 flex items-center text-sm font-semibold">
              View All <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {isLoading ? (
              [1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 p-3 shadow-sm">
                  <div className="aspect-square bg-gray-100 rounded-xl mb-3 animate-pulse" />
                  <div className="h-3 bg-gray-100 rounded w-3/4 mb-2 animate-pulse" />
                  <div className="h-3 bg-gray-100 rounded w-1/2 animate-pulse" />
                </div>
              ))
            ) : error ? (
              <div className="col-span-full text-center py-12">
                <p className="text-red-500 mb-3 font-medium">Failed to load products</p>
                <button onClick={() => fetchProducts(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-gray-700 hover:border-[var(--color-primary)] text-sm shadow-sm">
                  <RefreshCw className="h-4 w-4" /> Try Again
                </button>
              </div>
            ) : displayProducts.length > 0 ? (
              displayProducts.map((product) => {
                const img = product.images?.find((i) => i.is_primary) || product.images?.[0];
                const isAdding = addingToCart === product.id;
                return (
                  <Link key={product.id} to={`/products/${product.slug}`}
                    className="bg-white rounded-2xl border border-gray-100 p-3 card-hover group relative shadow-sm hover:border-[var(--color-primary)]/30 hover:shadow-md transition-all">
                    {product.compare_at_price && product.compare_at_price > product.price && (
                      <div className="absolute top-4 left-4 z-20 bg-[var(--color-primary)] text-white text-[10px] font-bold px-2 py-0.5 rounded-lg shadow-sm">SALE</div>
                    )}
                    <div className="aspect-square bg-gray-50 rounded-xl mb-3 overflow-hidden">
                      {img ? (
                        <img src={img.image_url} alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-200 text-xs">No image</div>
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-2 group-hover:text-[var(--color-primary)] transition-colors leading-tight">
                      {product.name}
                    </h3>
                    <div className="flex items-center justify-between mt-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-900 font-bold text-sm">${product.price.toFixed(2)}</span>
                        {product.compare_at_price && product.compare_at_price > product.price && (
                          <span className="text-gray-400 line-through text-xs">${product.compare_at_price.toFixed(2)}</span>
                        )}
                      </div>
                      <button onClick={(e) => handleQuickAdd(e, product)} disabled={isAdding}
                        className={`w-7 h-7 rounded-full flex items-center justify-center transition-all btn-press ${
                          isAdding ? 'bg-[var(--color-primary-light)] text-white scale-90' : 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-light)]'
                        }`}>
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </Link>
                );
              })
            ) : (
              <div className="col-span-full text-center py-12 text-gray-400 text-sm">
                Products coming soon — check back soon!
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Fresh Bakery Spotlight ── */}
      <div className="px-4 pb-6">
        <div className="max-w-7xl mx-auto">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#CC0000] to-[#880000] p-6 md:p-8 shadow-lg">
            <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/5 rounded-full" />
            <div className="absolute right-4 -bottom-12 w-56 h-56 bg-white/5 rounded-full" />
            <div className="relative z-10">
              <span className="inline-block bg-[var(--color-accent)]/20 text-[var(--color-accent)] text-xs font-bold px-3 py-1 rounded-full mb-3 uppercase tracking-widest">
                Fresh Daily
              </span>
              <h2 className="font-display text-2xl md:text-3xl font-black text-white mb-2">Our Homemade Bakery</h2>
              <p className="text-white/70 text-sm md:text-base mb-5 max-w-lg">
                Authentic recipes passed down through generations. Made fresh in our Columbus kitchen every day.
              </p>
              <div className="flex flex-wrap gap-2 mb-6">
                {SPECIALTIES.map((item) => (
                  <span key={item.name}
                    className="flex items-center gap-1.5 bg-white/12 text-white text-sm font-medium px-3 py-1.5 rounded-full border border-white/15">
                    {item.emoji} {item.name}
                  </span>
                ))}
              </div>
              <Link to="/products?category=bakery"
                className="inline-flex items-center gap-2 bg-white text-[var(--color-primary)] font-bold px-5 py-2.5 rounded-xl hover:bg-gray-50 transition-colors btn-press text-sm shadow-md">
                Shop Bakery <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── 25 Countries ── */}
      <div className="px-4 pb-10 md:pb-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-8">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-black text-gray-900 mb-1">From 25+ Countries</h2>
                <p className="text-gray-500 text-sm">Authentic imports sourced directly from Europe</p>
              </div>
              <div className="text-right">
                <span className="text-3xl font-black text-[var(--color-primary)]">25+</span>
                <p className="text-gray-400 text-xs">countries</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {COUNTRY_FLAGS.map((c) => (
                <div key={c.name}
                  className="flex items-center gap-1.5 bg-gray-50 border border-gray-100 px-3 py-2 rounded-xl hover:border-[var(--color-primary)]/30 hover:bg-amber-50 transition-colors">
                  <img src={`https://flagcdn.com/20x15/${c.code}.png`} alt={c.name} className="w-5 h-auto rounded-sm shadow-sm" />
                  <span className="text-xs font-semibold text-gray-700">{c.name}</span>
                </div>
              ))}
              <div className="flex items-center gap-1.5 bg-[var(--color-primary)]/8 border border-[var(--color-primary)]/20 px-3 py-2 rounded-xl">
                <span className="text-xs font-semibold text-[var(--color-primary)]">+ 17 more</span>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
