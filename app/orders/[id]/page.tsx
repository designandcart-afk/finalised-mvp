
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useProjects } from "@/lib/contexts/projectsContext";
import { CheckCircle2, Package, Truck, Home, Clock } from "lucide-react";

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

const deliveryStages = [
  { 
    key: 'order_placed', 
    label: 'Order Placed', 
    icon: CheckCircle2,
    description: 'Your order has been confirmed'
  },
  { 
    key: 'processing', 
    label: 'Processing', 
    icon: Package,
    description: 'We are preparing your items'
  },
  { 
    key: 'shipped', 
    label: 'Shipped', 
    icon: Truck,
    description: 'Your order is on the way'
  },
  { 
    key: 'delivered', 
    label: 'Delivered', 
    icon: Home,
    description: 'Order has been delivered'
  },
];

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { projects } = useProjects();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrder();
  }, [params.id]);

  async function loadOrder() {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', params.id)
        .single();

      if (error) {
        console.error('Error loading order:', error);
        return;
      }

      setOrder(data);
    } catch (err) {
      console.error('Error in loadOrder:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-white p-10">
        <div className="text-zinc-500">Loading order details...</div>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="min-h-screen bg-white p-10">
        <div className="text-zinc-500">Order not found</div>
      </main>
    );
  }

  // Determine current stage based on delivery_status
  const currentStageKey = order.delivery_status || 'order_placed';
  const currentStageIndex = deliveryStages.findIndex(s => s.key === currentStageKey);

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="text-sm text-zinc-600 hover:text-[#d96857] mb-3"
          >
            ← Back to Orders
          </button>
          <div className="flex items-center gap-3">
            <div className="h-9 w-1.5 rounded-full bg-[#d96857]" />
            <div>
              <h1 className="text-2xl font-semibold text-[#2e2e2e]">Order Details</h1>
              <p className="text-sm text-zinc-500 mt-1">Order ID: {order.id.slice(0, 8)}...</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Delivery Tracker */}
            <div className="border-2 border-zinc-200 rounded-2xl p-6 bg-white shadow-sm">
              <h2 className="text-lg font-semibold text-[#2e2e2e] mb-6">Delivery Status</h2>
              
              <div className="relative">
                {deliveryStages.map((stage, index) => {
                  const Icon = stage.icon;
                  const isCompleted = index <= currentStageIndex;
                  const isCurrent = index === currentStageIndex;
                  
                  return (
                    <div key={stage.key} className="relative">
                      {/* Connector Line */}
                      {index < deliveryStages.length - 1 && (
                        <div 
                          className={`absolute left-6 top-12 w-0.5 h-16 ${
                            index < currentStageIndex ? 'bg-[#d96857]' : 'bg-zinc-200'
                          }`}
                        />
                      )}
                      
                      {/* Stage */}
                      <div className="flex items-start gap-4 pb-8">
                        <div className={`relative flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                          isCompleted 
                            ? 'bg-[#d96857]/10 border-2 border-[#d96857]' 
                            : 'bg-zinc-100 border-2 border-zinc-300'
                        }`}>
                          <Icon className={`w-6 h-6 ${
                            isCompleted ? 'text-[#d96857]' : 'text-zinc-400'
                          }`} />
                          {isCurrent && (
                            <div className="absolute -right-1 -top-1 w-3 h-3 bg-[#d96857] rounded-full animate-pulse" />
                          )}
                        </div>
                        
                        <div className="flex-1 pt-2">
                          <div className={`font-semibold ${
                            isCompleted ? 'text-[#2e2e2e]' : 'text-zinc-400'
                          }`}>
                            {stage.label}
                          </div>
                          <div className={`text-sm mt-1 ${
                            isCompleted ? 'text-zinc-600' : 'text-zinc-400'
                          }`}>
                            {stage.description}
                          </div>
                          {isCurrent && order.estimated_delivery && (
                            <div className="flex items-center gap-1 mt-2 text-xs text-[#d96857]">
                              <Clock className="w-3 h-3" />
                              <span>Est. delivery: {new Date(order.estimated_delivery).toLocaleDateString('en-IN')}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {order.tracking_id && (
                <div className="mt-6 p-4 bg-[#f9f9f8] rounded-xl">
                  <div className="text-xs text-zinc-500 mb-1">Tracking ID</div>
                  <div className="font-mono text-sm text-[#2e2e2e]">{order.tracking_id}</div>
                </div>
              )}
            </div>

            {/* Order Items */}
            <div className="border-2 border-zinc-200 rounded-2xl overflow-hidden bg-white shadow-sm">
              <div className="bg-gradient-to-r from-[#f2f0ed] to-white p-4 border-b border-zinc-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-[#2e2e2e]">Items Ordered</h2>
                    <div className="text-xs text-zinc-500 mt-0.5">
                      {order.items?.length || 0} item{(order.items?.length || 0) > 1 ? 's' : ''}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-[#d96857]">
                      ₹{order.amount.toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="divide-y divide-zinc-100">
                {order.items?.map((item, idx) => (
                  <div key={idx} className="p-4 flex items-center gap-4 hover:bg-zinc-50 transition">
                    {item.imageUrl && (
                      <img 
                        src={item.imageUrl} 
                        alt={item.title}
                        className="w-20 h-20 object-cover rounded-xl border border-zinc-200"
                      />
                    )}
                    <div className="flex-1">
                      <div className="font-semibold text-[#2e2e2e]">{item.title || item.productId}</div>
                      <div className="flex items-center gap-3 mt-2 text-xs text-zinc-600">
                        <span>Qty: {item.qty}</span>
                        {item.area && (
                          <><span>•</span><span>Area: {item.area}</span></>
                        )}
                      </div>
                      <div className="text-xs text-zinc-500 mt-1">
                        ₹{(item.price || 0).toLocaleString('en-IN')} per item
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-[#2e2e2e]">
                        ₹{((item.price || 0) * item.qty).toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Order Summary */}
            <div className="border-2 border-zinc-200 rounded-2xl p-5 bg-white shadow-sm sticky top-6">
              <h2 className="font-semibold text-[#2e2e2e] mb-4 pb-3 border-b border-zinc-200">Order Information</h2>
              
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-600">Order ID</span>
                  <span className="font-mono text-xs text-[#2e2e2e]">#{order.id.slice(0, 8)}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-zinc-600">Status</span>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    order.status === 'paid'
                      ? 'bg-green-100 text-green-700'
                      : order.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-zinc-100 text-zinc-600'
                  }`}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-xs pt-2 border-t border-zinc-200">
                  <span className="text-zinc-500">Order Date</span>
                  <span className="text-zinc-600">
                    {new Date(order.created_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </span>
                </div>

                {order.paid_at && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500">Paid On</span>
                    <span className="text-zinc-600">
                      {new Date(order.paid_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                )}
              </div>

              {/* Delivery Address */}
              {order.project_ids && order.project_ids.length > 0 && (
                <>
                  <div className="h-px bg-zinc-200 my-4" />
                  <div>
                    <div className="text-xs font-medium text-zinc-500 mb-2">DELIVERY TO</div>
                    {order.project_ids.map(projectId => {
                      const project = projects.find(p => p.id === projectId);
                      return project ? (
                        <div key={projectId} className="bg-zinc-50 rounded-lg p-3">
                          <div className="font-semibold text-sm text-[#2e2e2e]">{project.name}</div>
                          {project.address && (
                            <div className="text-xs text-zinc-600 mt-1.5 leading-relaxed">
                              {project.address}
                            </div>
                          )}
                        </div>
                      ) : null;
                    })}
                  </div>
                </>
              )}

              {order.razorpay_payment_id && (
                <>
                  <div className="h-px bg-zinc-200 my-4" />
                  <div>
                    <div className="text-xs font-medium text-zinc-500 mb-2">PAYMENT ID</div>
                    <div className="text-xs font-mono text-zinc-600 break-all bg-zinc-50 p-2 rounded">
                      {order.razorpay_payment_id}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
