"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { demoProductsAll, demoProjects } from "@/lib/demoData";
import { Button } from "@/components/UI";
import { useProjects } from "@/lib/contexts/projectsContext";
import { ChevronDown, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cartService } from "@/lib/services/cartService";

declare global {
  interface Window {
    Razorpay: any;
  }
}

type CartLine = {
  id: string;
  productId: string;
  qty: number;
  projectId?: string;
  area?: string;
  price?: number;
  title?: string;
  imageUrl?: string;
};

export default function CartPage() {
  const { projects } = useProjects();
  const router = useRouter();
  
  function toggleSelect(id: string){ setSelectedIds(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id]); }
  function toggleProject(projectId: string) {
    const projectItems = lines.filter(l => l.projectId === projectId).map(l => l.id);
    const allSelected = projectItems.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !projectItems.includes(id)));
    } else {
      setSelectedIds(prev => [...new Set([...prev, ...projectItems])]);
    }
  }
  
  const [lines, setLines] = useState<CartLine[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [collapsedProjects, setCollapsedProjects] = useState<Set<string>>(new Set());

  // ✅ Load data from Supabase
  useEffect(() => {
    loadCart();
  }, []);

  async function loadCart() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // First get cart items only
      const { data: cartItemsOnly, error: cartError } = await supabase
        .from('cart_items')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (cartError) {
        console.error('Error fetching cart items:', cartError);
        setLoading(false);
        return;
      }

      console.log('Raw cart items from Supabase:', cartItemsOnly);

      // Now try to get product details - first try from products table
      let cartItems = cartItemsOnly;
      
      if (cartItemsOnly && cartItemsOnly.length > 0) {
        // Try to get products for these cart items
        const productIds = cartItemsOnly.map(item => item.product_id);
        const { data: products, error: productsError } = await supabase
          .from('products')
          .select('id, name, selling_price, image_url')
          .in('id', productIds);

        console.log('Products from Supabase:', { products, productsError });

        // Map cart items with product details
        const loadedLines: CartLine[] = cartItemsOnly.map(item => {
          // Try Supabase products first, then demo data
          const supabaseProduct = products?.find(p => p.id === item.product_id);
          const demoProduct = demoProductsAll.find(p => p.id === item.product_id);
          const product = supabaseProduct || demoProduct;
          
          console.log(`Product for ${item.product_id}:`, { supabaseProduct, demoProduct, product });
          
          // Extract first image URL from potentially multiple URLs
          let imageUrl = '';
          if (supabaseProduct?.image_url) {
            // Split by newlines and take first URL, clean it up
            const urls = supabaseProduct.image_url.split('\n').filter(url => url.trim());
            imageUrl = urls[0]?.trim() || '';
          } else if (demoProduct?.imageUrl) {
            imageUrl = demoProduct.imageUrl;
          }
          
          return {
            id: item.id,
            productId: item.product_id,
            qty: item.quantity,
            projectId: item.project_id || undefined,
            area: item.area || undefined,
            price: supabaseProduct?.selling_price || demoProduct?.price || 0,
            title: supabaseProduct?.name || demoProduct?.title || 'Unknown Product',
            imageUrl,
          };
        });
        
        console.log('Final loaded lines:', loadedLines);
        setLines(loadedLines);
        setSelectedIds(loadedLines.map(l => l.id));
      } else {
        setLines([]);
        setSelectedIds([]);
      }
    } catch (error) {
      console.error('Error loading cart:', error);
    } finally {
      setLoading(false);
    }
  }

  // helpers
  async function remove(lineId: string) {
    try {
      // Optimistic update: remove from UI immediately
      setLines(prev => prev.filter(l => l.id !== lineId));
      setSelectedIds(prev => prev.filter(id => id !== lineId));

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', lineId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error removing item:', error);
        // Reload on error to restore correct state
        await loadCart();
      }
    } catch (error) {
      console.error('Error removing item:', error);
      // Reload on error to restore correct state
      await loadCart();
    }
  }

  async function changeQty(lineId: string, delta: number) {
    try {
      const line = lines.find(l => l.id === lineId);
      if (!line) return;
      
      const newQty = Math.max(1, line.qty + delta);
      
      // Optimistic update: update UI immediately
      setLines(prev => prev.map(l => 
        l.id === lineId ? { ...l, qty: newQty } : l
      ));

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('cart_items')
        .update({ quantity: newQty })
        .eq('id', lineId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating quantity:', error);
        // Reload on error to restore correct state
        await loadCart();
      }
    } catch (error) {
      console.error('Error updating quantity:', error);
      // Reload on error to restore correct state
      await loadCart();
    }
  }

  async function clearCart() {
    try {
      await cartService.clearCart();
      await loadCart();
    } catch (error) {
      console.error('Error clearing cart:', error);
    }
  }

  const view = useMemo(() => {
    return lines.map((l: any) => {
      // Use stored product data from cart item (from Supabase join), or fallback to demoProductsAll
      const product = l.price && l.title && l.imageUrl 
        ? { id: l.productId, price: l.price, title: l.title, imageUrl: l.imageUrl }
        : demoProductsAll.find((p) => p.id === l.productId);
      // Try to find project from context first, then fallback to demo projects
      const project = l.projectId
        ? (projects.find((p) => p.id === l.projectId) || demoProjects.find((p) => p.id === l.projectId))
        : undefined;
      return { line: l, product, project };
    });
  }, [lines, projects]);

  // Group items by project
  const groupedByProject = useMemo(() => {
    const groups: Record<string, typeof view> = {};
    const noProject: typeof view = [];
    
    view.forEach((item) => {
      if (item.line.projectId) {
        if (!groups[item.line.projectId]) {
          groups[item.line.projectId] = [];
        }
        groups[item.line.projectId].push(item);
      } else {
        noProject.push(item);
      }
    });
    
    return { groups, noProject };
  }, [view]);

  const subtotal = useMemo(() => {
    return view.reduce((sum, row) => {
      if (!row.product) return sum;
      // Only include selected items in subtotal
      if (!selectedIds.includes(row.line.id)) return sum;
      return sum + row.product.price * row.line.qty;
    }, 0);
  }, [view, selectedIds]);

  // Calculate tax (18% GST example)
  const taxRate = 18;
  const taxAmount = (subtotal * taxRate) / 100;
  const total = subtotal + taxAmount;

  // ✅ Place Order with Razorpay
  async function placeOrder() {
    if (selectedIds.length === 0) return;
    
    setPaying(true);
    try {
      // Get selected items
      const selectedItems = lines.filter(l => selectedIds.includes(l.id));
      
      console.log('🛒 Selected items for payment:', selectedItems);
      console.log('📍 Project IDs per item:', selectedItems.map(i => ({ id: i.productId, projectId: i.projectId })));
      
      // Get unique project IDs
      const projectIds = [...new Set(selectedItems.map(l => l.projectId).filter(Boolean))];
      
      console.log('📋 Unique project IDs:', projectIds);

      // Get user info for Razorpay
      const { data: { session } } = await supabase.auth.getSession();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!session) {
        alert('Please log in to continue');
        setPaying(false);
        return;
      }
      
      // Create Razorpay order
      const response = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          amount: total,
          subtotal: subtotal,
          discount: 0,
          discountType: 'none',
          tax: taxAmount,
          taxRate: taxRate,
          currency: 'INR',
          items: selectedItems,
          projectIds,
        }),
      });

      const { orderId, amount, currency, dbOrderIds, error } = await response.json();

      if (error) {
        alert(error);
        setPaying(false);
        return;
      }

      // Initialize Razorpay checkout
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount,
        currency,
        name: 'Design&Cart',
        description: 'Order Payment',
        order_id: orderId,
        prefill: {
          name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || '',
          email: user?.email || '',
        },
        theme: {
          color: '#d96857',
        },
        handler: async function (response: any) {
          console.log('Payment successful from Razorpay, verifying...', response);
          
          try {
            // Get session for auth
            const { data: { session: currentSession } } = await supabase.auth.getSession();
            
            if (!currentSession) {
              console.error('No session found for payment verification');
              alert('Session expired. Please refresh the page and check your orders.');
              setPaying(false);
              return;
            }
            
            // Verify payment
            console.log('Sending verification request...');
            const verifyResponse = await fetch('/api/payment/verify', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentSession.access_token}`,
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                dbOrderIds, // Pass array of order IDs
              }),
            });

            console.log('Verify response status:', verifyResponse.status);
            
            // Parse response
            let verifyData;
            try {
              verifyData = await verifyResponse.json();
              console.log('Verification response data:', verifyData);
            } catch (parseError) {
              console.error('Failed to parse verification response:', parseError);
              alert('Payment completed but verification response was invalid. Please check your orders.');
              setPaying(false);
              return;
            }

            // Check if verification was successful
            if (verifyResponse.ok && verifyData.success) {
              console.log('✅ Payment verified successfully! Clearing cart and redirecting...');
              
              // Clear cart items BEFORE redirecting
              try {
                const clearResult = await cartService.clearCartItems(selectedIds);
                console.log('Cart cleared:', clearResult);
              } catch (err) {
                console.warn('Cart clear failed (non-critical):', err);
                // Continue with redirect even if cart clear fails
              }
              
              // Redirect to orders page
              window.location.href = `/orders?success=true`;
              return;
            } else {
              console.error('Payment verification failed:', verifyData);
              alert('Payment verification failed. Please contact support.');
              setPaying(false);
            }
          } catch (err) {
            console.error('Payment verification error:', err);
            alert('An error occurred. Your payment may have been received. Please check your orders or contact support.');
            setPaying(false);
          }
        },
        modal: {
          ondismiss: function () {
            setPaying(false);
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (err) {
      console.error('Payment error:', err);
      alert('Failed to initiate payment. Please try again.');
      setPaying(false);
    }
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-9 w-1.5 rounded-full bg-[#d96857]" />
          <h1 className="text-2xl font-semibold text-[#2e2e2e]">Cart</h1>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-zinc-200 p-8 text-zinc-500">
            Loading…
          </div>
        ) : view.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Products list grouped by project */}
            <section className="lg:col-span-2 space-y-5">
              {/* Grouped by Projects */}
              {Object.entries(groupedByProject.groups).map(([projectId, items]) => {
                const project = items[0]?.project;
                const projectItemIds = items.map(i => i.line.id);
                const allSelected = projectItemIds.every(id => selectedIds.includes(id));
                const someSelected = projectItemIds.some(id => selectedIds.includes(id)) && !allSelected;
                const isCollapsed = collapsedProjects.has(projectId);
                const projectTotal = items.reduce((sum, item) => {
                  if (!selectedIds.includes(item.line.id)) return sum;
                  return sum + (item.product?.price || 0) * item.line.qty;
                }, 0);

                return (
                  <div key={projectId} className="border-2 border-zinc-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                    {/* Project Header */}
                    <div className="bg-gradient-to-r from-[#f2f0ed] to-white p-4 border-b border-zinc-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={allSelected}
                            ref={(el) => {
                              if (el) el.indeterminate = someSelected;
                            }}
                            onChange={() => toggleProject(projectId)}
                            className="w-4 h-4"
                          />
                          <button
                            onClick={() => setCollapsedProjects(prev => {
                              const next = new Set(prev);
                              if (next.has(projectId)) {
                                next.delete(projectId);
                              } else {
                                next.add(projectId);
                              }
                              return next;
                            })}
                            className="flex items-center gap-2 hover:text-[#d96857] transition-colors"
                          >
                            {isCollapsed ? (
                              <ChevronRight className="w-5 h-5" />
                            ) : (
                              <ChevronDown className="w-5 h-5" />
                            )}
                            <div className="text-left">
                              <div className="font-semibold text-[#2e2e2e]">
                                {project?.name || 'Unknown Project'}
                              </div>
                              {project?.address && (
                                <div className="text-xs text-zinc-600 mt-0.5">
                                  {project.address}
                                </div>
                              )}
                            </div>
                          </button>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-zinc-500">{items.length} item{items.length > 1 ? 's' : ''}</div>
                          {projectTotal > 0 && (
                            <div className="text-sm font-semibold text-[#d96857]">
                              ₹{projectTotal.toLocaleString("en-IN")}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Project Items */}
                    {!isCollapsed && (
                      <div className="divide-y divide-zinc-100">
                        {items.map(({ line, product, project }) => (
                          <div
                            key={line.id}
                            className="p-3 hover:bg-zinc-50 transition"
                          >
                            <div className="flex gap-3">
                              <input type="checkbox" className="mt-2" checked={selectedIds.includes(line.id)} onChange={()=>toggleSelect(line.id)} />
                    <img
                      src={product?.imageUrl}
                      alt={product?.title}
                      className="w-24 h-24 object-cover rounded-xl border border-zinc-200"
                    />
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-[#2e2e2e]">
                            {product?.title}
                          </div>
                          <div className={`mt-1 text-xs ${selectedIds.includes(line.id) ? "text-zinc-600" : "text-zinc-400 line-through"}`}>
                            ₹{product?.price.toLocaleString("en-IN")} per item
                          </div>

                          {/* Project and Address Info */}
                          {project && (
                            <div className="mt-3 space-y-1.5">
                              <div className="flex items-start gap-1.5">
                                <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide">Project:</span>
                                <span className="text-xs font-medium text-[#2e2e2e]">{project.name}</span>
                              </div>
                              {project.address && (
                                <div className="flex items-start gap-1.5">
                                  <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide">Delivering Address:</span>
                                  <span className="text-xs text-zinc-600 leading-relaxed">{project.address}</span>
                                </div>
                              )}
                            </div>
                          )}

                              {/* Area Tag */}
                              {line.area && (
                                <div className="mt-2">
                                  <span className="inline-block bg-[#f2f0ed] border border-zinc-200 rounded-2xl px-2 py-1 text-xs text-[#2e2e2e]">
                                    Area: {line.area}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className={`text-sm font-semibold ${selectedIds.includes(line.id) ? "text-[#2e2e2e]" : "text-zinc-400 line-through"}`}>
                              ₹{((product?.price || 0) * line.qty).toLocaleString("en-IN")}
                            </div>
                          </div>

                          {/* Quantity / Remove */}
                          <div className="mt-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => changeQty(line.id, -1)}
                                className="rounded-2xl border border-zinc-300 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50"
                              >
                                −
                              </button>
                              <div className="w-8 text-center text-sm">{line.qty}</div>
                              <button
                                onClick={() => changeQty(line.id, +1)}
                                className="rounded-2xl border border-zinc-300 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50"
                              >
                                +
                              </button>
                            </div>

                            <button
                              onClick={() => remove(line.id)}
                              className="text-xs text-zinc-600 hover:text-[#d96857]"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

              {/* Items without project */}
              {groupedByProject.noProject.length > 0 && (
                <div className="border-2 border-zinc-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                  <div className="bg-gradient-to-r from-zinc-100 to-white p-4 border-b border-zinc-200">
                    <div className="font-semibold text-[#2e2e2e]">Other Items</div>
                    <div className="text-xs text-zinc-500 mt-0.5">{groupedByProject.noProject.length} item{groupedByProject.noProject.length > 1 ? 's' : ''}</div>
                  </div>
                  <div className="divide-y divide-zinc-100">
                    {groupedByProject.noProject.map(({ line, product }) => (
                      <div key={line.id} className="p-3 hover:bg-zinc-50 transition">
                        <div className="flex gap-3">
                          <input type="checkbox" className="mt-2" checked={selectedIds.includes(line.id)} onChange={()=>toggleSelect(line.id)} />
                          <img
                            src={product?.imageUrl}
                            alt={product?.title}
                            className="w-24 h-24 object-cover rounded-xl border border-zinc-200"
                          />
                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="text-sm font-semibold text-[#2e2e2e]">
                                  {product?.title}
                                </div>
                                <div className={`mt-1 text-xs ${selectedIds.includes(line.id) ? "text-zinc-600" : "text-zinc-400 line-through"}`}>
                                  ₹{product?.price.toLocaleString("en-IN")} per item
                                </div>
                                {line.area && (
                                  <div className="mt-2">
                                    <span className="inline-block bg-[#f2f0ed] border border-zinc-200 rounded-2xl px-2 py-1 text-xs text-[#2e2e2e]">
                                      Area: {line.area}
                                    </span>
                                  </div>
                                )}
                              </div>
                              <div className={`text-sm font-semibold ${selectedIds.includes(line.id) ? "text-[#2e2e2e]" : "text-zinc-400 line-through"}`}>
                                ₹{((product?.price || 0) * line.qty).toLocaleString("en-IN")}
                              </div>
                            </div>
                            <div className="mt-3 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => changeQty(line.id, -1)}
                                  className="rounded-2xl border border-zinc-300 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50"
                                >
                                  −
                                </button>
                                <div className="w-8 text-center text-sm">{line.qty}</div>
                                <button
                                  onClick={() => changeQty(line.id, +1)}
                                  className="rounded-2xl border border-zinc-300 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50"
                                >
                                  +
                                </button>
                              </div>
                              <button
                                onClick={() => remove(line.id)}
                                className="text-xs text-zinc-600 hover:text-[#d96857]"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-4">
                <Link
                  href="/products"
                  className="text-sm text-[#2e2e2e] underline underline-offset-4"
                >
                  ← Continue Shopping
                </Link>
                <button
                  onClick={clearCart}
                  className="text-sm text-zinc-600 hover:text-[#d96857]"
                >
                  Clear Cart
                </button>
              </div>
            </section>

            {/* Summary */}
            <aside className="lg:sticky lg:top-20 h-fit">
              <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                <h2 className="text-sm font-semibold text-[#2e2e2e] mb-3">
                  Order Summary
                </h2>
                <div className="space-y-2 text-sm">
                  <Row label="Subtotal" value={`₹${subtotal.toLocaleString("en-IN")}`} />
                  <Row label="Tax (GST 18%)" value={`₹${taxAmount.toLocaleString("en-IN")}`} />
                  <div className="h-px bg-zinc-200 my-2" />
                  <Row
                    label="Total"
                    value={`₹${total.toLocaleString("en-IN")}`}
                    strong
                  />
                </div>

                <Button
                  onClick={placeOrder} 
                  disabled={selectedIds.length === 0 || paying}
                  className="mt-4 w-full bg-[#d96857] text-white rounded-2xl py-2 font-medium hover:opacity-95 disabled:opacity-50"
                >
                  {paying ? 'Processing...' : 'Pay Now'}
                </Button>

                <p className="mt-2 text-[11px] text-zinc-500 text-center">
                  Secure payment via Razorpay
                </p>
              </div>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-zinc-600 ${strong ? "font-semibold text-[#2e2e2e]" : ""}`}>
        {label}
      </span>
      <span className={`text-[#2e2e2e] ${strong ? "font-semibold" : ""}`}>{value}</span>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-zinc-200 p-12 text-center bg-white shadow-sm">
      {/* Shopping Cart Icon */}
      <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-[#d96857]/10 to-[#d96857]/5 flex items-center justify-center mb-5">
        <svg className="w-10 h-10 text-[#d96857]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      </div>
      
      <h2 className="text-xl font-semibold text-[#2e2e2e] mb-2">Your cart is empty</h2>
      <p className="text-sm text-zinc-500 mb-6 max-w-sm mx-auto">
        Start adding products to your projects and they'll appear here
      </p>
      
      <Link
        href="/products"
        className="inline-flex items-center gap-2 rounded-xl bg-[#d96857] text-white text-sm font-medium px-6 py-3 hover:bg-[#c85746] transition-colors shadow-sm"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
        Browse Products
      </Link>
    </div>
  );
}
