import React, { useEffect, useState } from 'react';
import { adminApi } from '../../services/endpoints';
import { Supplier } from '../../types';
import { formatDate } from '../../utils/formatters';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { SupplierModal } from './SupplierModal';
import { Plus, Edit2, Trash2, Truck } from 'lucide-react';

export const SupplierListPage: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    try {
      setIsLoading(true);
      const res = await adminApi.getSuppliers();
      if (res.success && res.data) {
        setSuppliers(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this supplier?')) return;
    try {
      await adminApi.deleteSupplier(id);
      await loadSuppliers();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to delete supplier');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Suppliers & Importers Directory</h2>
          <p className="text-xs text-gray-500">Manage vendor contact profiles, procurement channels, and active status</p>
        </div>
        <Button
          onClick={() => {
            setEditingSupplier(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-1.5"
        >
          <Plus className="h-4 w-4" />
          <span>New Supplier</span>
        </Button>
      </div>

      <Card>
        {isLoading ? (
          <Spinner />
        ) : suppliers.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Truck className="h-10 w-10 mx-auto text-gray-300 mb-2" />
            <p className="text-sm font-medium">No suppliers registered yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-gray-400 font-semibold border-b border-gray-100">
                <tr>
                  <th className="pb-3">Supplier Name</th>
                  <th className="pb-3">Contact Person</th>
                  <th className="pb-3">Phone</th>
                  <th className="pb-3">Email</th>
                  <th className="pb-3">Address</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 font-medium text-gray-700">
                {suppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50/50">
                    <td className="py-3.5 font-bold text-gray-900">{s.name}</td>
                    <td className="py-3.5">{s.contact_person || '—'}</td>
                    <td className="py-3.5 font-mono">{s.phone}</td>
                    <td className="py-3.5 text-gray-500">{s.email || '—'}</td>
                    <td className="py-3.5 text-gray-600 max-w-xs truncate">{s.address || '—'}</td>
                    <td className="py-3.5">
                      <Badge variant={s.is_active ? 'green' : 'gray'}>
                        {s.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="py-3.5 text-right space-x-2">
                      <button
                        onClick={() => {
                          setEditingSupplier(s);
                          setIsModalOpen(true);
                        }}
                        className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Edit Supplier"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="p-1 text-gray-400 hover:text-rose-600 transition-colors"
                        title="Delete Supplier"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <SupplierModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadSuppliers}
        supplierToEdit={editingSupplier}
      />
    </div>
  );
};
