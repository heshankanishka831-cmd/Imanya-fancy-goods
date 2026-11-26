import React, { useEffect, useState, useMemo } from 'react';
import { adminApi } from '../../services/endpoints';
import { PurchaseOrder, Supplier, ProductAdmin } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { CreatePOModal } from './CreatePOModal';
import { GoodsReceiptModal } from './GoodsReceiptModal';
import { PODetailModal } from './PODetailModal';
import { Plus, FileSpreadsheet, PackageCheck, CheckCircle, Search, Eye } from 'lucide-react';

export const PurchaseOrderListPage: React.FC = () => {
  const [pos, setPOs] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<ProductAdmin[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [receivingPO, setReceivingPO] = useState<PurchaseOrder | null>(null);
  const [inspectingPO, setInspectingPO] = useState<PurchaseOrder | null>(null);

  useEffect(() => {
    loadDependencies();
    loadPOs();
  }, []);

  const loadDependencies = async () => {
    try {
      const [supRes, prodRes] = await Promise.all([
        adminApi.getSuppliers({ limit: 100 }),
        adminApi.getProducts({ limit: 100 }),
      ]);
      if (supRes.data) setSuppliers(supRes.data);
      if (prodRes.data) setProducts(prodRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadPOs = async () => {
    try {
      setIsLoading(true);
      const res = await adminApi.getPurchaseOrders({ limit: 100 });
      if (res.success && res.data) {
        setPOs(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await adminApi.updatePOStatus(id, newStatus);
      await loadPOs();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to update status');
    }
  };

  const filteredPOs = useMemo(() => {
    return pos.filter((po) => {
      const matchesStatus = !statusFilter || po.status === statusFilter;
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        po.po_number.toLowerCase().includes(q) ||
        (po.supplier_name && po.supplier_name.toLowerCase().includes(q)) ||
        (po.creator_name && po.creator_name.toLowerCase().includes(q));
      return matchesStatus && matchesSearch;
    });
  }, [pos, search, statusFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Purchase Orders & Import Receiving</h2>
          <p className="text-xs text-gray-500">Manage supplier purchasing, PO line items, and goods receiving stock movements</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="flex items-center gap-1.5">
          <Plus className="h-4 w-4" />
          <span>New Purchase Order</span>
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by PO number or supplier name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Statuses</option>
          <option value="DRAFT">DRAFT</option>
          <option value="ORDERED">ORDERED</option>
          <option value="PARTIALLY_RECEIVED">PARTIALLY_RECEIVED</option>
          <option value="COMPLETED">COMPLETED</option>
          <option value="CANCELLED">CANCELLED</option>
        </select>
      </div>

      <Card>
        {isLoading ? (
          <Spinner />
        ) : filteredPOs.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <FileSpreadsheet className="h-10 w-10 mx-auto text-gray-300 mb-2" />
            <p className="text-sm font-medium">No purchase orders found matching criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-gray-400 font-semibold border-b border-gray-100">
                <tr>
                  <th className="pb-3">PO Number</th>
                  <th className="pb-3">Supplier</th>
                  <th className="pb-3">Total Amount</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Expected Date</th>
                  <th className="pb-3">Created By</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 font-medium text-gray-700">
                {filteredPOs.map((po) => (
                  <tr key={po.id} className="hover:bg-gray-50/50">
                    <td className="py-3.5 font-bold text-gray-900 font-mono">{po.po_number}</td>
                    <td className="py-3.5 font-medium text-gray-800">{po.supplier_name}</td>
                    <td className="py-3.5 font-extrabold text-gray-900">{formatCurrency(po.total_amount)}</td>
                    <td className="py-3.5">
                      <Badge status={po.status} />
                    </td>
                    <td className="py-3.5 text-gray-500">
                      {po.expected_delivery_date ? formatDate(po.expected_delivery_date).split(',')[0] : '—'}
                    </td>
                    <td className="py-3.5 text-gray-500">{po.creator_name}</td>
                    <td className="py-3.5 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => setInspectingPO(po)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                        title="Inspect PO Line Items & Receipts"
                      >
                        <Eye className="h-3.5 w-3.5 text-slate-500" />
                        <span>Inspect</span>
                      </button>

                      {po.status === 'DRAFT' && (
                        <button
                          onClick={() => handleUpdateStatus(po.id, 'ORDERED')}
                          className="px-2.5 py-1 text-xs font-semibold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          Mark Ordered
                        </button>
                      )}

                      {(po.status === 'ORDERED' || po.status === 'PARTIALLY_RECEIVED') && (
                        <button
                          onClick={() => setReceivingPO(po)}
                          className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 inline-flex items-center gap-1 transition-colors"
                        >
                          <PackageCheck className="h-3.5 w-3.5" />
                          <span>Receive Goods</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <CreatePOModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={loadPOs}
        suppliers={suppliers}
        products={products}
      />

      {receivingPO && (
        <GoodsReceiptModal
          isOpen={!!receivingPO}
          onClose={() => setReceivingPO(null)}
          onSuccess={loadPOs}
          po={receivingPO}
        />
      )}

      <PODetailModal
        isOpen={!!inspectingPO}
        onClose={() => setInspectingPO(null)}
        po={inspectingPO}
      />
    </div>
  );
};
