import React, { useEffect, useState } from 'react';
import { adminApi } from '../../services/endpoints';
import { User, Role } from '../../types';
import { formatDate } from '../../utils/formatters';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { Modal } from '../../components/ui/Modal';
import { UserModal } from './UserModal';
import { Plus, Shield, UserCheck, UserX, Eye, Edit3, ShieldCheck, Lock } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

export const UserListPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [inspectUser, setInspectUser] = useState<User | null>(null);

  useEffect(() => {
    loadDependencies();
    loadUsers();
  }, []);

  const loadDependencies = async () => {
    try {
      const res = await adminApi.getRoles();
      if (res.data) setRoles(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const res = await adminApi.getUsers();
      if (res.success && res.data) {
        setUsers(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleStatus = async (user: User) => {
    if (user.id === currentUser?.id) {
      alert('You cannot deactivate your own active session account.');
      return;
    }

    try {
      await adminApi.updateUserStatus(user.id, !user.is_active);
      await loadUsers();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to update user status');
    }
  };

  const getRolePermissions = (roleName: string) => {
    if (roleName === 'Super Administrator') {
      return {
        reads: ['Products', 'Inventory', 'Orders', 'Customers', 'Reports', 'Audit History'],
        edits: ['Products', 'Inventory', 'Orders', 'Customers', 'Staff & Roles'],
        tag: 'Full Unrestricted',
      };
    }
    if (roleName === 'Inventory Manager') {
      return {
        reads: ['Products', 'Inventory', 'Reports', 'Audit History'],
        edits: ['Products (Max 5 Photos)', 'Stock Levels'],
        tag: 'Catalogue & Stock',
      };
    }
    if (roleName === 'Order Manager') {
      return {
        reads: ['Orders', 'Customers', 'Reports', 'Audit History'],
        edits: ['Order Status & Slips', 'Customer Verification'],
        tag: 'Orders & Sales',
      };
    }
    return {
      reads: ['General Storefront'],
      edits: [],
      tag: 'Restricted',
    };
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Staff User Directory & RBAC</h2>
          <p className="text-xs text-gray-500">
            Super Administrator controls for staff roles, granular Read & Edit permissions, and account status
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-1.5">
          <Plus className="h-4 w-4" />
          <span>New Staff User</span>
        </Button>
      </div>

      <Card>
        {isLoading ? (
          <Spinner />
        ) : users.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Shield className="h-10 w-10 mx-auto text-gray-300 mb-2" />
            <p className="text-sm font-medium">No users found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-gray-400 font-semibold border-b border-gray-100">
                <tr>
                  <th className="pb-3">Staff Name</th>
                  <th className="pb-3">Username / Email</th>
                  <th className="pb-3">System Role</th>
                  <th className="pb-3">Assigned Permissions</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Created</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 font-medium text-gray-700">
                {users.map((u) => {
                  const perm = getRolePermissions(u.role_name);

                  return (
                    <tr key={u.id} className="hover:bg-gray-50/50">
                      <td className="py-3.5">
                        <p className="font-bold text-gray-900">
                          {u.first_name} {u.last_name}
                        </p>
                        {u.id === currentUser?.id && (
                          <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-1.5 py-0.2 rounded">
                            (You - Current Session)
                          </span>
                        )}
                      </td>
                      <td className="py-3.5">
                        <p className="font-mono text-gray-600">{u.username}</p>
                        <p className="text-gray-400 text-[11px]">{u.email}</p>
                      </td>
                      <td className="py-3.5">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                            u.role_name === 'Super Administrator'
                              ? 'bg-purple-50 text-purple-800 border-purple-200'
                              : u.role_name === 'Inventory Manager'
                              ? 'bg-blue-50 text-blue-800 border-blue-200'
                              : u.role_name === 'Order Manager'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-gray-100 text-gray-700 border-gray-200'
                          }`}
                        >
                          {u.role_name}
                        </span>
                      </td>
                      <td className="py-3.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => setInspectUser(u)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 transition-colors"
                          >
                            <ShieldCheck className="h-3 w-3" />
                            <span>Inspect Permissions</span>
                          </button>
                          <span className="text-[10px] text-gray-400">
                            {perm.reads.length} Reads • {perm.edits.length} Edits
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5">
                        <Badge variant={u.is_active ? 'green' : 'gray'}>
                          {u.is_active ? 'Active' : 'Deactivated'}
                        </Badge>
                      </td>
                      <td className="py-3.5 text-gray-400">{formatDate(u.created_at).split(',')[0]}</td>
                      <td className="py-3.5 text-right">
                        {u.id !== currentUser?.id && (
                          <button
                            onClick={() => toggleStatus(u)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              u.is_active
                                ? 'text-gray-400 hover:text-rose-600 hover:bg-rose-50'
                                : 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50'
                            }`}
                            title={u.is_active ? 'Deactivate User' : 'Activate User'}
                          >
                            {u.is_active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Permissions Detail Inspector Modal */}
      {inspectUser && (
        <Modal
          isOpen={!!inspectUser}
          onClose={() => setInspectUser(null)}
          title={`Permissions Profile: ${inspectUser.first_name} ${inspectUser.last_name}`}
          maxWidth="lg"
        >
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-900">{inspectUser.username}</p>
                <p className="text-xs text-gray-500">{inspectUser.email}</p>
              </div>
              <span className="px-3 py-1 bg-blue-600 text-white font-bold text-xs rounded-lg shadow-xs">
                {inspectUser.role_name}
              </span>
            </div>

            {/* Read Capabilities */}
            <div>
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5 text-blue-600" />
                <span>Granted Read Capabilities:</span>
              </span>
              <div className="flex flex-wrap gap-1.5">
                {getRolePermissions(inspectUser.role_name).reads.map((r) => (
                  <span
                    key={r}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1"
                  >
                    ✓ Can View {r}
                  </span>
                ))}
              </div>
            </div>

            {/* Edit Capabilities */}
            <div>
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                <Edit3 className="h-3.5 w-3.5 text-emerald-600" />
                <span>Granted Edit & Management Capabilities:</span>
              </span>
              {getRolePermissions(inspectUser.role_name).edits.length === 0 ? (
                <p className="text-xs text-gray-400 italic">No administrative edit rights granted.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {getRolePermissions(inspectUser.role_name).edits.map((e) => (
                    <span
                      key={e}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1"
                    >
                      ✓ Can Manage / Edit {e}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-gray-100 flex justify-end">
              <Button variant="outline" onClick={() => setInspectUser(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      <UserModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadUsers}
        roles={roles}
      />
    </div>
  );
};
