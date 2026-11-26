import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useSearchParams, Link } from 'react-router-dom';
import {
  CheckCircle2,
  Copy,
  Check,
  MessageSquare,
  MapPin,
  User,
  Phone,
  Package,
  CreditCard,
  Search,
  RefreshCw,
  ArrowLeft,
  AlertCircle,
} from 'lucide-react';
import { Order } from '../../types';
import { guestApi } from '../../services/endpoints';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { buildWhatsAppOrderUrl } from '../../utils/whatsapp';

export const OrderConfirmationPage: React.FC = () => {
  const { orderNumber: routeOrderNumber } = useParams<{ orderNumber: string }>();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const initialOrder = (location.state as { order?: Order } | null)?.order || null;
  const tokenFromUrl = searchParams.get('token') || '';

  const [order, setOrder] = useState<Order | null>(initialOrder);
  const [isLoading, setIsLoading] = useState<boolean>(!initialOrder && Boolean(routeOrderNumber));
  const [error, setError] = useState<string | null>(null);
  const [copiedOrderNum, setCopiedOrderNum] = useState(false);

  // Manual Lookup State (if visiting /track-order or refreshing without token)
  const [lookupOrderNum, setLookupOrderNum] = useState(routeOrderNumber || '');
  const [lookupPhone, setLookupPhone] = useState('');

  useEffect(() => {
    if (initialOrder) {
      setOrder(initialOrder);
      setIsLoading(false);
      return;
    }
    if (!routeOrderNumber) return;

    const storedToken =
      tokenFromUrl || sessionStorage.getItem(`guest_order_token_${routeOrderNumber}`) || '';
    const cachedOrderRaw = sessionStorage.getItem(`guest_order_data_${routeOrderNumber}`);

    if (storedToken) {
      fetchOrder(routeOrderNumber, { token: storedToken });
    } else if (cachedOrderRaw) {
      try {
        setOrder(JSON.parse(cachedOrderRaw));
      } catch {
        // ignore parse error
      }
      setIsLoading(false);
    } else {
      setIsLoading(false);
    }
  }, [routeOrderNumber, tokenFromUrl]);

  const fetchOrder = async (num: string, params: { token?: string; phone?: string }) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await guestApi.getOrder(num, params);
      if (res.success && res.data) {
        setOrder(res.data);
        sessionStorage.setItem(`guest_order_data_${num}`, JSON.stringify(res.data));
      } else {
        setError(res.error?.message || 'Unable to verify order details.');
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.error?.message ||
          'Order not found or verification failed. Please check your order number and WhatsApp number.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleLookupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupOrderNum.trim() || !lookupPhone.trim()) {
      setError('Please enter both your Order Number and WhatsApp Number.');
      return;
    }
    fetchOrder(lookupOrderNum.trim(), { phone: lookupPhone.trim() });
  };

  const handleRefreshStatus = () => {
    if (!order) return;
    const storedToken =
      tokenFromUrl || sessionStorage.getItem(`guest_order_token_${order.order_number}`) || '';
    if (storedToken) {
      fetchOrder(order.order_number, { token: storedToken });
    } else if (order.customer_phone) {
      fetchOrder(order.order_number, { phone: order.customer_phone });
    }
  };

  const handleCopyOrderNumber = () => {
    if (!order) return;
    navigator.clipboard.writeText(order.order_number);
    setCopiedOrderNum(true);
    setTimeout(() => setCopiedOrderNum(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-3">
        <Spinner size="lg" />
        <p className="text-xs font-semibold text-slate-500">Loading your order confirmation...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 sm:p-8 space-y-5">
          <div className="text-center space-y-2">
            <div className="h-12 w-12 rounded-2xl bg-[#EBF2F7] text-[#2C6291] flex items-center justify-center mx-auto">
              <Search className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-black text-slate-900">Track Your Order</h1>
            <p className="text-xs text-slate-500">
              Enter your unique Order Number and the WhatsApp Number used during checkout to verify and view your order status.
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLookupSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Order Number</label>
              <input
                type="text"
                required
                value={lookupOrderNum}
                onChange={(e) => setLookupOrderNum(e.target.value)}
                placeholder="e.g. ORD-20261125-a1b2c3"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#2C6291]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">WhatsApp Number</label>
              <input
                type="tel"
                required
                value={lookupPhone}
                onChange={(e) => setLookupPhone(e.target.value)}
                placeholder="e.g. 0771234567"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#2C6291]"
              />
            </div>

            <Button type="submit" className="w-full">
              Verify & View Order
            </Button>
          </form>
        </div>
      </div>
    );
  }

  const waUrl = order.whatsapp_url || buildWhatsAppOrderUrl(order);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Success Banner */}
      <div className="bg-gradient-to-r from-[#1C4263] via-[#2C6291] to-[#3A79AE] rounded-2xl p-6 sm:p-8 text-white shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-2xl bg-emerald-400/20 border border-emerald-300/40 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-7 w-7 text-emerald-300" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-blue-200">
                Order Confirmed Successfully
              </p>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-0.5">
                Thank you, {order.customer_name}!
              </h1>
              <p className="text-xs sm:text-sm text-blue-100 mt-1">
                Placed on {formatDate(order.created_at)}
              </p>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-3.5 flex items-center justify-between sm:justify-end gap-3">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-blue-200 block font-bold">
                Order Number
              </span>
              <span className="text-base font-mono font-black">{order.order_number}</span>
            </div>
            <button
              type="button"
              onClick={handleCopyOrderNumber}
              className="p-2 rounded-lg bg-white/15 hover:bg-white/25 transition-colors"
              title="Copy Order Number"
            >
              {copiedOrderNum ? <Check className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Customer & Delivery & Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2 shadow-xs">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <User className="h-3.5 w-3.5 text-[#2C6291]" />
            <span>Customer</span>
          </div>
          <p className="text-sm font-extrabold text-slate-900">{order.customer_name}</p>
          <p className="text-xs font-mono text-emerald-700 font-bold flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5" />
            {order.customer_phone}
          </p>
          {order.customer_email && <p className="text-xs text-slate-500">{order.customer_email}</p>}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2 shadow-xs">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <MapPin className="h-3.5 w-3.5 text-[#2C6291]" />
            <span>Delivery Address</span>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed font-medium">{order.delivery_address}</p>
          {order.customer_notes && (
            <p className="text-[11px] text-slate-500 italic">Note: {order.customer_notes}</p>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Order Status</span>
            <button
              type="button"
              onClick={handleRefreshStatus}
              className="text-xs font-bold text-[#2C6291] hover:underline inline-flex items-center gap-1"
            >
              <RefreshCw className="h-3 w-3" /> Refresh
            </button>
          </div>
          <div className="pt-1 flex flex-wrap items-center gap-2">
            <Badge status={order.status} />
            <Badge status={order.payment_status || 'PAYMENT_PENDING'} />
          </div>
          <p className="text-xs text-slate-500 pt-1">
            Total Payable: <strong className="text-slate-900">{formatCurrency(order.total_amount)}</strong>
          </p>
        </div>
      </div>

      {/* Ordered Products */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <Package className="h-4 w-4 text-[#2C6291]" />
          <h2 className="text-sm font-extrabold text-slate-900">Ordered Products</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
              <tr>
                <th className="py-3 px-6">Product</th>
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4 text-right">Unit Price</th>
                <th className="py-3 px-4 text-right">Qty</th>
                <th className="py-3 px-6 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(order.items || []).map((item) => (
                <tr key={item.id}>
                  <td className="py-3.5 px-6 font-bold text-slate-900">{item.product_name}</td>
                  <td className="py-3.5 px-4 font-mono text-slate-500">{item.product_sku}</td>
                  <td className="py-3.5 px-4 text-right">
                    {item.discount_percent && item.discount_percent > 0 && item.original_price ? (
                      <div>
                        <span className="line-through text-slate-400 text-[10px] mr-1">
                          {formatCurrency(item.original_price)}
                        </span>
                        <span className="font-bold text-emerald-700">{formatCurrency(item.unit_price)}</span>
                      </div>
                    ) : (
                      <span>{formatCurrency(item.unit_price)}</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold">{item.quantity}</td>
                  <td className="py-3.5 px-6 text-right font-extrabold text-slate-900">
                    {formatCurrency(item.subtotal)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 border-t border-slate-200">
              <tr>
                <td colSpan={4} className="py-3.5 px-6 text-right font-bold text-slate-700 uppercase">
                  Final Order Total:
                </td>
                <td className="py-3.5 px-6 text-right text-lg font-black text-[#2C6291]">
                  {formatCurrency(order.total_amount)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Payment Instructions & WhatsApp Action */}
      <div className="bg-[#EBF2F7] rounded-2xl border border-[#2C6291]/20 p-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <CreditCard className="h-5 w-5 text-[#2C6291]" />
          <h2 className="text-base font-extrabold text-slate-900">Payment Instructions</h2>
        </div>
        <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
          Complete payment via <strong>Online Banking / Direct Bank Deposit</strong> and send your payment receipt or slip along with Order Number <strong className="font-mono">{order.order_number}</strong> via WhatsApp to our sales team for dispatch verification.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          {waUrl && (
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#1EBE5D] text-white text-xs sm:text-sm font-extrabold shadow-sm transition-colors"
            >
              <MessageSquare className="h-4 w-4" />
              <span>Send Order & Receipt on WhatsApp</span>
            </a>
          )}

          <Link
            to="/shop"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs sm:text-sm font-bold transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Continue Shopping</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
