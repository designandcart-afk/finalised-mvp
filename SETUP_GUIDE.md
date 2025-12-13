# 🎯 Step-by-Step Quote System Setup

## Step 1: Get Your User ID
1. Go to **Supabase Dashboard** → **Authentication** → **Users**
2. Find your user account and copy the **User UUID**
3. Example: `12345678-1234-1234-1234-123456789012`

## Step 2: Update the SQL Script
1. Open `create-sample-quotes.sql`
2. Replace `'YOUR_USER_ID_HERE'` with your actual User UUID
3. Save the file

## Step 3: Run the Complete Script
1. Go to **Supabase Dashboard** → **SQL Editor**
2. Copy and paste the entire `create-sample-quotes.sql` content
3. Click **RUN**

## Step 4: Verify Results
You should see:
- ✅ RLS policy updated successfully
- ✅ 3 sample estimates created (rough, initial, final)
- ✅ Test queries showing the data

## Step 5: Test Your App
1. Start your Next.js server: `npm run dev`
2. Go to your project page
3. Click "Quotes & Bills" 
4. You should see 3 real quotes from database
5. Click any quote PDF icon - should generate successfully!

## What Each Estimate Contains:
- **Rough Estimate**: ₹25,000 (₹7,500 advance, ₹17,500 remaining)
- **Initial Estimate**: ₹35,000 (₹10,500 advance, ₹24,500 remaining)  
- **Final Estimate**: ₹45,000 (₹13,500 advance, ₹31,500 remaining)

## Expected Behavior After Fix:
- ✅ Quotes load from real database
- ✅ PDF generation works (no more "Quote not found")
- ✅ Pay Now buttons show correct amounts
- ✅ System works exactly like bill generation

## If It Still Doesn't Work:
Check the SQL results for any error messages and make sure your User ID is correct.