/**
 * Generate correct password hash for test user
 */

import bcrypt from 'bcrypt';
import passwordService from './services/password.service.js';

const generateTestPasswordHash = async () => {
    const testPassword = 'TestPassword123!';
    
    console.log('🔐 Generating password hash for test user...');
    console.log('Test password:', testPassword);
    
    try {
        // Generate hash using the same service
        const hashedPassword = await passwordService.hashPassword(testPassword);
        console.log('Generated hash:', hashedPassword);
        
        // Verify the hash works
        const isValid = await passwordService.comparePassword(testPassword, hashedPassword);
        console.log('Hash verification:', isValid ? '✅ Valid' : '❌ Invalid');
        
        // Test with bcrypt directly
        const directHash = await bcrypt.hash(testPassword, 12);
        console.log('Direct bcrypt hash:', directHash);
        
        const directVerify = await bcrypt.compare(testPassword, directHash);
        console.log('Direct verification:', directVerify ? '✅ Valid' : '❌ Invalid');
        
        console.log('\n📋 Use this hash in your test file:');
        console.log(hashedPassword);
        
    } catch (error) {
        console.error('❌ Error generating hash:', error.message);
    }
};

generateTestPasswordHash().catch(console.error);
