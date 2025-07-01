/**
 * Test script for session management functionality
 * Run this script to test session creation, validation, and cleanup
 */

import sessionService from '../services/session.service.js';
import { pool } from '../configs/db.config.js';

const testSessionManagement = async () => {
    console.log('🧪 Testing Session Management...\n');

    try {
        // Test 1: Generate tokens
        console.log('1. Testing token generation...');
        const sessionToken = sessionService.generateSessionToken();
        const refreshToken = sessionService.generateRefreshToken();
        
        console.log('✅ Session token generated:', sessionToken.substring(0, 16) + '...');
        console.log('✅ Refresh token generated:', refreshToken.substring(0, 16) + '...');

        // Test 2: Create session (using test user)
        console.log('\n2. Testing session creation...');
        
        // Get the test user ID from database
        const getUserQuery = 'SELECT id FROM users WHERE email = ?';
        const [userRows] = await pool.execute(getUserQuery, ['test@gmail.com']);
        
        if (userRows.length === 0) {
            throw new Error('Test user not found. Please run createTestUser first.');
        }
        
        const testUserId = userRows[0].id;
        console.log('Using test user ID:', testUserId);
        
        const sessionData = {
            userId: testUserId,
            sessionToken,
            refreshToken,
            ipAddress: '127.0.0.1',
            userAgent: 'Test-Agent/1.0',
            deviceInfo: {
                platform: 'Test Platform',
                browser: 'Test Browser'
            },
            expiresInHours: 1 // 1 hour for testing
        };

        const createdSession = await sessionService.createSession(pool, sessionData);
        console.log('✅ Session created successfully:', {
            id: createdSession.id,
            userId: createdSession.userId,
            expiresAt: createdSession.expiresAt
        });

        // Test 3: Get session by token
        console.log('\n3. Testing session retrieval...');
        const retrievedSession = await sessionService.getSessionByToken(pool, sessionToken);
        
        if (retrievedSession) {
            console.log('✅ Session retrieved successfully:', {
                id: retrievedSession.id,
                user_id: retrievedSession.user_id,
                expires_at: retrievedSession.expires_at
            });
        } else {
            console.log('❌ Failed to retrieve session');
        }

        // Test 4: Update session activity
        console.log('\n4. Testing session activity update...');
        const activityUpdated = await sessionService.updateSessionActivity(pool, sessionToken);
        console.log('✅ Session activity updated:', activityUpdated);

        // Test 5: Get active sessions for user
        console.log('\n5. Testing user active sessions...');
        const activeSessions = await sessionService.getUserActiveSessions(pool, testUserId);
        console.log('✅ Active sessions for user:', activeSessions.length);

        // Test 6: Refresh session
        console.log('\n6. Testing session refresh...');
        const refreshedSession = await sessionService.refreshSession(pool, refreshToken);
        
        if (refreshedSession) {
            console.log('✅ Session refreshed successfully:', {
                newSessionToken: refreshedSession.sessionToken.substring(0, 16) + '...',
                newRefreshToken: refreshedSession.refreshToken.substring(0, 16) + '...',
                expiresAt: refreshedSession.expiresAt
            });

            // Test 7: Invalidate session
            console.log('\n7. Testing session invalidation...');
            const invalidated = await sessionService.invalidateSession(pool, refreshedSession.sessionToken);
            console.log('✅ Session invalidated:', invalidated);
        } else {
            console.log('❌ Failed to refresh session');
        }

        // Test 8: Cleanup expired sessions
        console.log('\n8. Testing expired session cleanup...');
        const cleanedUp = await sessionService.cleanupExpiredSessions(pool);
        console.log('✅ Expired sessions cleaned up:', cleanedUp);

        console.log('\n🎉 All session management tests completed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error.stack);
    }
};

// Helper function to create a test user if needed
const createTestUser = async () => {
    try {
        const query = `
            INSERT IGNORE INTO users (
                uuid, username, email, password_hash, full_name, status
            ) VALUES (
                UUID(), 'testuser', 'test@gmail.com', 
                '$2b$12$0dw59MrAjmVILmnWgVpyFOyk7ipHbbcWtQB3WGLynCHzS3JHdfeGq', 
                'Test User', 'active'
            )
        `;
        await pool.execute(query);
        console.log('✅ Test user created/exists');
    } catch (error) {
        console.error('❌ Failed to create test user:', error.message);
    }
};

// Run tests
const runTests = async () => {
    console.log('Setting up test environment...');
    
    try {
        await createTestUser();
        await testSessionManagement();
        
        // Close database connection
        await pool.end();
        console.log('Tests completed. Database connection closed.');
    } catch (error) {
        console.error('❌ Test suite failed:', error.message);
        console.error(error.stack);
        
        // Ensure connection is closed even on error
        try {
            await pool.end();
        } catch (closeError) {
            console.error('❌ Failed to close connection:', closeError.message);
        }
    }
};

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runTests().catch(console.error);
}

export { testSessionManagement, createTestUser };
