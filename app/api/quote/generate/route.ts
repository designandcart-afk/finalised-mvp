import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role key for server-side operations that need to bypass RLS
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * POST /api/quote/generate
 * Generates a PDF quote from project_design_estimates data
 */
export async function POST(req: NextRequest) {
  try {
    const { quoteId, projectId } = await req.json();

    if (!quoteId || !projectId) {
      return NextResponse.json({ 
        error: 'Quote ID and Project ID are required' 
      }, { status: 400 });
    }

    console.log('Generating quote for:', { quoteId, projectId });

    // Fetch the estimate data from database
    const { data: estimate, error: estimateError } = await supabase
      .from('project_design_estimates')
      .select('*')
      .eq('id', quoteId)
      .eq('project_id', projectId)
      .single();

    if (estimateError || !estimate) {
      console.error('Error fetching estimate:', estimateError);
      return NextResponse.json({ 
        error: 'Estimate not found',
        details: estimateError?.message 
      }, { status: 404 });
    }

    // Fetch project details
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      console.error('Error fetching project:', projectError);
      return NextResponse.json({ 
        error: 'Project not found',
        details: projectError?.message 
      }, { status: 404 });
    }

    // Generate HTML content for the quote
    const html = generateQuoteHTML(estimate, project);

    return NextResponse.json({
      success: true,
      html,
      estimate,
      project
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

function generateQuoteHTML(estimate: any, project: any) {
  const currentDate = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  // Use actual project code if available, otherwise generate one
  const projectCode = project.project_code || `#DAC-${project.id.slice(0, 6).toUpperCase()}`;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Quote - ${estimate.estimate_number}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          line-height: 1.6; 
          color: #2e2e2e; 
          background: #fff;
        }
        .quote-container { 
          max-width: 800px; 
          margin: 0 auto; 
          padding: 40px; 
          background: #fff;
        }
        .header { 
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
          border-bottom: 3px solid #d96857; 
          padding-bottom: 20px; 
          margin-bottom: 30px;
        }
        .company-info h1 { 
          color: #d96857; 
          font-size: 28px; 
          font-weight: bold; 
        }
        .company-info p { 
          color: #666; 
          font-size: 14px; 
          margin-top: 5px;
        }
        .quote-info { 
          text-align: right;
        }
        .quote-info h2 { 
          color: #2e2e2e; 
          font-size: 24px; 
          margin-bottom: 10px;
        }
        .quote-number { 
          font-size: 16px; 
          color: #d96857; 
          font-weight: bold;
        }
        .project-details { 
          background: #f8f9fa; 
          padding: 20px; 
          border-radius: 8px; 
          margin-bottom: 30px;
        }
        .details-grid { 
          display: grid; 
          grid-template-columns: 1fr 1fr; 
          gap: 20px;
        }
        .detail-item { 
          margin-bottom: 10px;
        }
        .detail-label { 
          font-weight: 600; 
          color: #555; 
          font-size: 14px;
        }
        .detail-value { 
          color: #2e2e2e; 
          font-size: 15px;
        }
        .estimate-details { 
          margin: 30px 0;
        }
        .estimate-details h3 { 
          color: #2e2e2e; 
          margin-bottom: 20px; 
          font-size: 20px;
        }
        .estimate-table { 
          width: 100%; 
          border-collapse: collapse; 
          margin-bottom: 20px;
        }
        .estimate-table th, .estimate-table td { 
          padding: 12px; 
          text-align: left; 
          border-bottom: 1px solid #ddd;
        }
        .estimate-table th { 
          background: #f8f9fa; 
          color: #555; 
          font-weight: 600; 
          font-size: 14px;
        }
        .estimate-table td { 
          font-size: 14px;
        }
        .amount-cell { 
          text-align: right; 
          font-weight: 600;
        }
        .totals-section { 
          border-top: 2px solid #d96857; 
          padding-top: 20px; 
          margin-top: 30px;
        }
        .totals-row { 
          display: flex; 
          justify-content: space-between; 
          margin-bottom: 10px; 
          padding: 5px 0;
        }
        .totals-row.final { 
          border-top: 1px solid #ddd; 
          padding-top: 15px; 
          margin-top: 15px; 
          font-size: 18px; 
          font-weight: bold; 
          color: #d96857;
        }
        .payment-terms { 
          background: #fff3e0; 
          border: 1px solid #ffcc80; 
          border-radius: 8px; 
          padding: 20px; 
          margin: 30px 0;
        }
        .payment-terms h3 { 
          color: #e65100; 
          margin-bottom: 15px;
        }
        .payment-terms ul { 
          list-style: none; 
          padding-left: 0;
        }
        .payment-terms li { 
          margin-bottom: 8px; 
          padding-left: 20px; 
          position: relative;
        }
        .payment-terms li:before { 
          content: '•'; 
          color: #e65100; 
          font-weight: bold; 
          position: absolute; 
          left: 0;
        }
        .footer { 
          margin-top: 40px; 
          padding-top: 20px; 
          border-top: 1px solid #ddd; 
          text-align: center; 
          color: #666; 
          font-size: 12px;
        }
        .status-badge { 
          display: inline-block; 
          padding: 4px 12px; 
          border-radius: 20px; 
          font-size: 12px; 
          font-weight: 600; 
          text-transform: uppercase;
        }
        .status-rough { 
          background: #fff3e0; 
          color: #e65100;
        }
        .status-initial { 
          background: #e3f2fd; 
          color: #1976d2;
        }
        .status-final { 
          background: #e8f5e8; 
          color: #2e7d32;
        }
        @media print {
          body { margin: 0; }
          .quote-container { padding: 20px; }
        }
      </style>
    </head>
    <body>
      <div class="quote-container">
        <!-- Header -->
        <div class="header">
          <div class="company-info">
            <h1>Design & Cart</h1>
            <p>Professional Interior Design Services</p>
            <p>Email: hello@designandcart.com | Phone: +91 XXX XXX XXXX</p>
          </div>
          <div class="quote-info">
            <h2>QUOTATION</h2>
            <div class="quote-number">${estimate.estimate_number}</div>
            <div style="font-size: 12px; color: #666; margin-top: 5px;">
              <span class="status-badge status-${estimate.estimate_type}">${estimate.estimate_type.toUpperCase()}</span>
            </div>
          </div>
        </div>

        <!-- Project Details -->
        <div class="project-details">
          <h3 style="margin-bottom: 15px; color: #2e2e2e;">Project Information</h3>
          <div class="details-grid">
            <div>
              <div class="detail-item">
                <div class="detail-label">Project Code</div>
                <div class="detail-value">${projectCode}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Project Name</div>
                <div class="detail-value">${project.project_name}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Location</div>
                <div class="detail-value">${project.address_full || 'Not specified'}</div>
              </div>
            </div>
            <div>
              <div class="detail-item">
                <div class="detail-label">Date</div>
                <div class="detail-value">${currentDate}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Valid Until</div>
                <div class="detail-value">${validUntil}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Estimate Type</div>
                <div class="detail-value">${estimate.estimate_type.charAt(0).toUpperCase() + estimate.estimate_type.slice(1)}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Estimate Details -->
        <div class="estimate-details">
          <h3>Service Breakdown</h3>
          <table class="estimate-table">
            <thead>
              <tr>
                <th>Service</th>
                <th style="text-align: center;">Area</th>
                <th style="text-align: center;">Rate</th>
                <th style="text-align: right;">Total Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${estimate.line_items && Array.isArray(estimate.line_items) 
                ? estimate.line_items.map((item: any) => `
                <tr>
                  <td>${item.service || 'Service'}</td>
                  <td style="text-align: center;">${item.area || 0}</td>
                  <td style="text-align: center;">${item.rate ? `${item.rate}${item.views ? ` / ${item.views} view${item.views > 1 ? 's' : ''}` : ''}` : '-'}</td>
                  <td class="amount-cell">₹${Number(item.total || 0).toLocaleString('en-IN')}</td>
                </tr>
                `).join('')
                : `
                <tr>
                  <td>3D Design Services</td>
                  <td style="text-align: center;">${estimate.areas_count || 1}</td>
                  <td style="text-align: center;">${Math.round(Number(estimate.base_amount || 0) / (estimate.areas_count || 1))}</td>
                  <td class="amount-cell">₹${Number(estimate.base_amount || 0).toLocaleString('en-IN')}</td>
                </tr>
                ${estimate.iterations_count > 0 ? `
                <tr>
                  <td>Design Iterations</td>
                  <td style="text-align: center;">${estimate.iterations_count}</td>
                  <td style="text-align: center;">${estimate.per_iteration_amount || 500} / iteration</td>
                  <td class="amount-cell">₹${(Number(estimate.per_iteration_amount || 0) * estimate.iterations_count).toLocaleString('en-IN')}</td>
                </tr>
                ` : ''}
                ${estimate.options_count > 0 ? `
                <tr>
                  <td>Design Options</td>
                  <td style="text-align: center;">${estimate.options_count}</td>
                  <td style="text-align: center;">${estimate.per_option_amount || 200} / option</td>
                  <td class="amount-cell">₹${(Number(estimate.per_option_amount || 0) * estimate.options_count).toLocaleString('en-IN')}</td>
                </tr>
                ` : ''}
                ${estimate.extra_charges > 0 ? `
                <tr>
                  <td>${estimate.extra_charges_description || 'Additional Services'}</td>
                  <td style="text-align: center;">1</td>
                  <td style="text-align: center;">-</td>
                  <td class="amount-cell">₹${Number(estimate.extra_charges || 0).toLocaleString('en-IN')}</td>
                </tr>
                ` : ''}
              `}
            </tbody>
          </table>

          <!-- Totals -->
          <div class="totals-section">
            <div class="totals-row">
              <span>Total Price:</span>
              <span>₹${Number(estimate.subtotal || 0).toLocaleString('en-IN')}</span>
            </div>
            ${estimate.discount_percentage > 0 ? `
            <div class="totals-row">
              <span>Discount (${estimate.discount_percentage}%)${estimate.estimate_type === 'rough' ? ' - First Booking' : ''}:</span>
              <span>-₹${Number(estimate.discount_amount || 0).toLocaleString('en-IN')}</span>
            </div>
            <div class="totals-row">
              <span>Final Price:</span>
              <span>₹${Number(estimate.final_amount || estimate.subtotal || 0).toLocaleString('en-IN')}</span>
            </div>
            ` : ''}
            <div class="totals-row">
              <span>GST (${estimate.gst_percentage || 18}%):</span>
              <span>₹${Number(estimate.gst_amount || 0).toLocaleString('en-IN')}</span>
            </div>
            <div class="totals-row final">
              <span>Total Amount (Incl. GST):</span>
              <span>₹${Number(estimate.total_amount || 0).toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        <!-- Payment Terms -->
        <div class="payment-terms">
          <h3>Payment Terms & Conditions</h3>
          <ul>
            <li><strong>Advance Payment:</strong> 30% of total amount (₹${Math.round(Number(estimate.total_amount || 0) * 0.3).toLocaleString('en-IN')}) to be paid upon approval of this quotation</li>
            <li><strong>Balance Payment:</strong> Remaining 70% (₹${Math.round(Number(estimate.total_amount || 0) * 0.7).toLocaleString('en-IN')}) to be paid upon project completion and delivery</li>
            <li><strong>Validity:</strong> This quotation is valid for 30 days from the issue date</li>
            <li><strong>Included Services:</strong> ${estimate.line_items && estimate.line_items.length > 0 ? `${estimate.line_items.length} service categories` : 'Design consultation and iterations'} as detailed above</li>
            ${estimate.discount_percentage > 0 ? `<li><strong>Special Offer:</strong> ${estimate.discount_percentage}% discount applied${estimate.estimate_type === 'rough' ? ' for first-time bookings' : ''}</li>` : ''}
            <li><strong>Deliverables:</strong> High-resolution 3D renders, design concepts, and consultation sessions</li>
          </ul>
        </div>

        ${estimate.notes ? `
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h4 style="color: #2e2e2e; margin-bottom: 10px;">Additional Notes:</h4>
          <p style="color: #666; font-size: 14px;">${estimate.notes}</p>
        </div>
        ` : ''}

        <!-- Footer -->
        <div class="footer">
          <p>Thank you for choosing Design & Cart for your interior design needs.</p>
          <p>For any queries, please contact us at hello@designandcart.com</p>
        </div>
      </div>
    </body>
    </html>
  `;
}