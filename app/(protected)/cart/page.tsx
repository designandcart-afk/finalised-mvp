"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { demoProductsAll, demoProjects, demoCart } from "@/lib/demoData";
import { Button } from "@/components/UI";
import { useProjects } from "@/lib/contexts/projectsContext";
import { ChevronDown, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";

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
};

const CART_KEY = "dc:cart";
const ORDERS_KEY = "dc:orders";

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

  // ✅ Load data from localStorage and filter out demo cart items
  useEffect(() => {
    const existing = localStorage.getItem(CART_KEY);
    let loadedLines: CartLine[] = [];
    
    if (!existing || existing === "[]") {
      loadedLines = [];
    } else {
      loadedLines = JSON.parse(existing);
      // Filter out demo cart items (line_1, line_2, line_3)
      loadedLines = loadedLines.filter((l: CartLine) => 
        !['line_1', 'line_2', 'line_3'].includes(l.id)
      );
    }
    
    setLines(loadedLines);
    // Initialize all items as selected
    setSelectedIds(loadedLines.map((l: CartLine) => l.id));
    setLoading(false);
  }, []);

  // helpers
  function save(next: CartLine[]) {
    setLines(next);
    localStorage.setItem(CART_KEY, JSON.stringify(next));
  }

  function remove(lineId: string) {
    save(lines.filter((l) => l.id !== lineId));
  }

  function changeQty(lineId: string, delta: number) {
    save(
      lines.map((l) =>
        l.id === lineId ? { ...l, qty: Math.max(1, l.qty + delta) } : l
      )
    );
  }

  function clearCart() {
    save([]);
  }

  const view = useMemo(() => {
    return lines.map((l: any) => {
      // Use stored product data from cart item, or fallback to demoProductsAll
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

  // ✅ Place Order with Razorpay
  async function placeOrder() {
    if (selectedIds.length === 0) return;
    
    setPaying(true);
    try {
      // Get selected items
      const selectedItems = lines.filter(l => selectedIds.includes(l.id));
      
      // Get unique project IDs
      const projectIds = [...new Set(selectedItems.map(l => l.projectId).filter(Boolean))];

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
          amount: subtotal,
          currency: 'INR',
          items: selectedItems,
          projectIds,
        }),
      });

      const { orderId, amount, currency, dbOrderId, error } = await response.json();

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
        notes: {
          company: 'DESYNKART TECHNOLOGIES PRIVATE LIMITED',
          brand: 'Design&Cart',
          year: '2025',
        },
        theme: {
          color: '#d96857',
        },
        handler: async function (response: any) {
          try {
            // Get session for auth
            const { data: { session: currentSession } } = await supabase.auth.getSession();
            
            // Verify payment
            const verifyResponse = await fetch('/api/payment/verify', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': currentSession ? `Bearer ${currentSession.access_token}` : '',
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                dbOrderId,
              }),
            });

            const verifyData = await verifyResponse.json();

            if (verifyData.success) {
              // Clear cart
              save(lines.filter(l => !selectedIds.includes(l.id)));
              setSelectedIds([]);
              
              // Redirect to orders page
              router.push(`/orders?success=true&orderId=${dbOrderId}`);
            } else {
              alert('Payment verification failed. Please contact support.');
            }
          } catch (err) {
            console.error('Payment verification error:', err);
            alert('Payment verification failed. Please contact support.');
          } finally {
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
                  <Row label="Shipping" value="—" />
                  <Row label="Tax" value="—" />
                  <div className="h-px bg-zinc-200 my-2" />
                  <Row
                    label="Total"
                    value={`₹${subtotal.toLocaleString("en-IN")}`}
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

      {/* Footer */}
      <footer className="border-t border-zinc-200 bg-white mt-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-xs text-zinc-600">
            © 2025 DESYNKART TECHNOLOGIES PRIVATE LIMITED
          </p>
          <p className="text-center text-xs text-zinc-500 mt-1">
            Brand: Design&Cart
          </p>
        </div>
      </footer>
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
    <div className="rounded-2xl border border-dashed border-zinc-300 p-10 text-center bg-white">
      <div className="mx-auto w-28 h-28 rounded-full bg-[#f2f0ed] mb-4" />
      <h2 className="text-lg font-semibold text-[#2e2e2e]">Your cart is empty</h2>
      <p className="text-sm text-zinc-600 mt-1">
        Browse products and add them to your project.
      </p>
      <Link
        href="/products"
        className="inline-flex mt-4 rounded-2xl bg-[#d96857] text-white text-sm font-medium px-4 py-2 hover:opacity-95"
      >
        Go to Products
      </Link>
    </div>
  );
}
