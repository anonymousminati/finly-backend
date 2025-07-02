/**
 * Test script for Financial Summary API
 * Tests authentication, authorization, and data retrieval
 */

import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = 'http://localhost:3001/api';

// Test user credentials (update with actual test user)
const TEST_USER = {
    email: 'test@example.com',
    password: 'password123'
};

let authToken = '';
let testUserId = '';

/**
 * Login and get authentication token
 */
async function login() {
    try {
        console.log('🔐 Logging in...');
        const response = await axios.post(`${BASE_URL}/users/login`, TEST_USER);
        
        if (response.data.success) {
            authToken = response.data.sessionToken;
            testUserId = response.data.user.id;
            console.log('✅ Login successful');
            console.log(`   User ID: ${testUserId}`);
            console.log(`   Token: ${authToken.substring(0, 20)}...`);
            return true;
        } else {
            console.log('❌ Login failed:', response.data.message);
            return false;
        }
    } catch (error) {
        console.log('❌ Login error:', error.response?.data?.message || error.message);
        return false;
    }
}

/**
 * Test financial summary endpoint
 */
async function testFinancialSummary() {
    try {
        console.log('\n📊 Testing Financial Summary endpoint...');
        
        const headers = {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
        };
        
        // Test 1: Get own financial summary
        console.log('\n--- Test 1: Get own financial summary ---');
        const response1 = await axios.get(`${BASE_URL}/financial/summary`, { headers });
        
        if (response1.data.success) {
            console.log('✅ Financial summary retrieved successfully');
            console.log(`   Total Balance: $${response1.data.data.summary.total_balance}`);
            console.log(`   Active Accounts: ${response1.data.data.summary.total_active_accounts}`);
            console.log(`   Total Transactions: ${response1.data.data.transactions_summary.total_transactions}`);
            
            // Show accounts summary
            if (response1.data.data.accounts.length > 0) {
                console.log('   Accounts:');
                response1.data.data.accounts.forEach(account => {
                    console.log(`     - ${account.account_name}: $${account.current_balance} (${account.transactions_count} transactions)`);
                });
            }
            
            // Show recent transactions
            if (response1.data.data.transactions_summary.recent_transactions.length > 0) {
                console.log('   Recent Transactions:');
                response1.data.data.transactions_summary.recent_transactions.slice(0, 3).forEach(txn => {
                    console.log(`     - ${txn.description}: $${txn.amount} (${txn.type})`);
                });
            }
        } else {
            console.log('❌ Failed to get financial summary:', response1.data.message);
        }
        
        // Test 2: Get financial summary with date range
        console.log('\n--- Test 2: Get financial summary with date range ---');
        const fromDate = '2024-01-01';
        const toDate = '2024-12-31';
        
        const response2 = await axios.get(`${BASE_URL}/financial/summary?from=${fromDate}&to=${toDate}`, { headers });
        
        if (response2.data.success) {
            console.log('✅ Financial summary with date range retrieved successfully');
            console.log(`   Date Range: ${fromDate} to ${toDate}`);
            console.log(`   Total Transactions: ${response2.data.data.transactions_summary.total_transactions}`);
        } else {
            console.log('❌ Failed to get financial summary with date range:', response2.data.message);
        }
        
        // Test 3: Test with invalid date format
        console.log('\n--- Test 3: Test with invalid date format ---');
        try {
            await axios.get(`${BASE_URL}/financial/summary?from=invalid-date`, { headers });
        } catch (error) {
            if (error.response?.status === 400) {
                console.log('✅ Invalid date format properly rejected');
                console.log(`   Error: ${error.response.data.message}`);
            } else {
                console.log('❌ Unexpected error with invalid date:', error.message);
            }
        }
        
        // Test 4: Test unauthorized access (try to access another user's data)
        console.log('\n--- Test 4: Test unauthorized access ---');
        try {
            await axios.get(`${BASE_URL}/financial/summary?userId=999999`, { headers });
        } catch (error) {
            if (error.response?.status === 403 || error.response?.status === 404) {
                console.log('✅ Unauthorized access properly rejected');
                console.log(`   Error: ${error.response.data.message}`);
            } else {
                console.log('❌ Unexpected error with unauthorized access:', error.message);
            }
        }
        
    } catch (error) {
        console.log('❌ Financial summary test error:', error.response?.data?.message || error.message);
    }
}

/**
 * Test without authentication
 */
async function testWithoutAuth() {
    try {
        console.log('\n🔒 Testing without authentication...');
        await axios.get(`${BASE_URL}/financial/summary`);
    } catch (error) {
        if (error.response?.status === 401) {
            console.log('✅ Unauthenticated request properly rejected');
            console.log(`   Error: ${error.response.data.message}`);
        } else {
            console.log('❌ Unexpected error without auth:', error.message);
        }
    }
}

/**
 * Performance test
 */
async function performanceTest() {
    try {
        console.log('\n⚡ Running performance test...');
        
        const headers = {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
        };
        
        const startTime = Date.now();
        const promises = [];
        
        // Make 10 concurrent requests
        for (let i = 0; i < 10; i++) {
            promises.push(axios.get(`${BASE_URL}/financial/summary`, { headers }));
        }
        
        const responses = await Promise.all(promises);
        const endTime = Date.now();
        
        const successfulRequests = responses.filter(r => r.data.success).length;
        const avgResponseTime = (endTime - startTime) / responses.length;
        
        console.log(`✅ Performance test completed`);
        console.log(`   Successful requests: ${successfulRequests}/10`);
        console.log(`   Average response time: ${avgResponseTime.toFixed(2)}ms`);
        
    } catch (error) {
        console.log('❌ Performance test error:', error.message);
    }
}

/**
 * Main test function
 */
async function runTests() {
    console.log('🚀 Starting Financial API Tests');
    console.log('=====================================\n');
    
    // Test without authentication first
    await testWithoutAuth();
    
    // Login and run authenticated tests
    const loginSuccess = await login();
    if (!loginSuccess) {
        console.log('❌ Cannot proceed with tests - login failed');
        return;
    }
    
    // Run all tests
    await testFinancialSummary();
    await performanceTest();
    
    console.log('\n=====================================');
    console.log('🏁 All tests completed');
}

// Run tests if this file is executed directly
if (process.argv[1].endsWith('test-financial-api.js')) {
    runTests().catch(console.error);
}

export { runTests, login, testFinancialSummary };
