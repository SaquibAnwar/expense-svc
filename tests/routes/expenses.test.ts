import { FastifyInstance } from 'fastify';
import createApp from '../../src/app';

// Mock the entire prisma client
jest.mock('../../src/app', () => ({
  prisma: {
    expense: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    }
  }
}));

// Mock middleware
jest.mock('../../src/utils/middleware', () => ({
  authenticate: jest.fn().mockImplementation((req: any, reply: any) => {
    req.user = { id: 1, email: 'test@example.com', provider: 'local' };
  }),
  authHeaderSchema: {
    type: 'object',
    properties: {
      authorization: { type: 'string' }
    }
  }
}));

describe('Expense Routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await createApp();
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  describe('GET /api/v1/expenses', () => {
    it('should return user expenses', async () => {
      const mockExpenses = [
        {
          id: 1,
          title: 'Test Expense',
          amount: 100.50,
          paidAt: new Date(),
          userId: 1
        }
      ];

      const { prisma } = require('../../src/app');
      prisma.expense.findMany.mockResolvedValue(mockExpenses);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/expenses',
        headers: {
          authorization: 'Bearer valid-token'
        }
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.payload)).toEqual(mockExpenses);
      expect(prisma.expense.findMany).toHaveBeenCalledWith({
        where: { userId: 1 },
        orderBy: { id: 'desc' }
      });
    });

    it('should handle database errors', async () => {
      const { prisma } = require('../../src/app');
      prisma.expense.findMany.mockRejectedValue(new Error('Database error'));

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/expenses',
        headers: {
          authorization: 'Bearer valid-token'
        }
      });

      expect(response.statusCode).toBe(500);
      const payload = JSON.parse(response.payload);
      expect(payload.message).toBe('Failed to fetch expenses');
    });
  });

  describe('GET /api/v1/expenses/:id', () => {
    it('should return expense by id', async () => {
      const mockExpense = {
        id: 1,
        title: 'Test Expense',
        amount: 100.50,
        paidAt: new Date(),
        userId: 1
      };

      const { prisma } = require('../../src/app');
      prisma.expense.findFirst.mockResolvedValue(mockExpense);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/expenses/1',
        headers: {
          authorization: 'Bearer valid-token'
        }
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.payload)).toEqual(mockExpense);
      expect(prisma.expense.findFirst).toHaveBeenCalledWith({
        where: { id: 1, userId: 1 }
      });
    });

    it('should return 404 when expense not found', async () => {
      const { prisma } = require('../../src/app');
      prisma.expense.findFirst.mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/expenses/999',
        headers: {
          authorization: 'Bearer valid-token'
        }
      });

      expect(response.statusCode).toBe(404);
      const payload = JSON.parse(response.payload);
      expect(payload.message).toBe('Expense not found');
    });

    it('should return 400 for invalid expense id', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/expenses/invalid',
        headers: {
          authorization: 'Bearer valid-token'
        }
      });

      expect(response.statusCode).toBe(400);
      const payload = JSON.parse(response.payload);
      expect(payload.message).toBe('Invalid expense ID');
    });
  });

  describe('POST /api/v1/expenses', () => {
    it('should create new expense', async () => {
      const newExpense = {
        title: 'New Expense',
        amount: 150.75
      };

      const createdExpense = {
        id: 1,
        ...newExpense,
        paidAt: new Date(),
        userId: 1
      };

      const { prisma } = require('../../src/app');
      prisma.expense.create.mockResolvedValue(createdExpense);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/expenses',
        headers: {
          authorization: 'Bearer valid-token',
          'content-type': 'application/json'
        },
        payload: newExpense
      });

      expect(response.statusCode).toBe(201);
      expect(JSON.parse(response.payload)).toEqual(createdExpense);
      expect(prisma.expense.create).toHaveBeenCalledWith({
        data: {
          title: 'New Expense',
          amount: 150.75,
          userId: 1
        }
      });
    });

    it('should handle database errors', async () => {
      const { prisma } = require('../../src/app');
      prisma.expense.create.mockRejectedValue(new Error('Database error'));

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/expenses',
        headers: {
          authorization: 'Bearer valid-token',
          'content-type': 'application/json'
        },
        payload: {
          title: 'Test Expense',
          amount: 100.50
        }
      });

      expect(response.statusCode).toBe(500);
      const payload = JSON.parse(response.payload);
      expect(payload.message).toBe('Failed to create expense');
    });
  });

  describe('PATCH /api/v1/expenses/:id', () => {
    it('should update expense', async () => {
      const updateData = {
        title: 'Updated Expense',
        amount: 200.00
      };

      const updatedExpense = {
        id: 1,
        ...updateData,
        paidAt: new Date(),
        userId: 1
      };

      const { prisma } = require('../../src/app');
      prisma.expense.findFirst.mockResolvedValue({ id: 1, userId: 1 });
      prisma.expense.update.mockResolvedValue(updatedExpense);

      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/expenses/1',
        headers: {
          authorization: 'Bearer valid-token',
          'content-type': 'application/json'
        },
        payload: updateData
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.payload)).toEqual(updatedExpense);
    });

    it('should return 404 when expense not found or not owned by user', async () => {
      const { prisma } = require('../../src/app');
      prisma.expense.findFirst.mockResolvedValue(null);

      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/expenses/999',
        headers: {
          authorization: 'Bearer valid-token',
          'content-type': 'application/json'
        },
        payload: {
          title: 'Updated Expense'
        }
      });

      expect(response.statusCode).toBe(404);
      const payload = JSON.parse(response.payload);
      expect(payload.message).toBe('Expense not found');
    });
  });

  describe('DELETE /api/v1/expenses/:id', () => {
    it('should delete expense', async () => {
      const deletedExpense = {
        id: 1,
        title: 'Deleted Expense',
        amount: 100.50,
        paidAt: new Date(),
        userId: 1
      };

      const { prisma } = require('../../src/app');
      prisma.expense.findFirst.mockResolvedValue({ id: 1, userId: 1 });
      prisma.expense.delete.mockResolvedValue(deletedExpense);

      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/expenses/1',
        headers: {
          authorization: 'Bearer valid-token'
        }
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.payload)).toEqual(deletedExpense);
    });

    it('should return 404 when expense not found', async () => {
      const { prisma } = require('../../src/app');
      prisma.expense.findFirst.mockResolvedValue(null);

      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/expenses/999',
        headers: {
          authorization: 'Bearer valid-token'
        }
      });

      expect(response.statusCode).toBe(404);
      const payload = JSON.parse(response.payload);
      expect(payload.message).toBe('Expense not found');
    });
  });
}); 