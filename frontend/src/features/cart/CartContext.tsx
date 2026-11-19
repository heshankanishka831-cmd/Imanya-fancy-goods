import React, { createContext, useContext, useState, useEffect } from 'react';
import { Cart } from '../../types';
import { publicApi } from '../../services/endpoints';

interface CartContextType {
  cart: Cart | null;
  isLoading: boolean;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  fetchCart: () => Promise<void>;
  addToCart: (productId: string, quantity: number) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<Cart | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);

  const fetchCart = async () => {
    try {
      setIsLoading(true);
      const res = await publicApi.getCart();
      if (res.success && res.data) {
        setCart(res.data);
      }
    } catch (err) {
      console.error('Failed to load cart', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();
  }, []);

  const addToCart = async (productId: string, quantity: number) => {
    const res = await publicApi.addToCart(productId, quantity);
    if (res.success && res.data) {
      setCart(res.data);
      setIsCartOpen(true);
    }
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    const res = await publicApi.updateCartItem(itemId, quantity);
    if (res.success && res.data) {
      setCart(res.data);
    }
  };

  const removeItem = async (itemId: string) => {
    await publicApi.removeCartItem(itemId);
    await fetchCart();
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        isLoading,
        isCartOpen,
        setIsCartOpen,
        fetchCart,
        addToCart,
        updateQuantity,
        removeItem,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
};
