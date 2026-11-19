import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { adminApi } from '../../services/endpoints';
import { Role } from '../../types';
import { ShieldCheck, Info } from 'lucide-react';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  roles: Role[];
}

export const UserModal: React.FC<UserModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  roles,
}) => {
  // Only show staff roles for staff creation (exclude Customer)
  const staffRoles = roles.filter((r) => r.name !== 'Customer');

  const [formData, setFormData] = useState({
    role_id: 1,
    username: '',
    email: '',
    password: '',
    first_name: '',
    last_name: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (staffRoles.length > 0 && (!formData.role_id || formData.role_id === 1)) {
      setFormData((prev) => ({
        ...prev,
        role_id: staffRoles[0].id,
      }));
    }
  }, [roles, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      setIsLoading(false);
      return;
    }

    try {
      await adminApi.createUser({
        ...formData,
        role_id: Number(formData.role_id),
      });
      onSuccess();
      onClose();
      // Reset form
      setFormData({
        role_id: staffRoles[0]?.id || 1,
        username: '',
        email: '',
        password: '',
        first_name: '',
        last_name: '',
      });
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to create staff account');
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleDescription = (roleId: number) => {
    const selected = roles.find((r) => r.id === roleId);
    if (!selected) return null;
    switch (selected.name) {
      case 'Super Administrator':
        return 'Full unrestricted access across all modules: products, inventory, customer orders, staff management, audit trails, and weekly/monthly PDF sales reports.';
      case 'Inventory Manager':
        return 'Operational access to products, categories, suppliers, purchase orders, goods receipts, and live inventory stock adjustments.';
      case 'Order Manager':
        return 'Operational access to customer accounts, customer orders, wholesale order status updates, and sales reports.';
      default:
        return selected.description;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Staff Member" maxWidth="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="First Name *"
            required
            value={formData.first_name}
            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
            placeholder="Kamal"
          />
          <Input
            label="Last Name *"
            required
            value={formData.last_name}
            onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
            placeholder="Silva"
          />
        </div>

        <Input
          label="Username *"
          required
          value={formData.username}
          onChange={(e) => setFormData({ ...formData, username: e.target.value })}
          placeholder="kamalsilva"
        />

        <Input
          label="Staff Email Address *"
          type="email"
          required
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="kamal@wholesale.local"
        />

        <Input
          label="Password *"
          type="password"
          required
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          placeholder="Minimum 8 characters"
        />

        {/* Role Selector with RBAC Explanation */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5 flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
            <span>Staff Role & Access Level *</span>
          </label>
          <select
            value={formData.role_id}
            onChange={(e) => setFormData({ ...formData, role_id: Number(e.target.value) })}
            className="w-full rounded-xl border border-gray-300 p-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            {staffRoles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>

          {/* Role Access Description Box */}
          <div className="mt-2 p-2.5 bg-blue-50/70 border border-blue-100 rounded-xl text-xs text-blue-900 flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">{getRoleDescription(Number(formData.role_id))}</p>
          </div>
        </div>

        <div className="pt-3 border-t border-gray-100 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            Create Staff Member
          </Button>
        </div>
      </form>
    </Modal>
  );
};
