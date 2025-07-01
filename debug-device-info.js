/**
 * Debug device info storage issue
 */

import { pool } from './configs/db.config.js';

const debugDeviceInfo = async () => {
    console.log('🔍 Debugging device_info storage...\n');

    try {
        // Check what's actually stored in the database
        console.log('1. Checking stored device_info values...');
        const [sessions] = await pool.execute('SELECT id, device_info, user_id FROM user_sessions ORDER BY id DESC LIMIT 5');
        
        sessions.forEach((session, index) => {
            console.log(`Session ${session.id}:`, {
                raw: session.device_info,
                type: typeof session.device_info,
                length: session.device_info ? session.device_info.length : 0
            });
        });

        // Test JSON stringify with different inputs
        console.log('\n2. Testing JSON.stringify behavior...');
        
        const testObject = { platform: 'Test', browser: 'Debug' };
        console.log('Original object:', testObject);
        console.log('JSON.stringify result:', JSON.stringify(testObject));
        console.log('String concatenation result:', '' + testObject); // This would cause [object Object]
        
        // Test direct database insert to see what happens
        console.log('\n3. Testing direct database insert...');
        
        const testData = {
            platform: 'Direct Test',
            browser: 'Direct Browser'
        };
        
        const jsonString = JSON.stringify(testData);
        console.log('Prepared JSON string:', jsonString);
        
        // Insert directly
        const insertQuery = `
            INSERT INTO user_sessions (
                user_id, session_token, refresh_token, device_info, ip_address, user_agent, expires_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        
        const testExpiry = new Date();
        testExpiry.setHours(testExpiry.getHours() + 1);
        
        const [result] = await pool.execute(insertQuery, [
            5, // test user id
            'debug_token_' + Date.now(),
            'debug_refresh_' + Date.now(),
            jsonString,
            '127.0.0.1',
            'Debug Test',
            testExpiry
        ]);
        
        console.log('✅ Direct insert successful, ID:', result.insertId);
        
        // Retrieve and check
        const [retrieved] = await pool.execute('SELECT device_info FROM user_sessions WHERE id = ?', [result.insertId]);
        console.log('Retrieved device_info:', retrieved[0].device_info);
        
        try {
            const parsed = JSON.parse(retrieved[0].device_info);
            console.log('✅ Successfully parsed:', parsed);
        } catch (parseError) {
            console.log('❌ Parse failed:', parseError.message);
        }
        
        // Cleanup
        await pool.execute('DELETE FROM user_sessions WHERE id = ?', [result.insertId]);
        console.log('✅ Test session cleaned up');

    } catch (error) {
        console.error('❌ Debug failed:', error.message);
        console.error(error.stack);
    } finally {
        await pool.end();
        console.log('🔌 Connection closed');
    }
};

debugDeviceInfo().catch(console.error);
