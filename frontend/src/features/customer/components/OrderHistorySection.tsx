import React, { useState, useMemo } from 'react';
import { Order } from '../../../types';
import { formatCurrency, formatDate } from '../../../utils/formatters';
import { Badge } from '../../../components/ui/Badge';
import {
  Search,
  Package,
  MessageSquare,
  Printer,
  Repeat,
  ShoppingBag,
  FileText,
  Clock,
  Truck,
  CheckCircle2,
} from 'lucide-react';

interface OrderHistorySectionProps {
  orders: Order[];
  onOpenInvoice: (order: Order) => void;
  onReorder: (order: Order) => Promise<void>;
  onNavigateToShop: () => void;
  reorderingId: string | null;
}

export const OrderHistorySection: React.FC<OrderHistorySectionProps> = ({
  orders,
  onOpenInvoice,
  onReorder,
  onNavigateToShop,
  reorderingId,
}) => {
  const [search, setSearch] = useState('');
  const [statusTab, setStatusTab] = useState<'ALL' | 'PENDING' | 'CONFIRMED' | 'COMPLETED'>('ALL');

  const pendingOrders = orders.filter((o) => o.status === 'PENDING');
  const activeOrders = orders.filter((o) => o.status === 'PROCESSING' || o.status === 'CONFIRMED');
  const completedOrders = orders.filter((o) => o.status === 'COMPLETED');
  const lifetimeSpend = orders
    .filter((o) => o.status !== 'CANCELLED')
    .reduce((sum, o) => sum + (o.total_amount || 0), 0);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchSearch =
        o.order_number.toLowerCase().includes(search.toLowerCase()) ||
        (o.items || []).some((it) => it.product_name.toLowerCase().includes(search.toLowerCase()));

      let matchTab = true;
      if (statusTab === 'PENDING') matchTab = o.status === 'PENDING';
      if (statusTab === 'CONFIRMED') matchTab = o.status === 'CONFIRMED' || o.status === 'PROCESSING';
      if (statusTab === 'COMPLETED') matchTab = o.status === 'COMPLETED';

      return matchSearch && matchTab;
    });
  }, [orders, search, statusTab]);

  return (
    <div className="space-y-6">
      {/* 1. Summary Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Orders */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Total Orders
            </p>
            <h3 className="text-2xl font-black text-slate-900">{orders.length}</h3>
            <p className="text-[11px] text-slate-400 mt-1">Recorded customer orders</p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-[#EBF2F7] text-[#2C6291] flex items-center justify-center">
            <ShoppingBag className="h-5 w-5" />
          </div>
        </div>

        {/* Awaiting Slip */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Awaiting Slip
            </p>
            <h3 className="text-2xl font-black text-amber-600">{pendingOrders.length}</h3>
            <p className="text-[11px] text-amber-600 font-semibold mt-1">Pending WhatsApp slip</p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        {/* In Packaging */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              In Transit / Packaging
            </p>
            <h3 className="text-2xl font-black text-[#4C9091]">{activeOrders.length}</h3>
            <p className="text-[11px] text-slate-400 mt-1">Confirmed & dispatching</p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-[#EEF6F6] text-[#4C9091] flex items-center justify-center">
            <Truck className="h-5 w-5" />
          </div>
        </div>

        {/* Lifetime Purchases */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Lifetime Purchases
            </p>
            <h3 className="text-2xl font-black text-[#6F9128]">{formatCurrency(lifetimeSpend)}</h3>
            <p className="text-[11px] text-[#6F9128] font-semibold mt-1">Eligible trade volume</p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-[#F4F9EC] text-[#6F9128] flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* 2. Order History Master Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">Customer Order History</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Review order progress, view official commercial invoices, or upload payment slips.
            </p>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by order number or item..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50/50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2C6291] focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 overflow-x-auto">
          <button
            onClick={() => setStatusTab('ALL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              statusTab === 'ALL'
                ? 'bg-[#2C6291] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            All Orders ({orders.length})
          </button>
          <button
            onClick={() => setStatusTab('PENDING')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              statusTab === 'PENDING'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Awaiting Slip ({pendingOrders.length})
          </button>
          <button
            onClick={() => setStatusTab('CONFIRMED')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              statusTab === 'CONFIRMED'
                ? 'bg-[#4C9091] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            In Packaging ({activeOrders.length})
          </button>
          <button
            onClick={() => setStatusTab('COMPLETED')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              statusTab === 'COMPLETED'
                ? 'bg-[#9AC640] text-slate-900 shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Delivered ({completedOrders.length})
          </button>
        </div>

        {/* Orders Table */}
        {filteredOrders.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Package className="h-10 w-10 mx-auto text-slate-300 mb-2" />
            <p className="text-xs font-semibold text-slate-700">No orders matching criteria.</p>
            <p className="text-[11px] text-slate-400 mt-1">Browse our store catalog to place orders.</p>
            <button
              onClick={onNavigateToShop}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2C6291] text-white font-bold text-xs hover:bg-[#235077] transition-colors shadow-xs"
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              <span>Browse Catalog</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-400 font-bold border-b border-slate-100 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="pb-3">Order Number</th>
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Items Summary</th>
                  <th className="pb-3">Total Value</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Order Number */}
                    <td className="py-3.5">
                      <span className="font-bold text-slate-900 font-mono block">{o.order_number}</span>
                      <span className="text-[10px] text-slate-400">Bank Transfer / WhatsApp</span>
                    </td>

                    {/* Date */}
                    <td className="py-3.5 text-slate-500">{formatDate(o.created_at)}</td>

                    {/* Items */}
                    <td className="py-3.5">
                      <div className="max-w-xs space-y-0.5">
                        {o.items.slice(0, 2).map((it) => (
                          <div key={it.id} className="text-[11px] text-slate-600 truncate">
                            <span className="font-bold text-slate-800">{it.quantity}x</span> {it.product_name}
                          </div>
                        ))}
                        {o.items.length > 2 && (
                          <span className="text-[10px] text-[#2C6291] font-semibold block">
                            +{o.items.length - 2} more item(s)
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Total Value */}
                    <td className="py-3.5 font-bold text-slate-900">{formatCurrency(o.total_amount)}</td>

                    {/* Status Badge */}
                    <td className="py-3.5">
                      <Badge
                        variant={
                          o.status === 'COMPLETED'
                            ? 'green'
                            : o.status === 'CONFIRMED' || o.status === 'PROCESSING'
                            ? 'blue'
                            : o.status === 'PENDING'
                            ? 'amber'
                            : 'gray'
                        }
                      >
                        {o.status}
                      </Badge>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {o.status === 'PENDING' && o.whatsapp_url && (
                          <a
                            href={o.whatsapp_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-2xs transition-all flex items-center gap-1"
                            title="Attach slip on WhatsApp"
                          >
                            <MessageSquare className="h-3 w-3" />
                            <span>Send Slip</span>
                          </a>
                        )}

                        <button
                          onClick={() => onOpenInvoice(o)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] transition-colors flex items-center gap-1"
                          title="View Official Invoice"
                        >
                          <Printer className="h-3 w-3" />
                          <span>Invoice</span>
                        </button>

                        <button
                          onClick={() => onReorder(o)}
                          disabled={reorderingId === o.id}
                          className="px-2.5 py-1.5 rounded-lg bg-[#EBF2F7] hover:bg-[#D5E5F0] text-[#2C6291] font-bold text-[11px] transition-colors flex items-center gap-1"
                          title="Duplicate Items to Cart"
                        >
                          <Repeat className="h-3 w-3" />
                          <span>{reorderingId === o.id ? 'Adding...' : 'Re-Order'}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
