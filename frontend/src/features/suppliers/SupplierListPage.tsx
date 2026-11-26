import React, { useEffect, useState, useMemo } from 'react';
import { adminApi } from '../../services/endpoints';
import { Supplier } from '../../types';
import { formatDate } from '../../utils/formatters';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { SupplierModal } from './SupplierModal';
import { SupplierDetailModal } from './SupplierDetailModal';
import { Plus, Edit2, Trash2, Truck, Search, Eye, FileSpreadsheet } from 'lucide-react';

export const SupplierListPage: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [inspectingSupplier, setInspectingSupplier] = useState<Supplier | null>(null);

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    try {
      setIsLoading(true);
      const res = await adminApi.getSuppliers({ limit: 100 });
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

  const filteredSuppliers = useMemo(() => {
    if (!search.trim()) return suppliers;
    const q = search.toLowerCase();
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.contact_person && s.contact_person.toLowerCase().includes(q)) ||
        (s.phone && s.phone.includes(q)) ||
        (s.email && s.email.toLowerCase().includes(q))
    );
  }, [suppliers, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
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

      {/* Search Bar */}
      <div className="relative w-full max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search suppliers by name, contact, phone, email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <Card>
        {isLoading ? (
          <Spinner />
        ) : filteredSuppliers.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Truck className="h-10 w-10 mx-auto text-gray-300 mb-2" />
            <p className="text-sm font-medium">No suppliers found matching criteria.</p>
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
                {filteredSuppliers.map((s) => (
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
                    <td className="py-3.5 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => setInspectingSupplier(s)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-[11px] font-semibold transition-colors"
                        title="View Supplier Profile & Purchase Orders"
                      >
                        <Eye className="h-3 w-3 text-slate-500" />
                        <span>Inspect</span>
                      </button>
                      <button
                        onClick={() => {
                          setEditingSupplier(s);
                          setIsModalOpen(true);
                        }}
                        className="p-1 text-gray-400 hover:text-blue-600 transition-colors inline-flex align-middle"
                        title="Edit Supplier"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="p-1 text-gray-400 hover:text-rose-600 transition-colors inline-flex align-middle"
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

      <SupplierDetailModal
        isOpen={!!inspectingSupplier}
        onClose={() => setInspectingSupplier(null)}
        supplier={inspectingSupplier}
      />
    </div>
  );
};
