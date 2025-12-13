import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { createClient } from '@supabase/supabase-js';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('=== CREATE DESIGN PAYMENT API CALLED ===');
    const projectId = params.id;
    const {
      estimateId,
      paymentType, // 'advance' or 'balance'
      amount,
      currency = 'INR',
    } = await req.json();

    console.log('Request data:', { projectId, estimateId, paymentType, amount, currency });

    // Validation
    if (!estimateId || !paymentType || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!['advance', 'balance'].includes(paymentType)) {
      return NextResponse.json(
        { error: 'Invalid payment type. Must be "advance" or "balance"' },
        { status: 400 }
      );
    }

    // Get authorization header
    const authHeader = req.headers.get('authorization');
    
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Create Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    // Verify user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('User verification error:', userError);
      return NextResponse.json(
        { error: 'Unauthorized - User verification failed' },
        { status: 401 }
      );
    }

    console.log('User verified:', user.id);

    // Verify project ownership
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, user_id')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      );
    }

    // Verify estimate exists and belongs to project
    const { data: estimate, error: estimateError } = await supabase
      .from('project_design_estimates')
      .select('id, estimate_number, total_amount')
      .eq('id', estimateId)
      .eq('project_id', projectId)
      .single();

    if (estimateError || !estimate) {
      return NextResponse.json(
        { error: 'Estimate not found' },
        { status: 404 }
      );
    }

    // Check if payment already exists for this type
    const { data: existingPayment, error: paymentCheckError } = await supabase
      .from('project_design_payments')
      .select('id, status')
      .eq('project_id', projectId)
      .eq('estimate_id', estimateId)
      .eq('payment_type', paymentType)
      .eq('status', 'paid')
      .maybeSingle();

    if (paymentCheckError && paymentCheckError.code !== 'PGRST116') {
      console.error('Payment check error:', paymentCheckError);
      return NextResponse.json(
        { error: 'Failed to check existing payments' },
        { status: 500 }
      );
    }

    if (existingPayment) {
      return NextResponse.json(
        { error: `${paymentType} payment already completed for this estimate` },
        { status: 400 }
      );
    }

    // Validate Razorpay credentials
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      console.error('Razorpay configuration missing:', { 
        keyId: !!process.env.RAZORPAY_KEY_ID, 
        keySecret: !!process.env.RAZORPAY_KEY_SECRET 
      });
      return NextResponse.json(
        { error: 'Payment gateway not configured' },
        { status: 500 }
      );
    }

    console.log('Razorpay credentials found, initializing...');

    // Initialize Razorpay
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });

    // Create Razorpay order
    console.log('Creating Razorpay order with amount:', Math.round(amount * 100));
    const receiptId = `${paymentType.substring(0,3)}_${Date.now()}`.substring(0, 40);
    console.log('Receipt ID:', receiptId);
    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(amount * 100), // Convert to paise
      currency,
      receipt: receiptId,
      notes: {
        project_id: projectId,
        estimate_id: estimateId,
        payment_type: paymentType,
        user_id: user.id,
      },
    });

    console.log('Razorpay order created successfully:', razorpayOrder.id);

    // Create payment record in database
    const { data: payment, error: insertError } = await supabase
      .from('project_design_payments')
      .insert({
        project_id: projectId,
        estimate_id: estimateId,
        user_id: user.id,
        payment_type: paymentType,
        amount: amount,
        currency: currency,
        razorpay_order_id: razorpayOrder.id,
        status: 'pending',
        notes: `${paymentType === 'advance' ? 'Advance' : 'Balance'} payment for estimate ${estimate.estimate_number}`,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert payment error:', insertError);
      return NextResponse.json(
        { error: 'Failed to create payment record' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      paymentId: payment.id,
      paymentType: paymentType,
    });

  } catch (error: any) {
    console.error('=== CREATE DESIGN PAYMENT ERROR ===');
    console.error('Full error:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      { error: error.message || 'Failed to create payment' },
      { status: 500 }
    );
  }
}