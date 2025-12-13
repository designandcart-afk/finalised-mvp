import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const { 
      amount, 
      currency = 'INR', 
      items, 
      projectIds,
      discount = 0,
      discountType = 'none',
      subtotal,
      tax = 0,
      taxRate = 0
    } = await req.json();

    // Get authorization header
    const authHeader = req.headers.get('authorization');
    
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized - No auth header' },
        { status: 401 }
      );
    }

    // Create Supabase client with the auth token
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('Auth error:', userError);
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }

    // Validate Razorpay credentials
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return NextResponse.json(
        { error: 'Payment gateway not configured' },
        { status: 500 }
      );
    }

    // Initialize Razorpay
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount: amount * 100, // Convert to paise (smallest currency unit)
      currency,
      receipt: `receipt_${Date.now()}`,
      notes: {
        projectIds: JSON.stringify(projectIds || []),
      },
    });

    // Group items by project
    console.log('📦 Received items:', JSON.stringify(items, null, 2));
    
    const itemsByProject: Record<string, any[]> = {};
    items.forEach((item: any) => {
      const projectId = item.projectId || 'general';
      console.log(`Item ${item.productId} assigned to project: ${projectId}`);
      if (!itemsByProject[projectId]) {
        itemsByProject[projectId] = [];
      }
      itemsByProject[projectId].push(item);
    });

    console.log('📊 Items grouped by project:', Object.keys(itemsByProject));

    // Calculate project-wise amounts
    const projectOrders = Object.entries(itemsByProject).map(([projectId, projectItems]) => {
      const projectSubtotal = projectItems.reduce((sum, item) => sum + (item.price * item.qty), 0);
      const projectTax = (projectSubtotal * taxRate) / 100;
      const projectTotal = projectSubtotal + projectTax;
      
      console.log(`💰 Project ${projectId}: ${projectItems.length} items, ₹${projectTotal}`);
      
      return {
        projectId,
        items: projectItems,
        subtotal: projectSubtotal,
        tax: projectTax,
        amount: projectTotal,
      };
    });

    // Create separate order for each project
    const dbOrders = [];
    console.log(`🔨 Creating ${projectOrders.length} separate orders...`);
    
    for (const projectOrder of projectOrders) {
      console.log(`Creating order for project ${projectOrder.projectId}...`);
      
      const { data: dbOrder, error: dbError } = await supabase
        .from('orders')
        .insert({
          user_id: user?.id,
          razorpay_order_id: order.id, // Same Razorpay order ID for all
          amount: projectOrder.amount,
          subtotal: projectOrder.subtotal,
          discount: 0, // Discount already applied in total calculation
          discount_type: 'none',
          tax: projectOrder.tax,
          tax_rate: taxRate,
          currency: currency,
          status: 'pending',
          items: projectOrder.items,
          project_ids: [projectOrder.projectId], // Single project per order
        })
        .select()
        .single();

      if (dbError) {
        console.error('Database error:', dbError);
        return NextResponse.json(
          { error: 'Failed to create order' },
          { status: 500 }
        );
      }
      
      console.log(`✅ Created order ${dbOrder.id} for project ${projectOrder.projectId}`);
      dbOrders.push(dbOrder);
    }

    console.log(`✅ Successfully created ${dbOrders.length} orders:`, dbOrders.map(o => o.id));

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      dbOrderIds: dbOrders.map(o => o.id), // Return all order IDs
    });
  } catch (error: any) {
    console.error('Create order error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create order' },
      { status: 500 }
    );
  }
}
