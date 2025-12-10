'use client';
import { useState, useMemo } from "react";
import CenterModal from "./CenterModal";
import toast from 'react-hot-toast';
import { cartService } from "@/lib/services/cartService";

type ProductT = { id: string; title: string; imageUrl: string; price: number };

export default function AreaModal({
  open,
  onClose,
  area,
  products,
  projectAddress,
  projectId,
}: {
  open: boolean;
  onClose: () => void;
  area: string;
  products: ProductT[];
  projectAddress: string;
  projectId?: string;
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
  const addToCart = async (product: ProductT, quantity: number = 1) => {
    try {
      const result = await cartService.addToCart(
        product.id,
        quantity,
        projectId,
        area,
        {
          title: product.title,
          price: product.price,
          imageUrl: product.imageUrl,
        }
      );
      
      if (result.success) {
        // Update local state
        const cart = getCartItems();
        const existingItem = cart.find((item: any) => 
          item.productId === product.id && item.area === area && item.projectId === projectId
        );
        
        if (existingItem) {
          existingItem.qty += quantity;
        } else {
          cart.push({
            id: `line_${Date.now()}`,
            productId: product.id,
            qty: quantity,
            projectId: projectId,
            area: area,
            price: product.price,
            title: product.title,
            imageUrl: product.imageUrl,
          });
        }
        setCartItems(cart);
        
        try {
          window.dispatchEvent(new CustomEvent("cart:add", { detail: { productId: product.id } }));
        } catch {}
        
        toast.success(`Added ${quantity}x "${product.title}" to cart`);
      } else {
        toast.error(result.error || 'Failed to add to cart');
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error('Failed to add to cart');
    }
  };

  // Update cart quantity
  const updateCartQuantity = (productId: string, delta: number) => {
    const CART_KEY = "dc:cart";
    const cart = getCartItems();
    
    const item = cart.find((item: any) => 
      item.productId === productId && item.area === area && item.projectId === projectId
    );
    
    if (item) {
      item.qty = Math.max(0, item.qty + delta);
      if (item.qty === 0) {
        // Remove from cart if quantity is 0
        const filtered = cart.filter((i: any) => i.id !== item.id);
        localStorage.setItem(CART_KEY, JSON.stringify(filtered));
        setCartItems(filtered);
        toast.success('Removed from cart', {
          duration: 2000,
        });
      } else {
        localStorage.setItem(CART_KEY, JSON.stringify(cart));
        setCartItems(cart);
      }
    }
  };

  return (
    <CenterModal open={open} onClose={onClose} hideClose size="large">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur rounded-t-3xl px-6 pt-6 pb-4 border-b border-black/5">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-2xl font-semibold text-[#2e2e2e]">Product Details</h3>
          </div>
          <button 
            onClick={onClose} 
            className="text-sm font-medium text-[#d96857] hover:text-[#c85745] transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* Products Grid */}
      <div className="px-6 py-6 max-h-[70vh] overflow-y-auto">
        {uniqueProducts.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {uniqueProducts.map((p) => {
              const count = productCounts.get(p.id) || 1;
              const inCart = isInCart(p.id);
              const cartQty = getCartQuantity(p.id);
              
              return (
                <div 
                  key={p.id} 
                  className="bg-white border border-black/8 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-[#d96857]/20 transition-all group"
                >
                  <div className="relative w-full aspect-square overflow-hidden rounded-xl border border-black/5 mb-3 bg-[#f7f7f6]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.imageUrl}
                      alt={p.title}
                      className="absolute inset-0 w-full h-full object-cover cursor-zoom-in group-hover:scale-105 transition-transform duration-300"
                      onClick={() => setLightbox(p.imageUrl)}
                    />
                  </div>
                  <h4 className="text-sm font-semibold text-[#2e2e2e] line-clamp-2 mb-2">{p.title}</h4>
                  <p className="text-lg font-bold text-[#d96857] mb-3">
                    ₹{p.price.toLocaleString('en-IN')}
                  </p>
                  
                  {/* Quantity controls or Add to Cart button */}
                  {inCart ? (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2 flex-1 bg-gray-100 rounded-xl p-1">
                        <button
                          onClick={() => updateCartQuantity(p.id, -1)}
                          className="w-8 h-8 bg-white hover:bg-[#d96857] hover:text-white rounded-lg flex items-center justify-center transition-colors shadow-sm"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                          </svg>
                        </button>
                        <span className="flex-1 text-center font-semibold text-[#2e2e2e]">{cartQty}</span>
                        <button
                          onClick={() => updateCartQuantity(p.id, 1)}
                          className="w-8 h-8 bg-white hover:bg-[#d96857] hover:text-white rounded-lg flex items-center justify-center transition-colors shadow-sm"
                          disabled={cartQty >= count}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                      </div>
                      <div className="text-xs text-green-600 font-medium whitespace-nowrap">
                        ✓ {cartQty}
                      </div>
                    </div>
                  ) : (
                    <button
                      className="w-full bg-[#d96857] hover:bg-[#c85745] text-white rounded-xl py-2.5 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => addToCart(p, Math.min(1, count))}
                      disabled={count === 0}
                    >
                      Add to Cart
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-[#2e2e2e]/60">No products linked to this area yet.</p>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 animate-in fade-in duration-300"
          onClick={() => setLightbox(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox}
            alt="Product Preview"
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-2xl shadow-2xl"
          />
          <button
            className="absolute top-6 right-6 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center transition-all border border-white/20"
            onClick={(e) => {
              e.stopPropagation();
              setLightbox(null);
            }}
          >
            <span className="text-white text-2xl leading-none">×</span>
          </button>
        </div>
      )}
    </CenterModal>
  );
}
