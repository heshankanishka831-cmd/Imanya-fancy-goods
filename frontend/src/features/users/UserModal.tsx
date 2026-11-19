import React, { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { adminApi } from '../../services/endpoints';
import { Role } from '../../types';

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
  const [formData, setFormData] = useState({
    role_id: roles[0]?.id || 1,
    username: '',
    email: '',
    password: '',
    first_name: '',
    last_name: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await adminApi.createUser({
        ...formData,
        role_id: Number(formData.role_id),
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to create staff account');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Staff Account" maxWidth="md">
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
            placeholder="John"
          />
          <Input
            label="Last Name *"
            required
            value={formData.last_name}
            onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
            placeholder="Doe"
          />
        </div>

        <Input
          label="Username *"
          required
          value={formData.username}
          onChange={(e) => setFormData({ ...formData, username: e.target.value })}
          placeholder="johndoe"
        />

        <Input
          label="Email Address *"
          type="email"
          required
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="johndoe@wholesale.local"
        />

        <Input
          label="Password *"
          type="password"
          required
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          placeholder="Minimum 8 characters"
        />

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
            System Role *
          </label>
          <select
            value={formData.role_id}
            onChange={(e) => setFormData({ ...formData, role_id: Number(e.target.value) })}
            className="w-full rounded-lg border border-gray-300 p-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        <div className="pt-3 border-t border-gray-100 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            Create User
          </Button>
        </div>
      </form>
    </Modal>
  );
};
