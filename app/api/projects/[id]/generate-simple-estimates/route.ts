import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role key for server-side operations that need to bypass RLS  
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * POST /api/projects/[id]/generate-simple-estimates
 * Creates 3 basic test estimates - bypasses RLS issues
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    console.log('Generating simple estimates for project:', projectId);

    // Create 3 basic estimates
    const estimates = [
      {
        project_id: projectId,
        estimate_number: 'EST-SIMPLE-001',
        estimate_type: 'rough',
        areas_count: 1,
        iterations_count: 2,
        options_count: 5,
        total_amount: 25000,
        status: 'pending',
        notes: 'Concept design phase - rough estimate'
      },
      {
        project_id: projectId,
        estimate_number: 'EST-SIMPLE-002',
        estimate_type: 'initial',
        areas_count: 1,
        iterations_count: 3,
        options_count: 8,
        total_amount: 35000,
        status: 'pending',
        notes: 'Detailed design phase - refined estimate'
      },
      {
        project_id: projectId,
        estimate_number: 'EST-SIMPLE-003',
        estimate_type: 'final',
        areas_count: 1,
        iterations_count: 3,
        options_count: 10,
        total_amount: 45000,
        status: 'pending',
        notes: 'Final design phase - comprehensive estimate'
      }
    ];

    console.log('Attempting to insert estimates:', estimates.length);

    // Try to insert estimates
    const { data, error } = await supabase
      .from('project_design_estimates')
      .insert(estimates)
      .select('*');

    if (error) {
      console.error('Database insertion error:', error);
      return NextResponse.json({ 
        error: 'Failed to create estimates', 
        details: error.message,
        code: error.code 
      }, { status: 500 });
    }

    console.log('Successfully created estimates:', data?.length || 0);

    return NextResponse.json({
      success: true,
      estimates: data,
      message: `Created ${data?.length || 0} estimates`
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}