import React from 'react';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { PurchaseOrder } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { FileSpreadsheet, Package, Truck, Calendar, User, CheckCircle2, History } from 'lucide-react';

interface PODetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  po: PurchaseOrder | null;
}

export const PODetailModal: React.FC<PODetailModalProps> = ({ isOpen, onClose, po }) => {
  if (!po) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Purchase Order #${po.po_number}`} maxWidth="3xl">
      <div className="space-y-6">
        {/* Header dossier card */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-gray-50 rounded-2xl p-4 border border-gray-100">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 font-semibold mb-1">
              <Truck className="h-3.5 w-3.5 text-gray-400" /> Supplier
            </div>
            <p className="text-sm font-bold text-gray-900">{po.supplier_name}</p>
            <p className="text-xs text-gray-500 mt-1">Creator: {po.creator_name || 'Admin'}</p>
          </div>

          <div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 font-semibold mb-1">
              <Calendar className="h-3.5 w-3.5 text-gray-400" /> Expected Delivery
            </div>
            <p className="text-xs font-bold text-gray-800">{po.expected_delivery_date || 'Not specified'}</p>
            <p className="text-[11px] text-gray-400 mt-1">Issued: {formatDate(po.created_at)}</p>
          </div>

          <div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 font-semibold mb-1">
              <FileSpreadsheet className="h-3.5 w-3.5 text-gray-400" /> Procurement Status
            </div>
            <div className="mt-1">
              <Badge status={po.status} />
            </div>
            {po.notes && <p className="text-xs text-gray-500 mt-1 truncate" title={po.notes}>Note: {po.notes}</p>}
          </div>
        </div>

        {/* PO Line Items Table */}
        <div>
          <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Package className="h-4 w-4 text-blue-600" />
            <span>Ordered Products & Quantities</span>
          </h4>
          <div className="border border-gray-100 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-100">
                <tr>
                  <th className="p-3">Product Name</th>
                  <th className="p-3">SKU</th>
                  <th className="p-3 text-right">Unit Cost</th>
                  <th className="p-3 text-right">Qty Ordered</th>
                  <th className="p-3 text-right">Qty Received</th>
                  <th className="p-3 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 font-medium text-gray-700">
                {po.items && po.items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/50">
                    <td className="p-3 font-bold text-gray-900">{item.product_name}</td>
                    <td className="p-3 font-mono text-gray-500">{item.product_sku}</td>
                    <td className="p-3 text-right">{formatCurrency(item.unit_cost)}</td>
                    <td className="p-3 text-right font-bold text-gray-900">{item.quantity_ordered}</td>
                    <td className="p-3 text-right font-bold">
                      <span className={item.quantity_received >= item.quantity_ordered ? 'text-emerald-600' : 'text-amber-600'}>
                        {item.quantity_received}
                      </span>
                    </td>
                    <td className="p-3 text-right font-extrabold text-gray-900">{formatCurrency(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50/80 font-bold text-gray-900 border-t border-gray-100">
                <tr>
                  <td colSpan={5} className="p-3 text-right text-xs uppercase tracking-wider">
                    Total Order Value:
                  </td>
                  <td className="p-3 text-right text-base text-blue-600">
                    {formatCurrency(po.total_amount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Goods Receipt History Section */}
        {po.receipts && po.receipts.length > 0 && (
          <div>
            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <History className="h-4 w-4 text-emerald-600" />
              <span>Goods Receipts Received (GRN)</span>
            </h4>
            <div className="space-y-2">
              {po.receipts.map((grn) => (
                <div
                  key={grn.id}
                  className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <div>
                      <span className="font-mono font-bold text-emerald-950">{grn.receipt_number}</span>
                      <span className="text-emerald-700 ml-2">by {grn.receiver_name || 'Warehouse Staff'}</span>
                      {grn.notes && <span className="text-gray-500 italic ml-2">— "{grn.notes}"</span>}
                    </div>
                  </div>
                  <span className="text-gray-400 font-mono text-[11px]">{formatDate(grn.received_at)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
