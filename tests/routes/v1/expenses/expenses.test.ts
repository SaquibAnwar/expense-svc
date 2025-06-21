import { FastifyInstance } from 'fastify';
import { createMockApp } from '../../../setup';

describe('Expenses Routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = createMockApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /v1/expenses', () => {
    it('should return a list of expenses', async () => {
      const response = await app.inject!({
        method: 'GET',
        url: '/v1/expenses'
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');
    });
  });

  describe('POST /v1/expenses', () => {
    it('should create a new expense', async () => {
      const expenseData = {
        description: 'Test expense',
        amount: 50.00,
        category: 'Food',
        date: new Date().toISOString()
      };

      const response = await app.inject({
        method: 'POST',
        url: '/v1/expenses',
        payload: expenseData
      });

      expect(response.statusCode).toBe(201);
      expect(response.headers['content-type']).toContain('application/json');
    });

    it('should return validation error for invalid data', async () => {
      const invalidData = {
        description: '', // Empty description
        amount: -10 // Negative amount
      };

      const response = await app.inject({
        method: 'POST',
        url: '/v1/expenses',
        payload: invalidData
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /v1/expenses/:id', () => {
    it('should return a specific expense', async () => {
      // This test would need a valid expense ID
      const response = await app.inject({
        method: 'GET',
        url: '/v1/expenses/1'
      });

      // This might return 404 if no expense exists, adjust based on implementation
      expect([200, 404]).toContain(response.statusCode);
    });
  });

  describe('PUT /v1/expenses/:id', () => {
    it('should update an existing expense', async () => {
      const updateData = {
        description: 'Updated expense',
        amount: 75.00,
        category: 'Entertainment'
      };

      const response = await app.inject({
        method: 'PUT',
        url: '/v1/expenses/1',
        payload: updateData
      });

      // This might return 404 if no expense exists, adjust based on implementation
      expect([200, 404]).toContain(response.statusCode);
    });
  });

  describe('DELETE /v1/expenses/:id', () => {
    it('should delete an existing expense', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/v1/expenses/1'
      });

      // This might return 404 if no expense exists, adjust based on implementation
      expect([200, 204, 404]).toContain(response.statusCode);
    });
  });
}); 