import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { adminApi } from '../../services/endpoints';
import { Supplier } from '../../types';

interface SupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  supplierToEdit?: Supplier | null;
}

export const SupplierModal: React.FC<SupplierModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  supplierToEdit,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    is_active: true,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (supplierToEdit) {
      setFormData({
        name: supplierToEdit.name,
        contact_person: supplierToEdit.contact_person || '',
        email: supplierToEdit.email || '',
        phone: supplierToEdit.phone,
        address: supplierToEdit.address || '',
        is_active: supplierToEdit.is_active,
      });
    } else {
      setFormData({
        name: '',
        contact_person: '',
        email: '',
        phone: '',
        address: '',
        is_active: true,
      });
    }
    setError(null);
  }, [supplierToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (supplierToEdit) {
        await adminApi.updateSupplier(supplierToEdit.id, formData);
      } else {
        await adminApi.createSupplier(formData);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to save supplier');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={supplierToEdit ? 'Edit Supplier Directory Record' : 'Register New Import Supplier'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
            {error}
          </div>
        )}

        <Input
          label="Supplier / Business Name *"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g. Apex Global Trading Ltd"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Contact Person"
            value={formData.contact_person}
            onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
            placeholder="Johnathan Davis"
          />

          <Input
            label="Phone Number *"
            required
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="+1 234 567 890"
          />
        </div>

        <Input
          label="Email Address"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="export@supplier.com"
        />

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
            Physical / Port Address
          </label>
          <textarea
            rows={2}
            className="w-full rounded-lg border border-gray-300 p-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder="Warehouse terminal, port district, country..."
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="supActive"
            checked={formData.is_active}
            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="supActive" className="text-xs font-medium text-gray-700">
            Active supplier eligible for purchase orders
          </label>
        </div>

        <div className="pt-3 border-t border-gray-100 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            {supplierToEdit ? 'Save Changes' : 'Register Supplier'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
