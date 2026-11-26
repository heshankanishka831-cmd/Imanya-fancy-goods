import React, { useEffect, useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { adminApi } from '../../services/endpoints';
import { Supplier, PurchaseOrder } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Truck, Phone, Mail, MapPin, User, FileSpreadsheet, Calendar, AlertCircle } from 'lucide-react';

interface SupplierDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: Supplier | null;
}

export const SupplierDetailModal: React.FC<SupplierDetailModalProps> = ({
  isOpen,
  onClose,
  supplier,
}) => {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && supplier) {
      loadSupplierOrders(supplier.id);
    }
  }, [isOpen, supplier]);

  const loadSupplierOrders = async (supplierId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await adminApi.getPurchaseOrders({ supplier_id: supplierId, limit: 50 });
      if (res.success && res.data) {
        setOrders(res.data);
      }
    } catch (err: any) {
      console.error('Failed to load supplier orders', err);
      setError('Unable to load purchase order history for this supplier.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!supplier) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Supplier: ${supplier.name}`} maxWidth="3xl">
      <div className="space-y-6">
        {/* Profile Card */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-gray-50 rounded-2xl p-4 border border-gray-100">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 font-semibold mb-1">
              <User className="h-3.5 w-3.5 text-gray-400" /> Contact Representative
            </div>
            <p className="text-sm font-bold text-gray-900">{supplier.contact_person || '—'}</p>
            <p className="text-xs text-gray-600 font-mono mt-0.5">{supplier.phone}</p>
            {supplier.email && <p className="text-xs text-gray-400 truncate">{supplier.email}</p>}
          </div>

          <div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 font-semibold mb-1">
              <MapPin className="h-3.5 w-3.5 text-gray-400" /> Vendor Origin / Address
            </div>
            <p className="text-xs text-gray-700 leading-relaxed">{supplier.address || '—'}</p>
          </div>

          <div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 font-semibold mb-1">
              <Calendar className="h-3.5 w-3.5 text-gray-400" /> Account Status
            </div>
            <div className="mt-1">
              <Badge variant={supplier.is_active ? 'green' : 'gray'}>
                {supplier.is_active ? 'Active Channel' : 'Archived Vendor'}
              </Badge>
            </div>
            <p className="text-[11px] text-gray-400 mt-2">Registered: {formatDate(supplier.created_at)}</p>
          </div>
        </div>

        {/* Purchase Orders History Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
              <FileSpreadsheet className="h-4 w-4 text-blue-600" />
              <span>Import & Purchase Order Records</span>
            </h4>
            <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full">
              {orders.length} Order{orders.length !== 1 ? 's' : ''}
            </span>
          </div>

          {isLoading ? (
            <div className="py-8 flex justify-center">
              <Spinner />
            </div>
          ) : error ? (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-8 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200 text-gray-400">
              <FileSpreadsheet className="h-8 w-8 mx-auto text-gray-300 mb-1" />
              <p className="text-xs font-medium">No purchase orders placed with this supplier yet.</p>
            </div>
          ) : (
            <div className="border border-gray-100 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-100">
                  <tr>
                    <th className="p-3">PO Number</th>
                    <th className="p-3">Expected Date</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Total Amount</th>
                    <th className="p-3 text-right">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 font-medium text-gray-700">
                  {orders.map((po) => (
                    <tr key={po.id} className="hover:bg-gray-50/50">
                      <td className="p-3 font-mono font-bold text-gray-900">{po.po_number}</td>
                      <td className="p-3 text-gray-600">{po.expected_delivery_date || '—'}</td>
                      <td className="p-3">
                        <Badge status={po.status} />
                      </td>
                      <td className="p-3 text-right font-extrabold text-gray-900">
                        {formatCurrency(po.total_amount)}
                      </td>
                      <td className="p-3 text-right text-gray-400 font-mono text-[11px]">
                        {formatDate(po.created_at).split(',')[0]}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
