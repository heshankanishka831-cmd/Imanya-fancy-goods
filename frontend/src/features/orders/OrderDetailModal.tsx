import React, { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { adminApi } from '../../services/endpoints';
import { Order } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { MessageSquare, Clock, MapPin, User, CheckCircle2, CreditCard, ShieldCheck, XCircle, FileCheck2 } from 'lucide-react';

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
  const [currentOrder, setCurrentOrder] = useState<Order>(order);
  const [status, setStatus] = useState(order.status);
  const [notes, setNotes] = useState('');
  const [paymentNotes, setPaymentNotes] = useState(order.payment_notes || '');
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdatingPayment, setIsUpdatingPayment] = useState(false);
  const [isRetryingWa, setIsRetryingWa] = useState(false);
  const [waStatus, setWaStatus] = useState(order.whatsapp_notification_status || '');
  const [waError, setWaError] = useState(order.whatsapp_notification_error || '');
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    setCurrentOrder(order);
    setStatus(order.status);
    setPaymentNotes(order.payment_notes || '');
    setWaStatus(order.whatsapp_notification_status || '');
    setWaError(order.whatsapp_notification_error || '');
    setError(null);
  }, [order]);

  const handlePaymentUpdate = async (targetPaymentStatus: 'RECEIPT_RECEIVED' | 'PAYMENT_VERIFIED' | 'PAYMENT_REJECTED') => {
    if (targetPaymentStatus === 'PAYMENT_REJECTED' && !paymentNotes.trim()) {
      setError('Please enter a rejection reason in Payment Notes before rejecting payment.');
      return;
    }
    try {
      setIsUpdatingPayment(true);
      setError(null);
      const res = await adminApi.updateOrderPayment(currentOrder.id, targetPaymentStatus, paymentNotes.trim());
      if (res.success && res.data) {
        setCurrentOrder(res.data);
        onSuccess();
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to update payment verification status');
    } finally {
      setIsUpdatingPayment(false);
    }
  };

  const handleRetryWhatsApp = async () => {
    try {
      setIsRetryingWa(true);
      const res = await adminApi.retryOrderWhatsApp(order.id);
      if (res.success && res.data) {
        setWaStatus(res.data.whatsapp_notification_status || '');
        setWaError(res.data.whatsapp_notification_error || '');
        onSuccess();
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to retry WhatsApp notification');
    } finally {
      setIsRetryingWa(false);
    }
  };

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
              {order.is_guest && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                  Guest Order
                </span>
              )}
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
                {(order.items || []).map((item) => (
                  <tr key={item.id}>
                    <td className="p-3 font-bold text-gray-900">{item.product_name}</td>
                    <td className="p-3 font-mono text-gray-500">{item.product_sku}</td>
                    <td className="p-3 text-right">
                      {item.discount_percent && item.discount_percent > 0 && item.original_price ? (
                        <div>
                          <span className="line-through text-gray-400 text-[10px] block">
                            {formatCurrency(item.original_price)}
                          </span>
                          <span className="font-bold text-emerald-700">
                            {formatCurrency(item.unit_price)}
                          </span>
                          <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1 rounded ml-1">
                            {item.discount_percent}% OFF
                          </span>
                        </div>
                      ) : (
                        <span>{formatCurrency(item.unit_price)}</span>
                      )}
                    </td>
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

        {/* WhatsApp Payment Verification Panel */}
        <div className="bg-emerald-50/50 rounded-2xl p-4 border border-emerald-200/80 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h5 className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                <CreditCard className="h-4 w-4 text-emerald-700" />
                <span>WhatsApp Bank Transfer Payment Verification</span>
              </h5>
              <p className="text-[11px] text-emerald-800/80">
                Verify customer bank transfer receipt received via WhatsApp before confirming or processing this order.
              </p>
            </div>
            <Badge status={currentOrder.payment_status || 'PAYMENT_PENDING'} />
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="Payment verification notes or rejection reason..."
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
              disabled={currentOrder.status === 'CANCELLED' || isUpdatingPayment}
              className="flex-1 rounded-lg border border-emerald-200 bg-white p-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={currentOrder.status === 'CANCELLED' || isUpdatingPayment}
                onClick={() => handlePaymentUpdate('RECEIPT_RECEIVED')}
              >
                <FileCheck2 className="h-3.5 w-3.5 mr-1" />
                <span>Receipt Received</span>
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={currentOrder.status === 'CANCELLED' || isUpdatingPayment}
                onClick={() => handlePaymentUpdate('PAYMENT_VERIFIED')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                <span>Verify Payment</span>
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={currentOrder.status === 'CANCELLED' || isUpdatingPayment}
                onClick={() => handlePaymentUpdate('PAYMENT_REJECTED')}
                className="border-rose-300 text-rose-700 hover:bg-rose-50"
              >
                <XCircle className="h-3.5 w-3.5 mr-1" />
                <span>Reject</span>
              </Button>
            </div>
          </div>

          {currentOrder.payment_history && currentOrder.payment_history.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-bold text-emerald-900/70 uppercase tracking-wider">
                Payment Verification History
              </span>
              {currentOrder.payment_history.map((ph) => (
                <div key={ph.id} className="text-[11px] flex items-center justify-between bg-white/80 px-2.5 py-1.5 rounded-lg border border-emerald-100">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge status={ph.new_status} />
                    <span className="text-gray-600">({ph.source})</span>
                    {ph.notes && <span className="text-gray-500 italic">— "{ph.notes}"</span>}
                  </div>
                  <span className="text-gray-400 text-[10px]">
                    {ph.changed_by_name} • {formatDate(ph.created_at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* WhatsApp & Status Transition Controls */}
        <div className="bg-blue-50/60 rounded-2xl p-4 border border-blue-100/80 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h5 className="text-xs font-bold text-blue-900 uppercase tracking-wider">Fulfillment State Workflow</h5>
              <p className="text-xs text-blue-700">Updating status enforces audit movement logging and stock transitions</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {waStatus === 'FAILED' && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  isLoading={isRetryingWa}
                  onClick={handleRetryWhatsApp}
                  title={waError || 'Retry WhatsApp Cloud API notification'}
                >
                  Retry WhatsApp Alert
                </Button>
              )}
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
          </div>

          {(currentOrder.payment_status || 'PAYMENT_PENDING') !== 'PAYMENT_VERIFIED' && currentOrder.status !== 'CANCELLED' && (
            <p className="text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Order confirmation/processing is locked until WhatsApp payment is marked <strong>PAYMENT_VERIFIED</strong>. Cancellation remains available.
            </p>
          )}

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              disabled={currentOrder.status === 'COMPLETED' || currentOrder.status === 'CANCELLED'}
              className="w-full sm:w-48 rounded-lg border border-gray-300 p-2 text-xs font-semibold text-gray-800 bg-white focus:outline-none"
            >
              <option value="PENDING">PENDING</option>
              <option value="CONFIRMED" disabled={(currentOrder.payment_status || 'PAYMENT_PENDING') !== 'PAYMENT_VERIFIED'}>CONFIRMED</option>
              <option value="PROCESSING" disabled={(currentOrder.payment_status || 'PAYMENT_PENDING') !== 'PAYMENT_VERIFIED'}>PROCESSING</option>
              <option value="COMPLETED" disabled={(currentOrder.payment_status || 'PAYMENT_PENDING') !== 'PAYMENT_VERIFIED'}>COMPLETED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>

            <input
              type="text"
              placeholder="Transition reason / audit note..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={currentOrder.status === 'COMPLETED' || currentOrder.status === 'CANCELLED'}
              className="flex-1 w-full rounded-lg border border-gray-300 p-2 text-xs bg-white focus:outline-none"
            />

            <Button
              onClick={handleStatusUpdate}
              disabled={currentOrder.status === 'COMPLETED' || currentOrder.status === 'CANCELLED' || status === currentOrder.status}
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
