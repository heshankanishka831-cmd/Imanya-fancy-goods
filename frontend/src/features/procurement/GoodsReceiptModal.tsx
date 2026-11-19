import React, { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { adminApi } from '../../services/endpoints';
import { PurchaseOrder } from '../../types';

interface GoodsReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  po: PurchaseOrder;
}

export const GoodsReceiptModal: React.FC<GoodsReceiptModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  po,
}) => {
  const [receiptItems, setReceiptItems] = useState(
    po.items.map((it) => ({
      product_id: it.product_id,
      product_name: it.product_name,
      product_sku: it.product_sku,
      quantity_ordered: it.quantity_ordered,
      quantity_already_received: it.quantity_received,
      remaining: it.quantity_ordered - it.quantity_received,
      quantity_received: it.quantity_ordered - it.quantity_received, // default to remaining
    }))
  );
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleQtyChange = (index: number, val: number) => {
    const copy = [...receiptItems];
    copy[index].quantity_received = val;
    setReceiptItems(copy);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Filter only items with > 0 received
    const itemsToReceive = receiptItems
      .filter((it) => it.quantity_received > 0)
      .map((it) => ({
        product_id: it.product_id,
        quantity_received: it.quantity_received,
      }));

    if (itemsToReceive.length === 0) {
      setError('Please specify a received quantity greater than zero for at least one item');
      setIsLoading(false);
      return;
    }

    try {
      await adminApi.createGoodsReceipt({
        purchase_order_id: po.id,
        notes,
        items: itemsToReceive,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to record goods receiving');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Receive Goods - ${po.po_number}`} maxWidth="2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
            {error}
          </div>
        )}

        <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-600 border border-gray-100 flex justify-between">
          <span>Supplier: <strong className="text-gray-900">{po.supplier_name}</strong></span>
          <span>Status: <strong className="text-blue-600">{po.status}</strong></span>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
            Verify Quantities Unloaded & Inspected
          </label>
          <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
            {receiptItems.map((it, idx) => (
              <div key={it.product_id} className="p-3 bg-white flex items-center justify-between gap-4">
                <div className="flex-1">
                  <p className="text-xs font-bold text-gray-900">{it.product_name}</p>
                  <p className="text-[11px] text-gray-400 font-mono">
                    Ordered: {it.quantity_ordered} | Already Recv: {it.quantity_already_received} | Remaining: {it.remaining}
                  </p>
                </div>

                <div className="w-32">
                  <input
                    type="number"
                    min="0"
                    max={it.remaining}
                    value={it.quantity_received}
                    onChange={(e) => handleQtyChange(idx, parseInt(e.target.value) || 0)}
                    disabled={it.remaining <= 0}
                    className="w-full rounded-md border border-gray-300 p-1.5 text-xs text-gray-900 text-right font-bold disabled:bg-gray-100"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
            Receiving Notes / Quality Inspection Notes
          </label>
          <textarea
            rows={2}
            className="w-full rounded-lg border border-gray-300 p-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Condition of shipment, batch numbers, temperature logs..."
          />
        </div>

        <div className="pt-3 border-t border-gray-100 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            Confirm Goods Inward & Increase Stock
          </Button>
        </div>
      </form>
    </Modal>
  );
};
