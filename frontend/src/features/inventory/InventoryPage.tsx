import React, { useEffect, useState, useMemo } from 'react';
import { adminApi } from '../../services/endpoints';
import { ProductAdmin, StockMovement } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { StockAdjustmentModal } from './StockAdjustmentModal';
import { Boxes, SlidersHorizontal, History, AlertTriangle, ArrowDownRight, ArrowUpRight, Search, Filter, Package } from 'lucide-react';

export const InventoryPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'levels' | 'movements'>('levels');
  const [stockFilter, setStockFilter] = useState<'all' | 'low_stock'>('all');
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<ProductAdmin[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProductID, setSelectedProductID] = useState<string | undefined>(undefined);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      if (activeTab === 'levels') {
        const res = await adminApi.getProducts({ limit: 100 });
        if (res.success && res.data) {
          setProducts(res.data);
        }
      } else {
        const res = await adminApi.getStockMovements({ limit: 50 });
        if (res.success && res.data) {
          setMovements(res.data);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Metrics calculated directly from live loaded products
  const totalPhysicalUnits = useMemo(() => {
    return products.reduce((acc, p) => acc + (p.current_stock || 0), 0);
  }, [products]);

  const totalInventoryValuation = useMemo(() => {
    return products.reduce((acc, p) => acc + (p.current_stock || 0) * (p.cost_price || 0), 0);
  }, [products]);

  const lowStockProductsCount = useMemo(() => {
    return products.filter((p) => (p.available_stock || 0) <= (p.low_stock_threshold || 5)).length;
  }, [products]);

  const displayedProducts = useMemo(() => {
    return products.filter((p) => {
      const isLow = (p.available_stock || 0) <= (p.low_stock_threshold || 5);
      const matchesFilter = stockFilter === 'all' || isLow;
      const q = search.toLowerCase().trim();
      const matchesSearch = !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
      return matchesFilter && matchesSearch;
    });
  }, [products, stockFilter, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Inventory & Stock Ledger</h2>
          <p className="text-xs text-gray-500">Track real-time balances, reservations, and auditable movement history</p>
        </div>
        <Button
          onClick={() => {
            setSelectedProductID(undefined);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-1.5"
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span>Manual Adjustment</span>
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('levels')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'levels'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Boxes className="h-4 w-4" />
          <span>Stock Balances</span>
        </button>
        <button
          onClick={() => setActiveTab('movements')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'movements'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <History className="h-4 w-4" />
          <span>Movement Ledger</span>
        </button>
      </div>

      {isLoading ? (
        <Spinner />
      ) : activeTab === 'levels' ? (
        <div className="space-y-6">
          {/* Top Inventory Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-xs">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total Warehouse Units</p>
              <h3 className="text-2xl font-black text-gray-900 mt-1">{totalPhysicalUnits} Units</h3>
              <p className="text-xs text-gray-500 mt-0.5">Physical items across all active SKUs</p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-xs">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Inventory Asset Valuation</p>
              <h3 className="text-2xl font-black text-purple-700 mt-1">{formatCurrency(totalInventoryValuation)}</h3>
              <p className="text-xs text-gray-500 mt-0.5">Based on unit cost price</p>
            </div>

            <div
              onClick={() => setStockFilter(stockFilter === 'low_stock' ? 'all' : 'low_stock')}
              className={`rounded-2xl border p-4 shadow-xs cursor-pointer transition-all ${
                stockFilter === 'low_stock'
                  ? 'bg-amber-500 border-amber-600 text-white shadow-amber-500/20'
                  : 'bg-white border-gray-100 hover:border-amber-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <p className={`text-[11px] font-bold uppercase tracking-wider ${stockFilter === 'low_stock' ? 'text-amber-100' : 'text-gray-400'}`}>
                  Low Stock Sentinel
                </p>
                {lowStockProductsCount > 0 && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${stockFilter === 'low_stock' ? 'bg-white text-amber-600' : 'bg-amber-100 text-amber-800'}`}>
                    Action Needed
                  </span>
                )}
              </div>
              <h3 className={`text-2xl font-black mt-1 ${stockFilter === 'low_stock' ? 'text-white' : 'text-amber-600'}`}>
                {lowStockProductsCount} Products
              </h3>
              <p className={`text-xs mt-0.5 ${stockFilter === 'low_stock' ? 'text-amber-100' : 'text-gray-500'}`}>
                Click to {stockFilter === 'low_stock' ? 'show all products' : 'filter low stock only'}
              </p>
            </div>
          </div>

          {/* Search & Stock Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search inventory by product name or SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex bg-white rounded-xl border border-gray-200 p-1 shadow-xs">
              <button
                onClick={() => setStockFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  stockFilter === 'all'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                All Items ({products.length})
              </button>
              <button
                onClick={() => setStockFilter('low_stock')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  stockFilter === 'low_stock'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-amber-700 hover:text-amber-900'
                }`}
              >
                <AlertTriangle className="h-3 w-3" />
                <span>Low Stock ({lowStockProductsCount})</span>
              </button>
            </div>
          </div>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-gray-400 font-semibold border-b border-gray-100">
                  <tr>
                    <th className="pb-3">Product / SKU</th>
                    <th className="pb-3">Current Physical Stock</th>
                    <th className="pb-3">Allocated to Orders</th>
                    <th className="pb-3">Available for Sale</th>
                    <th className="pb-3">Safety Min</th>
                    <th className="pb-3">Health Status</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 font-medium text-gray-700">
                  {displayedProducts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-gray-400">
                        <Package className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                        <p className="text-sm font-medium">No inventory items match the current filter.</p>
                      </td>
                    </tr>
                  ) : (
                    displayedProducts.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50/50">
                        <td className="py-3.5">
                          <p className="font-bold text-gray-900">{p.name}</p>
                          <p className="font-mono text-gray-400 text-[11px]">{p.sku}</p>
                        </td>
                        <td className="py-3.5 text-gray-900 font-semibold">{p.current_stock} {p.unit_of_measure}</td>
                        <td className="py-3.5 text-amber-600 font-semibold">{p.allocated_stock} {p.unit_of_measure}</td>
                        <td className="py-3.5 text-base font-extrabold text-blue-600">
                          {p.available_stock} {p.unit_of_measure}
                        </td>
                        <td className="py-3.5 text-gray-500">{p.low_stock_threshold}</td>
                        <td className="py-3.5">
                          {p.is_low_stock ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              <AlertTriangle className="h-3 w-3" /> Low Stock
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              Optimal
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 text-right">
                          <button
                            onClick={() => {
                              setSelectedProductID(p.id);
                              setIsModalOpen(true);
                            }}
                            className="px-2.5 py-1 text-xs font-semibold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                          >
                            Adjust
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-gray-400 font-semibold border-b border-gray-100">
                <tr>
                  <th className="pb-3">Timestamp</th>
                  <th className="pb-3">Type</th>
                  <th className="pb-3">Qty Delta</th>
                  <th className="pb-3">Before &rarr; After</th>
                  <th className="pb-3">Reference Document</th>
                  <th className="pb-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 font-medium text-gray-700">
                {movements.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-gray-400">
                      No stock movement history recorded yet.
                    </td>
                  </tr>
                ) : (
                  movements.map((m) => {
                    const isPositive = m.quantity_changed > 0;
                    return (
                      <tr key={m.id} className="hover:bg-gray-50/50">
                        <td className="py-3.5 text-gray-400">{formatDate(m.created_at)}</td>
                        <td className="py-3.5">
                          <Badge variant="blue">{m.movement_type}</Badge>
                        </td>
                        <td className="py-3.5">
                          <span
                            className={`inline-flex items-center gap-1 font-bold ${
                              isPositive ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                          >
                            {isPositive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                            {isPositive ? `+${m.quantity_changed}` : m.quantity_changed}
                          </span>
                        </td>
                        <td className="py-3.5 font-mono text-gray-500">
                          {m.quantity_before} &rarr; <span className="font-bold text-gray-800">{m.quantity_after}</span>
                        </td>
                        <td className="py-3.5 font-mono text-gray-800">{m.reference_id || '—'}</td>
                        <td className="py-3.5 text-gray-500 max-w-xs truncate">{m.notes || '—'}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <StockAdjustmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadData}
        products={products}
        defaultProductID={selectedProductID}
      />
    </div>
  );
};
