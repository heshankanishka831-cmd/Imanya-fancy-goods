import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { adminApi } from '../../services/endpoints';
import { Category } from '../../types';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  categoryToEdit?: Category | null;
}

export const CategoryModal: React.FC<CategoryModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  categoryToEdit,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (categoryToEdit) {
      setName(categoryToEdit.name);
      setDescription(categoryToEdit.description || '');
      setIsActive(categoryToEdit.is_active);
    } else {
      setName('');
      setDescription('');
      setIsActive(true);
    }
    setError(null);
  }, [categoryToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (categoryToEdit) {
        await adminApi.updateCategory(categoryToEdit.id, { name, description, is_active: isActive });
      } else {
        await adminApi.createCategory({ name, description, is_active: isActive });
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to save category');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={categoryToEdit ? 'Edit Product Category' : 'Create New Category'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
            {error}
          </div>
        )}

        <Input
          label="Category Name *"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Industrial Grains & Rice"
        />

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
            Description
          </label>
          <textarea
            rows={3}
            className="w-full rounded-lg border border-gray-300 p-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Wholesale classification details..."
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="catActive"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="catActive" className="text-xs font-medium text-gray-700">
            Active for public catalog browsing
          </label>
        </div>

        <div className="pt-3 border-t border-gray-100 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            {categoryToEdit ? 'Update Category' : 'Create Category'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
