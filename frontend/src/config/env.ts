/**
 * Environment configuration for the application
 * All environment variables should be prefixed with VITE_ in Vite
 */

const config = {
  // API Configuration
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001',
  
  // App Configuration
  appName: import.meta.env.VITE_APP_NAME || 'MyCollege ERP',
  appVersion: import.meta.env.VITE_APP_VERSION || '1.0.0',
  
  // Development/Production environment
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
} as const;

export default config;