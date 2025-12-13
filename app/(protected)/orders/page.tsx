"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useProjects } from "@/lib/contexts/projectsContext";

type Order = {
  id: string;
  created_at: string;
  razorpay_order_id: string;
  razorpay_payment_id: string | null;
  amount: number;
  currency: string;
  status: string;
  items: any[];
  project_ids: string[];
  paid_at: string | null;
  delivery_status?: string;
  estimated_delivery?: string;
  tracking_id?: string;
};

export default function OrdersPage() {
  const { projects } = useProjects();
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    // Check for success message from payment redirect
    if (searchParams.get('success') === 'true') {
      setSuccessMessage('Payment successful! Your order has been placed.');
      // Clear the message after 5 seconds
      setTimeout(() => setSuccessMessage(''), 5000);
    }
    
    loadOrders();
  }, [searchParams]);

  async function loadOrders() {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading orders:', error);
        return;
      }

      setOrders(data || []);
    } catch (err) {
      console.error('Error in loadOrders:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-white p-10">
        <div className="text-zinc-500">Loading Orders...</div>
      </main>
    );
  }

  // Group orders by project
  const ordersByProject = orders.reduce((acc, order) => {
    order.project_ids?.forEach(projectId => {
      if (!acc[projectId]) {
        acc[projectId] = [];
      }
      acc[projectId].push(order);
    });
    
    // Also add to "general" if no projects
    if (!order.project_ids || order.project_ids.length === 0) {
      if (!acc['general']) {
        acc['general'] = [];
      }
      acc['general'].push(order);
    }
    
    return acc;
  }, {} as Record<string, Order[]>);

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-9 w-1.5 rounded-full bg-[#d96857]" />
          <h1 className="text-2xl font-semibold text-[#2e2e2e]">Orders</h1>
        </div>

        {successMessage && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-2xl text-green-700">
            {successMessage}
          </div>
        )}

        {orders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 p-10 text-center text-zinc-500">
            No orders found.
          </div>
        ) : (
          <div className="space-y-6">
            {/* Orders grouped by project */}
            {Object.entries(ordersByProject).map(([projectId, projectOrders]) => {
              const project = projects.find(p => p.id === projectId);
              
              return (
                <div key={projectId} className="border-2 border-zinc-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                  {/* Project Header */}
                  <div className="bg-gradient-to-r from-[#f2f0ed] to-white p-4 border-b border-zinc-200">
                    <div className="font-semibold text-[#2e2e2e]">
                      {projectId === 'general' ? 'General Orders' : (project?.name || 'Unknown Project')}
                    </div>
                    {project?.address && (
                      <div className="text-xs text-zinc-600 mt-0.5">
                        {project.address}
                      </div>
                    )}
                    <div className="text-xs text-zinc-500 mt-1">
                      {projectOrders.length} order{projectOrders.length > 1 ? 's' : ''}
                    </div>
                  </div>

                  {/* Orders Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-zinc-50 text-[#2e2e2e]">
                        <tr>
                          <th className="text-left p-3">Order ID</th>
                          <th className="text-left p-3">Items</th>
                          <th className="text-left p-3">Delivery Status</th>
                          <th className="text-left p-3">Amount</th>
                          <th className="text-left p-3">Date</th>
                          <th className="text-center p-3">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {projectOrders.map((order) => {
                          const deliveryStatus = order.delivery_status || 'order_placed';
                          const statusConfig = {
                            order_placed: { label: 'Order Placed', color: 'bg-[#d96857]/10 text-[#d96857]', icon: '📦' },
                            processing: { label: 'Processing', color: 'bg-[#d96857]/20 text-[#c85746]', icon: '⚙️' },
                            shipped: { label: 'Shipped', color: 'bg-[#2e2e2e]/10 text-[#2e2e2e]', icon: '🚚' },
                            delivered: { label: 'Delivered', color: 'bg-[#2e2e2e]/5 text-[#2e2e2e] border border-[#2e2e2e]/20', icon: '✅' }
                          };
                          const status = statusConfig[deliveryStatus as keyof typeof statusConfig] || statusConfig.order_placed;
                          
                          return (
                            <tr 
                              key={order.id} 
                              className="border-t hover:bg-[#f9f9f8] transition"
                            >
                              <td className="p-3">
                                <div className="font-medium text-[#2e2e2e]">#{order.id.slice(0, 8).toUpperCase()}</div>
                              </td>
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  {order.items?.[0]?.imageUrl && (
                                    <img 
                                      src={order.items[0].imageUrl} 
                                      alt=""
                                      className="w-10 h-10 object-cover rounded border border-zinc-200"
                                    />
                                  )}
                                  <div>
                                    <div className="text-[#2e2e2e] font-medium text-sm">
                                      {order.items?.[0]?.title || 'Product'}
                                    </div>
                                    {order.items?.length > 1 && (
                                      <div className="text-xs text-zinc-500">+{order.items.length - 1} more</div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="p-3">
                                <span className={`px-3 py-1.5 rounded-full text-xs font-medium inline-flex items-center gap-1.5 ${status.color}`}>
                                  <span>{status.icon}</span>
                                  {status.label}
                                </span>
                              </td>
                              <td className="p-3">
                                <div className="font-semibold text-[#2e2e2e]">
                                  ₹{order.amount.toLocaleString('en-IN')}
                                </div>
                              </td>
                              <td className="p-3 text-sm text-zinc-600">
                                {new Date(order.created_at).toLocaleDateString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric'
                                })}
                              </td>
                              <td className="p-3 text-center">
                                <button
                                  onClick={() => window.location.href = `/orders/${order.id}`}
                                  className="px-4 py-2 rounded-xl bg-[#d96857] text-white text-xs font-medium hover:bg-[#c85746] transition"
                                >
                                  Track Order
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
