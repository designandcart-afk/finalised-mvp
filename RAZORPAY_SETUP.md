# Razorpay Setup Guide

## Getting Your Razorpay API Keys

To enable real payment functionality, you need to get your own Razorpay API keys:

### For Development (Test Mode)

1. **Sign up at Razorpay**: https://dashboard.razorpay.com/signup
2. **Verify your account** with email and phone number
3. **Navigate to API Keys**: Dashboard → Settings → API Keys
4. **Generate Test Keys** (they start with `rzp_test_`)
5. **Copy your keys**:
   - Key ID: `rzp_test_xxxxxxxxxx`
   - Key Secret: `xxxxxxxxxxxxxxxxxx`

### Update Environment Variables

Replace the test keys in `.env.local`:

```bash
# Razorpay Configuration (TEST KEYS - For Development)
RAZORPAY_KEY_ID=your_test_key_id_here
RAZORPAY_KEY_SECRET=your_test_key_secret_here
NEXT_PUBLIC_RAZORPAY_KEY_ID=your_test_key_id_here
```

### For Production (Live Mode)

1. **Complete KYC**: Submit business documents for verification
2. **Get Live Keys**: After KYC approval, generate live keys (`rzp_live_`)
3. **Update Production Environment** with live keys

## Testing Payments

### Test Card Details for Development

When using test keys, use these test card details:

- **Card Number**: `4111 1111 1111 1111`
- **Expiry**: Any future date (e.g., `12/25`)
- **CVV**: Any 3 digits (e.g., `123`)
- **Cardholder Name**: Any name

### Test UPI ID
- **UPI ID**: `success@razorpay`

## Important Notes

- ✅ **Test keys** are safe to commit to version control
- ❌ **Live keys** should NEVER be committed - use environment variables
- 🔄 Test payments don't charge real money
- 💳 Live payments charge actual money - test thoroughly first

## Webhook Setup (Optional)

For advanced payment status tracking:

1. **Create Webhook**: Dashboard → Settings → Webhooks
2. **Add Webhook URL**: `https://yourapp.com/api/webhooks/razorpay`
3. **Select Events**: `payment.captured`, `payment.failed`

## Support

- 📚 **Documentation**: https://razorpay.com/docs/
- 💬 **Support**: https://razorpay.com/support/
- 🐛 **Issues**: Check server logs for detailed error messages