import { PrismaClient } from '@prisma/client';

// Mock Prisma client for testing
jest.mock('@prisma/client');

describe('ExpenseRepository', () => {
  let mockPrisma: jest.Mocked<PrismaClient>;

  beforeEach(() => {
    mockPrisma = {
      expense: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllExpenses', () => {
    it('should return all expenses', async () => {
      // Mock implementation would go here
      const mockExpenses = [
        {
          id: 1,
          description: 'Lunch',
          amount: 15.50,
          category: 'Food',
          date: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrisma.expense.findMany.mockResolvedValue(mockExpenses);

      // Test implementation will be added when repository is implemented
      expect(mockPrisma.expense.findMany).toBeDefined();
    });
  });

  describe('createExpense', () => {
    it('should create a new expense', async () => {
      const newExpense = {
        description: 'Coffee',
        amount: 4.50,
        category: 'Food',
        date: new Date(),
      };

      const createdExpense = {
        id: 1,
        ...newExpense,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.expense.create.mockResolvedValue(createdExpense);

      // Test implementation will be added when repository is implemented
      expect(mockPrisma.expense.create).toBeDefined();
    });
  });

  describe('updateExpense', () => {
    it('should update an existing expense', async () => {
      const updatedExpense = {
        id: 1,
        description: 'Updated lunch',
        amount: 18.00,
        category: 'Food',
        date: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.expense.update.mockResolvedValue(updatedExpense);

      // Test implementation will be added when repository is implemented
      expect(mockPrisma.expense.update).toBeDefined();
    });
  });

  describe('deleteExpense', () => {
    it('should delete an expense', async () => {
      const deletedExpense = {
        id: 1,
        description: 'Lunch',
        amount: 15.50,
        category: 'Food',
        date: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.expense.delete.mockResolvedValue(deletedExpense);

      // Test implementation will be added when repository is implemented
      expect(mockPrisma.expense.delete).toBeDefined();
    });
  });
}); 