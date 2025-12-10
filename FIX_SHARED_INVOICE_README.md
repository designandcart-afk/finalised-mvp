# Fix Shared Invoice Number Issue

## Problem
When multiple projects are paid together in one payment, they were getting separate invoice numbers instead of sharing one invoice.

## Solution
Updated the database trigger to check if an order with the same `razorpay_order_id` already has an invoice number. If yes, reuse it; if not, generate a new one.

## How to Apply the Fix

### Step 1: Run the SQL Migration
1. Open Supabase Dashboard → SQL Editor
2. Copy and paste the content from `FIX_SHARED_INVOICE.sql`
3. Click "Run" to execute

### Step 2: Fix Existing Duplicate Invoices (Optional)
If you want to consolidate the existing orders that have different invoice numbers but were paid together:

1. In the same SQL Editor, uncomment the block at the bottom of `FIX_SHARED_INVOICE.sql` (remove the `/*` and `*/`)
2. Run it again

This will update your existing orders (like INV-202512-2028 and INV-202512-2027) to use the same invoice number.

### Step 3: Test
1. Add items from multiple projects to cart
2. Complete payment
3. Check Orders page → Invoices tab
4. You should see ONE invoice card with multiple orders listed in the table

## What Changed
- **Before**: Each order got its own invoice number
- **After**: All orders from the same payment share one invoice number

## Technical Details
The trigger function `set_invoice_number()` now:
1. Checks if any order with the same `razorpay_order_id` has an invoice number
2. If yes → reuses that invoice number
3. If no → generates a new invoice number
4. This ensures one payment = one invoice (but multiple order IDs)
