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

  // `format` is the book edition ('DIGITAL' | 'PHYSICAL'). Music is always
  // digital, artwork always physical; a digital line is always quantity 1.
  const addToCart = useCallback((product, qty = 1, variation = null, addons = {}, format = null) => {
    const id = `${product.id}_${variation?.id || 'base'}_${format || ''}_${Date.now()}`;
    const isBook = product.category === 'BOOK';
    const lineFormat = product.category === 'MUSIC' ? 'DIGITAL' : isBook ? (format || (product.bookFormat === 'PHYSICAL' ? 'PHYSICAL' : 'DIGITAL')) : null;
    const delivery = lineFormat === 'DIGITAL' ? 'DIGITAL' : 'PHYSICAL';
    if (delivery === 'DIGITAL') qty = 1;
    const bookPrice = isBook ? (lineFormat === 'DIGITAL' ? product.digitalPrice : product.physicalPrice) : null;
    const basePrice = variation?.price ?? bookPrice ?? product.basePrice;
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
      artist: product.creatorName || product.artist?.displayName || '', price, qty, format: lineFormat, delivery,
      variation, addons, charityName: product.charity?.name || '',
      image: product.images?.[0]?.url || '', slug: product.slug, category: product.category,
    }]);
    toast(`Added "${product.title}" to cart`);
  }, [toast]);

  const removeFromCart = useCallback((id) => setCart(p => p.filter(x => x.id !== id)), []);
  const updateQty = useCallback((id, qty) => {
    if (qty < 1) return removeFromCart(id);
    setCart(p => p.map(x => x.id === id ? { ...x, qty: x.delivery === 'DIGITAL' ? 1 : qty } : x));
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
