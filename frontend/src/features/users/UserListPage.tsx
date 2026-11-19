import React, { useEffect, useState } from 'react';
import { adminApi } from '../../services/endpoints';
import { User, Role } from '../../types';
import { formatDate } from '../../utils/formatters';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { UserModal } from './UserModal';
import { Plus, Shield, UserCheck, UserX } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

export const UserListPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Staff User Directory & RBAC</h2>
          <p className="text-xs text-gray-500">Super Administrator controls for staff roles and authorization status</p>
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
                  <th className="pb-3">Name</th>
                  <th className="pb-3">Username</th>
                  <th className="pb-3">Email Address</th>
                  <th className="pb-3">Role</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Created</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 font-medium text-gray-700">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50/50">
                    <td className="py-3.5 font-bold text-gray-900">
                      {u.first_name} {u.last_name}
                    </td>
                    <td className="py-3.5 font-mono text-gray-500">{u.username}</td>
                    <td className="py-3.5 text-gray-600">{u.email}</td>
                    <td className="py-3.5">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                        {u.role_name}
                      </span>
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <UserModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadUsers}
        roles={roles}
      />
    </div>
  );
};
