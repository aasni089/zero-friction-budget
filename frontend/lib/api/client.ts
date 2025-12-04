// Base API client for making HTTP requests

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Request deduplication: track in-flight requests
const pendingRequests = new Map<string, Promise<any>>();

// Simple cache for successful responses (30 second TTL for better deduplication)
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}
const responseCache = new Map<string, CacheEntry<any>>();
const CACHE_TTL = 30000; // 30 seconds - reasonable for profile/household data

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate cache key from endpoint and options
 */
function getCacheKey(endpoint: string, options: RequestInit): string {
  const method = options.method || 'GET';
  const body = options.body || '';
  return `${method}:${endpoint}:${body}`;
}

/**
 * Check if request should be retried based on error
 */
function shouldRetry(error: ApiError, attempt: number, maxRetries: number): boolean {
  // Don't retry if we've exhausted attempts
  if (attempt >= maxRetries) return false;

  // Only retry on server errors (5xx) or network errors (status 0)
  // Don't retry client errors (4xx)
  if (error.status >= 400 && error.status < 500) return false;

  return true;
}

/**
 * Calculate exponential backoff delay
 */
function getRetryDelay(attempt: number): number {
  // Exponential backoff: 1s, 2s, 4s
  return Math.min(1000 * Math.pow(2, attempt), 4000);
}

/**
 * Base fetch client with automatic token injection, error handling, retry logic, and deduplication
 */
export async function apiClient<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_URL}${endpoint}`;
  const cacheKey = getCacheKey(endpoint, options);
  const method = options.method || 'GET';

  // Check cache for GET requests
  if (method === 'GET') {
    const cached = responseCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }
  }

  // Check for pending identical request
  const pendingRequest = pendingRequests.get(cacheKey);
  if (pendingRequest) {
    return pendingRequest;
  }

  // Create new request promise
  const requestPromise = executeRequestWithRetry<T>(url, endpoint, options, cacheKey);

  // Store in pending requests
  pendingRequests.set(cacheKey, requestPromise);

  try {
    const result = await requestPromise;

    // If this was a mutation (POST, PUT, PATCH, DELETE), clear the cache
    if (method !== 'GET') {
      responseCache.clear();
    }

    return result;
  } finally {
    // Clean up pending request
    pendingRequests.delete(cacheKey);
  }
}

/**
 * Execute request with retry logic
 */
async function executeRequestWithRetry<T>(
  url: string,
  endpoint: string,
  options: RequestInit,
  cacheKey: string,
  maxRetries: number = 3
): Promise<T> {
  let lastError: ApiError | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await executeSingleRequest<T>(url, options);

      // Cache successful GET requests
      if ((options.method || 'GET') === 'GET') {
        responseCache.set(cacheKey, {
          data: result,
          timestamp: Date.now()
        });
      }

      return result;
    } catch (error) {
      const apiError = error instanceof ApiError
        ? error
        : new ApiError(
          error instanceof Error ? error.message : 'Network error',
          0
        );

      lastError = apiError;

      // Check if we should retry
      if (!shouldRetry(apiError, attempt, maxRetries)) {
        throw apiError;
      }

      // Wait before retrying (exponential backoff)
      if (attempt < maxRetries - 1) {
        const delay = getRetryDelay(attempt);
        console.log(`Request to ${endpoint} failed (attempt ${attempt + 1}/${maxRetries}), retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }

  // If we get here, all retries failed
  throw lastError || new ApiError('Request failed after retries', 0);
}

/**
 * Execute a single request
 */
async function executeSingleRequest<T>(
  url: string,
  options: RequestInit
): Promise<T> {
  // Get token from localStorage (will be set by auth store)
  const token = typeof window !== 'undefined'
    ? localStorage.getItem('auth_token')
    : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle non-JSON responses
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new ApiError(
        'Server returned non-JSON response',
        response.status
      );
    }

    const data = await response.json();

    if (!response.ok) {
      // Handle 401 Unauthorized - Token expired or invalid
      if (response.status === 401 && typeof window !== 'undefined') {
        // Clear auth data
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');

        // Also clear cookie if possible (though usually httpOnly)
        document.cookie = 'auth_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';

        // Redirect to login
        // Use window.location to force a full refresh and clear any app state
        if (!window.location.pathname.startsWith('/login')) {
          window.location.href = `/login?from=${encodeURIComponent(window.location.pathname)}`;
        }
      }

      throw new ApiError(
        data.error || data.message || 'An error occurred',
        response.status,
        data
      );
    }

    // Backend usually returns data wrapped in { success: true, data: ... }
    // But sometimes flat objects (Auth).
    // If it has 'data' property and 'success' is true, return the inner data.
    if (data && typeof data === 'object' && 'success' in data && 'data' in data && data.success === true) {
      return data.data as T;
    }

    return data as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      error instanceof Error ? error.message : 'Network error',
      0
    );
  }
}

/**
 * Helper methods for common HTTP verbs
 */
export const api = {
  get: <T = any>(endpoint: string, options?: RequestInit) =>
    apiClient<T>(endpoint, { ...options, method: 'GET' }),

  post: <T = any>(endpoint: string, data?: any, options?: RequestInit) =>
    apiClient<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),

  patch: <T = any>(endpoint: string, data?: any, options?: RequestInit) =>
    apiClient<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: <T = any>(endpoint: string, data?: any, options?: RequestInit) =>
    apiClient<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: <T = any>(endpoint: string, options?: RequestInit) =>
    apiClient<T>(endpoint, { ...options, method: 'DELETE' }),
};
