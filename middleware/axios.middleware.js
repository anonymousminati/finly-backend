/**
 * Middleware to handle Axios and external API errors
 */
export const axiosErrorHandler = (error, req, res, next) => {
    if (error.isAxiosError) {
        console.error('Axios Error:', {
            url: error.config?.url,
            method: error.config?.method,
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data
        });

        // Handle specific Axios errors
        if (error.code === 'ECONNREFUSED') {
            return res.status(503).json({
                message: 'External service unavailable',
                error: 'Connection refused to external API'
            });
        }

        if (error.code === 'ETIMEDOUT') {
            return res.status(504).json({
                message: 'Request timeout',
                error: 'External API request timed out'
            });
        }

        if (error.response) {
            // External API returned an error
            return res.status(error.response.status).json({
                message: 'External API error',
                error: error.response.data || error.response.statusText
            });
        }

        // Network or other Axios error
        return res.status(502).json({
            message: 'External service error',
            error: 'Unable to communicate with external service'
        });
    }

    // Pass non-Axios errors to the next error handler
    next(error);
};

/**
 * Retry mechanism for failed requests
 * @param {Function} apiCall - The API call function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} delay - Delay between retries in milliseconds
 * @returns {Promise} Result of the API call
 */
export const retryApiCall = async (apiCall, maxRetries = 3, delay = 1000) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await apiCall();
        } catch (error) {
            if (attempt === maxRetries) {
                throw error;
            }

            // Only retry on network errors or 5xx server errors
            if (error.isAxiosError && 
                (error.code === 'ECONNREFUSED' || 
                 error.code === 'ETIMEDOUT' || 
                 (error.response && error.response.status >= 500))) {
                
                console.warn(`API call failed (attempt ${attempt}/${maxRetries}). Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2; // Exponential backoff
            } else {
                throw error;
            }
        }
    }
};

export default { axiosErrorHandler, retryApiCall };
