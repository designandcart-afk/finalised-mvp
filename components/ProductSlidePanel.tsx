'use client';
import { useState, useMemo, useEffect } from "react";
import toast from 'react-hot-toast';
import { X } from 'lucide-react';
import { cartService } from '@/lib/services/cartService';

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
  const [cartItems, setCartItems] = useState<Map<string, { cartItemId: string; quantity: number }>>(new Map());
  const [selectedQuantities, setSelectedQuantities] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(false);

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

  // Helper function to extract first valid image URL
  const getFirstImageUrl = (imageUrl: string): string => {
    if (!imageUrl) return '';
    
    // If the imageUrl contains multiple URLs concatenated, split and take the first
    // Split by 'https://' or 'http://' and take the first complete URL
    const urls = imageUrl.split(/(?=https?:\/\/)/);
    const firstUrl = urls.find(url => url.trim().length > 0);
    
    if (!firstUrl) return imageUrl;
    
    // Extract just the URL part (remove any trailing junk)
    const urlMatch = firstUrl.match(/(https?:\/\/[^\s]+?\.(jpg|jpeg|png|gif|webp|avif))/i);
    
    return urlMatch ? urlMatch[1] : firstUrl.trim();
  };

  // Load cart items from Supabase
  const loadCartItems = async () => {
    const items = await cartService.getCartItems();
    const cartMap = new Map<string, { cartItemId: string; quantity: number }>();
    
    items.forEach(item => {
      const key = `${item.product_id}_${item.project_id || 'null'}_${item.area || 'null'}`;
      cartMap.set(key, {
        cartItemId: item.id,
        quantity: item.quantity
      });
    });
    
    setCartItems(cartMap);
  };

  // Load cart on mount and when panel opens
  useEffect(() => {
    if (open) {
      loadCartItems();
    }
  }, [open]);

  // Check if product is in cart
  const isInCart = (productId: string) => {
    const key = `${productId}_${projectId || 'null'}_${area || 'null'}`;
    return cartItems.has(key);
  };

  // Get quantity in cart
  const getCartQuantity = (productId: string) => {
    const key = `${productId}_${projectId || 'null'}_${area || 'null'}`;
    return cartItems.get(key)?.quantity || 0;
  };

  // Get selected quantity for a product (defaults to count from design)
  const getSelectedQuantity = (productId: string) => {
    return selectedQuantities.get(productId) || productCounts.get(productId) || 1;
  };

  // Update selected quantity
  const updateSelectedQuantity = (productId: string, delta: number) => {
    const currentQty = getSelectedQuantity(productId);
    const newQty = Math.max(1, currentQty + delta);
    setSelectedQuantities(new Map(selectedQuantities.set(productId, newQty)));
  };

  // Get cart item ID
  const getCartItemId = (productId: string) => {
    const key = `${productId}_${projectId || 'null'}_${area || 'null'}`;
    return cartItems.get(key)?.cartItemId;
  };

  // Add to cart
  const addToCart = async (product: ProductT, quantity: number = 1) => {
    setLoading(true);
    try {
      const result = await cartService.addToCart(
        product.id,
        quantity,
        projectId,
        area,
        { title: product.title, price: product.price, imageUrl: product.imageUrl }
      );

      if (result.success) {
        await loadCartItems();
        // Reset selected quantity after adding
        selectedQuantities.delete(product.id);
        setSelectedQuantities(new Map(selectedQuantities));
        
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
      } else {
        toast.error(result.error || 'Failed to add to cart', {
          duration: 3000,
          position: 'bottom-center',
          style: {
            background: '#dc2626',
            color: '#fff',
            padding: '12px 20px',
            fontSize: '14px',
            borderRadius: '12px',
          },
        });
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error('Failed to add to cart', {
        duration: 3000,
        position: 'bottom-center',
      });
    } finally {
      setLoading(false);
    }
  };

  // Remove from cart
  const removeFromCart = async (productId: string) => {
    setLoading(true);
    try {
      const result = await cartService.removeByProductAndProject(
        productId,
        projectId,
        area
      );

      if (result.success) {
        await loadCartItems();
        
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
      } else {
        toast.error(result.error || 'Failed to remove from cart', {
          duration: 3000,
          position: 'bottom-center',
        });
      }
    } catch (error) {
      console.error('Error removing from cart:', error);
      toast.error('Failed to remove from cart', {
        duration: 3000,
        position: 'bottom-center',
      });
    } finally {
      setLoading(false);
    }
  };

  // Update quantity
  const updateQuantity = async (productId: string, newQty: number) => {
    if (newQty < 1) {
      await removeFromCart(productId);
      return;
    }

    setLoading(true);
    try {
      const cartItemId = getCartItemId(productId);
      
      if (!cartItemId) {
        console.error('Cart item ID not found');
        return;
      }

      const result = await cartService.updateQuantity(cartItemId, newQty);

      if (result.success) {
        await loadCartItems();
      } else {
        toast.error(result.error || 'Failed to update quantity', {
          duration: 3000,
          position: 'bottom-center',
        });
      }
    } catch (error) {
      console.error('Error updating quantity:', error);
      toast.error('Failed to update quantity', {
        duration: 3000,
        position: 'bottom-center',
      });
    } finally {
      setLoading(false);
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
                const selectedQty = getSelectedQuantity(p.id);
                const cleanImageUrl = getFirstImageUrl(p.imageUrl);

                return (
                  <div key={p.id} className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                    {/* Product Image Container - with extra height for quantity selector */}
                    <div className="relative w-full bg-[#f7f4f2]">
                      {/* Image wrapper with aspect ratio */}
                      <div className="relative w-full aspect-square overflow-hidden group">
                        <img
                          src={cleanImageUrl}
                          alt={p.title}
                          className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-300"
                          onClick={() => setLightbox(cleanImageUrl)}
                          onError={(e) => {
                            // Fallback image on error
                            e.currentTarget.src = 'https://via.placeholder.com/400x400?text=Image+Not+Found';
                          }}
                        />
                        
                        {/* Selection Checkmark Badge */}
                        {inCart && (
                          <div className="absolute top-3 left-3 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-lg z-10">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </div>
                      
                      {/* Quantity Selector - positioned below the image */}
                      <div className="p-3 flex items-center justify-center">
                        <div className="flex items-center justify-center gap-0 bg-white rounded-lg shadow-md overflow-hidden w-[140px] border border-gray-200">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              updateSelectedQuantity(p.id, -1);
                            }}
                            className="flex-1 h-10 flex items-center justify-center hover:bg-gray-50 active:bg-gray-100 transition-colors border-r border-gray-200"
                          >
                            <svg className="w-5 h-5 text-[#2e2e2e]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                            </svg>
                          </button>
                          
                          <div className="flex-1 h-10 flex items-center justify-center min-w-[50px] border-r border-gray-200">
                            <span className="text-base font-semibold text-[#2e2e2e]">{selectedQty}</span>
                          </div>
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              updateSelectedQuantity(p.id, 1);
                            }}
                            className="flex-1 h-10 flex items-center justify-center hover:bg-gray-50 active:bg-gray-100 transition-colors"
                          >
                            <svg className="w-5 h-5 text-[#2e2e2e]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Product Info */}
                    <div className="p-4 space-y-2">
                      {/* Product Name */}
                      <h3 className="text-sm font-medium text-[#2e2e2e] line-clamp-2 leading-snug">
                        {p.title}
                      </h3>

                      {/* Product Price */}
                      <p className="text-lg font-bold text-[#d96857]">₹{p.price.toLocaleString()}</p>

                      {/* Cart Actions */}
                      {!inCart ? (
                        <button
                          onClick={() => addToCart(p, selectedQty)}
                          disabled={loading}
                          className="group/btn relative w-full px-5 py-3 bg-gradient-to-r from-[#d96857] via-[#d96857] to-[#c45745] text-white text-sm font-semibold rounded-xl overflow-hidden shadow-lg shadow-[#d96857]/25 hover:shadow-xl hover:shadow-[#d96857]/35 active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {/* Shine effect */}
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700"></div>
                          
                          {/* Button content */}
                          <span className="relative flex items-center justify-center gap-2">
                            <svg className="w-4 h-4 group-hover/btn:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                            </svg>
                            <span className="tracking-wide">Add {selectedQty}x to Cart</span>
                          </span>
                        </button>
                      ) : (
                        <div className="space-y-2">
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
                        </div>
                      )}
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
