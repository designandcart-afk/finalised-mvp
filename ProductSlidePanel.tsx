'use client';
import { useState, useMemo, useEffect } from "react";
import toast from 'react-hot-toast';
import { X } from 'lucide-react';

type ProductT = { id: string; title: string; imageUrl: string; price: number };

export default function ProductSlidePanel({
  open,
  onClose,
  area,
  products,
  projectAddress,
  projectId,
  side = 'right',
}: {
  open: boolean;
  onClose: () => void;
  area: string;
  products: ProductT[];
  projectAddress: string;
  projectId?: string;
  side?: 'left' | 'right';
}) {
  const [lightbox, setLightbox] = useState<string | null>(null);

  // Count product occurrences and get cart items
  const productCounts = useMemo(() => {
    const counts = new Map<string, number>();
    products.forEach(p => {
      counts.set(p.id, (counts.get(p.id) || 0) + 1);
    });
    return counts;
  }, [products]);

  // Get unique products
  const uniqueProducts = useMemo(() => {
    const seen = new Set<string>();
    return products.filter(p => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  }, [products]);

  // Get cart items from localStorage
  const getCartItems = () => {
    const CART_KEY = "dc:cart";
    const existing = localStorage.getItem(CART_KEY);
    return existing ? JSON.parse(existing) : [];
  };

  const [cartItems, setCartItems] = useState(getCartItems());

  // Check if product is in cart
  const isInCart = (productId: string) => {
    return cartItems.some((item: any) => 
      item.productId === productId && item.area === area && item.projectId === projectId
    );
  };

  // Get quantity in cart
  const getCartQuantity = (productId: string) => {
    const item = cartItems.find((item: any) => 
      item.productId === productId && item.area === area && item.projectId === projectId
    );
    return item?.qty || 0;
  };

  // Add to cart
  const addToCart = (product: ProductT, quantity: number = 1) => {
    const CART_KEY = "dc:cart";
    const cart = getCartItems();
    
    const existingItem = cart.find((item: any) => 
      item.productId === product.id && item.area === area && item.projectId === projectId
    );
    
    if (existingItem) {
      existingItem.qty += quantity;
    } else {
      const newItem = {
        id: `line_${Date.now()}`,
        productId: product.id,
        qty: quantity,
        projectId: projectId,
        area: area,
        price: product.price,
        title: product.title,
        imageUrl: product.imageUrl,
      };
      cart.push(newItem);
    }
    
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    setCartItems(cart);
    
    try {
      window.dispatchEvent(new CustomEvent("cart:add", { detail: { productId: product.id } }));
    } catch {}
    
    toast.success(`Added ${quantity}x "${product.title}" to cart`, {
      duration: 2000,
      position: 'bottom-center',
      style: {
        background: '#2e2e2e',
        color: '#fff',
        padding: '12px 20px',
        fontSize: '14px',
        borderRadius: '12px',
      },
    });
  };

  // Remove from cart
  const removeFromCart = (productId: string) => {
    const CART_KEY = "dc:cart";
    const cart = getCartItems();
    const updatedCart = cart.filter((item: any) => 
      !(item.productId === productId && item.area === area && item.projectId === projectId)
    );
    localStorage.setItem(CART_KEY, JSON.stringify(updatedCart));
    setCartItems(updatedCart);
    
    try {
      window.dispatchEvent(new CustomEvent("cart:remove", { detail: { productId } }));
    } catch {}
    
    toast.success('Removed from cart', {
      duration: 2000,
      position: 'bottom-center',
      style: {
        background: '#2e2e2e',
        color: '#fff',
        padding: '12px 20px',
        fontSize: '14px',
        borderRadius: '12px',
      },
    });
  };

  // Update quantity
  const updateQuantity = (productId: string, newQty: number) => {
    if (newQty < 1) {
      removeFromCart(productId);
      return;
    }
    
    const CART_KEY = "dc:cart";
    const cart = getCartItems();
    const item = cart.find((item: any) => 
      item.productId === productId && item.area === area && item.projectId === projectId
    );
    
    if (item) {
      item.qty = newQty;
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
      setCartItems(cart);
    }
  };

  // Prevent body scroll when panel is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [open]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-[999] transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Slide Panel */}
      <div
        className={`fixed top-0 ${side === 'right' ? 'right-0' : 'left-0'} bottom-0 w-[700px] bg-white shadow-2xl z-[1000] transform transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : side === 'right' ? 'translate-x-full' : '-translate-x-full'
        } flex flex-col`}
      >
        {/* Header */}
        <div className="flex-shrink-0 px-6 py-5 border-b border-gray-200 bg-gradient-to-br from-[#faf8f6] to-white">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-[#2e2e2e] mb-1">Products</h2>
              <p className="text-sm text-[#2e2e2e]/60">{area}</p>
              <p className="text-xs text-[#2e2e2e]/50 mt-1">{uniqueProducts.length} {uniqueProducts.length === 1 ? 'product' : 'products'}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-[#2e2e2e]/5 transition-colors"
            >
              <X className="w-5 h-5 text-[#2e2e2e]/60" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {uniqueProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-full bg-[#d96857]/10 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-[#d96857]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <p className="text-sm text-[#2e2e2e]/60">No products added to this area yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {uniqueProducts.map((p) => {
                const count = productCounts.get(p.id) || 0;
                const cartQty = getCartQuantity(p.id);
                const inCart = isInCart(p.id);

                return (
                  <div
                    key={p.id}
                    className="group bg-gradient-to-br from-white to-[#faf8f6] rounded-xl border border-[#2e2e2e]/5 hover:border-[#d96857]/30 transition-all hover:shadow-lg p-4 flex flex-col"
                  >
                    {/* Product Image */}
                    <div
                      className="w-full aspect-square rounded-lg overflow-hidden cursor-pointer bg-[#f7f4f2] mb-3"
                      onClick={() => setLightbox(p.imageUrl)}
                    >
                      <img
                        src={p.imageUrl}
                        alt={p.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>

                    {/* Product Details */}
                    <div className="flex-1 flex flex-col">
                      <h3 className="font-semibold text-[#2e2e2e] mb-1 text-sm line-clamp-2">{p.title}</h3>
                      <p className="text-lg font-bold text-[#d96857] mb-2">₹{p.price.toLocaleString()}</p>
                      
                      {/* Count Badge */}
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#2e2e2e]/5 rounded-lg mb-3 w-fit">
                        <span className="text-xs text-[#2e2e2e]/60">Used in design:</span>
                        <span className="text-xs font-bold text-[#d96857]">{count}x</span>
                      </div>

                      {/* Cart Actions */}
                      <div className="flex flex-col gap-2 mt-auto">
                        {!inCart ? (
                          <button
                            onClick={() => addToCart(p, count)}
                            className="group/btn relative w-full px-5 py-3 bg-gradient-to-r from-[#d96857] via-[#d96857] to-[#c45745] text-white text-sm font-semibold rounded-xl overflow-hidden shadow-lg shadow-[#d96857]/25 hover:shadow-xl hover:shadow-[#d96857]/35 active:scale-[0.98] transition-all duration-300"
                          >
                            {/* Shine effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700"></div>
                            
                            {/* Button content */}
                            <span className="relative flex items-center justify-center gap-2">
                              <svg className="w-4 h-4 group-hover/btn:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                              </svg>
                              <span className="tracking-wide">Add {count}x to Cart</span>
                            </span>
                          </button>
                        ) : (
                          <>
                            <div className="flex items-center justify-between gap-2 border-2 border-[#d96857]/20 rounded-xl overflow-hidden bg-gradient-to-br from-white to-[#faf8f6] shadow-sm">
                              <button
                                onClick={() => updateQuantity(p.id, cartQty - 1)}
                                className="flex-1 px-3 py-2.5 hover:bg-[#d96857]/10 active:bg-[#d96857]/20 transition-all duration-200 group/minus"
                              >
                                <svg className="w-4 h-4 text-[#d96857] mx-auto group-hover/minus:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 12H4" />
                                </svg>
                              </button>
                              <div className="px-5 py-2.5 text-sm font-bold text-[#2e2e2e] bg-gradient-to-br from-[#d96857]/10 to-[#d96857]/5 border-x border-[#d96857]/20">
                                {cartQty}
                              </div>
                              <button
                                onClick={() => updateQuantity(p.id, cartQty + 1)}
                                className="flex-1 px-3 py-2.5 hover:bg-[#d96857]/10 active:bg-[#d96857]/20 transition-all duration-200 group/plus"
                              >
                                <svg className="w-4 h-4 text-[#d96857] mx-auto group-hover/plus:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                                </svg>
                              </button>
                            </div>
                            <button
                              onClick={() => removeFromCart(p.id)}
                              className="w-full px-4 py-2.5 text-sm font-semibold text-[#d96857] hover:bg-[#d96857]/10 active:bg-[#d96857]/15 rounded-xl transition-all duration-200 border border-[#d96857]/20 hover:border-[#d96857]/40"
                            >
                              Remove from Cart
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 bg-black/90 z-[1001] flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            onClick={() => setLightbox(null)}
          >
            <X className="w-6 h-6 text-white" />
          </button>
          <img
            src={lightbox}
            alt="Product"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
