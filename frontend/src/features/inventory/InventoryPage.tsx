import React, { useEffect, useState } from 'react';
import { adminApi } from '../../services/endpoints';
import { ProductAdmin, StockMovement } from '../../types';
import { formatDate } from '../../utils/formatters';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { StockAdjustmentModal } from './StockAdjustmentModal';
import { Boxes, SlidersHorizontal, History, AlertTriangle, ArrowDownRight, ArrowUpRight } from 'lucide-react';

export const InventoryPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'levels' | 'movements'>('levels');
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
                {products.map((p) => (
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
                        className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                      >
                        Adjust
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
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
