import React, { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { adminApi } from '../../services/endpoints';
import { Order } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { MessageSquare, Clock, MapPin, User, CheckCircle2 } from 'lucide-react';

interface OrderDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  order: Order;
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  order,
}) => {
  const [status, setStatus] = useState(order.status);
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStatusUpdate = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await adminApi.updateOrderStatus(order.id, status, notes);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to update order status');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Order #${order.order_number}`} maxWidth="3xl">
      <div className="space-y-6">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
            {error}
          </div>
        )}

        {/* Header Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-gray-50 rounded-2xl p-4 border border-gray-100">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 font-semibold mb-1">
              <User className="h-3.5 w-3.5" /> Customer
            </div>
            <p className="text-sm font-bold text-gray-900">{order.customer_name}</p>
            <p className="text-xs text-gray-600 font-mono">{order.customer_phone}</p>
            {order.customer_email && <p className="text-xs text-gray-400">{order.customer_email}</p>}
          </div>

          <div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 font-semibold mb-1">
              <MapPin className="h-3.5 w-3.5" /> Destination
            </div>
            <p className="text-xs text-gray-700 leading-relaxed">{order.delivery_address || '—'}</p>
          </div>

          <div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 font-semibold mb-1">
              <Clock className="h-3.5 w-3.5" /> Placed On
            </div>
            <p className="text-xs text-gray-800">{formatDate(order.created_at)}</p>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-gray-400">Current Status:</span>
              <Badge status={order.status} />
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div>
          <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Order Line Items</h4>
          <div className="border border-gray-100 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-100">
                <tr>
                  <th className="p-3">Product Name</th>
                  <th className="p-3">SKU</th>
                  <th className="p-3 text-right">Agreed Unit Price</th>
                  <th className="p-3 text-right">Quantity</th>
                  <th className="p-3 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 font-medium text-gray-700">
                {order.items.map((item) => (
                  <tr key={item.id}>
                    <td className="p-3 font-bold text-gray-900">{item.product_name}</td>
                    <td className="p-3 font-mono text-gray-500">{item.product_sku}</td>
                    <td className="p-3 text-right">{formatCurrency(item.unit_price)}</td>
                    <td className="p-3 text-right font-bold text-gray-900">{item.quantity}</td>
                    <td className="p-3 text-right font-extrabold text-gray-900">{formatCurrency(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50/80 font-bold text-gray-900 border-t border-gray-100">
                <tr>
                  <td colSpan={4} className="p-3 text-right text-xs uppercase tracking-wider">
                    Total Order Value:
                  </td>
                  <td className="p-3 text-right text-base text-blue-600">
                    {formatCurrency(order.total_amount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* WhatsApp & Status Transition Controls */}
        <div className="bg-blue-50/60 rounded-2xl p-4 border border-blue-100/80 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h5 className="text-xs font-bold text-blue-900 uppercase tracking-wider">Fulfillment State Workflow</h5>
              <p className="text-xs text-blue-700">Updating status enforces audit movement logging and stock transitions</p>
            </div>
            {order.whatsapp_url && (
              <a
                href={order.whatsapp_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                <MessageSquare className="h-4 w-4" />
                <span>Open in WhatsApp</span>
              </a>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              disabled={order.status === 'COMPLETED' || order.status === 'CANCELLED'}
              className="w-full sm:w-48 rounded-lg border border-gray-300 p-2 text-xs font-semibold text-gray-800 bg-white focus:outline-none"
            >
              <option value="PENDING">PENDING</option>
              <option value="CONFIRMED">CONFIRMED</option>
              <option value="PROCESSING">PROCESSING</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>

            <input
              type="text"
              placeholder="Transition reason / audit note..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={order.status === 'COMPLETED' || order.status === 'CANCELLED'}
              className="flex-1 w-full rounded-lg border border-gray-300 p-2 text-xs bg-white focus:outline-none"
            />

            <Button
              onClick={handleStatusUpdate}
              disabled={order.status === 'COMPLETED' || order.status === 'CANCELLED' || status === order.status}
              isLoading={isLoading}
              size="sm"
            >
              Update Status
            </Button>
          </div>
        </div>

        {/* Audit Status History */}
        {order.status_history && order.status_history.length > 0 && (
          <div>
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Status Audit Trail</h4>
            <div className="space-y-2">
              {order.status_history.map((h) => (
                <div key={h.id} className="text-xs flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span className="font-bold text-gray-800">{h.new_status}</span>
                    {h.notes && <span className="text-gray-500">({h.notes})</span>}
                  </div>
                  <span className="text-gray-400 font-mono text-[11px]">{formatDate(h.created_at)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
