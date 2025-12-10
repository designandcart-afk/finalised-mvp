-- Seed products table with demo data
INSERT INTO products (id, title, image_url, price, category, description, status) VALUES
  ('prod_1', 'Linen Sofa 3-Seater', 'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?q=80&w=1200&auto=format&fit=crop', 39999.00, 'Living Room', 'Comfortable 3-seater linen fabric sofa with wooden legs and timeless design, perfect for modern living rooms.', 'active'),
  ('prod_2', 'Pendant Light Brass', 'https://images.unsplash.com/photo-1540574163026-643ea20ade25?q=80&w=1200&auto=format&fit=crop', 6999.00, 'Lighting', 'Elegant brass pendant light with matte finish, ideal for dining or lounge spaces.', 'active'),
  ('prod_3', 'Walnut Coffee Table', 'https://images.unsplash.com/photo-1615870216515-4f6a87c87fec?q=80&w=1200&auto=format&fit=crop', 12999.00, 'Furniture', 'Premium walnut veneer coffee table with minimal steel legs — sturdy, aesthetic, and functional.', 'active')
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  image_url = EXCLUDED.image_url,
  price = EXCLUDED.price,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  status = EXCLUDED.status,
  updated_at = now();