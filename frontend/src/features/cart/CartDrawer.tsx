import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Trash2, ShoppingBag, Plus, Minus, ArrowRight, Truck, CheckCircle2, MessageSquare, AlertTriangle } from 'lucide-react';
import { useCart } from './CartContext';
import { formatCurrency } from '../../utils/formatters';
import { CheckoutModal } from './CheckoutModal';

export const CartDrawer: React.FC = () => {
  const { cart, isCartOpen, setIsCartOpen, updateQuantity, removeItem } = useCart();
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isCartOpen && !isCheckoutOpen) {
        setIsCartOpen(false);
      }
    };
    if (isCartOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCartOpen, isCheckoutOpen, setIsCartOpen]);

  if (!isCartOpen) return null;

  const freeShippingThreshold = 25000;
  const currentTotal = cart?.total_amount || 0;
  const progressPercent = Math.min(100, Math.round((currentTotal / freeShippingThreshold) * 100));
  const remainingForFreeShipping = Math.max(0, freeShippingThreshold - currentTotal);
  const qualifiesForFreeShipping = currentTotal >= freeShippingThreshold;

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-hidden">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
          onClick={() => setIsCartOpen(false)}
        />

        <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
          <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-300">
            {/* 1. Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-[#EBF2F7] text-[#2C6291] flex items-center justify-center">
                  <ShoppingBag className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Your Shopping Cart ({cart?.total_items || 0})
                  </h3>
                  <p className="text-[11px] text-slate-400">Order verification via WhatsApp</p>
                </div>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                title="Close Cart"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Free Shipping Progress Bar */}
            {cart && cart.items.length > 0 && (
              <div className="bg-[#EBF2F7] border-b border-[#2C6291]/15 px-5 py-3">
                <div className="flex items-center justify-between text-xs mb-1.5 font-bold">
                  <div className="flex items-center gap-1.5 text-[#2C6291]">
                    <Truck className="h-4 w-4" />
                    {qualifiesForFreeShipping ? (
                      <span className="text-[#6F9128] flex items-center gap-1 font-black">
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#9AC640]" />
                        Free Islandwide Shipping Unlocked!
                      </span>
                    ) : (
                      <span>
                        Add <strong className="text-slate-900">{formatCurrency(remainingForFreeShipping)}</strong> for Free Shipping
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-mono text-slate-500 font-bold">{progressPercent}%</span>
                </div>
                <div className="w-full bg-white rounded-full h-2 overflow-hidden border border-[#2C6291]/20">
                  <div
                    className="h-full bg-gradient-to-r from-[#2C6291] via-[#4C9091] to-[#9AC640] rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            )}

            {/* 2. Item List */}
            <div className="flex-1 overflow-y-auto p-5 divide-y divide-slate-100">
              {!cart?.items || cart.items.length === 0 ? (
                <div className="text-center py-20 text-slate-400">
                  <ShoppingBag className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                  <p className="text-sm font-bold text-slate-700">Your shopping cart is empty</p>
                  <p className="text-xs text-slate-400 mt-1">Explore our store catalog to add items.</p>
                </div>
              ) : (
                cart.items.map((item) => (
                  <div key={item.id} className="py-4 first:pt-0 last:pb-0 flex gap-4">
                    {/* Thumbnail */}
                    <div className="w-16 h-16 rounded-xl bg-slate-50 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                      {item.product_image ? (
                        <img src={item.product_image} alt={item.product_name} className="w-full h-full object-cover" />
                      ) : (
                        <ShoppingBag className="h-6 w-6 text-slate-300" />
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">{item.product_name}</h4>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">SKU: {item.product_sku}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {item.is_discount_active || (item.original_price && item.original_price > item.unit_price) ? (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs text-slate-400 line-through">
                              {formatCurrency(item.original_price || item.unit_price)}
                            </span>
                            <span className="text-xs font-black text-emerald-700">
                              {formatCurrency(item.unit_price)}
                            </span>
                            {item.discount_percent ? (
                              <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded">
                                {item.discount_percent}% OFF
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-xs font-bold text-[#2C6291]">
                            {formatCurrency(item.unit_price)} <span className="text-[10px] text-slate-400 font-normal">/{item.unit_of_measure}</span>
                          </span>
                        )}
                        {(item.min_order_quantity || 1) > 1 && (
                          <span className="text-[10px] font-bold text-[#2C6291] bg-[#EBF2F7] px-1.5 py-0.5 rounded border border-[#2C6291]/20">
                            Min: {item.min_order_quantity}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-2.5">
                        {/* Quantity Stepper */}
                        <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50">
                          <button
                            type="button"
                            onClick={() => {
                              const minQty = item.min_order_quantity || 1;
                              if (item.quantity > minQty) {
                                updateQuantity(item.id, item.quantity - 1);
                              }
                            }}
                            disabled={item.quantity <= (item.min_order_quantity || 1)}
                            className="p-1 text-slate-500 hover:text-slate-800 disabled:opacity-30 transition-colors"
                            title={item.quantity <= (item.min_order_quantity || 1) ? `Minimum purchase quantity is ${item.min_order_quantity || 1}` : 'Decrease'}
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="px-2.5 text-xs font-bold text-slate-900">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            disabled={item.quantity >= item.available_stock}
                            className="p-1 text-slate-500 hover:text-slate-800 disabled:opacity-30 transition-colors"
                            title="Increase"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>

                        {/* Line Total & Remove */}
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold text-slate-900">{formatCurrency(item.subtotal)}</span>
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="text-slate-400 hover:text-rose-600 transition-colors"
                            title="Remove from Cart"
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

            {/* 3. Footer Summary & Proceed to Checkout */}
            {cart && cart.items.length > 0 && (
              <div className="p-5 border-t border-slate-200 bg-white space-y-3.5 shadow-lg">
                <div className="space-y-1.5 text-xs">
                  {cart.total_savings && cart.total_savings > 0 ? (
                    <>
                      <div className="flex justify-between items-center text-slate-500">
                        <span>Original Total:</span>
                        <span className="line-through text-slate-400">
                          {formatCurrency(cart.original_total || (cart.total_amount + cart.total_savings))}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-emerald-700 font-bold bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                        <span>Discount Savings:</span>
                        <span>-{formatCurrency(cart.total_savings)}</span>
                      </div>
                    </>
                  ) : null}
                  <div className="flex justify-between items-center text-slate-500">
                    <span>Cart Items ({cart.total_items}):</span>
                    <span className="font-semibold text-slate-800">{formatCurrency(cart.total_amount)}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-500">
                    <span>Islandwide Delivery:</span>
                    <span className={`font-bold ${qualifiesForFreeShipping ? 'text-[#6F9128]' : 'text-slate-700'}`}>
                      {qualifiesForFreeShipping ? 'FREE' : 'Calculated at Courier Dispatch'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-slate-900 font-black">
                    <span className="text-sm">Net Total Payable:</span>
                    <span className="text-xl text-[#2C6291]">{formatCurrency(cart.total_amount)}</span>
                  </div>
                </div>

                {cart.items.some((it) => it.quantity < (it.min_order_quantity || 1)) && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-[11px] leading-relaxed">
                      One or more items in your cart do not meet their wholesale minimum order quantity. Please increase quantities to proceed.
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  disabled={cart.items.some((it) => it.quantity < (it.min_order_quantity || 1))}
                  onClick={() => {
                    setIsCartOpen(false);
                    navigate('/checkout');
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-[#2C6291] hover:bg-[#1C4263] disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-extrabold text-xs sm:text-sm shadow-md shadow-[#2C6291]/25 transition-all hover:scale-[1.01] active:scale-95"
                >
                  <ShoppingBag className="h-4 w-4" />
                  <span>Proceed to Checkout</span>
                  <ArrowRight className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  disabled={cart.items.some((it) => it.quantity < (it.min_order_quantity || 1))}
                  onClick={() => setIsCheckoutOpen(true)}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/30 disabled:opacity-40 disabled:cursor-not-allowed text-[#128C7E] font-bold text-xs transition-colors"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>Quick WhatsApp Modal</span>
                </button>

                <p className="text-center text-[10px] text-slate-400">
                  🔒 Bank Transfer & Direct WhatsApp Slip Verification
                </p>
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
