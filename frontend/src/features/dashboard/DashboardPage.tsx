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
  Clock,
  ShieldCheck,
  CheckCircle2,
  MessageSquare,
  CheckSquare,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredBarIdx, setHoveredBarIdx] = useState<number | null>(null);
  const [hoveredLineIdx, setHoveredLineIdx] = useState<number | null>(null);

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
        <p className="text-xs text-gray-500 font-medium">Loading Super Admin Executive Dashboard...</p>
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

  // 1. KPI Cards Setup
  const pendingOrdersCount = metrics.pending_orders || 0;
  const pendingRevenueAmount = metrics.pending_order_volume || 0;

  const kpis = [
    {
      label: 'Wholesale Products',
      val: metrics.total_products || 0,
      icon: Package,
      trend: `${metrics.total_products || 0} Active SKUs Listed`,
      trendColor: 'text-blue-600',
      color: 'text-blue-600 bg-blue-50',
    },
    {
      label: 'Low Stock Alerts',
      val: metrics.low_stock_count || 0,
      icon: AlertTriangle,
      trend: (metrics.low_stock_count || 0) > 0 ? 'Requires stock replenishing' : 'All stock levels optimal',
      trendColor: (metrics.low_stock_count || 0) > 0 ? 'text-amber-600 font-bold' : 'text-emerald-600',
      color: 'text-amber-600 bg-amber-50',
      alert: (metrics.low_stock_count || 0) > 0,
    },
    {
      label: 'Wholesale Orders Placed',
      val: metrics.total_orders || 0,
      icon: ShoppingCart,
      trend:
        pendingOrdersCount > 0
          ? `${pendingOrdersCount} awaiting WhatsApp slip`
          : `${metrics.completed_orders || 0} completed orders`,
      trendColor: pendingOrdersCount > 0 ? 'text-amber-600 font-bold' : 'text-indigo-600',
      color: 'text-indigo-600 bg-indigo-50',
    },
    {
      label: 'Verified WhatsApp Income',
      val: formatCurrency(metrics.total_order_volume || 0),
      icon: TrendingUp,
      trend:
        pendingRevenueAmount > 0
          ? `${formatCurrency(pendingRevenueAmount)} pending verification`
          : 'All payment slips verified',
      trendColor: pendingRevenueAmount > 0 ? 'text-amber-600 font-semibold' : 'text-emerald-600 font-semibold',
      color: 'text-emerald-600 bg-emerald-50',
    },
  ];

  const recentOrders = metrics.recent_orders || [];
  const lowStockAlerts = metrics.low_stock_alerts || [];

  // Generate 7-day calendar baseline from real database records (0 if no orders yet)
  const weeklySales = (() => {
    if (metrics.weekly_sales && metrics.weekly_sales.length === 7) {
      return metrics.weekly_sales;
    }
    const days = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().split('T')[0];
      days.push({ date: iso, orders: 0, revenue: 0, gross_demand: 0 });
    }
    return days;
  })();

  const totalWeeklyOrders = weeklySales.reduce((acc, curr) => acc + curr.orders, 0);
  const totalWeeklyRevenue = weeklySales.reduce((acc, curr) => acc + curr.revenue, 0);

  // Helper date labels for 7-day charts
  const dayLetters = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const getDayLetter = (dateStr: string, idx: number) => {
    try {
      const d = new Date(dateStr + 'T00:00:00');
      const letter = d.toLocaleDateString('en-US', { weekday: 'narrow' });
      return letter || dayLetters[idx % 7];
    } catch {
      return dayLetters[idx % 7];
    }
  };

  const getDayLabel = (dateStr: string) => {
    try {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // SVG Chart Calculations
  // Chart 1: Bar Chart (Order Volume)
  const maxOrders = Math.max(...weeklySales.map((d) => d.orders), 5);
  const chartWidth = 280;
  const chartHeight = 110;
  const barWidth = 18;
  const barSpacing = chartWidth / 7;

  // Chart 2: Line Chart (Verified WhatsApp Income)
  const maxRevenue = Math.max(...weeklySales.map((d) => d.revenue), 1000);
  const linePoints = weeklySales.map((d, i) => {
    const x = 20 + i * ((chartWidth - 40) / 6);
    const y = 95 - (d.revenue / maxRevenue) * 75;
    return { x, y, revenue: d.revenue, gross_demand: d.gross_demand || 0, date: d.date };
  });
  const linePathString = linePoints.map((p) => `${p.x},${p.y}`).join(' ');

  // Chart 3: Stock Health Calculations
  const totalProds = metrics.total_products || 0;
  const lowCount = metrics.low_stock_count || 0;
  const outCount = metrics.out_of_stock_count || 0;
  const healthyCount = Math.max(0, totalProds - lowCount - outCount);

  const healthyPct = totalProds > 0 ? Math.round((healthyCount / totalProds) * 100) : 100;
  const lowPct = totalProds > 0 ? Math.round((lowCount / totalProds) * 100) : 0;
  const outPct = totalProds > 0 ? Math.round((outCount / totalProds) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Super Admin Quick Actions Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-gray-900 tracking-tight">Super Administrator Control Shortcuts</h2>
          <p className="text-xs text-gray-500">Quickly add items, verify customer WhatsApp payments, or inspect stock</p>
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
            to="/admin/orders"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shadow-xs transition-colors ${
              pendingOrdersCount > 0
                ? 'bg-amber-500 hover:bg-amber-600 text-white'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
            }`}
          >
            <CheckSquare className="h-3.5 w-3.5" />
            <span>Verify Orders {pendingOrdersCount > 0 && `(${pendingOrdersCount} Slips)`}</span>
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

      {/* 1. KPI Cards Row (Matching Top Row in Reference Image) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    {kpi.label}
                  </p>
                  <h3 className="text-2xl font-extrabold text-gray-900 tracking-tight">{kpi.val}</h3>
                </div>
                <div className={`p-3 rounded-2xl ${kpi.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-50 flex items-center gap-1 text-[11px]">
                <span className={kpi.trendColor}>{kpi.trend}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 2. Visual Diagrams & Charts Row (Matching Middle Row in Reference Image) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Diagram 1: Weekly Wholesale Orders (Bar Chart - Emerald Green) */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-gray-900 tracking-tight">Weekly Wholesale Orders</h4>
                <p className="text-[11px] text-gray-500 mb-3">Storefront requests & WhatsApp inquiries</p>
              </div>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Last 7 Days
              </span>
            </div>

            {/* SVG Bar Chart */}
            <div className="relative pt-2 pb-1">
              {hoveredBarIdx !== null && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold px-2.5 py-0.5 rounded shadow-lg pointer-events-none z-10 whitespace-nowrap">
                  {getDayLabel(weeklySales[hoveredBarIdx].date)}: {weeklySales[hoveredBarIdx].orders} Order(s)
                </div>
              )}
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-32 overflow-visible">
                {/* Horizontal guide lines */}
                <line x1="0" y1="20" x2={chartWidth} y2="20" stroke="#f1f5f9" strokeDasharray="3 3" />
                <line x1="0" y1="55" x2={chartWidth} y2="55" stroke="#f1f5f9" strokeDasharray="3 3" />
                <line x1="0" y1="90" x2={chartWidth} y2="90" stroke="#e2e8f0" />

                {/* Vertical Bars */}
                {weeklySales.map((d, i) => {
                  const bHeight = Math.max(6, (d.orders / maxOrders) * 70);
                  const x = i * barSpacing + (barSpacing - barWidth) / 2;
                  const y = 90 - bHeight;
                  const isHovered = hoveredBarIdx === i;

                  return (
                    <g
                      key={d.date}
                      onMouseEnter={() => setHoveredBarIdx(i)}
                      onMouseLeave={() => setHoveredBarIdx(null)}
                      className="cursor-pointer"
                    >
                      <rect
                        x={x}
                        y={y}
                        width={barWidth}
                        height={bHeight}
                        rx={5}
                        fill={isHovered ? '#16a34a' : '#22c55e'}
                        className="transition-all duration-200 hover:brightness-110"
                      />
                      <text
                        x={x + barWidth / 2}
                        y="106"
                        textAnchor="middle"
                        fontSize="10"
                        fontWeight="600"
                        fill="#64748b"
                      >
                        {getDayLetter(d.date, i)}
                      </text>
                    </g>
                  );
                })}
              </svg>
              {totalWeeklyOrders === 0 && (
                <p className="text-[10px] text-gray-400 text-center mt-1">
                  0 orders in the last 7 days. Incoming orders will chart here automatically.
                </p>
              )}
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-gray-400" />
              <span>Live customer order flow</span>
            </span>
            <span className="font-semibold text-emerald-600">
              {totalWeeklyOrders} total orders
            </span>
          </div>
        </div>

        {/* Diagram 2: Verified Wholesale Revenue (Line Chart - Blue Area & Points) */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-gray-900 tracking-tight">Verified Wholesale Revenue</h4>
                <p className="text-[11px] text-gray-500 mb-3">Confirmed via WhatsApp bank deposit slips</p>
              </div>
              <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                Rs. Verified
              </span>
            </div>

            {/* SVG Line Chart */}
            <div className="relative pt-2 pb-1">
              {hoveredLineIdx !== null && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-blue-900 text-white text-[10px] font-bold px-2.5 py-0.5 rounded shadow-lg pointer-events-none z-10 whitespace-nowrap">
                  {getDayLabel(weeklySales[hoveredLineIdx].date)}: {formatCurrency(weeklySales[hoveredLineIdx].revenue)}
                </div>
              )}
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-32 overflow-visible">
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal guide lines */}
                <line x1="0" y1="20" x2={chartWidth} y2="20" stroke="#f1f5f9" strokeDasharray="3 3" />
                <line x1="0" y1="55" x2={chartWidth} y2="55" stroke="#f1f5f9" strokeDasharray="3 3" />
                <line x1="0" y1="95" x2={chartWidth} y2="95" stroke="#e2e8f0" />

                {/* Shaded Area Under Curve */}
                <polygon
                  points={`${linePoints[0].x},95 ${linePathString} ${linePoints[linePoints.length - 1].x},95`}
                  fill="url(#revenueGradient)"
                />

                {/* Trend Polyline */}
                <polyline
                  points={linePathString}
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Interactive Data Point Dots */}
                {linePoints.map((p, idx) => {
                  const isHovered = hoveredLineIdx === idx;
                  return (
                    <g
                      key={p.date}
                      onMouseEnter={() => setHoveredLineIdx(idx)}
                      onMouseLeave={() => setHoveredLineIdx(null)}
                      className="cursor-pointer"
                    >
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={isHovered ? 6 : 3.5}
                        fill="#ffffff"
                        stroke="#2563eb"
                        strokeWidth={isHovered ? 3 : 2}
                        className="transition-all duration-200"
                      />
                      <text
                        x={p.x}
                        y="108"
                        textAnchor="middle"
                        fontSize="9"
                        fontWeight="600"
                        fill="#64748b"
                      >
                        {getDayLetter(p.date, idx)}
                      </text>
                    </g>
                  );
                })}
              </svg>
              {(metrics.total_order_volume || 0) === 0 && (
                <p className="text-[10px] text-gray-400 text-center mt-1">
                  Rs. 0 verified income. When customer bank deposit slips are confirmed on WhatsApp, revenue charts here live.
                </p>
              )}
            </div>

            {/* Income Recognition Note */}
            <div className="mt-2 p-2 bg-blue-50/60 rounded-xl border border-blue-100/70 text-[10px] text-blue-900 flex items-center justify-between">
              <span className="font-medium">Pending Slip Verification:</span>
              <span className="font-bold text-amber-700">{formatCurrency(pendingRevenueAmount)}</span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
              <span>Realized bank account receipts</span>
            </span>
            <span className="font-bold text-blue-700">
              {formatCurrency(metrics.total_order_volume || 0)}
            </span>
          </div>
        </div>

        {/* Diagram 3: WhatsApp Slips & Stock Health Sentinel */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-gray-900 tracking-tight">WhatsApp Slips & Stock Monitor</h4>
                <p className="text-[11px] text-gray-500 mb-3">Verification pipeline & warehouse stock</p>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  pendingOrdersCount > 0
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                }`}
              >
                {pendingOrdersCount > 0 ? `${pendingOrdersCount} Slips Pending` : 'All Slips Verified'}
              </span>
            </div>

            {/* Stage 1: WhatsApp Slip Verification Flow */}
            <div className="space-y-3 pt-1">
              <div>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
                  WhatsApp Fulfillment Pipeline
                </span>
                <div className="grid grid-cols-3 gap-1.5 text-center">
                  <div className="bg-amber-50 border border-amber-200/80 p-2 rounded-xl">
                    <span className="text-[9px] font-bold text-amber-800 uppercase block">Slip Check</span>
                    <span className="text-sm font-black text-amber-900">{pendingOrdersCount}</span>
                    <span className="text-[9px] text-amber-600 block mt-0.5">Pending</span>
                  </div>

                  <div className="bg-blue-50 border border-blue-200/80 p-2 rounded-xl">
                    <span className="text-[9px] font-bold text-blue-800 uppercase block">Packaging</span>
                    <span className="text-sm font-black text-blue-900">{metrics.processing_orders || 0}</span>
                    <span className="text-[9px] text-blue-600 block mt-0.5">Confirmed</span>
                  </div>

                  <div className="bg-emerald-50 border border-emerald-200/80 p-2 rounded-xl">
                    <span className="text-[9px] font-bold text-emerald-800 uppercase block">Dispatched</span>
                    <span className="text-sm font-black text-emerald-900">{metrics.completed_orders || 0}</span>
                    <span className="text-[9px] text-emerald-600 block mt-0.5">Completed</span>
                  </div>
                </div>
              </div>

              {/* Stage 2: Warehouse Stock Health Ratio */}
              <div className="pt-1">
                <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
                  <span>Warehouse Stock Ratio</span>
                  <span className="text-emerald-600 font-bold">{healthyPct}% Optimal</span>
                </div>
                <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden flex shadow-inner">
                  <div
                    style={{ width: `${healthyPct}%` }}
                    className="bg-emerald-500 transition-all duration-500"
                    title={`Healthy Stock: ${healthyCount} products (${healthyPct}%)`}
                  />
                  <div
                    style={{ width: `${lowPct}%` }}
                    className="bg-amber-500 transition-all duration-500"
                    title={`Low Stock Warnings: ${lowCount} products (${lowPct}%)`}
                  />
                  <div
                    style={{ width: `${outPct}%` }}
                    className="bg-rose-500 transition-all duration-500"
                    title={`Out of Stock: ${outCount} products (${outPct}%)`}
                  />
                </div>
              </div>

              {/* Status Breakdown Pills */}
              <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                <div className="bg-gray-50 border border-gray-100 py-1 px-2 rounded-lg">
                  <span className="text-[9px] text-gray-500 block">Optimal</span>
                  <span className="text-xs font-bold text-emerald-700">{healthyCount}</span>
                </div>
                <div className="bg-gray-50 border border-gray-100 py-1 px-2 rounded-lg">
                  <span className="text-[9px] text-gray-500 block">Low Stock</span>
                  <span className="text-xs font-bold text-amber-700">{lowCount}</span>
                </div>
                <div className="bg-gray-50 border border-gray-100 py-1 px-2 rounded-lg">
                  <span className="text-[9px] text-gray-500 block">Depleted</span>
                  <span className="text-xs font-bold text-rose-700">{outCount}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span>Real-time WhatsApp & stock monitor</span>
            </span>
            <span className="font-semibold text-gray-600">{totalProds} total items</span>
          </div>
        </div>
      </div>

      {/* 3. Grid: Recent Wholesale Orders (2 cols) & Low Stock Watchlist (1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Orders (2 cols) */}
        <div className="lg:col-span-2">
          <Card
            title="Recent Wholesale Orders"
            subtitle="Incoming customer order requests and WhatsApp verification"
            action={
              <Link
                to="/admin/orders"
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <span>Manage & Verify Orders</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          >
            {recentOrders.length === 0 ? (
              <p className="text-xs text-gray-400 py-6 text-center">No wholesale orders placed yet.</p>
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
                      <th className="pb-3 text-right">Verification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 font-medium text-gray-700">
                    {recentOrders.map((o) => (
                      <tr key={o.id} className="hover:bg-gray-50/50">
                        <td className="py-3 font-bold text-gray-900 font-mono">{o.order_number}</td>
                        <td className="py-3 font-semibold text-gray-800">{o.customer || 'Wholesale Buyer'}</td>
                        <td className="py-3 font-extrabold text-gray-900">{formatCurrency(o.total_amount)}</td>
                        <td className="py-3">
                          <Badge status={o.status} />
                        </td>
                        <td className="py-3 text-gray-400">{o.created_at}</td>
                        <td className="py-3 text-right">
                          <Link
                            to="/admin/orders"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800"
                          >
                            <span>Inspect & Verify</span>
                            <ArrowRight className="h-3 w-3" />
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
