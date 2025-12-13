import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const { orderId } = await req.json();

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

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Generate HTML bill
    const billHtml = generateBillHtml(order);

    return NextResponse.json({
      success: true,
      html: billHtml,
    });

  } catch (error: any) {
    console.error('Generate bill error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate bill' },
      { status: 500 }
    );
  }
}

function generateBillHtml(order: any): string {
  const billNumber = `BILL-${order.id.slice(0, 8).toUpperCase()}`;
  const orderNumber = `#${order.id.slice(0, 8).toUpperCase()}`;
  const billDate = new Date(order.paid_at || order.created_at).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const projectId = order.project_ids && order.project_ids[0];
  const projectName = projectId ? `Project ${projectId.slice(0, 8)}` : 'General';

  const subtotal = order.subtotal || order.amount;
  const tax = order.tax || 0;
  const taxRate = order.tax_rate || 18;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Bill ${billNumber}</title>
      <style>
        @media print {
          body { margin: 0; }
          .no-print { display: none; }
        }
        body { font-family: Arial, sans-serif; margin: 40px; color: #2e2e2e; background: #fff; }
        .header { display: flex; justify-content: space-between; margin-bottom: 30px; border-bottom: 3px solid #d96857; padding-bottom: 20px; }
        .company-name { font-size: 32px; font-weight: bold; color: #d96857; }
        .bill-info { text-align: right; }
        .bill-number { font-size: 24px; font-weight: bold; color: #2e2e2e; }
        .project-badge { display: inline-block; font-size: 13px; font-weight: 500; color: #666; margin: 15px 0 5px 0; }
        .section-title { font-size: 15px; font-weight: 600; margin-top: 25px; margin-bottom: 15px; color: #2e2e2e; }
        .details-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        .details-table th { background-color: transparent; color: #666; padding: 10px 0; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; border-bottom: 1px solid #e5e5e5; font-weight: 600; }
        .details-table td { padding: 12px 0; border-bottom: 1px solid #f5f5f5; font-size: 13px; color: #2e2e2e; }
        .totals { margin-top: 30px; margin-left: auto; width: 350px; }
        .totals-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 13px; }
        .totals-label { color: #666; }
        .totals-value { font-weight: 600; }
        .total-final { display: flex; justify-content: space-between; padding: 12px 0; font-size: 15px; border-top: 2px solid #2e2e2e; margin-top: 8px; font-weight: 600; }
        .total-final .totals-value { color: #d96857; font-size: 18px; }
        .footer { margin-top: 60px; padding-top: 25px; border-top: 2px solid #e5e5e5; text-align: center; }
        .footer-company { font-size: 16px; font-weight: 600; color: #d96857; margin-bottom: 8px; }
        .footer-text { font-size: 12px; color: #888; line-height: 1.6; }
        .print-btn { position: fixed; top: 20px; right: 20px; padding: 12px 24px; background: #d96857; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .print-btn:hover { background: #c85746; box-shadow: 0 6px 8px rgba(0,0,0,0.15); }
        .status-badge { display: inline-block; font-size: 11px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; color: #22c55e; }
      </style>
    </head>
    <body>
      <button class="print-btn no-print" onclick="window.print()">Print / Save as PDF</button>
      
      <div class="header">
        <div>
          <div class="company-name">Design&Cart</div>
          <div style="font-size: 14px; color: #666; margin-top: 8px;">Interior Design Solutions</div>
        </div>
        <div class="bill-info">
          <div class="bill-number">${billNumber}</div>
          <div style="font-size: 13px; margin-top: 8px; color: #666;">Date: ${billDate}</div>
          <div style="font-size: 13px; margin-top: 4px; color: #666;">Order: ${orderNumber}</div>
          <div style="margin-top: 8px;"><span class="status-badge">● PAID</span></div>
        </div>
      </div>

      <div class="project-badge">
        📁 ${projectName}
      </div>

      <div class="section-title">Order Items</div>
      <table class="details-table">
        <thead>
          <tr>
            <th style="width: 50%;">Product</th>
            <th style="text-align: center; width: 15%;">Quantity</th>
            <th style="text-align: right; width: 17.5%;">Unit Price</th>
            <th style="text-align: right; width: 17.5%;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${order.items.map((item: any) => `
            <tr>
              <td>
                <div style="font-weight: 600;">${item.title || 'Product'}</div>
                ${item.area ? `<div style="font-size: 12px; color: #888; margin-top: 4px;">Area: ${item.area}</div>` : ''}
              </td>
              <td style="text-align: center;">${item.qty}</td>
              <td style="text-align: right;">₹${item.price.toLocaleString('en-IN')}</td>
              <td style="text-align: right; font-weight: 600;">₹${(item.price * item.qty).toLocaleString('en-IN')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="totals">
        <div class="totals-row">
          <div class="totals-label">Subtotal:</div>
          <div class="totals-value">₹${subtotal.toLocaleString('en-IN')}</div>
        </div>
        <div class="totals-row">
          <div class="totals-label">GST (${taxRate}%):</div>
          <div class="totals-value">₹${tax.toLocaleString('en-IN')}</div>
        </div>
        <div class="total-final">
          <div class="totals-label">Total Amount:</div>
          <div class="totals-value">₹${order.amount.toLocaleString('en-IN')}</div>
        </div>
      </div>

      <div class="footer">
        <div class="footer-company">Design&Cart</div>
        <div class="footer-text">
          <p>Thank you for your business!</p>
          <p>contact@designandcart.com | +91 XXXXXXXXXX</p>
          <p style="margin-top: 15px; font-size: 11px; color: #aaa;">
            This is a computer-generated bill and does not require a signature.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}
