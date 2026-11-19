import React, { useEffect, useState } from 'react';
import { adminApi } from '../../services/endpoints';
import { Order } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { OrderDetailModal } from './OrderDetailModal';
import { ShoppingCart, Search, Eye, MessageSquare } from 'lucide-react';

export const OrderListPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    loadOrders();
  }, [statusFilter, search]);

  const loadOrders = async () => {
    try {
      setIsLoading(true);
      const res = await adminApi.getOrders({
        status: statusFilter || undefined,
        search: search || undefined,
      });
      if (res.success && res.data) {
        setOrders(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Customer Wholesale Orders</h2>
          <p className="text-xs text-gray-500">Review incoming purchase requests, change statuses, and track historical orders</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by order number (e.g. ORD-20261119)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Statuses</option>
          <option value="PENDING">PENDING</option>
          <option value="CONFIRMED">CONFIRMED</option>
          <option value="PROCESSING">PROCESSING</option>
          <option value="COMPLETED">COMPLETED</option>
          <option value="CANCELLED">CANCELLED</option>
        </select>
      </div>

      <Card>
        {isLoading ? (
          <Spinner />
        ) : orders.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <ShoppingCart className="h-10 w-10 mx-auto text-gray-300 mb-2" />
            <p className="text-sm font-medium">No customer orders found matching filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-gray-400 font-semibold border-b border-gray-100">
                <tr>
                  <th className="pb-3">Order Number</th>
                  <th className="pb-3">Customer Name</th>
                  <th className="pb-3">Phone</th>
                  <th className="pb-3">Items Count</th>
                  <th className="pb-3">Total Value</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Date</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 font-medium text-gray-700">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50/50">
                    <td className="py-3.5 font-bold text-gray-900 font-mono">{o.order_number}</td>
                    <td className="py-3.5 font-semibold text-gray-800">{o.customer_name}</td>
                    <td className="py-3.5 font-mono text-gray-500">{o.customer_phone}</td>
                    <td className="py-3.5 text-gray-500">{o.items?.length || 0} items</td>
                    <td className="py-3.5 font-extrabold text-gray-900">{formatCurrency(o.total_amount)}</td>
                    <td className="py-3.5">
                      <Badge status={o.status} />
                    </td>
                    <td className="py-3.5 text-gray-400">{formatDate(o.created_at)}</td>
                    <td className="py-3.5 text-right space-x-2">
                      {o.whatsapp_url && (
                        <a
                          href={o.whatsapp_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg inline-block transition-colors"
                          title="Open WhatsApp Click-to-Chat"
                        >
                          <MessageSquare className="h-4 w-4" />
                        </a>
                      )}
                      <button
                        onClick={() => setSelectedOrder(o)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {selectedOrder && (
        <OrderDetailModal
          isOpen={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onSuccess={loadOrders}
          order={selectedOrder}
        />
      )}
    </div>
  );
};
