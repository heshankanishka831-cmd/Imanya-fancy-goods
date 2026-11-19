import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useCart } from './CartContext';
import { useAuth } from '../auth/AuthContext';
import { publicApi } from '../../services/endpoints';
import { formatCurrency } from '../../utils/formatters';
import { CheckCircle2, MessageSquare, CreditCard } from 'lucide-react';
import { Order } from '../../types';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({ isOpen, onClose }) => {
  const { cart, fetchCart } = useCart();
  const { user, customerProfile } = useAuth();

  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    delivery_address: '',
    customer_notes: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (isOpen && user) {
      setFormData((prev) => ({
        ...prev,
        customer_name: prev.customer_name || `${user.first_name} ${user.last_name}`,
        customer_email: prev.customer_email || user.email,
        customer_phone: prev.customer_phone || customerProfile?.phone || '',
        delivery_address: prev.delivery_address || customerProfile?.address || '',
      }));
    }
  }, [isOpen, user, customerProfile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await publicApi.checkout(formData);
      if (res.success && res.data) {
        setConfirmedOrder(res.data);
        await fetchCart();
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Checkout failed. Please verify items and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setConfirmedOrder(null);
    setFormData({
      customer_name: '',
      customer_phone: '',
      customer_email: '',
      delivery_address: '',
      customer_notes: '',
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleResetAndClose}
      title={confirmedOrder ? 'Wholesale Order Confirmed' : 'Confirm Wholesale Purchase'}
      maxWidth="lg"
    >
      {confirmedOrder ? (
        <div className="text-center py-4">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h4 className="text-xl font-bold text-gray-900 mb-1">
            Order #{confirmedOrder.order_number} Created!
          </h4>
          <p className="text-sm text-gray-600 mb-6">
            Your order has been recorded in our system. Please send the summary to <strong>Imanya Fancy Goods</strong> on WhatsApp and attach your bank deposit receipt/slip.
          </p>

          <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left border border-gray-100">
            <div className="flex justify-between text-sm py-1">
              <span className="text-gray-500">Customer:</span>
              <span className="font-semibold text-gray-800">{confirmedOrder.customer_name}</span>
            </div>
            <div className="flex justify-between text-sm py-1">
              <span className="text-gray-500">Phone:</span>
              <span className="font-semibold text-gray-800">{confirmedOrder.customer_phone}</span>
            </div>
            <div className="flex justify-between text-sm py-1">
              <span className="text-gray-500">Payment Channel:</span>
              <span className="font-semibold text-blue-600">Online Banking / Bank Transfer</span>
            </div>
            <div className="flex justify-between text-sm py-1 border-t border-gray-200 mt-2 pt-2">
              <span className="text-gray-900 font-bold">Total Order Value:</span>
              <span className="text-blue-600 font-bold">{formatCurrency(confirmedOrder.total_amount)}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {confirmedOrder.whatsapp_url && (
              <a
                href={confirmedOrder.whatsapp_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm transition-colors"
              >
                <MessageSquare className="h-5 w-5" />
                <span>Send to WhatsApp & Attach Slip</span>
              </a>
            )}
            <Button variant="outline" onClick={handleResetAndClose} className="flex-1">
              Close
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg font-medium">
              {error}
            </div>
          )}

          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-4 flex justify-between items-center">
            <div>
              <p className="text-xs text-blue-800 font-medium">Wholesale Cart Total ({cart?.total_items || 0} bulk items):</p>
              <p className="text-xl font-bold text-blue-900">{formatCurrency(cart?.total_amount || 0)}</p>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-white px-2 py-0.5 rounded-md border border-blue-200">
                <CreditCard className="h-3 w-3" /> Online Banking / Slip
              </span>
            </div>
          </div>

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

          <Input
            label="Email Address (Optional)"
            type="email"
            placeholder="orders@fancygoods.com"
            value={formData.customer_email}
            onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
          />

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
              Delivery Destination / Shop Address *
            </label>
            <textarea
              required
              rows={2}
              className="w-full rounded-lg border border-gray-300 p-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Shop name, street address, town..."
              value={formData.delivery_address}
              onChange={(e) => setFormData({ ...formData, delivery_address: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
              Order Notes / Special Requests (Optional)
            </label>
            <textarea
              rows={2}
              className="w-full rounded-lg border border-gray-300 p-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Please pack color assortments evenly..."
              value={formData.customer_notes}
              onChange={(e) => setFormData({ ...formData, customer_notes: e.target.value })}
            />
          </div>

          <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-3 text-xs text-amber-800">
            💡 <strong>Payment Note:</strong> After clicking <em>Complete Purchase</em>, an order summary will be sent directly to our business WhatsApp. Please transfer the total amount via Online Banking and share the bank deposit slip on WhatsApp for dispatch confirmation.
          </div>

          <div className="pt-2 flex justify-end gap-3 border-t border-gray-100">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Complete Wholesale Order
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
