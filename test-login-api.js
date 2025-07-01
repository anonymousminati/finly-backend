/**
 * Test login API with correct password hash
 */

import { pool } from './configs/db.config.js';
import passwordService from './services/password.service.js';

const testLoginAPI = async () => {
    console.log('🧪 Testing Login API with Password Hash...\n');

    try {
        // First, let's create a test user with the correct hash
        const testPassword = 'TestPassword123!';
        const testEmail = 'test@example.com';
        const hashedPassword = await passwordService.hashPassword(testPassword);
        
        console.log('1. Creating test user...');
        const createUserQuery = `
            INSERT IGNORE INTO users (
                uuid, username, email, password_hash, full_name, status
            ) VALUES (
                UUID(), 'testuser_api', ?, ?, 'Test API User', 'active'
            )
        `;
        
        await pool.execute(createUserQuery, [testEmail, hashedPassword]);
        console.log('✅ Test user created with email:', testEmail);
        console.log('✅ Password hash:', hashedPassword);

        // Test the login endpoint with a direct API call
        console.log('\n2. Testing login endpoint...');
        
        const loginCredentials = {
            email: testEmail,
            password: testPassword
        };

        console.log('Login credentials:', loginCredentials);

        // Make a direct HTTP request to test login
        const response = await fetch('http://localhost:3001/api/users/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(loginCredentials)
        });

        const data = await response.json();
        
        if (response.ok) {
            console.log('✅ Login successful!');
            console.log('👤 User:', data.user.full_name);
            console.log('🔑 Session token:', data.session.token.substring(0, 20) + '...');
            console.log('🔄 Refresh token:', data.session.refreshToken.substring(0, 20) + '...');
            
            return {
                success: true,
                user: data.user,
                session: data.session
            };
        } else {
            console.log('❌ Login failed:', data.message);
            console.log('Response data:', data);
            return { success: false, error: data.message };
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error.stack);
        return { success: false, error: error.message };
    }
};

// Test password comparison directly
const testPasswordComparison = async () => {
    console.log('\n3. Testing password comparison directly...');
    
    try {
        const testPassword = 'TestPassword123!';
        const hash1 = '$2b$12$0dw59MrAjmVILmnWgVpyFOyk7ipHbbcWtQB3WGLynCHzS3JHdfeGq'; // From session-test.js
        const hash2 = await passwordService.hashPassword(testPassword); // Fresh hash
        
        console.log('Testing password:', testPassword);
        console.log('Hash 1 (from session-test.js):', hash1);
        console.log('Hash 2 (fresh):', hash2);
        
        const result1 = await passwordService.comparePassword(testPassword, hash1);
        const result2 = await passwordService.comparePassword(testPassword, hash2);
        
        console.log('Hash 1 comparison:', result1 ? '✅ Valid' : '❌ Invalid');
        console.log('Hash 2 comparison:', result2 ? '✅ Valid' : '❌ Invalid');
        
        return { hash1Valid: result1, hash2Valid: result2 };
        
    } catch (error) {
        console.error('❌ Password comparison test failed:', error.message);
        return { error: error.message };
    }
};

// Run all tests
const runAllTests = async () => {
    console.log('Starting login API tests...\n');
    
    // Test password comparison
    await testPasswordComparison();
    
    // Test login API
    const loginResult = await testLoginAPI();
    
    // Close database connection
    await pool.end();
    
    console.log('\n🏁 Tests completed!');
    return loginResult;
};

runAllTests().catch(console.error);
