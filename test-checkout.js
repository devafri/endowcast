const axios = require('axios');

async function testCheckout() {
  try {
    // First, let's test if we can reach the server
    const healthCheck = await axios.get('http://localhost:3001/api/health');
    console.log('✅ Server is running:', healthCheck.status);

    // You'll need to provide a valid JWT token here
    // For now, let's just test if the endpoint responds to an unauthenticated request
    const checkoutResponse = await axios.post('http://localhost:3001/api/payments/create-checkout-session', {
      planType: 'ANALYST_PRO',
      billingCycle: 'MONTHLY'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Checkout response:', checkoutResponse.data);
  } catch (error) {
    if (error.response) {
      console.log('❌ Error response:', error.response.status, error.response.data);
    } else {
      console.log('❌ Network error:', error.message);
    }
  }
}

testCheckout();
