import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Package, Eye, EyeOff, Edit, Lock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { formatPrice, getStockStatus } from '../../lib/utils';
import { useToast } from '../../components/ui/Toast';
import Spinner from '../../components/ui/Spinner';
import type { Product } from '../../types';

type Tab = 'all' | 'mine';

export default function SupplierProducts() {
  const { user } = useAuthStore();
  const { addToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<Tab>('mine');
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    if (user) fetchProducts();
  }, [user]);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*, images:product_images(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleActive = async (product: Product) => {
    setTogglingId(product.id);
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_active: !product.is_active })
        .eq('id', product.id)
        .eq('supplier_id', user!.id);

      if (error) throw error;
      setProducts(prev => prev.map(p =>
        p.id === product.id ? { ...p, is_active: !p.is_active } : p
      ));
      addToast(`Product ${product.is_active ? 'hidden' : 'published'}`, 'success');
    } catch (err: any) {
      addToast(err.message || 'Failed to update product', 'error');
    } finally {
      setTogglingId(null);
    }
  };

  const isOwn = (product: Product) => product.supplier_id === user?.id;

  const filtered = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesTab = tab === 'all' || isOwn(p);
    return matchesSearch && matchesTab;
  });

  const myCount = products.filter(isOwn).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-500 mt-1">{myCount} of your products · {products.length} total in store</p>
        </div>
        <Link
          to="/supplier/products/new"
          className="flex items-center gap-2 px-4 py-2.5 bg-[var(--color-primary)] text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" />
          Add Product
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit mb-5">
        {([['mine', 'My Products'], ['all', 'All Products']] as [Tab, string][]).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === value
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
            {value === 'mine' && myCount > 0 && (
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                tab === 'mine' ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]' : 'bg-gray-200 text-gray-500'
              }`}>
                {myCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
          {tab === 'mine' ? (
            <>
              <p className="mb-4">You haven't added any products yet</p>
              <Link
                to="/supplier/products/new"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--color-primary)] text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
              >
                <Plus className="h-4 w-4" />
                Add Your First Product
              </Link>
            </>
          ) : (
            <p>No products found</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((product) => {
            const primaryImage = product.images?.find(img => img.is_primary) || product.images?.[0];
            const stockStatus = getStockStatus(product.stock_quantity, product.low_stock_threshold);
            const own = isOwn(product);

            return (
              <div
                key={product.id}
                className={`bg-white border rounded-2xl p-4 flex items-center gap-4 transition-all ${
                  own ? 'border-gray-100' : 'border-gray-100 opacity-75'
                }`}
              >
                {/* Image */}
                <div className="w-16 h-16 bg-gray-50 rounded-xl flex-shrink-0 overflow-hidden">
                  {primaryImage?.image_url ? (
                    <img src={primaryImage.image_url} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-6 w-6 text-gray-300" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900 truncate">{product.name}</p>
                    {!own && (
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-400 rounded-full flex items-center gap-1 flex-shrink-0">
                        <Lock className="h-3 w-3" />
                        Other supplier
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">{formatPrice(product.price)}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      product.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {product.is_active ? 'Published' : 'Hidden'}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      stockStatus === 'in_stock' ? 'bg-green-50 text-green-700' :
                      stockStatus === 'low_stock' ? 'bg-orange-50 text-orange-700' :
                      'bg-red-50 text-red-700'
                    }`}>
                      {stockStatus === 'in_stock' ? `${product.stock_quantity} in stock` :
                       stockStatus === 'low_stock' ? `${product.stock_quantity} left` : 'Out of stock'}
                    </span>
                  </div>
                </div>

                {/* Actions — only for own products */}
                {own && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleToggleActive(product)}
                      disabled={togglingId === product.id}
                      className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                      title={product.is_active ? 'Hide product' : 'Publish product'}
                    >
                      {togglingId === product.id ? (
                        <Spinner size="sm" />
                      ) : product.is_active ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                    <Link
                      to={`/supplier/products/${product.id}/edit`}
                      className="p-2 text-gray-400 hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 rounded-lg transition-colors"
                    >
                      <Edit className="h-4 w-4" />
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
