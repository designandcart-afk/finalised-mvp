-- Add invoice PDF URL field to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS invoice_pdf_url TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS orders_invoice_pdf_url_idx ON orders(invoice_pdf_url);
