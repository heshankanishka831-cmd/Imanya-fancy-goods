import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useCart } from './CartContext';
import { useAuth } from '../auth/AuthContext';
import { publicApi } from '../../services/endpoints';
import { formatCurrency } from '../../utils/formatters';
import {
  CheckCircle2,
  MessageSquare,
  CreditCard,
  Copy,
  Check,
  Building,
  MapPin,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  UserCheck,
  ShoppingBag,
  Send,
} from 'lucide-react';
import { Order } from '../../types';
import { buildWhatsAppOrderUrl } from '../../utils/whatsapp';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SRI_LANKA_DISTRICTS = [
  'Colombo',
  'Gampaha',
  'Kalutara',
  'Kandy',
  'Matale',
  'Nuwara Eliya',
  'Galle',
  'Matara',
  'Hambantota',
  'Jaffna',
  'Kilinochchi',
  'Mannar',
  'Vavuniya',
  'Mullaitivu',
  'Batticaloa',
  'Ampara',
  'Trincomalee',
  'Kurunegala',
  'Puttalam',
  'Anuradhapura',
  'Polonnaruwa',
  'Badulla',
  'Monaragala',
  'Ratnapura',
  'Kegalle',
];

export const CheckoutModal: React.FC<CheckoutModalProps> = ({ isOpen, onClose }) => {
  const { cart, fetchCart } = useCart();
  const { isAuthenticated, user, customerProfile } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    delivery_address: '',
    customer_notes: '',
  });

  const [district, setDistrict] = useState('Colombo');
  const [showBankDetails, setShowBankDetails] = useState(false);
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null);
  const [copiedOrderNumber, setCopiedOrderNumber] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);
  const [popupBlocked, setPopupBlocked] = useState(false);

  // Auto-populate customer information if logged in
  useEffect(() => {
    if (isOpen) {
      if (user || customerProfile) {
        const fullName = user
          ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
          : '';

        setFormData((prev) => ({
          ...prev,
          customer_name: prev.customer_name || fullName,
          customer_email: prev.customer_email || user?.email || '',
          customer_phone: prev.customer_phone || customerProfile?.phone || '',
          delivery_address:
            prev.delivery_address ||
            customerProfile?.delivery_address ||
            customerProfile?.address ||
            customerProfile?.residential_address ||
            '',
        }));
      }
      setPopupBlocked(false);
      setError(null);
    }
  }, [isOpen, user, customerProfile]);

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    if (type === 'order') {
      setCopiedOrderNumber(true);
      setTimeout(() => setCopiedOrderNumber(false), 2000);
    } else {
      setCopiedAccount(type);
      setTimeout(() => setCopiedAccount(null), 2000);
    }
  };

  const validateForm = (): boolean => {
    if (!formData.customer_name.trim()) {
      setError('Please provide your Contact / Customer Name.');
      return false;
    }
    if (!formData.customer_phone.trim()) {
      setError('Please provide your WhatsApp / Contact Phone Number.');
      return false;
    }
    const cleanPhone = formData.customer_phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 9) {
      setError('Please enter a valid phone number (minimum 9 digits).');
      return false;
    }
    if (!formData.delivery_address.trim()) {
      setError('Please provide the Delivery Destination / Street Address.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError(null);

    if (!cart || cart.items.length === 0) {
      setError('Your shopping cart is empty. Please add products before checking out.');
      return;
    }

    // Validate minimum purchase quantities
    for (const item of cart.items) {
      const minQty = item.min_order_quantity || 1;
      if (item.quantity < minQty) {
        setError(`Product "${item.product_name}" requires a minimum order quantity of ${minQty} units (cart contains ${item.quantity}). Please adjust your cart before submitting.`);
        return;
      }
    }

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    // Pre-create tab in direct user gesture to prevent popup blocking in modern browsers
    let waPopup: Window | null = null;
    try {
      waPopup = window.open('about:blank', '_blank');
    } catch (popupErr) {
      waPopup = null;
    }

    try {
      const fullAddress = formData.delivery_address.toLowerCase().includes(district.toLowerCase())
        ? formData.delivery_address.trim()
        : `${formData.delivery_address.trim()}, ${district} District`;

      const res = await publicApi.checkout({
        ...formData,
        delivery_address: fullAddress,
      });

      if (res.success && res.data) {
        const orderData = res.data;
        // Authoritatively generate WhatsApp checkout URL using saved order details from database
        const waLink = buildWhatsAppOrderUrl(orderData);
        orderData.whatsapp_url = waLink;

        setConfirmedOrder(orderData);
        await fetchCart();

        // Launch WhatsApp in pre-created tab or fallback
        if (waPopup && !waPopup.closed) {
          try {
            waPopup.location.replace(waLink);
          } catch {
            waPopup.location.href = waLink;
          }
        } else {
          // Direct launch fallback
          try {
            const fallbackWin = window.open(waLink, '_blank');
            if (!fallbackWin || fallbackWin.closed) {
              setPopupBlocked(true);
            }
          } catch (fbErr) {
            setPopupBlocked(true);
          }
        }
      } else {
        if (waPopup && !waPopup.closed) {
          waPopup.close();
        }
        setError(res.error?.message || 'Checkout failed. Please try again.');
      }
    } catch (err: any) {
      if (waPopup && !waPopup.closed) {
        waPopup.close();
      }
      const apiErrMsg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Checkout failed. Please verify items and connectivity, then try again.';
      setError(apiErrMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setConfirmedOrder(null);
    setPopupBlocked(false);
    setError(null);
    setFormData({
      customer_name: '',
      customer_phone: '',
      customer_email: '',
      delivery_address: '',
      customer_notes: '',
    });
    setDistrict('Colombo');
    setShowBankDetails(false);
    onClose();
  };

  const handleGoToOrders = () => {
    handleResetAndClose();
    navigate('/orders');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleResetAndClose}
      title={confirmedOrder ? 'Order Confirmed' : 'Confirm Order via WhatsApp'}
      maxWidth="lg"
    >
      {confirmedOrder ? (
        <div className="py-2 space-y-6">
          {/* Success Banner */}
          <div className="text-center">
            <div className="w-16 h-16 bg-[#F4F9EC] text-[#6F9128] border border-[#9AC640]/40 rounded-full flex items-center justify-center mx-auto mb-3 shadow-xs">
              <CheckCircle2 className="h-8 w-8 text-[#9AC640]" />
            </div>
            <h4 className="text-xl font-black text-slate-900">
              Order #{confirmedOrder.order_number} Received!
            </h4>
            <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto leading-relaxed">
              Your order is recorded with status <strong className="text-amber-600 font-bold">PENDING</strong>.
              Review your order details below and confirm via WhatsApp to receive payment instructions.
            </p>
          </div>

          {/* WhatsApp Direct Action Banner */}
          {confirmedOrder.whatsapp_url ? (
            <div className="bg-[#25D366]/10 border border-[#25D366]/30 rounded-2xl p-4 text-center space-y-2">
              <div className="flex items-center justify-center gap-2 text-[#075E54] font-black text-sm">
                <MessageSquare className="h-4 w-4 text-[#25D366]" />
                <span>WhatsApp Order Chat</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed max-w-md mx-auto">
                {popupBlocked
                  ? 'Your browser blocked opening WhatsApp automatically. Click the button below to open the chat with your pre-filled order.'
                  : 'A WhatsApp tab has been prepared with your order details addressed to our Store Owner. Review the message and tap Send.'}
              </p>
              <div className="pt-1">
                <a
                  href={confirmedOrder.whatsapp_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#25D366] hover:bg-[#1EBE5D] text-white font-extrabold text-xs sm:text-sm shadow-md shadow-[#25D366]/25 transition-all hover:scale-[1.02] active:scale-95"
                >
                  <Send className="h-4 w-4" />
                  <span>Open WhatsApp Chat Now</span>
                  <ExternalLink className="h-3.5 w-3.5 opacity-80" />
                </a>
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-800 space-y-1">
              <div className="flex items-center gap-2 font-bold text-amber-900">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <span>Store Owner WhatsApp Number Not Configured</span>
              </div>
              <p>
                Our server recorded your order, but the Store Owner WhatsApp contact number has not yet been set in system settings. Please contact our support team directly quoting Order Reference <strong>{confirmedOrder.order_number}</strong>.
              </p>
            </div>
          )}

          {/* Order Details Snapshot */}
          <div className="bg-[#EBF2F7] rounded-2xl p-4 border border-[#2C6291]/20 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 font-semibold">Order Reference:</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-black text-slate-900 text-sm">
                  {confirmedOrder.order_number}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(confirmedOrder.order_number, 'order')}
                  className="p-1 rounded-md text-slate-500 hover:text-[#2C6291] hover:bg-white transition-colors"
                  title="Copy Order Number"
                >
                  {copiedOrderNumber ? (
                    <Check className="h-3.5 w-3.5 text-[#9AC640]" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 font-semibold">Total Order Payable:</span>
              <span className="font-black text-base text-[#2C6291]">
                {formatCurrency(confirmedOrder.total_amount)}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs pt-2 border-t border-[#2C6291]/15">
              <span className="text-slate-600 font-semibold">Recipient:</span>
              <span className="font-bold text-slate-900">
                {confirmedOrder.customer_name} ({confirmedOrder.customer_phone})
              </span>
            </div>

            <div className="flex items-start justify-between text-xs pt-1">
              <span className="text-slate-600 font-semibold shrink-0">Delivery Address:</span>
              <span className="font-medium text-slate-800 text-right max-w-xs">
                {confirmedOrder.delivery_address}
              </span>
            </div>

            {confirmedOrder.items && confirmedOrder.items.length > 0 && (
              <div className="pt-2 border-t border-[#2C6291]/15 space-y-1.5">
                <span className="text-[11px] font-bold text-slate-700 block uppercase tracking-wider">Items Ordered:</span>
                <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                  {confirmedOrder.items.map((it, idx) => (
                    <div key={it.id || idx} className="p-2 rounded-xl bg-white/80 border border-slate-200/80 text-xs space-y-1">
                      <div className="flex justify-between font-bold text-slate-900">
                        <span className="truncate pr-2">
                          {idx + 1}. {it.product_name}
                        </span>
                        <span className="font-mono font-black text-[#2C6291] shrink-0">
                          {formatCurrency(it.subtotal)}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-slate-500 font-medium">
                        <span>Item Code: <strong className="font-mono text-slate-700">{it.product_sku || 'N/A'}</strong></span>
                        <span>Quantity: <strong className="text-slate-800">{it.quantity}</strong></span>
                        {it.original_price && it.original_price > it.unit_price ? (
                          <span className="text-emerald-700 font-bold">
                            Unit Price: {formatCurrency(it.unit_price)}{' '}
                            <span className="line-through text-slate-400 font-normal">
                              ({formatCurrency(it.original_price)})
                            </span>{' '}
                            ({it.discount_percent}% OFF)
                          </span>
                        ) : (
                          <span>Unit Price: {formatCurrency(it.unit_price)}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Bank Accounts for Transfer */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-[#2C6291]" />
                <span className="text-xs font-black text-slate-900 uppercase tracking-wide">
                  Bank Transfer / CDM Accounts
                </span>
              </div>
              <span className="text-[10px] font-bold text-[#6F9128] bg-[#F4F9EC] px-2 py-0.5 rounded-full border border-[#9AC640]/40">
                LKR Current Accounts
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Commercial Bank */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                <div>
                  <span className="font-bold text-[#2C6291] block">Commercial Bank</span>
                  <span className="text-[11px] text-slate-500 block">Pettah City Branch</span>
                  <span className="font-mono font-bold text-slate-900 mt-1 block">1000 8923 4512</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy('100089234512', 'comb')}
                  className="mt-2 w-full py-1.5 px-2 bg-white hover:bg-[#EBF2F7] rounded-lg border border-slate-200 text-[11px] font-bold text-slate-700 hover:text-[#2C6291] flex items-center justify-center gap-1.5 transition-colors"
                >
                  {copiedAccount === 'comb' ? (
                    <>
                      <Check className="h-3 w-3 text-[#9AC640]" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      <span>Copy Account</span>
                    </>
                  )}
                </button>
              </div>

              {/* HNB */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                <div>
                  <span className="font-bold text-[#4C9091] block">Hatton National Bank</span>
                  <span className="text-[11px] text-slate-500 block">Sea Street Branch</span>
                  <span className="font-mono font-bold text-slate-900 mt-1 block">0340 1023 9981</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy('034010239981', 'hnb')}
                  className="mt-2 w-full py-1.5 px-2 bg-white hover:bg-[#EEF6F6] rounded-lg border border-slate-200 text-[11px] font-bold text-slate-700 hover:text-[#4C9091] flex items-center justify-center gap-1.5 transition-colors"
                >
                  {copiedAccount === 'hnb' ? (
                    <>
                      <Check className="h-3 w-3 text-[#9AC640]" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      <span>Copy Account</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={handleGoToOrders}
              className="flex-1 px-4 py-3 rounded-xl bg-[#2C6291] hover:bg-[#235077] text-white font-bold text-xs transition-colors shadow-xs"
            >
              View Order History
            </button>
            <button
              type="button"
              onClick={handleResetAndClose}
              className="px-4 py-3 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs border border-slate-200 transition-colors"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Cart Value Banner */}
          <div className="bg-[#EBF2F7] border border-[#2C6291]/20 rounded-2xl p-4 flex justify-between items-center shadow-xs">
            <div>
              <p className="text-xs text-[#1C4263] font-semibold">
                Total Order Amount ({cart?.total_items || 0} items):
              </p>
              <div className="flex items-baseline gap-2">
                <p className="text-xl font-black text-[#2C6291]">
                  {formatCurrency(cart?.total_amount || 0)}
                </p>
                {cart?.total_savings && cart.total_savings > 0 ? (
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Save {formatCurrency(cart.total_savings)}
                  </span>
                ) : null}
              </div>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#2C6291] bg-white px-2.5 py-1 rounded-lg border border-[#2C6291]/20 shadow-2xs">
                <CreditCard className="h-3.5 w-3.5" /> Online Banking / Slip
              </span>
            </div>
          </div>

          {/* Authenticated Customer Recognition Badge */}
          {isAuthenticated && (user || customerProfile) && (
            <div className="bg-[#F4F9EC] border border-[#9AC640]/40 rounded-xl px-3.5 py-2.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-[#6F9128] shrink-0" />
                <span className="text-slate-800 font-semibold">
                  Logged in as{' '}
                  <strong className="text-slate-900">
                    {user ? `${user.first_name} ${user.last_name}`.trim() : 'Customer'}
                  </strong>
                  {customerProfile?.membership_tier && (
                    <span className="ml-2 font-mono text-[10px] font-black uppercase text-[#6F9128] bg-white px-1.5 py-0.5 rounded-sm border border-[#9AC640]/30">
                      {customerProfile.membership_tier} MEMBER
                    </span>
                  )}
                </span>
              </div>
              <span className="text-[10px] font-bold text-slate-500 hidden sm:inline">
                Profile Auto-filled
              </span>
            </div>
          )}

          {/* Customer Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Contact / Customer Name *"
              required
              placeholder="e.g. Sunil Perera"
              value={formData.customer_name}
              onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
            />
            <Input
              label="Phone Number (WhatsApp) *"
              required
              placeholder="e.g. 0771234567"
              value={formData.customer_phone}
              onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Email Address (Optional)"
              type="email"
              placeholder="orders@fancygoods.com"
              value={formData.customer_email}
              onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
            />

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Delivery District *
              </label>
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2 text-xs font-semibold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#2C6291]"
              >
                {SRI_LANKA_DISTRICTS.map((d) => (
                  <option key={d} value={d}>
                    {d} District
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Delivery Destination / Street Address *
            </label>
            <textarea
              required
              rows={2}
              className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2C6291]"
              placeholder="Shop or house name, street address, town..."
              value={formData.delivery_address}
              onChange={(e) => setFormData({ ...formData, delivery_address: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Order Notes / Packing Instructions (Optional)
            </label>
            <textarea
              rows={2}
              className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2C6291]"
              placeholder="e.g. Call before delivery, double packing requested..."
              value={formData.customer_notes}
              onChange={(e) => setFormData({ ...formData, customer_notes: e.target.value })}
            />
          </div>

          {/* Expandable Bank Details Preview */}
          <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
            <button
              type="button"
              onClick={() => setShowBankDetails(!showBankDetails)}
              className="w-full px-4 py-2.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-xs font-bold text-slate-700 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-[#2C6291]" />
                <span>View Bank Accounts for Payment Before Confirming</span>
              </div>
              {showBankDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {showBankDetails && (
              <div className="p-3 text-xs space-y-2 border-t border-slate-200 bg-white">
                <div className="p-2.5 rounded-lg bg-[#EBF2F7] border border-[#2C6291]/20 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-[#1C4263] block">Commercial Bank of Ceylon</span>
                    <span className="font-mono text-slate-900 font-bold">1000 8923 4512</span>
                    <span className="text-[10px] text-slate-500 block">Pettah City Branch</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy('100089234512', 'comb_preview')}
                    className="px-2.5 py-1 bg-white hover:bg-slate-100 rounded-md border text-[11px] font-bold text-[#2C6291]"
                  >
                    {copiedAccount === 'comb_preview' ? 'Copied!' : 'Copy'}
                  </button>
                </div>

                <div className="p-2.5 rounded-lg bg-[#EEF6F6] border border-[#4C9091]/20 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-[#346566] block">Hatton National Bank (HNB)</span>
                    <span className="font-mono text-slate-900 font-bold">0340 1023 9981</span>
                    <span className="text-[10px] text-slate-500 block">Sea Street Branch</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy('034010239981', 'hnb_preview')}
                    className="px-2.5 py-1 bg-white hover:bg-slate-100 rounded-md border text-[11px] font-bold text-[#4C9091]"
                  >
                    {copiedAccount === 'hnb_preview' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="bg-[#25D366]/10 border border-[#25D366]/30 rounded-xl p-3 text-xs text-[#075E54] font-medium leading-relaxed flex items-start gap-2">
            <MessageSquare className="h-4 w-4 text-[#25D366] shrink-0 mt-0.5" />
            <span>
              <strong>WhatsApp Order Confirmation:</strong> Clicking Proceed to WhatsApp will record your order with our store and open WhatsApp with your pre-filled order summary ready to send to our store team.
            </span>
          </div>

          <div className="pt-2 flex justify-end gap-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              isLoading={isSubmitting}
              className="bg-[#25D366] hover:bg-[#1EBE5D] text-white font-extrabold shadow-md shadow-[#25D366]/25 flex items-center gap-2"
            >
              <MessageSquare className="h-4 w-4" />
              <span>{isSubmitting ? 'Recording Order...' : 'Proceed to WhatsApp'}</span>
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
