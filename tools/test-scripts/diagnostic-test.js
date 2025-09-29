#!/usr/bin/env node

const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

async function quickTest() {
  console.log('🔍 Quick API Diagnostic Test\n');

  try {
        // Test 1: Health check
    console.log('1. Testing health endpoint...');
    const healthResponse = await axios.get('http://localhost:3001/health');
    console.log('✅ Health check:', healthResponse.status, healthResponse.data);
  } catch (error) {
    console.log('❌ Health check failed:', error.message);
    if (error.response) {
      console.log('   Status:', error.response.status);
      console.log('   Data:', error.response.data);
    }
  }

  try {
    // 2. Registration test
    console.log('\n2. Testing user registration...');
    const timestamp = Date.now();
    const regData = {
      firstName: 'Test',
      lastName: 'User',
      email: `test${timestamp}@example.com`,
      password: 'TestPassword123!',
      organizationName: 'Test Org'
    };    const regResponse = await axios.post(`${BASE_URL}/auth/register`, regData);
    console.log('✅ Registration:', regResponse.status);
    console.log('   User ID:', regResponse.data.user?.id);
    console.log('   Organization:', regResponse.data.user?.organization?.name);
    console.log('   Token present:', !!regResponse.data.token);
    
    // 3. Login test
    console.log('\n3. Testing login...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: `test${timestamp}@example.com`,
      password: 'TestPassword123!'
    });
    console.log('✅ Login:', loginResponse.status);
    
    const token = loginResponse.data.token;
    const headers = { Authorization: `Bearer ${token}` };
    
    // 4. Organization endpoint test
    console.log('\n4. Testing organization endpoint...');
    const orgResponse = await axios.get(`${BASE_URL}/organization`, { headers });
    console.log('✅ Organization:', orgResponse.status);
    console.log('   Org name:', orgResponse.data.organization?.name);
    console.log('   Plan type:', orgResponse.data.subscription?.planType);
    
    // 5. Simple simulation creation test
    console.log('\n5. Testing simulation creation...');
    const simData = {
      name: 'Diagnostic Test Simulation',
      years: 5,
      startYear: 2024,
      initialValue: 1000000,
      spendingRate: 0.05,
      spendingGrowth: 0.02,
      equityReturn: 0.07,
      equityVolatility: 0.16,
      bondReturn: 0.03,
      bondVolatility: 0.04,
      correlation: 0.2
    };
    
    const simResponse = await axios.post(`${BASE_URL}/simulations`, simData, { headers });
    console.log('✅ Simulation creation:', simResponse.status);
    
    console.log('\n🎉 All basic tests passed!');
    
  } catch (error) {
    console.log('\n❌ Test failed:', error.message);
    if (error.response) {
      console.log('   Status:', error.response.status);
      console.log('   Status Text:', error.response.statusText);
      console.log('   Error Data:', JSON.stringify(error.response.data, null, 2));
    }
    
    if (error.code) {
      console.log('   Error Code:', error.code);
    }
  }
}

quickTest().catch(console.error);
