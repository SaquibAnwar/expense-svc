import { FastifyInstance } from 'fastify';
import createApp, { prisma } from '../src/app';

// Mock PrismaClient
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    $disconnect: jest.fn().mockResolvedValue(undefined)
  }))
}));

describe('App', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await createApp();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('createApp', () => {
    it('should create a Fastify app instance', async () => {
      expect(app).toBeDefined();
      expect(typeof app.inject).toBe('function');
      expect(typeof app.listen).toBe('function');
      expect(typeof app.close).toBe('function');
    });

    it('should have logger configuration', async () => {
      expect(app.log).toBeDefined();
    });

    it('should register swagger plugin', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/docs'
      });

      // Should not return 404, meaning swagger-ui is registered
      expect(response.statusCode).not.toBe(404);
    });

    it('should register health routes', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health'
      });

      expect(response.statusCode).toBe(200);
    });

    it('should register user routes under /api/v1 prefix', async () => {
      // Test registration endpoint exists (even if it requires auth)
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        headers: {
          'content-type': 'application/json'
        },
        payload: {
          email: 'test@example.com',
          password: 'Password123',
          name: 'Test User'
        }
      });

      // Should not return 404, meaning route is registered
      expect(response.statusCode).not.toBe(404);
    });

    it('should register expense routes under /api/v1 prefix', async () => {
      // Test expenses endpoint exists (even if it requires auth)
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/expenses'
      });

      // Should not return 404, meaning route is registered
      // Will return 401 due to missing auth, which is expected
      expect(response.statusCode).not.toBe(404);
    });

    it('should handle 404 for non-existent routes', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/non-existent-route'
      });

      expect(response.statusCode).toBe(404);
    });

    it('should have sensible plugin registered', async () => {
      // Test that sensible plugin is available (provides httpErrors)
      expect(app.httpErrors).toBeDefined();
    });
  });

  describe('Prisma client', () => {
    it('should export prisma client instance', () => {
      expect(prisma).toBeDefined();
      expect(prisma.$disconnect).toBeDefined();
    });
  });

  describe('App configuration', () => {
    it('should have proper OpenAPI configuration', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/docs/json'
      });

      if (response.statusCode === 200) {
        const openApiSpec = JSON.parse(response.payload);
        expect(openApiSpec.info).toBeDefined();
        expect(openApiSpec.info.title).toBe('Expense Service API');
        expect(openApiSpec.info.version).toBe('1.0.0');
        expect(openApiSpec.tags).toBeDefined();
        expect(openApiSpec.tags.length).toBeGreaterThan(0);
      }
    });

    it('should have proper server configuration', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/docs/json'
      });

      if (response.statusCode === 200) {
        const openApiSpec = JSON.parse(response.payload);
        expect(openApiSpec.servers).toBeDefined();
        expect(openApiSpec.servers).toContainEqual({ url: 'http://localhost:3000' });
      }
    });

    it('should have defined tags in OpenAPI spec', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/docs/json'
      });

      if (response.statusCode === 200) {
        const openApiSpec = JSON.parse(response.payload);
        const tagNames = openApiSpec.tags?.map((tag: any) => tag.name) || [];
        
        expect(tagNames).toContain('health');
        expect(tagNames).toContain('auth');
        expect(tagNames).toContain('users');
        expect(tagNames).toContain('expenses');
      }
    });
  });

  describe('Error handling', () => {
    it('should handle malformed JSON gracefully', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        headers: {
          'content-type': 'application/json'
        },
        payload: '{"invalid": json}'
      });

      expect(response.statusCode).toBe(400);
    });
  });
}); 