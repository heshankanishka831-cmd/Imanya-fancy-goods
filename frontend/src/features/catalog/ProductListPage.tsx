import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { adminApi } from '../../services/endpoints';
import { ProductAdmin, Category } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { Modal } from '../../components/ui/Modal';
import { ProductModal } from './ProductModal';
import { Plus, Edit2, Trash2, Search, Package, AlertTriangle, Images, X, Percent } from 'lucide-react';
import { useDebounce } from '../../hooks/useDebounce';
import { notifyCatalogUpdated } from '../../utils/catalogSync';

export const ProductListPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCategoryParam = searchParams.get('category_id');

  const [products, setProducts] = useState<ProductAdmin[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>(
    initialCategoryParam ? Number(initialCategoryParam) : undefined
  );
  const [discountFilter, setDiscountFilter] = useState<'all' | 'discounted'>('all');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductAdmin | null>(null);
  const [previewProduct, setPreviewProduct] = useState<ProductAdmin | null>(null);
  const [activePhotoIdx, setActivePhotoIdx] = useState<number>(0);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    const catId = searchParams.get('category_id');
    if (catId) {
      setSelectedCategory(Number(catId));
    }
  }, [searchParams]);

  useEffect(() => {
    loadProducts();
  }, [selectedCategory, debouncedSearch]);

  const loadCategories = async () => {
    try {
      const res = await adminApi.getCategories();
      if (res.success && res.data) {
        setCategories(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadProducts = async () => {
    try {
      setIsLoading(true);
      const res = await adminApi.getProducts({
        category_id: selectedCategory,
        search: debouncedSearch || undefined,
      });
      if (res.success && res.data) {
        setProducts(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      await adminApi.deleteProduct(id);
      notifyCatalogUpdated();
      await loadProducts();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to delete product');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Product Catalogue</h2>
          <p className="text-xs text-gray-500">
            Manage SKUs, product pricing (Rs.), stock indicators, and photo galleries (up to 5 photos)
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingProduct(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-1.5"
        >
          <Plus className="h-4 w-4" />
          <span>New Product</span>
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by SKU or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Discount Filter Pills */}
          <div className="flex items-center bg-gray-100 p-0.5 rounded-xl border border-gray-200 text-xs">
            <button
              type="button"
              onClick={() => setDiscountFilter('all')}
              className={`px-2.5 py-1.5 rounded-lg font-bold transition-all ${
                discountFilter === 'all'
                  ? 'bg-white text-gray-900 shadow-2xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              All Items ({products.length})
            </button>
            <button
              type="button"
              onClick={() => setDiscountFilter('discounted')}
              className={`px-2.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1 ${
                discountFilter === 'discounted'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-emerald-700 hover:text-emerald-800'
              }`}
            >
              <Percent className="h-3 w-3" />
              <span>Discounted ({products.filter((p) => p.is_discount_active).length})</span>
            </button>
          </div>

          <select
            value={selectedCategory || ''}
            onChange={(e) => {
              const val = e.target.value ? Number(e.target.value) : undefined;
              setSelectedCategory(val);
              if (val) {
                setSearchParams({ category_id: String(val) });
              } else {
                setSearchParams({});
              }
            }}
            className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {selectedCategory && (
            <button
              onClick={() => {
                setSelectedCategory(undefined);
                setSearchParams({});
              }}
              className="px-2.5 py-1.5 text-xs text-gray-500 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors flex items-center gap-1"
              title="Clear category filter"
            >
              <X className="h-3.5 w-3.5" />
              <span>Clear Filter</span>
            </button>
          )}
        </div>
      </div>

      <Card>
        {isLoading ? (
          <Spinner />
        ) : products.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Package className="h-10 w-10 mx-auto text-gray-300 mb-2" />
            <p className="text-sm font-medium">No products found matching criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-gray-400 font-semibold border-b border-gray-100">
                <tr>
                  <th className="pb-3">Product / SKU</th>
                  <th className="pb-3">Category</th>
                  <th className="pb-3">Sell Price</th>
                  <th className="pb-3">Discount</th>
                  <th className="pb-3">Cost Price</th>
                  <th className="pb-3">Stock (Current / Alloc)</th>
                  <th className="pb-3">Available</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 font-medium text-gray-700">
                {products
                  .filter((p) => discountFilter === 'all' || p.is_discount_active)
                  .map((p) => {
                  const imageCount = p.images?.length || 0;

                  return (
                    <tr key={p.id} className="hover:bg-gray-50/50">
                      <td className="py-3.5">
                        <div className="flex items-center gap-3">
                          <div
                            onClick={() => {
                              if (imageCount > 0) {
                                setPreviewProduct(p);
                                setActivePhotoIdx(0);
                              }
                            }}
                            className={`w-11 h-11 rounded-xl bg-gray-100 flex-shrink-0 overflow-hidden flex items-center justify-center relative border border-gray-200 shadow-2xs ${
                              imageCount > 0 ? 'cursor-pointer hover:ring-2 hover:ring-blue-500' : ''
                            }`}
                            title={imageCount > 0 ? `Click to view all ${imageCount} photos` : 'No photos uploaded'}
                          >
                            {imageCount > 0 ? (
                              <>
                                <img
                                  src={p.images[0].image_url}
                                  alt={p.name}
                                  className="w-full h-full object-cover"
                                />
                                {imageCount > 1 && (
                                  <span className="absolute bottom-0 right-0 bg-slate-900/80 text-white text-[8px] font-bold px-1 rounded-tl">
                                    {imageCount}📷
                                  </span>
                                )}
                              </>
                            ) : (
                              <Package className="h-5 w-5 text-gray-400" />
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">{p.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="font-mono text-gray-400 text-[11px]">{p.sku}</span>
                              <span className="text-[10px] font-bold text-[#2C6291] bg-[#EBF2F7] px-1.5 py-0.2 rounded border border-[#2C6291]/20">
                                Min: {p.min_order_quantity || 1}
                              </span>
                              {imageCount > 0 && (
                                <span className="text-[10px] text-blue-600 font-medium bg-blue-50 px-1.5 py-0.2 rounded">
                                  {imageCount} {imageCount === 1 ? 'photo' : 'photos'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5">{p.category_name}</td>
                      <td className="py-3.5">
                        {p.is_discount_active ? (
                          <div>
                            <span className="line-through text-gray-400 text-[11px] block">
                              {formatCurrency(p.selling_price)}
                            </span>
                            <span className="font-black text-emerald-700">
                              {formatCurrency(p.discounted_price || p.selling_price)}
                            </span>
                          </div>
                        ) : (
                          <span className="font-bold text-gray-900">
                            {formatCurrency(p.selling_price)}
                          </span>
                        )}
                        <span className="text-[10px] text-gray-400 font-normal ml-0.5">/{p.unit_of_measure}</span>
                      </td>
                      <td className="py-3.5">
                        {p.is_discount_enabled && p.discount_percent ? (
                          <div className="space-y-0.5">
                            {p.discount_status === 'ACTIVE' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {p.discount_percent}% OFF (Active)
                              </span>
                            )}
                            {p.discount_status === 'SCHEDULED' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                {p.discount_percent}% OFF (Scheduled)
                              </span>
                            )}
                            {p.discount_status === 'EXPIRED' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                {p.discount_percent}% OFF (Expired)
                              </span>
                            )}
                            {(!p.discount_status || p.discount_status === 'DISABLED') && (
                              <span className="text-gray-400 text-[11px]">—</span>
                            )}
                            {p.discount_end_date && p.discount_status === 'ACTIVE' && (
                              <span className="text-[10px] text-gray-400 block">
                                Ends: {formatDate(p.discount_end_date)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-[11px]">—</span>
                        )}
                      </td>
                      <td className="py-3.5 font-mono text-gray-500">{formatCurrency(p.cost_price)}</td>
                      <td className="py-3.5 text-gray-500">
                        {p.current_stock} / <span className="text-amber-600">{p.allocated_stock}</span>
                      </td>
                      <td className="py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className={`font-bold ${p.is_low_stock ? 'text-amber-600' : 'text-gray-900'}`}>
                            {p.available_stock}
                          </span>
                          {p.is_low_stock && (
                            <span title="Low stock threshold reached">
                              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5">
                        <Badge variant={p.is_active ? 'green' : 'gray'}>
                          {p.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="py-3.5 text-right space-x-2">
                        <button
                          onClick={() => {
                            setEditingProduct(p);
                            setIsModalOpen(true);
                          }}
                          className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Edit Product & Photos"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="p-1 text-gray-400 hover:text-rose-600 transition-colors"
                          title="Delete Product"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Multi-Photo Viewer Modal for Admin Inspection */}
      {previewProduct && previewProduct.images?.length > 0 && (
        <Modal
          isOpen={!!previewProduct}
          onClose={() => setPreviewProduct(null)}
          title={`Photos: ${previewProduct.name} (${previewProduct.images.length}/5 photos)`}
          maxWidth="lg"
        >
          <div className="space-y-4">
            <div className="aspect-4/3 rounded-2xl overflow-hidden bg-slate-900 flex items-center justify-center border border-gray-200">
              <img
                src={previewProduct.images[activePhotoIdx]?.image_url}
                alt={previewProduct.name}
                className="w-full h-full object-contain"
              />
            </div>

            {/* Thumbnail row */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {previewProduct.images.map((img, idx) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => setActivePhotoIdx(idx)}
                  className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${
                    activePhotoIdx === idx
                      ? 'border-blue-600 ring-2 ring-blue-200 scale-105'
                      : 'border-gray-200 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={img.image_url} alt="Thumb" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>

            <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-500 font-mono">SKU: {previewProduct.sku}</span>
              <Button
                variant="outline"
                onClick={() => setPreviewProduct(null)}
              >
                Close Preview
              </Button>
            </div>
          </div>
        </Modal>
      )}

      <ProductModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          loadProducts();
          loadCategories();
        }}
        productToEdit={editingProduct}
        categories={categories}
        onCategoriesChange={loadCategories}
      />
    </div>
  );
};
