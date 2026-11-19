import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Package, ShieldCheck, User } from 'lucide-react';
import { useCart } from '../../features/cart/CartContext';
import { useAuth } from '../../features/auth/AuthContext';

export const Navbar: React.FC = () => {
  const { cart, setIsCartOpen } = useCart();
  const { isAuthenticated, user } = useAuth();

  const totalQuantity = cart?.items?.reduce((sum, it) => sum + it.quantity, 0) || 0;

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
        <div className="flex items-center gap-3">
          {/* Cart Trigger */}
          <button
            onClick={() => setIsCartOpen(true)}
            className="relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <ShoppingCart className="h-5 w-5" />
            <span className="hidden sm:inline text-sm font-medium">Cart</span>
            {totalQuantity > 0 && (
              <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[11px] font-bold h-5 w-5 rounded-full flex items-center justify-center shadow-sm">
                {totalQuantity}
              </span>
            )}
          </button>

          {/* Admin / Login */}
          {isAuthenticated ? (
            <Link
              to="/admin/dashboard"
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <ShieldCheck className="h-4 w-4 text-blue-600" />
              <span className="hidden md:inline">{user?.first_name}</span>
              <span className="text-xs bg-white text-gray-600 px-1.5 py-0.5 rounded border border-gray-200">
                Dashboard
              </span>
            </Link>
          ) : (
            <Link
              to="/login"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors"
            >
              <User className="h-4 w-4" />
              <span>Staff Login</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
