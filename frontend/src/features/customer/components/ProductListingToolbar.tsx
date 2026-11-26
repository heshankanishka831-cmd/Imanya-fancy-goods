import React from 'react';
import { Category } from '../../../types';
import { Search, X, ArrowUpDown, CheckCircle2, Percent } from 'lucide-react';

interface ProductListingToolbarProps {
  search: string;
  onSearchChange: (val: string) => void;
  categories: Category[];
  categoryCounts: Record<number, number>;
  selectedCategory: number | null;
  onCategorySelect: (id: number | null) => void;
  onlyInStock: boolean;
  onToggleStock: () => void;
  onlyDiscounts?: boolean;
  onToggleDiscounts?: () => void;
  minPrice: string;
  maxPrice: string;
  onMinPriceChange: (val: string) => void;
  onMaxPriceChange: (val: string) => void;
  sortBy: 'featured' | 'price-asc' | 'price-desc' | 'name-asc' | 'stock-desc';
  onSortChange: (sort: 'featured' | 'price-asc' | 'price-desc' | 'name-asc' | 'stock-desc') => void;
  totalCount: number;
  filteredCount: number;
  onResetFilters: () => void;
}

export const ProductListingToolbar: React.FC<ProductListingToolbarProps> = ({
  search,
  onSearchChange,
  categories,
  categoryCounts,
  selectedCategory,
  onCategorySelect,
  onlyInStock,
  onToggleStock,
  onlyDiscounts = false,
  onToggleDiscounts,
  minPrice,
  maxPrice,
  onMinPriceChange,
  onMaxPriceChange,
  sortBy,
  onSortChange,
  totalCount,
  filteredCount,
  onResetFilters,
}) => {
  const hasActiveFilters = selectedCategory !== null || search.trim() !== '' || onlyInStock || onlyDiscounts || minPrice !== '' || maxPrice !== '';

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
      {/* 1. Main Search & Sort Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search products by title, SKU or Item Code..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2C6291] focus:bg-white shadow-2xs transition-all"
          />
          {search && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              title="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Sort & Stock Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Sorting Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs">
            <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-slate-500 font-medium">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as any)}
              className="bg-transparent text-slate-900 font-bold focus:outline-none cursor-pointer"
            >
              <option value="featured">Featured / Default</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="name-asc">Product Name (A-Z)</option>
              <option value="stock-desc">Stock Quantity (High to Low)</option>
            </select>
          </div>

          {/* In-Stock Filter Toggle */}
          <button
            onClick={onToggleStock}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all border ${
              onlyInStock
                ? 'bg-[#9AC640] text-white border-[#9AC640] shadow-2xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <CheckCircle2 className={`h-3.5 w-3.5 ${onlyInStock ? 'text-white' : 'text-[#9AC640]'}`} />
            <span>In-Stock Only</span>
          </button>

          {/* Deals / Discounts Only Toggle */}
          {onToggleDiscounts && (
            <button
              onClick={onToggleDiscounts}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                onlyDiscounts
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                  : 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50'
              }`}
            >
              <Percent className="h-3.5 w-3.5" />
              <span>Deals Only</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Category Pills & Price Range Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => onCategorySelect(null)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              selectedCategory === null
                ? 'bg-[#2C6291] text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-[#EBF2F7] hover:text-[#2C6291]'
            }`}
          >
            All Categories ({totalCount})
          </button>

          {categories.map((c) => {
            const count = categoryCounts[c.id] || 0;
            const isSelected = selectedCategory === c.id;
            return (
              <button
                key={c.id}
                onClick={() => onCategorySelect(c.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-[#2C6291] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-[#EBF2F7] hover:text-[#2C6291]'
                }`}
              >
                <span>{c.name}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isSelected ? 'bg-[#1C4263] text-white' : 'bg-white text-slate-600'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Price Range Inputs */}
        <div className="flex items-center gap-2 text-xs shrink-0">
          <span className="text-slate-500 font-semibold">Price (Rs.):</span>
          <input
            type="number"
            placeholder="Min"
            value={minPrice}
            onChange={(e) => onMinPriceChange(e.target.value)}
            className="w-16 px-2 py-1 rounded-lg border border-slate-200 text-xs text-center focus:outline-none focus:ring-1 focus:ring-[#2C6291] bg-white"
          />
          <span className="text-slate-300">-</span>
          <input
            type="number"
            placeholder="Max"
            value={maxPrice}
            onChange={(e) => onMaxPriceChange(e.target.value)}
            className="w-16 px-2 py-1 rounded-lg border border-slate-200 text-xs text-center focus:outline-none focus:ring-1 focus:ring-[#2C6291] bg-white"
          />
        </div>
      </div>

      {/* 3. Results Indicator & Reset Action */}
      <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
        <span>
          Showing <strong className="text-slate-900">{filteredCount}</strong> products
          {selectedCategory && (
            <> in <span className="text-[#2C6291] font-semibold">{categories.find((c) => c.id === selectedCategory)?.name}</span></>
          )}
          {onlyInStock && ' (In-Stock Only)'}
        </span>

        {hasActiveFilters && (
          <button
            onClick={onResetFilters}
            className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
            <span>Reset Filters</span>
          </button>
        )}
      </div>
    </div>
  );
};
