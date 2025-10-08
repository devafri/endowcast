require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function debugStripePrices() {
  try {
    console.log('🔍 Debugging Stripe Price Mappings...\n');
    
    const priceIds = JSON.parse(process.env.STRIPE_PRICE_IDS || '{}');
    
    console.log('📋 Current Environment Mapping:');
    Object.entries(priceIds).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });
    console.log('');
    
    // Check Foundation Monthly specifically
    console.log('🎯 Checking Foundation Monthly:');
    const foundationPriceId = priceIds.FOUNDATION_MONTHLY;
    console.log(`Price ID: ${foundationPriceId}`);
    
    if (foundationPriceId) {
      const price = await stripe.prices.retrieve(foundationPriceId);
      const product = await stripe.products.retrieve(price.product);
      
      console.log(`✅ Product Name: "${product.name}"`);
      console.log(`✅ Amount: $${price.unit_amount / 100}/${price.recurring.interval}`);
      console.log(`✅ Product ID: ${product.id}`);
      
      // Check if this looks wrong
      if (!product.name.toLowerCase().includes('foundation')) {
        console.log(`🚨 PROBLEM FOUND: This price points to "${product.name}" but should be Foundation!`);
      } else {
        console.log('✅ This looks correct');
      }
    }
    
    console.log('\n🎯 Checking Analyst Pro Monthly:');
    const analystPriceId = priceIds.ANALYST_PRO_MONTHLY;
    console.log(`Price ID: ${analystPriceId}`);
    
    if (analystPriceId) {
      const price = await stripe.prices.retrieve(analystPriceId);
      const product = await stripe.products.retrieve(price.product);
      
      console.log(`✅ Product Name: "${product.name}"`);
      console.log(`✅ Amount: $${price.unit_amount / 100}/${price.recurring.interval}`);
      console.log(`✅ Product ID: ${product.id}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugStripePrices();
