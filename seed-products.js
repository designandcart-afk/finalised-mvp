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

const products = [
  {
    id: 'prod_1',
    title: 'Linen Sofa 3-Seater',
    image_url: 'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?q=80&w=1200&auto=format&fit=crop',
    price: 39999.00,
    category: 'Living Room',
    description: 'Comfortable 3-seater linen fabric sofa with wooden legs and timeless design, perfect for modern living rooms.',
    status: 'active'
  },
  {
    id: 'prod_2',
    title: 'Pendant Light Brass',
    image_url: 'https://images.unsplash.com/photo-1540574163026-643ea20ade25?q=80&w=1200&auto=format&fit=crop',
    price: 6999.00,
    category: 'Lighting',
    description: 'Elegant brass pendant light with matte finish, ideal for dining or lounge spaces.',
    status: 'active'
  },
  {
    id: 'prod_3',
    title: 'Walnut Coffee Table',
    image_url: 'https://images.unsplash.com/photo-1615870216515-4f6a87c87fec?q=80&w=1200&auto=format&fit=crop',
    price: 12999.00,
    category: 'Furniture',
    description: 'Premium walnut veneer coffee table with minimal steel legs — sturdy, aesthetic, and functional.',
    status: 'active'
  }
];

async function seedProducts() {
  console.log('Seeding products...');
  
  try {
    const { data, error } = await supabase
      .from('products')
      .upsert(products, { onConflict: 'id' })
      .select();
    
    if (error) {
      console.error('Error seeding products:', error);
      process.exit(1);
    }
    
    console.log('Successfully seeded products:', data?.length || 0);
    console.log('Products:', data);
    
  } catch (err) {
    console.error('Unexpected error:', err);
    process.exit(1);
  }
}

seedProducts().then(() => {
  console.log('Done!');
});