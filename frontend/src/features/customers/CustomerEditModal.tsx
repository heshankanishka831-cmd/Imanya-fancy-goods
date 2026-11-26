import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { adminApi } from '../../services/endpoints';
import { Customer } from '../../types';
import { AlertCircle, CheckCircle2, User, Phone, Mail, MapPin, Building } from 'lucide-react';

interface CustomerEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  onSuccess: (updated: Customer) => void;
}

export const CustomerEditModal: React.FC<CustomerEditModalProps> = ({
  isOpen,
  onClose,
  customer,
  onSuccess,
}) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    businessName: '',
    residentialAddress: '',
    deliveryAddress: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (customer) {
      setFormData({
        firstName: customer.first_name || customer.name.split(' ')[0] || '',
        lastName: customer.last_name || customer.name.split(' ').slice(1).join(' ') || '',
        email: customer.email || '',
        phone: customer.phone || '',
        businessName: customer.business_name || '',
        residentialAddress: customer.residential_address || customer.delivery_address || '',
        deliveryAddress: customer.delivery_address || '',
      });
      setError(null);
      setSuccessMsg(null);
    }
  }, [customer, isOpen]);

  if (!customer) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setError('First name and last name must not be empty.');
      return;
    }

    if (!formData.email.trim()) {
      setError('Email address is required.');
      return;
    }

    if (!formData.phone.trim()) {
      setError('WhatsApp contact phone number is required.');
      return;
    }

    if (!formData.residentialAddress.trim()) {
      setError('Residential address is required.');
      return;
    }

    try {
      setIsLoading(true);
      const res = await adminApi.updateCustomer(customer.id, {
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        business_name: formData.businessName.trim(),
        residential_address: formData.residentialAddress.trim(),
        delivery_address: formData.deliveryAddress.trim() || formData.residentialAddress.trim(),
      });

      if (res.success && res.data) {
        setSuccessMsg('Customer profile updated successfully!');
        onSuccess(res.data);
        setTimeout(() => {
          onClose();
        }, 1200);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to update customer profile.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit Customer: ${customer.name}`} maxWidth="lg">
      <form onSubmit={handleSubmit} className="space-y-4 p-1">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="First Name *"
            required
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            placeholder="Sunil"
          />
          <Input
            label="Last Name *"
            required
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            placeholder="Perera"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Email Address *"
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="sunil@example.com"
          />
          <Input
            label="WhatsApp Number *"
            required
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="077 123 4567"
          />
        </div>

        <Input
          label="Business / Trading Shop Name"
          value={formData.businessName}
          onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
          placeholder="Perera Fancy Goods & Novelties"
        />

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Residential Address *
          </label>
          <textarea
            required
            rows={2}
            value={formData.residentialAddress}
            onChange={(e) => setFormData({ ...formData, residentialAddress: e.target.value })}
            placeholder="No 45, Temple Road, Maharagama"
            className="w-full rounded-xl border border-gray-200 p-2.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Commercial Delivery Address
          </label>
          <textarea
            rows={2}
            value={formData.deliveryAddress}
            onChange={(e) => setFormData({ ...formData, deliveryAddress: e.target.value })}
            placeholder="Main Street, Pettah, Colombo 11 (leave blank to default to residential)"
            className="w-full rounded-xl border border-gray-200 p-2.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
};
