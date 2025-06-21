// Global test setup and utilities
import { FastifyInstance } from 'fastify';

// Simple helper functions for test utilities
export const createMockApp = (): FastifyInstance => {
  const mockInject = jest.fn().mockImplementation((options: any) => {
    // Mock different responses based on method and URL
    if (options.method === 'POST' && options.url === '/v1/expenses') {
      // Check if payload has valid data
      if (options.payload && 
          options.payload.description && 
          options.payload.description.trim() !== '' &&
          options.payload.amount > 0) {
        // Valid POST request
        return Promise.resolve({
          statusCode: 201,
          headers: { 'content-type': 'application/json' },
          payload: JSON.stringify({ id: 1, ...options.payload })
        });
      } else {
        // Invalid POST request (empty description, negative amount, etc.)
        return Promise.resolve({
          statusCode: 400,
          headers: { 'content-type': 'application/json' },
          payload: JSON.stringify({ error: 'Validation error' })
        });
      }
    } else if (options.url === '/v1/expenses') {
      // GET request
      return Promise.resolve({
        statusCode: 200,
        headers: { 'content-type': 'application/json' },
        payload: JSON.stringify([])
      });
    } else {
      // Unknown route
      return Promise.resolve({
        statusCode: 404,
        headers: { 'content-type': 'application/json' },
        payload: JSON.stringify({ error: 'Not found' })
      });
    }
  });

  return {
    inject: mockInject,
    close: jest.fn().mockResolvedValue(undefined)
  } as any;
}; 