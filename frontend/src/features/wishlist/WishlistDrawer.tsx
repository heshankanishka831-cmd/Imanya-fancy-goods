import React, { useEffect } from 'react';
import { X, Heart, Trash2, ShoppingBag, ShoppingCart, ArrowRight } from 'lucide-react';
import { useWishlist } from './WishlistContext';
import { useCart } from '../cart/CartContext';
import { formatCurrency } from '../../utils/formatters';

export const WishlistDrawer: React.FC = () => {
  const { wishlist, isWishlistOpen, setIsWishlistOpen, removeFromWishlist, clearWishlist } = useWishlist();
  const { addToCart } = useCart();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isWishlistOpen) {
        setIsWishlistOpen(false);
      }
    };
    if (isWishlistOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isWishlistOpen, setIsWishlistOpen]);

  if (!isWishlistOpen) return null;

  const handleMoveToCart = async (product: any) => {
    try {
      const minQty = Math.max(1, product.min_order_quantity || 1);
      await addToCart(product.id, minQty);
      removeFromWishlist(product.id);
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || 'Unable to move item to cart.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden font-sans">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={() => setIsWishlistOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-300">
          {/* Header */}
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
                <Heart className="h-5 w-5 fill-rose-500 text-rose-500" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Saved Wishlist ({wishlist.length})
                </h3>
                <p className="text-[11px] text-slate-400">Save items for quick store re-ordering</p>
              </div>
            </div>
            <button
              onClick={() => setIsWishlistOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              title="Close Wishlist"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Item List */}
          <div className="flex-1 overflow-y-auto p-5 divide-y divide-slate-100">
            {wishlist.length === 0 ? (
              <div className="text-center py-20 text-slate-400">
                <Heart className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                <p className="text-sm font-bold text-slate-700">Your wishlist is empty</p>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
                  Click the heart icon on any product in our catalog to save it for easy access.
                </p>
              </div>
            ) : (
              wishlist.map((item) => {
                const mainImg = item.images?.[0]?.image_url || '';
                return (
                  <div key={item.id} className="py-4 first:pt-0 last:pb-0 flex gap-4">
                    {/* Thumbnail */}
                    <div className="w-16 h-16 rounded-xl bg-slate-50 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                      {mainImg ? (
                        <img
                          src={mainImg}
                          alt={item.name}
                          loading="lazy"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = '/logo.png';
                            (e.currentTarget as HTMLImageElement).className = 'w-8 h-8 object-contain opacity-40 mx-auto';
                          }}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ShoppingBag className="h-6 w-6 text-slate-300" />
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">{item.name}</h4>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">SKU: {item.sku}</p>
                      {(() => {
                        const isDisc = Boolean(item.is_discount_active);
                        const effPrice =
                          isDisc && item.discounted_price !== undefined && item.discounted_price > 0
                            ? item.discounted_price
                            : item.selling_price;
                        return (
                          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                            {isDisc && (
                              <span className="text-[11px] text-slate-400 line-through">
                                {formatCurrency(item.selling_price)}
                              </span>
                            )}
                            <span
                              className={`text-xs font-bold ${
                                isDisc ? 'text-emerald-700' : 'text-[#2C6291]'
                              }`}
                            >
                              {formatCurrency(effPrice)}{' '}
                              <span className="text-[10px] text-slate-400 font-normal">/{item.unit_of_measure}</span>
                            </span>
                            {isDisc && Number(item.discount_percent || 0) > 0 && (
                              <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                                {item.discount_percent}% OFF
                              </span>
                            )}
                          </div>
                        );
                      })()}

                      <div className="flex items-center justify-between mt-2.5">
                        <button
                          type="button"
                          onClick={() => handleMoveToCart(item)}
                          disabled={!item.in_stock}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2C6291] hover:bg-[#235077] disabled:bg-slate-100 disabled:text-slate-400 text-white font-bold text-xs shadow-2xs transition-all active:scale-95"
                        >
                          <ShoppingCart className="h-3.5 w-3.5" />
                          <span>{item.in_stock ? 'Move to Cart' : 'Out of Stock'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => removeFromWishlist(item.id)}
                          className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                          title="Remove from Wishlist"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {wishlist.length > 0 && (
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <button
                type="button"
                onClick={clearWishlist}
                className="text-xs text-rose-600 hover:text-rose-700 font-bold transition-colors"
              >
                Clear All
              </button>

              <button
                type="button"
                onClick={() => setIsWishlistOpen(false)}
                className="inline-flex items-center gap-1 text-xs text-[#2C6291] font-bold hover:underline"
              >
                <span>Continue Shopping</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
