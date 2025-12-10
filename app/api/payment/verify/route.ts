import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      dbOrderIds, // Now an array of order IDs
    } = await req.json();

    console.log('Verifying payment for orders:', dbOrderIds);

    // Get authorization header
    const authHeader = req.headers.get('authorization');
    
    if (!authHeader) {
      console.error('No authorization header provided');
      return NextResponse.json(
        { error: 'Unauthorized - No auth header' },
        { status: 401 }
      );
    }
    
    // Create Supabase client with auth
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    // Verify the user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('Auth error:', userError);
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }

    console.log('Authenticated user:', user.id);

    // Verify signature
    const generated_signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generated_signature !== razorpay_signature) {
      console.error('Signature mismatch');
      return NextResponse.json(
        { error: 'Invalid payment signature' },
        { status: 400 }
      );
    }

    console.log('Signature verified, updating orders...');

    // Generate invoice number ONCE for all orders in this payment
    // Use raw SQL query since RPC might not work for functions without parameters
    const { data: invoiceResult, error: invoiceError } = await supabase
      .rpc('generate_invoice_number');
    
    let finalInvoiceNumber: string;
    if (invoiceError || !invoiceResult) {
      console.error('Error generating invoice number:', invoiceError);
      // Fallback: generate locally if DB function fails
      const timestamp = Date.now();
      const invoiceNumber = `INV-${new Date().toISOString().slice(0, 7).replace('-', '')}-${timestamp.toString().slice(-4)}`;
      console.log('Using fallback invoice number:', invoiceNumber);
      finalInvoiceNumber = invoiceNumber;
    } else {
      finalInvoiceNumber = invoiceResult;
      console.log('Generated invoice number:', finalInvoiceNumber);
    }
    
    const invoiceDate = new Date().toISOString();

    // Update all orders with the same payment details AND same invoice number
    const updatedOrders = [];
    for (const orderId of dbOrderIds) {
      // First, verify the order belongs to this user
      const { data: existingOrder, error: fetchError } = await supabase
        .from('orders')
        .select('id, user_id, status')
        .eq('id', orderId)
        .single();

      if (fetchError) {
        console.error('Error fetching order:', fetchError);
        continue; // Skip this order but continue with others
      }

      if (existingOrder.user_id !== user.id) {
        console.error('User mismatch - Order user:', existingOrder.user_id, 'Auth user:', user.id);
        continue; // Skip this order
      }

      // Update order with pre-generated invoice number
      const { data: order, error } = await supabase
        .from('orders')
        .update({
          status: 'paid',
          razorpay_payment_id,
          razorpay_signature,
          paid_at: invoiceDate,
          invoice_number: finalInvoiceNumber,
          invoice_date: invoiceDate,
        })
        .eq('id', orderId)
        .select()
        .single();

      if (error) {
        console.error('Database update error for order:', orderId, error);
      } else {
        updatedOrders.push(order);
        
        // Create bill entry for this order if it has a project_id
        if (order.project_ids && order.project_ids.length > 0) {
          const projectId = order.project_ids[0];
          const billNumber = `BILL-${order.id.slice(0, 8).toUpperCase()}`;
          
          console.log('Creating bill record:', {
            project_id: projectId,
            order_id: order.id,
            amount: order.amount,
            user_id: user.id
          });
          
          const { data: billData, error: billError } = await supabase
            .from('project_quotes_bills')
            .insert({
              project_id: projectId,
              document_type: 'bill',
              file_name: `${billNumber}.pdf`,
              file_url: '#', // Placeholder URL - bill is generated on demand
              order_id: order.id,
              amount: order.amount,
              created_at: new Date().toISOString(),
            })
            .select();
          
          if (billError) {
            console.error('❌ Error creating bill record:', {
              error: billError,
              code: billError.code,
              message: billError.message,
              details: billError.details,
              hint: billError.hint
            });
          } else {
            console.log(`✅ Created bill record for order ${order.id}:`, billData);
          }
        } else {
          console.warn(`⚠️ Order ${order.id} has no project_ids, skipping bill creation`);
        }
      }
    }

    if (updatedOrders.length === 0) {
      return NextResponse.json(
        { error: 'Failed to update any orders' },
        { status: 500 }
      );
    }

    console.log('Orders updated successfully:', updatedOrders.length);

    return NextResponse.json({
      success: true,
      orders: updatedOrders,
    });
  } catch (error: any) {
    console.error('Verify payment error:', error);
    return NextResponse.json(
      { error: error.message || 'Payment verification failed' },
      { status: 500 }
    );
  }
}
