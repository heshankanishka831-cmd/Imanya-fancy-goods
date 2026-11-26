import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '../features/auth/AuthContext';
import { CartProvider } from '../features/cart/CartContext';
import { WishlistProvider } from '../features/wishlist/WishlistContext';
import { ProtectedRoute } from '../features/auth/ProtectedRoute';

// Layouts
import { StorefrontLayout } from '../layouts/StorefrontLayout';
import { AdminLayout } from '../layouts/AdminLayout';
import { AuthLayout } from '../layouts/AuthLayout';

// Core Customer Storefront & Portal (eagerly loaded for fast first contentful paint)
import { CustomerDashboardPage } from '../features/customer/CustomerDashboardPage';

// Lazy-loaded Authentication Pages
const LoginPage = lazy(() => import('../features/auth/LoginPage').then(m => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('../features/auth/RegisterPage').then(m => ({ default: m.RegisterPage })));

// Lazy-loaded Guest Checkout & Order Confirmation Pages
const GuestCheckoutPage = lazy(() => import('../features/cart/GuestCheckoutPage').then(m => ({ default: m.GuestCheckoutPage })));
const OrderConfirmationPage = lazy(() => import('../features/cart/OrderConfirmationPage').then(m => ({ default: m.OrderConfirmationPage })));

// Lazy-loaded Administrative Management Pages
const DashboardPage = lazy(() => import('../features/dashboard/DashboardPage').then(m => ({ default: m.DashboardPage })));
const ProductListPage = lazy(() => import('../features/catalog/ProductListPage').then(m => ({ default: m.ProductListPage })));
const CategoryListPage = lazy(() => import('../features/catalog/CategoryListPage').then(m => ({ default: m.CategoryListPage })));
const InventoryPage = lazy(() => import('../features/inventory/InventoryPage').then(m => ({ default: m.InventoryPage })));
const SupplierListPage = lazy(() => import('../features/suppliers/SupplierListPage').then(m => ({ default: m.SupplierListPage })));
const PurchaseOrderListPage = lazy(() => import('../features/procurement/PurchaseOrderListPage').then(m => ({ default: m.PurchaseOrderListPage })));
const OrderListPage = lazy(() => import('../features/orders/OrderListPage').then(m => ({ default: m.OrderListPage })));
const CustomerListPage = lazy(() => import('../features/customers/CustomerListPage').then(m => ({ default: m.CustomerListPage })));
const UserListPage = lazy(() => import('../features/users/UserListPage').then(m => ({ default: m.UserListPage })));
const AuditLogPage = lazy(() => import('../features/audit/AuditLogPage').then(m => ({ default: m.AuditLogPage })));
const ReportsPage = lazy(() => import('../features/reports/ReportsPage').then(m => ({ default: m.ReportsPage })));

// Graceful Loading Indicator for Lazy Route Chunks
const RouteLoadingFallback: React.FC = () => (
  <div className="min-h-[50vh] flex flex-col items-center justify-center p-8">
    <div className="h-10 w-10 rounded-full border-3 border-[#2C6291]/20 border-t-[#2C6291] animate-spin mb-3" />
    <p className="text-xs font-semibold text-slate-500 tracking-wide uppercase">Loading page...</p>
  </div>
);

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <WishlistProvider>
            <Suspense fallback={<RouteLoadingFallback />}>
              <Routes>
                {/* Customer Storefront & Portal Routes */}
                <Route element={<StorefrontLayout />}>
                  <Route path="/" element={<CustomerDashboardPage defaultTab="home" />} />
                  <Route path="/home" element={<CustomerDashboardPage defaultTab="home" />} />
                  <Route path="/shop" element={<CustomerDashboardPage defaultTab="shop" />} />
                  <Route path="/products" element={<CustomerDashboardPage defaultTab="shop" />} />
                  <Route path="/categories" element={<CustomerDashboardPage defaultTab="categories" />} />
                  <Route path="/orders" element={<CustomerDashboardPage defaultTab="orders" />} />
                  <Route path="/membership" element={<CustomerDashboardPage defaultTab="membership" />} />
                  <Route path="/profile" element={<CustomerDashboardPage defaultTab="profile" />} />
                  <Route path="/customer/dashboard" element={<CustomerDashboardPage defaultTab="shop" />} />
                  <Route path="/checkout" element={<GuestCheckoutPage />} />
                  <Route path="/order-confirmation/:orderNumber" element={<OrderConfirmationPage />} />
                  <Route path="/track-order" element={<OrderConfirmationPage />} />
                </Route>

                {/* Authentication Gateway */}
                <Route element={<AuthLayout />}>
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                </Route>

                {/* Administrative Management Portal */}
                <Route element={<ProtectedRoute allowedRoles={['Super Administrator', 'Inventory Manager', 'Order Manager']} />}>
                  <Route element={<AdminLayout />}>
                    <Route path="/admin/dashboard" element={<DashboardPage />} />
                    <Route path="/admin/products" element={<ProductListPage />} />
                    <Route path="/admin/categories" element={<CategoryListPage />} />
                    <Route path="/admin/inventory" element={<InventoryPage />} />
                    <Route path="/admin/suppliers" element={<SupplierListPage />} />
                    <Route path="/admin/procurement" element={<PurchaseOrderListPage />} />
                    <Route path="/admin/orders" element={<OrderListPage />} />
                    <Route path="/admin/reports" element={<ReportsPage />} />
                    <Route path="/admin/customers" element={<CustomerListPage />} />
                    <Route path="/admin/audit" element={<AuditLogPage />} />

                    {/* Super Administrator Staff Management */}
                    <Route element={<ProtectedRoute allowedRoles={['Super Administrator']} />}>
                      <Route path="/admin/users" element={<UserListPage />} />
                    </Route>
                  </Route>
                </Route>

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </WishlistProvider>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};
