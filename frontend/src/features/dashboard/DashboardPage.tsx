import React, { useEffect, useState } from 'react';
import { adminApi } from '../../services/endpoints';
import { DashboardMetrics, ProductAdmin, Order, MembershipStats, MembershipCustomerItem, Customer } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { Button } from '../../components/ui/Button';
import { OrderDetailModal } from '../orders/OrderDetailModal';
import { MembershipBadge } from '../../components/ui/MembershipBadge';
import { MembershipSettingsModal } from './MembershipSettingsModal';
import { CustomerDetailModal } from '../customers/CustomerDetailModal';
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
  Bell,
  ArrowUpRight,
  Database,
  Calendar,
  Layers,
  ChevronRight,
  Sparkles,
  Truck,
  FileSpreadsheet,
  Crown,
  Award,
  Shield,
  Settings,
  SlidersHorizontal,
  Search,
  Eye,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDebounce } from '../../hooks/useDebounce';

// Helper function to generate ultra-smooth cubic bezier spline curves for SVG charts
function getSmoothCurvePath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 < points.length ? i + 2 : i + 1];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    path += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return path;
}

export const DashboardPage: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [topProducts, setTopProducts] = useState<ProductAdmin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // SVG Chart hover states
  const [hoveredBarIdx, setHoveredBarIdx] = useState<number | null>(null);
  const [hoveredLineIdx, setHoveredLineIdx] = useState<number | null>(null);

  // Modal inspection directly from dashboard
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [inspectingOrderId, setInspectingOrderId] = useState<string | null>(null);

  // Membership & Loyalty states
  const [membershipStats, setMembershipStats] = useState<MembershipStats | null>(null);
  const [membershipCustomers, setMembershipCustomers] = useState<MembershipCustomerItem[]>([]);
  const [selectedTierFilter, setSelectedTierFilter] = useState<string>('ALL');
  const [membershipSearch, setMembershipSearch] = useState<string>('');
  const debouncedMembershipSearch = useDebounce(membershipSearch, 300);
  const [membershipSortBy, setMembershipSortBy] = useState<string>('lifetime_spent');
  const [membershipSortOrder, setMembershipSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [inspectingCustomer, setInspectingCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    loadDashboardData();
    loadMembershipStats();
  }, []);

  useEffect(() => {
    loadMembershipCustomers();
  }, [selectedTierFilter, debouncedMembershipSearch, membershipSortBy, membershipSortOrder]);

  const loadMembershipStats = async () => {
    try {
      const res = await adminApi.getMembershipStats();
      if (res.success && res.data) {
        setMembershipStats(res.data);
      }
    } catch (err) {
      console.error('Failed to load membership stats', err);
    }
  };

  const loadMembershipCustomers = async () => {
    try {
      const res = await adminApi.getMembershipCustomers({
        tier: selectedTierFilter === 'ALL' ? undefined : selectedTierFilter,
        search: debouncedMembershipSearch || undefined,
        sort_by: membershipSortBy,
        order: membershipSortOrder,
        limit: 10,
      });
      if (res.success && res.data) {
        setMembershipCustomers(res.data);
      }
    } catch (err) {
      console.error('Failed to load membership customers', err);
    }
  };

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [metricsRes, productsRes] = await Promise.all([
        adminApi.getDashboardMetrics(),
        adminApi.getProducts({ limit: 6 }),
      ]);

      if (metricsRes.success && metricsRes.data) {
        setMetrics(metricsRes.data);
      } else {
        setError('Failed to fetch real-time dashboard telemetry from the database.');
      }

      if (productsRes.success && productsRes.data) {
        setTopProducts(productsRes.data);
      }
    } catch (err: any) {
      console.error('Failed to load dashboard data', err);
      const message =
        err.response?.data?.error?.message ||
        err.message ||
        'Unable to connect to the backend server. Please ensure the backend is running.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInspectOrder = async (orderId: string) => {
    try {
      setInspectingOrderId(orderId);
      const res = await adminApi.getOrder(orderId);
      if (res.success && res.data) {
        setSelectedOrder(res.data);
        setIsOrderModalOpen(true);
      }
    } catch (err) {
      console.error('Failed to load order detail', err);
    } finally {
      setInspectingOrderId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] gap-3">
        <Spinner size="lg" />
        <p className="text-xs text-gray-500 font-semibold tracking-wide">
          Connecting to PostgreSQL & Synthesizing Executive Telemetry...
        </p>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="max-w-lg mx-auto my-16 p-8 bg-white rounded-3xl border border-rose-100 shadow-xl text-center">
        <div className="h-14 w-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="h-7 w-7" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">Telemetry Pipeline Disrupted</h3>
        <p className="text-xs text-gray-500 mb-6 leading-relaxed">
          {error || 'Unable to establish live connection to the distribution management database.'}
        </p>
        <Button onClick={loadDashboardData} className="inline-flex items-center gap-2 mx-auto">
          <RefreshCw className="h-4 w-4" />
          <span>Re-synchronize Dashboard</span>
        </Button>
      </div>
    );
  }

  // 1. KPI Cards Setup (Creative Tim / Argon Dashboard Style with 8 Connected Enterprise Modules)
  const pendingOrdersCount = metrics.pending_orders || 0;
  const pendingRevenueAmount = metrics.pending_order_volume || 0;

  const kpis = [
    {
      label: "Verified Sales Income",
      val: formatCurrency(metrics.total_order_volume || 0),
      icon: TrendingUp,
      trend: pendingRevenueAmount > 0
        ? `+ ${formatCurrency(pendingRevenueAmount)} pending check`
        : '+100% verified',
      trendColor: pendingRevenueAmount > 0 ? 'text-amber-600 font-bold' : 'text-emerald-600 font-bold',
      subtext: 'Confirmed via WhatsApp bank slips',
      iconBg: 'bg-gradient-to-tl from-slate-900 to-slate-800 text-white shadow-slate-900/20',
      link: '/admin/reports',
    },
    {
      label: "Sales Order Demand",
      val: `${metrics.total_orders || 0}`,
      icon: ShoppingCart,
      trend: pendingOrdersCount > 0
        ? `${pendingOrdersCount} slips awaiting WhatsApp check`
        : `${metrics.completed_orders || 0} completed orders`,
      trendColor: pendingOrdersCount > 0 ? 'text-amber-600 font-bold' : 'text-blue-600 font-bold',
      subtext: 'Direct buyer storefront submissions',
      iconBg: 'bg-gradient-to-tl from-blue-700 to-blue-600 text-white shadow-blue-600/20',
      link: '/admin/orders',
    },
    {
      label: "Customer Accounts",
      val: `${metrics.total_customers || 0}`,
      icon: Users,
      trend: 'Registered commercial clients',
      trendColor: 'text-sky-600 font-bold',
      subtext: 'Verified retail shop buyers',
      iconBg: 'bg-gradient-to-tl from-sky-700 to-sky-600 text-white shadow-sky-600/20',
      link: '/admin/customers',
    },
    {
      label: "Warehouse Physical Stock",
      val: `${metrics.total_inventory_units || 0} Units`,
      icon: Boxes,
      trend: formatCurrency(metrics.inventory_valuation || 0),
      trendColor: 'text-purple-600 font-bold',
      subtext: 'Total warehouse asset valuation',
      iconBg: 'bg-gradient-to-tl from-purple-700 to-purple-600 text-white shadow-purple-600/20',
      link: '/admin/inventory',
    },
    {
      label: "Commercial Catalogue SKUs",
      val: `${metrics.total_products || 0}`,
      icon: Package,
      trend: `${metrics.total_products || 0} active commercial products`,
      trendColor: 'text-indigo-600 font-bold',
      subtext: 'Fancy goods product catalog',
      iconBg: 'bg-gradient-to-tl from-indigo-700 to-indigo-600 text-white shadow-indigo-600/20',
      link: '/admin/products',
    },
    {
      label: "Product Categories",
      val: `${metrics.total_categories || 0}`,
      icon: Layers,
      trend: 'Active inventory classifications',
      trendColor: 'text-teal-600 font-bold',
      subtext: 'Jewelry, cosmetics, novelties',
      iconBg: 'bg-gradient-to-tl from-teal-700 to-teal-600 text-white shadow-teal-600/20',
      link: '/admin/categories',
    },
    {
      label: "Registered Suppliers",
      val: `${metrics.total_suppliers || metrics.active_suppliers || 0}`,
      icon: Truck,
      trend: `${metrics.active_suppliers || metrics.total_suppliers || 0} active procurement channels`,
      trendColor: 'text-cyan-600 font-bold',
      subtext: 'Direct overseas & local vendors',
      iconBg: 'bg-gradient-to-tl from-cyan-700 to-cyan-600 text-white shadow-cyan-600/20',
      link: '/admin/suppliers',
    },
    {
      label: "Import Purchase Orders",
      val: `${metrics.total_purchase_orders || 0}`,
      icon: FileSpreadsheet,
      trend: (metrics.pending_pos || 0) > 0 ? `${metrics.pending_pos} pending receipt` : 'All shipments cleared',
      trendColor: (metrics.pending_pos || 0) > 0 ? 'text-amber-600 font-bold' : 'text-emerald-600 font-bold',
      subtext: 'Supplier PO tracking & GRN',
      iconBg: 'bg-gradient-to-tl from-rose-700 to-rose-600 text-white shadow-rose-600/20',
      link: '/admin/procurement',
    },
  ];

  const recentOrders = metrics.recent_orders || [];
  const lowStockAlerts = metrics.low_stock_alerts || [];

  // Generate 7-day calendar baseline from real database records
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

  // SVG Chart Geometry Calculations
  const chartWidth = 280;
  const chartHeight = 110;
  const maxOrders = Math.max(...weeklySales.map((d) => d.orders), 5);
  const barWidth = 16;
  const barSpacing = chartWidth / 7;

  // Chart 2 Smooth Spline Calculation
  const maxRevenue = Math.max(...weeklySales.map((d) => d.revenue), 1000);
  const linePoints = weeklySales.map((d, i) => {
    const x = 20 + i * ((chartWidth - 40) / 6);
    const y = 95 - (d.revenue / maxRevenue) * 75;
    return { x, y, revenue: d.revenue, date: d.date };
  });

  const smoothCurvePath = getSmoothCurvePath(linePoints);
  const areaPathString = `${smoothCurvePath} L ${linePoints[linePoints.length - 1].x},95 L ${linePoints[0].x},95 Z`;

  // Chart 3 Stock Health Calculations
  const totalProds = metrics.total_products || 0;
  const lowCount = metrics.low_stock_count || 0;
  const outCount = metrics.out_of_stock_count || 0;
  const healthyCount = Math.max(0, totalProds - lowCount - outCount);

  const healthyPct = totalProds > 0 ? Math.round((healthyCount / totalProds) * 100) : 100;
  const lowPct = totalProds > 0 ? Math.round((lowCount / totalProds) * 100) : 0;
  const outPct = totalProds > 0 ? Math.round((outCount / totalProds) * 100) : 0;

  return (
    <div className="space-y-7 pb-10">
      {/* Executive Breadcrumb & Header Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-400 font-medium mb-1">
            <span>Pages</span>
            <span>/</span>
            <span className="text-gray-700 font-semibold">Executive Dashboard</span>
          </div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">
            Super Administrator Executive Console
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Real-time sales telemetry, WhatsApp bank slip verification, and inventory health sentinel.
          </p>
        </div>

        {/* Live Database Pulse Badge & Quick Verification Button */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-bold shadow-2xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>PostgreSQL 18.7 Live</span>
          </div>

          <Link
            to="/admin/orders"
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-sm transition-all hover:scale-[1.02] ${
              pendingOrdersCount > 0
                ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20'
                : 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/20'
            }`}
          >
            <CheckSquare className="h-3.5 w-3.5" />
            <span>Verify Orders {pendingOrdersCount > 0 && `(${pendingOrdersCount} Slips)`}</span>
          </Link>
        </div>
      </div>

      {/* Super Admin Quick Controls Floating Pill Strip */}
      <div className="bg-white/80 backdrop-blur-md p-3.5 rounded-2xl border border-gray-100 shadow-[0_4px_20px_0_rgba(0,0,0,0.03)] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
          <Sparkles className="h-4 w-4 text-blue-600" />
          <span>Quick Control Shortcuts:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/admin/products"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add New Item</span>
          </Link>

          <Link
            to="/admin/users"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors"
          >
            <Users className="h-3.5 w-3.5" />
            <span>Staff Permissions</span>
          </Link>

          <Link
            to="/admin/inventory"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors"
          >
            <Boxes className="h-3.5 w-3.5" />
            <span>Warehouse Stock</span>
          </Link>

          <Link
            to="/admin/reports"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold transition-colors"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Financial PDF Reports</span>
          </Link>
        </div>
      </div>

      {/* 1. TOP METRIC CARDS (8 Enterprise Modules Connected to Live Database) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <Link
              key={idx}
              to={kpi.link}
              className="bg-white rounded-2xl border border-gray-100 p-5 shadow-[0_4px_20px_0_rgba(0,0,0,0.04)] hover:shadow-[0_12px_28px_0_rgba(0,0,0,0.09)] hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between group cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                    {kpi.label}
                  </p>
                  <h3 className="text-2xl font-black text-gray-900 tracking-tight">{kpi.val}</h3>
                </div>
                <div className={`h-12 w-12 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform ${kpi.iconBg}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between text-[11px]">
                <span className={kpi.trendColor}>{kpi.trend}</span>
                <span className="text-gray-400 text-[10px] group-hover:text-blue-600 transition-colors flex items-center gap-0.5">
                  View <ChevronRight className="h-3 w-3" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* 2. MIDDLE ROW: The Three Visual Diagram Cards (Matching Reference Middle Row) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Weekly Sales Orders (Emerald Green Rounded Bar Chart) */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-[0_4px_20px_0_rgba(0,0,0,0.04)] hover:shadow-[0_10px_25px_0_rgba(0,0,0,0.08)] transition-all duration-300 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-gray-900 tracking-tight">Weekly Sales Orders</h4>
                <p className="text-[11px] text-gray-500 mb-3">Daily bulk inquiries & buyer requests</p>
              </div>
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                7 Days
              </span>
            </div>

            {/* SVG Rounded Bar Chart */}
            <div className="relative pt-2 pb-1">
              {hoveredBarIdx !== null && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold px-2.5 py-0.5 rounded shadow-lg pointer-events-none z-10 whitespace-nowrap">
                  {getDayLabel(weeklySales[hoveredBarIdx].date)}: {weeklySales[hoveredBarIdx].orders} Order(s)
                </div>
              )}

              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-32 overflow-visible">
                {/* Horizontal Guide Lines */}
                <line x1="0" y1="20" x2={chartWidth} y2="20" stroke="#f1f5f9" strokeDasharray="3 3" />
                <line x1="0" y1="55" x2={chartWidth} y2="55" stroke="#f1f5f9" strokeDasharray="3 3" />
                <line x1="0" y1="90" x2={chartWidth} y2="90" stroke="#e2e8f0" />

                {/* Vertical Rounded Bars */}
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
                        fill={isHovered ? '#15803d' : '#22c55e'}
                        className="transition-all duration-200 hover:brightness-110"
                      />
                      <text
                        x={x + barWidth / 2}
                        y="105"
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
            <span className="font-bold text-emerald-600">
              {totalWeeklyOrders} total orders
            </span>
          </div>
        </div>

        {/* Card 2: Daily Sales Income (Curved Spline Line Chart & Gradient Fill) */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-[0_4px_20px_0_rgba(0,0,0,0.04)] hover:shadow-[0_10px_25px_0_rgba(0,0,0,0.08)] transition-all duration-300 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-gray-900 tracking-tight">Daily Sales Income</h4>
                <p className="text-[11px] text-gray-500 mb-3">(+100%) confirmed WhatsApp bank receipts</p>
              </div>
              <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                Rs. Verified
              </span>
            </div>

            {/* SVG Smooth Bezier Spline Chart */}
            <div className="relative pt-2 pb-1">
              {hoveredLineIdx !== null && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-blue-950 text-white text-[10px] font-bold px-2.5 py-0.5 rounded shadow-lg pointer-events-none z-10 whitespace-nowrap">
                  {getDayLabel(weeklySales[hoveredLineIdx].date)}: {formatCurrency(weeklySales[hoveredLineIdx].revenue)}
                </div>
              )}

              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-32 overflow-visible">
                <defs>
                  <linearGradient id="revenueSplineGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity="0.28" />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal Guide Lines */}
                <line x1="0" y1="20" x2={chartWidth} y2="20" stroke="#f1f5f9" strokeDasharray="3 3" />
                <line x1="0" y1="55" x2={chartWidth} y2="55" stroke="#f1f5f9" strokeDasharray="3 3" />
                <line x1="0" y1="95" x2={chartWidth} y2="95" stroke="#e2e8f0" />

                {/* Shaded Area Under Bezier Spline */}
                <path d={areaPathString} fill="url(#revenueSplineGradient)" />

                {/* Smooth Bezier Spline Line */}
                <path
                  d={smoothCurvePath}
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Circular Nodes */}
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
                  Rs. 0 verified income. Approved WhatsApp bank deposit slips chart here live.
                </p>
              )}
            </div>

            {/* Income Telemetry Sub-bar */}
            <div className="mt-2 p-2 bg-blue-50/70 rounded-xl border border-blue-100 flex items-center justify-between text-[10px]">
              <span className="font-semibold text-blue-900">Awaiting Slip Verification:</span>
              <span className="font-bold text-amber-700">{formatCurrency(pendingRevenueAmount)}</span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
              <span>Realized bank receipts</span>
            </span>
            <span className="font-bold text-blue-700">
              {formatCurrency(metrics.total_order_volume || 0)}
            </span>
          </div>
        </div>

        {/* Card 3: WhatsApp Slips & Stock Health Sentinel */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-[0_4px_20px_0_rgba(0,0,0,0.04)] hover:shadow-[0_10px_25px_0_rgba(0,0,0,0.08)] transition-all duration-300 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-gray-900 tracking-tight">Fulfillment & Stock Sentinel</h4>
                <p className="text-[11px] text-gray-500 mb-3">Verification pipeline & warehouse safety</p>
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

            {/* Verification Pipeline Stage Grid */}
            <div className="space-y-3 pt-1">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
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

              {/* Warehouse Stock Health Gauge */}
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

              {/* Breakdown Status Badges */}
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
              <span>Automated stock sentinel active</span>
            </span>
            <span className="font-semibold text-gray-600">{totalProds} total items</span>
          </div>
        </div>
      </div>

      {/* 3. BOTTOM ROW: Two Cards (Matching Reference Image Projects Table + Orders Overview) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Card (2 Columns): Product Catalogue & Stock Performance (Projects equivalent) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6 shadow-[0_4px_20px_0_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-base font-bold text-gray-900 tracking-tight">
                  Top Products & Stock Ledger
                </h4>
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <span><strong>{metrics.total_products || 0} Listed SKUs</strong> active in the warehouse catalogue</span>
                </p>
              </div>

              <Link
                to="/admin/products"
                className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700"
              >
                <span>View Full Catalogue</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Products Table */}
            {topProducts.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Package className="h-10 w-10 mx-auto text-gray-300 mb-2" />
                <p className="text-xs font-medium">No products added yet.</p>
                <Link
                  to="/admin/products"
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-xs hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Create First Product SKU</span>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-gray-400 font-bold border-b border-gray-100 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="pb-3">Product / SKU</th>
                      <th className="pb-3">Category</th>
                      <th className="pb-3">Unit Price</th>
                      <th className="pb-3">Available Stock</th>
                      <th className="pb-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 font-medium text-gray-700">
                    {topProducts.map((p) => {
                      const avail = p.available_stock || 0;
                      const threshold = p.low_stock_threshold || 5;
                      const maxGauge = Math.max(avail, threshold * 3, 20);
                      const stockPct = Math.min(100, Math.round((avail / maxGauge) * 100));

                      return (
                        <tr key={p.id} className="hover:bg-gray-50/60 transition-colors">
                          <td className="py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-xl bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center flex-shrink-0">
                                {p.images && p.images.length > 0 ? (
                                  <img src={p.images[0].image_url} alt={p.name} className="w-full h-full object-cover" />
                                ) : (
                                  <Package className="h-4 w-4 text-gray-400" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-gray-900 truncate max-w-[200px]">{p.name}</p>
                                <p className="font-mono text-[10px] text-gray-400">SKU: {p.sku}</p>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              {p.category_name || 'General'}
                            </span>
                          </td>

                          <td className="py-3.5 font-extrabold text-gray-900">
                            {formatCurrency(p.selling_price)}
                            <span className="text-[10px] font-normal text-gray-400 ml-0.5">/{p.unit_of_measure}</span>
                          </td>

                          <td className="py-3.5">
                            <div className="w-28 space-y-1">
                              <div className="flex items-center justify-between text-[10px]">
                                <span className={`font-bold ${avail <= threshold ? 'text-amber-700' : 'text-emerald-700'}`}>
                                  {avail} Units
                                </span>
                                <span className="text-gray-400">{stockPct}%</span>
                              </div>
                              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  style={{ width: `${stockPct}%` }}
                                  className={`h-full rounded-full transition-all ${
                                    avail === 0
                                      ? 'bg-rose-500'
                                      : avail <= threshold
                                      ? 'bg-amber-500'
                                      : 'bg-emerald-500'
                                  }`}
                                />
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 text-right">
                            <Link
                              to="/admin/inventory"
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800"
                            >
                              <span>Adjust Stock</span>
                              <ChevronRight className="h-3 w-3" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
            <span>Synchronized with warehouse inventory ledger</span>
            <Link to="/admin/inventory" className="text-blue-600 font-bold hover:underline">
              Inventory Ledger &rarr;
            </Link>
          </div>
        </div>

        {/* Right Card (1 Column): Orders Overview Timeline (Matching Reference Image Orders Overview) */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-[0_4px_20px_0_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-base font-bold text-gray-900 tracking-tight">Orders Overview</h4>
                <p className="text-xs text-emerald-600 font-bold mt-0.5 flex items-center gap-1">
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  <span>{metrics.total_orders || 0} orders recorded</span>
                </p>
              </div>

              <Link
                to="/admin/orders"
                className="text-xs font-bold text-blue-600 hover:text-blue-700"
              >
                View All
              </Link>
            </div>

            {/* Vertical Timeline Feed */}
            {recentOrders.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Bell className="h-10 w-10 mx-auto text-gray-300 mb-2" />
                <p className="text-xs font-medium">No customer orders recorded yet.</p>
                <p className="text-[11px] text-gray-400 mt-1">
                  When retail buyers submit carts, orders will populate this live timeline.
                </p>
              </div>
            ) : (
              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-100">
                {recentOrders.map((o) => {
                  const isPending = o.status === 'PENDING';
                  const isConfirmed = o.status === 'CONFIRMED' || o.status === 'PROCESSING';
                  const isCompleted = o.status === 'COMPLETED' || o.status === 'DELIVERED';

                  return (
                    <div key={o.id} className="relative group">
                      {/* Timeline Node Icon */}
                      <div
                        className={`absolute -left-6 top-0.5 h-5 w-5 rounded-full flex items-center justify-center ring-4 ring-white ${
                          isPending
                            ? 'bg-amber-500 text-white'
                            : isConfirmed
                            ? 'bg-blue-600 text-white'
                            : isCompleted
                            ? 'bg-emerald-600 text-white'
                            : 'bg-gray-400 text-white'
                        }`}
                      >
                        {isPending ? (
                          <MessageSquare className="h-2.5 w-2.5" />
                        ) : isConfirmed ? (
                          <CheckCircle2 className="h-2.5 w-2.5" />
                        ) : (
                          <Bell className="h-2.5 w-2.5" />
                        )}
                      </div>

                      {/* Content */}
                      <div>
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-gray-900 font-mono">
                            {formatCurrency(o.total_amount)}
                          </p>
                          <span className="text-[10px] text-gray-400">{o.created_at}</span>
                        </div>

                        <p className="text-xs text-gray-600 font-medium mt-0.5">
                          Order #{o.order_number} &bull; {o.customer || 'Customer'}
                        </p>

                        <div className="mt-2 flex items-center gap-2">
                          <Badge status={o.status} />

                          <button
                            type="button"
                            onClick={() => handleInspectOrder(o.id)}
                            disabled={inspectingOrderId === o.id}
                            className="text-[11px] font-bold text-blue-600 hover:text-blue-800 transition-colors"
                          >
                            {inspectingOrderId === o.id ? 'Loading...' : 'Inspect & Verify &rarr;'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100 text-[11px] text-gray-400 flex items-center justify-between">
            <span>Direct WhatsApp slip verification</span>
            <Link to="/admin/orders" className="text-blue-600 font-bold hover:underline">
              Fulfillment Pipeline &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* 5. Customer Membership & Automatic Loyalty Section */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-8 shadow-[0_4px_20px_0_rgba(0,0,0,0.04)] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center">
                <Crown className="w-4 h-4 text-amber-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 tracking-tight">
                Customer Membership & Loyalty Tiers
              </h3>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Automatic tier ranking based on confirmed lifetime customer purchases (Bronze, Silver, Gold, Platinum).
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsSettingsModalOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 border-slate-300 hover:bg-slate-50"
            >
              <Settings className="w-3.5 h-3.5 text-slate-500" />
              <span>Configure Thresholds</span>
            </Button>
            <Link
              to="/admin/customers"
              className="text-xs font-bold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
            >
              <span>Full Directory</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* 5 Tier KPI Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {/* Total Customers */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Registered</span>
              <Users className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-2xl font-black text-slate-900 mt-2">
              {membershipStats?.total_customers ?? 0}
            </p>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Registered Customers</span>
          </div>

          {/* Bronze Tier */}
          <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/80">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900">Bronze</span>
              <Shield className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-2xl font-black text-amber-950 mt-2">
              {membershipStats?.bronze_count ?? 0}
            </p>
            <span className="text-[10px] text-amber-700/80 mt-0.5 block">Entry Tier</span>
          </div>

          {/* Silver Tier */}
          <div className="p-4 rounded-xl bg-slate-100/70 border border-slate-300/80">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">Silver</span>
              <Award className="w-4 h-4 text-slate-600" />
            </div>
            <p className="text-2xl font-black text-slate-900 mt-2">
              {membershipStats?.silver_count ?? 0}
            </p>
            <span className="text-[10px] text-slate-500 mt-0.5 block">Rs. 100k+ Tier</span>
          </div>

          {/* Gold Tier */}
          <div className="p-4 rounded-xl bg-yellow-50/70 border border-yellow-300/80">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900">Gold</span>
              <Crown className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-2xl font-black text-amber-950 mt-2">
              {membershipStats?.gold_count ?? 0}
            </p>
            <span className="text-[10px] text-amber-700 mt-0.5 block">High Volume Buyer</span>
          </div>

          {/* Platinum Tier */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-indigo-50 border border-indigo-200/80 col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-900">Platinum VIP</span>
              <Sparkles className="w-4 h-4 text-indigo-500" />
            </div>
            <p className="text-2xl font-black text-indigo-950 mt-2">
              {membershipStats?.platinum_count ?? 0}
            </p>
            <span className="text-[10px] text-indigo-600 mt-0.5 block">Elite Partners (Rs. 1M+)</span>
          </div>
        </div>

        {/* Filters & Sorting Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2">
          {/* Tier Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'ALL', label: 'All Levels' },
              { id: 'BRONZE', label: 'Bronze' },
              { id: 'SILVER', label: 'Silver' },
              { id: 'GOLD', label: 'Gold' },
              { id: 'PLATINUM', label: 'Platinum' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedTierFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedTierFilter === tab.id
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search & Sort Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={membershipSearch}
                onChange={(e) => setMembershipSearch(e.target.value)}
                placeholder="Search customers..."
                className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 w-44 sm:w-56"
              />
            </div>

            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <SlidersHorizontal className="w-3.5 h-3.5 text-gray-400" />
              <select
                value={`${membershipSortBy}:${membershipSortOrder}`}
                onChange={(e) => {
                  const [field, dir] = e.target.value.split(':');
                  setMembershipSortBy(field);
                  setMembershipSortOrder(dir as 'ASC' | 'DESC');
                }}
                className="py-1.5 px-2 rounded-lg border border-gray-200 bg-gray-50 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
              >
                <option value="lifetime_spent:DESC">Highest Spending First</option>
                <option value="lifetime_spent:ASC">Lowest Spending First</option>
                <option value="membership_tier:DESC">Membership Level</option>
                <option value="created_at:DESC">Newest Registered</option>
              </select>
            </div>
          </div>
        </div>

        {/* Customer Membership Table */}
        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-200">
              <tr>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Contact Info</th>
                <th className="py-3 px-4">Membership Level</th>
                <th className="py-3 px-4">Lifetime Spending</th>
                <th className="py-3 px-4">Orders</th>
                <th className="py-3 px-4">Registered Date</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
              {membershipCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-400">
                    No customers match the selected tier filter.
                  </td>
                </tr>
              ) : (
                membershipCustomers.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <p className="font-bold text-gray-900">{c.name}</p>
                      {c.business_name && (
                        <p className="text-[11px] text-gray-500">{c.business_name}</p>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-mono text-gray-700">{c.phone}</p>
                      {c.email && (
                        <p className="text-[11px] text-gray-400">{c.email}</p>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <MembershipBadge tier={c.membership_tier} size="xs" />
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-extrabold text-gray-900 font-mono">
                        {formatCurrency(c.lifetime_spent)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[11px] font-bold border border-blue-100">
                        {c.order_count} orders
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-400 text-[11px]">
                      {c.created_at ? formatDate(c.created_at).split(',')[0] : '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setInspectingCustomer({
                            id: c.id,
                            name: c.name,
                            email: c.email,
                            phone: c.phone,
                            business_name: c.business_name,
                            delivery_address: '',
                            membership_tier: c.membership_tier,
                            lifetime_spent: c.lifetime_spent,
                            order_count: c.order_count,
                            is_active: true,
                            created_at: c.created_at,
                          });
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-500" />
                        <span>Inspect Profile</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Direct Order Verification Modal from Dashboard */}
      {selectedOrder && (
        <OrderDetailModal
          isOpen={isOrderModalOpen}
          onClose={() => {
            setIsOrderModalOpen(false);
            setSelectedOrder(null);
          }}
          onSuccess={() => {
            loadDashboardData();
            setIsOrderModalOpen(false);
            setSelectedOrder(null);
          }}
          order={selectedOrder}
        />
      )}

      {/* Admin Membership Threshold Configuration Modal */}
      <MembershipSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        onSaved={() => {
          loadMembershipStats();
          loadMembershipCustomers();
          loadDashboardData();
        }}
      />

      {/* Customer Profile Dossier Modal */}
      <CustomerDetailModal
        isOpen={!!inspectingCustomer}
        onClose={() => setInspectingCustomer(null)}
        customer={inspectingCustomer}
      />
    </div>
  );
};
