show databases;
use finly_dashboard;
desc users;
SET SQL_SAFE_UPDATES = 0;

-- ============================================================================
-- FINLY Financial Dashboard - Sample Data Inserts
-- This script populates the finly_dashboard database with sample user data,
-- financial accounts, transactions, bills, goals, and other related information.
--
-- Ensure the 'finly_dashboard' database and its schema (as previously provided)
-- are already created before running this script.
-- ============================================================================

USE finly_dashboard;

-- ============================================================================
-- 1. USER PROFILES
-- ============================================================================

-- User 1: Olivia Financial (Goal-Oriented Saver)
INSERT INTO users (uuid, username, email, password_hash, full_name, phone_number, email_verified_at, status) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'olivia.finance', 'olivia.finance@example.com', '$2a$10$abcdefghijklmnopqrstuvwxyza0123456789abcdefghij', 'Olivia Financial', '+919876543210', NOW(), 'active');

-- User 2: David Investor (High Income, Investment Focused)
INSERT INTO users (uuid, username, email, password_hash, full_name, phone_number, email_verified_at, status) VALUES
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'david.invests', 'david.invests@example.com', '$2a$10$abcdefghijklmnopqrstuvwxyza0123456789abcdefghij', 'David Investor', '+918765432109', NOW(), 'active');

-- User 3: Sophia Budget (Budget-Conscious Planner)
INSERT INTO users (uuid, username, email, password_hash, full_name, phone_number, email_verified_at, status) VALUES
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'sophia.budget', 'sophia.budget@example.com', '$2a$10$abcdefghijklmnopqrstuvwxyza0123456789abcdefghij', 'Sophia Budget', '+917654321098', NOW(), 'active');


-- ============================================================================
-- 2. USER SECURITY SETTINGS & PREFERENCES
-- ============================================================================

-- Security Settings for Olivia
INSERT INTO user_security_settings (user_id, two_factor_enabled, two_factor_secret, login_alerts_enabled, password_changed_at) VALUES
((SELECT id FROM users WHERE username = 'olivia.finance'), TRUE, 'SECRETKEYOLIVIA12345', TRUE, NOW());

-- Preferences for Olivia
INSERT INTO user_preferences (user_id, default_currency, date_format, time_format, timezone, language, theme) VALUES
((SELECT id FROM users WHERE username = 'olivia.finance'), 'USD', 'DD/MM/YYYY', '24h', 'Asia/Kolkata', 'en', 'dark');

-- Financial Profile for Olivia
INSERT INTO user_financial_profile (user_id, monthly_income, monthly_expenses, financial_goals, risk_tolerance, investment_experience, retirement_age, dependents_count, credit_score, debt_to_income_ratio) VALUES
((SELECT id FROM users WHERE username = 'olivia.finance'), 5000.00, 2500.00, '{"short_term": ["new car"], "long_term": ["house down payment"]}', 'moderate', 'intermediate', 60, 0, 780, 0.35);


-- Security Settings for David
INSERT INTO user_security_settings (user_id, two_factor_enabled, two_factor_secret, login_alerts_enabled, password_changed_at) VALUES
((SELECT id FROM users WHERE username = 'david.invests'), TRUE, 'SECRETKEYDAVID67890', TRUE, NOW());

-- Preferences for David
INSERT INTO user_preferences (user_id, default_currency, date_format, time_format, timezone, language, theme) VALUES
((SELECT id FROM users WHERE username = 'david.invests'), 'USD', 'YYYY-MM-DD', '12h', 'America/New_York', 'en', 'light');

-- Financial Profile for David
INSERT INTO user_financial_profile (user_id, monthly_income, monthly_expenses, financial_goals, risk_tolerance, investment_experience, retirement_age, dependents_count, credit_score, debt_to_income_ratio) VALUES
((SELECT id FROM users WHERE username = 'david.invests'), 10000.00, 4000.00, '{"short_term": ["portfolio growth"], "long_term": ["early retirement"]}', 'aggressive', 'expert', 55, 1, 820, 0.20);


-- Security Settings for Sophia
INSERT INTO user_security_settings (user_id, two_factor_enabled, two_factor_secret, login_alerts_enabled, password_changed_at) VALUES
((SELECT id FROM users WHERE username = 'sophia.budget'), FALSE, NULL, TRUE, NOW());

-- Preferences for Sophia
INSERT INTO user_preferences (user_id, default_currency, date_format, time_format, timezone, language, theme) VALUES
((SELECT id FROM users WHERE username = 'sophia.budget'), 'EUR', 'DD.MM.YYYY', '24h', 'Europe/Berlin', 'en', 'auto');

-- Financial Profile for Sophia
INSERT INTO user_financial_profile (user_id, monthly_income, monthly_expenses, financial_goals, risk_tolerance, investment_experience, retirement_age, dependents_count, credit_score, debt_to_income_ratio) VALUES
((SELECT id FROM users WHERE username = 'sophia.budget'), 3500.00, 2800.00, '{"short_term": ["debt repayment"], "long_term": ["emergency fund"]}', 'conservative', 'beginner', 65, 0, 720, 0.45);


-- ============================================================================
-- 3. FINANCIAL ACCOUNTS
-- ============================================================================

-- Accounts for Olivia Financial
INSERT INTO financial_accounts (user_id, account_type, account_name, account_number, masked_account_number, bank_name, current_balance, available_balance, currency, is_primary) VALUES
((SELECT id FROM users WHERE username = 'olivia.finance'), 'savings', 'My Savings Account', 'SAV87654321', 'XXXXXX4321', 'ABC Bank', 15000.00, 15000.00, 'USD', TRUE),
((SELECT id FROM users WHERE username = 'olivia.finance'), 'checking', 'Daily Expenses', 'CHK12345678', 'XXXXXX5678', 'ABC Bank', 2500.00, 2450.00, 'USD', FALSE),
((SELECT id FROM users WHERE username = 'olivia.finance'), 'credit', 'Rewards Credit Card', 'CC98765432', 'XXXXXX5432', 'XYZ Bank', 1200.00, 3800.00, 'USD', FALSE),
((SELECT id FROM users WHERE username = 'olivia.finance'), 'investment', 'Growth Portfolio', 'INV00123456', 'XXXXXX3456', 'InvestCorp', 22000.00, 22000.00, 'USD', FALSE);


-- Accounts for David Investor
INSERT INTO financial_accounts (user_id, account_type, account_name, account_number, masked_account_number, bank_name, current_balance, available_balance, currency, is_primary) VALUES
((SELECT id FROM users WHERE username = 'david.invests'), 'checking', 'Main Checking', 'CHK98765432', 'XXXXXX5432', 'Global Bank', 8000.00, 7900.00, 'USD', TRUE),
((SELECT id FROM users WHERE username = 'david.invests'), 'investment', 'Stocks & Bonds', 'INV98765432', 'XXXXXX5432', 'WealthFront', 150000.00, 150000.00, 'USD', FALSE),
((SELECT id FROM users WHERE username = 'david.invests'), 'credit', 'Premium Visa', 'CC11223344', 'XXXXXX3344', 'Global Bank', 5000.00, 10000.00, 'USD', FALSE),
((SELECT id FROM users WHERE username = 'david.invests'), 'business', 'Consulting Account', 'BIZ56789012', 'XXXXXX9012', 'Business Bank', 12000.00, 12000.00, 'USD', FALSE);


-- Accounts for Sophia Budget
INSERT INTO financial_accounts (user_id, account_type, account_name, account_number, masked_account_number, bank_name, current_balance, available_balance, currency, is_primary) VALUES
((SELECT id FROM users WHERE username = 'sophia.budget'), 'checking', 'Everyday Account', 'CHK00112233', 'XXXXXX2233', 'Local Bank', 1200.00, 1150.00, 'EUR', TRUE),
((SELECT id FROM users WHERE username = 'sophia.budget'), 'savings', 'Emergency Fund', 'SAV00445566', 'XXXXXX5566', 'Local Bank', 3000.00, 3000.00, 'EUR', FALSE),
((SELECT id FROM users WHERE username = 'sophia.budget'), 'credit', 'Basic Mastercard', 'CC99887766', 'XXXXXX7766', 'Credit Union', 800.00, 1200.00, 'EUR', FALSE);


-- ============================================================================
-- 4. HELPER VARIABLES (for Transaction Categories and Account IDs)
--    These variables simplify the following INSERT statements by avoiding
--    repeated subqueries for IDs.
-- ============================================================================

SET @olivia_id = (SELECT id FROM users WHERE username = 'olivia.finance');
SET @david_id = (SELECT id FROM users WHERE username = 'david.invests');
SET @sophia_id = (SELECT id FROM users WHERE username = 'sophia.budget');

-- Helper variables for Account IDs (Olivia)
SET @olivia_savings_acc = (SELECT id FROM financial_accounts WHERE user_id = @olivia_id AND account_type = 'savings');
SET @olivia_checking_acc = (SELECT id FROM financial_accounts WHERE user_id = @olivia_id AND account_type = 'checking');
SET @olivia_credit_acc = (SELECT id FROM financial_accounts WHERE user_id = @olivia_id AND account_type = 'credit');
SET @olivia_invest_acc = (SELECT id FROM financial_accounts WHERE user_id = @olivia_id AND account_type = 'investment');

-- Helper variables for Account IDs (David)
SET @david_checking_acc = (SELECT id FROM financial_accounts WHERE user_id = @david_id AND account_type = 'checking');
SET @david_invest_acc = (SELECT id FROM financial_accounts WHERE user_id = @david_id AND account_type = 'investment');
SET @david_credit_acc = (SELECT id FROM financial_accounts WHERE user_id = @david_id AND account_type = 'credit');
SET @david_business_acc = (SELECT id FROM financial_accounts WHERE user_id = @david_id AND account_type = 'business');

-- Helper variables for Account IDs (Sophia)
SET @sophia_checking_acc = (SELECT id FROM financial_accounts WHERE user_id = @sophia_id AND account_type = 'checking');
SET @sophia_savings_acc = (SELECT id FROM financial_accounts WHERE user_id = @sophia_id AND account_type = 'savings');
SET @sophia_credit_acc = (SELECT id FROM financial_accounts WHERE user_id = @sophia_id AND account_type = 'credit');

-- Helper variables for Category IDs (assuming default categories are already inserted)
SET @housing_id = (SELECT id FROM transaction_categories WHERE slug = 'housing');
SET @food_id = (SELECT id FROM transaction_categories WHERE slug = 'food');
SET @transportation_id = (SELECT id FROM transaction_categories WHERE slug = 'transportation');
SET @entertainment_id = (SELECT id FROM transaction_categories WHERE slug = 'entertainment');
SET @shopping_id = (SELECT id FROM transaction_categories WHERE slug = 'shopping');
SET @healthcare_id = (SELECT id FROM transaction_categories WHERE slug = 'healthcare');
SET @education_id = (SELECT id FROM transaction_categories WHERE slug = 'education');
SET @utilities_id = (SELECT id FROM transaction_categories WHERE slug = 'utilities');
SET @insurance_id = (SELECT id FROM transaction_categories WHERE slug = 'insurance');
SET @others_id = (SELECT id FROM transaction_categories WHERE slug = 'others');


-- ============================================================================
-- 5. TRANSACTIONS
-- ============================================================================

-- Transactions for Olivia Financial (40 transactions)
INSERT INTO transactions (user_id, account_id, transaction_type, category_id, merchant_name, description, amount, payment_method, transaction_date, transaction_time, status) VALUES
(@olivia_id, @olivia_checking_acc, 'expense', @food_id, 'SuperMart', 'Groceries for the week', 75.50, 'debit_card', '2025-01-05', '14:30:00', 'completed'),
(@olivia_id, @olivia_checking_acc, 'expense', @transportation_id, 'Gas Station', 'Fuel for car', 40.00, 'credit_card', '2025-01-12', '10:00:00', 'completed'),
(@olivia_id, @olivia_checking_acc, 'expense', @housing_id, 'Rent Payments Co.', 'January Rent', 1200.00, 'bank_transfer', '2025-01-01', '09:00:00', 'completed'),
(@olivia_id, @olivia_checking_acc, 'expense', @entertainment_id, 'Cinema Palace', 'Movie tickets', 30.00, 'credit_card', '2025-01-20', '19:00:00', 'completed'),
(@olivia_id, @olivia_checking_acc, 'expense', @shopping_id, 'Online Fashion', 'New shirt', 55.00, 'paypal', '2025-01-25', '16:00:00', 'completed'),
(@olivia_id, @olivia_checking_acc, 'income', NULL, 'Salary Deposit', 'Monthly salary', 3500.00, 'bank_transfer', '2025-01-31', '11:00:00', 'completed'),
(@olivia_id, @olivia_savings_acc, 'transfer', NULL, 'Transfer to Savings', 'Monthly savings contribution', 500.00, 'bank_transfer', '2025-02-01', '10:00:00', 'completed'),
(@olivia_id, @olivia_checking_acc, 'expense', @utilities_id, 'Electric Company', 'Electricity bill', 80.00, 'bank_transfer', '2025-02-07', '12:00:00', 'completed'),
(@olivia_id, @olivia_credit_acc, 'expense', @food_id, 'Restaurant XYZ', 'Dinner out', 60.00, 'credit_card', '2025-02-14', '20:00:00', 'completed'),
(@olivia_id, @olivia_checking_acc, 'expense', @education_id, 'Online Course', 'Subscription fee', 25.00, 'debit_card', '2025-02-20', '11:00:00', 'completed'),

(@olivia_id, @olivia_checking_acc, 'expense', @food_id, 'Cafe Corner', 'Coffee and snack', 10.50, 'debit_card', '2025-03-02', '09:00:00', 'completed'),
(@olivia_id, @olivia_checking_acc, 'expense', @transportation_id, 'Public Transport', 'Monthly pass', 70.00, 'debit_card', '2025-03-05', '08:00:00', 'completed'),
(@olivia_id, @olivia_checking_acc, 'expense', @housing_id, 'Internet Provider', 'Monthly internet bill', 50.00, 'bank_transfer', '2025-03-10', '13:00:00', 'completed'),
(@olivia_id, @olivia_credit_acc, 'expense', @shopping_id, 'Bookstore', 'New novel', 20.00, 'credit_card', '2025-03-15', '17:00:00', 'completed'),
(@olivia_id, @olivia_checking_acc, 'expense', @healthcare_id, 'Pharmacy', 'Medication', 15.00, 'debit_card', '2025-03-22', '10:30:00', 'completed'),
(@olivia_id, @olivia_checking_acc, 'income', NULL, 'Freelance Project', 'Payment for design work', 800.00, 'bank_transfer', '2025-03-28', '16:00:00', 'completed'),
(@olivia_id, @olivia_checking_acc, 'expense', @entertainment_id, 'Streaming Service', 'Monthly subscription', 12.99, 'credit_card', '2025-04-01', '09:00:00', 'completed'),
(@olivia_id, @olivia_checking_acc, 'expense', @food_id, 'Grocery Store A', 'Weekly groceries', 90.25, 'debit_card', '2025-04-08', '15:00:00', 'completed'),
(@olivia_id, @olivia_checking_acc, 'expense', @transportation_id, 'Ride Share', 'Trip to airport', 25.00, 'credit_card', '2025-04-15', '06:00:00', 'completed'),
(@olivia_id, @olivia_checking_acc, 'expense', @housing_id, 'Home Repair Shop', 'Small repairs', 100.00, 'debit_card', '2025-04-20', '14:00:00', 'completed'),

(@olivia_id, @olivia_checking_acc, 'expense', @food_id, 'Bakery', 'Birthday cake', 35.00, 'debit_card', '2025-05-03', '11:00:00', 'completed'),
(@olivia_id, @olivia_checking_acc, 'expense', @transportation_id, 'Car Maintenance', 'Oil change', 60.00, 'debit_card', '2025-05-10', '09:30:00', 'completed'),
(@olivia_id, @olivia_checking_acc, 'expense', @entertainment_id, 'Concert Tickets', 'Live show', 70.00, 'credit_card', '2025-05-18', '18:00:00', 'completed'),
(@olivia_id, @olivia_checking_acc, 'expense', @shopping_id, 'Department Store', 'New shoes', 85.00, 'credit_card', '2025-05-25', '13:00:00', 'completed'),
(@olivia_id, @olivia_checking_acc, 'expense', @healthcare_id, 'Dentist Office', 'Dental checkup', 150.00, 'debit_card', '2025-05-29', '10:00:00', 'completed'),
(@olivia_id, @olivia_checking_acc, 'income', NULL, 'Dividend Payout', 'Investment income', 150.00, 'bank_transfer', '2025-05-30', '14:00:00', 'completed'),
(@olivia_id, @olivia_checking_acc, 'expense', @utilities_id, 'Water Bill', 'Monthly water usage', 45.00, 'bank_transfer', '2025-06-05', '10:00:00', 'completed'),
(@olivia_id, @olivia_checking_acc, 'expense', @food_id, 'Farmers Market', 'Fresh produce', 30.00, 'cash', '2025-06-12', '08:00:00', 'completed'),
(@olivia_id, @olivia_credit_acc, 'expense', @entertainment_id, 'Museum Entry', 'Cultural visit', 20.00, 'credit_card', '2025-06-19', '11:00:00', 'completed'),
(@olivia_id, @olivia_checking_acc, 'expense', @education_id, 'Software Subscription', 'Learning tool', 19.99, 'debit_card', '2025-06-25', '16:00:00', 'completed'),

(@olivia_id, @olivia_checking_acc, 'expense', @food_id, 'Pizza Place', 'Takeaway dinner', 25.00, 'credit_card', '2025-07-01', '19:00:00', 'completed'),
(@olivia_id, @olivia_checking_acc, 'expense', @transportation_id, 'Toll Road', 'Highway tolls', 10.00, 'debit_card', '2025-07-07', '07:00:00', 'completed'),
(@olivia_id, @olivia_checking_acc, 'expense', @housing_id, 'Property Management', 'HOA fees', 200.00, 'bank_transfer', '2025-07-15', '10:00:00', 'completed'),
(@olivia_id, @olivia_credit_acc, 'expense', @shopping_id, 'Online Electronics', 'Headphones', 120.00, 'credit_card', '2025-07-20', '14:00:00', 'completed'),
(@olivia_id, @olivia_checking_acc, 'expense', @healthcare_id, 'Gym Membership', 'Monthly fee', 40.00, 'debit_card', '2025-07-26', '10:00:00', 'completed');


-- Transactions for David Investor (40 transactions)
INSERT INTO transactions (user_id, account_id, transaction_type, category_id, merchant_name, description, amount, payment_method, transaction_date, transaction_time, status) VALUES
(@david_id, @david_checking_acc, 'income', NULL, 'Salary Deposit', 'Monthly paycheck', 7500.00, 'bank_transfer', '2025-01-31', '09:00:00', 'completed'),
(@david_id, @david_invest_acc, 'transfer', NULL, 'Investment Transfer', 'Monthly investment contribution', 2000.00, 'bank_transfer', '2025-02-05', '10:00:00', 'completed'),
(@david_id, @david_checking_acc, 'expense', @housing_id, 'Mortgage Bank', 'Monthly mortgage payment', 2500.00, 'bank_transfer', '2025-02-01', '09:00:00', 'completed'),
(@david_id, @david_checking_acc, 'expense', @food_id, 'Fine Dining Rest.', 'Business dinner', 150.00, 'credit_card', '2025-02-10', '20:00:00', 'completed'),
(@david_id, @david_checking_acc, 'expense', @transportation_id, 'Airline Tickets', 'Business trip flight', 450.00, 'credit_card', '2025-02-15', '14:00:00', 'completed'),
(@david_id, @david_checking_acc, 'expense', @shopping_id, 'Luxury Boutique', 'New suit', 700.00, 'credit_card', '2025-02-20', '16:00:00', 'completed'),
(@david_id, @david_business_acc, 'income', NULL, 'Client Payment', 'Consulting services', 3000.00, 'bank_transfer', '2025-02-28', '10:00:00', 'completed'),
(@david_id, @david_checking_acc, 'expense', @utilities_id, 'Internet & Cable', 'Monthly services', 120.00, 'bank_transfer', '2025-03-03', '11:00:00', 'completed'),
(@david_id, @david_credit_acc, 'expense', @entertainment_id, 'Theater Play', 'Evening show', 90.00, 'credit_card', '2025-03-08', '19:00:00', 'completed'),
(@david_id, @david_checking_acc, 'expense', @healthcare_id, 'Specialist Visit', 'Medical consultation', 250.00, 'debit_card', '2025-03-15', '10:00:00', 'completed'),

(@david_id, @david_checking_acc, 'expense', @food_id, 'Gourmet Market', 'Specialty groceries', 80.00, 'debit_card', '2025-04-01', '14:00:00', 'completed'),
(@david_id, @david_checking_acc, 'expense', @transportation_id, 'Car Service', 'Chauffeur service', 100.00, 'credit_card', '2025-04-07', '08:00:00', 'completed'),
(@david_id, @david_checking_acc, 'expense', @housing_id, 'Property Taxes', 'Quarterly payment', 1500.00, 'bank_transfer', '2025-04-10', '10:00:00', 'completed'),
(@david_id, @david_credit_acc, 'expense', @shopping_id, 'Jewelry Store', 'Gift for spouse', 300.00, 'credit_card', '2025-04-18', '17:00:00', 'completed'),
(@david_id, @david_checking_acc, 'expense', @education_id, 'Business Seminar', 'Conference fee', 600.00, 'bank_transfer', '2025-04-25', '09:00:00', 'completed'),
(@david_id, @david_checking_acc, 'income', NULL, 'Stock Dividend', 'Quarterly dividend', 500.00, 'bank_transfer', '2025-04-30', '15:00:00', 'completed'),
(@david_id, @david_invest_acc, 'transfer', NULL, 'Additional Investment', 'Opportunistic investment', 1000.00, 'bank_transfer', '2025-05-02', '11:00:00', 'completed'),
(@david_id, @david_checking_acc, 'expense', @utilities_id, 'Water & Sewage', 'Monthly bill', 70.00, 'bank_transfer', '2025-05-08', '10:00:00', 'completed'),
(@david_id, @david_credit_acc, 'expense', @food_id, 'Michelin Star Rest.', 'Anniversary dinner', 300.00, 'credit_card', '2025-05-14', '20:30:00', 'completed'),
(@david_id, @david_checking_acc, 'expense', @entertainment_id, 'Golf Club', 'Membership fee', 200.00, 'debit_card', '2025-05-20', '12:00:00', 'completed'),

(@david_id, @david_checking_acc, 'expense', @transportation_id, 'Luxury Car Rental', 'Weekend trip', 250.00, 'credit_card', '2025-06-01', '09:00:00', 'completed'),
(@david_id, @david_checking_acc, 'expense', @housing_id, 'Home Renovation', 'Contractor payment', 1500.00, 'bank_transfer', '2025-06-05', '10:00:00', 'completed'),
(@david_id, @david_checking_acc, 'expense', @shopping_id, 'Electronics Store', 'New laptop', 1200.00, 'credit_card', '2025-06-12', '14:00:00', 'completed'),
(@david_id, @david_checking_acc, 'expense', @healthcare_id, 'Annual Checkup', 'Executive health plan', 400.00, 'debit_card', '2025-06-18', '11:00:00', 'completed'),
(@david_id, @david_business_acc, 'income', NULL, 'Consulting Fee', 'Large project payment', 5000.00, 'bank_transfer', '2025-06-25', '16:00:00', 'completed'),
(@david_id, @david_checking_acc, 'expense', @others_id, 'Charity Donation', 'Annual contribution', 1000.00, 'bank_transfer', '2025-06-30', '17:00:00', 'completed'),
(@david_id, @david_checking_acc, 'expense', @food_id, 'Caterer', 'Party catering', 350.00, 'credit_card', '2025-07-05', '18:00:00', 'completed'),
(@david_id, @david_checking_acc, 'expense', @transportation_id, 'Private Jet Charter', 'Urgent business travel', 3000.00, 'bank_transfer', '2025-07-10', '06:00:00', 'completed'),
(@david_id, @david_checking_acc, 'expense', @entertainment_id, 'Art Gallery', 'Art purchase', 800.00, 'credit_card', '2025-07-15', '15:00:00', 'completed'),
(@david_id, @david_checking_acc, 'expense', @insurance_id, 'Life Insurance', 'Annual premium', 1500.00, 'bank_transfer', '2025-07-20', '10:00:00', 'completed');


-- Transactions for Sophia Budget (30 transactions)
INSERT INTO transactions (user_id, account_id, transaction_type, category_id, merchant_name, description, amount, payment_method, transaction_date, transaction_time, status) VALUES
(@sophia_id, @sophia_checking_acc, 'income', NULL, 'Salary', 'Monthly salary deposit', 2500.00, 'bank_transfer', '2025-01-31', '09:00:00', 'completed'),
(@sophia_id, @sophia_checking_acc, 'expense', @housing_id, 'Apartment Rent', 'January rent payment', 800.00, 'bank_transfer', '2025-01-01', '10:00:00', 'completed'),
(@sophia_id, @sophia_checking_acc, 'expense', @food_id, 'Local Grocer', 'Weekly shopping', 50.00, 'debit_card', '2025-01-07', '14:00:00', 'completed'),
(@sophia_id, @sophia_checking_acc, 'expense', @transportation_id, 'Bus Tickets', 'Public transport fare', 15.00, 'cash', '2025-01-14', '08:30:00', 'completed'),
(@sophia_id, @sophia_credit_acc, 'expense', @shopping_id, 'Online Store', 'Book purchase', 20.00, 'credit_card', '2025-01-20', '16:00:00', 'completed'),
(@sophia_id, @sophia_checking_acc, 'expense', @utilities_id, 'Electricity Bill', 'Monthly electricity', 60.00, 'bank_transfer', '2025-02-05', '11:00:00', 'completed'),
(@sophia_id, @sophia_checking_acc, 'expense', @food_id, 'Cafeteria', 'Lunch at work', 8.00, 'debit_card', '2025-02-12', '13:00:00', 'completed'),
(@sophia_id, @sophia_checking_acc, 'expense', @entertainment_id, 'Netflix', 'Monthly subscription', 10.99, 'debit_card', '2025-02-18', '09:00:00', 'completed'),
(@sophia_id, @sophia_savings_acc, 'transfer', NULL, 'Savings Contribution', 'Automated transfer', 100.00, 'bank_transfer', '2025-02-25', '10:00:00', 'completed'),
(@sophia_id, @sophia_checking_acc, 'expense', @healthcare_id, 'GP Visit', 'Doctor appointment', 30.00, 'cash', '2025-02-28', '14:00:00', 'completed'),

(@sophia_id, @sophia_checking_acc, 'expense', @housing_id, 'Internet Bill', 'Monthly internet', 40.00, 'bank_transfer', '2025-03-01', '10:00:00', 'completed'),
(@sophia_id, @sophia_checking_acc, 'expense', @food_id, 'Supermarket B', 'Weekly groceries', 55.00, 'debit_card', '2025-03-08', '15:00:00', 'completed'),
(@sophia_id, @sophia_checking_acc, 'expense', @transportation_id, 'Train Fare', 'Commute ticket', 7.50, 'debit_card', '2025-03-15', '07:45:00', 'completed'),
(@sophia_id, @sophia_credit_acc, 'expense', @shopping_id, 'Clothing Store', 'Basic top', 25.00, 'credit_card', '2025-03-22', '12:00:00', 'completed'),
(@sophia_id, @sophia_checking_acc, 'expense', @others_id, 'Haircut', 'Personal care', 20.00, 'cash', '2025-03-29', '11:00:00', 'completed'),
(@sophia_id, @sophia_checking_acc, 'income', NULL, 'Side Gig Payment', 'Online tutoring', 200.00, 'paypal', '2025-04-05', '17:00:00', 'completed'),
(@sophia_id, @sophia_checking_acc, 'expense', @utilities_id, 'Gas Bill', 'Monthly gas usage', 35.00, 'bank_transfer', '2025-04-10', '10:00:00', 'completed'),
(@sophia_id, @sophia_checking_acc, 'expense', @food_id, 'Coffee Shop', 'Morning coffee', 5.00, 'cash', '2025-04-17', '08:00:00', 'completed'),
(@sophia_id, @sophia_checking_acc, 'expense', @entertainment_id, 'Public Library Fine', 'Overdue book', 2.50, 'debit_card', '2025-04-24', '16:00:00', 'completed'),
(@sophia_id, @sophia_savings_acc, 'transfer', NULL, 'Emergency Fund Add', 'Extra savings', 50.00, 'bank_transfer', '2025-04-30', '12:00:00', 'completed'),

(@sophia_id, @sophia_checking_acc, 'expense', @housing_id, 'Home Insurance', 'Monthly premium', 30.00, 'bank_transfer', '2025-05-01', '10:00:00', 'completed'),
(@sophia_id, @sophia_checking_acc, 'expense', @food_id, 'Farmers Market', 'Fresh produce', 25.00, 'cash', '2025-05-09', '09:00:00', 'completed'),
(@sophia_id, @sophia_checking_acc, 'expense', @transportation_id, 'Taxi Ride', 'Emergency ride', 12.00, 'credit_card', '2025-05-16', '22:00:00', 'completed'),
(@sophia_id, @sophia_credit_acc, 'expense', @shopping_id, 'Drugstore', 'Toiletries', 18.00, 'credit_card', '2025-05-23', '11:00:00', 'completed'),
(@sophia_id, @sophia_checking_acc, 'expense', @healthcare_id, 'Prescription Refill', 'Medicine', 10.00, 'debit_card', '2025-05-30', '15:00:00', 'completed'),
(@sophia_id, @sophia_checking_acc, 'income', NULL, 'Bonus', 'Work bonus', 300.00, 'bank_transfer', '2025-06-05', '14:00:00', 'completed'),
(@sophia_id, @sophia_checking_acc, 'expense', @utilities_id, 'Phone Bill', 'Monthly mobile plan', 25.00, 'bank_transfer', '2025-06-12', '10:00:00', 'completed'),
(@sophia_id, @sophia_checking_acc, 'expense', @food_id, 'Fast Food', 'Quick meal', 9.00, 'cash', '2025-06-19', '13:00:00', 'completed'),
(@sophia_id, @sophia_checking_acc, 'expense', @entertainment_id, 'Ebook Purchase', 'New ebook', 7.99, 'debit_card', '2025-06-26', '18:00:00', 'completed'),
(@sophia_id, @sophia_savings_acc, 'transfer', NULL, 'Debt Payment', 'Credit card payment', 200.00, 'bank_transfer', '2025-06-30', '11:00:00', 'completed');


-- ============================================================================
-- 6. ACCOUNT BALANCE HISTORY
-- ============================================================================

-- Account Balance History for Olivia's Savings Account
INSERT INTO account_balance_history (account_id, balance_date, opening_balance, closing_balance, available_balance) VALUES
(@olivia_savings_acc, '2025-01-01', 14000.00, 14000.00, 14000.00),
(@olivia_savings_acc, '2025-01-31', 14000.00, 14500.00, 14500.00),
(@olivia_savings_acc, '2025-02-28', 14500.00, 15000.00, 15000.00),
(@olivia_savings_acc, '2025-03-31', 15000.00, 15500.00, 15500.00);

-- Account Balance History for David's Main Checking Account
INSERT INTO account_balance_history (account_id, balance_date, opening_balance, closing_balance, available_balance) VALUES
(@david_checking_acc, '2025-01-01', 7000.00, 7000.00, 7000.00),
(@david_checking_acc, '2025-01-31', 7000.00, 12500.00, 12500.00),
(@david_checking_acc, '2025-02-28', 12500.00, 7500.00, 7400.00),
(@david_checking_acc, '2025-03-31', 7500.00, 6800.00, 6700.00);

-- Account Balance History for Sophia's Everyday Account
INSERT INTO account_balance_history (account_id, balance_date, opening_balance, closing_balance, available_balance) VALUES
(@sophia_checking_acc, '2025-01-01', 1000.00, 1000.00, 1000.00),
(@sophia_checking_acc, '2025-01-31', 1000.00, 1600.00, 1550.00),
(@sophia_checking_acc, '2025-02-28', 1600.00, 1400.00, 1350.00),
(@sophia_checking_acc, '2025-03-31', 1400.00, 1250.00, 1200.00);


-- ============================================================================
-- 7. BILLS AND BILL PAYMENT HISTORY
-- ============================================================================

-- Bills for Olivia Financial (5 bills)
INSERT INTO bills (user_id, account_id, company_name, service_name, amount, billing_frequency, next_due_date, last_paid_date, status, category_id, auto_pay_enabled) VALUES
(@olivia_id, @olivia_checking_acc, 'Electricity Board', 'Monthly Power Bill', 85.00, 'monthly', '2025-08-10', '2025-07-10', 'upcoming', @utilities_id, TRUE),
(@olivia_id, @olivia_credit_acc, 'Credit Card Company', 'Rewards Card Payment', 150.00, 'monthly', '2025-08-05', '2025-07-05', 'upcoming', @others_id, TRUE),
(@olivia_id, @olivia_checking_acc, 'Internet Solutions', 'Home Internet', 60.00, 'monthly', '2025-08-15', '2025-07-15', 'upcoming', @utilities_id, FALSE),
(@olivia_id, @olivia_checking_acc, 'Netflix Inc.', 'Streaming Subscription', 15.99, 'monthly', '2025-08-20', '2025-07-20', 'upcoming', @entertainment_id, TRUE),
(@olivia_id, @olivia_checking_acc, 'Gym Plus', 'Fitness Membership', 45.00, 'monthly', '2025-08-25', '2025-07-25', 'upcoming', @healthcare_id, FALSE);

-- Bill Payment History for Olivia (Example for Electricity Bill)
INSERT INTO bill_payment_history (bill_id, transaction_id, payment_date, amount_paid, payment_method, status) VALUES
((SELECT id FROM bills WHERE user_id = @olivia_id AND service_name = 'Monthly Power Bill'), (SELECT id FROM transactions WHERE user_id = @olivia_id AND description = 'Electricity bill' AND transaction_date = '2025-02-07'), '2025-02-07', 80.00, 'bank_transfer', 'successful'),
((SELECT id FROM bills WHERE user_id = @olivia_id AND service_name = 'Monthly Power Bill'), NULL, '2025-03-07', 85.00, 'bank_transfer', 'successful'),
((SELECT id FROM bills WHERE user_id = @olivia_id AND service_name = 'Monthly Power Bill'), NULL, '2025-04-07', 85.00, 'bank_transfer', 'successful'),
((SELECT id FROM bills WHERE user_id = @olivia_id AND service_name = 'Monthly Power Bill'), NULL, '2025-05-07', 85.00, 'bank_transfer', 'successful'),
((SELECT id FROM bills WHERE user_id = @olivia_id AND service_name = 'Monthly Power Bill'), NULL, '2025-06-07', 85.00, 'bank_transfer', 'successful'),
((SELECT id FROM bills WHERE user_id = @olivia_id AND service_name = 'Monthly Power Bill'), NULL, '2025-07-07', 85.00, 'bank_transfer', 'successful');


-- Bills for David Investor (5 bills)
INSERT INTO bills (user_id, account_id, company_name, service_name, amount, billing_frequency, next_due_date, last_paid_date, status, category_id, auto_pay_enabled) VALUES
(@david_id, @david_checking_acc, 'Luxury Apartment', 'Rent', 3000.00, 'monthly', '2025-08-01', '2025-07-01', 'upcoming', @housing_id, TRUE),
(@david_id, @david_credit_acc, 'Amex Platinum', 'Credit Card Bill', 5000.00, 'monthly', '2025-08-10', '2025-07-10', 'upcoming', @others_id, TRUE),
(@david_id, @david_checking_acc, 'Elite Club', 'Annual Membership', 1200.00, 'yearly', '2025-09-01', '2024-09-01', 'active', @entertainment_id, FALSE),
(@david_id, @david_checking_acc, 'Insurance Corp', 'Health Insurance', 300.00, 'monthly', '2025-08-15', '2025-07-15', 'upcoming', @insurance_id, TRUE),
(@david_id, @david_checking_acc, 'Online Investments', 'Advisory Fee', 100.00, 'monthly', '2025-08-20', '2025-07-20', 'upcoming', @others_id, FALSE);

-- Bill Payment History for David (Example for Rent)
INSERT INTO bill_payment_history (bill_id, transaction_id, payment_date, amount_paid, payment_method, status) VALUES
((SELECT id FROM bills WHERE user_id = @david_id AND service_name = 'Rent'), (SELECT id FROM transactions WHERE user_id = @david_id AND description = 'Monthly mortgage payment' AND transaction_date = '2025-02-01'), '2025-02-01', 2500.00, 'bank_transfer', 'successful'),
((SELECT id FROM bills WHERE user_id = @david_id AND service_name = 'Rent'), NULL, '2025-03-01', 3000.00, 'bank_transfer', 'successful'),
((SELECT id FROM bills WHERE user_id = @david_id AND service_name = 'Rent'), NULL, '2025-04-01', 3000.00, 'bank_transfer', 'successful'),
((SELECT id FROM bills WHERE user_id = @david_id AND service_name = 'Rent'), NULL, '2025-05-01', 3000.00, 'bank_transfer', 'successful'),
((SELECT id FROM bills WHERE user_id = @david_id AND service_name = 'Rent'), NULL, '2025-06-01', 3000.00, 'bank_transfer', 'successful'),
((SELECT id FROM bills WHERE user_id = @david_id AND service_name = 'Rent'), NULL, '2025-07-01', 3000.00, 'bank_transfer', 'successful');


-- Bills for Sophia Budget (5 bills)
INSERT INTO bills (user_id, account_id, company_name, service_name, amount, billing_frequency, next_due_date, last_paid_date, status, category_id, auto_pay_enabled) VALUES
(@sophia_id, @sophia_checking_acc, 'Mobile Co.', 'Phone Plan', 25.00, 'monthly', '2025-08-03', '2025-07-03', 'upcoming', @utilities_id, TRUE),
(@sophia_id, @sophia_credit_acc, 'Credit Union', 'Mastercard Bill', 50.00, 'monthly', '2025-08-08', '2025-07-08', 'upcoming', @others_id, FALSE),
(@sophia_id, @sophia_checking_acc, 'Streaming World', 'Movie Subscription', 10.00, 'monthly', '2025-08-12', '2025-07-12', 'upcoming', @entertainment_id, TRUE),
(@sophia_id, @sophia_checking_acc, 'Water Works', 'Water Bill', 30.00, 'monthly', '2025-08-18', '2025-07-18', 'upcoming', @utilities_id, FALSE),
(@sophia_id, @sophia_checking_acc, 'Transit Authority', 'Monthly Pass', 70.00, 'monthly', '2025-08-22', '2025-07-22', 'upcoming', @transportation_id, TRUE);

-- Bill Payment History for Sophia (Example for Phone Bill)
INSERT INTO bill_payment_history (bill_id, transaction_id, payment_date, amount_paid, payment_method, status) VALUES
((SELECT id FROM bills WHERE user_id = @sophia_id AND service_name = 'Phone Plan'), (SELECT id FROM transactions WHERE user_id = @sophia_id AND description = 'Monthly mobile plan' AND transaction_date = '2025-06-12'), '2025-06-12', 25.00, 'bank_transfer', 'successful'),
((SELECT id FROM bills WHERE user_id = @sophia_id AND service_name = 'Phone Plan'), NULL, '2025-07-03', 25.00, 'bank_transfer', 'successful');


-- ============================================================================
-- 8. GOALS AND CONTRIBUTIONS
-- ============================================================================

-- Savings Goals for Olivia Financial (3 goals)
INSERT INTO savings_goals (user_id, goal_name, target_amount, current_amount, target_date, goal_type, priority, is_active, automatic_contribution_enabled, monthly_contribution_amount, linked_account_id) VALUES
(@olivia_id, 'New Car Down Payment', 10000.00, 3500.00, '2026-06-30', 'car', 'high', TRUE, TRUE, 200.00, @olivia_savings_acc),
(@olivia_id, 'Vacation Fund', 2000.00, 800.00, '2025-12-31', 'vacation', 'medium', TRUE, TRUE, 50.00, @olivia_savings_acc),
(@olivia_id, 'Emergency Fund', 5000.00, 2000.00, NULL, 'emergency_fund', 'high', TRUE, TRUE, 100.00, @olivia_savings_acc);

-- Goal Contributions for Olivia (New Car Down Payment)
INSERT INTO goal_contributions (goal_id, transaction_id, contribution_amount, contribution_date, contribution_type) VALUES
((SELECT id FROM savings_goals WHERE user_id = @olivia_id AND goal_name = 'New Car Down Payment'), NULL, 200.00, '2025-01-10', 'automatic'),
((SELECT id FROM savings_goals WHERE user_id = @olivia_id AND goal_name = 'New Car Down Payment'), NULL, 200.00, '2025-02-10', 'automatic'),
((SELECT id FROM savings_goals WHERE user_id = @olivia_id AND goal_name = 'New Car Down Payment'), NULL, 200.00, '2025-03-10', 'automatic'),
((SELECT id FROM savings_goals WHERE user_id = @olivia_id AND goal_name = 'New Car Down Payment'), NULL, 200.00, '2025-04-10', 'automatic'),
((SELECT id FROM savings_goals WHERE user_id = @olivia_id AND goal_name = 'New Car Down Payment'), NULL, 200.00, '2025-05-10', 'automatic'),
((SELECT id FROM savings_goals WHERE user_id = @olivia_id AND goal_name = 'New Car Down Payment'), NULL, 200.00, '2025-06-10', 'automatic'),
((SELECT id FROM savings_goals WHERE user_id = @olivia_id AND goal_name = 'New Car Down Payment'), NULL, 200.00, '2025-07-10', 'automatic');


-- Savings Goals for David Investor (2 goals)
INSERT INTO savings_goals (user_id, goal_name, target_amount, current_amount, target_date, goal_type, priority, is_active, automatic_contribution_enabled, monthly_contribution_amount, linked_account_id) VALUES
(@david_id, 'Retirement Fund Boost', 50000.00, 15000.00, '2027-12-31', 'retirement', 'high', TRUE, TRUE, 1000.00, @david_invest_acc),
(@david_id, 'Luxury Travel', 10000.00, 2000.00, '2026-03-31', 'vacation', 'medium', TRUE, FALSE, 0.00, NULL);

-- Goal Contributions for David (Retirement Fund Boost)
INSERT INTO goal_contributions (goal_id, transaction_id, contribution_amount, contribution_date, contribution_type) VALUES
((SELECT id FROM savings_goals WHERE user_id = @david_id AND goal_name = 'Retirement Fund Boost'), NULL, 1000.00, '2025-01-05', 'automatic'),
((SELECT id FROM savings_goals WHERE user_id = @david_id AND goal_name = 'Retirement Fund Boost'), NULL, 1000.00, '2025-02-05', 'automatic'),
((SELECT id FROM savings_goals WHERE user_id = @david_id AND goal_name = 'Retirement Fund Boost'), NULL, 1000.00, '2025-03-05', 'automatic'),
((SELECT id FROM savings_goals WHERE user_id = @david_id AND goal_name = 'Retirement Fund Boost'), NULL, 1000.00, '2025-04-05', 'automatic'),
((SELECT id FROM savings_goals WHERE user_id = @david_id AND goal_name = 'Retirement Fund Boost'), NULL, 1000.00, '2025-05-05', 'automatic'),
((SELECT id FROM savings_goals WHERE user_id = @david_id AND goal_name = 'Retirement Fund Boost'), NULL, 1000.00, '2025-06-05', 'automatic'),
((SELECT id FROM savings_goals WHERE user_id = @david_id AND goal_name = 'Retirement Fund Boost'), NULL, 1000.00, '2025-07-05', 'automatic');


-- Savings Goals for Sophia Budget (2 goals)
INSERT INTO savings_goals (user_id, goal_name, target_amount, current_amount, target_date, goal_type, priority, is_active, automatic_contribution_enabled, monthly_contribution_amount, linked_account_id) VALUES
(@sophia_id, 'Emergency Savings', 2000.00, 1200.00, '2025-10-31', 'emergency_fund', 'high', TRUE, TRUE, 50.00, @sophia_savings_acc),
(@sophia_id, 'Debt Repayment', 1500.00, 700.00, '2026-04-30', 'custom', 'high', TRUE, TRUE, 100.00, NULL);

-- Goal Contributions for Sophia (Emergency Savings)
INSERT INTO goal_contributions (goal_id, transaction_id, contribution_amount, contribution_date, contribution_type) VALUES
((SELECT id FROM savings_goals WHERE user_id = @sophia_id AND goal_name = 'Emergency Savings'), NULL, 50.00, '2025-01-25', 'automatic'),
((SELECT id FROM savings_goals WHERE user_id = @sophia_id AND goal_name = 'Emergency Savings'), NULL, 50.00, '2025-02-25', 'automatic'),
((SELECT id FROM savings_goals WHERE user_id = @sophia_id AND goal_name = 'Emergency Savings'), NULL, 50.00, '2025-03-25', 'automatic'),
((SELECT id FROM savings_goals WHERE user_id = @sophia_id AND goal_name = 'Emergency Savings'), NULL, 50.00, '2025-04-25', 'automatic'),
((SELECT id FROM savings_goals WHERE user_id = @sophia_id AND goal_name = 'Emergency Savings'), NULL, 50.00, '2025-05-25', 'automatic'),
((SELECT id FROM savings_goals WHERE user_id = @sophia_id AND goal_name = 'Emergency Savings'), NULL, 50.00, '2025-06-25', 'automatic'),
((SELECT id FROM savings_goals WHERE user_id = @sophia_id AND goal_name = 'Emergency Savings'), NULL, 50.00, '2025-07-25', 'automatic');


-- ============================================================================
-- 9. EXPENSE BUDGETS
-- ============================================================================

-- Expense Budgets for Olivia Financial (Monthly)
INSERT INTO expense_budgets (user_id, category_id, budget_period, budget_year, budget_month, budget_amount, spent_amount, is_active) VALUES
(@olivia_id, @food_id, 'monthly', 2025, 7, 300.00, 150.00, TRUE),
(@olivia_id, @transportation_id, 'monthly', 2025, 7, 150.00, 75.00, TRUE),
(@olivia_id, @entertainment_id, 'monthly', 2025, 7, 100.00, 50.00, TRUE);

-- Expense Budgets for David Investor (Monthly)
INSERT INTO expense_budgets (user_id, category_id, budget_period, budget_year, budget_month, budget_amount, spent_amount, is_active) VALUES
(@david_id, @food_id, 'monthly', 2025, 7, 500.00, 350.00, TRUE),
(@david_id, @transportation_id, 'monthly', 2025, 7, 400.00, 200.00, TRUE),
(@david_id, @shopping_id, 'monthly', 2025, 7, 1000.00, 600.00, TRUE);

-- Expense Budgets for Sophia Budget (Monthly)
INSERT INTO expense_budgets (user_id, category_id, budget_period, budget_year, budget_month, budget_amount, spent_amount, is_active) VALUES
(@sophia_id, @food_id, 'monthly', 2025, 7, 200.00, 120.00, TRUE),
(@sophia_id, @utilities_id, 'monthly', 2025, 7, 150.00, 90.00, TRUE),
(@sophia_id, @transportation_id, 'monthly', 2025, 7, 50.00, 30.00, TRUE);


-- ============================================================================
-- 10. EXPENSE GOALS
-- ============================================================================

-- Expense Goals for Olivia Financial (Quarterly)
INSERT INTO expense_goals (user_id, category_id, goal_period, target_amount, current_spent, goal_start_date, goal_end_date, is_active) VALUES
(@olivia_id, @entertainment_id, 'quarterly', 300.00, 120.00, '2025-07-01', '2025-09-30', TRUE),
(@olivia_id, @shopping_id, 'quarterly', 500.00, 200.00, '2025-07-01', '2025-09-30', TRUE);

-- Expense Goals for Sophia Budget (Monthly)
INSERT INTO expense_goals (user_id, category_id, goal_period, target_amount, current_spent, goal_start_date, goal_end_date, is_active) VALUES
(@sophia_id, @food_id, 'monthly', 200.00, 120.00, '2025-07-01', '2025-07-31', TRUE),
(@sophia_id, @entertainment_id, 'monthly', 50.00, 20.00, '2025-07-01', '2025-07-31', TRUE);


-- ============================================================================
-- 11. USER NOTIFICATIONS
-- ============================================================================

-- Notifications for Olivia Financial
INSERT INTO user_notifications (user_id, notification_type, title, message, related_entity_type, related_entity_id, priority, is_read, expires_at) VALUES
(@olivia_id, 'bill_due', 'Electricity Bill Due Soon', 'Your Electricity bill of $85.00 is due on 2025-08-10.', 'bill', (SELECT id FROM bills WHERE user_id = @olivia_id AND service_name = 'Monthly Power Bill'), 'high', FALSE, '2025-08-11 00:00:00'),
(@olivia_id, 'goal_milestone', 'Car Savings Progress', 'You have reached 35% of your New Car Down Payment goal!', 'goal', (SELECT id FROM savings_goals WHERE user_id = @olivia_id AND goal_name = 'New Car Down Payment'), 'medium', FALSE, '2025-08-30 00:00:00'),
(@olivia_id, 'budget_exceeded', 'Entertainment Budget Warning', 'You are close to exceeding your Entertainment budget for July.', 'budget', (SELECT id FROM expense_budgets WHERE user_id = @olivia_id AND category_id = @entertainment_id AND budget_month = 7), 'medium', FALSE, '2025-07-31 00:00:00');

-- Notifications for David Investor
INSERT INTO user_notifications (user_id, notification_type, title, message, related_entity_type, related_entity_id, priority, is_read, expires_at) VALUES
(@david_id, 'security_alert', 'New Device Login', 'A new device logged into your account.', NULL, NULL, 'high', FALSE, '2025-08-01 00:00:00'),
(@david_id, 'transaction_alert', 'Large Outgoing Transaction', 'A transaction of $3000.00 to Private Jet Charter was completed.', 'transaction', (SELECT id FROM transactions WHERE user_id = @david_id AND description = 'Urgent business travel' AND transaction_date = '2025-07-10'), 'medium', FALSE, '2025-07-31 00:00:00');

-- Notifications for Sophia Budget
INSERT INTO user_notifications (user_id, notification_type, title, message, related_entity_type, related_entity_id, priority, is_read, expires_at) VALUES
(@sophia_id, 'bill_due', 'Phone Bill Due Soon', 'Your Phone Bill of €25.00 is due on 2025-08-03.', 'bill', (SELECT id FROM bills WHERE user_id = @sophia_id AND service_name = 'Phone Plan'), 'high', FALSE, '2025-08-04 00:00:00'),
(@sophia_id, 'low_balance', 'Checking Account Low Balance', 'Your checking account balance is below your set threshold.', 'account', @sophia_checking_acc, 'high', FALSE, '2025-07-31 00:00:00');


-- ============================================================================
-- 12. CLEAN UP HELPER VARIABLES
-- ============================================================================

SET @olivia_id = NULL;
SET @david_id = NULL;
SET @sophia_id = NULL;
SET @olivia_savings_acc = NULL;
SET @olivia_checking_acc = NULL;
SET @olivia_credit_acc = NULL;
SET @olivia_invest_acc = NULL;
SET @david_checking_acc = NULL;
SET @david_invest_acc = NULL;
SET @david_credit_acc = NULL;
SET @david_business_acc = NULL;
SET @sophia_checking_acc = NULL;
SET @sophia_savings_acc = NULL;
SET @sophia_credit_acc = NULL;
SET @housing_id = NULL;
SET @food_id = NULL;
SET @transportation_id = NULL;
SET @entertainment_id = NULL;
SET @shopping_id = NULL;
SET @healthcare_id = NULL;
SET @education_id = NULL;
SET @utilities_id = NULL;
SET @insurance_id = NULL;
SET @others_id = NULL;

-- ============================================================================
-- DATA INSERTION COMPLETE
-- ============================================================================
select * from users;
update users set password_hash = "$2b$12$KF6d0ShQ6Yz1NqVQ5AWdMO4.p0oRDhkLhb3Ntn0mCA0uoF.OG6RDW";