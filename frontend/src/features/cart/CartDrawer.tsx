import React, { useState } from 'react';
import { X, Trash2, ShoppingBag, Plus, Minus, ArrowRight } from 'lucide-react';
import { useCart } from './CartContext';
import { formatCurrency } from '../../utils/formatters';
import { Button } from '../../components/ui/Button';
import { CheckoutModal } from './CheckoutModal';

export const CartDrawer: React.FC = () => {
  const { cart, isCartOpen, setIsCartOpen, updateQuantity, removeItem } = useCart();
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  if (!isCartOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-hidden">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs transition-opacity"
          onClick={() => setIsCartOpen(false)}
        />

        <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
          <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
            {/* Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-blue-600" />
                <h3 className="text-base font-bold text-gray-900">Your Cart ({cart?.total_items || 0})</h3>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Item List */}
            <div className="flex-1 overflow-y-auto p-5 divide-y divide-gray-100">
              {!cart?.items || cart.items.length === 0 ? (
                <div className="text-center py-16 text-gray-500">
                  <ShoppingBag className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-sm font-medium">Your shopping cart is empty.</p>
                  <p className="text-xs text-gray-400 mt-1">Explore our product catalogue to add items.</p>
                </div>
              ) : (
                cart.items.map((item) => (
                  <div key={item.id} className="py-4 first:pt-0 last:pb-0 flex gap-4">
                    <div className="w-16 h-16 rounded-xl bg-gray-50 border border-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                      {item.product_image ? (
                        <img src={item.product_image} alt={item.product_name} className="w-full h-full object-cover" />
                      ) : (
                        <ShoppingBag className="h-6 w-6 text-gray-300" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-gray-900 truncate">{item.product_name}</h4>
                      <p className="text-xs text-gray-500">SKU: {item.product_sku}</p>
                      <p className="text-xs font-semibold text-blue-600 mt-1">
                        {formatCurrency(item.unit_price)} / {item.unit_of_measure}
                      </p>

                      <div className="flex items-center justify-between mt-2">
                        {/* Quantity Counter */}
                        <div className="flex items-center border border-gray-200 rounded-lg">
                          <button
                            onClick={() => item.quantity > 1 ? updateQuantity(item.id, item.quantity - 1) : removeItem(item.id)}
                            className="p-1 text-gray-500 hover:text-gray-700"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="px-2 text-xs font-bold text-gray-900">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            disabled={item.quantity >= item.available_stock}
                            className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-30"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>

                        {/* Subtotal & Delete */}
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-gray-900">{formatCurrency(item.subtotal)}</span>
                          <button
                            onClick={() => removeItem(item.id)}
                            className="text-gray-400 hover:text-rose-600 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer Summary */}
            {cart && cart.items.length > 0 && (
              <div className="p-5 border-t border-gray-100 bg-gray-50/50 space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Subtotal:</span>
                  <span className="text-base font-bold text-gray-900">{formatCurrency(cart.total_amount)}</span>
                </div>
                <Button
                  onClick={() => setIsCheckoutOpen(true)}
                  className="w-full flex items-center justify-center gap-2"
                >
                  <span>Proceed to Checkout</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => {
          setIsCheckoutOpen(false);
          setIsCartOpen(false);
        }}
      />
    </>
  );
};
