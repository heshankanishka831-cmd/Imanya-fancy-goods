import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Layers,
  Boxes,
  Truck,
  FileSpreadsheet,
  ShoppingCart,
  Users,
  Shield,
  History,
  Store,
} from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext';

export const Sidebar: React.FC = () => {
  const { hasRole } = useAuth();

  const links = [
    { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['Super Administrator', 'Inventory Manager', 'Order Manager'] },
    { to: '/admin/products', label: 'Products', icon: Package, roles: ['Super Administrator', 'Inventory Manager'] },
    { to: '/admin/categories', label: 'Categories', icon: Layers, roles: ['Super Administrator', 'Inventory Manager'] },
    { to: '/admin/inventory', label: 'Inventory & Stock', icon: Boxes, roles: ['Super Administrator', 'Inventory Manager'] },
    { to: '/admin/suppliers', label: 'Suppliers', icon: Truck, roles: ['Super Administrator', 'Inventory Manager'] },
    { to: '/admin/procurement', label: 'Procurement (POs)', icon: FileSpreadsheet, roles: ['Super Administrator', 'Inventory Manager'] },
    { to: '/admin/orders', label: 'Customer Orders', icon: ShoppingCart, roles: ['Super Administrator', 'Order Manager'] },
    { to: '/admin/customers', label: 'Customers', icon: Users, roles: ['Super Administrator', 'Order Manager'] },
    { to: '/admin/users', label: 'Staff Users', icon: Shield, roles: ['Super Administrator'] },
    { to: '/admin/audit', label: 'Audit Logs', icon: History, roles: ['Super Administrator'] },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 min-h-screen flex flex-col justify-between p-4 border-r border-slate-800">
      <div>
        {/* Brand */}
        <div className="flex items-center gap-3 px-3 py-4 mb-6 border-b border-slate-800">
          <div className="h-9 w-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight">Wholesale Admin</h1>
            <p className="text-[11px] text-slate-400">Enterprise Control</p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="space-y-1">
          {links.map((link) => {
            if (!hasRole(...link.roles)) return null;
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                <span>{link.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Public Store Link */}
      <div className="pt-4 border-t border-slate-800">
        <NavLink
          to="/"
          className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <Store className="h-4 w-4 text-emerald-400" />
          <span>Customer Storefront</span>
        </NavLink>
      </div>
    </aside>
  );
};
