import React, { useState } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Navbar } from '../components/shared/Navbar';
import { CartDrawer } from '../features/cart/CartDrawer';
import { WishlistDrawer } from '../features/wishlist/WishlistDrawer';
import { WhatsAppWidget } from '../components/shared/WhatsAppWidget';
import { ContactUsModal } from '../features/customer/components/ContactUsModal';
import { useWishlist } from '../features/wishlist/WishlistContext';
import {
  ShieldCheck,
  Truck,
  MessageSquare,
  Phone,
  Clock,
  Award,
  Layers,
  ShoppingBag,
  FileText,
  User,
  Heart,
  Search,
} from 'lucide-react';

export const StorefrontLayout: React.FC = () => {
  const [isBankOpen, setIsBankOpen] = useState(false);
  const { setIsWishlistOpen } = useWishlist();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans antialiased">
      {/* 1. COMPACT INTEGRATED HEADER (68-74px) */}
      <Navbar />

      {/* 2. MAIN APPLICATION CONTENT */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* 3. DRAWERS (Cart & Wishlist) */}
      <CartDrawer />
      <WishlistDrawer />

      {/* 4. STICKY REAL-WORLD WHATSAPP & SUPPORT WIDGET */}
      <WhatsAppWidget
        onOpenBankDetails={() => setIsBankOpen(true)}
      />

      {/* 5. MODALS */}
      <ContactUsModal
        isOpen={isBankOpen}
        onClose={() => setIsBankOpen(false)}
      />

      {/* 4. PREMIUM E-COMMERCE FOOTER */}
      <footer className="bg-white border-t border-slate-200 mt-12 text-slate-600 font-sans">
        {/* Top Feature Highlights Bar */}
        <div className="border-b border-slate-100 bg-slate-50/60 py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[#EBF2F7] text-[#2C6291] flex items-center justify-center shrink-0 border border-[#2C6291]/20">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">Direct Sourcing</p>
                <p className="text-[11px] text-slate-500">Factory direct import shipments</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[#EEF6F6] text-[#4C9091] flex items-center justify-center shrink-0 border border-[#4C9091]/20">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">Verified Quality</p>
                <p className="text-[11px] text-slate-500">Every shipment inspected</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[#F4F9EC] text-[#6F9128] flex items-center justify-center shrink-0 border border-[#9AC640]/30">
                <Award className="h-5 w-5 text-[#9AC640]" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">Loyalty Rewards</p>
                <p className="text-[11px] text-slate-500">Bronze to Platinum lifetime tiers</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[#EBF2F7] text-[#2C6291] flex items-center justify-center shrink-0 border border-[#2C6291]/20">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">WhatsApp Support</p>
                <p className="text-[11px] text-slate-500">Fast inquiry & order tracking</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Footer Links */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Info */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt="Imanya Fancy Goods Logo"
                className="h-10 w-10 object-contain rounded-full bg-white shadow-2xs"
              />
              <span className="text-base font-black text-[#2C6291] tracking-tight">
                IMANYA FANCY GOODS
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Direct factory imports and commercial fancy goods distribution across Sri Lanka with transparent pricing in whole Sri Lankan Rupees.
            </p>
          </div>

          {/* Quick Navigation */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              Customer Store
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/" className="text-slate-600 hover:text-[#2C6291] transition-colors">
                  Storefront Home
                </Link>
              </li>
              <li>
                <Link to="/shop" className="text-slate-600 hover:text-[#2C6291] transition-colors">
                  Product Catalog
                </Link>
              </li>
              <li>
                <Link to="/categories" className="text-slate-600 hover:text-[#2C6291] transition-colors">
                  Product Categories
                </Link>
              </li>
              <li>
                <Link to="/membership" className="text-slate-600 hover:text-[#2C6291] transition-colors">
                  Customer Membership
                </Link>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setIsWishlistOpen(true)}
                  className="text-slate-600 hover:text-[#2C6291] transition-colors"
                >
                  My Saved Wishlist
                </button>
              </li>
            </ul>
          </div>

          {/* Customer Service & Orders */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              Account & Orders
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/orders" className="text-slate-600 hover:text-[#2C6291] transition-colors">
                  My Orders & Invoices
                </Link>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setIsBankOpen(true)}
                  className="text-slate-600 hover:text-[#2C6291] transition-colors text-left"
                >
                  Official Bank Accounts
                </button>
              </li>
              <li>
                <Link to="/profile" className="text-slate-600 hover:text-[#2C6291] transition-colors">
                  Customer Profile
                </Link>
              </li>
              <li>
                <Link to="/login" className="text-slate-600 hover:text-[#2C6291] transition-colors">
                  Account Sign In
                </Link>
              </li>
              <li>
                <Link to="/register" className="text-slate-600 hover:text-[#2C6291] transition-colors">
                  New Customer Registration
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact & Desk Info */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              Logistics Desk
            </h4>
            <a
              href="https://wa.me/message/DP4D3LSUQPX6L1"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-xs font-bold text-emerald-600 hover:text-emerald-700"
            >
              <MessageSquare className="h-4 w-4" />
              <span>WhatsApp: +94 76 661 1606</span>
            </a>
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <Phone className="h-3.5 w-3.5 text-slate-400" />
              <span>Hotline: +94 11 234 5678</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              <span>Mon - Sat: 8:30 AM - 6:30 PM</span>
            </div>
          </div>
        </div>

        {/* Bottom Copyright Bar */}
        <div className="border-t border-slate-100 py-5 bg-slate-50/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <p>&copy; {new Date().getFullYear()} Imanya Fancy Goods. All rights reserved.</p>
            <p className="text-[11px] text-slate-400">
              Enterprise PostgreSQL 18.7 Transactional Architecture
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
