import React, { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { adminApi } from '../../services/endpoints';
import { Supplier, ProductAdmin } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { Plus, Trash2 } from 'lucide-react';

interface CreatePOModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  suppliers: Supplier[];
  products: ProductAdmin[];
}

export const CreatePOModal: React.FC<CreatePOModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  suppliers,
  products,
}) => {
  const [supplierID, setSupplierID] = useState(suppliers[0]?.id || '');
  const [expectedDate, setExpectedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<
    { product_id: string; quantity_ordered: number; unit_cost: number }[]
  >([{ product_id: products[0]?.id || '', quantity_ordered: 10, unit_cost: products[0]?.cost_price || 10 }]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addItemRow = () => {
    setItems([
      ...items,
      { product_id: products[0]?.id || '', quantity_ordered: 10, unit_cost: products[0]?.cost_price || 10 },
    ]);
  };

  const removeItemRow = (index: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, val: any) => {
    const copy = [...items];
    copy[index] = { ...copy[index], [field]: val };

    if (field === 'product_id') {
      const prod = products.find((p) => p.id === val);
      if (prod) {
        copy[index].unit_cost = prod.cost_price;
      }
    }
    setItems(copy);
  };

  const totalAmount = items.reduce((sum, it) => sum + it.quantity_ordered * it.unit_cost, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await adminApi.createPurchaseOrder({
        supplier_id: supplierID,
        expected_delivery_date: expectedDate || undefined,
        notes,
        items,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to create purchase order');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Issue Purchase Order" maxWidth="3xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
              Select Supplier *
            </label>
            <select
              value={supplierID}
              onChange={(e) => setSupplierID(e.target.value)}
              className="w-full rounded-lg border border-gray-300 p-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.contact_person})
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Expected Delivery Date"
            type="date"
            value={expectedDate}
            onChange={(e) => setExpectedDate(e.target.value)}
          />
        </div>

        {/* PO Line Items Table */}
        <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/50 space-y-3">
          <div className="flex justify-between items-center">
            <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Ordered Products</h4>
            <button
              type="button"
              onClick={addItemRow}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <Plus className="h-3.5 w-3.5" /> Add Product
            </button>
          </div>

          <div className="space-y-2">
            {items.map((it, idx) => (
              <div key={idx} className="flex flex-col sm:flex-row items-center gap-3 bg-white p-2.5 rounded-lg border border-gray-200/80">
                <div className="flex-1 w-full">
                  <select
                    value={it.product_id}
                    onChange={(e) => updateItem(idx, 'product_id', e.target.value)}
                    className="w-full rounded-md border border-gray-300 p-1.5 text-xs text-gray-900 focus:outline-none"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="w-full sm:w-28">
                  <input
                    type="number"
                    min="1"
                    placeholder="Qty"
                    value={it.quantity_ordered}
                    onChange={(e) => updateItem(idx, 'quantity_ordered', parseInt(e.target.value) || 1)}
                    className="w-full rounded-md border border-gray-300 p-1.5 text-xs text-gray-900"
                  />
                </div>

                <div className="w-full sm:w-32">
                  <input
                    type="number"
                    step="1"
                    min="0"
                    placeholder="Cost (Rs.)"
                    value={it.unit_cost}
                    onChange={(e) => updateItem(idx, 'unit_cost', Math.round(Number(e.target.value)) || 0)}
                    className="w-full rounded-md border border-gray-300 p-1.5 text-xs text-gray-900"
                  />
                </div>

                <div className="w-24 text-right font-bold text-xs text-gray-800">
                  {formatCurrency(it.quantity_ordered * it.unit_cost)}
                </div>

                <button
                  type="button"
                  onClick={() => removeItemRow(idx)}
                  className="p-1 text-gray-400 hover:text-rose-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-gray-200">
            <span className="text-xs text-gray-500 font-medium">Estimated Purchase Total:</span>
            <span className="text-base font-extrabold text-gray-900">{formatCurrency(totalAmount)}</span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
            Procurement Notes
          </label>
          <textarea
            rows={2}
            className="w-full rounded-lg border border-gray-300 p-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Payment terms, port/vessel reference, container ID..."
          />
        </div>

        <div className="pt-3 border-t border-gray-100 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            Submit Purchase Order
          </Button>
        </div>
      </form>
    </Modal>
  );
};
