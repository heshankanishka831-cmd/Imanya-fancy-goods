import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/shared/Navbar';
import { CartDrawer } from '../features/cart/CartDrawer';

export const StorefrontLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <CartDrawer />
      <footer className="bg-white border-t border-gray-100 py-8 text-center text-xs text-gray-500">
        <div className="max-w-7xl mx-auto px-4">
          <p>&copy; {new Date().getFullYear()} Wholesale Management & Import Portal. All rights reserved.</p>
          <p className="mt-1 text-gray-400">PostgreSQL 18.7 Transactional System of Record</p>
        </div>
      </footer>
    </div>
  );
};
