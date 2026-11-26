import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ShoppingBag,
  ArrowLeft,
  CheckCircle2,
  MapPin,
  User,
  Phone,
  Mail,
  Truck,
  ShieldCheck,
  AlertCircle,
  Lock,
  MessageSquare,
} from 'lucide-react';
import { useCart } from './CartContext';
import { useAuth } from '../auth/AuthContext';
import { guestApi, publicApi } from '../../services/endpoints';
import { formatCurrency } from '../../utils/formatters';
import { Button } from '../../components/ui/Button';
import { buildWhatsAppOrderUrl } from '../../utils/whatsapp';

const SRI_LANKA_PROVINCES = [
  'Western Province',
  'Central Province',
  'Southern Province',
  'North Western Province',
  'Sabaragamuwa Province',
  'North Central Province',
  'Uva Province',
  'Eastern Province',
  'Northern Province',
];

function createIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `idem_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}

export const GuestCheckoutPage: React.FC = () => {
  const { cart, fetchCart, setIsCartOpen } = useCart();
  const { isAuthenticated, user, customerProfile } = useAuth();
  const navigate = useNavigate();

  const isRegisteredCustomer = isAuthenticated && user?.role_name === 'Customer';

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    whatsapp_number: '',
    email: '',
    delivery_address: '',
    city: '',
    province: 'Western Province',
    postal_code: '',
    delivery_instructions: '',
  });

  const [idempotencyKey] = useState<string>(() => createIdempotencyKey());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-fill only if authenticated customer is visiting /checkout
  useEffect(() => {
    if (isRegisteredCustomer && (user || customerProfile)) {
      setForm((prev) => ({
        ...prev,
        first_name: prev.first_name || customerProfile?.first_name || user?.first_name || '',
        last_name: prev.last_name || customerProfile?.last_name || user?.last_name || '',
        whatsapp_number: prev.whatsapp_number || customerProfile?.phone || '',
        email: prev.email || customerProfile?.email || user?.email || '',
        delivery_address:
          prev.delivery_address ||
          customerProfile?.delivery_address ||
          customerProfile?.residential_address ||
          '',
        city: prev.city || customerProfile?.del_city || customerProfile?.res_city || '',
        postal_code: prev.postal_code || customerProfile?.del_postal_code || customerProfile?.res_postal_code || '',
      }));
    }
  }, [isRegisteredCustomer, user, customerProfile]);

  const cartItems = cart?.items || [];
  const totalAmount = cart?.total_amount || 0;
  const totalSavings = cart?.total_savings || 0;
  const originalTotal = cart?.original_total || totalAmount + totalSavings;
  const freeShippingThreshold = 25000;
  const qualifiesForFreeShipping = totalAmount >= freeShippingThreshold;

  const hasMinQtyViolation = useMemo(
    () => cartItems.some((it) => it.quantity < (it.min_order_quantity || 1)),
    [cartItems]
  );

  const handleReturnToCart = () => {
    setIsCartOpen(true);
    navigate('/shop');
  };

  const validate = (): boolean => {
    if (!form.first_name.trim() || !form.last_name.trim()) {
      setError('First Name and Last Name are required.');
      return false;
    }
    const digits = form.whatsapp_number.replace(/[^0-9]/g, '');
    if (digits.length < 9 || digits.length > 15) {
      setError('Please enter a valid WhatsApp Number (9 to 15 digits).');
      return false;
    }
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setError('Please enter a valid email address or leave it blank.');
      return false;
    }
    if (!form.delivery_address.trim() || form.delivery_address.trim().length < 5) {
      setError('Please enter your complete delivery street address.');
      return false;
    }
    if (!form.city.trim()) {
      setError('City / Town is required.');
      return false;
    }
    if (!form.province.trim()) {
      setError('Province is required.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError(null);

    if (cartItems.length === 0) {
      setError('Your cart is empty. Please add products before confirming an order.');
      return;
    }
    if (hasMinQtyViolation) {
      setError('One or more items do not meet the minimum order quantity. Please return to your cart to update quantities.');
      return;
    }
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      let orderData;
      if (isRegisteredCustomer) {
        const fullAddr = [form.delivery_address.trim(), form.city.trim(), form.province.trim(), form.postal_code.trim()]
          .filter(Boolean)
          .join(', ');
        const res = await publicApi.checkout({
          customer_name: `${form.first_name.trim()} ${form.last_name.trim()}`,
          customer_phone: form.whatsapp_number.trim(),
          customer_email: form.email.trim() || undefined,
          delivery_address: fullAddr,
          customer_notes: form.delivery_instructions.trim() || undefined,
        });
        if (!res.success || !res.data) {
          throw new Error(res.error?.message || 'Unable to confirm order.');
        }
        orderData = res.data;
      } else {
        const res = await guestApi.createOrder({
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          whatsapp_number: form.whatsapp_number.trim(),
          email: form.email.trim() || undefined,
          delivery_address: form.delivery_address.trim(),
          city: form.city.trim(),
          province: form.province.trim(),
          postal_code: form.postal_code.trim() || undefined,
          delivery_instructions: form.delivery_instructions.trim() || undefined,
          idempotency_key: idempotencyKey,
        });
        if (!res.success || !res.data) {
          throw new Error(res.error?.message || 'Unable to confirm guest order.');
        }
        orderData = res.data;
      }

      if (!orderData.whatsapp_url) {
        orderData.whatsapp_url = buildWhatsAppOrderUrl(orderData);
      }

      // Persist token & latest order in sessionStorage for seamless page refresh
      if (orderData.guest_access_token) {
        sessionStorage.setItem(`guest_order_token_${orderData.order_number}`, orderData.guest_access_token);
      }
      sessionStorage.setItem(`guest_order_data_${orderData.order_number}`, JSON.stringify(orderData));

      await fetchCart();

      const tokenQuery = orderData.guest_access_token
        ? `?token=${encodeURIComponent(orderData.guest_access_token)}`
        : '';
      navigate(`/order-confirmation/${encodeURIComponent(orderData.order_number)}${tokenQuery}`, {
        state: { order: orderData },
      });
    } catch (err: any) {
      const msg =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        err?.message ||
        'Order confirmation failed. Please verify your details and try again.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="h-16 w-16 rounded-2xl bg-[#EBF2F7] text-[#2C6291] flex items-center justify-center mx-auto">
          <ShoppingBag className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-black text-slate-900">Your Cart is Empty</h1>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          Add products from our catalog to proceed with guest checkout — no account or login required.
        </p>
        <div className="pt-2">
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2C6291] hover:bg-[#1C4263] text-white text-sm font-bold shadow-sm transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Browse Products</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={handleReturnToCart}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2C6291] hover:text-[#1C4263] mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Return to Cart</span>
          </button>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {isRegisteredCustomer ? 'Express Checkout' : 'Guest Checkout'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {isRegisteredCustomer
              ? 'Confirm your delivery details and submit your order.'
              : 'No account needed — enter your delivery details below to confirm your order.'}
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3.5 py-2 rounded-xl self-start">
          <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>Server-Verified Pricing & Stock</span>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm font-semibold flex items-start gap-2.5">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {hasMinQtyViolation && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs sm:text-sm font-semibold flex items-center justify-between gap-4">
          <span>Some cart items do not meet their wholesale minimum order quantity.</span>
          <Button type="button" size="sm" variant="outline" onClick={handleReturnToCart}>
            Update Cart
          </Button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Customer & Delivery Form */}
        <div className="lg:col-span-7 space-y-6">
          {/* Customer Information */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="h-8 w-8 rounded-lg bg-[#EBF2F7] text-[#2C6291] flex items-center justify-center">
                <User className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-900">Customer Information</h2>
                <p className="text-xs text-slate-500">We use your WhatsApp number for order confirmation and delivery updates.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  First Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.first_name}
                  onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                  placeholder="e.g. Kasun"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#2C6291]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Last Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.last_name}
                  onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                  placeholder="e.g. Perera"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#2C6291]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  WhatsApp Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="tel"
                    required
                    value={form.whatsapp_number}
                    onChange={(e) => setForm({ ...form, whatsapp_number: e.target.value })}
                    placeholder="e.g. 0771234567"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#2C6291]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Email Address <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#2C6291]"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Delivery Information */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="h-8 w-8 rounded-lg bg-[#EBF2F7] text-[#2C6291] flex items-center justify-center">
                <MapPin className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-900">Delivery Information</h2>
                <p className="text-xs text-slate-500">Where should we dispatch your order?</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Complete Delivery Address <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={form.delivery_address}
                  onChange={(e) => setForm({ ...form, delivery_address: e.target.value })}
                  placeholder="House / Building No, Street Name, Area..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#2C6291]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    City / Town <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    placeholder="e.g. Colombo"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#2C6291]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Province <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={form.province}
                    onChange={(e) => setForm({ ...form, province: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2C6291]"
                  >
                    {SRI_LANKA_PROVINCES.map((prov) => (
                      <option key={prov} value={prov}>
                        {prov}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Postal Code <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={form.postal_code}
                    onChange={(e) => setForm({ ...form, postal_code: e.target.value })}
                    placeholder="e.g. 00100"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#2C6291]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Delivery Instructions <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={form.delivery_instructions}
                  onChange={(e) => setForm({ ...form, delivery_instructions: e.target.value })}
                  placeholder="Landmarks, preferred delivery time, or special notes..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#2C6291]"
                />
              </div>
            </div>
          </section>
        </div>

        {/* Right: Order Summary */}
        <aside className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5 lg:sticky lg:top-24">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-base font-extrabold text-slate-900">
              Order Summary ({cart?.total_items || cartItems.length} items)
            </h2>
            <button
              type="button"
              onClick={handleReturnToCart}
              className="text-xs font-bold text-[#2C6291] hover:underline"
            >
              Edit Cart
            </button>
          </div>

          <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto pr-1">
            {cartItems.map((item) => (
              <div key={item.id} className="py-3 flex gap-3 items-start">
                <div className="h-14 w-14 rounded-xl bg-slate-50 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                  {item.product_image ? (
                    <img
                      src={item.product_image}
                      alt={item.product_name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <ShoppingBag className="h-5 w-5 text-slate-300" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">{item.product_name}</p>
                  <p className="text-[11px] font-mono text-slate-400">Code: {item.product_sku}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs">
                    <span className="text-slate-500">Qty: {item.quantity}</span>
                    <span className="text-slate-300">•</span>
                    {item.is_discount_active || (item.original_price && item.original_price > item.unit_price) ? (
                      <span className="font-bold text-emerald-700">
                        {formatCurrency(item.unit_price)}
                        {item.discount_percent ? ` (${item.discount_percent}% OFF)` : ''}
                      </span>
                    ) : (
                      <span className="font-semibold text-slate-700">
                        {formatCurrency(item.unit_price)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-extrabold text-slate-900">{formatCurrency(item.subtotal)}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2 pt-3 border-t border-slate-100 text-xs">
            {totalSavings > 0 && (
              <>
                <div className="flex justify-between text-slate-500">
                  <span>Original Subtotal</span>
                  <span className="line-through">{formatCurrency(originalTotal)}</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200">
                  <span>Product Discounts</span>
                  <span>-{formatCurrency(totalSavings)}</span>
                </div>
              </>
            )}

            <div className="flex justify-between text-slate-600">
              <span className="flex items-center gap-1.5">
                <Truck className="h-3.5 w-3.5 text-[#2C6291]" />
                Delivery Fee
              </span>
              <span className={`font-bold ${qualifiesForFreeShipping ? 'text-[#6F9128]' : 'text-slate-700'}`}>
                {qualifiesForFreeShipping ? 'FREE Shipping' : 'Calculated at Dispatch'}
              </span>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-200 text-slate-900">
              <span className="text-sm font-black">Final Order Total</span>
              <span className="text-xl font-black text-[#2C6291]">{formatCurrency(totalAmount)}</span>
            </div>
          </div>

          <Button
            type="submit"
            size="lg"
            isLoading={isSubmitting}
            disabled={hasMinQtyViolation || isSubmitting}
            className="w-full bg-[#2C6291] hover:bg-[#1C4263] text-white font-extrabold shadow-md"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            <span>Confirm Order</span>
          </Button>

          <div className="flex items-center justify-center gap-4 text-[11px] text-slate-400 pt-1">
            <span className="flex items-center gap-1">
              <Lock className="h-3 w-3" /> Secure Order
            </span>
            <span className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3 text-[#25D366]" /> WhatsApp Updates
            </span>
          </div>
        </aside>
      </form>
    </div>
  );
};
