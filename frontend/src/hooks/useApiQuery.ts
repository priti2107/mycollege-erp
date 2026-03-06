import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { buildApiUrl, apiConfig } from '@/config/api';

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

// Generic fetch function with authentication
const authenticatedFetch = async (endpoint: string, options: RequestInit = {}) => {
  const url = buildApiUrl(endpoint);
  const headers = getAuthHeaders();
  
  console.log(`🚀 API Request: ${endpoint}`, {
    url,
    hasToken: !!localStorage.getItem('token'),
    headers: { ...headers, Authorization: headers.Authorization ? '***' : 'none' }
  });
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });

  console.log(`📡 API Response: ${endpoint}`, {
    status: response.status,
    statusText: response.statusText,
    ok: response.ok
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Request failed' }));
    console.error(`❌ API Error: ${endpoint}`, errorData);
    throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  console.log(`✅ API Success: ${endpoint}`, {
    dataType: typeof data,
    dataKeys: typeof data === 'object' ? Object.keys(data) : 'not_object',
    dataSize: JSON.stringify(data).length
  });
  return data;
};

// Custom hook for GET requests
export const useApiQuery = (endpoint: string, queryKey: string[], options = {}) => {
  return useQuery({
    queryKey,
    queryFn: async () => {
      console.log(`[useApiQuery] Fetching endpoint: ${endpoint}`);
      console.log(`[useApiQuery] Query key:`, queryKey);
      const result = await authenticatedFetch(endpoint);
      console.log(`[useApiQuery] Response from ${endpoint}:`, result);
      return result;
    },
    staleTime: 30 * 1000, // 30 seconds default (can be overridden)
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    retry: 1,
    refetchOnMount: true, // Always refetch when component mounts
    refetchOnWindowFocus: false, // Don't refetch on window focus
    ...options,
  });
};

// Custom hook for POST/PUT/DELETE mutations
export const useApiMutation = (endpoint: string, method: 'POST' | 'PUT' | 'DELETE' = 'POST') => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (params?: any) => {
      // Support both simple data and {url, data} format
      const actualEndpoint = params?.url || endpoint;
      const actualData = params?.data || params;
      
      return authenticatedFetch(actualEndpoint, {
        method,
        body: actualData ? JSON.stringify(actualData) : undefined,
      });
    },
    onSuccess: () => {
      // Invalidate and refetch related queries
      queryClient.invalidateQueries();
    },
  });
};

// Helper function for file uploads
export const useFileUpload = (endpoint: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (formData: FormData) => {
      const token = localStorage.getItem('token');
      const url = buildApiUrl(endpoint);
      return fetch(url, {
        method: 'POST',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: formData,
      }).then(response => {
        if (!response.ok) {
          throw new Error('Upload failed');
        }
        return response.json();
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });
};