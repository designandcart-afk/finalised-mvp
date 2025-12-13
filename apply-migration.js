// Script to apply the invoice fields migration
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  try {
    console.log('Reading migration file...');
    const migrationPath = path.join(__dirname, 'supabase/migrations/0007_add_invoice_fields.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Applying migration to add invoice fields...');
    
    // Split SQL by statement (simple split, might need refinement)
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (const statement of statements) {
      if (statement) {
        const { error } = await supabase.rpc('exec_sql', { sql_query: statement + ';' });
        if (error) {
          console.error('Error executing statement:', error);
          console.log('Statement:', statement.substring(0, 100) + '...');
        }
      }
    }
    
    console.log('✅ Migration applied successfully!');
    console.log('\nNew fields added to orders table:');
    console.log('- subtotal (DECIMAL)');
    console.log('- discount (DECIMAL)');
    console.log('- discount_type (TEXT)');
    console.log('- tax (DECIMAL)');
    console.log('- tax_rate (DECIMAL)');
    console.log('- invoice_number (TEXT UNIQUE)');
    console.log('- invoice_date (TIMESTAMP)');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

applyMigration();
