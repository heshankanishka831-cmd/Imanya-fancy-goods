import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { adminApi } from '../../services/endpoints';
import { ProductAdmin, Category } from '../../types';
import { Upload } from 'lucide-react';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  productToEdit?: ProductAdmin | null;
  categories: Category[];
}

export const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  productToEdit,
  categories,
}) => {
  const [formData, setFormData] = useState({
    category_id: 1,
    sku: '',
    name: '',
    description: '',
    unit_of_measure: 'UNIT',
    selling_price: 0,
    cost_price: 0,
    initial_stock: 0,
    low_stock_threshold: 5,
    is_active: true,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (productToEdit) {
      setFormData({
        category_id: productToEdit.category_id,
        sku: productToEdit.sku,
        name: productToEdit.name,
        description: productToEdit.description || '',
        unit_of_measure: productToEdit.unit_of_measure,
        selling_price: productToEdit.selling_price,
        cost_price: productToEdit.cost_price || 0,
        initial_stock: productToEdit.current_stock || 0,
        low_stock_threshold: productToEdit.low_stock_threshold || 5,
        is_active: productToEdit.is_active,
      });
    } else {
      setFormData({
        category_id: categories[0]?.id || 1,
        sku: '',
        name: '',
        description: '',
        unit_of_measure: 'UNIT',
        selling_price: 0,
        cost_price: 0,
        initial_stock: 0,
        low_stock_threshold: 5,
        is_active: true,
      });
    }
    setImageFile(null);
    setError(null);
  }, [productToEdit, isOpen, categories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      let productId = productToEdit?.id;

      if (!productToEdit && categories.length === 0) {
        setError('Please create at least one category in the Categories section before adding products.');
        setIsLoading(false);
        return;
      }
      if (productToEdit) {
        await adminApi.updateProduct(productToEdit.id, {
          category_id: Number(formData.category_id),
          name: formData.name,
          description: formData.description,
          unit_of_measure: formData.unit_of_measure,
          selling_price: Number(formData.selling_price),
          cost_price: Number(formData.cost_price),
          low_stock_threshold: Number(formData.low_stock_threshold),
          is_active: formData.is_active,
        });
      } else {
        const res = await adminApi.createProduct({
          ...formData,
          category_id: Number(formData.category_id),
          selling_price: Number(formData.selling_price),
          cost_price: Number(formData.cost_price),
          initial_stock: Number(formData.initial_stock),
          low_stock_threshold: Number(formData.low_stock_threshold),
        });
        productId = res.data.id;
      }

      // If an image was selected, upload it
      if (imageFile && productId) {
        await adminApi.uploadProductImage(productId, imageFile, true);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to save product');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={productToEdit ? 'Edit Product Item' : 'Create New Wholesale Product'}
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
              Category *
            </label>
            {categories.length === 0 ? (
              <div className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                No categories yet. Please add a category first.
              </div>
            ) : (
              <select
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: Number(e.target.value) })}
                className="w-full rounded-lg border border-gray-300 p-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <Input
            label="SKU / Item Code *"
            required
            disabled={!!productToEdit}
            value={formData.sku}
            onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
            placeholder="e.g. FNC-001"
          />
        </div>

        <Input
          label="Product Name *"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g. Korean Crystal Hair Clip Set"
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Unit of Measure *"
            required
            value={formData.unit_of_measure}
            onChange={(e) => setFormData({ ...formData, unit_of_measure: e.target.value })}
            placeholder="PIECE, DOZEN, PACK, BOX..."
          />

          <Input
            label="Selling Price ($) *"
            type="number"
            step="0.01"
            required
            value={formData.selling_price}
            onChange={(e) => setFormData({ ...formData, selling_price: parseFloat(e.target.value) || 0 })}
          />

          <Input
            label="Cost Price ($) [Admin]"
            type="number"
            step="0.01"
            value={formData.cost_price}
            onChange={(e) => setFormData({ ...formData, cost_price: parseFloat(e.target.value) || 0 })}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {!productToEdit && (
            <Input
              label="Initial Stock Quantity"
              type="number"
              value={formData.initial_stock}
              onChange={(e) => setFormData({ ...formData, initial_stock: parseInt(e.target.value) || 0 })}
            />
          )}

          <Input
            label="Low-Stock Alert Threshold"
            type="number"
            value={formData.low_stock_threshold}
            onChange={(e) => setFormData({ ...formData, low_stock_threshold: parseInt(e.target.value) || 5 })}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
            Product Description
          </label>
          <textarea
            rows={2}
            className="w-full rounded-lg border border-gray-300 p-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Wholesale packaging specs, container volume, origin details..."
          />
        </div>

        {/* Product Image Attachment */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
            Product Image (JPEG, PNG, WEBP - Max 5MB)
          </label>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => setImageFile(e.target.files?.[0] || null)}
            className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="prodActive"
            checked={formData.is_active}
            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="prodActive" className="text-xs font-medium text-gray-700">
            Active for sale and catalogue listing
          </label>
        </div>

        <div className="pt-3 border-t border-gray-100 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            {productToEdit ? 'Save Changes' : 'Create Product'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
