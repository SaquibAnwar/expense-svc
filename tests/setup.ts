// Global test setup and utilities
import { FastifyInstance } from 'fastify';

// Test environment setup
import { PrismaClient } from '@prisma/client';

// Set test environment variables if not already set
if (!process.env.DATABASE_URL) {
  // Default test database URL (can be overridden by CI)
  process.env.DATABASE_URL = 'postgresql://test_user:test_password@localhost:5432/expense_test_db';
}

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test-jwt-secret-for-testing';
}

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'test';
}

// Global test setup
const prisma = new PrismaClient();

beforeAll(async () => {
  try {
    // Try to connect to the database
    await prisma.$connect();
    // eslint-disable-next-line no-console
    console.log('✅ Database connection established for tests');
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('❌ Failed to connect to test database:', error);
    // eslint-disable-next-line no-console
    console.error('💡 Make sure your test database is running and DATABASE_URL is correct');
    process.exit(1);
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});

// Export for use in individual tests
export { prisma as testPrisma };

// Simple helper functions for test utilities
export const createMockApp = (): FastifyInstance => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockInject = jest.fn().mockImplementation((options: any) => {
    // Mock different responses based on method and URL
    if (options.method === 'POST' && options.url === '/v1/expenses') {
      // Check if payload has valid data
      if (
        options.payload &&
        options.payload.description &&
        options.payload.description.trim() !== '' &&
        options.payload.amount > 0
      ) {
        // Valid POST request
        return Promise.resolve({
          statusCode: 201,
          headers: { 'content-type': 'application/json' },
          payload: JSON.stringify({ id: 1, ...options.payload }),
        });
      } else {
        // Invalid POST request (empty description, negative amount, etc.)
        return Promise.resolve({
          statusCode: 400,
          headers: { 'content-type': 'application/json' },
          payload: JSON.stringify({ error: 'Validation error' }),
        });
      }
    } else if (options.url === '/v1/expenses') {
      // GET request
      return Promise.resolve({
        statusCode: 200,
        headers: { 'content-type': 'application/json' },
        payload: JSON.stringify([]),
      });
    } else {
      // Unknown route
      return Promise.resolve({
        statusCode: 404,
        headers: { 'content-type': 'application/json' },
        payload: JSON.stringify({ error: 'Not found' }),
      });
    }
  });

  return {
    inject: mockInject,
    close: jest.fn().mockResolvedValue(undefined),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
};
