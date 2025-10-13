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
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
};

// Custom hook for GET requests
export const useApiQuery = (endpoint: string, queryKey: string[], options = {}) => {
  return useQuery({
    queryKey,
    queryFn: () => authenticatedFetch(endpoint),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    retry: 1,
    ...options,
  });
};

// Custom hook for POST/PUT/DELETE mutations
export const useApiMutation = (endpoint: string, method: 'POST' | 'PUT' | 'DELETE' = 'POST') => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data?: any) => authenticatedFetch(endpoint, {
      method,
      body: data ? JSON.stringify(data) : undefined,
    }),
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