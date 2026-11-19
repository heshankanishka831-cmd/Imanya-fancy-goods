import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { adminApi } from '../../services/endpoints';
import { ProductAdmin, Category, ProductImage } from '../../types';
import { AlertCircle, Tag, Sparkles, ImagePlus, X, Star, Check } from 'lucide-react';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  productToEdit?: ProductAdmin | null;
  categories: Category[];
  onCategoriesChange?: () => void;
}

interface NewImageItem {
  file: File;
  previewUrl: string;
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
  const [categoryName, setCategoryName] = useState<string>('');
  const [formData, setFormData] = useState({
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

  // Multiple photos state (Max 5 photos)
  const [existingImages, setExistingImages] = useState<ProductImage[]>([]);
  const [imagesToDelete, setImagesToDelete] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<NewImageItem[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLocalCategories(categories);
  }, [categories]);

  useEffect(() => {
    if (productToEdit) {
      const currentCat = localCategories.find((c) => c.id === productToEdit.category_id);
      setCategoryName(currentCat?.name || '');
      setFormData({
        sku: productToEdit.sku,
        name: productToEdit.name,
        description: productToEdit.description || '',
        unit_of_measure: productToEdit.unit_of_measure,
        selling_price: Math.round(productToEdit.selling_price || 0),
        cost_price: Math.round(productToEdit.cost_price || 0),
        initial_stock: Math.round(productToEdit.current_stock || 0),
        low_stock_threshold: Math.round(productToEdit.low_stock_threshold || 5),
        is_active: productToEdit.is_active,
      });
      setExistingImages(productToEdit.images || []);
    } else {
      setCategoryName(localCategories[0]?.name || '');
      setFormData({
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
      setExistingImages([]);
    }
    // Clean up previous blob URLs if any
    newImages.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    setNewImages([]);
    setImagesToDelete([]);
    setImageError(null);
    setError(null);
  }, [productToEdit, isOpen, localCategories]);

  // Active photos calculation (Max 5)
  const activeExistingImages = existingImages.filter((img) => !imagesToDelete.includes(img.id));
  const totalPhotosCount = activeExistingImages.length + newImages.length;
  const remainingPhotoSlots = Math.max(0, 5 - totalPhotosCount);

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setImageError(null);

    if (totalPhotosCount >= 5) {
      setImageError('Maximum limit of 5 photos reached for this product.');
      return;
    }

    if (files.length > remainingPhotoSlots) {
      setImageError(`You can only add ${remainingPhotoSlots} more photo(s). Maximum allowed is 5 photos per product.`);
    }

    const filesToAdd = files.slice(0, remainingPhotoSlots);
    const newItems: NewImageItem[] = filesToAdd.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setNewImages((prev) => [...prev, ...newItems]);
    // Reset file input value so same files can be re-selected if deleted
    e.target.value = '';
  };

  const handleRemoveNewImage = (index: number) => {
    const itemToRemove = newImages[index];
    if (itemToRemove) {
      URL.revokeObjectURL(itemToRemove.previewUrl);
    }
    setNewImages((prev) => prev.filter((_, i) => i !== index));
    setImageError(null);
  };

  const handleMarkDeleteExistingImage = (imageId: string) => {
    setImagesToDelete((prev) => [...prev, imageId]);
    setImageError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setImageError(null);

    const trimmedCat = categoryName.trim();
    if (!trimmedCat) {
      setError('Please type or select a category name.');
      setIsLoading(false);
      return;
    }

    try {
      // 1. Resolve Category ID (either match existing or auto-create seamlessly)
      let resolvedCategoryId: number;
      const matchedCat = localCategories.find(
        (c) => c.name.toLowerCase() === trimmedCat.toLowerCase()
      );

      if (matchedCat) {
        resolvedCategoryId = matchedCat.id;
      } else {
        // Auto-create category in the database on the fly!
        const catRes = await adminApi.createCategory({
          name: trimmedCat,
          description: 'Wholesale product classification',
          is_active: true,
        });

        if (catRes.success && catRes.data) {
          resolvedCategoryId = catRes.data.id;
          const updated = [...localCategories, catRes.data];
          setLocalCategories(updated);
          if (onCategoriesChange) {
            onCategoriesChange();
          }
        } else {
          throw new Error('Failed to create category');
        }
      }

      // 2. Create or Update Product with integer prices & stock
      let productId = productToEdit?.id;

      if (productToEdit) {
        await adminApi.updateProduct(productToEdit.id, {
          category_id: resolvedCategoryId,
          name: formData.name,
          description: formData.description,
          unit_of_measure: formData.unit_of_measure,
          selling_price: Math.round(Number(formData.selling_price) || 0),
          cost_price: Math.round(Number(formData.cost_price) || 0),
          low_stock_threshold: Math.round(Number(formData.low_stock_threshold) || 5),
          is_active: formData.is_active,
        });
      } else {
        const res = await adminApi.createProduct({
          ...formData,
          category_id: resolvedCategoryId,
          selling_price: Math.round(Number(formData.selling_price) || 0),
          cost_price: Math.round(Number(formData.cost_price) || 0),
          initial_stock: Math.round(Number(formData.initial_stock) || 0),
          low_stock_threshold: Math.round(Number(formData.low_stock_threshold) || 5),
        });
        productId = res.data.id;
      }

      // 3. Process image deletions (if editing)
      if (productId && imagesToDelete.length > 0) {
        for (const imageId of imagesToDelete) {
          try {
            await adminApi.deleteProductImage(productId, imageId);
          } catch (delErr) {
            console.error('Failed to delete image', imageId, delErr);
          }
        }
      }

      // 4. Upload all newly added photos (Up to 5 total)
      if (productId && newImages.length > 0) {
        let hasPrimary = activeExistingImages.length > 0;
        for (let i = 0; i < newImages.length; i++) {
          const isPrimary = !hasPrimary && i === 0;
          await adminApi.uploadProductImage(productId, newImages[i].file, isPrimary);
        }
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to save product');
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
    'Stationery',
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
          {/* Direct Category Typing with Autocomplete & Suggestions */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
              Category *
            </label>
            <div className="relative">
              <input
                type="text"
                required
                list="category-suggestions"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="Type category (e.g. Hair Clips, Rings...)"
                className="w-full rounded-xl border border-gray-300 p-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white placeholder-gray-400"
              />
              <datalist id="category-suggestions">
                {localCategories.map((c) => (
                  <option key={c.id} value={c.name} />
                ))}
              </datalist>
            </div>

            {/* Quick Suggestion Pills */}
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] text-gray-400 font-medium">Suggestions:</span>
              {suggestions.map((sug) => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => setCategoryName(sug)}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-all ${
                    categoryName.trim().toLowerCase() === sug.toLowerCase()
                      ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                  }`}
                >
                  {sug}
                </button>
              ))}
            </div>
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
            step="1"
            min="0"
            required
            value={formData.selling_price || ''}
            onChange={(e) =>
              setFormData({
                ...formData,
                selling_price: Math.max(0, Math.round(Number(e.target.value) || 0)),
              })
            }
            placeholder="e.g. 450"
          />

          <Input
            label="Cost Price (Rs.) [Admin]"
            type="number"
            step="1"
            min="0"
            value={formData.cost_price || ''}
            onChange={(e) =>
              setFormData({
                ...formData,
                cost_price: Math.max(0, Math.round(Number(e.target.value) || 0)),
              })
            }
            placeholder="e.g. 280"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {!productToEdit && (
            <Input
              label="Initial Stock Quantity"
              type="number"
              step="1"
              min="0"
              value={formData.initial_stock || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  initial_stock: Math.max(0, Math.round(Number(e.target.value) || 0)),
                })
              }
              placeholder="e.g. 100"
            />
          )}

          <Input
            label="Low-Stock Alert Threshold"
            type="number"
            step="1"
            min="0"
            value={formData.low_stock_threshold || ''}
            onChange={(e) =>
              setFormData({
                ...formData,
                low_stock_threshold: Math.max(0, Math.round(Number(e.target.value) || 0)),
              })
            }
            placeholder="e.g. 5"
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

        {/* Multi-Photo Upload Section (Max 5 Photos) */}
        <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/80 space-y-2.5">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                <ImagePlus className="h-4 w-4 text-blue-600" />
                <span>Product Photos ({totalPhotosCount}/5)</span>
              </span>
              <p className="text-[11px] text-gray-500">
                Add up to 5 photos for this item. First photo serves as primary catalog thumbnail.
              </p>
            </div>
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                totalPhotosCount >= 5
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-blue-100 text-blue-700'
              }`}
            >
              {remainingPhotoSlots === 0 ? 'Max 5 reached' : `${remainingPhotoSlots} slot(s) left`}
            </span>
          </div>

          {imageError && (
            <p className="text-[11px] text-rose-600 font-semibold flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>{imageError}</span>
            </p>
          )}

          {/* Photo Thumbnails Preview Grid */}
          <div className="flex flex-wrap gap-2.5 items-center">
            {/* Existing Active Images */}
            {activeExistingImages.map((img, idx) => (
              <div
                key={img.id}
                className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200 bg-white group shadow-2xs"
              >
                <img
                  src={img.image_url}
                  alt={img.alt_text || 'Product'}
                  className="w-full h-full object-cover"
                />
                {idx === 0 && (
                  <span className="absolute bottom-1 left-1 bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs flex items-center gap-0.5">
                    <Star className="h-2 w-2 fill-white" /> Main
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => handleMarkDeleteExistingImage(img.id)}
                  title="Remove this photo"
                  className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-rose-700"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}

            {/* New Pending Upload Images */}
            {newImages.map((item, idx) => (
              <div
                key={item.previewUrl}
                className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-blue-400 bg-white group shadow-2xs"
              >
                <img
                  src={item.previewUrl}
                  alt="New upload"
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-1 left-1 bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs flex items-center gap-0.5">
                  <Check className="h-2 w-2" /> New
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveNewImage(idx)}
                  title="Remove this photo"
                  className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-rose-700"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}

            {/* Upload Tile Button (Enabled if < 5 photos) */}
            {totalPhotosCount < 5 && (
              <label className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 hover:border-blue-500 bg-white hover:bg-blue-50/50 flex flex-col items-center justify-center cursor-pointer text-gray-400 hover:text-blue-600 transition-all shadow-2xs">
                <ImagePlus className="h-5 w-5 mb-0.5" />
                <span className="text-[10px] font-bold">+ Add Photo</span>
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFilesSelected}
                  className="hidden"
                />
              </label>
            )}
          </div>
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
