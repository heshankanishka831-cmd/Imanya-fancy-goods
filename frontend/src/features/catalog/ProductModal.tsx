import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { adminApi } from '../../services/endpoints';
import { ProductAdmin, Category, ProductImage } from '../../types';
import { AlertCircle, Tag, Sparkles, ImagePlus, X, Star, Check, Percent, Calendar } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { notifyCatalogUpdated } from '../../utils/catalogSync';

const formatForDateTimeLocal = (dateStr?: string | null): string => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const offset = d.getTimezoneOffset() * 60000;
    const local = new Date(d.getTime() - offset);
    return local.toISOString().slice(0, 16);
  } catch {
    return '';
  }
};

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
    min_order_quantity: 1,
    is_discount_enabled: false,
    discount_percent: 0,
    discount_start_date: '',
    discount_end_date: '',
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
        selling_price: Math.round((Number(productToEdit.selling_price) || 0) * 100) / 100,
        cost_price: Math.round((Number(productToEdit.cost_price) || 0) * 100) / 100,
        initial_stock: Math.round(productToEdit.current_stock || 0),
        low_stock_threshold: Math.round(productToEdit.low_stock_threshold || 5),
        min_order_quantity: Math.max(1, Math.round(productToEdit.min_order_quantity || 1)),
        is_discount_enabled: Boolean(productToEdit.is_discount_enabled),
        discount_percent: productToEdit.discount_percent || 0,
        discount_start_date: formatForDateTimeLocal(productToEdit.discount_start_date),
        discount_end_date: formatForDateTimeLocal(productToEdit.discount_end_date),
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
        min_order_quantity: 1,
        is_discount_enabled: false,
        discount_percent: 0,
        discount_start_date: '',
        discount_end_date: '',
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
    // Deliberately exclude localCategories so typing in the form isn't wiped when categories refresh
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productToEdit?.id, isOpen]);

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
          description: 'Sales product classification',
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

      // 2. Validate and Create/Update Product with discount settings
      let productId = productToEdit?.id;

      const minOrderQty = Math.max(1, Math.round(Number(formData.min_order_quantity) || 1));
      const sellingPrice = Math.max(0, Math.round((Number(formData.selling_price) || 0) * 100) / 100);
      const discountPercent = Math.max(0, Math.min(99.99, Math.round((Number(formData.discount_percent) || 0) * 100) / 100));
      const discountAmount = formData.is_discount_enabled && discountPercent > 0
        ? Math.round(sellingPrice * (discountPercent / 100) * 100) / 100
        : 0;
      const discountedPrice = Math.max(0, Math.round((sellingPrice - discountAmount) * 100) / 100);

      if (formData.is_discount_enabled) {
        if (discountPercent <= 0 || discountPercent >= 100) {
          setError('Discount percentage must be greater than 0% and less than 100%');
          setIsLoading(false);
          return;
        }
        if (discountedPrice <= 0) {
          setError('Calculated discounted price must be greater than 0');
          setIsLoading(false);
          return;
        }
        if (formData.discount_start_date && formData.discount_end_date) {
          if (new Date(formData.discount_end_date) <= new Date(formData.discount_start_date)) {
            setError('Discount end date must be later than the start date');
            setIsLoading(false);
            return;
          }
        }
      }

      const discountPayload = {
        is_discount_enabled: formData.is_discount_enabled,
        discount_percent: formData.is_discount_enabled ? discountPercent : 0,
        discount_start_date: formData.is_discount_enabled && formData.discount_start_date ? new Date(formData.discount_start_date).toISOString() : null,
        discount_end_date: formData.is_discount_enabled && formData.discount_end_date ? new Date(formData.discount_end_date).toISOString() : null,
      };

      if (productToEdit) {
        await adminApi.updateProduct(productToEdit.id, {
          category_id: resolvedCategoryId,
          name: formData.name,
          description: formData.description,
          unit_of_measure: formData.unit_of_measure,
          selling_price: sellingPrice,
          cost_price: Math.round(Number(formData.cost_price) || 0),
          low_stock_threshold: Math.round(Number(formData.low_stock_threshold) || 5),
          min_order_quantity: minOrderQty,
          is_active: formData.is_active,
          ...discountPayload,
        });
      } else {
        const res = await adminApi.createProduct({
          ...formData,
          category_id: resolvedCategoryId,
          selling_price: sellingPrice,
          cost_price: Math.round(Number(formData.cost_price) || 0),
          initial_stock: Math.round(Number(formData.initial_stock) || 0),
          low_stock_threshold: Math.round(Number(formData.low_stock_threshold) || 5),
          min_order_quantity: minOrderQty,
          ...discountPayload,
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

      notifyCatalogUpdated();
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

  const sellingPrice = Math.max(0, Math.round((Number(formData.selling_price) || 0) * 100) / 100);
  const discountPercent = Math.max(0, Math.min(99.99, Math.round((Number(formData.discount_percent) || 0) * 100) / 100));
  const discountAmount = formData.is_discount_enabled && discountPercent > 0
    ? Math.round(sellingPrice * (discountPercent / 100) * 100) / 100
    : 0;
  const discountedPrice = Math.max(0, Math.round((sellingPrice - discountAmount) * 100) / 100);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={productToEdit ? 'Edit Product Item' : 'Create New Product'}
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
            step="0.01"
            min="0"
            required
            value={formData.selling_price || ''}
            onChange={(e) =>
              setFormData({
                ...formData,
                selling_price: Math.max(0, Math.round((Number(e.target.value) || 0) * 100) / 100),
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
          <Input
            label="Minimum Order Quantity *"
            type="number"
            step="1"
            min="1"
            required
            value={formData.min_order_quantity}
            onChange={(e) =>
              setFormData({
                ...formData,
                min_order_quantity: Math.max(1, Math.round(Number(e.target.value) || 1)),
              })
            }
            helperText="Minimum units a customer must order (Default: 1)"
            placeholder="e.g. 1, 5, 10"
          />

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

        {!productToEdit && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              helperText="Initial inventory units to credit upon creation"
              placeholder="e.g. 100"
            />
          </div>
        )}

        {/* Dedicated Admin Discount Management Section */}
        <div className="bg-gradient-to-br from-slate-50 to-emerald-50/30 rounded-2xl border border-slate-200/90 p-4 space-y-3.5 shadow-2xs">
          {/* Section Header & Toggle Switch */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-200/70">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                <Percent className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 tracking-tight">Product Discount Management</h4>
                <p className="text-[11px] text-slate-500">
                  Configure promotional discount rate (%) and optional scheduled campaign window
                </p>
              </div>
            </div>

            {/* Modern ON/OFF Toggle Switch */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className={`text-[11px] font-bold ${formData.is_discount_enabled ? 'text-emerald-700' : 'text-slate-400'}`}>
                {formData.is_discount_enabled ? 'DISCOUNT ON' : 'DISCOUNT OFF'}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={formData.is_discount_enabled}
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    is_discount_enabled: !prev.is_discount_enabled,
                  }))
                }
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                  formData.is_discount_enabled ? 'bg-emerald-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    formData.is_discount_enabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {formData.is_discount_enabled ? (
            <div className="space-y-4 pt-1">
              {/* Discount Percentage and Presets */}
              <div className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
                      Discount Percentage (%) *
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        max="99"
                        step="0.5"
                        required={formData.is_discount_enabled}
                        value={formData.discount_percent || ''}
                        onChange={(e) => {
                          const val = Math.max(0, Math.min(99, Number(e.target.value) || 0));
                          setFormData({ ...formData, discount_percent: val });
                        }}
                        placeholder="e.g. 20"
                        className="w-full rounded-xl border border-gray-300 p-2.5 pr-8 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-gray-400 text-sm">
                        %
                      </span>
                    </div>
                  </div>

                  {/* Real-time Calculated Price Preview Box */}
                  <div className="bg-white rounded-xl border border-emerald-200 p-3 shadow-2xs space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Live Price Preview
                    </span>
                    <div className="flex items-baseline justify-between">
                      <div className="space-y-0.5">
                        <span className="text-[11px] text-slate-400 line-through block">
                          {formatCurrency(sellingPrice)}
                        </span>
                        <div className="text-base font-black text-emerald-700">
                          {formatCurrency(discountedPrice)}
                          <span className="text-[10px] text-slate-400 font-normal ml-1">
                            /{formData.unit_of_measure}
                          </span>
                        </div>
                      </div>
                      {discountAmount > 0 && (
                        <div className="text-right">
                          <span className="inline-flex items-center text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                            Save {formatCurrency(discountAmount)} ({formData.discount_percent}%)
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Preset Buttons */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-slate-400 font-semibold">Quick Rates:</span>
                  {[5, 10, 15, 20, 25, 30, 40, 50].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => setFormData({ ...formData, discount_percent: rate })}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all border ${
                        formData.discount_percent === rate
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700'
                      }`}
                    >
                      {rate}% OFF
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional Date Scheduling (Start / End Date) */}
              <div className="pt-2 border-t border-slate-200/60">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-2">
                  <Calendar className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Optional Campaign Schedule (Leave blank for immediate & ongoing discount)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                      Discount Start Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.discount_start_date}
                      onChange={(e) => setFormData({ ...formData, discount_start_date: e.target.value })}
                      className="w-full rounded-xl border border-gray-300 p-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    />
                    <p className="text-[10px] text-gray-400 mt-0.5">Discount activates automatically on this date</p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                      Discount End Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.discount_end_date}
                      onChange={(e) => setFormData({ ...formData, discount_end_date: e.target.value })}
                      className="w-full rounded-xl border border-gray-300 p-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    />
                    <p className="text-[10px] text-gray-400 mt-0.5">Discount automatically expires after this date</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic">
              Discount toggle is currently OFF. The product will be listed and sold at its regular original price ({formatCurrency(sellingPrice)}).
            </p>
          )}
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
            placeholder="Packaging specs, color variants, carton quantity, origin..."
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
