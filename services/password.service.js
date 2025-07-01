import bcrypt from 'bcrypt';

/**
 * Password utility functions for hashing and validation
 */
class PasswordService {
    
    /**
     * Hash a plain text password
     * @param {string} password - Plain text password
     * @returns {Promise<string>} Hashed password
     */
    async hashPassword(password) {
        try {
            const saltRounds = 12; // Higher is more secure but slower
            const hashedPassword = await bcrypt.hash(password, saltRounds);
            return hashedPassword;
        } catch (error) {
            console.error('Error hashing password:', error.message);
            throw new Error('Failed to hash password');
        }
    }

    /**
     * Compare a plain text password with a hashed password
     * @param {string} password - Plain text password
     * @param {string} hashedPassword - Hashed password from database
     * @returns {Promise<boolean>} True if passwords match
     */
    async comparePassword(password, hashedPassword) {
        try {
            const isMatch = await bcrypt.compare(password, hashedPassword);
            return isMatch;
        } catch (error) {
            console.error('Error comparing password:', error.message);
            throw new Error('Failed to compare password');
        }
    }

    /**
     * Validate password strength
     * @param {string} password - Plain text password
     * @returns {Object} Validation result with isValid and errors
     */
    validatePassword(password) {
        const errors = [];
        
        if (!password) {
            errors.push('Password is required');
            return { isValid: false, errors };
        }

        if (password.length < 8) {
            errors.push('Password must be at least 8 characters long');
        }

        if (password.length > 128) {
            errors.push('Password must be less than 128 characters long');
        }

        if (!/[A-Z]/.test(password)) {
            errors.push('Password must contain at least one uppercase letter');
        }

        if (!/[a-z]/.test(password)) {
            errors.push('Password must contain at least one lowercase letter');
        }

        if (!/\d/.test(password)) {
            errors.push('Password must contain at least one number');
        }

        if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>?]/.test(password)) {
            errors.push('Password must contain at least one special character');
        }

        // Check for common weak passwords
        const commonPasswords = [
            'password', '123456', 'password123', 'admin', 'qwerty',
            'letmein', 'welcome', 'monkey', '1234567890', 'password1'
        ];
        
        if (commonPasswords.includes(password.toLowerCase())) {
            errors.push('Password is too common and easily guessable');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate that password and confirmPassword match
     * @param {string} password - Plain text password
     * @param {string} confirmPassword - Plain text confirm password
     * @returns {Object} Validation result
     */
    validatePasswordMatch(password, confirmPassword) {
        if (!password || !confirmPassword) {
            return {
                isValid: false,
                error: 'Both password and confirm password are required'
            };
        }

        if (password !== confirmPassword) {
            return {
                isValid: false,
                error: 'Password and confirm password do not match'
            };
        }

        return {
            isValid: true,
            error: null
        };
    }

    /**
     * Complete password validation (strength + match)
     * @param {string} password - Plain text password
     * @param {string} confirmPassword - Plain text confirm password
     * @returns {Object} Complete validation result
     */
    validatePasswordComplete(password, confirmPassword) {
        // First validate password strength
        const strengthValidation = this.validatePassword(password);
        
        if (!strengthValidation.isValid) {
            return {
                isValid: false,
                errors: strengthValidation.errors
            };
        }

        // Then validate password match
        const matchValidation = this.validatePasswordMatch(password, confirmPassword);
        
        if (!matchValidation.isValid) {
            return {
                isValid: false,
                errors: [matchValidation.error]
            };
        }

        return {
            isValid: true,
            errors: []
        };
    }
}

export default new PasswordService();
