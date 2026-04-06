import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, AlertCircle, RefreshCw, X } from 'lucide-react';
import ProductCard from '../components/product/ProductCard';
import Button from '../components/ui/Button';
import { ProductGridSkeleton } from '../components/ui/Skeleton';
import { useProductStore } from '../store/productStore';
import { useCategories } from '../hooks/useCategories';

const SORT_OPTIONS = [
  { value: 'newest',     label: 'Newest'           },
  { value: 'price-asc',  label: 'Price: Low → High' },
  { value: 'price-desc', label: 'Price: High → Low' },
];

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch]             = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy]             = useState<'newest' | 'price-asc' | 'price-desc'>('newest');
  const [filtersOpen, setFiltersOpen]   = useState(false);

  const { products, isLoading, error, fetchProducts } = useProductStore();
  const { categories } = useCategories();

  useEffect(() => {
    const slug = searchParams.get('category');
    if (slug && categories.length > 0) {
      const cat = categories.find((c) => c.slug === slug);
      if (cat) setSelectedCategory(cat.id);
    }
    const q = searchParams.get('search');
    if (q) setSearch(q);
  }, [searchParams, categories]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const handleCategoryChange = (id: string | null) => {
    setSelectedCategory(id);
    const params: Record<string, string> = {};
    if (id) {
      const cat = categories.find((c) => c.id === id);
      if (cat) params.category = cat.slug;
    }
    if (search) params.search = search;
    setSearchParams(params);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params: Record<string, string> = {};
    if (search.trim()) params.search = search.trim();
    if (selectedCategory) {
      const cat = categories.find((c) => c.id === selectedCategory);
      if (cat) params.category = cat.slug;
    }
    setSearchParams(params);
  };

  const filteredProducts = products
    .filter((p) => {
      const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
      const matchCat    = !selectedCategory || p.category_id === selectedCategory;
      return matchSearch && matchCat;
    })
    .sort((a, b) => {
      if (sortBy === 'price-asc')  return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const activeCategory = categories.find((c) => c.id === selectedCategory);

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      {/* ── Page header ── */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-2xl font-black text-gray-900 mb-1">
            {activeCategory ? activeCategory.name : 'All Products'}
          </h1>
          <p className="text-gray-500 text-sm">
            {activeCategory
              ? `Authentic ${activeCategory.name.toLowerCase()} from across Europe`
              : 'Authentic European groceries from 25+ countries'}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* ── Search + Filter bar ── */}
        <div className="flex gap-3 mb-5">
          <form onSubmit={handleSearchSubmit} className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className="w-full pl-10 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent shadow-sm"
            />
            {search && (
              <button type="button" onClick={() => { setSearch(''); setSearchParams({}); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            )}
          </form>
          <button onClick={() => setFiltersOpen(!filtersOpen)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
              filtersOpen || selectedCategory
                ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
            }`}>
            <SlidersHorizontal className="h-4 w-4" />
            <span className="hidden sm:inline">Filter</span>
          </button>
        </div>

        {/* ── Filter panel ── */}
        {filtersOpen && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-5 animate-fade-in">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Category */}
              <div className="flex-1">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Category</p>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => handleCategoryChange(null)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      !selectedCategory ? 'bg-[var(--color-primary)] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}>
                    All
                  </button>
                  {categories.map((cat) => (
                    <button key={cat.id} onClick={() => handleCategoryChange(cat.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                        selectedCategory === cat.id ? 'bg-[var(--color-primary)] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}>
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>
              {/* Sort */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Sort</p>
                <div className="flex gap-2">
                  {SORT_OPTIONS.map((opt) => (
                    <button key={opt.value} onClick={() => setSortBy(opt.value as typeof sortBy)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
                        sortBy === opt.value ? 'bg-[var(--color-primary)] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Results count ── */}
        {!isLoading && !error && (
          <p className="text-sm text-gray-500 mb-4">
            {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'}
            {search ? ` for "${search}"` : ''}
            {activeCategory ? ` in ${activeCategory.name}` : ''}
          </p>
        )}

        {/* ── Product grid ── */}
        {isLoading ? (
          <ProductGridSkeleton count={8} />
        ) : error ? (
          <div className="text-center py-16">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <p className="text-gray-900 font-semibold mb-1">Failed to load products</p>
            <p className="text-gray-500 text-sm mb-5">{error.message}</p>
            <Button onClick={() => fetchProducts(true)} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" /> Try Again
            </Button>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-4">🔍</p>
            <p className="text-gray-900 font-semibold mb-1">No products found</p>
            <p className="text-gray-500 text-sm mb-5">Try adjusting your search or filters</p>
            <button onClick={() => { setSearch(''); setSelectedCategory(null); setSearchParams({}); }}
              className="text-[var(--color-primary)] font-semibold text-sm hover:underline">
              Clear all filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 pb-24 md:pb-8">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
