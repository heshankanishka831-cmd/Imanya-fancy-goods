import React, { useState, useEffect } from 'react';
import { Product } from '../../../types';
import { formatCurrency } from '../../../utils/formatters';
import { Spinner } from '../../../components/ui/Spinner';
import {
  Package,
  Check,
  Eye,
  Plus,
  Minus,
  ShoppingCart,
  Heart,
  Star,
  AlertCircle,
} from 'lucide-react';
import { useWishlist } from '../../wishlist/WishlistContext';

export const PRODUCT_GRID_CLASSES =
  'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 items-stretch';

interface ProductGridProps {
  children: React.ReactNode;
  className?: string;
}

export const ProductGrid: React.FC<ProductGridProps> = ({ children, className = '' }) => (
  <div className={`${PRODUCT_GRID_CLASSES} ${className}`.trim()}>{children}</div>
);

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product, qty: number) => Promise<void>;
  onQuickView: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = React.memo(({
  product,
  onAddToCart,
  onQuickView,
}) => {
  const { toggleWishlist, isInWishlist } = useWishlist();
  const isWishlisted = isInWishlist(product.id);

  const images = product.images || [];
  const imageCount = images.length;
  const availStock =
    product.available_stock !== undefined
      ? product.available_stock
      : product.in_stock
      ? 100
      : 0;
  const minQty = Math.max(1, product.min_order_quantity || 1);
  const isOutOfStock = !product.in_stock || availStock <= 0;
  const isBelowMinStock = !isOutOfStock && availStock < minQty;

  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [imageError, setImageError] = useState(false);
  const [quantity, setQuantity] = useState<number>(minQty);
  const [isAdding, setIsAdding] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  // Keep photo index and quantity synchronized when product changes
  useEffect(() => {
    setActivePhotoIdx(0);
    setImageError(false);
    setQuantity(minQty);
    setFeedbackError(null);
    setIsAdded(false);
  }, [product.id, minQty]);

  useEffect(() => {
    setImageError(false);
  }, [activePhotoIdx]);

  const currentImage =
    !imageError && imageCount > 0 ? images[activePhotoIdx]?.image_url : null;

  // Authoritative backend-calculated pricing & discount fields
  const isDiscountActive = Boolean(product.is_discount_active);
  const effectivePrice =
    isDiscountActive && product.discounted_price !== undefined && product.discounted_price > 0
      ? product.discounted_price
      : product.selling_price;
  const discountSavings = isDiscountActive
    ? product.discount_amount !== undefined && product.discount_amount > 0
      ? product.discount_amount
      : Math.max(0, product.selling_price - effectivePrice)
    : 0;

  // Consistent deterministic review count derived from product ID
  const reviewCount = Math.max(
    12,
    Math.abs(
      product.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 90
    ) + 15
  );

  const clampQuantity = (rawVal: number): number => {
    const rounded = Math.round(rawVal);
    if (isNaN(rounded) || rounded < minQty) return minQty;
    if (availStock > 0 && rounded > availStock) return Math.max(minQty, availStock);
    return rounded;
  };

  const handleQuantityUpdate = (nextRaw: number) => {
    setFeedbackError(null);
    if (availStock > 0 && nextRaw > availStock) {
      setQuantity(Math.max(minQty, availStock));
      setFeedbackError(`Only ${availStock} units currently available in stock.`);
      return;
    }
    setQuantity(clampQuantity(nextRaw));
  };

  const handlePackAdd = (packSize: number) => {
    setFeedbackError(null);
    const next = quantity < minQty ? minQty + packSize : quantity + packSize;
    if (availStock > 0 && next > availStock) {
      setQuantity(Math.max(minQty, availStock));
      setFeedbackError(`Capped at maximum available stock (${availStock}).`);
      return;
    }
    setQuantity(clampQuantity(next));
  };

  const handleAddToCartClick = async () => {
    if (isOutOfStock) {
      setFeedbackError('This item is currently out of stock.');
      return;
    }
    if (isBelowMinStock) {
      setFeedbackError(`Minimum order is ${minQty}, but only ${availStock} left.`);
      return;
    }
    if (quantity < minQty) {
      setQuantity(minQty);
      setFeedbackError(`Minimum order quantity is ${minQty} units.`);
      return;
    }
    if (availStock > 0 && quantity > availStock) {
      setQuantity(availStock);
      setFeedbackError(`Only ${availStock} units available in stock.`);
      return;
    }

    try {
      setIsAdding(true);
      setFeedbackError(null);
      await onAddToCart(product, quantity);
      setIsAdded(true);
      setTimeout(() => setIsAdded(false), 1800);
    } catch (err: any) {
      const msg =
        err?.response?.data?.error?.message ||
        err?.message ||
        'Could not add item to cart. Please try again.';
      setFeedbackError(msg);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <article className="h-full bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:border-[#2C6291]/40 transition-all duration-200 flex flex-col overflow-hidden group">
      {/* 1. Fixed 4:3 Image Container with Object-Contain & Consistent Padding */}
      <div
        onClick={() => onQuickView(product)}
        className="relative w-full aspect-[4/3] bg-slate-50/90 border-b border-slate-100 p-3 flex items-center justify-center overflow-hidden cursor-pointer shrink-0"
      >
        {currentImage ? (
          <img
            src={currentImage}
            alt={product.name}
            loading="lazy"
            onError={() => setImageError(true)}
            className="w-full h-full object-contain transition-transform duration-200 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-slate-300 select-none">
            <Package className="h-11 w-11 stroke-[1.5]" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              No Image
            </span>
          </div>
        )}

        {/* Top-Left: Wishlist Heart + Active Discount Badge */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-10">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleWishlist(product);
            }}
            className={`p-1.5 rounded-full backdrop-blur-md shadow-xs transition-colors ${
              isWishlisted
                ? 'bg-rose-50 text-rose-500 ring-1 ring-rose-300'
                : 'bg-white/95 text-slate-400 hover:text-rose-500 hover:bg-white'
            }`}
            title={isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
            aria-label={isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
          >
            <Heart className={`h-3.5 w-3.5 ${isWishlisted ? 'fill-rose-500' : ''}`} />
          </button>

          {isDiscountActive && product.discount_percent && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-[#9AC640] text-[#1D3E08] shadow-xs border border-[#9AC640]/50 tracking-wider">
              {product.discount_percent}% OFF
            </span>
          )}
        </div>

        {/* Top-Right: Consistent Stock Availability Badge */}
        <div className="absolute top-2.5 right-2.5 z-10">
          {availStock > 5 ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F4F9EC] text-[#6F9128] border border-[#9AC640]/40 shadow-2xs">
              <Check className="h-2.5 w-2.5 text-[#9AC640]" /> In Stock ({availStock})
            </span>
          ) : availStock > 0 ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs">
              Low: {availStock} Left
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
              Out of Stock
            </span>
          )}
        </div>

        {/* Hover Quick View Pill */}
        <div className="absolute inset-0 bg-slate-900/15 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center pointer-events-none">
          <span className="px-3 py-1.5 rounded-xl bg-slate-900/90 backdrop-blur-md text-white text-xs font-bold flex items-center gap-1.5 shadow-md">
            <Eye className="h-3.5 w-3.5" />
            <span>Quick View</span>
          </span>
        </div>

        {/* Bottom Multi-Photo Dots Selector (When > 1 Photo) */}
        {imageCount > 1 && (
          <div className="absolute bottom-2 left-0 right-0 flex justify-center items-center gap-1.5 z-10">
            {images.map((img, i) => (
              <button
                key={img.id || i}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActivePhotoIdx(i);
                }}
                className={`h-1.5 rounded-full transition-all ${
                  activePhotoIdx === i
                    ? 'w-5 bg-[#2C6291] shadow-xs'
                    : 'w-1.5 bg-slate-300 hover:bg-slate-400'
                }`}
                title={`Photo ${i + 1} of ${imageCount}`}
                aria-label={`View photo ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* 2. Standardized Card Body (Uniform Height Slots) */}
      <div className="p-4 flex-1 flex flex-col">
        {/* Category & SKU Row (Fixed single-line height) */}
        <div className="flex items-center justify-between gap-2 text-[11px] h-4 mb-1.5">
          <span className="font-semibold text-[#4C9091] uppercase tracking-wider truncate">
            {product.category_name}
          </span>
          <span
            className="font-mono text-slate-400 shrink-0 truncate max-w-[45%]"
            title={`SKU: ${product.sku}`}
          >
            {product.sku}
          </span>
        </div>

        {/* Product Title (Locked 2-line height so rows align perfectly) */}
        <h3
          onClick={() => onQuickView(product)}
          className="h-10 mb-1.5 text-sm font-bold text-slate-900 group-hover:text-[#2C6291] transition-colors line-clamp-2 cursor-pointer leading-5"
          title={product.name}
        >
          {product.name}
        </h3>

        {/* Rating & Minimum Order Quantity Row (Consistent fixed height) */}
        <div className="flex items-center justify-between gap-2 h-5 mb-2">
          <div className="flex items-center gap-1">
            <div className="flex text-amber-400">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <span className="text-[11px] font-semibold text-slate-400">({reviewCount})</span>
          </div>

          <span className="inline-flex items-center font-bold text-[10px] text-[#2C6291] bg-[#EBF2F7] px-2 py-0.5 rounded border border-[#2C6291]/20 shrink-0">
            Min: {minQty}
          </span>
        </div>

        {/* Description Slot (Locked 2-line height) */}
        <p className="h-9 mb-3 text-xs text-slate-500 line-clamp-2 leading-[1.125rem]">
          {product.description || ''}
        </p>

        {/* 3. Pinned Pricing & Action Footer (Always aligned at bottom of card) */}
        <div className="mt-auto pt-3 border-t border-slate-100 flex flex-col gap-2.5">
          {/* Pricing Block: Anchored at bottom so discounted & non-discounted cards stay aligned */}
          <div className="min-h-[3.25rem] flex items-end justify-between gap-2">
            <div>
              {isDiscountActive ? (
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs text-slate-400 line-through font-semibold">
                      {formatCurrency(product.selling_price)}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      You Save: {formatCurrency(discountSavings)}
                    </span>
                  </div>
                  <div className="flex items-baseline">
                    <span className="text-lg font-black text-emerald-700 leading-none">
                      {formatCurrency(effectivePrice)}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium ml-1">
                      /{product.unit_of_measure}
                    </span>
                  </div>
                </div>
              ) : (
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-semibold tracking-wider mb-0.5">
                    Unit Price
                  </span>
                  <div className="flex items-baseline">
                    <span className="text-lg font-black text-slate-900 leading-none">
                      {formatCurrency(product.selling_price)}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium ml-1">
                      /{product.unit_of_measure}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {!isOutOfStock && quantity > 1 && (
              <div className="text-right shrink-0">
                <span className="text-[10px] text-slate-400 block">Subtotal</span>
                <span className="text-xs font-bold text-[#2C6291]">
                  {formatCurrency(effectivePrice * quantity)}
                </span>
              </div>
            )}
          </div>

          {/* Inline Error Feedback (if validation or API fails) */}
          {feedbackError && (
            <div className="flex items-start gap-1.5 p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-medium leading-snug">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>{feedbackError}</span>
            </div>
          )}

          {/* Quantity Stepper + Quick Presets + Add to Cart Button */}
          <div className="flex items-center gap-1.5">
            {/* Stepper Controls */}
            <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50/70 h-9 px-0.5 shrink-0">
              <button
                type="button"
                onClick={() => handleQuantityUpdate(quantity - 1)}
                disabled={quantity <= minQty || isOutOfStock || isBelowMinStock}
                className="p-1 rounded-lg text-slate-500 hover:text-slate-900 disabled:opacity-30 transition-colors"
                title={
                  quantity <= minQty
                    ? `Minimum purchase quantity is ${minQty}`
                    : 'Decrease Quantity'
                }
                aria-label="Decrease quantity"
              >
                <Minus className="h-3 w-3" />
              </button>
              <input
                type="number"
                min={minQty}
                max={availStock > 0 ? availStock : 9999}
                value={quantity}
                onChange={(e) => {
                  const parsed = parseInt(e.target.value, 10);
                  if (!isNaN(parsed)) {
                    handleQuantityUpdate(parsed);
                  } else {
                    setQuantity(minQty);
                  }
                }}
                disabled={isOutOfStock || isBelowMinStock}
                className="w-7 sm:w-8 text-center text-xs font-bold bg-transparent text-slate-900 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                aria-label="Order quantity"
              />
              <button
                type="button"
                onClick={() => handleQuantityUpdate(quantity + 1)}
                disabled={quantity >= availStock || isOutOfStock || isBelowMinStock}
                className="p-1 rounded-lg text-slate-500 hover:text-slate-900 disabled:opacity-30 transition-colors"
                title="Increase Quantity"
                aria-label="Increase quantity"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>

            {/* Incremental Pack Presets (+6 & +12) */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => handlePackAdd(6)}
                disabled={isOutOfStock || isBelowMinStock || quantity >= availStock}
                className="h-9 px-1.5 sm:px-2 rounded-xl text-[10px] font-bold bg-slate-100 hover:bg-[#EBF2F7] hover:text-[#2C6291] text-slate-700 disabled:opacity-30 transition-colors"
                title="Add +6 Units"
              >
                +6
              </button>
              <button
                type="button"
                onClick={() => handlePackAdd(12)}
                disabled={isOutOfStock || isBelowMinStock || quantity >= availStock}
                className="h-9 px-1.5 sm:px-2 rounded-xl text-[10px] font-bold bg-slate-100 hover:bg-[#EBF2F7] hover:text-[#2C6291] text-slate-700 disabled:opacity-30 transition-colors"
                title="Add +12 Units (Dozen)"
              >
                +12
              </button>
            </div>

            {/* Add to Cart Button */}
            <button
              type="button"
              onClick={handleAddToCartClick}
              disabled={isOutOfStock || isBelowMinStock || isAdding}
              className={`flex-1 min-w-0 h-9 inline-flex items-center justify-center gap-1.5 px-3 rounded-xl text-xs font-bold transition-colors shadow-xs ${
                isAdded
                  ? 'bg-[#9AC640] text-white'
                  : 'bg-[#2C6291] hover:bg-[#235077] disabled:bg-slate-100 disabled:text-slate-400 text-white'
              }`}
            >
              {isOutOfStock ? (
                <span className="truncate">Out of Stock</span>
              ) : isBelowMinStock ? (
                <span className="truncate">Min {minQty}</span>
              ) : isAdding ? (
                <Spinner size="sm" />
              ) : isAdded ? (
                <>
                  <Check className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">Added!</span>
                </>
              ) : (
                <>
                  <ShoppingCart className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">Add {quantity > 1 ? `(${quantity})` : ''}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
});
