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

    // Get the first order to get invoice number
    const { data: firstOrder, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !firstOrder) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Get ALL orders with the same invoice number
    const { data: allOrders, error: allOrdersError } = await supabase
      .from('orders')
      .select('*')
      .eq('invoice_number', firstOrder.invoice_number)
      .order('created_at', { ascending: true });

    if (allOrdersError) {
      console.error('Error fetching all orders:', allOrdersError);
      // Fallback to single order
      const invoiceHtml = generateInvoiceHtml([firstOrder]);
      return NextResponse.json({
        success: true,
        html: invoiceHtml,
      });
    }

    // Generate HTML invoice with all orders
    const invoiceHtml = generateInvoiceHtml(allOrders || [firstOrder]);

    return NextResponse.json({
      success: true,
      html: invoiceHtml,
    });

  } catch (error: any) {
    console.error('Generate invoice error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate invoice' },
      { status: 500 }
    );
  }
}

function generateInvoiceHtml(orders: any[]): string {
  if (!orders || orders.length === 0) {
    return '<html><body>No orders found</body></html>';
  }

  const firstOrder = orders[0];
  const invoiceNumber = firstOrder.invoice_number || `INV-${firstOrder.id.slice(0, 8).toUpperCase()}`;
  const invoiceDate = new Date(firstOrder.invoice_date || firstOrder.paid_at || firstOrder.created_at).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  // Calculate total across all orders
  const grandTotal = orders.reduce((sum, order) => sum + order.amount, 0);
  const totalTax = orders.reduce((sum, order) => sum + (order.tax || 0), 0);
  const totalSubtotal = orders.reduce((sum, order) => sum + (order.subtotal || order.amount), 0);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Invoice ${invoiceNumber}</title>
      <style>
        @media print {
          body { margin: 0; }
          .no-print { display: none; }
        }
        body { font-family: Arial, sans-serif; margin: 40px; color: #2e2e2e; }
        .header { display: flex; justify-content: space-between; margin-bottom: 30px; border-bottom: 2px solid #d96857; padding-bottom: 20px; }
        .company-name { font-size: 28px; font-weight: bold; color: #d96857; }
        .invoice-info { text-align: right; }
        .invoice-number { font-size: 20px; font-weight: bold; }
        .section-title { font-size: 16px; font-weight: bold; margin-top: 25px; margin-bottom: 10px; color: #2e2e2e; }
        .order-section { background-color: #f9f9f8; padding: 15px; margin: 15px 0; border-radius: 8px; border-left: 3px solid #d96857; }
        .order-header { font-weight: bold; font-size: 14px; margin-bottom: 10px; color: #2e2e2e; }
        .details-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        .details-table th { background-color: #f2f0ed; padding: 10px; text-align: left; font-size: 12px; }
        .details-table td { padding: 10px; border-bottom: 1px solid #e5e5e5; font-size: 12px; }
        .totals { margin-top: 30px; text-align: right; }
        .totals-row { display: flex; justify-content: flex-end; padding: 5px 0; }
        .totals-label { width: 150px; text-align: right; padding-right: 20px; }
        .totals-value { width: 120px; text-align: right; font-weight: bold; }
        .total-final { font-size: 18px; color: #d96857; border-top: 2px solid #2e2e2e; padding-top: 10px; margin-top: 10px; }
        .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #e5e5e5; text-align: center; font-size: 11px; color: #888; }
        .print-btn { position: fixed; top: 20px; right: 20px; padding: 10px 20px; background: #d96857; color: white; border: none; border-radius: 8px; cursor: pointer; }
        .print-btn:hover { background: #c85746; }
      </style>
    </head>
    <body>
      <button class="print-btn no-print" onclick="window.print()">Print / Save as PDF</button>
      
      <div class="header">
        <div>
          <div class="company-name">Design&Cart</div>
          <div style="font-size: 12px; color: #666; margin-top: 5px;">Interior Design Solutions</div>
        </div>
        <div class="invoice-info">
          <div class="invoice-number">${invoiceNumber}</div>
          <div style="font-size: 12px; margin-top: 5px;">Date: ${invoiceDate}</div>
          <div style="font-size: 11px; color: #666; margin-top: 3px;">${orders.length} Order${orders.length > 1 ? 's' : ''}</div>
        </div>
      </div>

      <div class="section-title">Order Details</div>
      ${orders.map((order, index) => {
        const projectName = order.project_ids && order.project_ids[0] 
          ? `Project ${order.project_ids[0].slice(0, 8)}` 
          : 'General';
        
        return `
          <div class="order-section">
            <div class="order-header">
              Order #${order.id.slice(0, 8).toUpperCase()} - ${projectName}
            </div>
            <table class="details-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th style="text-align: center;">Quantity</th>
                  <th style="text-align: right;">Unit Price</th>
                  <th style="text-align: right;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${order.items.map((item: any) => `
                  <tr>
                    <td>${item.title || 'Product'}</td>
                    <td style="text-align: center;">${item.qty}</td>
                    <td style="text-align: right;">₹${item.price.toLocaleString('en-IN')}</td>
                    <td style="text-align: right;">₹${(item.price * item.qty).toLocaleString('en-IN')}</td>
                  </tr>
                `).join('')}
                <tr style="font-weight: bold; background-color: #fff;">
                  <td colspan="3" style="text-align: right;">Order Total:</td>
                  <td style="text-align: right;">₹${order.amount.toLocaleString('en-IN')}</td>
                </tr>
              </tbody>
            </table>
          </div>
        `;
      }).join('')}

      <div class="totals">
        <div class="totals-row">
          <div class="totals-label">Subtotal:</div>
          <div class="totals-value">₹${totalSubtotal.toLocaleString('en-IN')}</div>
        </div>
        ${totalTax > 0 ? `
          <div class="totals-row">
            <div class="totals-label">Tax (18%):</div>
            <div class="totals-value">₹${totalTax.toLocaleString('en-IN')}</div>
          </div>
        ` : ''}
        <div class="totals-row total-final">
          <div class="totals-label">Grand Total:</div>
          <div class="totals-value">₹${grandTotal.toLocaleString('en-IN')}</div>
        </div>
      </div>

      <div class="footer">
        <p>Thank you for your business!</p>
        <p>Design&Cart | contact@designandcart.com | +91 XXXXXXXXXX</p>
        <p style="margin-top: 10px; font-size: 10px;">This is a computer-generated invoice and does not require a signature.</p>
      </div>
    </body>
    </html>
  `;
}
