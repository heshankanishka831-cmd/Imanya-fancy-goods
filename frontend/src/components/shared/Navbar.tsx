import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Package, ShieldCheck, User, LogOut, Store, UserPlus, LogIn } from 'lucide-react';
import { useCart } from '../../features/cart/CartContext';
import { useAuth } from '../../features/auth/AuthContext';

export const Navbar: React.FC = () => {
  const { cart, setIsCartOpen } = useCart();
  const { isAuthenticated, user, customerProfile, logout } = useAuth();
  const navigate = useNavigate();

  const totalQuantity = cart?.items?.reduce((sum, it) => sum + it.quantity, 0) || 0;
  const isCustomer = user?.role_name === 'Customer';

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <span className="text-lg font-bold text-gray-900 tracking-tight">Imanya Fancy Goods</span>
            <span className="hidden sm:inline-block ml-2 text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
              Wholesale & Imports
            </span>
          </div>
        </Link>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Cart Trigger */}
          <button
            onClick={() => setIsCartOpen(true)}
            className="relative flex items-center gap-2 px-3 py-2 rounded-xl text-gray-700 hover:bg-gray-100 transition-colors"
            title="Wholesale Cart"
          >
            <ShoppingCart className="h-5 w-5" />
            <span className="hidden sm:inline text-sm font-medium">Cart</span>
            {totalQuantity > 0 && (
              <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[11px] font-bold h-5 w-5 rounded-full flex items-center justify-center shadow-sm">
                {totalQuantity}
              </span>
            )}
          </button>

          {/* User Status / Navigation */}
          {isAuthenticated ? (
            isCustomer ? (
              <div className="flex items-center gap-2">
                <Link
                  to="/customer/dashboard"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-xs transition-colors"
                  title="Open Wholesale Customer Portal"
                >
                  <Store className="h-3.5 w-3.5 text-blue-600" />
                  <span className="font-semibold text-blue-900 hidden sm:inline">
                    {customerProfile?.business_name || user?.first_name}
                  </span>
                  <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-md font-bold">
                    Portal
                  </span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors"
                  title="Sign Out of Customer Account"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/admin/dashboard"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium text-gray-700 bg-slate-100 hover:bg-slate-200 transition-colors border border-slate-200"
                >
                  <ShieldCheck className="h-4 w-4 text-blue-600" />
                  <span className="font-bold text-gray-900 hidden md:inline">{user?.first_name}</span>
                  <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-md font-semibold">
                    Admin Dashboard
                  </span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors"
                  title="Sign Out of Staff Account"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>
            )
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors border border-gray-200"
              >
                <LogIn className="h-4 w-4 text-blue-600" />
                <span>Sign In</span>
              </Link>

              <Link
                to="/register"
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-xs transition-colors"
              >
                <UserPlus className="h-4 w-4" />
                <span>Register</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
