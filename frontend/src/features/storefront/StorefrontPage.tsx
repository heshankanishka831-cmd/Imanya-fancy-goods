import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { publicApi } from '../../services/endpoints';
import { Product, Category } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { useCart } from '../cart/CartContext';
import { useAuth } from '../auth/AuthContext';
import { Search, ShoppingCart, Check, Package, Sparkles, UserPlus, LogIn, ShieldCheck, Store } from 'lucide-react';
import { Spinner } from '../../components/ui/Spinner';

export const StorefrontPage: React.FC = () => {
  const { addToCart } = useCart();
  const { isAuthenticated, user, customerProfile } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [addingId, setAddingId] = useState<string | null>(null);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadProducts();
  }, [selectedCategory, search]);

  const loadCategories = async () => {
    try {
      const res = await publicApi.getCategories();
      if (res.success && res.data) {
        setCategories(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadProducts = async () => {
    try {
      setIsLoading(true);
      const res = await publicApi.getProducts({
        category_id: selectedCategory || undefined,
        search: search || undefined,
      });
      if (res.success && res.data) {
        setProducts(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = async (productId: string) => {
    try {
      setAddingId(productId);
      await addToCart(productId, 1);
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Header Banner */}
      <div className="relative rounded-3xl bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 p-8 sm:p-12 text-white shadow-xl overflow-hidden mb-10">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-blue-200 border border-white/10 mb-4">
            <Sparkles className="h-3.5 w-3.5 text-blue-300" />
            <span>Imanya Fancy Goods Wholesale</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight mb-3">
            Imanya Fancy Goods & Wholesale Distribution
          </h1>
          <p className="text-sm sm:text-base text-blue-100 font-normal leading-relaxed mb-6">
            Browse our imported fancy goods, fashion accessories, wholesale gifts, and premium commercial products. Check live stock, add items to cart, and send instant wholesale orders directly via WhatsApp.
          </p>

          {/* Quick Action Navigation Bar */}
          {!isAuthenticated ? (
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-blue-900 font-bold text-sm shadow-md hover:bg-blue-50 transition-all hover:scale-[1.02]"
              >
                <UserPlus className="h-4 w-4 text-blue-600" />
                <span>Register Wholesale Account</span>
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600/80 hover:bg-blue-600 text-white font-semibold text-sm border border-blue-400/40 backdrop-blur-sm transition-all"
              >
                <LogIn className="h-4 w-4" />
                <span>Sign In to Account</span>
              </Link>
            </div>
          ) : user?.role_name === 'Customer' ? (
            <div className="inline-flex items-center gap-3 p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-xs text-blue-100">
              <div className="h-8 w-8 rounded-xl bg-blue-500/30 flex items-center justify-center text-white">
                <Store className="h-4 w-4" />
              </div>
              <div>
                <p className="font-bold text-white text-sm">
                  Welcome, {customerProfile?.business_name || user?.first_name}!
                </p>
                <p className="text-blue-200">
                  You are signed in as a verified Wholesale Customer. Add items to your cart to submit orders via WhatsApp.
                </p>
              </div>
            </div>
          ) : (
            <div className="inline-flex items-center gap-3 p-3 rounded-2xl bg-amber-500/20 backdrop-blur-md border border-amber-400/30 text-xs text-amber-100">
              <div className="h-8 w-8 rounded-xl bg-amber-500/30 flex items-center justify-center text-white">
                <ShieldCheck className="h-4 w-4 text-amber-300" />
              </div>
              <div className="flex items-center gap-4">
                <div>
                  <p className="font-bold text-white text-sm">
                    Logged in as {user?.role_name} ({user?.first_name})
                  </p>
                  <p className="text-amber-200">
                    Switch to the administrative dashboard to manage products, inventory, and staff.
                  </p>
                </div>
                <Link
                  to="/admin/dashboard"
                  className="px-3 py-1.5 bg-white text-slate-900 font-bold rounded-lg text-xs hover:bg-amber-100 transition-colors whitespace-nowrap"
                >
                  Open Dashboard &rarr;
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-8">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search products or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
          />
        </div>

        {/* Category Pills */}
        <div className="w-full md:w-auto flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === null
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            All Products
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === c.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      {isLoading ? (
        <Spinner size="lg" />
      ) : products.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-xs">
          <Package className="h-12 w-12 mx-auto text-gray-300 mb-3" />
          <h3 className="text-base font-bold text-gray-800">No products found</h3>
          <p className="text-xs text-gray-500 mt-1">Try selecting another category or adjusting your search term.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map((p) => {
            const primaryImg = p.images?.length > 0 ? p.images[0].image_url : null;

            return (
              <div
                key={p.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-xs hover:shadow-md transition-all flex flex-col overflow-hidden group"
              >
                {/* Image Box */}
                <div className="relative aspect-4/3 bg-gray-50 border-b border-gray-100 flex items-center justify-center overflow-hidden">
                  {primaryImg ? (
                    <img
                      src={primaryImg}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <Package className="h-12 w-12 text-gray-300" />
                  )}
                  {/* Stock Badge */}
                  <div className="absolute top-3 right-3">
                    {p.in_stock ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <Check className="h-3 w-3" /> In Stock
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                        Out of Stock
                      </span>
                    )}
                  </div>
                </div>

                {/* Content Box */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider block mb-1">
                      {p.category_name}
                    </span>
                    <h3 className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                      {p.name}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1 font-mono">SKU: {p.sku}</p>
                    {p.description && (
                      <p className="text-xs text-gray-600 mt-2 line-clamp-2 leading-relaxed">
                        {p.description}
                      </p>
                    )}
                  </div>

                  {/* Price & Action */}
                  <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-gray-400 block">Unit Price:</span>
                      <span className="text-lg font-extrabold text-gray-900">
                        {formatCurrency(p.selling_price)}
                      </span>
                      <span className="text-[11px] text-gray-500 ml-1">/{p.unit_of_measure}</span>
                    </div>

                    <button
                      onClick={() => handleAdd(p.id)}
                      disabled={!p.in_stock || addingId === p.id}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-gray-100 disabled:text-gray-400 text-white text-xs font-bold transition-all shadow-sm active:scale-95"
                    >
                      <ShoppingCart className="h-3.5 w-3.5" />
                      <span>{addingId === p.id ? 'Adding...' : 'Add'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
