import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Product } from '../../types';
import { publicApi } from '../../services/endpoints';
import { subscribeCatalogUpdated } from '../../utils/catalogSync';

interface WishlistContextType {
  wishlist: Product[];
  isWishlistOpen: boolean;
  setIsWishlistOpen: (open: boolean) => void;
  toggleWishlist: (product: Product) => void;
  isInWishlist: (productId: string) => boolean;
  removeFromWishlist: (productId: string) => void;
  clearWishlist: () => void;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

const WISHLIST_STORAGE_KEY = 'imanya_wishlist_items';

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [wishlist, setWishlist] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem(WISHLIST_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isWishlistOpen, setIsWishlistOpen] = useState(false);

  const refreshWishlistProducts = useCallback(async () => {
    try {
      const res = await publicApi.getProducts({ limit: 200 });
      if (res.success && res.data) {
        const byId = new Map(res.data.map((p) => [p.id, p]));
        setWishlist((prev) => prev.map((item) => byId.get(item.id) || item));
      }
    } catch {
      // Preserve existing wishlist snapshot if catalog request fails
    }
  }, []);

  useEffect(() => {
    if (isWishlistOpen && wishlist.length > 0) {
      refreshWishlistProducts();
    }
  }, [isWishlistOpen, wishlist.length, refreshWishlistProducts]);

  useEffect(() => {
    return subscribeCatalogUpdated(() => {
      refreshWishlistProducts();
    });
  }, [refreshWishlistProducts]);

  useEffect(() => {
    try {
      localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(wishlist));
    } catch (err) {
      console.error('Failed to persist wishlist to localStorage', err);
    }
  }, [wishlist]);

  const toggleWishlist = (product: Product) => {
    setWishlist((prev) => {
      const exists = prev.some((p) => p.id === product.id);
      if (exists) {
        return prev.filter((p) => p.id !== product.id);
      } else {
        return [...prev, product];
      }
    });
  };

  const isInWishlist = (productId: string) => {
    return wishlist.some((p) => p.id === productId);
  };

  const removeFromWishlist = (productId: string) => {
    setWishlist((prev) => prev.filter((p) => p.id !== productId));
  };

  const clearWishlist = () => {
    setWishlist([]);
  };

  return (
    <WishlistContext.Provider
      value={{
        wishlist,
        isWishlistOpen,
        setIsWishlistOpen,
        toggleWishlist,
        isInWishlist,
        removeFromWishlist,
        clearWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) throw new Error('useWishlist must be used within a WishlistProvider');
  return context;
};
