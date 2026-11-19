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
  Layers,
  Clock,
  CheckCircle2,
  Truck,
  Building2,
  DollarSign,
  ShieldCheck,
  Sparkles,
  ArrowUpRight,
  ExternalLink,
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
        'Unable to connect to the backend server. Please verify the backend is running.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] gap-3">
        <Spinner size="lg" />
        <p className="text-xs text-gray-500 font-semibold tracking-wide">
          Loading Super Administrator Command Center...
        </p>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="max-w-md mx-auto my-14 p-8 bg-white rounded-3xl border border-rose-100 shadow-md text-center">
        <div className="h-14 w-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="h-7 w-7" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-1">Failed to Connect to Dashboard</h3>
        <p className="text-xs text-gray-500 mb-6 leading-relaxed">
          {error || 'Unable to retrieve real-time operational data.'}
        </p>
        <Button onClick={loadMetrics} className="inline-flex items-center gap-2 mx-auto">
          <RefreshCw className="h-4 w-4" />
          <span>Retry Loading</span>
        </Button>
      </div>
    );
  }

  const recentOrders = metrics.recent_orders || [];
  const lowStockAlerts = metrics.low_stock_alerts || [];
  const ordersByStatus = metrics.orders_by_status || {};

  // Real-world operational calculations
  const totalRev = metrics.total_order_volume || 0;
  const valuation = metrics.inventory_valuation || 0;
  const totalProducts = metrics.total_products || 0;
  const totalCustomers = metrics.total_customers || 0;
  const lowStockCount = metrics.low_stock_count || 0;
  const outOfStockCount = metrics.out_of_stock_count || 0;

  const pendingCount = ordersByStatus['PENDING'] || metrics.pending_orders || 0;
  const processingCount = ordersByStatus['PROCESSING'] || metrics.processing_orders || 0;
  const confirmedCount = ordersByStatus['CONFIRMED'] || 0;
  const completedCount = (ordersByStatus['COMPLETED'] || 0) + (ordersByStatus['DELIVERED'] || 0) || metrics.completed_orders || 0;

  return (
    <div className="space-y-7 pb-10">
      {/* 1. Executive Hero Header */}
      <div className="relative rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 shadow-xl overflow-hidden border border-slate-800">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold border border-blue-400/30 mb-3">
              <ShieldCheck className="h-4 w-4 text-blue-400" />
              <span>Executive Command Center &bull; Super Administrator</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Imanya Fancy Goods & Wholesale Distribution
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
              Real-time enterprise overview of commercial fancy goods imports, stock valuations, wholesale buyer orders, and staff governance.
            </p>
          </div>

          {/* Quick Action Pills */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              to="/admin/products"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition-all hover:scale-[1.02]"
            >
              <Plus className="h-4 w-4" />
              <span>Add Product</span>
            </Link>

            <Link
              to="/admin/categories"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/15 backdrop-blur-sm transition-colors"
            >
              <Layers className="h-4 w-4 text-blue-300" />
              <span>Categories</span>
            </Link>

            <Link
              to="/admin/users"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/15 backdrop-blur-sm transition-colors"
            >
              <Users className="h-4 w-4 text-indigo-300" />
              <span>Staff & Roles</span>
            </Link>

            <Link
              to="/admin/reports"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition-colors"
            >
              <FileText className="h-4 w-4" />
              <span>PDF Sales Report</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Primary Financial & Asset Valuation KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* KPI 1: Total Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs hover:border-gray-200 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
              Total Wholesale Revenue
            </span>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">
              {formatCurrency(totalRev)}
            </h3>
            <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              <span>From confirmed & delivered bulk orders</span>
            </p>
          </div>
        </div>

        {/* KPI 2: Inventory Capital Valuation */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs hover:border-gray-200 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
              Warehouse Stock Capital
            </span>
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
              <Boxes className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">
              {formatCurrency(valuation)}
            </h3>
            <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
              <DollarSign className="h-3.5 w-3.5 text-blue-500" />
              <span>Total investment tied in physical stock</span>
            </p>
          </div>
        </div>

        {/* KPI 3: Wholesale Buyer Accounts */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs hover:border-gray-200 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
              Wholesale Retailers
            </span>
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
              <Building2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">
              {totalCustomers} <span className="text-xs font-semibold text-gray-400">Stores</span>
            </h3>
            <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
              <Users className="h-3.5 w-3.5 text-indigo-500" />
              <span>Verified B2B commercial accounts</span>
            </p>
          </div>
        </div>

        {/* KPI 4: Active Catalog SKUs */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs hover:border-gray-200 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
              Active Fancy Products
            </span>
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
              <Package className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">
              {totalProducts} <span className="text-xs font-semibold text-gray-400">SKUs</span>
            </h3>
            <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
              <Layers className="h-3.5 w-3.5 text-amber-500" />
              <span>Imported fancy goods in catalogue</span>
            </p>
          </div>
        </div>
      </div>

      {/* 3. Real-World Wholesale Order Fulfillment Pipeline (Kanban Flow) */}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
          <div>
            <h2 className="text-base font-bold text-gray-900 tracking-tight">
              Wholesale Order Fulfillment Pipeline
            </h2>
            <p className="text-xs text-gray-500">
              Track orders from incoming WhatsApp requests to bank slip verification and commercial dispatch
            </p>
          </div>
          <Link
            to="/admin/orders"
            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <span>All Customer Orders</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          {/* Step 1: Pending Verification */}
          <Link
            to="/admin/orders?status=PENDING"
            className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/60 hover:bg-amber-100/60 transition-colors flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-amber-800 mb-2">
              <span className="text-xs font-bold flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-amber-600" />
                <span>Pending Review</span>
              </span>
              <span className="text-[10px] bg-amber-200/70 text-amber-900 font-bold px-1.5 py-0.5 rounded-md">
                Step 1
              </span>
            </div>
            <p className="text-2xl font-black text-amber-900">{pendingCount}</p>
            <p className="text-[11px] text-amber-700 mt-1">Awaiting WhatsApp slip verification</p>
          </Link>

          {/* Step 2: Confirmed */}
          <Link
            to="/admin/orders?status=CONFIRMED"
            className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200/60 hover:bg-blue-100/60 transition-colors flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-blue-800 mb-2">
              <span className="text-xs font-bold flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-blue-600" />
                <span>Confirmed</span>
              </span>
              <span className="text-[10px] bg-blue-200/70 text-blue-900 font-bold px-1.5 py-0.5 rounded-md">
                Step 2
              </span>
            </div>
            <p className="text-2xl font-black text-blue-900">{confirmedCount}</p>
            <p className="text-[11px] text-blue-700 mt-1">Payment verified & locked</p>
          </Link>

          {/* Step 3: Packing / Processing */}
          <Link
            to="/admin/orders?status=PROCESSING"
            className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200/60 hover:bg-indigo-100/60 transition-colors flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-indigo-800 mb-2">
              <span className="text-xs font-bold flex items-center gap-1.5">
                <Package className="h-4 w-4 text-indigo-600" />
                <span>Warehouse Packing</span>
              </span>
              <span className="text-[10px] bg-indigo-200/70 text-indigo-900 font-bold px-1.5 py-0.5 rounded-md">
                Step 3
              </span>
            </div>
            <p className="text-2xl font-black text-indigo-900">{processingCount}</p>
            <p className="text-[11px] text-indigo-700 mt-1">Order allocated & packaged</p>
          </Link>

          {/* Step 4: Delivered / Completed */}
          <Link
            to="/admin/orders?status=COMPLETED"
            className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/60 hover:bg-emerald-100/60 transition-colors flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-emerald-800 mb-2">
              <span className="text-xs font-bold flex items-center gap-1.5">
                <Truck className="h-4 w-4 text-emerald-600" />
                <span>Dispatched / Delivered</span>
              </span>
              <span className="text-[10px] bg-emerald-200/70 text-emerald-900 font-bold px-1.5 py-0.5 rounded-md">
                Completed
              </span>
            </div>
            <p className="text-2xl font-black text-emerald-900">{completedCount}</p>
            <p className="text-[11px] text-emerald-700 mt-1">Fulfilled wholesale deliveries</p>
          </Link>
        </div>
      </div>

      {/* 4. Core Grid: Recent Orders Feed & Warehouse Stock Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 Cols): Live Orders Table */}
        <div className="lg:col-span-2">
          <Card
            title="Recent Wholesale Orders"
            subtitle="Live feed of incoming buyer orders and WhatsApp checkout requests"
            action={
              <Link
                to="/admin/orders"
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <span>View All Orders</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          >
            {recentOrders.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <ShoppingCart className="h-10 w-10 mx-auto text-gray-300 mb-2" />
                <p className="text-xs font-bold text-gray-700">No wholesale orders placed yet</p>
                <p className="text-[11px] text-gray-400 mt-1 max-w-sm mx-auto">
                  When wholesale customers add fancy goods to their cart and submit orders via WhatsApp, they will appear here in real time.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-gray-400 font-semibold border-b border-gray-100">
                    <tr>
                      <th className="pb-3">Order #</th>
                      <th className="pb-3">Customer / Shop Name</th>
                      <th className="pb-3">Total Amount</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3">Date</th>
                      <th className="pb-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 font-medium text-gray-700">
                    {recentOrders.map((o) => (
                      <tr key={o.id} className="hover:bg-gray-50/50">
                        <td className="py-3 font-mono font-bold text-blue-700">{o.order_number}</td>
                        <td className="py-3 font-semibold text-gray-900">{o.customer || 'Wholesale Buyer'}</td>
                        <td className="py-3 font-black text-gray-900">{formatCurrency(o.total_amount)}</td>
                        <td className="py-3">
                          <Badge status={o.status} />
                        </td>
                        <td className="py-3 text-gray-400">{o.created_at}</td>
                        <td className="py-3 text-right">
                          <Link
                            to="/admin/orders"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800"
                          >
                            <span>Manage</span>
                            <ArrowUpRight className="h-3 w-3" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Right Column (1 Col): Warehouse Inventory Risk Watchlist */}
        <div>
          <Card
            title="Stock Risk Watchlist"
            subtitle="Products nearing minimum safety stock thresholds"
            action={
              <Link
                to="/admin/inventory"
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <span>Stock Ledger</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          >
            {/* Quick Summary Pill Bar */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-100 text-center">
                <span className="text-[10px] font-bold text-amber-700 uppercase block">Low Stock</span>
                <span className="text-lg font-black text-amber-900">{lowStockCount} SKUs</span>
              </div>
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-100 text-center">
                <span className="text-[10px] font-bold text-rose-700 uppercase block">Out of Stock</span>
                <span className="text-lg font-black text-rose-900">{outOfStockCount} SKUs</span>
              </div>
            </div>

            {lowStockAlerts.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <CheckCircle2 className="h-9 w-9 mx-auto text-emerald-400 mb-2" />
                <p className="text-xs font-bold text-emerald-800">Inventory Levels Healthy</p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  No products are currently under critical safety stock levels.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {lowStockAlerts.map((item) => (
                  <div
                    key={item.product_id}
                    className="p-3 bg-amber-50/50 rounded-xl border border-amber-100/80 flex items-center justify-between"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-bold text-gray-900 truncate">{item.product_name}</p>
                      <p className="text-[11px] text-gray-500 font-mono">SKU: {item.sku}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-black text-amber-800 block">
                        {item.available_stock} Units
                      </span>
                      <span className="text-[10px] text-gray-400">Min: {item.low_stock_threshold}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Quick Adjustment Link */}
            <div className="mt-4 pt-3 border-t border-gray-100 text-center">
              <Link
                to="/admin/inventory"
                className="text-xs font-bold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
              >
                <span>Open Warehouse Stock In / Out</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </Card>
        </div>
      </div>

      {/* 5. Enterprise Operational Guidance for Imanya Fancy Goods */}
      <div className="bg-gradient-to-br from-slate-50 to-blue-50/40 p-6 sm:p-7 rounded-3xl border border-blue-100/80 shadow-xs">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="h-7 w-7 rounded-lg bg-blue-600 text-white flex items-center justify-center">
            <Sparkles className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-bold text-gray-900 tracking-tight">
            Wholesale Operations Roadmap & Execution Guide
          </h3>
        </div>
        <p className="text-xs text-gray-600 mb-5 leading-relaxed">
          Standard operating workflow for Super Administrators managing imported fancy goods, fashion accessories, wholesale retail clients, and WhatsApp bank transfers:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
            <div className="h-6 w-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center mb-2">
              1
            </div>
            <h4 className="text-xs font-bold text-gray-900 mb-1">Set Up Categories</h4>
            <p className="text-[11px] text-gray-500 leading-relaxed mb-3">
              Define wholesale classification groups (e.g., Hair Accessories, Cosmetics, Jewelry).
            </p>
            <Link to="/admin/categories" className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1">
              <span>Categories</span> &rarr;
            </Link>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
            <div className="h-6 w-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center mb-2">
              2
            </div>
            <h4 className="text-xs font-bold text-gray-900 mb-1">Add Products & Stock</h4>
            <p className="text-[11px] text-gray-500 leading-relaxed mb-3">
              Create product SKUs with wholesale selling rates, cost prices, and physical warehouse inventory.
            </p>
            <Link to="/admin/products" className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1">
              <span>Add Items</span> &rarr;
            </Link>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
            <div className="h-6 w-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center mb-2">
              3
            </div>
            <h4 className="text-xs font-bold text-gray-900 mb-1">Assign Staff Roles</h4>
            <p className="text-[11px] text-gray-500 leading-relaxed mb-3">
              Delegate responsibilities by assigning employees as Inventory Managers or Order Managers.
            </p>
            <Link to="/admin/users" className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1">
              <span>Staff Users</span> &rarr;
            </Link>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
            <div className="h-6 w-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center mb-2">
              4
            </div>
            <h4 className="text-xs font-bold text-gray-900 mb-1">Weekly & Monthly PDF</h4>
            <p className="text-[11px] text-gray-500 leading-relaxed mb-3">
              Generate official executive sales performance statements with 1-click PDF download.
            </p>
            <Link to="/admin/reports" className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1">
              <span>Sales PDF</span> &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
