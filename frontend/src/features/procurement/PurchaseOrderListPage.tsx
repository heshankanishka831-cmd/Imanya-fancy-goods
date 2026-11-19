import React, { useEffect, useState } from 'react';
import { adminApi } from '../../services/endpoints';
import { PurchaseOrder, Supplier, ProductAdmin } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { CreatePOModal } from './CreatePOModal';
import { GoodsReceiptModal } from './GoodsReceiptModal';
import { Plus, FileSpreadsheet, PackageCheck, CheckCircle } from 'lucide-react';

export const PurchaseOrderListPage: React.FC = () => {
  const [pos, setPOs] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<ProductAdmin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [receivingPO, setReceivingPO] = useState<PurchaseOrder | null>(null);

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
      const res = await adminApi.getPurchaseOrders({ limit: 50 });
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

      <Card>
        {isLoading ? (
          <Spinner />
        ) : pos.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <FileSpreadsheet className="h-10 w-10 mx-auto text-gray-300 mb-2" />
            <p className="text-sm font-medium">No purchase orders created yet.</p>
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
                {pos.map((po) => (
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
                    <td className="py-3.5 text-right space-x-2">
                      {po.status === 'DRAFT' && (
                        <button
                          onClick={() => handleUpdateStatus(po.id, 'ORDERED')}
                          className="px-2.5 py-1 text-xs font-semibold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
                        >
                          Mark Ordered
                        </button>
                      )}

                      {(po.status === 'ORDERED' || po.status === 'PARTIALLY_RECEIVED') && (
                        <button
                          onClick={() => setReceivingPO(po)}
                          className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 inline-flex items-center gap-1"
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
    </div>
  );
};
