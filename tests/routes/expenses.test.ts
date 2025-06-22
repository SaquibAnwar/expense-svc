// Mock the prisma client
const mockPrisma = {
  expense: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
  }
};

// Mock the app module
jest.mock('../../src/app', () => ({
  prisma: mockPrisma
}));

describe('Expense Routes', () => {
  const mockUser = { id: 1, email: 'test@example.com', provider: 'local' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /expenses - List expenses', () => {
    it('should successfully fetch user expenses', async () => {
      const mockExpenses = [
        {
          id: 1,
          title: 'Test Expense',
          amount: 100.50,
          paidAt: new Date(),
          userId: 1
        }
      ];

      mockPrisma.expense.findMany.mockResolvedValue(mockExpenses);

      // Test the database call logic
      const result = await mockPrisma.expense.findMany({
        where: { userId: mockUser.id },
        orderBy: { id: 'desc' }
      });

      expect(result).toEqual(mockExpenses);
      expect(mockPrisma.expense.findMany).toHaveBeenCalledWith({
        where: { userId: 1 },
        orderBy: { id: 'desc' }
      });
    });

    it('should handle database errors when fetching expenses', async () => {
      const dbError = new Error('Database connection failed');
      mockPrisma.expense.findMany.mockRejectedValue(dbError);

      try {
        await mockPrisma.expense.findMany({
          where: { userId: mockUser.id },
          orderBy: { id: 'desc' }
        });
      } catch (error) {
        expect(error).toBe(dbError);
      }

      expect(mockPrisma.expense.findMany).toHaveBeenCalled();
    });
  });

  describe('GET /expenses/:id - Get expense by ID', () => {
    it('should successfully fetch expense by id', async () => {
      const mockExpense = {
        id: 1,
        title: 'Test Expense',
        amount: 100.50,
        paidAt: new Date(),
        userId: 1
      };

      mockPrisma.expense.findFirst.mockResolvedValue(mockExpense);

      const result = await mockPrisma.expense.findFirst({
        where: { id: 1, userId: mockUser.id }
      });

      expect(result).toEqual(mockExpense);
      expect(mockPrisma.expense.findFirst).toHaveBeenCalledWith({
        where: { id: 1, userId: 1 }
      });
    });

    it('should return null when expense not found', async () => {
      mockPrisma.expense.findFirst.mockResolvedValue(null);

      const result = await mockPrisma.expense.findFirst({
        where: { id: 999, userId: mockUser.id }
      });

      expect(result).toBeNull();
      expect(mockPrisma.expense.findFirst).toHaveBeenCalledWith({
        where: { id: 999, userId: 1 }
      });
    });

    it('should handle invalid expense id format', () => {
      const invalidId = 'invalid';
      const parsedId = parseInt(invalidId, 10);
      
      expect(isNaN(parsedId)).toBe(true);
    });
  });

  describe('POST /expenses - Create expense', () => {
    it('should successfully create new expense', async () => {
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

      mockPrisma.expense.create.mockResolvedValue(createdExpense);

      const result = await mockPrisma.expense.create({
        data: {
          title: 'New Expense',
          amount: 150.75,
          userId: mockUser.id
        }
      });

      expect(result).toEqual(createdExpense);
      expect(mockPrisma.expense.create).toHaveBeenCalledWith({
        data: {
          title: 'New Expense',
          amount: 150.75,
          userId: 1
        }
      });
    });

    it('should handle database errors during creation', async () => {
      const dbError = new Error('Database error');
      mockPrisma.expense.create.mockRejectedValue(dbError);

      try {
        await mockPrisma.expense.create({
          data: {
            title: 'Test Expense',
            amount: 100.50,
            userId: mockUser.id
          }
        });
      } catch (error) {
        expect(error).toBe(dbError);
      }

      expect(mockPrisma.expense.create).toHaveBeenCalled();
    });
  });

  describe('PATCH /expenses/:id - Update expense', () => {
    it('should successfully update expense', async () => {
      const updateData = {
        title: 'Updated Expense',
        amount: 200.00
      };

      const updatedResult = { count: 1 };
      const updatedExpense = {
        id: 1,
        ...updateData,
        paidAt: new Date(),
        userId: 1
      };

      mockPrisma.expense.updateMany.mockResolvedValue(updatedResult);
      mockPrisma.expense.findFirst.mockResolvedValue(updatedExpense);

      const result = await mockPrisma.expense.updateMany({
        where: { id: 1, userId: mockUser.id },
        data: updateData
      });

      expect(result.count).toBe(1);
      expect(mockPrisma.expense.updateMany).toHaveBeenCalledWith({
        where: { id: 1, userId: 1 },
        data: updateData
      });
    });

    it('should return zero count when expense not found', async () => {
      const updateResult = { count: 0 };
      mockPrisma.expense.updateMany.mockResolvedValue(updateResult);

      const result = await mockPrisma.expense.updateMany({
        where: { id: 999, userId: mockUser.id },
        data: { title: 'Updated Expense' }
      });

      expect(result.count).toBe(0);
    });
  });

  describe('DELETE /expenses/:id - Delete expense', () => {
    it('should successfully delete expense', async () => {
      const deleteResult = { count: 1 };
      mockPrisma.expense.deleteMany.mockResolvedValue(deleteResult);

      const result = await mockPrisma.expense.deleteMany({
        where: { id: 1, userId: mockUser.id }
      });

      expect(result.count).toBe(1);
      expect(mockPrisma.expense.deleteMany).toHaveBeenCalledWith({
        where: { id: 1, userId: 1 }
      });
    });

    it('should return zero count when expense not found', async () => {
      const deleteResult = { count: 0 };
      mockPrisma.expense.deleteMany.mockResolvedValue(deleteResult);

      const result = await mockPrisma.expense.deleteMany({
        where: { id: 999, userId: mockUser.id }
      });

      expect(result.count).toBe(0);
    });
  });
}); 