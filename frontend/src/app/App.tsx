import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '../features/auth/AuthContext';
import { CartProvider } from '../features/cart/CartContext';
import { ProtectedRoute } from '../features/auth/ProtectedRoute';

// Layouts
import { StorefrontLayout } from '../layouts/StorefrontLayout';
import { AdminLayout } from '../layouts/AdminLayout';
import { AuthLayout } from '../layouts/AuthLayout';

// Pages
import { StorefrontPage } from '../features/storefront/StorefrontPage';
import { LoginPage } from '../features/auth/LoginPage';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { ProductListPage } from '../features/catalog/ProductListPage';
import { CategoryListPage } from '../features/catalog/CategoryListPage';
import { InventoryPage } from '../features/inventory/InventoryPage';
import { SupplierListPage } from '../features/suppliers/SupplierListPage';
import { PurchaseOrderListPage } from '../features/procurement/PurchaseOrderListPage';
import { OrderListPage } from '../features/orders/OrderListPage';
import { CustomerListPage } from '../features/customers/CustomerListPage';
import { UserListPage } from '../features/users/UserListPage';
import { AuditLogPage } from '../features/audit/AuditLogPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <Routes>
            {/* Customer Storefront Routes */}
            <Route element={<StorefrontLayout />}>
              <Route path="/" element={<StorefrontPage />} />
            </Route>

            {/* Authentication Gateway */}
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<LoginPage />} />
            </Route>

            {/* Administrative Management Portal */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AdminLayout />}>
                <Route path="/admin/dashboard" element={<DashboardPage />} />
                <Route path="/admin/products" element={<ProductListPage />} />
                <Route path="/admin/categories" element={<CategoryListPage />} />
                <Route path="/admin/inventory" element={<InventoryPage />} />
                <Route path="/admin/suppliers" element={<SupplierListPage />} />
                <Route path="/admin/procurement" element={<PurchaseOrderListPage />} />
                <Route path="/admin/orders" element={<OrderListPage />} />
                <Route path="/admin/customers" element={<CustomerListPage />} />

                {/* Super Administrator Restricted Views */}
                <Route element={<ProtectedRoute allowedRoles={['Super Administrator']} />}>
                  <Route path="/admin/users" element={<UserListPage />} />
                  <Route path="/admin/audit" element={<AuditLogPage />} />
                </Route>
              </Route>
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};
