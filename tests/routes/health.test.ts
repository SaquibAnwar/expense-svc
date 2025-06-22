import { FastifyInstance } from 'fastify';
import createApp from '../../src/app';

describe('Health Routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await createApp();
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health'
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);
      expect(payload).toHaveProperty('status');
      expect(payload).toHaveProperty('timestamp');
      expect(payload.status).toBe('ok');
    });
  });

  describe('GET /health/ready', () => {
    it('should return readiness status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health/ready'
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);
      expect(payload).toHaveProperty('status');
      expect(payload).toHaveProperty('timestamp');
      expect(payload.status).toBe('ready');
    });
  });
}); 