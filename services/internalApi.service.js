import axios from '../configs/axios.config.js';

/**
 * Internal API service for microservice communications
 */
class InternalApiService {
    
    /**
     * Health check for internal services
     * @param {string} serviceName - Name of the service to check
     * @returns {Promise} Health status
     */
    async healthCheck(serviceName) {
        try {
            const response = await axios.get(`/health/${serviceName}`);
            return {
                service: serviceName,
                status: 'healthy',
                timestamp: new Date().toISOString(),
                data: response.data
            };
        } catch (error) {
            console.error(`Health check failed for ${serviceName}:`, error.message);
            return {
                service: serviceName,
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                error: error.message
            };
        }
    }

    /**
     * Fetch data from another microservice
     * @param {string} service - Service name
     * @param {string} endpoint - Endpoint path
     * @param {Object} params - Query parameters
     * @returns {Promise} Service response
     */
    async fetchFromService(service, endpoint, params = {}) {
        try {
            const response = await axios.get(`/${service}${endpoint}`, { params });
            return response.data;
        } catch (error) {
            console.error(`Error fetching from ${service}${endpoint}:`, error.message);
            throw error;
        }
    }

    /**
     * Send data to another microservice
     * @param {string} service - Service name
     * @param {string} endpoint - Endpoint path
     * @param {Object} data - Request body
     * @returns {Promise} Service response
     */
    async sendToService(service, endpoint, data) {
        try {
            const response = await axios.post(`/${service}${endpoint}`, data);
            return response.data;
        } catch (error) {
            console.error(`Error sending to ${service}${endpoint}:`, error.message);
            throw error;
        }
    }

    /**
     * Update data in another microservice
     * @param {string} service - Service name
     * @param {string} endpoint - Endpoint path
     * @param {Object} data - Request body
     * @returns {Promise} Service response
     */
    async updateInService(service, endpoint, data) {
        try {
            const response = await axios.put(`/${service}${endpoint}`, data);
            return response.data;
        } catch (error) {
            console.error(`Error updating in ${service}${endpoint}:`, error.message);
            throw error;
        }
    }
}

export default new InternalApiService();
