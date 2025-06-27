// Mock Prisma client
const mockPrisma = {
  expense: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => mockPrisma),
}));

jest.mock('../../src/app', () => ({
  prisma: mockPrisma,
}));

import {
  createExpense,
  getExpense,
  updateExpense,
  deleteExpense,
  listExpenses,
} from '../../src/repositories/expenseRepo';

describe('ExpenseRepository', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('createExpense', () => {
    it('should create a new expense', async () => {
      const expenseData = {
        title: 'Test Expense',
        amount: 100.5,
        userId: 1,
      };

      const expectedExpense = {
        id: 1,
        ...expenseData,
        paidAt: new Date(),
      };

      mockPrisma.expense.create.mockResolvedValue(expectedExpense);

      const result = await createExpense(expenseData);

      expect(mockPrisma.expense.create).toHaveBeenCalledTimes(1);
      const createCall = mockPrisma.expense.create.mock.calls[0][0];
      expect(createCall.data.title).toBe(expenseData.title);
      expect(createCall.data.userId).toBe(expenseData.userId);
      expect(createCall.data.amount.toString()).toBe('100.5'); // Decimal conversion
      expect(createCall.include).toBeDefined(); // Has include structure
      expect(result).toEqual(expectedExpense);
    });

    it('should create expense with paidAt date when provided', async () => {
      const paidAt = new Date('2023-01-15');
      const expenseData = {
        title: 'Test Expense',
        amount: 100.5,
        userId: 1,
        paidAt,
      };

      const expectedExpense = {
        id: 1,
        ...expenseData,
      };

      mockPrisma.expense.create.mockResolvedValue(expectedExpense);

      const result = await createExpense(expenseData);

      expect(mockPrisma.expense.create).toHaveBeenCalledTimes(1);
      const createCall = mockPrisma.expense.create.mock.calls[0][0];
      expect(createCall.data.title).toBe(expenseData.title);
      expect(createCall.data.userId).toBe(expenseData.userId);
      expect(createCall.data.paidAt).toBe(expenseData.paidAt);
      expect(createCall.data.amount.toString()).toBe('100.5'); // Decimal conversion
      expect(createCall.include).toBeDefined(); // Has include structure
      expect(result).toEqual(expectedExpense);
    });

    it('should handle database errors', async () => {
      const expenseData = {
        title: 'Test Expense',
        amount: 100.5,
        userId: 1,
      };

      mockPrisma.expense.create.mockRejectedValue(new Error('Database error'));

      await expect(createExpense(expenseData)).rejects.toThrow('Database error');
    });
  });

  describe('getExpense', () => {
    it('should get expense by id', async () => {
      const expectedExpense = {
        id: 1,
        title: 'Test Expense',
        amount: 100.5,
        userId: 1,
        paidAt: new Date(),
      };

      mockPrisma.expense.findUnique.mockResolvedValue(expectedExpense);

      const result = await getExpense(1);

      expect(mockPrisma.expense.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result).toEqual(expectedExpense);
    });

    it('should return null when expense not found', async () => {
      mockPrisma.expense.findUnique.mockResolvedValue(null);

      const result = await getExpense(999);

      expect(mockPrisma.expense.findUnique).toHaveBeenCalledWith({
        where: { id: 999 },
      });
      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      mockPrisma.expense.findUnique.mockRejectedValue(new Error('Database error'));

      await expect(getExpense(1)).rejects.toThrow('Database error');
    });
  });

  describe('updateExpense', () => {
    it('should update expense with partial data', async () => {
      const updateData = {
        title: 'Updated Expense',
        amount: 150.75,
      };

      const expectedExpense = {
        id: 1,
        ...updateData,
        userId: 1,
        paidAt: new Date(),
      };

      mockPrisma.expense.update.mockResolvedValue(expectedExpense);

      const result = await updateExpense(1, updateData);

      expect(mockPrisma.expense.update).toHaveBeenCalledTimes(1);
      const updateCall = mockPrisma.expense.update.mock.calls[0][0];
      expect(updateCall.where.id).toBe(1);
      expect(updateCall.data.title).toBe(updateData.title);
      expect(updateCall.data.amount.toString()).toBe('150.75'); // Decimal conversion
      expect(updateCall.include).toBeDefined(); // Has include structure
      expect(result).toEqual(expectedExpense);
    });

    it('should update only title', async () => {
      const updateData = { title: 'New Title' };

      const expectedExpense = {
        id: 1,
        title: 'New Title',
        amount: 100.5,
        userId: 1,
        paidAt: new Date(),
      };

      mockPrisma.expense.update.mockResolvedValue(expectedExpense);

      const result = await updateExpense(1, updateData);

      expect(mockPrisma.expense.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({
            title: updateData.title,
            amount: undefined, // No amount conversion
          }),
          include: expect.any(Object), // Enhanced include structure exists
        })
      );
      expect(result).toEqual(expectedExpense);
    });

    it('should update paidAt date', async () => {
      const newPaidAt = new Date('2023-02-01');
      const updateData = { paidAt: newPaidAt };

      const expectedExpense = {
        id: 1,
        title: 'Test Expense',
        amount: 100.5,
        userId: 1,
        paidAt: newPaidAt,
      };

      mockPrisma.expense.update.mockResolvedValue(expectedExpense);

      const result = await updateExpense(1, updateData);

      expect(mockPrisma.expense.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({
            paidAt: updateData.paidAt,
            amount: undefined, // No amount conversion
          }),
          include: expect.any(Object), // Enhanced include structure exists
        })
      );
      expect(result).toEqual(expectedExpense);
    });

    it('should handle database errors', async () => {
      mockPrisma.expense.update.mockRejectedValue(new Error('Database error'));

      await expect(updateExpense(1, { title: 'New Title' })).rejects.toThrow('Database error');
    });
  });

  describe('deleteExpense', () => {
    it('should delete expense by id', async () => {
      const deletedExpense = {
        id: 1,
        title: 'Test Expense',
        amount: 100.5,
        userId: 1,
        paidAt: new Date(),
      };

      mockPrisma.expense.delete.mockResolvedValue(deletedExpense);

      const result = await deleteExpense(1);

      expect(mockPrisma.expense.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result).toEqual(deletedExpense);
    });

    it('should handle database errors', async () => {
      mockPrisma.expense.delete.mockRejectedValue(new Error('Database error'));

      await expect(deleteExpense(1)).rejects.toThrow('Database error');
    });
  });

  describe('listExpenses', () => {
    it('should return all expenses ordered by id desc', async () => {
      const mockExpenses = [
        {
          id: 2,
          title: 'Expense 2',
          amount: 200,
          userId: 1,
          paidAt: new Date(),
        },
        {
          id: 1,
          title: 'Expense 1',
          amount: 100,
          userId: 1,
          paidAt: new Date(),
        },
      ];

      mockPrisma.expense.findMany.mockResolvedValue(mockExpenses);

      const result = await listExpenses();

      expect(mockPrisma.expense.findMany).toHaveBeenCalledWith({
        orderBy: { id: 'desc' },
      });
      expect(result).toEqual(mockExpenses);
    });

    it('should return empty array when no expenses exist', async () => {
      mockPrisma.expense.findMany.mockResolvedValue([]);

      const result = await listExpenses();

      expect(mockPrisma.expense.findMany).toHaveBeenCalledWith({
        orderBy: { id: 'desc' },
      });
      expect(result).toEqual([]);
    });

    it('should handle database errors', async () => {
      mockPrisma.expense.findMany.mockRejectedValue(new Error('Database error'));

      await expect(listExpenses()).rejects.toThrow('Database error');
    });
  });
});
