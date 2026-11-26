import React, { useState, useEffect } from 'react';
import { Product } from '../../../types';
import { formatCurrency, formatDate } from '../../../utils/formatters';
import { publicApi } from '../../../services/endpoints';
import { Modal } from '../../../components/ui/Modal';
import {
  Package,
  Check,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  ShoppingCart,
  MessageSquare,
  Heart,
  Star,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { useWishlist } from '../../wishlist/WishlistContext';

interface ProductQuickViewModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (product: Product, quantity: number) => Promise<void>;
  relatedProducts?: Product[];
  onSelectProduct?: (product: Product) => void;
}

export const ProductQuickViewModal: React.FC<ProductQuickViewModalProps> = ({
  product,
  isOpen,
  onClose,
  onAddToCart,
  relatedProducts = [],
  onSelectProduct,
}) => {
  const [liveProduct, setLiveProduct] = useState<Product | null>(product);
  const [photoIdx, setPhotoIdx] = useState(0);
  const [imageError, setImageError] = useState(false);
  const [qty, setQty] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const { toggleWishlist, isInWishlist } = useWishlist();

  useEffect(() => {
    setLiveProduct(product);
    if (product) {
      setPhotoIdx(0);
      setImageError(false);
      setQty(Math.max(1, product.min_order_quantity || 1));
      setAddError(null);
    }
  }, [product]);

  // Always refresh single product details from backend on modal open so discounts & stock are real-time
  useEffect(() => {
    if (!isOpen || !product?.id) return;
    let cancelled = false;
    publicApi
      .getProduct(product.id)
      .then((res) => {
        if (!cancelled && res.success && res.data) {
          setLiveProduct(res.data);
        }
      })
      .catch(() => {
        // Keep passed product snapshot on transient fetch errors
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, product?.id]);

  useEffect(() => {
    setImageError(false);
  }, [photoIdx]);

  const activeProduct = liveProduct || product;
  if (!activeProduct) return null;

  const isWishlisted = isInWishlist(activeProduct.id);
  const images = activeProduct.images || [];
  const imageCount = images.length;
  const availStock =
    activeProduct.available_stock !== undefined
      ? activeProduct.available_stock
      : activeProduct.in_stock
      ? 100
      : 0;
  const minQty = Math.max(1, activeProduct.min_order_quantity || 1);
  const isDiscountActive = Boolean(activeProduct.is_discount_active);
  const effectivePrice =
    isDiscountActive && activeProduct.discounted_price !== undefined && activeProduct.discounted_price > 0
      ? activeProduct.discounted_price
      : activeProduct.selling_price;
  const discountSavings =
    isDiscountActive && activeProduct.discount_amount !== undefined
      ? activeProduct.discount_amount
      : Math.max(0, activeProduct.selling_price - effectivePrice);

  const addPackQuantity = (packSize: number) => {
    setAddError(null);
    setQty((prev) => {
      const base = prev < minQty ? minQty : prev;
      let nextVal = base + packSize;
      if (availStock > 0 && nextVal > availStock) {
        nextVal = availStock;
      }
      return Math.max(minQty, nextVal);
    });
  };

  const handleAdd = async () => {
    try {
      setIsAdding(true);
      setAddError(null);
      await onAddToCart(activeProduct, qty);
      onClose();
    } catch (err: any) {
      setAddError(
        err?.response?.data?.error?.message ||
          err?.message ||
          'Failed to add item to cart. Please try again.'
      );
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`SKU: ${activeProduct.sku} — ${activeProduct.name}`}
      maxWidth="3xl"
    >
      <div className="space-y-6 p-1">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Side: High-Definition Image Showcase & Thumbnails */}
          <div className="space-y-3">
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-slate-50 p-4 flex items-center justify-center border border-slate-200">
              {isDiscountActive && Number(activeProduct.discount_percent || 0) > 0 && (
                <div className="absolute top-3 left-3 z-10 inline-flex items-center px-2.5 py-1 rounded-full bg-rose-600 text-white text-[11px] font-black shadow-sm">
                  {activeProduct.discount_percent}% OFF
                </div>
              )}
              {!imageError && imageCount > 0 ? (
                <img
                  src={images[photoIdx]?.image_url}
                  alt={activeProduct.name}
                  onError={() => setImageError(true)}
                  className="w-full h-full object-contain"
                />
              ) : (
              <div className="flex flex-col items-center justify-center gap-1.5 text-slate-300">
                <Package className="h-16 w-16" />
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  No Image Available
                </span>
              </div>
            )}

            {/* Left/Right Previous/Next Controls */}
            {imageCount > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setPhotoIdx((prev) => (prev === 0 ? imageCount - 1 : prev - 1))}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors"
                  title="Previous Photo"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPhotoIdx((prev) => (prev === imageCount - 1 ? 0 : prev + 1))}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors"
                  title="Next Photo"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </>
            )}

            {/* Photo Counter */}
            {imageCount > 0 && (
              <div className="absolute bottom-2.5 right-2.5 bg-black/75 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                {photoIdx + 1} / {imageCount}
              </div>
            )}
          </div>

          {/* Thumbnails Row (Up to 5 Photos) */}
          {imageCount > 1 && (
            <div className="flex gap-2 justify-center overflow-x-auto pb-1">
              {images.map((img, idx) => (
                <button
                  key={img.id || idx}
                  type="button"
                  onClick={() => setPhotoIdx(idx)}
                  className={`w-14 h-14 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${
                    photoIdx === idx
                      ? 'border-[#2C6291] ring-2 ring-[#2C6291]/20 scale-105'
                      : 'border-slate-200 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={img.image_url} alt="Thumbnail" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Side: Specifications & Order Controls */}
        <div className="flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            {/* Category & Item Code */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#2C6291] uppercase tracking-wider bg-[#EBF2F7] px-2.5 py-0.5 rounded-md border border-[#2C6291]/20">
                {activeProduct.category_name}
              </span>
              <span className="text-xs font-mono text-slate-500">
                Item Code: <strong>{activeProduct.sku}</strong>
              </span>
            </div>

            {/* Product Title */}
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-lg font-extrabold text-slate-900 leading-snug">
                {activeProduct.name}
              </h3>
              <button
                type="button"
                onClick={() => toggleWishlist(activeProduct)}
                className={`p-2 rounded-xl border transition-all shrink-0 active:scale-95 ${
                  isWishlisted
                    ? 'bg-rose-50 text-rose-500 border-rose-200'
                    : 'bg-slate-50 text-slate-400 hover:text-rose-500 border-slate-200'
                }`}
                title={isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
              >
                <Heart className={`h-4 w-4 ${isWishlisted ? 'fill-rose-500' : ''}`} />
              </button>
            </div>

            {/* Rating Stars (PITOR Style) */}
            <div className="flex items-center gap-1.5">
              <div className="flex text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <span className="text-xs font-semibold text-slate-500">
                4.8 / 5.0 (Verified Store Reviews)
              </span>
            </div>

            {/* Stock Availability */}
            <div className="flex items-center gap-2">
              {availStock > 0 ? (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-[#6F9128] bg-[#F4F9EC] px-2.5 py-1 rounded-lg border border-[#9AC640]/40">
                  <Check className="h-3 w-3 text-[#9AC640]" /> In Stock ({availStock} Available)
                </span>
              ) : (
                <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                  Out of Stock
                </span>
              )}
              <span className="text-xs text-slate-400">Unit: {activeProduct.unit_of_measure}</span>
            </div>

            {/* Minimum Order Quantity Notice */}
            {minQty > 1 && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#EBF2F7] border border-[#2C6291]/20 text-[#1C4263] text-xs">
                <span className="font-bold">Minimum Order Quantity:</span>
                <span className="font-extrabold text-[#2C6291] bg-white px-2 py-0.5 rounded-md border border-[#2C6291]/20">
                  {minQty} {activeProduct.unit_of_measure}s
                </span>
                <span className="text-[11px] text-[#235077]">Required wholesale minimum</span>
              </div>
            )}

            {/* Unit Price Box */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-400 block uppercase font-semibold">
                {isDiscountActive ? 'Discounted Price' : 'Unit Price'}
              </span>
              {isDiscountActive ? (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-slate-400 line-through">
                      {formatCurrency(activeProduct.selling_price)}
                    </span>
                    <span className="text-xs font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                      You Save: {formatCurrency(discountSavings)} ({activeProduct.discount_percent}% OFF)
                    </span>
                  </div>
                  <div className="text-2xl font-black text-emerald-700">
                    {formatCurrency(effectivePrice)}
                    <span className="text-xs font-normal text-slate-500 ml-1">
                      per {activeProduct.unit_of_measure}
                    </span>
                  </div>
                  {activeProduct.discount_end_date && (
                    <div className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                      <Clock className="h-3 w-3" />
                      <span>Offer valid until {formatDate(activeProduct.discount_end_date)}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-2xl font-black text-slate-900">
                  {formatCurrency(activeProduct.selling_price)}
                  <span className="text-xs font-normal text-slate-500 ml-1">
                    per {activeProduct.unit_of_measure}
                  </span>
                </div>
              )}
            </div>

            {/* Description */}
            {activeProduct.description && (
              <div>
                <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Product Description
                </h5>
                <p className="text-xs text-slate-600 leading-relaxed max-h-32 overflow-y-auto pr-1">
                  {activeProduct.description}
                </p>
              </div>
            )}
          </div>

          {/* Purchasing Controls */}
          <div className="pt-3 border-t border-slate-100 space-y-3">
            {addError && (
              <div className="flex items-start gap-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{addError}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Order Quantity:</span>
              <span className="text-xs font-bold text-[#2C6291]">
                Total: {formatCurrency(effectivePrice * qty)}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {/* Stepper */}
              <div className="flex items-center border border-slate-300 rounded-xl bg-white p-1">
                <button
                  type="button"
                  onClick={() => setQty(Math.max(minQty, qty - 1))}
                  disabled={qty <= minQty}
                  className="p-1.5 text-slate-600 hover:text-slate-900 disabled:opacity-30"
                  title={qty <= minQty ? `Minimum purchase quantity is ${minQty}` : 'Decrease'}
                >
                  <Minus className="h-4 w-4" />
                </button>
                <input
                  type="number"
                  min={minQty}
                  value={qty}
                  onChange={(e) => setQty(Math.max(minQty, parseInt(e.target.value) || minQty))}
                  className="w-12 text-center text-sm font-bold bg-transparent text-slate-900 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setQty(qty + 1)}
                  disabled={availStock > 0 && qty >= availStock}
                  className="p-1.5 text-slate-600 hover:text-slate-900 disabled:opacity-30"
                  title="Increase"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {/* Pack Presets (+6, +12) */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => addPackQuantity(6)}
                  disabled={!activeProduct.in_stock || (availStock > 0 && qty >= availStock) || (availStock > 0 && availStock < 6)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-[#EBF2F7] hover:text-[#2C6291] active:scale-95 text-slate-700 border border-slate-200 transition-all shadow-2xs disabled:opacity-30"
                  title="Add +6 Units"
                >
                  +6
                </button>
                <button
                  type="button"
                  onClick={() => addPackQuantity(12)}
                  disabled={!activeProduct.in_stock || (availStock > 0 && qty >= availStock) || (availStock > 0 && availStock < 12)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-[#EBF2F7] hover:text-[#2C6291] active:scale-95 text-slate-700 border border-slate-200 transition-all shadow-2xs disabled:opacity-30"
                  title="Add +12 Units (Dozen)"
                >
                  +12
                </button>
              </div>

              {/* Add to Cart Button */}
              <button
                type="button"
                onClick={handleAdd}
                disabled={!activeProduct.in_stock || isAdding}
                className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#2C6291] hover:bg-[#235077] disabled:bg-slate-100 disabled:text-slate-400 text-white font-bold text-xs shadow-md transition-all active:scale-95"
              >
                <ShoppingCart className="h-4 w-4" />
                <span>Add {qty} to Cart</span>
              </button>
            </div>

            {/* Direct WhatsApp Inquiry Button */}
            <a
              href={`https://wa.me/94766611606?text=${encodeURIComponent(
                `Hello Imanya Fancy Goods, I want to inquire about SKU: ${activeProduct.sku} - ${activeProduct.name} (Quantity: ${qty} ${activeProduct.unit_of_measure})`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#EEF6F6] hover:bg-[#E0EFF0] text-[#346566] border border-[#4C9091]/30 text-xs font-bold transition-colors"
            >
              <MessageSquare className="h-4 w-4 text-[#4C9091]" />
              <span>Inquire on WhatsApp about this product</span>
            </a>
          </div>
        </div>
        </div>

        {/* Related Products Strip (Same category, consistent live discount pricing) */}
        {relatedProducts.length > 0 && (
          <div className="pt-4 border-t border-slate-200 space-y-2.5">
            <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Related Products in {activeProduct.category_name}
            </h5>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {relatedProducts.slice(0, 4).map((rel) => {
                const relDiscounted = Boolean(rel.is_discount_active);
                const relPrice =
                  relDiscounted && rel.discounted_price !== undefined && rel.discounted_price > 0
                    ? rel.discounted_price
                    : rel.selling_price;
                return (
                  <button
                    key={rel.id}
                    type="button"
                    onClick={() => onSelectProduct?.(rel)}
                    className="text-left p-2.5 rounded-xl border border-slate-200 hover:border-[#2C6291] bg-white transition-all space-y-1.5 group"
                  >
                    <div className="relative h-20 rounded-lg bg-slate-50 flex items-center justify-center overflow-hidden">
                      {relDiscounted && Number(rel.discount_percent || 0) > 0 && (
                        <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-rose-600 text-white text-[9px] font-black">
                          {rel.discount_percent}% OFF
                        </span>
                      )}
                      {rel.images?.[0]?.image_url ? (
                        <img
                          src={rel.images[0].image_url}
                          alt={rel.name}
                          className="max-h-full max-w-full object-contain"
                        />
                      ) : (
                        <Package className="h-6 w-6 text-slate-300" />
                      )}
                    </div>
                    <p className="text-[11px] font-bold text-slate-800 group-hover:text-[#2C6291] line-clamp-1">
                      {rel.name}
                    </p>
                    <div className="flex items-baseline gap-1.5">
                      <span
                        className={`text-xs font-black ${
                          relDiscounted ? 'text-emerald-700' : 'text-slate-900'
                        }`}
                      >
                        {formatCurrency(relPrice)}
                      </span>
                      {relDiscounted && (
                        <span className="text-[10px] text-slate-400 line-through">
                          {formatCurrency(rel.selling_price)}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
