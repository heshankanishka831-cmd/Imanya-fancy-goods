import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { adminApi } from '../../services/endpoints';
import { Role } from '../../types';
import { ShieldCheck, Info, Check, Eye, Edit3, Lock, Shield } from 'lucide-react';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  roles: Role[];
}

interface ModulePermission {
  key: string;
  label: string;
  description: string;
  read: boolean;
  edit: boolean;
  hasEdit: boolean; // whether this module supports edit
}

export const UserModal: React.FC<UserModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  roles,
}) => {
  const staffRoles = roles.filter((r) => r.name !== 'Customer');

  const [formData, setFormData] = useState({
    role_id: 1,
    username: '',
    email: '',
    password: '',
    first_name: '',
    last_name: '',
  });

  // Granular Permissions Matrix State
  const defaultModules: ModulePermission[] = [
    {
      key: 'products',
      label: 'Products & Catalogue',
      description: 'View catalogue, add/edit products, direct category typing, upload up to 5 photos',
      read: true,
      edit: true,
      hasEdit: true,
    },
    {
      key: 'inventory',
      label: 'Inventory & Stock Quantities',
      description: 'Live stock quantities, stock adjustments, low-stock threshold management',
      read: true,
      edit: true,
      hasEdit: true,
    },
    {
      key: 'orders',
      label: 'Customer Orders',
      description: 'View orders, update processing status, confirm bank deposit slips',
      read: true,
      edit: true,
      hasEdit: true,
    },
    {
      key: 'customers',
      label: 'Customer Accounts',
      description: 'View customer accounts, business details, account activation',
      read: true,
      edit: true,
      hasEdit: true,
    },
    {
      key: 'reports',
      label: 'Sales Analytics & PDF Reports',
      description: 'Turnover statistics, sales analytics, printable executive PDF reports',
      read: true,
      edit: false,
      hasEdit: false,
    },
    {
      key: 'audit',
      label: 'Audit Trail & Activity History',
      description: 'Inspect full activity logs, price mutations, and staff action history',
      read: true,
      edit: false,
      hasEdit: false,
    },
  ];

  const [permissions, setPermissions] = useState<ModulePermission[]>(defaultModules);
  const [selectedRoleType, setSelectedRoleType] = useState<string>('Super Administrator');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync permissions when role selector changes
  const applyRolePreset = (roleName: string) => {
    setSelectedRoleType(roleName);

    if (roleName === 'Super Administrator') {
      setPermissions(
        defaultModules.map((m) => ({
          ...m,
          read: true,
          edit: m.hasEdit ? true : false,
        }))
      );
    } else if (roleName === 'Inventory Manager') {
      setPermissions(
        defaultModules.map((m) => {
          if (m.key === 'products' || m.key === 'inventory') {
            return { ...m, read: true, edit: true };
          }
          if (m.key === 'reports' || m.key === 'audit') {
            return { ...m, read: true, edit: false };
          }
          return { ...m, read: false, edit: false };
        })
      );
    } else if (roleName === 'Order Manager') {
      setPermissions(
        defaultModules.map((m) => {
          if (m.key === 'orders' || m.key === 'customers') {
            return { ...m, read: true, edit: true };
          }
          if (m.key === 'reports' || m.key === 'audit') {
            return { ...m, read: true, edit: false };
          }
          return { ...m, read: false, edit: false };
        })
      );
    }
  };

  useEffect(() => {
    if (staffRoles.length > 0 && (!formData.role_id || formData.role_id === 1)) {
      setFormData((prev) => ({
        ...prev,
        role_id: staffRoles[0].id,
      }));
      applyRolePreset(staffRoles[0].name);
    }
  }, [roles, isOpen]);

  const togglePermission = (key: string, type: 'read' | 'edit') => {
    setSelectedRoleType('Custom Privileges');
    setPermissions((prev) =>
      prev.map((m) => {
        if (m.key !== key) return m;
        if (type === 'read') {
          const newRead = !m.read;
          return { ...m, read: newRead, edit: newRead ? m.edit : false };
        } else {
          const newEdit = !m.edit;
          return { ...m, edit: newEdit, read: newEdit ? true : m.read };
        }
      })
    );
  };

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
      // Determine the best matching role ID based on permissions or selected role
      let targetRoleId = formData.role_id;
      if (selectedRoleType === 'Custom Privileges') {
        const hasProdEdit = permissions.find((p) => p.key === 'products')?.edit;
        const hasOrderEdit = permissions.find((p) => p.key === 'orders')?.edit;

        if (hasProdEdit && hasOrderEdit) {
          targetRoleId = staffRoles.find((r) => r.name === 'Super Administrator')?.id || 1;
        } else if (hasProdEdit) {
          targetRoleId = staffRoles.find((r) => r.name === 'Inventory Manager')?.id || 2;
        } else if (hasOrderEdit) {
          targetRoleId = staffRoles.find((r) => r.name === 'Order Manager')?.id || 3;
        } else {
          targetRoleId = staffRoles[0]?.id || 1;
        }
      }

      await adminApi.createUser({
        ...formData,
        role_id: Number(targetRoleId),
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
      applyRolePreset(staffRoles[0]?.name || 'Super Administrator');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to create staff account');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add New Admin / Staff Member"
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            placeholder="kamal@imanya.local"
          />
        </div>

        <Input
          label="Password *"
          type="password"
          required
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          placeholder="Minimum 8 characters"
        />

        {/* Role Preset Selector */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-blue-600" />
              <span>Staff Role & Authority Profile *</span>
            </span>
            <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
              {selectedRoleType}
            </span>
          </label>

          <select
            value={formData.role_id}
            onChange={(e) => {
              const rId = Number(e.target.value);
              setFormData({ ...formData, role_id: rId });
              const matchedRole = staffRoles.find((r) => r.id === rId);
              if (matchedRole) {
                applyRolePreset(matchedRole.name);
              }
            }}
            className="w-full rounded-xl border border-gray-300 p-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            {staffRoles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        {/* Granular Permissions Matrix */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-blue-600" />
                <span>Granular Permissions Matrix (Read & Edit Functions)</span>
              </span>
              <p className="text-[11px] text-gray-500">
                Configure exact viewing (Read) and administrative mutation (Edit) capabilities.
              </p>
            </div>
            {selectedRoleType === 'Super Administrator' && (
              <span className="text-[10px] font-extrabold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full border border-purple-200">
                Full Unrestricted
              </span>
            )}
          </div>

          <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-gray-200 text-gray-600 font-semibold">
                <tr>
                  <th className="py-2.5 px-3">System Function / Module</th>
                  <th className="py-2.5 px-3 w-28 text-center">
                    <span className="inline-flex items-center gap-1">
                      <Eye className="h-3.5 w-3.5 text-blue-600" /> Read
                    </span>
                  </th>
                  <th className="py-2.5 px-3 w-28 text-center">
                    <span className="inline-flex items-center gap-1">
                      <Edit3 className="h-3.5 w-3.5 text-emerald-600" /> Edit
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {permissions.map((p) => (
                  <tr key={p.key} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2.5 px-3">
                      <p className="font-bold text-gray-900">{p.label}</p>
                      <p className="text-[11px] text-gray-400 font-normal">{p.description}</p>
                    </td>

                    {/* Read Checkbox */}
                    <td className="py-2.5 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={p.read}
                        disabled={selectedRoleType === 'Super Administrator'}
                        onChange={() => togglePermission(p.key, 'read')}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:opacity-50"
                      />
                    </td>

                    {/* Edit Checkbox */}
                    <td className="py-2.5 px-3 text-center">
                      {p.hasEdit ? (
                        <input
                          type="checkbox"
                          checked={p.edit}
                          disabled={selectedRoleType === 'Super Administrator'}
                          onChange={() => togglePermission(p.key, 'edit')}
                          className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer disabled:opacity-50"
                        />
                      ) : (
                        <span className="text-gray-300 text-[11px]">N/A</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
