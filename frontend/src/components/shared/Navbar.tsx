import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  ShoppingCart,
  User,
  LogOut,
  LogIn,
  UserPlus,
  Search,
  ShoppingBag,
  Layers,
  Award,
  FileText,
  ChevronDown,
  Menu,
  X,
  ShieldCheck,
  Store,
  Heart,
} from 'lucide-react';
import { useCart } from '../../features/cart/CartContext';
import { useAuth } from '../../features/auth/AuthContext';
import { useWishlist } from '../../features/wishlist/WishlistContext';
import { MembershipBadge } from '../ui/MembershipBadge';
import { Avatar } from '../ui/Avatar';

export const Navbar: React.FC = () => {
  const { cart, setIsCartOpen } = useCart();
  const { wishlist, setIsWishlistOpen } = useWishlist();
  const { isAuthenticated, user, customerProfile, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [navSearch, setNavSearch] = useState('');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const totalQuantity = cart?.items?.reduce((sum, it) => sum + it.quantity, 0) || 0;
  const isCustomer = user?.role_name === 'Customer';

  const handleLogout = () => {
    logout();
    setIsUserMenuOpen(false);
    setIsMobileMenuOpen(false);
    navigate('/login');
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (navSearch.trim()) {
      navigate(`/shop?search=${encodeURIComponent(navSearch.trim())}`);
      setNavSearch('');
      setIsMobileMenuOpen(false);
    }
  };

  const isNavActive = (path: string) => {
    if (path === '/' && (location.pathname === '/' || location.pathname === '/home') && !location.search.includes('tab=')) {
      return true;
    }
    if (path === '/shop' && (location.pathname === '/shop' || location.pathname === '/products' || location.search.includes('tab=shop'))) {
      return true;
    }
    if (path === '/categories' && (location.pathname === '/categories' || location.search.includes('tab=categories'))) {
      return true;
    }
    if (path === '/orders' && (location.pathname === '/orders' || location.search.includes('tab=orders'))) {
      return true;
    }
    if (path === '/membership' && (location.pathname === '/membership' || location.search.includes('tab=membership'))) {
      return true;
    }
    if (path === '/profile' && (location.pathname === '/profile' || location.search.includes('tab=profile'))) {
      return true;
    }
    return false;
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs font-sans transition-all">
      {/* ========================================================================= */}
      {/* SINGLE COMPACT HORIZONTAL HEADER (Height: 70px)                           */}
      {/* Combines Brand Logo, Compact Search, Nav Links, Cart, & Profile           */}
      {/* ========================================================================= */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[70px] flex items-center justify-between gap-3 lg:gap-6">
        {/* LEFT: Brand Identity with Official Logo */}
        <Link to="/" className="flex items-center gap-2.5 sm:gap-3 shrink-0 group">
          <img
            src="/logo.png"
            alt="Imanya Fancy Goods Logo"
            className="h-10 w-10 sm:h-11 sm:w-11 object-contain rounded-full shadow-xs group-hover:scale-105 transition-transform bg-white"
          />
          <div className="flex flex-col">
            <span className="text-base sm:text-lg font-black text-[#2C6291] tracking-tight leading-none uppercase">
              IMANYA
            </span>
            <span className="text-[10px] font-bold text-[#6F9128] tracking-wider uppercase mt-0.5 hidden xs:inline">
              Fancy Goods
            </span>
          </div>
        </Link>

        {/* CENTER: Compact Elegant Product Search Bar */}
        <form
          onSubmit={handleSearchSubmit}
          className="hidden md:flex items-center flex-1 max-w-xs lg:max-w-sm relative"
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search products or SKU..."
            value={navSearch}
            onChange={(e) => setNavSearch(e.target.value)}
            className="w-full pl-9 pr-3.5 py-1.5 sm:py-2 text-xs text-slate-900 bg-slate-50/80 hover:bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2C6291] focus:bg-white focus:border-transparent transition-all placeholder:text-slate-400"
          />
        </form>

        {/* RIGHT: Combined Navigation Links, Cart & Customer Menu */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 text-xs font-bold text-slate-600 mr-2">
            <Link
              to="/"
              className={`px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5 ${
                isNavActive('/') ? 'text-[#2C6291] bg-[#EBF2F7] font-black' : 'hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span>Home</span>
            </Link>

            <Link
              to="/shop"
              className={`px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5 ${
                isNavActive('/shop') ? 'text-[#2C6291] bg-[#EBF2F7] font-black' : 'hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              <span>Shop</span>
            </Link>

            <Link
              to="/categories"
              className={`px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5 ${
                isNavActive('/categories') ? 'text-[#2C6291] bg-[#EBF2F7] font-black' : 'hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Categories</span>
            </Link>

            <Link
              to="/membership"
              className={`px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5 ${
                isNavActive('/membership') ? 'text-[#2C6291] bg-[#EBF2F7] font-black' : 'hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Award className="h-3.5 w-3.5 text-[#9AC640]" />
              <span>Membership</span>
            </Link>

            {isAuthenticated && isCustomer && (
              <Link
                to="/orders"
                className={`px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5 ${
                  isNavActive('/orders') ? 'text-[#2C6291] bg-[#EBF2F7] font-black' : 'hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <FileText className="h-3.5 w-3.5 text-slate-500" />
                <span>My Orders</span>
              </Link>
            )}
          </nav>

          {/* Wishlist Button (PITOR Style Heart with Counter) */}
          <button
            onClick={() => setIsWishlistOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-slate-700 hover:text-rose-600 hover:bg-slate-100 transition-colors relative"
            title="Saved Wishlist"
          >
            <div className="relative">
              <Heart className={`h-5 w-5 ${wishlist.length > 0 ? 'text-rose-500 fill-rose-500' : 'text-slate-700'}`} />
              {wishlist.length > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-rose-500 text-white text-[10px] font-black h-4 w-4 rounded-full flex items-center justify-center shadow-xs animate-in zoom-in-75">
                  {wishlist.length}
                </span>
              )}
            </div>
            <span className="hidden xl:inline text-xs font-bold">Wishlist</span>
          </button>

          {/* Shopping Cart Button with Lime Green Counter Badge */}
          <button
            onClick={() => setIsCartOpen(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-700 hover:text-[#2C6291] hover:bg-slate-100 transition-colors relative"
            title="Shopping Cart"
          >
            <div className="relative">
              <ShoppingCart className="h-5 w-5 text-slate-700" />
              {totalQuantity > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-[#9AC640] text-white text-[10px] font-black h-4 w-4 rounded-full flex items-center justify-center shadow-xs animate-in zoom-in-75">
                  {totalQuantity}
                </span>
              )}
            </div>
            <span className="hidden sm:inline text-xs font-bold">Cart</span>
          </button>

          {/* Customer Avatar & Profile Menu */}
          {isAuthenticated ? (
            isCustomer ? (
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 transition-colors"
                >
                  <Avatar
                    src={customerProfile?.profile_photo_url}
                    name={`${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'Customer'}
                    size="xs"
                    className="border-[#2C6291]/20"
                  />
                  <span className="text-xs font-bold text-slate-800 hidden sm:inline max-w-[90px] truncate">
                    {user?.first_name}
                  </span>
                  <ChevronDown className="h-3 w-3 text-slate-400" />
                </button>

                {/* Dropdown Menu */}
                {isUserMenuOpen && (
                  <div
                    className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in"
                    onMouseLeave={() => setIsUserMenuOpen(false)}
                  >
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {user?.first_name} {user?.last_name}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
                      <div className="mt-1.5">
                        <MembershipBadge tier={customerProfile?.membership_tier || 'BRONZE'} size="xs" />
                      </div>
                    </div>
                    <div className="py-1 text-xs font-medium text-slate-700">
                      <Link
                        to="/profile"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 hover:bg-[#EBF2F7] hover:text-[#2C6291]"
                      >
                        <User className="h-4 w-4 text-slate-500" />
                        <span>My Profile</span>
                      </Link>
                      <Link
                        to="/orders"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 hover:bg-[#EBF2F7] hover:text-[#2C6291]"
                      >
                        <FileText className="h-4 w-4 text-amber-500" />
                        <span>My Orders</span>
                      </Link>
                      <Link
                        to="/membership"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 hover:bg-[#EBF2F7] hover:text-[#2C6291]"
                      >
                        <Award className="h-4 w-4 text-[#9AC640]" />
                        <span>My Membership</span>
                      </Link>
                    </div>
                    <div className="pt-1 border-t border-slate-100">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 text-left"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/admin/dashboard"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-[#2C6291] hover:bg-[#235077] shadow-xs transition-colors"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Admin</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            )
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Link
                to="/login"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-[#2C6291] hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0"
              >
                <LogIn className="h-3.5 w-3.5 text-[#2C6291]" />
                <span>Sign In</span>
              </Link>
              <Link
                to="/register"
                className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#9AC640] hover:bg-[#88B035] text-white shadow-xs transition-all hover:scale-[1.02]"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>Register</span>
              </Link>
            </div>
          )}

          {/* Mobile Drawer Trigger */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors ml-1"
            title="Toggle Menu"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MOBILE EXPANDABLE DRAWER                                                  */}
      {/* ========================================================================= */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-3 animate-in fade-in">
          {/* Mobile Search Input */}
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search products or SKU..."
              value={navSearch}
              onChange={(e) => setNavSearch(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 text-xs text-slate-900 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2C6291]"
            />
          </form>

          {/* Mobile Navigation Links */}
          <div className="flex flex-col space-y-1 pt-1 text-xs font-semibold text-slate-700">
            <Link
              to="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-slate-50 flex items-center gap-2"
            >
              <span>Home</span>
            </Link>
            <Link
              to="/shop"
              onClick={() => setIsMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-[#EBF2F7] hover:text-[#2C6291] flex items-center gap-2"
            >
              <ShoppingBag className="h-4 w-4 text-[#2C6291]" />
              <span>Shop All Products</span>
            </Link>
            <Link
              to="/categories"
              onClick={() => setIsMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-[#EBF2F7] hover:text-[#2C6291] flex items-center gap-2"
            >
              <Layers className="h-4 w-4 text-[#4C9091]" />
              <span>Categories</span>
            </Link>

            <Link
              to="/membership"
              onClick={() => setIsMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-[#EBF2F7] hover:text-[#2C6291] flex items-center gap-2"
            >
              <Award className="h-4 w-4 text-[#9AC640]" />
              <span>Membership</span>
            </Link>

            {/* Mobile Wishlist */}
            <button
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(false);
                setIsWishlistOpen(true);
              }}
              className="px-3 py-2 rounded-lg hover:bg-rose-50 hover:text-rose-600 flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-rose-500" />
                <span>My Saved Wishlist</span>
              </div>
              {wishlist.length > 0 && (
                <span className="text-[10px] font-bold bg-rose-500 text-white px-2 py-0.5 rounded-full">
                  {wishlist.length}
                </span>
              )}
            </button>

            {isAuthenticated && isCustomer && (
              <>
                <Link
                  to="/orders"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-lg hover:bg-[#EBF2F7] hover:text-[#2C6291] flex items-center gap-2"
                >
                  <FileText className="h-4 w-4 text-amber-600" />
                  <span>My Orders</span>
                </Link>

                <Link
                  to="/profile"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-lg hover:bg-[#EBF2F7] hover:text-[#2C6291] flex items-center gap-2"
                >
                  <User className="h-4 w-4 text-slate-600" />
                  <span>My Profile</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2 rounded-lg text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-bold"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </button>
              </>
            )}

            {!isAuthenticated && (
              <div className="pt-2 border-t border-slate-100 flex gap-2">
                <Link
                  to="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex-1 py-2 text-center rounded-xl bg-slate-100 text-slate-800 font-bold hover:bg-slate-200"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex-1 py-2 text-center rounded-xl bg-[#9AC640] hover:bg-[#88B035] text-white font-bold shadow-xs"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

    </header>
  );
};
