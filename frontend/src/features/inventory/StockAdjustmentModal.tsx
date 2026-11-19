import React, { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { adminApi } from '../../services/endpoints';
import { ProductAdmin } from '../../types';

interface StockAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  products: ProductAdmin[];
  defaultProductID?: string;
}

export const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  products,
  defaultProductID,
}) => {
  const [productID, setProductID] = useState(defaultProductID || (products[0]?.id || ''));
  const [qty, setQty] = useState<number>(0);
  const [reason, setReason] = useState('DAMAGE');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (qty === 0) {
      setError('Adjustment quantity cannot be zero');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await adminApi.adjustStock({
        product_id: productID,
        quantity_changed: Number(qty),
        reason,
        notes,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to record stock adjustment');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manual Stock Adjustment">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
            Target Product *
          </label>
          <select
            value={productID}
            onChange={(e) => setProductID(e.target.value)}
            className="w-full rounded-lg border border-gray-300 p-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.sku}) — Available: {p.available_stock}
              </option>
            ))}
          </select>
        </div>

        <Input
          label="Quantity Delta (+ for Increase, - for Deduction) *"
          type="number"
          required
          value={qty}
          onChange={(e) => setQty(parseInt(e.target.value) || 0)}
          helperText="Use positive numbers to add stock, negative numbers to write off stock."
        />

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
            Adjustment Reason Code *
          </label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-lg border border-gray-300 p-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="DAMAGE">Damaged Goods / Spoilage</option>
            <option value="COUNT_ERROR">Physical Inventory Recount Error</option>
            <option value="RETURN">Customer Return Restock</option>
            <option value="EXPIRED">Expired Batch</option>
            <option value="OTHER">Other Administrative Reason</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
            Audit Documentation / Notes
          </label>
          <textarea
            rows={2}
            className="w-full rounded-lg border border-gray-300 p-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Reference incident ticket, recount slip, or disposal note..."
          />
        </div>

        <div className="pt-3 border-t border-gray-100 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            Record Adjustment
          </Button>
        </div>
      </form>
    </Modal>
  );
};
