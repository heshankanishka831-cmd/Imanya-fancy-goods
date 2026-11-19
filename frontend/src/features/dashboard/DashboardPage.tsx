import React, { useEffect, useState } from 'react';
import { adminApi } from '../../services/endpoints';
import { DashboardMetrics } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { Button } from '../../components/ui/Button';
import {
  Package,
  AlertTriangle,
  ShoppingCart,
  TrendingUp,
  ArrowRight,
  Plus,
  Users,
  FileText,
  Boxes,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await adminApi.getDashboardMetrics();
      if (res.success && res.data) {
        setMetrics(res.data);
      } else {
        setError('Failed to fetch dashboard statistics from server.');
      }
    } catch (err: any) {
      console.error('Failed to load dashboard metrics', err);
      const message =
        err.response?.data?.error?.message ||
        err.message ||
        'Unable to connect to the backend server. Please ensure the backend is running.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Spinner size="lg" />
        <p className="text-xs text-gray-500 font-medium">Loading Super Admin Dashboard...</p>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="max-w-lg mx-auto my-12 p-6 bg-white rounded-3xl border border-rose-100 shadow-sm text-center">
        <div className="h-12 w-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h3 className="text-base font-bold text-gray-900 mb-1">Failed to Load Dashboard</h3>
        <p className="text-xs text-gray-500 mb-6 leading-relaxed">
          {error || 'Unable to load real-time metrics. Please verify your connection.'}
        </p>
        <Button onClick={loadMetrics} className="inline-flex items-center gap-2 mx-auto">
          <RefreshCw className="h-4 w-4" />
          <span>Retry Loading Dashboard</span>
        </Button>
      </div>
    );
  }

  const kpis = [
    {
      label: 'Wholesale Products',
      val: metrics.total_products || 0,
      icon: Package,
      color: 'text-blue-600 bg-blue-50',
    },
    {
      label: 'Low Stock Alerts',
      val: metrics.low_stock_count || 0,
      icon: AlertTriangle,
      color: 'text-amber-600 bg-amber-50',
      alert: (metrics.low_stock_count || 0) > 0,
    },
    {
      label: 'Total Orders',
      val: metrics.total_orders || 0,
      icon: ShoppingCart,
      color: 'text-indigo-600 bg-indigo-50',
    },
    {
      label: 'Total Wholesale Revenue',
      val: formatCurrency(metrics.total_order_volume || 0),
      icon: TrendingUp,
      color: 'text-emerald-600 bg-emerald-50',
    },
  ];

  const recentOrders = metrics.recent_orders || [];
  const lowStockAlerts = metrics.low_stock_alerts || [];

  return (
    <div className="space-y-6">
      {/* Super Admin Quick Actions Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-gray-900 tracking-tight">Super Administrator Control Shortcuts</h2>
          <p className="text-xs text-gray-500">Quickly add items, oversee staff accounts, or export official business reports</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/admin/products"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add New Item</span>
          </Link>

          <Link
            to="/admin/users"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors"
          >
            <Users className="h-3.5 w-3.5" />
            <span>Manage Staff & Roles</span>
          </Link>

          <Link
            to="/admin/inventory"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors"
          >
            <Boxes className="h-3.5 w-3.5" />
            <span>Inventory Quantities</span>
          </Link>

          <Link
            to="/admin/reports"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold transition-colors"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Sales Reports & PDF</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <Card key={idx} className="hover:border-gray-200 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    {kpi.label}
                  </p>
                  <h3 className="text-2xl font-extrabold text-gray-900">{kpi.val}</h3>
                </div>
                <div className={`p-3 rounded-2xl ${kpi.color}`}>
                  <Icon className="h-6 w-6" />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Grid: Recent Orders & Low Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Orders (2 cols) */}
        <div className="lg:col-span-2">
          <Card
            title="Recent Wholesale Orders"
            subtitle="Incoming customer order requests and status"
            action={
              <Link
                to="/admin/orders"
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <span>View All Orders</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          >
            {recentOrders.length === 0 ? (
              <p className="text-xs text-gray-400 py-6 text-center">No orders placed yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-gray-400 font-semibold border-b border-gray-100">
                    <tr>
                      <th className="pb-3">Order Number</th>
                      <th className="pb-3">Customer / Shop</th>
                      <th className="pb-3">Amount</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 font-medium text-gray-700">
                    {recentOrders.map((o) => (
                      <tr key={o.id} className="hover:bg-gray-50/50">
                        <td className="py-3 font-bold text-gray-900">{o.order_number}</td>
                        <td className="py-3">{o.customer || 'Wholesale Buyer'}</td>
                        <td className="py-3 font-semibold text-gray-900">{formatCurrency(o.total_amount)}</td>
                        <td className="py-3">
                          <Badge status={o.status} />
                        </td>
                        <td className="py-3 text-gray-400">{o.created_at}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Low Stock Alerts (1 col) */}
        <div>
          <Card
            title="Low Stock Watchlist"
            subtitle="Available warehouse stock quantities"
            action={
              <Link
                to="/admin/inventory"
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <span>Inventory Ledger</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          >
            {lowStockAlerts.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Package className="h-8 w-8 mx-auto text-emerald-400 mb-2" />
                <p className="text-xs font-medium text-emerald-700">Stock levels healthy</p>
                <p className="text-[11px] text-gray-400 mt-0.5">No products currently below safety threshold.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {lowStockAlerts.map((item) => (
                  <div
                    key={item.product_id}
                    className="p-3 bg-amber-50/50 rounded-xl border border-amber-100/80 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-bold text-gray-900 truncate max-w-[180px]">{item.product_name}</p>
                      <p className="text-[11px] text-gray-500 font-mono">SKU: {item.sku}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-extrabold text-amber-700">{item.available_stock} Units</span>
                      <p className="text-[10px] text-gray-400">Alert at: {item.low_stock_threshold}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
