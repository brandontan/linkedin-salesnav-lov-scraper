import axios from 'axios';
import { logger } from './logger.js';

/**
 * Creates a configured axios instance for API requests
 * @param {string} baseURL - The base URL for the API
 * @param {Object} headers - Headers to include in requests
 * @param {number} timeout - Request timeout in milliseconds
 * @returns {Object} Configured axios instance
 */
export const createApiClient = (baseURL, headers = {}, timeout = 30000) => {
  const client = axios.create({
    baseURL,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    timeout,
  });

  // Add request interceptor for logging
  client.interceptors.request.use(
    (config) => {
      logger.debug(`API Request: ${config.method.toUpperCase()} ${config.url}`);
      return config;
    },
    (error) => {
      logger.error('API Request Error:', error);
      return Promise.reject(error);
    }
  );

  // Add response interceptor for logging
  client.interceptors.response.use(
    (response) => {
      logger.debug(`API Response: ${response.status} from ${response.config.url}`);
      return response;
    },
    (error) => {
      if (error.response) {
        logger.error(`API Error: ${error.response.status} from ${error.config.url}`, {
          data: error.response.data,
        });
      } else if (error.request) {
        logger.error('API Error: No response received', { request: error.request });
      } else {
        logger.error('API Error:', error.message);
      }
      return Promise.reject(error);
    }
  );

  return client;
};

// Create pre-configured API clients for our integrations
export const findYEmailClient = () => createApiClient(
  process.env.FINDYEMAIL_API_URL,
  { 'Authorization': `Bearer ${process.env.FINDYEMAIL_API_KEY}` }
);

export const woodpeckerClient = () => createApiClient(
  process.env.WOODPECKER_API_URL,
  { 'Api-Key': process.env.WOODPECKER_API_KEY }
);

export const openAIClient = () => createApiClient(
  'https://api.openai.com/v1',
  { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` }
);
