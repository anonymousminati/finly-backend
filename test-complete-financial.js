/**
 * Simple test to get a working login and test financial summary
 */

import axios from 'axios';
import bcrypt from 'bcrypt';
import { pool } from './configs/db.config.js';
import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = 'http://localhost:3001/api';

async function createTestUser() {
    try {
        console.log('Creating test user...');
        
        // Create a simple password hash
        const password = 'Pass@123';
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(password, saltRounds);
        
        // Delete any existing test user
        await pool.execute('DELETE FROM users WHERE email = ?', ['olivia.finance@example.com']);
        
        // Create new test user
        const uuid = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
        const insertQuery = `
            INSERT INTO users (uuid, username, email, password_hash, full_name, status) 
            VALUES (?, ?, ?, ?, ?, 'active')
        `;
        
        await pool.execute(insertQuery, [
            uuid,
            'olivia.finance',
            'olivia.finance@example.com',
            passwordHash,
            'Olivia Financial'
        ]);
        
        console.log('✅ Test user created successfully');
        console.log(`   Email: olivia.finance@example.com`);
        console.log(`   Password: ${password}`);
        console.log(`   UUID: ${uuid}`);
        
        return { email: 'olivia.finance@example.com', password: password };
        
    } catch (error) {
        console.error('❌ Error creating test user:', error.message);
        throw error;
    }
}

async function createTestAccounts(userId) {
    try {
        console.log('Creating test accounts...');
        
        // Create checking account
        const checkingQuery = `
            INSERT INTO financial_accounts (
                user_id, account_type, account_name, account_number, 
                masked_account_number, bank_name, current_balance, 
                available_balance, is_active, is_primary
            ) VALUES (?, 'checking', 'Primary Checking', '1234567890', 
                     '******7890', 'Test Bank', 5000.00, 5000.00, 1, 1)
        `;
        
        const [checkingResult] = await pool.execute(checkingQuery, [userId]);
        const checkingAccountId = checkingResult.insertId;
        
        // Create credit card account
        const creditQuery = `
            INSERT INTO financial_accounts (
                user_id, account_type, account_name, account_number, 
                masked_account_number, bank_name, current_balance, 
                available_balance, credit_limit, card_type, is_active
            ) VALUES (?, 'credit', 'Main Credit Card', '4532123456789012', 
                     '****9012', 'Test Credit Bank', -500.00, 1500.00, 2000.00, 'visa', 1)
        `;
        
        const [creditResult] = await pool.execute(creditQuery, [userId]);
        const creditAccountId = creditResult.insertId;
        
        console.log('✅ Test accounts created');
        console.log(`   Checking Account ID: ${checkingAccountId}`);
        console.log(`   Credit Account ID: ${creditAccountId}`);
        
        return { checkingAccountId, creditAccountId };
        
    } catch (error) {
        console.error('❌ Error creating test accounts:', error.message);
        throw error;
    }
}

async function createTestTransactions(userId, accountIds) {
    try {
        console.log('Creating test transactions...');
        
        const transactions = [
            {
                account_id: accountIds.checkingAccountId,
                transaction_type: 'income',
                description: 'Salary Payment',
                amount: 3000.00,
                transaction_date: '2024-07-01',
                status: 'completed'
            },
            {
                account_id: accountIds.checkingAccountId,
                transaction_type: 'expense',
                description: 'Grocery Shopping',
                amount: 150.50,
                transaction_date: '2024-07-01',
                status: 'completed'
            },
            {
                account_id: accountIds.creditAccountId,
                transaction_type: 'expense',
                description: 'Online Purchase',
                amount: 89.99,
                transaction_date: '2024-06-30',
                status: 'completed'
            }
        ];
        
        for (const txn of transactions) {
            const query = `
                INSERT INTO transactions (
                    user_id, account_id, transaction_type, description, 
                    amount, transaction_date, transaction_time, status, payment_method
                ) VALUES (?, ?, ?, ?, ?, ?, '12:00:00', ?, 'bank_transfer')
            `;
            
            await pool.execute(query, [
                userId, txn.account_id, txn.transaction_type, 
                txn.description, txn.amount, txn.transaction_date, txn.status
            ]);
        }
        
        console.log(`✅ Created ${transactions.length} test transactions`);
        
    } catch (error) {
        console.error('❌ Error creating test transactions:', error.message);
        throw error;
    }
}

async function testLogin(credentials) {
    try {
        console.log('🔐 Testing login...');
        
        const response = await axios.post(`${BASE_URL}/users/login`, credentials);
        
        if (response.data.success) {
            console.log('✅ Login successful');
            console.log(`   User ID: ${response.data.user.id}`);
            console.log(`   Token: ${response.data.sessionToken.substring(0, 30)}...`);
            return {
                token: response.data.sessionToken,
                userId: response.data.user.id
            };
        } else {
            console.log('❌ Login failed:', response.data.message);
            return null;
        }
        
    } catch (error) {
        console.log('❌ Login error:', error.response?.data?.message || error.message);
        return null;
    }
}

async function testFinancialSummary(token) {
    try {
        console.log('📊 Testing Financial Summary...');
        
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
        
        const response = await axios.get(`${BASE_URL}/financial/summary`, { headers });
        
        if (response.data.success) {
            console.log('✅ Financial summary retrieved successfully');
            
            const summary = response.data.data.summary;
            console.log(`   Total Balance: $${summary.total_balance}`);
            console.log(`   Active Accounts: ${summary.total_active_accounts}`);
            console.log(`   Credit Utilization: ${summary.credit_card.utilization_percentage}%`);
            
            const accounts = response.data.data.accounts;
            console.log(`   Accounts Found: ${accounts.length}`);
            
            accounts.forEach((account, index) => {
                console.log(`     ${index + 1}. ${account.account_name}: $${account.current_balance}`);
            });
            
            const txnSummary = response.data.data.transactions_summary;
            console.log(`   Total Transactions: ${txnSummary.total_transactions}`);
            console.log(`   Total Income: $${txnSummary.total_income}`);
            console.log(`   Total Expenses: $${txnSummary.total_expenses}`);
            
            return true;
        } else {
            console.log('❌ Financial summary failed:', response.data.message);
            return false;
        }
        
    } catch (error) {
        console.log('❌ Financial summary error:', error.response?.data?.message || error.message);
        if (error.response?.data) {
            console.log('   Response:', JSON.stringify(error.response.data, null, 2));
        }
        return false;
    }
}

async function runCompleteTest() {
    try {
        console.log('🚀 Starting Complete Financial API Test');
        console.log('=====================================\n');
        
        // Step 1: Create test user
        const credentials = await createTestUser();
        
        // Step 2: Login to get user ID
        const loginResult = await testLogin(credentials);
        if (!loginResult) {
            console.log('❌ Cannot proceed - login failed');
            return;
        }
        
        // Step 3: Create test accounts and transactions
        const accountIds = await createTestAccounts(loginResult.userId);
        await createTestTransactions(loginResult.userId, accountIds);
        
        // Step 4: Test financial summary
        const summarySuccess = await testFinancialSummary(loginResult.token);
        
        console.log('\n=====================================');
        if (summarySuccess) {
            console.log('🎉 All tests completed successfully!');
        } else {
            console.log('❌ Some tests failed');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        await pool.end();
    }
}

// Run the test
runCompleteTest().catch(console.error);
