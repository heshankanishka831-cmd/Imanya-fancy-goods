import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { publicApi } from '../../services/endpoints';
import { Product, Category } from '../../types';
import { useCart } from '../cart/CartContext';
import { useAuth } from '../auth/AuthContext';
import { subscribeCatalogUpdated } from '../../utils/catalogSync';
import {
  Search,
  ShoppingCart,
  Package,
  Sparkles,
  UserPlus,
  LogIn,
  ShieldCheck,
  Store,
  ChevronRight,
  Truck,
  CreditCard,
  MessageSquare,
  ArrowUpDown,
  Tag,
  X,
  CheckCircle2,
  PhoneCall,
  Clock,
  Layers,
} from 'lucide-react';
import { Spinner } from '../../components/ui/Spinner';
import { ProductCard, ProductGrid } from '../customer/components/ProductCard';
import { ProductQuickViewModal } from '../customer/components/ProductQuickViewModal';

export const StorefrontPage: React.FC = () => {
  const { addToCart } = useCart();
  const { isAuthenticated, user, customerProfile } = useAuth();

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'name-asc' | 'stock-desc'>('featured');
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Quick View Modal state
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadProducts = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await publicApi.getProducts({
        category_id: selectedCategory || undefined,
        search: search.trim() || undefined,
        limit: 200,
      });
      if (res.success && res.data) {
        setProducts(res.data);
      }
    } catch (err) {
      console.error('Failed to load products', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategory, search]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    const unsubscribe = subscribeCatalogUpdated(() => {
      loadProducts();
    });
    const handleFocus = () => {
      loadProducts();
    };
    window.addEventListener('focus', handleFocus);
    return () => {
      unsubscribe();
      window.removeEventListener('focus', handleFocus);
    };
  }, [loadProducts]);

  const loadCategories = async () => {
    try {
      const res = await publicApi.getCategories();
      if (res.success && res.data) {
        setCategories(res.data);
      }
    } catch (err) {
      console.error('Failed to load categories', err);
    }
  };

  const handleAddToCart = async (product: Product, qty: number) => {
    await addToCart(product.id, qty);
  };

  // Category counts based on loaded catalog
  const categoryCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    products.forEach((p) => {
      counts[p.category_id] = (counts[p.category_id] || 0) + 1;
    });
    return counts;
  }, [products]);

  // Filtered & Sorted products pipeline
  const processedProducts = useMemo(() => {
    let list = [...products];

    if (onlyInStock) {
      list = list.filter((p) => p.in_stock);
    }

    switch (sortBy) {
      case 'price-asc': {
        const eff = (p: Product) =>
          p.is_discount_active && p.discounted_price ? p.discounted_price : p.selling_price;
        list.sort((a, b) => eff(a) - eff(b));
        break;
      }
      case 'price-desc': {
        const eff = (p: Product) =>
          p.is_discount_active && p.discounted_price ? p.discounted_price : p.selling_price;
        list.sort((a, b) => eff(b) - eff(a));
        break;
      }
      case 'name-asc':
        list.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'stock-desc':
        list.sort((a, b) => (b.available_stock || 0) - (a.available_stock || 0));
        break;
      default:
        // Default order
        break;
    }

    return list;
  }, [products, onlyInStock, sortBy]);

  const openQuickView = (p: Product) => {
    setQuickViewProduct(p);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* 1. International-Grade Enterprise Hero Banner */}
      <div className="relative rounded-3xl bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 p-8 sm:p-12 text-white shadow-xl overflow-hidden border border-blue-900/50">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_50%)] pointer-events-none" />

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/15 backdrop-blur-md text-xs font-bold text-blue-300 border border-blue-400/20 mb-4">
            <Sparkles className="h-3.5 w-3.5 text-blue-300" />
            <span>Direct Imports & Customer Portal</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight mb-4">
            Imanya Fancy Goods <span className="text-blue-400 font-semibold text-2xl sm:text-3xl block sm:inline">| B2B Distribution</span>
          </h1>

          <p className="text-sm sm:text-base text-blue-100/90 font-normal leading-relaxed mb-6">
            Direct importers and sales distributors of fashion accessories, hair accessories, cosmetic novelties, jewelry, and commercial fancy goods. Verified unit prices in whole Sri Lankan Rupees (<strong className="text-white">Rs.</strong>) with instant WhatsApp bank slip confirmation.
          </p>

          {/* User Account / Navigation Bar */}
          {!isAuthenticated ? (
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm shadow-md transition-all hover:scale-[1.02]"
              >
                <UserPlus className="h-4 w-4" />
                <span>Register Customer Account</span>
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs sm:text-sm border border-white/20 backdrop-blur-sm transition-all"
              >
                <LogIn className="h-4 w-4" />
                <span>Client Sign In</span>
              </Link>
            </div>
          ) : user?.role_name === 'Customer' ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-xs text-blue-100">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-500/30 flex items-center justify-center text-white shrink-0">
                  <Store className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-white text-sm">
                    Welcome back, {customerProfile?.business_name || user?.first_name}!
                  </p>
                  <p className="text-blue-200 text-xs">
                    Customer portal enabled. Manage orders, invoices, and bank slips.
                  </p>
                </div>
              </div>
              <Link
                to="/customer/dashboard"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-xs transition-all hover:scale-105 shrink-0"
              >
                <Store className="h-3.5 w-3.5" />
                <span>My Customer Portal & Orders &rarr;</span>
              </Link>
            </div>
          ) : (
            <div className="inline-flex items-center gap-3 p-3.5 rounded-2xl bg-amber-500/20 backdrop-blur-md border border-amber-400/30 text-xs text-amber-100">
              <div className="h-9 w-9 rounded-xl bg-amber-500/30 flex items-center justify-center text-white">
                <ShieldCheck className="h-5 w-5 text-amber-300" />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div>
                  <p className="font-bold text-white text-sm">
                    Logged in as Staff ({user?.role_name})
                  </p>
                  <p className="text-amber-200 text-xs">
                    You have administrative privileges to manage stock, products, and incoming orders.
                  </p>
                </div>
                <Link
                  to="/admin/dashboard"
                  className="px-3.5 py-1.5 bg-white text-slate-900 font-bold rounded-xl text-xs hover:bg-amber-100 transition-colors shadow-xs"
                >
                  Admin Console &rarr;
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* 4 Trust Value Pillars (Matching Puckator & Faire Style) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-8 pt-8 border-t border-white/10">
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10">
            <div className="p-2 rounded-xl bg-blue-600/30 text-blue-300">
              <Truck className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Islandwide Delivery</p>
              <p className="text-[10px] text-blue-200">All 25 districts covered</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10">
            <div className="p-2 rounded-xl bg-emerald-600/30 text-emerald-300">
              <Tag className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Factory Direct</p>
              <p className="text-[10px] text-blue-200">Sales import rates</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10">
            <div className="p-2 rounded-xl bg-amber-600/30 text-amber-300">
              <CreditCard className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Bank Slip Payments</p>
              <p className="text-[10px] text-blue-200">Online transfer / deposit</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10">
            <div className="p-2 rounded-xl bg-indigo-600/30 text-indigo-300">
              <MessageSquare className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">WhatsApp Verification</p>
              <p className="text-[10px] text-blue-200">Direct order dispatch</p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Interactive B2B Sourcing Workflow Steps */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
              4
            </div>
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
              Ordering & Verification Workflow
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 w-full md:w-auto text-xs">
            <div className="flex items-center gap-2 text-gray-600">
              <span className="h-5 w-5 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-[10px]">1</span>
              <span>Select bulk quantities</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <span className="h-5 w-5 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-[10px]">2</span>
              <span>Review cart & checkout</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <span className="h-5 w-5 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-[10px]">3</span>
              <span>Send slip via WhatsApp</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <span className="h-5 w-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-[10px]">4</span>
              <span>Admin confirms & ships</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Advanced Sourcing Controls: Search, Categories, Sort & In-Stock */}
      <div className="space-y-4">
        {/* Search & Sorting Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Live Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by product name, SKU / Item Code (e.g. 001)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-200 bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-3 py-1.5 shadow-2xs text-xs">
              <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />
              <span className="text-gray-500 font-medium">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-gray-800 font-bold focus:outline-none cursor-pointer"
              >
                <option value="featured">Featured / Default</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="name-asc">Product Name (A-Z)</option>
                <option value="stock-desc">Stock Quantity (High to Low)</option>
              </select>
            </div>

            {/* In-Stock Filter Toggle */}
            <button
              onClick={() => setOnlyInStock(!onlyInStock)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all shadow-2xs border ${
                onlyInStock
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              <CheckCircle2 className={`h-3.5 w-3.5 ${onlyInStock ? 'text-white' : 'text-emerald-600'}`} />
              <span>In-Stock Only</span>
            </button>
          </div>
        </div>

        {/* Category Navigation Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shadow-2xs ${
              selectedCategory === null
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            All Categories ({products.length})
          </button>

          {categories.map((c) => {
            const count = categoryCounts[c.id] || 0;
            const isSelected = selectedCategory === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shadow-2xs flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                <span>{c.name}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isSelected ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Results Count & Active Filters Indicator */}
        <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
          <span>
            Showing <strong className="text-gray-900">{processedProducts.length}</strong> products
            {selectedCategory && (
              <> in <span className="text-blue-600 font-semibold">{categories.find((c) => c.id === selectedCategory)?.name}</span></>
            )}
            {onlyInStock && ' (In-Stock Only)'}
          </span>

          {(selectedCategory !== null || search || onlyInStock) && (
            <button
              onClick={() => {
                setSelectedCategory(null);
                setSearch('');
                setOnlyInStock(false);
              }}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1"
            >
              <X className="h-3.5 w-3.5" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* 4. Product Catalog Grid */}
      {isLoading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3">
          <Spinner size="lg" />
          <p className="text-xs text-gray-500 font-medium">Fetching live catalog from warehouse database...</p>
        </div>
      ) : processedProducts.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-xs">
          <Package className="h-12 w-12 mx-auto text-gray-300 mb-3" />
          <h3 className="text-base font-bold text-gray-800">No matching products found</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
            {products.length === 0
              ? 'All demo data has been cleared. The Super Administrator can add products from the admin panel.'
              : 'Try clearing your search term or selecting a different category filter.'}
          </p>
          {products.length > 0 && (
            <button
              onClick={() => {
                setSelectedCategory(null);
                setSearch('');
                setOnlyInStock(false);
              }}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold text-xs hover:bg-blue-700 transition-colors"
            >
              <span>View All Products</span>
            </button>
          )}
        </div>
      ) : (
        <ProductGrid>
          {processedProducts.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              onAddToCart={handleAddToCart}
              onQuickView={openQuickView}
            />
          ))}
        </ProductGrid>
      )}

      {/* 5. Enterprise B2B Trust, Support & Direct WhatsApp Inquiries */}
      <div className="bg-gradient-to-br from-slate-900 to-blue-950 text-white rounded-3xl p-8 sm:p-10 shadow-lg border border-blue-900/60 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-xs font-bold text-blue-300">
            <PhoneCall className="h-3.5 w-3.5 text-blue-300" />
            <span>Dedicated Customer Desk</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight">
            Need Bulk Container Imports or Custom Variety Packs?
          </h3>
          <p className="text-xs sm:text-sm text-blue-200 leading-relaxed">
            Our trade representatives assist retail store managers, boutique owners, and commercial buyers with bulk reservations, custom carton packaging, and swift WhatsApp bank slip verification.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <a
            href="https://wa.me/94766611606?text=Hello%20Imanya%20Fancy%20Goods%2C%20I%20am%20interested%20in%20bulk%20purchasing."
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-md transition-all hover:scale-105"
          >
            <MessageSquare className="h-4 w-4" />
            <span>WhatsApp Customer Desk</span>
          </a>

          {!isAuthenticated && (
            <Link
              to="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs sm:text-sm border border-white/20 transition-all"
            >
              <UserPlus className="h-4 w-4" />
              <span>Create Customer Account</span>
            </Link>
          )}
        </div>
      </div>

      {/* 6. High-Definition Quick View & Multi-Photo Lightbox Modal */}
      <ProductQuickViewModal
        product={quickViewProduct}
        isOpen={!!quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
        onAddToCart={handleAddToCart}
        relatedProducts={
          quickViewProduct
            ? products.filter(
                (p) => p.category_id === quickViewProduct.category_id && p.id !== quickViewProduct.id
              )
            : []
        }
        onSelectProduct={setQuickViewProduct}
      />
    </div>
  );
};
