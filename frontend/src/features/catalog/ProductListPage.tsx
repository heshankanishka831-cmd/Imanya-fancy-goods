import React, { useEffect, useState } from 'react';
import { adminApi } from '../../services/endpoints';
import { ProductAdmin, Category } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { ProductModal } from './ProductModal';
import { Plus, Edit2, Trash2, Search, Package, AlertTriangle } from 'lucide-react';

export const ProductListPage: React.FC = () => {
  const [products, setProducts] = useState<ProductAdmin[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>(undefined);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductAdmin | null>(null);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadProducts();
  }, [selectedCategory, search]);

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
        search: search || undefined,
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
      await loadProducts();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to delete product');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Wholesale Catalogue</h2>
          <p className="text-xs text-gray-500">Manage SKUs, wholesale pricing, cost prices, and stock indicators</p>
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

        <select
          value={selectedCategory || ''}
          onChange={(e) => setSelectedCategory(e.target.value ? Number(e.target.value) : undefined)}
          className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
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
                  <th className="pb-3">Cost Price</th>
                  <th className="pb-3">Stock (Current / Alloc)</th>
                  <th className="pb-3">Available</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 font-medium text-gray-700">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/50">
                    <td className="py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden flex items-center justify-center">
                          {p.images?.length > 0 ? (
                            <img src={p.images[0].image_url} alt={p.name} className="w-full h-full object-cover" />
                          ) : (
                            <Package className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{p.name}</p>
                          <p className="font-mono text-gray-400 text-[11px]">{p.sku}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5">{p.category_name}</td>
                    <td className="py-3.5 font-bold text-gray-900">
                      {formatCurrency(p.selling_price)}
                      <span className="text-[10px] text-gray-400 font-normal ml-0.5">/{p.unit_of_measure}</span>
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
                        title="Edit Product"
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

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
