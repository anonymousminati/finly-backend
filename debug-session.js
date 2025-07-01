/**
 * Simple debug test for session functionality
 */

import { pool } from './configs/db.config.js';
import sessionService from './services/session.service.js';
import passwordService from './services/password.service.js';

const debugSessionTest = async () => {
    console.log('🔍 Debug Session Test...\n');

    try {
        // Test 1: Database connection
        console.log('1. Testing database connection...');
        const [rows] = await pool.execute('SELECT 1 as test');
        console.log('✅ Database connected:', rows[0]);

        // Test 2: Check if users table exists
        console.log('\n2. Checking users table...');
        const [userCount] = await pool.execute('SELECT COUNT(*) as count FROM users');
        console.log('✅ Users in database:', userCount[0].count);

        // Test 3: Create test user if needed
        console.log('\n3. Creating test user...');
        const testPassword = 'TestPassword123!';
        const hashedPassword = await passwordService.hashPassword(testPassword);
        
        const insertQuery = `
            INSERT IGNORE INTO users (
                uuid, username, email, password_hash, full_name, status
            ) VALUES (
                UUID(), 'debug_test_user', 'debug@test.com', ?, 'Debug Test User', 'active'
            )
        `;
        
        const [insertResult] = await pool.execute(insertQuery, [hashedPassword]);
        console.log('✅ Test user creation result:', { 
            affectedRows: insertResult.affectedRows,
            insertId: insertResult.insertId 
        });

        // Test 4: Get test user
        console.log('\n4. Getting test user...');
        const [testUsers] = await pool.execute('SELECT * FROM users WHERE email = ?', ['debug@test.com']);
        if (testUsers.length > 0) {
            console.log('✅ Test user found:', {
                id: testUsers[0].id,
                email: testUsers[0].email,
                username: testUsers[0].username
            });

            // Test 5: Generate tokens
            console.log('\n5. Generating session tokens...');
            const sessionToken = sessionService.generateSessionToken();
            const refreshToken = sessionService.generateRefreshToken();
            console.log('✅ Tokens generated:', {
                sessionToken: sessionToken.substring(0, 16) + '...',
                refreshToken: refreshToken.substring(0, 16) + '...'
            });

            // Test 6: Create session
            console.log('\n6. Creating session...');
            const sessionData = {
                userId: testUsers[0].id,
                sessionToken,
                refreshToken,
                ipAddress: '127.0.0.1',
                userAgent: 'Debug-Test/1.0',
                deviceInfo: { platform: 'Test', browser: 'Debug' },
                expiresInHours: 1
            };

            const session = await sessionService.createSession(pool, sessionData);
            console.log('✅ Session created:', {
                id: session.id,
                userId: session.userId,
                expiresAt: session.expiresAt
            });

            // Test 7: Retrieve session
            console.log('\n7. Retrieving session...');
            const retrievedSession = await sessionService.getSessionByToken(pool, sessionToken);
            console.log('✅ Session retrieved:', !!retrievedSession);

            // Test 8: Cleanup
            console.log('\n8. Cleaning up test session...');
            const cleanupResult = await sessionService.invalidateSession(pool, sessionToken);
            console.log('✅ Session cleaned up:', cleanupResult);

        } else {
            console.log('❌ Test user not found');
        }

        console.log('\n🎉 Debug test completed successfully!');

    } catch (error) {
        console.error('❌ Debug test failed:', error.message);
        console.error('Stack trace:', error.stack);
    } finally {
        // Always close the connection
        console.log('\n🔌 Closing database connection...');
        await pool.end();
        console.log('✅ Connection closed');
    }
};

debugSessionTest().catch(console.error);
