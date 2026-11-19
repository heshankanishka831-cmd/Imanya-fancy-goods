import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { publicApi } from '../../services/endpoints';
import { Product, Category } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { useCart } from '../cart/CartContext';
import { useAuth } from '../auth/AuthContext';
import {
  Search,
  ShoppingCart,
  Check,
  Package,
  Sparkles,
  UserPlus,
  LogIn,
  ShieldCheck,
  Store,
  ChevronLeft,
  ChevronRight,
  Eye,
  Truck,
  CreditCard,
  MessageSquare,
  ArrowUpDown,
  Tag,
  X,
  Plus,
  Minus,
  CheckCircle2,
  PhoneCall,
  Clock,
  Layers,
} from 'lucide-react';
import { Spinner } from '../../components/ui/Spinner';
import { Modal } from '../../components/ui/Modal';

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

  // Per-card quantities for bulk wholesale ordering
  const [cardQuantities, setCardQuantities] = useState<Record<string, number>>({});
  const [addingMap, setAddingMap] = useState<Record<string, boolean>>({});
  const [addedMap, setAddedMap] = useState<Record<string, boolean>>({});

  // Active photo switcher index for cards
  const [activePhotoMap, setActivePhotoMap] = useState<Record<string, number>>({});

  // Quick View & Lightbox Modal state
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [quickViewPhotoIdx, setQuickViewPhotoIdx] = useState<number>(0);
  const [quickViewQty, setQuickViewQty] = useState<number>(1);

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
      console.error('Failed to load categories', err);
    }
  };

  const loadProducts = async () => {
    try {
      setIsLoading(true);
      const res = await publicApi.getProducts({
        category_id: selectedCategory || undefined,
        search: search.trim() || undefined,
      });
      if (res.success && res.data) {
        setProducts(res.data);
      }
    } catch (err) {
      console.error('Failed to load products', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper for quantity management per product
  const getQuantity = (productId: string) => cardQuantities[productId] || 1;

  const setQuantity = (productId: string, val: number, maxAvailable?: number) => {
    let nextVal = Math.max(1, Math.round(val));
    if (maxAvailable !== undefined && maxAvailable > 0 && nextVal > maxAvailable) {
      nextVal = maxAvailable;
    }
    setCardQuantities((prev) => ({ ...prev, [productId]: nextVal }));
  };

  const handleAddToCart = async (product: Product, qty: number) => {
    try {
      setAddingMap((prev) => ({ ...prev, [product.id]: true }));
      await addToCart(product.id, qty);
      setAddedMap((prev) => ({ ...prev, [product.id]: true }));
      setTimeout(() => {
        setAddedMap((prev) => ({ ...prev, [product.id]: false }));
      }, 2000);
    } catch (err) {
      console.error('Error adding to cart', err);
    } finally {
      setAddingMap((prev) => ({ ...prev, [product.id]: false }));
    }
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
      case 'price-asc':
        list.sort((a, b) => a.selling_price - b.selling_price);
        break;
      case 'price-desc':
        list.sort((a, b) => b.selling_price - a.selling_price);
        break;
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
    setQuickViewPhotoIdx(0);
    setQuickViewQty(cardQuantities[p.id] || 1);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* 1. International-Grade Enterprise Hero Banner */}
      <div className="relative rounded-3xl bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 p-8 sm:p-12 text-white shadow-xl overflow-hidden border border-blue-900/50">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_50%)] pointer-events-none" />

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/15 backdrop-blur-md text-xs font-bold text-blue-300 border border-blue-400/20 mb-4">
            <Sparkles className="h-3.5 w-3.5 text-blue-300" />
            <span>Direct Imports & Wholesale Portal</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight mb-4">
            Imanya Fancy Goods <span className="text-blue-400 font-semibold text-2xl sm:text-3xl block sm:inline">| B2B Distribution</span>
          </h1>

          <p className="text-sm sm:text-base text-blue-100/90 font-normal leading-relaxed mb-6">
            Direct importers and wholesale distributors of fashion accessories, hair accessories, cosmetic novelties, jewelry, and commercial fancy goods. Verified wholesale rates in whole Sri Lankan Rupees (<strong className="text-white">Rs.</strong>) with instant WhatsApp bank slip confirmation.
          </p>

          {/* User Account / Navigation Bar */}
          {!isAuthenticated ? (
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm shadow-md transition-all hover:scale-[1.02]"
              >
                <UserPlus className="h-4 w-4" />
                <span>Register Wholesale Buyer Account</span>
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
            <div className="inline-flex items-center gap-3 p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-xs text-blue-100">
              <div className="h-9 w-9 rounded-xl bg-blue-500/30 flex items-center justify-center text-white">
                <Store className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-white text-sm">
                  Welcome back, {customerProfile?.business_name || user?.first_name}!
                </p>
                <p className="text-blue-200 text-xs">
                  Wholesale trade pricing enabled. Select carton or unit quantities to submit orders via WhatsApp.
                </p>
              </div>
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
              <p className="text-[10px] text-blue-200">Wholesale import rates</p>
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
              Wholesale Sourcing & Verification Workflow
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
            Showing <strong className="text-gray-900">{processedProducts.length}</strong> wholesale products
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
          <p className="text-xs text-gray-500 font-medium">Fetching live wholesale catalog from warehouse database...</p>
        </div>
      ) : processedProducts.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-xs">
          <Package className="h-12 w-12 mx-auto text-gray-300 mb-3" />
          <h3 className="text-base font-bold text-gray-800">No matching products found</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
            {products.length === 0
              ? 'All demo data has been cleared. The Super Administrator can add wholesale products from the admin panel.'
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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {processedProducts.map((p) => {
            const imageCount = p.images?.length || 0;
            const currentIdx = activePhotoMap[p.id] || 0;
            const currentImage = imageCount > 0 ? p.images[currentIdx]?.image_url : null;
            const qty = getQuantity(p.id);
            const isAdding = addingMap[p.id] || false;
            const isAdded = addedMap[p.id] || false;
            const availStock = p.available_stock !== undefined ? p.available_stock : (p.in_stock ? 100 : 0);

            return (
              <div
                key={p.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col overflow-hidden group hover:border-blue-100"
              >
                {/* Image Showcase Box */}
                <div className="relative aspect-4/3 bg-gray-50 border-b border-gray-100 flex items-center justify-center overflow-hidden">
                  {currentImage ? (
                    <img
                      src={currentImage}
                      alt={p.name}
                      onClick={() => openQuickView(p)}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 cursor-pointer"
                    />
                  ) : (
                    <div
                      onClick={() => openQuickView(p)}
                      className="w-full h-full flex items-center justify-center cursor-pointer"
                    >
                      <Package className="h-12 w-12 text-gray-300" />
                    </div>
                  )}

                  {/* Top Left: Photo Count Badge (if > 1 photo) */}
                  {imageCount > 1 && (
                    <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                      <span>📷</span>
                      <span>{currentIdx + 1}/{imageCount}</span>
                    </div>
                  )}

                  {/* Top Right: Stock Status Badge */}
                  <div className="absolute top-3 right-3">
                    {availStock > 5 ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-2xs">
                        <Check className="h-2.5 w-2.5" /> In Stock ({availStock})
                      </span>
                    ) : availStock > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200 shadow-2xs">
                        Low: {availStock} Left
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200 shadow-2xs">
                        Out of Stock
                      </span>
                    )}
                  </div>

                  {/* Hover Quick-View Action Button */}
                  <button
                    type="button"
                    onClick={() => openQuickView(p)}
                    className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 text-white text-xs font-bold pointer-events-auto"
                    title="Quick View & High-Res Inspection"
                  >
                    <div className="px-3 py-1.5 rounded-xl bg-slate-900/80 backdrop-blur-md flex items-center gap-1.5 shadow-md hover:bg-slate-900">
                      <Eye className="h-3.5 w-3.5" />
                      <span>Quick View</span>
                    </div>
                  </button>

                  {/* Bottom Multi-Photo Dots Selector (Max 5) */}
                  {imageCount > 1 && (
                    <div className="absolute bottom-2 left-0 right-0 flex justify-center items-center gap-1.5 z-10 pointer-events-auto">
                      {p.images.map((img, i) => (
                        <button
                          key={img.id}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActivePhotoMap((prev) => ({ ...prev, [p.id]: i }));
                          }}
                          className={`h-2 rounded-full transition-all ${
                            currentIdx === i
                              ? 'w-5 bg-blue-600 shadow-xs'
                              : 'w-2 bg-white/80 hover:bg-white shadow-2xs'
                          }`}
                          title={`Photo ${i + 1}`}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Content Box */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    {/* Category & SKU */}
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="font-semibold text-blue-600 uppercase tracking-wider truncate max-w-[140px]">
                        {p.category_name}
                      </span>
                      <span className="font-mono text-gray-400">SKU: {p.sku}</span>
                    </div>

                    {/* Title */}
                    <h3
                      onClick={() => openQuickView(p)}
                      className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2 cursor-pointer leading-snug"
                      title={p.name}
                    >
                      {p.name}
                    </h3>

                    {/* Description */}
                    {p.description && (
                      <p className="text-xs text-gray-500 mt-1.5 line-clamp-2 leading-relaxed">
                        {p.description}
                      </p>
                    )}
                  </div>

                  {/* B2B Wholesale Pricing & Bulk Quantity Selector */}
                  <div className="pt-3 border-t border-gray-100 space-y-3">
                    <div className="flex items-baseline justify-between">
                      <div>
                        <span className="text-[10px] text-gray-400 block uppercase font-semibold">Wholesale Rate</span>
                        <span className="text-lg font-black text-gray-900">
                          {formatCurrency(p.selling_price)}
                        </span>
                        <span className="text-[11px] text-gray-500 font-medium ml-1">
                          /{p.unit_of_measure}
                        </span>
                      </div>

                      {qty > 1 && (
                        <div className="text-right">
                          <span className="text-[10px] text-gray-400 block">Subtotal</span>
                          <span className="text-xs font-bold text-blue-700">
                            {formatCurrency(p.selling_price * qty)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Wholesale Quantity Stepper (Puckator Style) */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center border border-gray-200 rounded-xl bg-gray-50/50 p-0.5">
                        <button
                          type="button"
                          onClick={() => setQuantity(p.id, qty - 1, availStock)}
                          disabled={qty <= 1 || !p.in_stock}
                          className="p-1 rounded-lg text-gray-500 hover:text-gray-900 disabled:opacity-30 transition-colors"
                          title="Decrease Quantity"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <input
                          type="number"
                          min="1"
                          max={availStock > 0 ? availStock : 9999}
                          value={qty}
                          onChange={(e) => setQuantity(p.id, parseInt(e.target.value) || 1, availStock)}
                          disabled={!p.in_stock}
                          className="w-10 text-center text-xs font-bold bg-transparent text-gray-900 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setQuantity(p.id, qty + 1, availStock)}
                          disabled={qty >= availStock || !p.in_stock}
                          className="p-1 rounded-lg text-gray-500 hover:text-gray-900 disabled:opacity-30 transition-colors"
                          title="Increase Quantity"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      {/* Quick Pack Presets (e.g. +6, +12) */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setQuantity(p.id, 6, availStock)}
                          disabled={!p.in_stock || availStock < 6}
                          className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-30"
                          title="Pack of 6"
                        >
                          6
                        </button>
                        <button
                          type="button"
                          onClick={() => setQuantity(p.id, 12, availStock)}
                          disabled={!p.in_stock || availStock < 12}
                          className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-30"
                          title="Dozen (12)"
                        >
                          12
                        </button>
                      </div>

                      {/* Add to Wholesale Cart Button */}
                      <button
                        type="button"
                        onClick={() => handleAddToCart(p, qty)}
                        disabled={!p.in_stock || isAdding}
                        className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 ${
                          isAdded
                            ? 'bg-emerald-600 text-white'
                            : 'bg-blue-600 hover:bg-blue-700 disabled:bg-gray-100 disabled:text-gray-400 text-white'
                        }`}
                      >
                        {isAdding ? (
                          <Spinner size="sm" />
                        ) : isAdded ? (
                          <>
                            <Check className="h-3.5 w-3.5" />
                            <span>Added!</span>
                          </>
                        ) : (
                          <>
                            <ShoppingCart className="h-3.5 w-3.5" />
                            <span>Add {qty > 1 ? `(${qty})` : ''}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Enterprise B2B Trust, Support & Direct WhatsApp Inquiries */}
      <div className="bg-gradient-to-br from-slate-900 to-blue-950 text-white rounded-3xl p-8 sm:p-10 shadow-lg border border-blue-900/60 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-xs font-bold text-blue-300">
            <PhoneCall className="h-3.5 w-3.5 text-blue-300" />
            <span>Dedicated Wholesale Desk</span>
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
            href="https://wa.me/94770000000?text=Hello%20Imanya%20Fancy%20Goods%2C%20I%20am%20a%20wholesale%20buyer%20interested%20in%20bulk%20purchasing."
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-md transition-all hover:scale-105"
          >
            <MessageSquare className="h-4 w-4" />
            <span>WhatsApp Wholesale Desk</span>
          </a>

          {!isAuthenticated && (
            <Link
              to="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs sm:text-sm border border-white/20 transition-all"
            >
              <UserPlus className="h-4 w-4" />
              <span>Create Trade Account</span>
            </Link>
          )}
        </div>
      </div>

      {/* 6. High-Definition Quick View & Multi-Photo Lightbox Modal */}
      {quickViewProduct && (
        <Modal
          isOpen={!!quickViewProduct}
          onClose={() => setQuickViewProduct(null)}
          title={`Wholesale SKU: ${quickViewProduct.sku} — ${quickViewProduct.name}`}
          maxWidth="3xl"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-1">
            {/* Left: Gallery & Zoom Showcase */}
            <div className="space-y-3">
              <div className="relative aspect-4/3 rounded-2xl overflow-hidden bg-slate-900 flex items-center justify-center border border-gray-100">
                {quickViewProduct.images && quickViewProduct.images.length > 0 ? (
                  <img
                    src={quickViewProduct.images[quickViewPhotoIdx]?.image_url}
                    alt={quickViewProduct.name}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <Package className="h-16 w-16 text-gray-500" />
                )}

                {/* Left/Right Prev/Next Controls */}
                {quickViewProduct.images && quickViewProduct.images.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setQuickViewPhotoIdx((prev) =>
                          prev === 0 ? quickViewProduct.images.length - 1 : prev - 1
                        )
                      }
                      className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors"
                      title="Previous Photo"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setQuickViewPhotoIdx((prev) =>
                          prev === quickViewProduct.images.length - 1 ? 0 : prev + 1
                        )
                      }
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors"
                      title="Next Photo"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </>
                )}

                {/* Photo indicator */}
                {quickViewProduct.images && quickViewProduct.images.length > 0 && (
                  <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                    {quickViewPhotoIdx + 1} / {quickViewProduct.images.length}
                  </div>
                )}
              </div>

              {/* Thumbnails row (Max 5 photos) */}
              {quickViewProduct.images && quickViewProduct.images.length > 1 && (
                <div className="flex gap-2 justify-center overflow-x-auto pb-1">
                  {quickViewProduct.images.map((img, idx) => (
                    <button
                      key={img.id}
                      type="button"
                      onClick={() => setQuickViewPhotoIdx(idx)}
                      className={`w-14 h-14 rounded-xl overflow-hidden border-2 transition-all flex-shrink-0 ${
                        quickViewPhotoIdx === idx
                          ? 'border-blue-600 ring-2 ring-blue-200 scale-105'
                          : 'border-gray-200 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={img.image_url} alt="Thumbnail" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Specifications & Wholesale Bulk Purchase */}
            <div className="flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-600 uppercase tracking-wider bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200">
                    {quickViewProduct.category_name}
                  </span>
                  <span className="text-xs font-mono text-gray-500">
                    Item Code: <strong>{quickViewProduct.sku}</strong>
                  </span>
                </div>

                <h3 className="text-lg font-extrabold text-gray-900 leading-snug">
                  {quickViewProduct.name}
                </h3>

                <div className="flex items-center gap-2">
                  {(quickViewProduct.available_stock || 0) > 0 ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                      <Check className="h-3 w-3" /> In Stock ({quickViewProduct.available_stock || 0} Available)
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                      Out of Stock
                    </span>
                  )}
                  <span className="text-xs text-gray-400">Unit: {quickViewProduct.unit_of_measure}</span>
                </div>

                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-[10px] text-gray-400 block uppercase font-semibold">Wholesale Unit Price</span>
                  <div className="text-2xl font-black text-blue-900">
                    {formatCurrency(quickViewProduct.selling_price)}
                    <span className="text-xs font-normal text-gray-500 ml-1">
                      per {quickViewProduct.unit_of_measure}
                    </span>
                  </div>
                </div>

                {quickViewProduct.description && (
                  <div>
                    <h5 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Product Description
                    </h5>
                    <p className="text-xs text-gray-600 leading-relaxed max-h-32 overflow-y-auto pr-1">
                      {quickViewProduct.description}
                    </p>
                  </div>
                )}
              </div>

              {/* Bulk Purchasing Controls */}
              <div className="pt-3 border-t border-gray-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-700">Order Quantity:</span>
                  <span className="text-xs font-bold text-blue-900">
                    Total: {formatCurrency(quickViewProduct.selling_price * quickViewQty)}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center border border-gray-300 rounded-xl bg-white p-1">
                    <button
                      type="button"
                      onClick={() => setQuickViewQty(Math.max(1, quickViewQty - 1))}
                      disabled={quickViewQty <= 1}
                      className="p-1.5 text-gray-600 hover:text-gray-900 disabled:opacity-30"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={quickViewQty}
                      onChange={(e) => setQuickViewQty(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-14 text-center text-sm font-bold bg-transparent text-gray-900 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setQuickViewQty(quickViewQty + 1)}
                      className="p-1.5 text-gray-600 hover:text-gray-900"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={async () => {
                      await handleAddToCart(quickViewProduct, quickViewQty);
                      setQuickViewProduct(null);
                    }}
                    disabled={!quickViewProduct.in_stock}
                    className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-gray-100 disabled:text-gray-400 text-white font-bold text-xs shadow-md transition-all active:scale-95"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    <span>Add {quickViewQty} to Wholesale Cart</span>
                  </button>
                </div>

                {/* Direct WhatsApp Inquiry for This Product */}
                <a
                  href={`https://wa.me/94770000000?text=${encodeURIComponent(
                    `Hello Imanya Fancy Goods, I want to inquire about wholesale order for SKU: ${quickViewProduct.sku} - ${quickViewProduct.name} (Quantity: ${quickViewQty} ${quickViewProduct.unit_of_measure})`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition-colors"
                >
                  <MessageSquare className="h-4 w-4 text-emerald-600" />
                  <span>Inquire on WhatsApp about this item</span>
                </a>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
