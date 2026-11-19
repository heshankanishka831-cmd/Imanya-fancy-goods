import React, { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useCart } from './CartContext';
import { publicApi } from '../../services/endpoints';
import { formatCurrency } from '../../utils/formatters';
import { CheckCircle2, MessageSquare } from 'lucide-react';
import { Order } from '../../types';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({ isOpen, onClose }) => {
  const { cart, fetchCart } = useCart();
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
      title={confirmedOrder ? 'Order Placed Successfully' : 'Complete Wholesale Order'}
      maxWidth="lg"
    >
      {confirmedOrder ? (
        <div className="text-center py-4">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h4 className="text-xl font-bold text-gray-900 mb-1">
            Order #{confirmedOrder.order_number} Confirmed!
          </h4>
          <p className="text-sm text-gray-600 mb-6">
            Your order has been safely recorded in our database. Our logistics team will review and contact you shortly.
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
                <span>Confirm on WhatsApp</span>
              </a>
            )}
            <Button variant="outline" onClick={handleResetAndClose} className="flex-1">
              Done
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
              <p className="text-xs text-blue-800 font-medium">Order Total ({cart?.total_items || 0} items):</p>
              <p className="text-xl font-bold text-blue-900">{formatCurrency(cart?.total_amount || 0)}</p>
            </div>
            <span className="text-xs text-blue-600 font-medium">Payment on confirmation</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Contact Name *"
              required
              placeholder="e.g. Johnathan Silva"
              value={formData.customer_name}
              onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
            />
            <Input
              label="Phone Number *"
              required
              placeholder="e.g. +94 77 123 4567"
              value={formData.customer_phone}
              onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
            />
          </div>

          <Input
            label="Email Address (Optional)"
            type="email"
            placeholder="orders@business.com"
            value={formData.customer_email}
            onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
          />

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
              Delivery Destination / Warehouse Address *
            </label>
            <textarea
              required
              rows={2}
              className="w-full rounded-lg border border-gray-300 p-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Street address, city, warehouse bay number..."
              value={formData.delivery_address}
              onChange={(e) => setFormData({ ...formData, delivery_address: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
              Order Notes / Instructions (Optional)
            </label>
            <textarea
              rows={2}
              className="w-full rounded-lg border border-gray-300 p-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Packaging requirements, delivery schedule requests..."
              value={formData.customer_notes}
              onChange={(e) => setFormData({ ...formData, customer_notes: e.target.value })}
            />
          </div>

          <div className="pt-2 flex justify-end gap-3 border-t border-gray-100">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Submit Order
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
