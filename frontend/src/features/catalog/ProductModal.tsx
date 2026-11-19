import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { adminApi } from '../../services/endpoints';
import { ProductAdmin, Category } from '../../types';
import { Plus, Check, Sparkles, AlertCircle } from 'lucide-react';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  productToEdit?: ProductAdmin | null;
  categories: Category[];
  onCategoriesChange?: () => void;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  productToEdit,
  categories,
  onCategoriesChange,
}) => {
  const [localCategories, setLocalCategories] = useState<Category[]>(categories);
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

  // Quick category creation state
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickCategoryName, setQuickCategoryName] = useState('');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);

  useEffect(() => {
    setLocalCategories(categories);
  }, [categories]);

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
        category_id: localCategories[0]?.id || 1,
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
    setIsQuickAddOpen(false);
    setQuickCategoryName('');
  }, [productToEdit, isOpen, localCategories]);

  // Quick add a category directly inside the modal
  const handleQuickAddCategory = async (nameToAdd?: string) => {
    const targetName = (nameToAdd || quickCategoryName).trim();
    if (!targetName) return;

    try {
      setIsCreatingCategory(true);
      setCategoryError(null);
      const res = await adminApi.createCategory({
        name: targetName,
        description: 'Wholesale product classification',
        is_active: true,
      });

      if (res.success && res.data) {
        const createdCat = res.data;
        const updatedList = [...localCategories, createdCat];
        setLocalCategories(updatedList);
        setFormData((prev) => ({ ...prev, category_id: createdCat.id }));
        setQuickCategoryName('');
        setIsQuickAddOpen(false);
        setError(null);
        if (onCategoriesChange) {
          onCategoriesChange();
        }
      }
    } catch (err: any) {
      setCategoryError(err.response?.data?.error?.message || 'Failed to create category');
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      let productId = productToEdit?.id;

      if (!productToEdit && localCategories.length === 0) {
        setError('Please create at least one category above before saving this product.');
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

  const suggestions = [
    'Hair Accessories',
    'Fashion Jewelry',
    'Cosmetics & Beauty',
    'Bags & Pouches',
    'Novelty & Gifts',
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={productToEdit ? 'Edit Product Item' : 'Create New Wholesale Product'}
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Category Section with Inline Quick Creation */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-700">
                Category *
              </label>
              {localCategories.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsQuickAddOpen(!isQuickAddOpen)}
                  className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" />
                  <span>{isQuickAddOpen ? 'Cancel' : '+ Quick Add Category'}</span>
                </button>
              )}
            </div>

            {/* If zero categories, show inline creation box directly */}
            {localCategories.length === 0 ? (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-900">
                    No categories created yet
                  </span>
                  <span className="text-[10px] bg-amber-200 text-amber-900 font-bold px-1.5 py-0.5 rounded">
                    Required
                  </span>
                </div>
                <p className="text-[11px] text-amber-700 leading-tight">
                  Type a category name to create it instantly in your database:
                </p>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={quickCategoryName}
                    onChange={(e) => setQuickCategoryName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleQuickAddCategory();
                      }
                    }}
                    placeholder="e.g. Hair Accessories"
                    className="flex-1 px-3 py-1.5 text-xs bg-white rounded-lg border border-amber-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    disabled={isCreatingCategory || !quickCategoryName.trim()}
                    onClick={() => handleQuickAddCategory()}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg whitespace-nowrap shadow-xs transition-colors"
                  >
                    {isCreatingCategory ? 'Adding...' : '+ Add'}
                  </button>
                </div>

                {categoryError && (
                  <p className="text-[10px] text-rose-600 font-bold">{categoryError}</p>
                )}

                {/* 1-Click Common Suggestions */}
                <div className="pt-1">
                  <span className="text-[10px] text-gray-500 block mb-1">
                    Or click one to add instantly:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {suggestions.map((sug) => (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => handleQuickAddCategory(sug)}
                        disabled={isCreatingCategory}
                        className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-white text-gray-700 border border-gray-200 hover:border-blue-400 hover:text-blue-700 shadow-2xs transition-colors"
                      >
                        + {sug}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <select
                  value={formData.category_id}
                  onChange={(e) =>
                    setFormData({ ...formData, category_id: Number(e.target.value) })
                  }
                  className="w-full rounded-xl border border-gray-300 p-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {localCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>

                {/* Quick Add Popdown if toggled */}
                {isQuickAddOpen && (
                  <div className="mt-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                    <span className="text-[11px] font-bold text-gray-700 block">
                      Create New Category:
                    </span>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={quickCategoryName}
                        onChange={(e) => setQuickCategoryName(e.target.value)}
                        placeholder="e.g. Fashion Jewelry"
                        className="flex-1 px-2.5 py-1 text-xs bg-white rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        disabled={isCreatingCategory || !quickCategoryName.trim()}
                        onClick={() => handleQuickAddCategory()}
                        className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg whitespace-nowrap"
                      >
                        {isCreatingCategory ? 'Saving...' : 'Add'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <Input
            label="SKU / Item Code *"
            required
            disabled={!!productToEdit}
            value={formData.sku}
            onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
            placeholder="e.g. FNC-001 or 001"
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
            label="Selling Price (Rs.) *"
            type="number"
            step="0.01"
            required
            value={formData.selling_price}
            onChange={(e) =>
              setFormData({ ...formData, selling_price: parseFloat(e.target.value) || 0 })
            }
          />

          <Input
            label="Cost Price (Rs.) [Admin]"
            type="number"
            step="0.01"
            value={formData.cost_price}
            onChange={(e) =>
              setFormData({ ...formData, cost_price: parseFloat(e.target.value) || 0 })
            }
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {!productToEdit && (
            <Input
              label="Initial Stock Quantity"
              type="number"
              value={formData.initial_stock}
              onChange={(e) =>
                setFormData({ ...formData, initial_stock: parseInt(e.target.value) || 0 })
              }
            />
          )}

          <Input
            label="Low-Stock Alert Threshold"
            type="number"
            value={formData.low_stock_threshold}
            onChange={(e) =>
              setFormData({ ...formData, low_stock_threshold: parseInt(e.target.value) || 5 })
            }
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
            Product Description
          </label>
          <textarea
            rows={2}
            className="w-full rounded-xl border border-gray-300 p-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Wholesale packaging specs, color variants, carton quantity, origin..."
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
            className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
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
            Active for commercial sale and customer catalogue listing
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
