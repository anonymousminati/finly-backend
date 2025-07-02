/**
 * Test Financial Summary API using existing user data
 */

import axios from 'axios';
import bcrypt from 'bcrypt';
import { pool } from './configs/db.config.js';
import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = 'http://localhost:3001/api';

// Use existing user data
const EXISTING_USER = {
    email: 'david.invests@example.com',
    password: 'Pass@123', // Assuming this is the correct password for existing users
    userId: 9
};

async function createTestAccounts(userId) {
    try {
        console.log(`Creating test accounts for user ID: ${userId}...`);
        
        // Delete existing test accounts to avoid duplicates
        await pool.execute('DELETE FROM transactions WHERE user_id = ?', [userId]);
        await pool.execute('DELETE FROM financial_accounts WHERE user_id = ?', [userId]);
        
        // Create checking account
        const checkingQuery = `
            INSERT INTO financial_accounts (
                user_id, account_type, account_name, account_number, 
                masked_account_number, bank_name, current_balance, 
                available_balance, is_active, is_primary
            ) VALUES (?, 'checking', 'Primary Checking', '1234567890', 
                     '******7890', 'Chase Bank', 5000.00, 5000.00, 1, 1)
        `;
        
        const [checkingResult] = await pool.execute(checkingQuery, [userId]);
        const checkingAccountId = checkingResult.insertId;
        
        // Create savings account
        const savingsQuery = `
            INSERT INTO financial_accounts (
                user_id, account_type, account_name, account_number, 
                masked_account_number, bank_name, current_balance, 
                available_balance, is_active, is_primary
            ) VALUES (?, 'savings', 'High Yield Savings', '9876543210', 
                     '******3210', 'Chase Bank', 15000.00, 15000.00, 1, 0)
        `;
        
        const [savingsResult] = await pool.execute(savingsQuery, [userId]);
        const savingsAccountId = savingsResult.insertId;
        
        // Create credit card account
        const creditQuery = `
            INSERT INTO financial_accounts (
                user_id, account_type, account_name, account_number, 
                masked_account_number, bank_name, current_balance, 
                available_balance, credit_limit, card_type, is_active
            ) VALUES (?, 'credit', 'Chase Freedom Card', '4532123456789012', 
                     '****9012', 'Chase Bank', -750.00, 1250.00, 2000.00, 'visa', 1)
        `;
        
        const [creditResult] = await pool.execute(creditQuery, [userId]);
        const creditAccountId = creditResult.insertId;
        
        console.log('✅ Test accounts created successfully');
        console.log(`   Checking Account ID: ${checkingAccountId} - Balance: $5,000`);
        console.log(`   Savings Account ID: ${savingsAccountId} - Balance: $15,000`);
        console.log(`   Credit Card ID: ${creditAccountId} - Balance: -$750, Limit: $2,000`);
        
        return { checkingAccountId, savingsAccountId, creditAccountId };
        
    } catch (error) {
        console.error('❌ Error creating test accounts:', error.message);
        throw error;
    }
}

async function createTestCategories(userId) {
    try {
        console.log('Creating test categories...');
        
        const categories = [
            { name: 'Groceries', slug: 'groceries', icon: 'shopping-cart', color: '#FF6B6B' },
            { name: 'Salary', slug: 'salary', icon: 'briefcase', color: '#4ECDC4' },
            { name: 'Entertainment', slug: 'entertainment', icon: 'film', color: '#45B7D1' },
            { name: 'Utilities', slug: 'utilities', icon: 'zap', color: '#96CEB4' },
            { name: 'Dining Out', slug: 'dining-out', icon: 'coffee', color: '#FFEAA7' }
        ];
        
        const categoryIds = {};
        
        for (const category of categories) {
            const query = `
                INSERT INTO transaction_categories (
                    user_id, name, slug, icon, color, is_active
                ) VALUES (?, ?, ?, ?, ?, 1)
                ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)
            `;
            
            const [result] = await pool.execute(query, [
                userId, category.name, category.slug, category.icon, category.color
            ]);
            
            categoryIds[category.slug] = result.insertId;
        }
        
        console.log('✅ Test categories created');
        return categoryIds;
        
    } catch (error) {
        console.error('❌ Error creating test categories:', error.message);
        throw error;
    }
}

async function createTestTransactions(userId, accountIds, categoryIds) {
    try {
        console.log('Creating test transactions...');
        
        const transactions = [
            // Income transactions
            {
                account_id: accountIds.checkingAccountId,
                category_id: categoryIds.salary,
                transaction_type: 'income',
                description: 'Monthly Salary - June 2024',
                amount: 5500.00,
                transaction_date: '2024-06-01',
                status: 'completed'
            },
            {
                account_id: accountIds.savingsAccountId,
                category_id: categoryIds.salary,
                transaction_type: 'income',
                description: 'Bonus Payment',
                amount: 2000.00,
                transaction_date: '2024-06-15',
                status: 'completed'
            },
            // Expense transactions
            {
                account_id: accountIds.checkingAccountId,
                category_id: categoryIds.groceries,
                transaction_type: 'expense',
                description: 'Whole Foods Market',
                amount: 127.89,
                transaction_date: '2024-07-01',
                status: 'completed'
            },
            {
                account_id: accountIds.checkingAccountId,
                category_id: categoryIds.groceries,
                transaction_type: 'expense',
                description: 'Trader Joes',
                amount: 89.45,
                transaction_date: '2024-06-28',
                status: 'completed'
            },
            {
                account_id: accountIds.creditAccountId,
                category_id: categoryIds['dining-out'],
                transaction_type: 'expense',
                description: 'The Italian Place',
                amount: 78.50,
                transaction_date: '2024-06-30',
                status: 'completed'
            },
            {
                account_id: accountIds.creditAccountId,
                category_id: categoryIds.entertainment,
                transaction_type: 'expense',
                description: 'Netflix Subscription',
                amount: 15.99,
                transaction_date: '2024-06-25',
                status: 'completed'
            },
            {
                account_id: accountIds.checkingAccountId,
                category_id: categoryIds.utilities,
                transaction_type: 'expense',
                description: 'Electric Bill - June',
                amount: 145.67,
                transaction_date: '2024-06-20',
                status: 'completed'
            },
            {
                account_id: accountIds.checkingAccountId,
                category_id: categoryIds.groceries,
                transaction_type: 'expense',
                description: 'Costco Wholesale',
                amount: 234.12,
                transaction_date: '2024-06-18',
                status: 'completed'
            }
        ];
        
        for (const txn of transactions) {
            const query = `
                INSERT INTO transactions (
                    user_id, account_id, category_id, transaction_type, description, 
                    amount, transaction_date, transaction_time, status, payment_method
                ) VALUES (?, ?, ?, ?, ?, ?, ?, '12:00:00', ?, 'bank_transfer')
            `;
            
            await pool.execute(query, [
                userId, txn.account_id, txn.category_id, txn.transaction_type, 
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
        console.log(`   Email: ${credentials.email}`);
        
        const response = await axios.post(`${BASE_URL}/users/login`, credentials);
        
        if (response.data.message === 'Login successful' && response.data.session) {
            console.log('✅ Login successful');
            console.log(`   User ID: ${response.data.user.id}`);
            console.log(`   User Name: ${response.data.user.full_name}`);
            console.log(`   Token: ${response.data.session.token.substring(0, 30)}...`);
            return {
                token: response.data.session.token,
                userId: response.data.user.id,
                user: response.data.user
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
        console.log('\n📊 Testing Financial Summary...');
        
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
        
        const response = await axios.get(`${BASE_URL}/financial/summary`, { headers });
        
        if (response.data.success) {
            console.log('✅ Financial summary retrieved successfully\n');
            
            const data = response.data.data;
            const summary = data.summary;
            
            // Display summary information
            console.log('📋 FINANCIAL SUMMARY:');
            console.log(`   💰 Total Balance: $${summary.total_balance.toLocaleString()}`);
            console.log(`   🏦 Active Accounts: ${summary.total_active_accounts}`);
            console.log(`   💳 Credit Limit: $${summary.credit_card.total_limit.toLocaleString()}`);
            console.log(`   📊 Credit Utilized: $${summary.credit_card.total_utilized.toLocaleString()}`);
            console.log(`   📈 Utilization Rate: ${summary.credit_card.utilization_percentage}%\n`);
            
            // Display accounts
            console.log('🏦 ACCOUNTS:');
            data.accounts.forEach((account, index) => {
                console.log(`   ${index + 1}. ${account.account_name} (${account.bank_name})`);
                console.log(`      💰 Balance: $${account.current_balance.toLocaleString()}`);
                if (account.credit_limit) {
                    console.log(`      💳 Credit Limit: $${account.credit_limit.toLocaleString()}`);
                    console.log(`      💳 Available: $${account.available_balance.toLocaleString()}`);
                }
                console.log(`      📊 Transactions: ${account.transactions_count}`);
                if (account.categories_summary.length > 0) {
                    console.log(`      🏷️  Top Categories:`);
                    account.categories_summary.forEach(cat => {
                        console.log(`         - ${cat.category_name}: $${cat.total_amount.toLocaleString()} (${cat.transaction_count} txns)`);
                    });
                }
                console.log('');
            });
            
            // Display transaction summary
            const txnSummary = data.transactions_summary;
            console.log('📊 TRANSACTION SUMMARY:');
            console.log(`   📈 Total Transactions: ${txnSummary.total_transactions}`);
            console.log(`   💚 Total Income: $${txnSummary.total_income.toLocaleString()}`);
            console.log(`   💸 Total Expenses: $${txnSummary.total_expenses.toLocaleString()}`);
            console.log(`   📊 Average Transaction: $${txnSummary.average_transaction.toFixed(2)}`);
            console.log(`   💰 Net Income: $${(txnSummary.total_income - txnSummary.total_expenses).toLocaleString()}\n`);
            
            // Display recent transactions
            if (txnSummary.recent_transactions.length > 0) {
                console.log('🕒 RECENT TRANSACTIONS:');
                txnSummary.recent_transactions.forEach((txn, index) => {
                    const typeIcon = txn.type === 'income' ? '💚' : '💸';
                    const categoryInfo = txn.category ? `[${txn.category.name}]` : '';
                    console.log(`   ${index + 1}. ${typeIcon} ${txn.description} ${categoryInfo}`);
                    console.log(`      💰 $${txn.amount.toLocaleString()} - ${txn.date} (${txn.status})`);
                });
            }
            
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

async function testWithDateRange(token) {
    try {
        console.log('\n📅 Testing Financial Summary with Date Range...');
        
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
        
        const fromDate = '2024-06-01';
        const toDate = '2024-06-30';
        
        const response = await axios.get(`${BASE_URL}/financial/summary?from=${fromDate}&to=${toDate}`, { headers });
        
        if (response.data.success) {
            console.log(`✅ Financial summary for ${fromDate} to ${toDate}`);
            const txnSummary = response.data.data.transactions_summary;
            console.log(`   📊 Transactions in period: ${txnSummary.total_transactions}`);
            console.log(`   💚 Income in period: $${txnSummary.total_income.toLocaleString()}`);
            console.log(`   💸 Expenses in period: $${txnSummary.total_expenses.toLocaleString()}`);
            return true;
        } else {
            console.log('❌ Date range test failed:', response.data.message);
            return false;
        }
        
    } catch (error) {
        console.log('❌ Date range test error:', error.response?.data?.message || error.message);
        return false;
    }
}

async function runCompleteTest() {
    try {
        console.log('🚀 Starting Complete Financial API Test');
        console.log('🎯 Using existing user: david.invests@example.com');
        console.log('=====================================\n');
        
        // Step 1: Login with existing user
        const loginResult = await testLogin(EXISTING_USER);
        if (!loginResult) {
            console.log('❌ Cannot proceed - login failed');
            return;
        }
        
        // Step 2: Create test data
        const categoryIds = await createTestCategories(loginResult.userId);
        const accountIds = await createTestAccounts(loginResult.userId);
        await createTestTransactions(loginResult.userId, accountIds, categoryIds);
        
        // Step 3: Test financial summary
        const summarySuccess = await testFinancialSummary(loginResult.token);
        
        // Step 4: Test with date range
        const dateRangeSuccess = await testWithDateRange(loginResult.token);
        
        console.log('\n=====================================');
        if (summarySuccess && dateRangeSuccess) {
            console.log('🎉 All tests completed successfully!');
            console.log('✅ Financial Summary API is working correctly');
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
