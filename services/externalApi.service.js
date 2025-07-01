import { api } from '../configs/axios.config.js';

/**
 * External API service for third-party integrations
 */
class ExternalApiService {
    
    /**
     * Example: Fetch user data from external service
     * @param {string} userId - User ID
     * @returns {Promise} Response data
     */
    async fetchExternalUserData(userId) {
        try {
            const response = await api.get(`/external/users/${userId}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching external user data:', error.message);
            throw error;
        }
    }

    /**
     * Example: Send notification to external service
     * @param {Object} notificationData - Notification payload
     * @returns {Promise} Response data
     */
    async sendNotification(notificationData) {
        try {
            const response = await api.post('/external/notifications', notificationData);
            return response.data;
        } catch (error) {
            console.error('Error sending notification:', error.message);
            throw error;
        }
    }

    /**
     * Example: Validate payment with external payment service
     * @param {Object} paymentData - Payment information
     * @returns {Promise} Validation result
     */
    async validatePayment(paymentData) {
        try {
            const response = await api.post('/external/payments/validate', paymentData);
            return response.data;
        } catch (error) {
            console.error('Error validating payment:', error.message);
            throw error;
        }
    }

    /**
     * Example: Get exchange rates from external API
     * @param {string} baseCurrency - Base currency code
     * @param {string} targetCurrency - Target currency code
     * @returns {Promise} Exchange rate data
     */
    async getExchangeRate(baseCurrency, targetCurrency) {
        try {
            const response = await api.get(`/external/exchange-rates`, {
                params: {
                    base: baseCurrency,
                    target: targetCurrency
                }
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching exchange rate:', error.message);
            throw error;
        }
    }
}

export default new ExternalApiService();
