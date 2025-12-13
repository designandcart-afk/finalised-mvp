import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      dbOrderId,
    } = await req.json();

    console.log('Verifying payment for order:', dbOrderId);

    // Get authorization header
    const authHeader = req.headers.get('authorization');
    
    // Create Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    const supabase = authHeader 
      ? createClient(supabaseUrl, supabaseKey, {
          global: {
            headers: {
              Authorization: authHeader,
            },
          },
        })
      : createClient(supabaseUrl, supabaseKey);

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

    console.log('Signature verified, updating order...');

    // Update order in database
    const { data: order, error } = await supabase
      .from('orders')
      .update({
        status: 'paid',
        razorpay_payment_id,
        razorpay_signature,
        paid_at: new Date().toISOString(),
      })
      .eq('id', dbOrderId)
      .select()
      .single();

    if (error) {
      console.error('Database update error:', error);
      console.error('Attempted to update order ID:', dbOrderId);
      return NextResponse.json(
        { error: 'Failed to update order', details: error.message },
        { status: 500 }
      );
    }

    console.log('Order updated successfully:', order);

    return NextResponse.json({
      success: true,
      order,
    });
  } catch (error: any) {
    console.error('Verify payment error:', error);
    return NextResponse.json(
      { error: error.message || 'Payment verification failed' },
      { status: 500 }
    );
  }
}
