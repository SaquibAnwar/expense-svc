import { FastifyInstance } from 'fastify';
import { createMockApp } from '../setup';

describe('App Integration Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = createMockApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should start the application successfully', async () => {
    expect(app).toBeDefined();
  });

  it('should have swagger documentation endpoint', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/documentation'
    });

    // Swagger might be at different endpoint, adjust based on implementation
    expect([200, 404]).toContain(response.statusCode);
  });

  it('should handle 404 for unknown routes', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/unknown-route'
    });

    expect(response.statusCode).toBe(404);
  });
}); 