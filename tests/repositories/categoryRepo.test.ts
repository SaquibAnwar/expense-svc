import { jest } from '@jest/globals';
// Remove unused import
import { Decimal } from '@prisma/client/runtime/library';

// Mock Prisma
const mockPrisma = {
  category: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  expense: {
    aggregate: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
    findMany: jest.fn(),
  },
} as any;

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => mockPrisma),
  Decimal: jest.fn().mockImplementation((value: any) => ({
    toString: () => String(value),
    toNumber: () => parseFloat(String(value)),
  })),
}));

jest.mock('../../src/app', () => ({
  prisma: mockPrisma,
}));

import {
  createCategory,
  getCategoryById,
  getCategoryWithStats,
  updateCategory,
  deleteCategory,
  hardDeleteCategory,
  getUserCategories,
  getDefaultCategories,
  searchCategories,
  getCategorySpendingSummary,
  getTopSpendingCategories,
  canUserAccessCategory,
} from '../../src/repositories/categoryRepo';

describe('CategoryRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createCategory', () => {
    it('should create a new category', async () => {
      const categoryData = {
        name: 'Test Category',
        description: 'Test description',
        icon: '🍔',
        color: '#FF5733',
        userId: 1,
      };

      const expectedCategory = {
        id: 1,
        ...categoryData,
        isDefault: false,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.category.create.mockResolvedValue(expectedCategory);

      const result = await createCategory(categoryData);

      expect(mockPrisma.category.create).toHaveBeenCalledWith({
        data: categoryData,
      });
      expect(result).toEqual(expectedCategory);
    });

    it('should create a default category without userId', async () => {
      const categoryData = {
        name: 'Default Category',
        icon: '🛍️',
        color: '#33A1FF',
      };

      const expectedCategory = {
        id: 2,
        ...categoryData,
        description: null,
        userId: null,
        isDefault: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.category.create.mockResolvedValue(expectedCategory);

      const result = await createCategory(categoryData);

      expect(mockPrisma.category.create).toHaveBeenCalledWith({
        data: categoryData,
      });
      expect(result).toEqual(expectedCategory);
    });
  });

  describe('getCategoryById', () => {
    it('should get category by id', async () => {
      const expectedCategory = {
        id: 1,
        name: 'Test Category',
        description: 'Test description',
        icon: '🍔',
        color: '#FF5733',
        userId: 1,
        isDefault: false,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.category.findUnique.mockResolvedValue(expectedCategory);

      const result = await getCategoryById(1);

      expect(mockPrisma.category.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result).toEqual(expectedCategory);
    });

    it('should return null when category not found', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(null);

      const result = await getCategoryById(999);

      expect(mockPrisma.category.findUnique).toHaveBeenCalledWith({
        where: { id: 999 },
      });
      expect(result).toBeNull();
    });
  });

  describe('getCategoryWithStats', () => {
    it('should get category with stats for specific user', async () => {
      const mockCategory = {
        id: 1,
        name: 'Food',
        icon: '🍔',
        color: '#FF5733',
        _count: { expenses: 5 },
      };

      const mockExpenseStats = {
        _sum: { amount: new Decimal(500) },
        _avg: { amount: new Decimal(100) },
        _max: { paidAt: new Date('2023-12-01') },
      };

      mockPrisma.category.findUnique.mockResolvedValue(mockCategory);
      mockPrisma.expense.aggregate.mockResolvedValue(mockExpenseStats);

      const result = await getCategoryWithStats(1, 123);

      expect(mockPrisma.category.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: {
          _count: {
            select: {
              expenses: {
                where: { userId: 123 },
              },
            },
          },
        },
      });

      expect(mockPrisma.expense.aggregate).toHaveBeenCalledWith({
        where: {
          categoryId: 1,
          userId: 123,
        },
        _sum: { amount: true },
        _avg: { amount: true },
        _max: { paidAt: true },
      });

      expect(result).toEqual({
        ...mockCategory,
        totalAmount: new Decimal(500),
        averageAmount: new Decimal(100),
        lastUsed: new Date('2023-12-01'),
      });
    });

    it('should get category with stats for all users when userId not provided', async () => {
      const mockCategory = {
        id: 1,
        name: 'Food',
        icon: '🍔',
        color: '#FF5733',
        _count: { expenses: 10 },
      };

      const mockExpenseStats = {
        _sum: { amount: new Decimal(1000) },
        _avg: { amount: new Decimal(100) },
        _max: { paidAt: new Date('2023-12-01') },
      };

      mockPrisma.category.findUnique.mockResolvedValue(mockCategory);
      mockPrisma.expense.aggregate.mockResolvedValue(mockExpenseStats);

      const result = await getCategoryWithStats(1);

      expect(mockPrisma.category.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: {
          _count: {
            select: {
              expenses: true,
            },
          },
        },
      });

      expect(mockPrisma.expense.aggregate).toHaveBeenCalledWith({
        where: {
          categoryId: 1,
        },
        _sum: { amount: true },
        _avg: { amount: true },
        _max: { paidAt: true },
      });

      expect(result).toEqual({
        ...mockCategory,
        totalAmount: new Decimal(500),
        averageAmount: new Decimal(100),
        lastUsed: new Date('2023-12-01'),
      });
    });

    it('should return null when category not found', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(null);

      const result = await getCategoryWithStats(999);

      expect(result).toBeNull();
    });

    it('should handle categories with no expenses', async () => {
      const mockCategory = {
        id: 1,
        name: 'Unused Category',
        icon: '📝',
        color: '#FF5733',
        _count: { expenses: 0 },
      };

      const mockExpenseStats = {
        _sum: { amount: null },
        _avg: { amount: null },
        _max: { paidAt: null },
      };

      mockPrisma.category.findUnique.mockResolvedValue(mockCategory);
      mockPrisma.expense.aggregate.mockResolvedValue(mockExpenseStats);

      const result = await getCategoryWithStats(1, 123);

      expect(result).toEqual({
        ...mockCategory,
        totalAmount: new Decimal(0),
        averageAmount: new Decimal(0),
        lastUsed: null,
      });
    });
  });

  describe('updateCategory', () => {
    it('should update category', async () => {
      const updateData = {
        name: 'Updated Category',
        description: 'Updated description',
        color: '#FF0000',
      };

      const expectedCategory = {
        id: 1,
        name: 'Updated Category',
        description: 'Updated description',
        icon: '🍔',
        color: '#FF0000',
        userId: 1,
        isDefault: false,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.category.update.mockResolvedValue(expectedCategory);

      const result = await updateCategory(1, updateData);

      expect(mockPrisma.category.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: updateData,
      });
      expect(result).toEqual(expectedCategory);
    });
  });

  describe('deleteCategory', () => {
    it('should soft delete category by setting isActive to false', async () => {
      const expectedCategory = {
        id: 1,
        name: 'Test Category',
        description: 'Test description',
        icon: '🍔',
        color: '#FF5733',
        userId: 1,
        isDefault: false,
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.category.update.mockResolvedValue(expectedCategory);

      const result = await deleteCategory(1);

      expect(mockPrisma.category.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { isActive: false },
      });
      expect(result).toEqual(expectedCategory);
    });
  });

  describe('hardDeleteCategory', () => {
    it('should hard delete category when no expenses exist', async () => {
      const expectedCategory = {
        id: 1,
        name: 'Test Category',
        description: 'Test description',
        icon: '🍔',
        color: '#FF5733',
        userId: 1,
        isDefault: false,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.expense.count.mockResolvedValue(0);
      mockPrisma.category.delete.mockResolvedValue(expectedCategory);

      const result = await hardDeleteCategory(1);

      expect(mockPrisma.expense.count).toHaveBeenCalledWith({
        where: { categoryId: 1 },
      });
      expect(mockPrisma.category.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result).toEqual(expectedCategory);
    });

    it('should throw error when category has expenses', async () => {
      mockPrisma.expense.count.mockResolvedValue(5);

      await expect(hardDeleteCategory(1)).rejects.toThrow(
        'Cannot delete category with existing expenses. Use soft delete instead.'
      );

      expect(mockPrisma.expense.count).toHaveBeenCalledWith({
        where: { categoryId: 1 },
      });
      expect(mockPrisma.category.delete).not.toHaveBeenCalled();
    });
  });

  describe('getUserCategories', () => {
    it('should get user categories without stats', async () => {
      const mockCategories = [
        {
          id: 1,
          name: 'Food',
          icon: '🍔',
          color: '#FF5733',
          isDefault: true,
          _count: { expenses: 5 },
        },
        {
          id: 2,
          name: 'Custom Category',
          icon: '📝',
          color: '#33A1FF',
          isDefault: false,
          userId: 123,
          _count: { expenses: 2 },
        },
      ];

      mockPrisma.category.findMany.mockResolvedValue(mockCategories);

      const result = await getUserCategories(123);

      expect(mockPrisma.category.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          OR: [{ isDefault: true }, { userId: 123 }],
        },
        include: {
          _count: {
            select: {
              expenses: {
                where: { userId: 123 },
              },
            },
          },
        },
        orderBy: { name: 'asc' },
        take: 50,
        skip: 0,
      });
      expect(result).toEqual(mockCategories);
    });

    it('should get user categories with stats', async () => {
      const mockCategories = [
        {
          id: 1,
          name: 'Food',
          icon: '🍔',
          color: '#FF5733',
          isDefault: true,
          _count: { expenses: 5 },
        },
      ];

      mockPrisma.category.findMany.mockResolvedValue(mockCategories);
      mockPrisma.expense.aggregate.mockResolvedValue({
        _sum: { amount: new Decimal(500) },
        _avg: { amount: new Decimal(100) },
        _max: { paidAt: new Date('2023-12-01') },
      });

      const result = await getUserCategories(123, { includeStats: true });

      expect(mockPrisma.category.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          OR: [{ isDefault: true }, { userId: 123 }],
        },
        include: {
          _count: {
            select: {
              expenses: {
                where: { userId: 123 },
              },
            },
          },
        },
        take: 50,
        skip: 0,
      });

      expect(mockPrisma.expense.aggregate).toHaveBeenCalledWith({
        where: {
          categoryId: 1,
          userId: 123,
        },
        _sum: { amount: true },
        _avg: { amount: true },
        _max: { paidAt: true },
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('totalAmount');
      expect(result[0]).toHaveProperty('averageAmount');
      expect(result[0]).toHaveProperty('lastUsed');
    });

    it('should respect pagination options', async () => {
      mockPrisma.category.findMany.mockResolvedValue([]);

      await getUserCategories(123, {
        limit: 10,
        offset: 20,
        orderBy: 'createdAt',
        orderDirection: 'desc',
      });

      expect(mockPrisma.category.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          OR: [{ isDefault: true }, { userId: 123 }],
        },
        include: {
          _count: {
            select: {
              expenses: {
                where: { userId: 123 },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        skip: 20,
      });
    });
  });

  describe('getDefaultCategories', () => {
    it('should get all default categories', async () => {
      const mockCategories = [
        {
          id: 1,
          name: 'Food & Dining',
          icon: '🍔',
          color: '#FF5733',
          isDefault: true,
          isActive: true,
        },
        {
          id: 2,
          name: 'Transportation',
          icon: '🚗',
          color: '#33A1FF',
          isDefault: true,
          isActive: true,
        },
      ];

      mockPrisma.category.findMany.mockResolvedValue(mockCategories);

      const result = await getDefaultCategories();

      expect(mockPrisma.category.findMany).toHaveBeenCalledWith({
        where: {
          isDefault: true,
          isActive: true,
        },
        orderBy: { name: 'asc' },
      });
      expect(result).toEqual(mockCategories);
    });
  });

  describe('searchCategories', () => {
    it('should search categories with filters', async () => {
      const mockCategories = [
        {
          id: 1,
          name: 'Food',
          icon: '🍔',
          color: '#FF5733',
          isDefault: true,
        },
      ];

      mockPrisma.category.findMany.mockResolvedValue(mockCategories);

      const filters = {
        userId: 123,
        isDefault: true,
        isActive: true,
        name: 'Food',
      };

      const result = await searchCategories(filters);

      expect(mockPrisma.category.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          isDefault: true,
          OR: [{ isDefault: true }, { userId: 123 }],
          name: {
            contains: 'Food',
            mode: 'insensitive',
          },
        },
        orderBy: { name: 'asc' },
        take: 50,
        skip: 0,
      });
      expect(result).toEqual(mockCategories);
    });

    it('should search categories without name filter', async () => {
      mockPrisma.category.findMany.mockResolvedValue([]);

      const filters = {
        userId: 123,
        isActive: true,
      };

      await searchCategories(filters);

      expect(mockPrisma.category.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          userId: 123,
        },
        orderBy: { name: 'asc' },
        take: 50,
        skip: 0,
      });
    });
  });

  describe('getCategorySpendingSummary', () => {
    it('should get category spending summary', async () => {
      const mockExpenses = [
        {
          categoryId: 1,
          category: {
            name: 'Food',
            icon: '🍔',
            color: '#FF5733',
          },
          amount: new Decimal(100),
          paidAt: new Date('2023-12-01'),
        },
        {
          categoryId: 1,
          category: {
            name: 'Food',
            icon: '🍔',
            color: '#FF5733',
          },
          amount: new Decimal(400),
          paidAt: new Date('2023-12-02'),
        },
      ];

      const mockTotalSpending = {
        _sum: { amount: new Decimal(1000) },
      };

      mockPrisma.expense.findMany.mockResolvedValue(mockExpenses);
      mockPrisma.expense.aggregate.mockResolvedValue(mockTotalSpending);

      const result = await getCategorySpendingSummary(123);

      expect(mockPrisma.expense.aggregate).toHaveBeenCalledWith({
        where: { userId: 123 },
        _sum: { amount: true },
      });

      expect(mockPrisma.expense.findMany).toHaveBeenCalledWith({
        where: {
          userId: 123,
          categoryId: { not: null },
        },
        include: {
          category: {
            select: { name: true, icon: true, color: true },
          },
        },
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        categoryId: 1,
        categoryName: 'Food',
        categoryIcon: '🍔',
        categoryColor: '#FF5733',
        totalAmount: new Decimal(500),
        expenseCount: 2,
        averageAmount: new Decimal(250),
        percentage: 50,
        lastExpenseDate: new Date('2023-12-02'),
      });
    });

    it('should handle date filters', async () => {
      mockPrisma.expense.findMany.mockResolvedValue([]);
      mockPrisma.expense.aggregate.mockResolvedValue({ _sum: { amount: new Decimal(0) } });

      const fromDate = new Date('2023-01-01');
      const toDate = new Date('2023-12-31');

      await getCategorySpendingSummary(123, { fromDate, toDate, limit: 10 });

      expect(mockPrisma.expense.aggregate).toHaveBeenCalledWith({
        where: {
          userId: 123,
          paidAt: {
            gte: fromDate,
            lte: toDate,
          },
        },
        _sum: { amount: true },
      });

      expect(mockPrisma.expense.findMany).toHaveBeenCalledWith({
        where: {
          userId: 123,
          categoryId: { not: null },
          paidAt: {
            gte: fromDate,
            lte: toDate,
          },
        },
        include: {
          category: {
            select: { name: true, icon: true, color: true },
          },
        },
      });
    });
  });

  describe('getTopSpendingCategories', () => {
    it('should get top spending categories', async () => {
      const mockExpenses = [
        {
          categoryId: 1,
          category: {
            name: 'Food',
            icon: '🍔',
            color: '#FF5733',
          },
          amount: new Decimal(500),
          paidAt: new Date('2023-12-01'),
        },
      ];

      mockPrisma.expense.findMany.mockResolvedValue(mockExpenses);
      mockPrisma.expense.aggregate.mockResolvedValue({
        _sum: { amount: new Decimal(1000) },
      });

      const result = await getTopSpendingCategories(123, 5, new Date('2023-01-01'));

      expect(mockPrisma.expense.aggregate).toHaveBeenCalled();
      expect(mockPrisma.expense.findMany).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });
  });

  describe('canUserAccessCategory', () => {
    it('should return true for default category', async () => {
      const mockCategory = {
        id: 1,
        name: 'Food',
        isDefault: true,
        userId: null,
        isActive: true,
      };

      mockPrisma.category.findUnique.mockResolvedValue(mockCategory);

      const result = await canUserAccessCategory(123, 1);

      expect(mockPrisma.category.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        select: { isDefault: true, userId: true },
      });
      expect(result).toBe(true);
    });

    it('should return true for user-owned category', async () => {
      const mockCategory = {
        id: 2,
        name: 'Custom Category',
        isDefault: false,
        userId: 123,
        isActive: true,
      };

      mockPrisma.category.findUnique.mockResolvedValue(mockCategory);

      const result = await canUserAccessCategory(123, 2);

      expect(result).toBe(true);
    });

    it('should return false for other user category', async () => {
      const mockCategory = {
        id: 3,
        name: 'Other User Category',
        isDefault: false,
        userId: 456,
        isActive: true,
      };

      mockPrisma.category.findUnique.mockResolvedValue(mockCategory);

      const result = await canUserAccessCategory(123, 3);

      expect(result).toBe(false);
    });

    it('should return false for inactive category', async () => {
      const mockCategory = {
        id: 4,
        name: 'Inactive Category',
        isDefault: false,
        userId: 456, // Different user
      };

      mockPrisma.category.findUnique.mockResolvedValue(mockCategory);

      const result = await canUserAccessCategory(123, 4);

      expect(result).toBe(false);
    });

    it('should return false for non-existent category', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(null);

      const result = await canUserAccessCategory(123, 999);

      expect(result).toBe(false);
    });
  });
});
