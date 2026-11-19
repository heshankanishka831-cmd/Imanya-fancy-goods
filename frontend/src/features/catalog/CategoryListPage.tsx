import React, { useEffect, useState } from 'react';
import { adminApi } from '../../services/endpoints';
import { Category } from '../../types';
import { formatDate } from '../../utils/formatters';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { CategoryModal } from './CategoryModal';
import { Plus, Edit2, Trash2, Layers } from 'lucide-react';

export const CategoryListPage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setIsLoading(true);
      const res = await adminApi.getCategories();
      if (res.success && res.data) {
        setCategories(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;
    try {
      await adminApi.deleteCategory(id);
      await loadCategories();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to delete category');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Product Categories</h2>
          <p className="text-xs text-gray-500">Manage classification hierarchy for wholesale inventory</p>
        </div>
        <Button
          onClick={() => {
            setEditingCategory(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-1.5"
        >
          <Plus className="h-4 w-4" />
          <span>New Category</span>
        </Button>
      </div>

      <Card>
        {isLoading ? (
          <Spinner />
        ) : categories.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Layers className="h-10 w-10 mx-auto text-gray-300 mb-2" />
            <p className="text-sm font-medium">No categories created yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-gray-400 font-semibold border-b border-gray-100">
                <tr>
                  <th className="pb-3">Name</th>
                  <th className="pb-3">Slug</th>
                  <th className="pb-3">Description</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Created</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 font-medium text-gray-700">
                {categories.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/50">
                    <td className="py-3.5 font-bold text-gray-900">{c.name}</td>
                    <td className="py-3.5 font-mono text-gray-500">{c.slug}</td>
                    <td className="py-3.5 text-gray-600 max-w-xs truncate">{c.description || '—'}</td>
                    <td className="py-3.5">
                      <Badge variant={c.is_active ? 'green' : 'gray'}>
                        {c.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="py-3.5 text-gray-400">{formatDate(c.created_at)}</td>
                    <td className="py-3.5 text-right space-x-2">
                      <button
                        onClick={() => {
                          setEditingCategory(c);
                          setIsModalOpen(true);
                        }}
                        className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Edit Category"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="p-1 text-gray-400 hover:text-rose-600 transition-colors"
                        title="Delete Category"
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

      <CategoryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadCategories}
        categoryToEdit={editingCategory}
      />
    </div>
  );
};
