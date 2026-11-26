import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useCart } from '../cart/CartContext';
import { customerApi, publicApi } from '../../services/endpoints';
import { Order, Customer, CustomerMembership, Product, Category } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { subscribeCatalogUpdated } from '../../utils/catalogSync';
import { Spinner } from '../../components/ui/Spinner';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';

// Modular Customer Design Components
import { CustomerHeader } from './components/CustomerHeader';
import { CustomerHomePage } from './components/CustomerHomePage';
import { ProductCard, ProductGrid } from './components/ProductCard';
import { ProductListingToolbar } from './components/ProductListingToolbar';
import { ProductQuickViewModal } from './components/ProductQuickViewModal';
import { OrderHistorySection } from './components/OrderHistorySection';
import { MembershipCard } from './components/MembershipCard';
import { CustomerProfileSection } from './components/CustomerProfileSection';

import {
  Layers,
  ChevronRight,
  Printer,
  Clock,
  MessageSquare,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Package,
  Award,
} from 'lucide-react';

export type DashboardTab = 'home' | 'shop' | 'categories' | 'orders' | 'membership' | 'profile';

interface CustomerDashboardPageProps {
  defaultTab?: DashboardTab;
}

export const CustomerDashboardPage: React.FC<CustomerDashboardPageProps> = ({ defaultTab = 'home' }) => {
  const { isAuthenticated, user, customerProfile } = useAuth();
  const isCustomer = user?.role_name === 'Customer';
  const { addToCart, setIsCartOpen } = useCart();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active view tab from URL (?tab=...) or prop
  const currentTab = (searchParams.get('tab') as DashboardTab) || defaultTab;

  // Catalog State (PostgreSQL Live Data)
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isCatalogLoading, setIsCatalogLoading] = useState(true);

  // Customer Account State
  const [orders, setOrders] = useState<Order[]>([]);
  const [profile, setProfile] = useState<Customer | null>(null);
  const [membership, setMembership] = useState<CustomerMembership | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [profileLoadError, setProfileLoadError] = useState<string | null>(null);

  // Shop Filters & Toolbar State
  const [shopSearch, setShopSearch] = useState<string>(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(() => {
    const cat = searchParams.get('category');
    return cat ? parseInt(cat, 10) : null;
  });
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [onlyDiscounts, setOnlyDiscounts] = useState(false);
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'name-asc' | 'stock-desc'>('featured');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');

  // Quick View Modal
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);

  // Invoice & Bank Modals
  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [reorderingId, setReorderingId] = useState<string | null>(null);

  // Guard for protected customer account tabs
  useEffect(() => {
    if (['orders', 'profile'].includes(currentTab)) {
      if (!isAuthenticated) {
        navigate('/login');
      } else if (!isCustomer) {
        navigate('/admin/dashboard');
      }
    }
  }, [currentTab, isAuthenticated, isCustomer, navigate]);

  // Synchronize URL search params
  useEffect(() => {
    const searchFromUrl = searchParams.get('search');
    if (searchFromUrl !== null && searchFromUrl !== shopSearch) {
      setShopSearch(searchFromUrl);
    }
    const catFromUrl = searchParams.get('category');
    if (catFromUrl) {
      setSelectedCategory(parseInt(catFromUrl, 10));
    }
  }, [searchParams]);

  const lastCatalogFetchRef = useRef<number>(0);

  const loadCatalog = useCallback(async (silent = false) => {
    try {
      if (!silent) {
        setIsCatalogLoading(true);
      }
      lastCatalogFetchRef.current = Date.now();
      const [categoriesRes, productsRes] = await Promise.all([
        publicApi.getCategories(),
        publicApi.getProducts({ limit: 200 }),
      ]);

      if (categoriesRes && categoriesRes.data) {
        setCategories(categoriesRes.data.filter((c) => c.is_active));
      }

      if (productsRes && productsRes.data) {
        setProducts(productsRes.data);
        setQuickViewProduct((prev) =>
          prev ? productsRes.data!.find((p) => p.id === prev.id) || prev : null
        );
      }
    } catch (err) {
      console.error('Failed to load catalog', err);
    } finally {
      if (!silent) {
        setIsCatalogLoading(false);
      }
    }
  }, []);

  // Fetch Catalog on mount
  useEffect(() => {
    loadCatalog(false);
  }, [loadCatalog]);

  // Refresh catalog whenever customer returns to browsing tabs or Admin signals an update
  useEffect(() => {
    if (currentTab === 'home' || currentTab === 'shop' || currentTab === 'categories') {
      if (Date.now() - lastCatalogFetchRef.current > 1500) {
        loadCatalog(true);
      }
    }
  }, [currentTab, loadCatalog]);

  useEffect(() => {
    const unsubscribe = subscribeCatalogUpdated(() => {
      loadCatalog(true);
    });
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastCatalogFetchRef.current > 2000) {
        loadCatalog(true);
      }
    };
    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    return () => {
      unsubscribe();
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, [loadCatalog]);

  // Fetch Customer Profile & Orders strictly for authenticated Customers
  useEffect(() => {
    if (isAuthenticated && isCustomer) {
      loadCustomerData();
    }
  }, [isAuthenticated, isCustomer]);

  const loadCustomerData = async () => {
    try {
      setIsProfileLoading(true);
      setProfileLoadError(null);
      const [ordersRes, profileRes, membershipRes] = await Promise.all([
        customerApi.getMyOrders().catch(() => null),
        customerApi.getProfile(),
        customerApi.getMembership().catch(() => null),
      ]);

      if (ordersRes && ordersRes.data) setOrders(ordersRes.data);
      if (membershipRes && membershipRes.data) setMembership(membershipRes.data);
      if (profileRes && profileRes.data) {
        setProfile(profileRes.data);
      }
    } catch (err: any) {
      console.error('Failed to load customer profile', err);
      setProfileLoadError(
        err?.response?.data?.error?.message || 'Unable to load customer profile from the server.'
      );
    } finally {
      setIsProfileLoading(false);
    }
  };

  const switchTab = (tab: DashboardTab, categoryId?: number | null) => {
    const params: Record<string, string> = { tab };
    if (categoryId !== undefined && categoryId !== null) {
      params.category = String(categoryId);
      setSelectedCategory(categoryId);
    } else if (tab === 'shop' && selectedCategory !== null) {
      params.category = String(selectedCategory);
    }
    setSearchParams(params);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Add to Cart (propagates errors to ProductCard / QuickViewModal for inline notification)
  const handleAddToCart = async (product: Product, qty: number) => {
    await addToCart(product.id, qty);
  };

  // Past Order 1-Click Re-order
  const handleReorder = async (order: Order) => {
    try {
      setReorderingId(order.id);
      for (const it of order.items) {
        await addToCart(it.product_id, it.quantity);
      }
      setIsCartOpen(true);
    } catch (err) {
      console.error('Failed to reorder items', err);
    } finally {
      setReorderingId(null);
    }
  };

  // Derived Category Counts
  const categoryCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    products.forEach((p) => {
      counts[p.category_id] = (counts[p.category_id] || 0) + 1;
    });
    return counts;
  }, [products]);

  // Derived Filtered & Sorted Products
  const processedProducts = useMemo(() => {
    let list = [...products];

    if (selectedCategory !== null) {
      list = list.filter((p) => p.category_id === selectedCategory);
    }

    if (shopSearch.trim()) {
      const q = shopSearch.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          (p.description && p.description.toLowerCase().includes(q))
      );
    }

    const getEffectivePrice = (p: Product) => (p.is_discount_active && p.discounted_price ? p.discounted_price : p.selling_price);

    if (onlyInStock) {
      list = list.filter((p) => p.in_stock);
    }

    if (onlyDiscounts) {
      list = list.filter((p) => p.is_discount_active);
    }

    if (minPrice) {
      const min = parseFloat(minPrice);
      if (!isNaN(min)) list = list.filter((p) => getEffectivePrice(p) >= min);
    }

    if (maxPrice) {
      const max = parseFloat(maxPrice);
      if (!isNaN(max)) list = list.filter((p) => getEffectivePrice(p) <= max);
    }

    switch (sortBy) {
      case 'price-asc':
        list.sort((a, b) => getEffectivePrice(a) - getEffectivePrice(b));
        break;
      case 'price-desc':
        list.sort((a, b) => getEffectivePrice(b) - getEffectivePrice(a));
        break;
      case 'name-asc':
        list.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'stock-desc':
        list.sort((a, b) => (b.available_stock || 0) - (a.available_stock || 0));
        break;
      default:
        break;
    }

    return list;
  }, [products, selectedCategory, shopSearch, onlyInStock, onlyDiscounts, minPrice, maxPrice, sortBy]);

  const pendingOrders = orders.filter((o) => o.status === 'PENDING');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* ========================================================================= */}
      {/* 1. URGENT BANK SLIP NOTIFICATION (Displayed on All Customer Views)        */}
      {/* ========================================================================= */}
      {isAuthenticated && pendingOrders.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-amber-950">
                Action Required: Order #{pendingOrders[0].order_number} Awaiting Bank Slip Verification
              </h4>
              <p className="text-xs text-amber-900/90 mt-0.5 leading-relaxed">
                Total due: <strong>{formatCurrency(pendingOrders[0].total_amount)}</strong>. Please attach your bank transfer or cash deposit receipt on WhatsApp to initiate packing.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto shrink-0">
            {pendingOrders[0].whatsapp_url && (
              <a
                href={pendingOrders[0].whatsapp_url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all active:scale-95"
              >
                <MessageSquare className="h-4 w-4" />
                <span>Attach Slip on WhatsApp</span>
              </a>
            )}
            <button
              onClick={() => setIsBankModalOpen(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-slate-800 hover:bg-amber-100/60 font-bold text-xs border border-amber-300 shadow-2xs"
            >
              <CreditCard className="h-4 w-4 text-amber-600" />
              <span>View Bank Accounts</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 0: HOME / MODERN STOREFRONT (REFERENCE LAYOUT)                       */}
      {/* ========================================================================= */}
      {currentTab === 'home' && (
        <CustomerHomePage
          categories={categories}
          products={products}
          onSelectCategory={(catId) => {
            setSelectedCategory(catId);
            switchTab('shop', catId);
          }}
          onNavigateTab={(tab) => switchTab(tab)}
          onAddToCart={handleAddToCart}
          onQuickView={(p) => setQuickViewProduct(p)}
          isCatalogLoading={isCatalogLoading}
        />
      )}

      {/* ========================================================================= */}
      {/* VIEW 1: SHOP / ALL PRODUCTS CATALOG                                       */}
      {/* ========================================================================= */}
      {currentTab === 'shop' && (
        <div className="space-y-6">
          <CustomerHeader
            title="Product Catalog & Sourcing"
            subtitle="Browse verified unit rates direct from factory import shipments in whole Sri Lankan Rupees."
            breadcrumbs={[
              { label: 'Customer Portal', href: '/shop' },
              { label: 'Shop Catalog' },
            ]}
          />

          {/* Sourcing & Filters Toolbar */}
          <ProductListingToolbar
            search={shopSearch}
            onSearchChange={setShopSearch}
            categories={categories}
            categoryCounts={categoryCounts}
            selectedCategory={selectedCategory}
            onCategorySelect={setSelectedCategory}
            onlyInStock={onlyInStock}
            onToggleStock={() => setOnlyInStock(!onlyInStock)}
            onlyDiscounts={onlyDiscounts}
            onToggleDiscounts={() => setOnlyDiscounts(!onlyDiscounts)}
            minPrice={minPrice}
            maxPrice={maxPrice}
            onMinPriceChange={setMinPrice}
            onMaxPriceChange={setMaxPrice}
            sortBy={sortBy}
            onSortChange={setSortBy}
            totalCount={products.length}
            filteredCount={processedProducts.length}
            onResetFilters={() => {
              setSelectedCategory(null);
              setShopSearch('');
              setOnlyInStock(false);
              setOnlyDiscounts(false);
              setMinPrice('');
              setMaxPrice('');
            }}
          />

          {/* Product Grid */}
          {isCatalogLoading ? (
            <div className="py-24 flex flex-col items-center justify-center gap-3">
              <Spinner size="lg" />
              <p className="text-xs text-slate-500 font-medium">Fetching live product catalog...</p>
            </div>
          ) : processedProducts.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-xs">
              <Package className="h-12 w-12 mx-auto text-slate-300 mb-3" />
              <h3 className="text-base font-bold text-slate-800">No matching products found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Try adjusting your search query, price range, or category filter to find products.
              </p>
              <button
                onClick={() => {
                  setSelectedCategory(null);
                  setShopSearch('');
                  setOnlyInStock(false);
                  setMinPrice('');
                  setMaxPrice('');
                }}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2C6291] text-white font-semibold text-xs hover:bg-[#235077] transition-colors shadow-xs"
              >
                <span>View All Products</span>
              </button>
            </div>
          ) : (
            <ProductGrid>
              {processedProducts.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  onAddToCart={handleAddToCart}
                  onQuickView={setQuickViewProduct}
                />
              ))}
            </ProductGrid>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: PRODUCT CATEGORIES DIRECTORY                                      */}
      {/* ========================================================================= */}
      {currentTab === 'categories' && (
        <div className="space-y-6">
          <CustomerHeader
            title="Product Categories Directory"
            subtitle="Explore all commercial product lines imported and stocked in our Colombo warehouse."
            breadcrumbs={[
              { label: 'Customer Portal', href: '/shop' },
              { label: 'Categories' },
            ]}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {categories.map((c) => {
              const count = categoryCounts[c.id] || 0;
              return (
                <div
                  key={c.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-lg transition-all flex flex-col justify-between group hover:border-[#4C9091]/50"
                >
                  <div className="space-y-3">
                    <div className="h-12 w-12 rounded-xl bg-[#EBF2F7] group-hover:bg-[#2C6291] group-hover:text-white text-[#2C6291] flex items-center justify-center transition-colors">
                      <Layers className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-[#2C6291] transition-colors">
                        {c.name}
                      </h3>
                      {c.description && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                          {c.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">
                      <strong>{count}</strong> active products
                    </span>
                    <button
                      onClick={() => switchTab('shop', c.id)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#2C6291] group-hover:text-[#235077]"
                    >
                      <span>Explore</span>
                      <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 3: MY ORDERS & INVOICES                                              */}
      {/* ========================================================================= */}
      {currentTab === 'orders' && (
        <div className="space-y-6">
          <CustomerHeader
            title="My Orders & Official Invoices"
            subtitle="Track fulfillment status, view printable invoices, or upload bank deposit slips via WhatsApp."
            breadcrumbs={[
              { label: 'Customer Portal', href: '/shop' },
              { label: 'My Orders' },
            ]}
          />

          <OrderHistorySection
            orders={orders}
            onOpenInvoice={setInvoiceOrder}
            onReorder={handleReorder}
            onNavigateToShop={() => switchTab('shop')}
            reorderingId={reorderingId}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 4: MY MEMBERSHIP & LOYALTY PROGRESS                                  */}
      {/* ========================================================================= */}
      {currentTab === 'membership' && (
        <div className="space-y-6">
          <CustomerHeader
            title="Customer Loyalty & Membership"
            subtitle="Automatic tier progression based on verified lifetime purchases in Sri Lankan Rupees."
            breadcrumbs={[
              { label: 'Customer Portal', href: '/shop' },
              { label: 'My Membership' },
            ]}
          />

          {!isAuthenticated && (
            <div className="bg-[#EBF2F7] border border-[#2C6291]/20 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[#2C6291] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Award className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#1C4263]">Sign In to View Your Personal Loyalty Tier</h4>
                  <p className="text-xs text-[#235077]/80 mt-0.5">
                    Register or sign in to track your lifetime spending progress and unlock priority dispatch.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2C6291] hover:bg-[#235077] text-white text-xs font-bold transition-all shadow-xs shrink-0 active:scale-95"
              >
                <span>Sign In / Register</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          <MembershipCard
            membership={
              membership || {
                customer_id: user?.id || 'guest',
                customer_name: user
                  ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username
                  : 'Valued Customer',
                current_tier: (customerProfile?.membership_tier as any) || 'BRONZE',
                lifetime_spent: customerProfile?.lifetime_spent || 0,
                eligible_orders_count: orders.length,
                next_tier: 'SILVER',
                next_tier_min_spend: 100000,
                remaining_for_next_tier: Math.max(0, 100000 - (customerProfile?.lifetime_spent || 0)),
                progress_percentage: Math.min(
                  100,
                  Math.round(((customerProfile?.lifetime_spent || 0) / 100000) * 100)
                ),
                is_highest_tier: false,
                tier_message: 'Automatic tier progression active for all verified orders.',
              }
            }
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 5: MY PROFILE & ADDRESSES                                            */}
      {/* ========================================================================= */}
      {currentTab === 'profile' && (
        <div className="space-y-6">
          <CustomerHeader
            title="My Customer Profile"
            subtitle="Manage your personal information, residential & delivery addresses, membership rewards, and account security."
            breadcrumbs={[
              { label: 'Customer Portal', href: '/shop' },
              { label: 'My Profile' },
            ]}
          />

          <CustomerProfileSection
            profile={profile}
            user={user}
            membership={membership}
            orders={orders}
            isLoading={isProfileLoading}
            loadError={profileLoadError}
            onRetryLoad={loadCustomerData}
            onProfileUpdated={(updated) => setProfile(updated)}
            onNavigateTab={switchTab}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: HIGH-RES PRODUCT DETAILS QUICK VIEW                              */}
      {/* ========================================================================= */}
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

      {/* ========================================================================= */}
      {/* MODAL 2: COMMERCIAL INVOICE VIEW & PRINT MODAL                            */}
      {/* ========================================================================= */}
      {invoiceOrder && (
        <Modal
          isOpen={!!invoiceOrder}
          onClose={() => setInvoiceOrder(null)}
          title={`Official Invoice: ${invoiceOrder.order_number}`}
          maxWidth="3xl"
        >
          <div className="space-y-6 p-2 text-slate-900">
            <div className="flex justify-between items-start border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Commercial Invoice</h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">Order Ref: {invoiceOrder.order_number}</p>
                <p className="text-xs text-slate-500 mt-0.5">Date: {formatDate(invoiceOrder.created_at)}</p>
              </div>
              <div className="flex items-center gap-3">
                <img
                  src="/logo.png"
                  alt="Imanya Fancy Goods Logo"
                  className="h-12 w-12 object-contain rounded-full border border-slate-200 bg-white shadow-2xs"
                />
                <div className="text-right">
                  <span className="text-sm font-bold text-[#2C6291] block">Imanya Fancy Goods</span>
                  <span className="text-xs text-slate-500 block">Direct Imports & Distribution</span>
                  <span className="text-xs text-slate-400 block">Colombo, Sri Lanka</span>
                </div>
              </div>
            </div>

            {/* Recipient details */}
            <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 font-semibold block uppercase text-[10px]">Billed To:</span>
                <p className="font-bold text-slate-900">{invoiceOrder.customer_name}</p>
                <p className="text-slate-600">WhatsApp: {invoiceOrder.customer_phone}</p>
                {invoiceOrder.customer_email && <p className="text-slate-600">Email: {invoiceOrder.customer_email}</p>}
              </div>
              <div>
                <span className="text-slate-400 font-semibold block uppercase text-[10px]">Delivery Destination:</span>
                <p className="font-medium text-slate-800 leading-relaxed">{invoiceOrder.delivery_address}</p>
              </div>
            </div>

            {/* Items List */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-2">Item Description</th>
                    <th className="py-2">SKU</th>
                    <th className="py-2 text-center">Quantity</th>
                    <th className="py-2 text-right">Unit Rate</th>
                    <th className="py-2 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoiceOrder.items.map((it) => (
                    <tr key={it.id}>
                      <td className="py-2.5 font-semibold text-slate-800">{it.product_name}</td>
                      <td className="py-2.5 font-mono text-slate-500 text-[11px]">{it.product_sku}</td>
                      <td className="py-2.5 text-center font-bold text-slate-900">{it.quantity}</td>
                      <td className="py-2.5 text-right">
                        {it.original_price && it.original_price > it.unit_price ? (
                          <div>
                            <span className="line-through text-slate-400 text-[10px] block">
                              {formatCurrency(it.original_price)}
                            </span>
                            <span className="font-bold text-emerald-700">
                              {formatCurrency(it.unit_price)}
                            </span>
                            <span className="text-[9px] font-bold text-emerald-800 bg-emerald-50 px-1 py-0.2 rounded ml-1">
                              ({it.discount_percent}% OFF)
                            </span>
                          </div>
                        ) : (
                          <span>{formatCurrency(it.unit_price)}</span>
                        )}
                      </td>
                      <td className="py-2.5 text-right font-bold text-slate-900">{formatCurrency(it.subtotal || it.unit_price * it.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-slate-200 font-bold">
                  <tr>
                    <td colSpan={4} className="py-2 text-right text-slate-600">Subtotal</td>
                    <td className="py-2 text-right">
                      {formatCurrency(
                        invoiceOrder.items.reduce(
                          (sum, it) => sum + (it.subtotal || it.unit_price * it.quantity),
                          0
                        )
                      )}
                    </td>
                  </tr>
                  <tr className="text-sm">
                    <td colSpan={4} className="py-3 text-right text-[#2C6291] font-black">Net Total Due (Rs.)</td>
                    <td className="py-3 text-right text-[#2C6291] font-black">{formatCurrency(invoiceOrder.total_amount)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-200">
              <span className="text-xs text-slate-400">Official Computer-Generated Commercial Invoice.</span>
              <Button onClick={() => window.print()} variant="outline" size="sm">
                <Printer className="h-4 w-4 mr-1.5" />
                <span>Print Invoice</span>
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: BANK TRANSFER DEPOSIT DETAILS MODAL                              */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isBankModalOpen}
        onClose={() => setIsBankModalOpen(false)}
        title="Official Bank Deposit Accounts"
        maxWidth="lg"
      >
        <div className="space-y-4 p-2 text-xs text-slate-900">
          <p className="text-slate-600 leading-relaxed">
            Please make online bank transfers or cash deposits to any of our registered accounts below.
            Always include your <strong>Order Number</strong> in the payment reference.
          </p>

          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-[#EBF2F7] border border-[#2C6291]/20">
              <span className="font-bold text-[#1C4263] block text-sm">Commercial Bank of Ceylon</span>
              <div className="grid grid-cols-2 gap-2 mt-2 text-slate-700">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Account Name</span>
                  <span className="font-bold text-slate-900">Imanya Fancy Goods (Pvt) Ltd</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Account Number</span>
                  <span className="font-mono font-bold text-[#2C6291] text-sm">1000 8923 4512</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Branch</span>
                  <span className="font-medium text-slate-900">Pettah City Branch (Code: 014)</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Currency</span>
                  <span className="font-medium text-slate-900">LKR (Sri Lankan Rupees)</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#EEF6F6] border border-[#4C9091]/20">
              <span className="font-bold text-[#346566] block text-sm">Hatton National Bank (HNB)</span>
              <div className="grid grid-cols-2 gap-2 mt-2 text-slate-700">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Account Name</span>
                  <span className="font-bold text-slate-900">Imanya Fancy Goods</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Account Number</span>
                  <span className="font-mono font-bold text-[#4C9091] text-sm">0340 1023 9981</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Branch</span>
                  <span className="font-medium text-slate-900">Sea Street Branch (Code: 034)</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Currency</span>
                  <span className="font-medium text-slate-900">LKR (Sri Lankan Rupees)</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900">
            <strong>Next Step:</strong> After transferring funds, take a photo or screenshot of the receipt and send it to our WhatsApp dispatch desk at <strong>+94 77 000 0000</strong>.
          </div>
        </div>
      </Modal>
    </div>
  );
};
