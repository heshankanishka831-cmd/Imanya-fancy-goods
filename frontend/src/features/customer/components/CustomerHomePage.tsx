import React, { useState, useRef } from 'react';
import {
  Truck,
  ShieldCheck,
  Headphones,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  Layers,
  Sparkle,
  ShoppingBag,
  Award,
  Crown,
  Package,
  PackageOpen,
  Menu,
  Percent,
} from 'lucide-react';
import { Product, Category } from '../../../types';
import { ProductCard, ProductGrid } from './ProductCard';

interface CustomerHomePageProps {
  categories: Category[];
  products: Product[];
  onSelectCategory: (categoryId: number | null) => void;
  onNavigateTab: (tab: any) => void;
  onAddToCart: (product: Product, quantity: number) => Promise<void>;
  onQuickView: (product: Product) => void;
  isCatalogLoading: boolean;
}

export const CustomerHomePage: React.FC<CustomerHomePageProps> = ({
  categories,
  products,
  onSelectCategory,
  onNavigateTab,
  onAddToCart,
  onQuickView,
}) => {
  const [activeSlide, setActiveSlide] = useState(0);
  const categoryScrollRef = useRef<HTMLDivElement>(null);
  const activeDiscountProducts = products.filter((p) => p.is_discount_active);

  const handleScrollCategories = (direction: 'left' | 'right') => {
    if (categoryScrollRef.current) {
      const scrollAmount = direction === 'left' ? -260 : 260;
      categoryScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-10 pb-12 font-sans">
      {/* ========================================================================= */}
      {/* 1. PITOR INSPIRATION: 2-COLUMN HERO + CATEGORIES SIDEBAR                  */}
      {/* ========================================================================= */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column: Browse Categories Sidebar (3 cols on lg) */}
        <div className="hidden lg:flex lg:col-span-3 flex-col bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="bg-[#2C6291] text-white px-5 py-3.5 flex items-center justify-between font-bold text-xs uppercase tracking-wider">
            <div className="flex items-center gap-2.5">
              <Menu className="h-4 w-4" />
              <span>Browse Categories</span>
            </div>
            <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-mono">
              {categories.length}
            </span>
          </div>

          <div className="p-3 flex-1 flex flex-col justify-between">
            <div className="space-y-1">
              {categories.slice(0, 9).map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => onSelectCategory(cat.id)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-[#EBF2F7] hover:text-[#2C6291] transition-colors text-left group"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-slate-400 group-hover:text-[#4C9091] transition-colors">
                      <Layers className="h-4 w-4" />
                    </span>
                    <span className="truncate max-w-[140px]">{cat.name}</span>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-[#2C6291] group-hover:translate-x-0.5 transition-transform" />
                </button>
              ))}

              {categories.length === 0 && (
                <div className="py-8 text-center text-slate-400 text-xs">
                  <Layers className="h-8 w-8 mx-auto text-slate-300 mb-1.5" />
                  <p className="font-semibold text-slate-600">Categories Initializing</p>
                  <p className="text-[10px] mt-0.5">Admin can add categories</p>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 mt-2">
              <button
                onClick={() => onNavigateTab('categories')}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-[#2C6291] hover:underline"
              >
                <span>View All Categories</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Hero Banner (9 cols on lg, full width on mobile) */}
        <div className="lg:col-span-9 bg-gradient-to-br from-[#EBF2F7] via-white to-[#EEF6F6] border border-[#2C6291]/20 rounded-3xl p-6 sm:p-10 relative overflow-hidden shadow-xs flex flex-col justify-between">
          {/* Ambient Lighting */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 bg-[#2C6291]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/4 -mb-16 w-60 h-60 bg-[#4C9091]/15 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-8 items-center flex-1">
            <div className="md:col-span-7 space-y-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black tracking-widest text-[#2C6291] bg-white uppercase border border-[#2C6291]/15 shadow-2xs">
                <Sparkle className="h-3.5 w-3.5 fill-[#2C6291]" />
                <span>WELCOME TO IMANYA FANCY GOODS</span>
              </span>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.12]">
                Discover. Shop. Enjoy.
              </h1>

              <p className="text-xs sm:text-sm text-slate-600 font-medium max-w-lg leading-relaxed">
                Find the best commercial fancy goods, jewelry, and accessories at direct import rates. Fast islandwide delivery. Easy bank slip verification.
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => onNavigateTab('shop')}
                  className="px-6 py-3 rounded-xl bg-[#2C6291] hover:bg-[#235077] text-white font-bold text-xs sm:text-sm shadow-md shadow-[#2C6291]/25 transition-all hover:scale-[1.02] active:scale-95 inline-flex items-center gap-2"
                >
                  <span>Shop Now</span>
                  <ArrowRight className="h-4 w-4" />
                </button>

                <button
                  onClick={() => onNavigateTab('categories')}
                  className="px-5 py-3 rounded-xl bg-white hover:bg-[#EEF6F6] text-[#4C9091] font-bold text-xs sm:text-sm border border-[#4C9091]/30 shadow-2xs transition-all"
                >
                  All Categories
                </button>
              </div>
            </div>

            <div className="md:col-span-5 relative flex items-center justify-center">
              <div className="relative w-full max-w-[280px] aspect-square flex items-center justify-center">
                <div className="absolute inset-2 rounded-3xl bg-white/95 border border-slate-100 shadow-xl backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center space-y-3">
                  <img
                    src="/logo.png"
                    alt="Imanya Fancy Goods Official Logo"
                    className="h-20 w-20 sm:h-24 sm:w-24 object-contain rounded-full bg-white shadow-md p-1 border border-slate-100"
                  />
                  <div>
                    <h4 className="text-base font-black text-slate-900">Direct Factory Imports</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Commercial Goods Catalog</p>
                  </div>
                  <div className="flex items-center gap-2 pt-1 text-[11px] font-bold text-[#4C9091] bg-[#EEF6F6] px-3 py-1 rounded-full border border-[#4C9091]/20">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>Verified Warehouse Stock</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Carousel Slide Indicators (PITOR Style) */}
          <div className="relative z-10 flex items-center justify-end gap-1.5 pt-4 mt-4 border-t border-[#2C6291]/15">
            {[0, 1, 2].map((idx) => (
              <button
                key={idx}
                onClick={() => setActiveSlide(idx)}
                className={`h-2 rounded-full transition-all ${
                  activeSlide === idx ? 'w-6 bg-[#2C6291]' : 'w-2 bg-slate-300 hover:bg-slate-400'
                }`}
                aria-label={`Slide ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. PITOR 4 TRUST BADGES IN SINGLE HORIZONTAL STRIP                        */}
      {/* ========================================================================= */}
      <section className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
          {/* Benefit 1: Islandwide Free Shipping */}
          <div className="flex items-center gap-3.5 pt-3 sm:pt-0 first:pt-0 sm:px-4 first:pl-0">
            <div className="h-11 w-11 rounded-2xl bg-[#EBF2F7] text-[#2C6291] flex items-center justify-center shrink-0 border border-[#2C6291]/20 shadow-2xs">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-900">Free Islandwide Shipping</h4>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">On orders over Rs. 25,000</p>
            </div>
          </div>

          {/* Benefit 2: Secure Payments */}
          <div className="flex items-center gap-3.5 pt-3 sm:pt-0 sm:px-4">
            <div className="h-11 w-11 rounded-2xl bg-[#EEF6F6] text-[#4C9091] flex items-center justify-center shrink-0 border border-[#4C9091]/20 shadow-2xs">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-900">Secure Payments</h4>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">100% protected bank slip confirmation</p>
            </div>
          </div>

          {/* Benefit 3: Guaranteed Direct Imports */}
          <div className="flex items-center gap-3.5 pt-3 sm:pt-0 sm:px-4">
            <div className="h-11 w-11 rounded-2xl bg-[#F4F9EC] text-[#6F9128] flex items-center justify-center shrink-0 border border-[#9AC640]/30 shadow-2xs">
              <Package className="h-5 w-5 text-[#9AC640]" />
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-900">Direct Sourcing</h4>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">Inspected factory import rates</p>
            </div>
          </div>

          {/* Benefit 4: 24/7 Dedicated Support */}
          <div className="flex items-center gap-3.5 pt-3 sm:pt-0 sm:px-4 last:pr-0">
            <div className="h-11 w-11 rounded-2xl bg-[#EBF2F7] text-[#2C6291] flex items-center justify-center shrink-0 border border-[#2C6291]/20 shadow-2xs">
              <Headphones className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-900">24/7 WhatsApp Support</h4>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">Always here to assist order packing</p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. SHOP BY CATEGORY SECTION                                               */}
      {/* ========================================================================= */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">Shop by Category</h2>
            <p className="text-xs text-slate-500 mt-0.5">Browse product lines currently available in our warehouse catalog.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigateTab('categories')}
              className="text-xs font-bold text-[#2C6291] hover:text-[#235077] hover:underline mr-2"
            >
              View All
            </button>
            {categories.length > 4 && (
              <>
                <button
                  onClick={() => handleScrollCategories('left')}
                  className="h-8 w-8 rounded-full border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 shadow-2xs transition-colors"
                  title="Previous Categories"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleScrollCategories('right')}
                  className="h-8 w-8 rounded-full border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 shadow-2xs transition-colors"
                  title="Next Categories"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Dynamic Category List or Clean Empty State */}
        {categories.length > 0 ? (
          <div className="space-y-3">
            <div
              ref={categoryScrollRef}
              className="flex items-center gap-3 sm:gap-4 overflow-x-auto pb-2 scrollbar-none snap-x"
            >
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  onClick={() => onSelectCategory(cat.id)}
                  className="shrink-0 w-32 sm:w-36 bg-white border border-slate-200/90 rounded-2xl p-4 flex flex-col items-center justify-center text-center cursor-pointer hover:border-[#4C9091] hover:shadow-md transition-all group snap-start"
                >
                  <div className="w-16 h-16 rounded-2xl bg-[#EEF6F6] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform text-[#4C9091] border border-[#4C9091]/20">
                    <Layers className="h-8 w-8" />
                  </div>
                  <span className="text-xs font-bold text-slate-800 group-hover:text-[#2C6291] truncate w-full">
                    {cat.name}
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold mt-0.5">
                    View Catalog
                  </span>
                </div>
              ))}
            </div>

            {/* Slider track indicator matching PITOR reference */}
            <div className="flex items-center gap-2 px-1">
              <button
                type="button"
                onClick={() => handleScrollCategories('left')}
                className="text-slate-400 hover:text-slate-700 transition-colors"
                title="Previous categories"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <div className="flex-1 h-1.5 bg-slate-200/80 rounded-full overflow-hidden">
                <div className="w-1/3 h-full bg-slate-500 rounded-full" />
              </div>
              <button
                type="button"
                onClick={() => handleScrollCategories('right')}
                className="text-slate-400 hover:text-slate-700 transition-colors"
                title="Next categories"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-8 text-center space-y-2">
            <Layers className="h-10 w-10 text-slate-300 mx-auto" />
            <h4 className="text-sm font-bold text-slate-800">Categories Initializing</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Real product categories will appear here automatically as soon as they are added in the Admin Portal.
            </p>
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* 4. PROMOTIONAL OFFERS & DISCOUNTS (Shown whenever Admin enables deals)    */}
      {/* ========================================================================= */}
      {activeDiscountProducts.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-bold uppercase tracking-wider mb-1">
                <Percent className="h-3 w-3" />
                <span>Special Discounts Active</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                Promotional Deals & Offers
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Live promotional savings automatically calculated across catalog, cart, and checkout.
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('shop')}
              className="text-xs font-bold text-[#2C6291] hover:text-[#235077] hover:underline"
            >
              Browse All Deals
            </button>
          </div>

          <ProductGrid>
            {activeDiscountProducts.slice(0, 8).map((product) => (
              <ProductCard
                key={`deal-${product.id}`}
                product={product}
                onAddToCart={onAddToCart}
                onQuickView={onQuickView}
              />
            ))}
          </ProductGrid>
        </section>
      )}

      {/* ========================================================================= */}
      {/* 5. FEATURED PRODUCTS SECTION (Strictly Real Data from PostgreSQL)           */}
      {/* ========================================================================= */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">Featured Products</h2>
            <p className="text-xs text-slate-500 mt-0.5">Direct import items with live inventory status and unit pricing.</p>
          </div>
          <button
            onClick={() => onNavigateTab('shop')}
            className="text-xs font-bold text-[#2C6291] hover:text-[#235077] hover:underline"
          >
            View All Products
          </button>
        </div>

        {products.length > 0 ? (
          <ProductGrid>
            {products.slice(0, 8).map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={onAddToCart}
                onQuickView={onQuickView}
              />
            ))}
          </ProductGrid>
        ) : (
          <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-10 text-center space-y-3">
            <ShoppingBag className="h-10 w-10 text-slate-300 mx-auto" />
            <h4 className="text-sm font-bold text-slate-800">Store Catalog Awaiting Inventory</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No products are currently in the store database. Real inventory will appear here as soon as products are added in the Admin Dashboard.
            </p>
            <button
              onClick={() => onNavigateTab('shop')}
              className="px-4 py-2 text-xs font-bold text-[#2C6291] hover:bg-[#EBF2F7] rounded-xl border border-[#2C6291]/30 transition-colors inline-block"
            >
              Open Shop View
            </button>
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* 5. MEMBERSHIP PROMOTIONAL BANNER (Imanya Blue, Teal & Lime Green Accents) */}
      {/* ========================================================================= */}
      <section className="bg-gradient-to-r from-[#1C4263] via-[#2C6291] to-[#4C9091] rounded-3xl p-6 sm:p-8 lg:p-10 text-white relative overflow-hidden shadow-md">
        <div className="absolute right-0 top-0 -mr-10 -mt-10 w-64 h-64 bg-[#9AC640]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-[#9AC640]" />
              <span className="text-xs font-bold tracking-wider text-[#9AC640] uppercase">
                COMMERCIAL LOYALTY PROGRAM
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black tracking-tight">
              Earn Lifetime Tier Rewards with Every Purchase
            </h3>
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
              Every confirmed order automatically increases your lifetime spending total, unlocking Bronze, Silver, Gold, and Platinum partner benefits.
            </p>
          </div>

          <button
            onClick={() => onNavigateTab('membership')}
            className="px-6 py-3 rounded-xl bg-[#9AC640] hover:bg-[#88B035] text-white font-bold text-xs sm:text-sm shadow-md shadow-[#9AC640]/25 transition-all shrink-0 hover:scale-[1.02] active:scale-95 inline-flex items-center gap-2"
          >
            <Award className="h-4 w-4" />
            <span>View Membership Tiers</span>
          </button>
        </div>
      </section>
    </div>
  );
};
