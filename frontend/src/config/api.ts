import config from './env';

/**
 * API utilities for consistent URL construction and configuration
 */

/**
 * Constructs a full API URL from an endpoint
 * @param endpoint - The API endpoint (e.g., '/auth/login' or 'auth/login')
 * @returns Full API URL
 */
export const buildApiUrl = (endpoint: string): string => {
  // Ensure endpoint starts with /api if not already present
  const apiEndpoint = endpoint.startsWith('/api') ? endpoint : `/api${endpoint}`;
  // Remove trailing slash from base URL if present, then add endpoint
  const baseUrl = config.apiBaseUrl.replace(/\/$/, '');
  return `${baseUrl}${apiEndpoint}`;
};

/**
 * API configuration object
 */
export const apiConfig = {
  baseUrl: config.apiBaseUrl,
  timeout: 30000, // 30 seconds
  retries: 3,
  
  // Common endpoints
  endpoints: {
    auth: {
      login: '/auth/login',
      logout: '/auth/logout',
      refresh: '/auth/refresh',
    },
    admin: {
      dashboard: '/admin/dashboard/stats',
      students: '/admin/students', // GET, POST
      faculty: '/admin/faculty',   // GET, POST
      // NEW READ PATHS
      attendance: '/admin/attendance', 
      results: '/admin/results',
      fees: '/admin/fees',
      library: '/admin/library/catalog',
      // UTILITY/DROPDOWN PATHS
      courses: '/admin/courses',
      departments: '/admin/departments',
      feeCategories: '/admin/fee-categories',
    },
    faculty: {
      dashboard: '/faculty/dashboard/stats',
      assignments: '/faculty/assignments',
      classes: '/faculty/classes',
      attendance: '/faculty/attendance',
      grades: '/faculty/grades',
    },
    student: {
      dashboard: '/student/dashboard/stats',
      fees: {
        current: '/student/fees/current',
        history: '/student/fees/history',
      },
      attendance: '/student/attendance',
      results: '/student/results',
    },
  },
} as const;

export default apiConfig;