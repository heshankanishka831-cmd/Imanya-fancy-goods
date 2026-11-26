import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Layers,
  Boxes,
  ShoppingCart,
  Users,
  Shield,
  History,
  Store,
  FileText,
  X,
} from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext';

interface SidebarProps {
  isMobileOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen = false, onClose }) => {
  const { hasRole } = useAuth();

  const links = [
    { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['Super Administrator', 'Inventory Manager', 'Order Manager'] },
    { to: '/admin/products', label: 'Products', icon: Package, roles: ['Super Administrator', 'Inventory Manager'] },
    { to: '/admin/categories', label: 'Categories', icon: Layers, roles: ['Super Administrator', 'Inventory Manager'] },
    { to: '/admin/inventory', label: 'Inventory & Stock', icon: Boxes, roles: ['Super Administrator', 'Inventory Manager'] },
    { to: '/admin/orders', label: 'Customer Orders', icon: ShoppingCart, roles: ['Super Administrator', 'Order Manager'] },
    { to: '/admin/reports', label: 'Reports & PDF', icon: FileText, roles: ['Super Administrator', 'Inventory Manager', 'Order Manager'] },
    { to: '/admin/customers', label: 'Customers', icon: Users, roles: ['Super Administrator', 'Order Manager'] },
    { to: '/admin/users', label: 'Staff Users', icon: Shield, roles: ['Super Administrator'] },
    { to: '/admin/audit', label: 'Audit Logs & History', icon: History, roles: ['Super Administrator', 'Inventory Manager', 'Order Manager'] },
  ];

  const content = (
    <aside className="w-64 bg-slate-900 text-slate-300 h-full flex flex-col border-r border-slate-800 shrink-0 select-none shadow-xl md:shadow-none">
      {/* Top Brand Header (Aligned to h-16 to match AdminHeader) */}
      <div className="h-16 px-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900">
        <div className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="Imanya Fancy Goods Logo"
            className="h-9 w-9 object-contain rounded-full bg-white p-0.5 shadow-xs"
          />
          <div className="flex flex-col">
            <h1 className="text-xs font-black text-white tracking-tight uppercase leading-none">
              Imanya Fancy Goods
            </h1>
            <span className="text-[10px] font-semibold text-[#9AC640] tracking-wider uppercase mt-1">
              Admin Portal
            </span>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            title="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Middle Scrollable Navigation List */}
      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-1 overscroll-contain [scrollbar-width:thin] [scrollbar-color:#334155_transparent]">
        <nav className="space-y-1">
          {links.map((link) => {
            if (!hasRole(...link.roles)) return null;
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                    isActive
                      ? 'bg-[#2C6291] text-white shadow-xs font-bold'
                      : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
                  }`
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{link.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Bottom Public Storefront Link */}
      <div className="shrink-0 p-3 border-t border-slate-800 bg-slate-900/95">
        <NavLink
          to="/"
          onClick={onClose}
          className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <Store className="h-4 w-4 text-[#9AC640] shrink-0" />
          <span className="truncate">Customer Storefront</span>
        </NavLink>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar: Permanently pinned at top:0 left:0, height: 100vh / 100dvh, w-64, z-40 */}
      <div className="hidden md:block fixed top-0 left-0 h-screen supports-[height:100dvh]:h-[100dvh] w-64 z-40 print:hidden">
        {content}
      </div>

      {/* Mobile Drawer: Fixed overlay when isMobileOpen */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex print:hidden">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
            onClick={onClose}
          />
          <div className="relative z-10 animate-in slide-in-from-left duration-200 h-screen supports-[height:100dvh]:h-[100dvh] w-64">
            {content}
          </div>
        </div>
      )}
    </>
  );
};
