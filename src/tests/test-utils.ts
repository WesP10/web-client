/**
 * Test utilities and helpers for web-client tests
 * 
 * This file provides utility functions that can be used across test suites
 * for common operations like mocking API calls, user authentication, etc.
 */

/**
 * Mock localStorage for testing
 */
export const setupLocalStorageMock = () => {
  const store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      Object.keys(store).forEach(key => {
        delete store[key];
      });
    }
  };
};

/**
 * Create a mock API response
 */
export const createMockApiResponse = <T>(data: T, status = 200) => {
  return {
    data,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: {},
    config: {}
  };
};

/**
 * Mock authentication token
 */
export const createMockAuthToken = () => {
  return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IlRlc3QgVXNlciIsImlhdCI6MTUxNjIzOTAyMn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
};

/**
 * Create a mock user object
 */
export const createMockUser = (overrides = {}) => {
  return {
    id: '1',
    username: 'testuser',
    email: 'test@example.com',
    role: 'user',
    ...overrides
  };
};

/**
 * Validate that a component renders without errors
 */
export const expectComponentToRender = (element: HTMLElement | null) => {
  if (!element) {
    throw new Error('Component did not render');
  }
  return element;
};

/**
 * Wait for async operations to complete
 */
export const waitForAsync = (ms = 0) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};
