#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabase() {
  console.log('Checking database schema...');
  
  try {
    // First, try to query the products table
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*')
      .limit(1);
    
    console.log('Products query result:', { products, productsError });
    
    // Also check cart_items
    const { data: cartItems, error: cartError } = await supabase
      .from('cart_items')
      .select('*')
      .limit(1);
    
    console.log('Cart items query result:', { cartItems, cartError });
    
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

checkDatabase().then(() => {
  console.log('Done checking database!');
});