import { createContext, useContext, useState, useCallback } from 'react';

const CartContext = createContext(null);
export const useCart = () => useContext(CartContext);

export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((msg, type = 'ok') => {
    const id = Date.now();
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3800);
  }, []);

  const addToCart = useCallback((product, qty = 1, variation = null, addons = {}) => {
    const id = `${product.id}_${variation?.id || 'base'}_${Date.now()}`;
    const basePrice = variation?.price ?? product.basePrice;
    // Calculate addon price modifiers
    let addonTotal = 0;
    if (product.addons?.length && Object.keys(addons).length) {
      product.addons.forEach(ao => {
        if (addons[ao.id] && ao.priceModifier) addonTotal += Number(ao.priceModifier);
      });
    }
    const price = Number(basePrice) + addonTotal;
    setCart(p => [...p, {
      id, productId: product.id, title: product.title,
      artist: product.artist?.displayName || '', price, qty,
      variation, addons, charityName: product.charity?.name || '',
      image: product.images?.[0]?.url || '', slug: product.slug,
    }]);
    toast(`Added "${product.title}" to cart`);
  }, [toast]);

  const removeFromCart = useCallback((id) => setCart(p => p.filter(x => x.id !== id)), []);
  const updateQty = useCallback((id, qty) => {
    if (qty < 1) return removeFromCart(id);
    setCart(p => p.map(x => x.id === id ? { ...x, qty } : x));
  }, [removeFromCart]);
  const clearCart = useCallback(() => setCart([]), []);
  const cartTotal = cart.reduce((a, c) => a + c.price * c.qty, 0);
  const cartCount = cart.reduce((a, c) => a + c.qty, 0);

  // Wishlist
  const toggleWishlist = useCallback((productId) => {
    setWishlist(p => p.includes(productId) ? p.filter(x => x !== productId) : [...p, productId]);
  }, []);
  const isWished = useCallback((productId) => wishlist.includes(productId), [wishlist]);

  const dismissToast = useCallback((id) => setToasts(p => p.filter(t => t.id !== id)), []);

  return (
    <CartContext.Provider value={{
      cart, addToCart, removeFromCart, updateQty, clearCart, cartTotal, cartCount,
      wishlist, toggleWishlist, isWished,
      toasts, toast, dismissToast,
    }}>
      {children}
    </CartContext.Provider>
  );
}
