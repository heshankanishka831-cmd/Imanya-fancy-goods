import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useCart } from '../cart/CartContext';
import { customerApi, publicApi } from '../../services/endpoints';
import { Order, Customer } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import {
  Store,
  ShoppingBag,
  TrendingUp,
  Truck,
  ShieldCheck,
  MessageSquare,
  FileText,
  Repeat,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Printer,
  CreditCard,
  Building2,
  Phone,
  MapPin,
  Sparkles,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Package,
} from 'lucide-react';

export const CustomerDashboardPage: React.FC = () => {
  const { user, customerProfile } = useAuth();
  const { addToCart, setIsCartOpen } = useCart();
  const navigate = useNavigate();

  const [orders, setOrders] = useState<Order[]>([]);
  const [profile, setProfile] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Search states
  const [search, setSearch] = useState('');
  const [statusTab, setStatusTab] = useState<'ALL' | 'PENDING' | 'CONFIRMED' | 'COMPLETED'>('ALL');

  // Modals state
  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);

  // Profile Edit Form State
  const [editFormData, setEditFormData] = useState({
    business_name: '',
    phone: '',
    delivery_address: '',
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);

  // Re-ordering state
  const [reorderingId, setReorderingId] = useState<string | null>(null);

  useEffect(() => {
    loadCustomerData();
  }, []);

  const loadCustomerData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [ordersRes, profileRes] = await Promise.all([
        customerApi.getMyOrders(),
        customerApi.getProfile().catch(() => null),
      ]);

      if (ordersRes && ordersRes.data) {
        setOrders(ordersRes.data);
      }

      if (profileRes && profileRes.data) {
        setProfile(profileRes.data);
        setEditFormData({
          business_name: profileRes.data.business_name || '',
          phone: profileRes.data.phone || '',
          delivery_address: profileRes.data.delivery_address || '',
        });
      } else if (customerProfile) {
        setEditFormData({
          business_name: customerProfile.business_name || '',
          phone: customerProfile.phone || '',
          delivery_address: customerProfile.address || '',
        });
      }
    } catch (err: any) {
      console.error('Failed to load customer data', err);
      setError(err.response?.data?.error?.message || 'Unable to load orders. Please verify your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingProfile(true);
      setProfileMessage(null);
      const res = await customerApi.updateProfile(editFormData);
      if (res.success && res.data) {
        setProfile(res.data);
        setProfileMessage('Business profile updated successfully!');
        setTimeout(() => {
          setIsEditProfileOpen(false);
          setProfileMessage(null);
        }, 1500);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to update profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // 1-Click Re-Order (Duplicates items to cart)
  const handleReorder = async (order: Order) => {
    try {
      setReorderingId(order.id);
      for (const it of order.items) {
        await addToCart(it.product_id, it.quantity);
      }
      setIsCartOpen(true);
    } catch (err) {
      console.error('Failed to reorder items', err);
    } finally {
      setReorderingId(null);
    }
  };

  // Metrics Calculations
  const totalOrders = orders.length;
  const pendingOrders = orders.filter((o) => o.status === 'PENDING');
  const activeOrders = orders.filter((o) => o.status === 'PROCESSING' || o.status === 'CONFIRMED');
  const completedOrders = orders.filter((o) => o.status === 'COMPLETED');

  const lifetimeSpend = orders
    .filter((o) => o.status !== 'CANCELLED')
    .reduce((sum, o) => sum + (o.total_amount || 0), 0);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchSearch =
        o.order_number.toLowerCase().includes(search.toLowerCase()) ||
        o.items.some((it) => it.product_name.toLowerCase().includes(search.toLowerCase()));

      let matchTab = true;
      if (statusTab === 'PENDING') matchTab = o.status === 'PENDING';
      if (statusTab === 'CONFIRMED') matchTab = o.status === 'CONFIRMED' || o.status === 'PROCESSING';
      if (statusTab === 'COMPLETED') matchTab = o.status === 'COMPLETED';

      return matchSearch && matchTab;
    });
  }, [orders, search, statusTab]);

  // Frequently Ordered SKUs for quick 1-click re-ordering
  const frequentlyOrderedItems = useMemo(() => {
    const map = new Map<string, { product_id: string; product_name: string; product_sku: string; unit_price: number; count: number }>();
    orders.forEach((o) => {
      o.items.forEach((it) => {
        if (!map.has(it.product_id)) {
          map.set(it.product_id, {
            product_id: it.product_id,
            product_name: it.product_name,
            product_sku: it.product_sku,
            unit_price: it.unit_price,
            count: 1,
          });
        } else {
          const existing = map.get(it.product_id)!;
          existing.count += 1;
        }
      });
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 4);
  }, [orders]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] gap-3">
        <Spinner size="lg" />
        <p className="text-xs text-gray-500 font-semibold tracking-wide">
          Loading Wholesale Customer Portal & Order History...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* 1. Merchant Profile Welcome Hero */}
      <div className="relative rounded-3xl bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 p-8 sm:p-10 text-white shadow-xl overflow-hidden border border-blue-900/60">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_50%)] pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/15 backdrop-blur-md text-xs font-bold text-blue-300 border border-blue-400/20">
              <Sparkles className="h-3.5 w-3.5 text-blue-300" />
              <span>Verified Wholesale Merchant Account</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              {profile?.business_name || customerProfile?.business_name || `${user?.first_name} ${user?.last_name}`}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-blue-200">
              <span className="flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-blue-400" />
                <span>Client ID: <strong>{user?.username}</strong></span>
              </span>
              <span className="flex items-center gap-1.5">
                <Phone className="h-4 w-4 text-emerald-400" />
                <span>WhatsApp: {profile?.phone || customerProfile?.phone || 'Not configured'}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-amber-400" />
                <span>Destination: {profile?.delivery_address || customerProfile?.address || 'Islandwide Delivery'}</span>
              </span>
            </div>
          </div>

          {/* Quick Action Navigation Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm shadow-md transition-all hover:scale-[1.02]"
            >
              <ShoppingBag className="h-4 w-4" />
              <span>Browse Catalog & Order</span>
            </Link>

            <button
              onClick={() => setIsBankModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/20 backdrop-blur-sm transition-all"
            >
              <CreditCard className="h-4 w-4 text-amber-300" />
              <span>Bank Transfer Details</span>
            </button>

            <button
              onClick={() => setIsEditProfileOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/20 transition-all"
            >
              <span>Edit Profile</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Urgent WhatsApp Bank Slip Notification Banner (Dynamic Alert) */}
      {pendingOrders.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/15 to-orange-500/10 border-2 border-amber-400/80 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm mt-0.5">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-amber-950">
                Action Required: {pendingOrders.length} Order(s) Awaiting Bank Deposit Slip Verification!
              </h4>
              <p className="text-xs text-amber-900/90 mt-0.5 leading-relaxed">
                Order <strong>#{pendingOrders[0].order_number}</strong> ({formatCurrency(pendingOrders[0].total_amount)}) has been recorded. Please attach your bank transfer receipt via WhatsApp to start packaging and immediate dispatch.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {pendingOrders[0].whatsapp_url && (
              <a
                href={pendingOrders[0].whatsapp_url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition-all hover:scale-105"
              >
                <MessageSquare className="h-4 w-4" />
                <span>Attach Slip on WhatsApp</span>
              </a>
            )}
            <button
              onClick={() => setIsBankModalOpen(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-slate-800 hover:bg-amber-50 font-bold text-xs border border-amber-300 shadow-2xs"
            >
              <span>View Bank Accounts</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. Customer Telemetry Metric Cards Row (Creative Tim Style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Lifetime Wholesale Spend */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-[0_4px_20px_0_rgba(0,0,0,0.04)] hover:shadow-[0_10px_25px_0_rgba(0,0,0,0.08)] transition-all">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                Lifetime Wholesale Spend
              </p>
              <h3 className="text-2xl font-black text-gray-900 tracking-tight">
                {formatCurrency(lifetimeSpend)}
              </h3>
            </div>
            <div className="h-12 w-12 rounded-xl bg-gradient-to-tl from-slate-900 to-slate-800 text-white flex items-center justify-center shadow-md shadow-slate-900/20">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-50 text-[11px] text-gray-400">
            <span>Cumulative trade purchases in whole Rs.</span>
          </div>
        </div>

        {/* Card 2: Total Orders Placed */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-[0_4px_20px_0_rgba(0,0,0,0.04)] hover:shadow-[0_10px_25px_0_rgba(0,0,0,0.08)] transition-all">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                Total Orders Placed
              </p>
              <h3 className="text-2xl font-black text-gray-900 tracking-tight">
                {totalOrders}
              </h3>
            </div>
            <div className="h-12 w-12 rounded-xl bg-gradient-to-tl from-blue-700 to-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/20">
              <ShoppingBag className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-50 text-[11px] text-gray-400">
            <span className="font-semibold text-emerald-600">{completedOrders.length} delivered</span>
            <span className="mx-1">&bull;</span>
            <span>{activeOrders.length} in transit</span>
          </div>
        </div>

        {/* Card 3: Active Orders Pipeline */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-[0_4px_20px_0_rgba(0,0,0,0.04)] hover:shadow-[0_10px_25px_0_rgba(0,0,0,0.08)] transition-all">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                Active Orders Pipeline
              </p>
              <h3 className="text-2xl font-black text-gray-900 tracking-tight">
                {pendingOrders.length + activeOrders.length}
              </h3>
            </div>
            <div className="h-12 w-12 rounded-xl bg-gradient-to-tl from-amber-600 to-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
              <Truck className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-50 text-[11px] text-gray-400">
            {pendingOrders.length > 0 ? (
              <span className="font-bold text-amber-700">{pendingOrders.length} slips awaiting check</span>
            ) : (
              <span className="font-bold text-emerald-600">All slips verified</span>
            )}
          </div>
        </div>

        {/* Card 4: Wholesale Merchant Tier */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-[0_4px_20px_0_rgba(0,0,0,0.04)] hover:shadow-[0_10px_25px_0_rgba(0,0,0,0.08)] transition-all">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                Account Status
              </p>
              <h3 className="text-base font-extrabold text-blue-900 mt-1">
                Wholesale Tier 1
              </h3>
            </div>
            <div className="h-12 w-12 rounded-xl bg-gradient-to-tl from-emerald-600 to-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-50 text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Direct Import Prices Active</span>
          </div>
        </div>
      </div>

      {/* 4. Frequently Ordered Favorites Strip (1-Click Re-order) */}
      {frequentlyOrderedItems.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Repeat className="h-4 w-4 text-blue-600" />
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                Frequently Ordered Wholesale Favorites
              </h4>
            </div>
            <span className="text-[11px] text-gray-400">1-click duplicate into cart</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {frequentlyOrderedItems.map((fav) => (
              <div
                key={fav.product_id}
                className="p-3 rounded-xl bg-gray-50/80 border border-gray-100 hover:border-blue-200 transition-colors flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold text-gray-900 truncate">{fav.product_name}</p>
                  <p className="text-[10px] text-gray-400 font-mono">SKU: {fav.product_sku}</p>
                  <p className="text-xs font-extrabold text-blue-700 mt-0.5">
                    {formatCurrency(fav.unit_price)}
                  </p>
                </div>

                <button
                  onClick={() => addToCart(fav.product_id, 1)}
                  className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-2xs transition-all flex items-center gap-1 shrink-0"
                  title="Add 1 to Cart"
                >
                  <Plus className="h-3 w-3" />
                  <span>Re-order</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Comprehensive Order History & B2B Tracking Table */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-[0_4px_20px_0_rgba(0,0,0,0.04)] space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-gray-900 tracking-tight">Wholesale Order History</h3>
            <p className="text-xs text-gray-500">
              Track fulfillment progress, view official invoices, or submit bank slips via WhatsApp.
            </p>
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by order number or item..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 text-xs bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 border-b border-gray-100 pb-3 overflow-x-auto">
          <button
            onClick={() => setStatusTab('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              statusTab === 'ALL'
                ? 'bg-blue-600 text-white'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            All Orders ({orders.length})
          </button>
          <button
            onClick={() => setStatusTab('PENDING')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              statusTab === 'PENDING'
                ? 'bg-amber-500 text-white'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            Awaiting WhatsApp Slip ({pendingOrders.length})
          </button>
          <button
            onClick={() => setStatusTab('CONFIRMED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              statusTab === 'CONFIRMED'
                ? 'bg-blue-600 text-white'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            In Packaging ({activeOrders.length})
          </button>
          <button
            onClick={() => setStatusTab('COMPLETED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              statusTab === 'COMPLETED'
                ? 'bg-emerald-600 text-white'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            Delivered ({completedOrders.length})
          </button>
        </div>

        {/* Orders Table */}
        {filteredOrders.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Package className="h-10 w-10 mx-auto text-gray-300 mb-2" />
            <p className="text-xs font-semibold text-gray-700">No orders matching criteria.</p>
            <p className="text-[11px] text-gray-400 mt-1">Explore our catalogue to place fresh wholesale orders.</p>
            <Link
              to="/"
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition-colors"
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              <span>Browse Catalog</span>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-gray-400 font-bold border-b border-gray-100 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="pb-3">Order Number</th>
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Items Ordered</th>
                  <th className="pb-3">Total Value</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 font-medium text-gray-700">
                {filteredOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-3.5">
                      <span className="font-bold text-gray-900 font-mono block">{o.order_number}</span>
                      <span className="text-[10px] text-gray-400">Bank Transfer / WhatsApp</span>
                    </td>

                    <td className="py-3.5 text-gray-500">{formatDate(o.created_at)}</td>

                    <td className="py-3.5">
                      <span className="font-semibold text-gray-800">{o.items.length} bulk item(s)</span>
                      <span className="text-[10px] text-gray-400 block truncate max-w-[200px]">
                        {o.items.map((it) => it.product_name).join(', ')}
                      </span>
                    </td>

                    <td className="py-3.5 font-black text-gray-900 text-sm">
                      {formatCurrency(o.total_amount)}
                    </td>

                    <td className="py-3.5">
                      <Badge status={o.status} />
                    </td>

                    <td className="py-3.5 text-right space-x-2">
                      {/* WhatsApp Slip Link */}
                      {o.whatsapp_url && (
                        <a
                          href={o.whatsapp_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs transition-colors"
                          title="Open WhatsApp Chat & Attach Bank Slip"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          <span>WhatsApp</span>
                        </a>
                      )}

                      {/* View Invoice */}
                      <button
                        onClick={() => setInvoiceOrder(o)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs transition-colors"
                        title="View Official Commercial Invoice"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        <span>Invoice</span>
                      </button>

                      {/* 1-Click Reorder */}
                      <button
                        onClick={() => handleReorder(o)}
                        disabled={reorderingId === o.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs transition-colors"
                        title="Duplicate items into cart"
                      >
                        <Repeat className="h-3.5 w-3.5" />
                        <span>{reorderingId === o.id ? 'Loading...' : 'Re-order'}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 6. Bank Account Transfer Reference Modal */}
      <Modal
        isOpen={isBankModalOpen}
        onClose={() => setIsBankModalOpen(false)}
        title="Imanya Fancy Goods • Bank Deposit & Transfer Details"
        maxWidth="xl"
      >
        <div className="space-y-4 p-1">
          <p className="text-xs text-gray-600 leading-relaxed">
            Please transfer your wholesale order total to any of our official business accounts below. Once deposited, send a photo of the deposit slip or screenshot of your online transfer to our WhatsApp number with your <strong>Order Number</strong>.
          </p>

          <div className="space-y-3">
            {/* Account 1: Commercial Bank */}
            <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-100 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-900 uppercase">Commercial Bank of Ceylon</span>
                <span className="text-[10px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded-md">Primary</span>
              </div>
              <p className="text-xs text-gray-700">Account Name: <strong>Imanya Fancy Goods (Pvt) Ltd</strong></p>
              <p className="text-sm font-black text-blue-950 font-mono">Account No: 1000 8472 9183</p>
              <p className="text-[11px] text-gray-500">Branch: Pettah Main Branch</p>
            </div>

            {/* Account 2: Sampath Bank */}
            <div className="p-4 rounded-xl bg-orange-50/70 border border-orange-100 space-y-1">
              <span className="text-xs font-bold text-orange-950 uppercase">Sampath Bank PLC</span>
              <p className="text-xs text-gray-700">Account Name: <strong>Imanya Fancy Goods</strong></p>
              <p className="text-sm font-black text-orange-950 font-mono">Account No: 0029 1004 8829</p>
              <p className="text-[11px] text-gray-500">Branch: Colombo City Branch</p>
            </div>

            {/* Account 3: Bank of Ceylon */}
            <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-100 space-y-1">
              <span className="text-xs font-bold text-emerald-950 uppercase">Bank of Ceylon (BOC)</span>
              <p className="text-xs text-gray-700">Account Name: <strong>Imanya Fancy Goods</strong></p>
              <p className="text-sm font-black text-emerald-950 font-mono">Account No: 0001 9283 7462</p>
              <p className="text-[11px] text-gray-500">Branch: Corporate Branch</p>
            </div>
          </div>

          <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs text-gray-600 flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>Official WhatsApp Verification Hotline: <strong>+94 77 000 0000</strong></span>
          </div>

          <div className="pt-2 flex justify-end">
            <Button variant="outline" onClick={() => setIsBankModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* 7. Official Commercial Invoice Modal (Printable) */}
      {invoiceOrder && (
        <Modal
          isOpen={!!invoiceOrder}
          onClose={() => setInvoiceOrder(null)}
          title={`Wholesale Commercial Invoice #${invoiceOrder.order_number}`}
          maxWidth="2xl"
        >
          <div className="space-y-6 p-2 print:p-0">
            {/* Invoice Header */}
            <div className="flex justify-between items-start border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-lg font-black text-gray-900 tracking-tight">Imanya Fancy Goods</h3>
                <p className="text-xs text-gray-500">Direct Imports & B2B Wholesale Distribution</p>
                <p className="text-[11px] text-gray-400">Pettah & Colombo Commercial District, Sri Lanka</p>
              </div>

              <div className="text-right">
                <span className="text-xs font-bold text-blue-600 font-mono">INVOICE</span>
                <p className="text-sm font-extrabold text-gray-900 font-mono">#{invoiceOrder.order_number}</p>
                <p className="text-[10px] text-gray-400">{formatDate(invoiceOrder.created_at)}</p>
              </div>
            </div>

            {/* Bill To & Status */}
            <div className="grid grid-cols-2 gap-4 text-xs bg-gray-50 p-4 rounded-xl border border-gray-100">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                  Bill & Ship To:
                </span>
                <p className="font-bold text-gray-900">{invoiceOrder.customer_name}</p>
                <p className="text-gray-600 font-mono">{invoiceOrder.customer_phone}</p>
                <p className="text-gray-500 mt-1">{invoiceOrder.delivery_address || 'Islandwide Delivery'}</p>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                  Payment & Verification:
                </span>
                <p className="font-semibold text-gray-800">Online Banking / Bank Deposit</p>
                <div className="mt-2">
                  <Badge status={invoiceOrder.status} />
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="border border-gray-100 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-400 font-bold border-b border-gray-100 uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Item Description</th>
                    <th className="p-3">SKU</th>
                    <th className="p-3 text-right">Unit Price</th>
                    <th className="p-3 text-right">Qty</th>
                    <th className="p-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 font-medium text-gray-700">
                  {invoiceOrder.items.map((it) => (
                    <tr key={it.id}>
                      <td className="p-3 font-bold text-gray-900">{it.product_name}</td>
                      <td className="p-3 font-mono text-gray-400">{it.product_sku}</td>
                      <td className="p-3 text-right">{formatCurrency(it.unit_price)}</td>
                      <td className="p-3 text-right font-bold text-gray-900">{it.quantity}</td>
                      <td className="p-3 text-right font-black text-gray-900">{formatCurrency(it.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50/80 font-bold border-t border-gray-100">
                  <tr>
                    <td colSpan={4} className="p-3 text-right text-xs uppercase tracking-wider text-gray-600">
                      Total Invoice Amount:
                    </td>
                    <td className="p-3 text-right text-base font-black text-blue-700">
                      {formatCurrency(invoiceOrder.total_amount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Print and Actions */}
            <div className="flex justify-between items-center pt-2">
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors"
              >
                <Printer className="h-4 w-4" />
                <span>Print Invoice</span>
              </button>

              <div className="flex items-center gap-2">
                {invoiceOrder.whatsapp_url && (
                  <a
                    href={invoiceOrder.whatsapp_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs"
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span>WhatsApp Inquiry</span>
                  </a>
                )}
                <Button variant="outline" onClick={() => setInvoiceOrder(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* 8. Merchant Profile Edit Modal */}
      <Modal
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        title="Update Wholesale Merchant Profile"
        maxWidth="md"
      >
        <form onSubmit={handleUpdateProfile} className="space-y-4 p-1">
          {profileMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-medium">
              {profileMessage}
            </div>
          )}

          <Input
            label="Wholesale Business / Shop Name *"
            required
            value={editFormData.business_name}
            onChange={(e) => setEditFormData({ ...editFormData, business_name: e.target.value })}
            placeholder="e.g. Sunil Fancy Goods & Novelties"
          />

          <Input
            label="Contact WhatsApp Phone Number *"
            required
            value={editFormData.phone}
            onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
            placeholder="e.g. 077 123 4567"
          />

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Delivery Address (For Islandwide Courier Dispatch) *
            </label>
            <textarea
              required
              rows={3}
              value={editFormData.delivery_address}
              onChange={(e) => setEditFormData({ ...editFormData, delivery_address: e.target.value })}
              placeholder="e.g. No 45, Main Street, Kandy"
              className="w-full rounded-xl border border-gray-200 p-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditProfileOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isSavingProfile}>
              Save Profile
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
