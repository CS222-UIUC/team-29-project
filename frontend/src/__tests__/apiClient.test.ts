import { apiClient } from '../utils/apiClient';
import { getSession } from 'next-auth/react';

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  getSession: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

describe('apiClient', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.resetAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ data: 'test' }),
    });
  });

  test('should call fetch with the correct URL', async () => {
    // Setup mock session without token
    (getSession as jest.Mock).mockResolvedValue(null);
    
    // Call apiClient
    await apiClient('/api/test');
    
    // Verify fetch was called with the right URL
    expect(global.fetch).toHaveBeenCalledWith('/api/test', expect.any(Object));
  });

  test('should add authorization header when session token is available', async () => {
    // Setup mock session with token
    (getSession as jest.Mock).mockResolvedValue({
      accessToken: 'test-token',
    });
    
    // Call apiClient
    await apiClient('/api/test');
    
    // Verify fetch was called with authorization header
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/test',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Authorization': 'Bearer test-token',
        }),
      })
    );
  });

  test('should not add authorization header when session token is not available', async () => {
    // Setup mock session without token
    (getSession as jest.Mock).mockResolvedValue({
      user: { name: 'Test User' },
      // No accessToken
    });
    
    // Call apiClient
    await apiClient('/api/test');
    
    // Verify fetch was called without authorization header
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/test',
      expect.objectContaining({
        headers: expect.not.objectContaining({
          'Authorization': expect.any(String),
        }),
      })
    );
  });

  test('should merge custom headers with default headers', async () => {
    // Setup mock session with token
    (getSession as jest.Mock).mockResolvedValue({
      accessToken: 'test-token',
    });
    
    // Call apiClient with custom header
    await apiClient('/api/test', {
      headers: {
        'Custom-Header': 'custom-value',
      },
    });
    
    // Verify fetch was called with both headers
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/test',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Authorization': 'Bearer test-token',
          'Content-Type': 'application/json',
          'Custom-Header': 'custom-value',
        }),
      })
    );
  });

  test('should pass through request options', async () => {
    // Setup mock session with token
    (getSession as jest.Mock).mockResolvedValue({
      accessToken: 'test-token',
    });
    
    // Call apiClient with custom options
    await apiClient('/api/test', {
      method: 'POST',
      body: JSON.stringify({ test: 'data' }),
    });
    
    // Verify fetch was called with all options
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/test',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ test: 'data' }),
        headers: expect.objectContaining({
          'Authorization': 'Bearer test-token',
          'Content-Type': 'application/json',
        }),
      })
    );
  });

  test('should handle relative and absolute URLs correctly', async () => {
    // Setup mock session
    (getSession as jest.Mock).mockResolvedValue(null);
    
    // Test with relative URL (starting with /)
    await apiClient('/api/test');
    expect(global.fetch).toHaveBeenCalledWith('/api/test', expect.any(Object));
    
    // Reset mock
    jest.clearAllMocks();
    
    // Test with relative URL (not starting with /)
    await apiClient('api/test');
    expect(global.fetch).toHaveBeenCalledWith('/api/test', expect.any(Object));
  });

  test('should handle fetch errors gracefully', async () => {
    // Setup mock session
    (getSession as jest.Mock).mockResolvedValue(null);
    
    // Setup fetch to throw an error
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
    
    // Call apiClient and expect it to reject with the error
    await expect(apiClient('/api/test')).rejects.toThrow('Network error');
  });

  test('should log authentication errors', async () => {
    // Setup mock session with token
    (getSession as jest.Mock).mockResolvedValue({
      accessToken: 'test-token',
    });
    
    // Setup console.error spy
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    // Setup fetch to return 401 unauthorized
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Unauthorized' }),
    });
    
    // Call apiClient
    const response = await apiClient('/api/test');
    
    // Verify console.error was called for the authentication error
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Authentication error')
    );
    
    // Verify the response is still returned
    expect(response.status).toBe(401);
    
    // Clean up
    consoleSpy.mockRestore();
  });
});