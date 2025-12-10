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
  subtotal?: number;
  discount?: number;
  discount_type?: 'percentage' | 'fixed' | 'none';
  tax?: number;
  tax_rate?: number;
  currency: string;
  status: string;
  items: any[];
  project_ids: string[];
  paid_at: string | null;
  delivery_status?: string;
  estimated_delivery?: string;
  tracking_id?: string;
  invoice_number?: string;
  invoice_date?: string;
  invoice_pdf_url?: string;
};

export default function OrdersPage() {
  const { projects } = useProjects();
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState("");
  const [activeTab, setActiveTab] = useState<'projects' | 'invoices'>('projects');

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
        .eq('status', 'paid') // Only fetch paid orders
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
    // Each order now has only one project
    const projectId = order.project_ids?.[0] || 'general';
    if (!acc[projectId]) {
      acc[projectId] = [];
    }
    acc[projectId].push(order);
    
    return acc;
  }, {} as Record<string, Order[]>);

  // For invoice view - get unique orders only (no duplicates)
  const uniqueOrders = orders;

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-9 w-1.5 rounded-full bg-[#d96857]" />
          <h1 className="text-2xl font-semibold text-[#2e2e2e]">Orders & Invoices</h1>
        </div>

        {successMessage && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-2xl text-green-700 flex items-center gap-2">
            <span className="text-lg">✓</span>
            {successMessage}
          </div>
        )}

        {orders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 p-10 text-center text-zinc-500">
            No orders found.
          </div>
        ) : (
          <>
            {/* Tab Navigation */}
            <div className="mb-6 border-b border-zinc-200">
              <div className="flex gap-1">
                <button
                  onClick={() => setActiveTab('projects')}
                  className={`px-6 py-3 text-sm font-medium transition-all relative ${
                    activeTab === 'projects'
                      ? 'text-[#d96857]'
                      : 'text-zinc-500 hover:text-[#2e2e2e]'
                  }`}
                >
                  By Project
                  {activeTab === 'projects' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#d96857]" />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('invoices')}
                  className={`px-6 py-3 text-sm font-medium transition-all relative ${
                    activeTab === 'invoices'
                      ? 'text-[#d96857]'
                      : 'text-zinc-500 hover:text-[#2e2e2e]'
                  }`}
                >
                  Invoices
                  {activeTab === 'invoices' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#d96857]" />
                  )}
                </button>
              </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'projects' ? (
              <ProjectView orders={orders} projects={projects} ordersByProject={ordersByProject} />
            ) : (
              <InvoiceView orders={uniqueOrders} projects={projects} />
            )}
          </>
        )}
      </div>
    </main>
  );
}

// Project View Component
function ProjectView({ orders, projects, ordersByProject }: { orders: Order[], projects: any[], ordersByProject: Record<string, Order[]> }) {
  return (
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
                    
                    // Since each order now has only one project, all items belong to this project
                    const orderAmount = order.amount;
                    const orderItems = order.items || [];
                    
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
                            {orderItems[0]?.imageUrl && (
                              <img 
                                src={orderItems[0].imageUrl} 
                                alt=""
                                className="w-10 h-10 object-cover rounded border border-zinc-200"
                              />
                            )}
                            <div>
                              <div className="text-[#2e2e2e] font-medium text-sm">
                                {orderItems[0]?.title || 'Product'}
                              </div>
                              {orderItems.length > 1 && (
                                <div className="text-xs text-zinc-500">+{orderItems.length - 1} more</div>
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
                            ₹{orderAmount.toLocaleString('en-IN')}
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
  );
}

// Invoice View Component
function InvoiceView({ orders, projects }: { orders: Order[], projects: any[] }) {
  // Group orders by invoice number
  const ordersByInvoice: Record<string, Order[]> = {};
  orders.forEach(order => {
    const invoiceNum = order.invoice_number || `INV-${order.id.slice(0, 8)}`;
    if (!ordersByInvoice[invoiceNum]) {
      ordersByInvoice[invoiceNum] = [];
    }
    ordersByInvoice[invoiceNum].push(order);
  });

  return (
    <div className="space-y-5">
      {Object.entries(ordersByInvoice).map(([invoiceNumber, invoiceOrders]) => {
        // Calculate total for all orders in this invoice
        const invoiceTotal = invoiceOrders.reduce((sum, order) => sum + order.amount, 0);
        const invoiceDate = invoiceOrders[0]?.invoice_date || invoiceOrders[0]?.paid_at || invoiceOrders[0]?.created_at;

        return (
          <div key={invoiceNumber} className="border border-zinc-200 rounded-2xl overflow-hidden bg-white">
            {/* Invoice Header */}
            <div className="bg-zinc-50/50 px-5 py-4 border-b border-zinc-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold text-[#2e2e2e]">
                    {invoiceNumber}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Paid
                  </span>
                  <span className="text-xs text-zinc-500">
                    {new Date(invoiceDate).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </span>
                </div>
                <div className="text-lg font-bold text-[#d96857]">
                  ₹{invoiceTotal.toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            {/* Orders Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white border-b border-zinc-100">
                  <tr>
                    <th className="text-left px-5 py-3 text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">Order ID</th>
                    <th className="text-left px-5 py-3 text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">Project</th>
                    <th className="text-center px-5 py-3 text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">Items</th>
                    <th className="text-right px-5 py-3 text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">Amount</th>
                    <th className="text-right px-5 py-3 text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {invoiceOrders.map((order, index) => {
                    const project = projects.find(p => p.id === order.project_ids?.[0]);
                    const itemCount = order.items?.length || 0;

                    return (
                      <tr key={order.id} className="hover:bg-zinc-50/50 transition-colors">
                        <td className="px-5 py-3">
                          <div className="font-mono text-xs font-medium text-zinc-600">
                            #{order.id.slice(0, 8).toUpperCase()}
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <div className="text-sm font-medium text-[#2e2e2e]">
                            {project?.name || 'General'}
                          </div>
                        </td>
                        <td className="px-5 py-3 text-center">
                          <span className="text-xs text-zinc-600">
                            {itemCount} {itemCount !== 1 ? 'items' : 'item'}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <div className="text-sm font-semibold text-[#2e2e2e]">
                            ₹{order.amount.toLocaleString('en-IN')}
                          </div>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <button
                            onClick={() => window.location.href = `/orders/${order.id}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[#d96857] text-xs font-medium hover:bg-[#d96857]/5 transition-colors"
                          >
                            View
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Download Invoice Button */}
            <div className="px-5 py-4 bg-zinc-50/30 border-t border-zinc-100">
              <button
                onClick={async () => {
                  try {
                    // Get session for auth
                    const { data: { session } } = await supabase.auth.getSession();
                    
                    if (!session) {
                      alert('Please log in to download invoice');
                      return;
                    }

                    // Use first order ID for invoice generation
                    const response = await fetch('/api/invoice/generate', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`,
                      },
                      body: JSON.stringify({
                        orderId: invoiceOrders[0].id,
                      }),
                    });

                    const data = await response.json();

                    if (data.success && data.html) {
                      // Open invoice HTML in new window for printing/saving as PDF
                      const printWindow = window.open('', '_blank');
                      if (printWindow) {
                        printWindow.document.write(data.html);
                        printWindow.document.close();
                        
                        // Auto-trigger print dialog after a short delay
                        setTimeout(() => {
                          printWindow.print();
                        }, 500);
                      }
                    } else {
                      alert('Failed to generate invoice: ' + (data.error || 'Unknown error'));
                    }
                  } catch (error) {
                    console.error('Invoice generation error:', error);
                    alert('Failed to generate invoice');
                  }
                }}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#d96857] text-white text-sm font-medium hover:bg-[#c85746] transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download Invoice
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
