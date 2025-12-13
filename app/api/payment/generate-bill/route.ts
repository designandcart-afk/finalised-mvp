import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const { paymentId } = await request.json();

    if (!paymentId) {
      return NextResponse.json({ error: 'Payment ID is required' }, { status: 400 });
    }

    // Get authorization header
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    // Get payment details
    const { data: payment, error: paymentError } = await supabase
      .from('project_design_payments')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (paymentError || !payment) {
      console.error('Payment error:', paymentError);
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    console.log('Payment data:', JSON.stringify(payment, null, 2));

    // Get project details separately
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', payment.project_id)
      .single();

    if (projectError || !project) {
      console.error('Project error:', projectError);
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    console.log('Project data:', JSON.stringify(project, null, 2));

    // Get user details from project's user_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email, phone')
      .eq('id', project.user_id)
      .single();

    // Generate bill number from payment ID (first 8 chars)
    const billNumber = `BILL-${payment.id.substring(0, 8).toUpperCase()}`;
    const paymentDate = new Date(payment.created_at).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    // Generate HTML for the bill
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${billNumber}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
          padding: 40px;
          background: white;
        }
        .bill-container { max-width: 800px; margin: 0 auto; }
        .header { 
          border-bottom: 3px solid #d96857;
          padding-bottom: 20px;
          margin-bottom: 30px;
          display: flex;
          justify-content: space-between;
          align-items: start;
        }
        .company-info h1 { 
          color: #d96857; 
          font-size: 28px;
          margin-bottom: 8px;
        }
        .company-info p { 
          color: #666; 
          font-size: 14px;
          line-height: 1.6;
        }
        .bill-info { text-align: right; }
        .bill-info h2 { 
          color: #2e2e2e;
          font-size: 24px;
          margin-bottom: 10px;
        }
        .bill-info p { 
          color: #666;
          font-size: 14px;
          margin: 4px 0;
        }
        .section { margin-bottom: 30px; }
        .section-title { 
          color: #2e2e2e;
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 2px solid #f0f0f0;
        }
        .customer-details, .project-details {
          background: #fafafa;
          padding: 20px;
          border-radius: 8px;
        }
        .detail-row {
          display: flex;
          padding: 8px 0;
        }
        .detail-label {
          color: #666;
          min-width: 140px;
          font-weight: 500;
        }
        .detail-value {
          color: #2e2e2e;
          flex: 1;
        }
        .payment-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }
        .payment-table th {
          background: #f7f4f2;
          color: #2e2e2e;
          font-weight: 600;
          padding: 12px;
          text-align: left;
          font-size: 14px;
        }
        .payment-table td {
          padding: 16px 12px;
          border-bottom: 1px solid #e5e5e5;
          color: #2e2e2e;
        }
        .amount-cell {
          text-align: right;
          font-weight: 600;
          color: #d96857;
        }
        .total-row {
          background: #fafafa;
          font-weight: 600;
        }
        .total-row td {
          padding: 16px 12px;
          font-size: 18px;
          border-bottom: none;
        }
        .payment-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
        }
        .payment-badge.advance {
          background: #e3f2fd;
          color: #1976d2;
        }
        .payment-badge.balance {
          background: #e8f5e9;
          color: #388e3c;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 2px solid #f0f0f0;
          text-align: center;
          color: #666;
          font-size: 13px;
        }
        .footer p { margin: 4px 0; }
        @media print {
          body { padding: 20px; }
          .bill-container { box-shadow: none; }
        }
      </style>
    </head>
    <body>
      <div class="bill-container">
        <div class="header">
          <div class="company-info">
            <h1>Design & Cart</h1>
            <p>3D Visualization & Interior Design Services</p>
            <p>Email: info@designandcart.com</p>
          </div>
          <div class="bill-info">
            <h2>PAYMENT RECEIPT</h2>
            <p><strong>Bill #:</strong> ${billNumber}</p>
            <p><strong>Date:</strong> ${paymentDate}</p>
            <p><strong>Status:</strong> <span style="color: #4caf50; font-weight: 600;">PAID</span></p>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Customer Information</div>
          <div class="customer-details">
            <div class="detail-row">
              <div class="detail-label">Name:</div>
              <div class="detail-value">${profile?.full_name || 'N/A'}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Email:</div>
              <div class="detail-value">${profile?.email || 'N/A'}</div>
            </div>
            ${profile?.phone ? `
            <div class="detail-row">
              <div class="detail-label">Phone:</div>
              <div class="detail-value">${profile.phone}</div>
            </div>
            ` : ''}
          </div>
        </div>

        <div class="section">
          <div class="section-title">Project Details</div>
          <div class="project-details">
            <div class="detail-row">
              <div class="detail-label">Project Name:</div>
              <div class="detail-value">${project?.name || project?.title || 'N/A'}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Project Code:</div>
              <div class="detail-value">${project?.id || payment.project_id || 'N/A'}</div>
            </div>
            ${project?.address ? `
            <div class="detail-row">
              <div class="detail-label">Address:</div>
              <div class="detail-value">${project.address}</div>
            </div>
            ` : ''}
          </div>
        </div>

        <div class="section">
          <div class="section-title">Payment Details</div>
          <table class="payment-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Payment Type</th>
                <th>Payment Method</th>
                <th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>3D Visualization & Design Services</td>
                <td>
                  <span class="payment-badge ${payment.payment_type || 'advance'}">
                    ${(payment.payment_type || 'advance').toUpperCase()}
                  </span>
                </td>
                <td>${payment.payment_method || 'Razorpay'}</td>
                <td class="amount-cell">₹${Number(payment.amount).toLocaleString('en-IN')}</td>
              </tr>
              <tr class="total-row">
                <td colspan="3" style="text-align: right;">Total Amount Paid:</td>
                <td class="amount-cell" style="font-size: 20px;">₹${Number(payment.amount).toLocaleString('en-IN')}</td>
              </tr>
            </tbody>
          </table>
        </div>

        ${payment.razorpay_payment_id ? `
        <div class="section">
          <div class="section-title">Transaction Details</div>
          <div class="customer-details">
            <div class="detail-row">
              <div class="detail-label">Payment ID:</div>
              <div class="detail-value">${payment.razorpay_payment_id}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Payment Date:</div>
              <div class="detail-value">${paymentDate}</div>
            </div>
          </div>
        </div>
        ` : ''}

        <div class="footer">
          <p><strong>Thank you for your business!</strong></p>
          <p>This is a computer-generated receipt and does not require a signature.</p>
          <p>For any queries, please contact us at info@designandcart.com</p>
        </div>
      </div>
    </body>
    </html>
    `;

    return NextResponse.json({ 
      success: true, 
      html,
      billNumber 
    });

  } catch (error) {
    console.error('Bill generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate bill', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
