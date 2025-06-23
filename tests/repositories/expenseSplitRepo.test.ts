import { PrismaClient, SplitType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import {
  createExpenseSplits,
  getExpenseSplits,
  getUserSplits,
  markSplitAsPaid,
  getUserBalanceSummary,
  deleteExpenseSplits,
} from '../../src/repositories/expenseSplitRepo.js';

const prisma = new PrismaClient();

// Test data
let testUser1: any, testUser2: any, testUser3: any;
let testGroup: any;
let testExpense: any;

describe('ExpenseSplitRepo', () => {
  beforeAll(async () => {
    // Create test users
    testUser1 = await prisma.user.create({
      data: {
        email: 'user1@test.com',
        name: 'User One',
        password: 'hashedpassword1',
      },
    });

    testUser2 = await prisma.user.create({
      data: {
        email: 'user2@test.com',
        name: 'User Two',
        password: 'hashedpassword2',
      },
    });

    testUser3 = await prisma.user.create({
      data: {
        email: 'user3@test.com',
        name: 'User Three',
        password: 'hashedpassword3',
      },
    });

    // Create test group
    testGroup = await prisma.group.create({
      data: {
        name: 'Test Group',
        description: 'Test group for expense splitting',
        createdBy: testUser1.id,
      },
    });

    // Add users to group
    await prisma.groupMember.createMany({
      data: [
        { groupId: testGroup.id, userId: testUser1.id, role: 'ADMIN' },
        { groupId: testGroup.id, userId: testUser2.id, role: 'MEMBER' },
        { groupId: testGroup.id, userId: testUser3.id, role: 'MEMBER' },
      ],
    });
  });

  beforeEach(async () => {
    // Create a fresh expense for each test
    testExpense = await prisma.expense.create({
      data: {
        title: 'Test Expense',
        description: 'Test expense for splitting',
        amount: new Decimal('150.00'),
        userId: testUser1.id,
        groupId: testGroup.id,
      },
    });
  });

  afterEach(async () => {
    // Clean up expense splits and expenses after each test
    await prisma.expenseSplit.deleteMany({});
    await prisma.expense.deleteMany({});
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.groupMember.deleteMany({});
    await prisma.group.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
  });

  describe('createExpenseSplits', () => {
    describe('EQUAL splits', () => {
      it('should create equal splits for 2 participants', async () => {
        const participants = [{ userId: testUser1.id }, { userId: testUser2.id }];

        const splits = await createExpenseSplits({
          expenseId: testExpense.id,
          splitType: SplitType.EQUAL,
          participants,
        });

        expect(splits).toHaveLength(2);
        expect(splits[0].amount.toString()).toBe('75');
        expect(splits[1].amount.toString()).toBe('75');
        expect(splits[0].splitType).toBe(SplitType.EQUAL);
        expect(splits[0].user).toBeDefined();
        expect(splits[0].user.name).toBeDefined();
      });

      it('should create equal splits for 3 participants', async () => {
        const participants = [
          { userId: testUser1.id },
          { userId: testUser2.id },
          { userId: testUser3.id },
        ];

        const splits = await createExpenseSplits({
          expenseId: testExpense.id,
          splitType: SplitType.EQUAL,
          participants,
        });

        expect(splits).toHaveLength(3);
        expect(splits[0].amount.toString()).toBe('50');
        expect(splits[1].amount.toString()).toBe('50');
        expect(splits[2].amount.toString()).toBe('50');
      });

      it('should throw error for empty participants', async () => {
        await expect(
          createExpenseSplits({
            expenseId: testExpense.id,
            splitType: SplitType.EQUAL,
            participants: [],
          })
        ).rejects.toThrow('At least one participant is required');
      });
    });

    describe('AMOUNT splits', () => {
      it('should create amount splits with valid amounts', async () => {
        const participants = [
          { userId: testUser1.id, amount: 100 },
          { userId: testUser2.id, amount: 50 },
        ];

        const splits = await createExpenseSplits({
          expenseId: testExpense.id,
          splitType: SplitType.AMOUNT,
          participants,
        });

        expect(splits).toHaveLength(2);
        expect(splits[0].amount.toString()).toBe('100');
        expect(splits[1].amount.toString()).toBe('50');
        expect(splits[0].splitType).toBe(SplitType.AMOUNT);
      });

      it('should throw error when amounts do not equal total', async () => {
        const participants = [
          { userId: testUser1.id, amount: 100 },
          { userId: testUser2.id, amount: 40 }, // Total: 140, should be 150
        ];

        await expect(
          createExpenseSplits({
            expenseId: testExpense.id,
            splitType: SplitType.AMOUNT,
            participants,
          })
        ).rejects.toThrow('Split amounts total (140) must equal expense amount (150)');
      });

      it('should throw error for missing amounts', async () => {
        const participants = [
          { userId: testUser1.id, amount: 100 },
          { userId: testUser2.id }, // Missing amount
        ];

        await expect(
          createExpenseSplits({
            expenseId: testExpense.id,
            splitType: SplitType.AMOUNT,
            participants,
          })
        ).rejects.toThrow('All participants must have positive amounts for AMOUNT split');
      });

      it('should throw error for negative amounts', async () => {
        const participants = [
          { userId: testUser1.id, amount: 160 },
          { userId: testUser2.id, amount: -10 },
        ];

        await expect(
          createExpenseSplits({
            expenseId: testExpense.id,
            splitType: SplitType.AMOUNT,
            participants,
          })
        ).rejects.toThrow('All participants must have positive amounts for AMOUNT split');
      });
    });

    describe('PERCENTAGE splits', () => {
      it('should create percentage splits with valid percentages', async () => {
        const participants = [
          { userId: testUser1.id, percentage: 60 },
          { userId: testUser2.id, percentage: 40 },
        ];

        const splits = await createExpenseSplits({
          expenseId: testExpense.id,
          splitType: SplitType.PERCENTAGE,
          participants,
        });

        expect(splits).toHaveLength(2);
        expect(splits[0].amount.toString()).toBe('90'); // 60% of 150
        expect(splits[1].amount.toString()).toBe('60'); // 40% of 150
        expect(splits[0].percentage).toBe(60);
        expect(splits[1].percentage).toBe(40);
        expect(splits[0].splitType).toBe(SplitType.PERCENTAGE);
      });

      it('should handle three-way percentage split', async () => {
        const participants = [
          { userId: testUser1.id, percentage: 50 },
          { userId: testUser2.id, percentage: 30 },
          { userId: testUser3.id, percentage: 20 },
        ];

        const splits = await createExpenseSplits({
          expenseId: testExpense.id,
          splitType: SplitType.PERCENTAGE,
          participants,
        });

        expect(splits).toHaveLength(3);
        expect(splits[0].amount.toString()).toBe('75'); // 50% of 150
        expect(splits[1].amount.toString()).toBe('45'); // 30% of 150
        expect(splits[2].amount.toString()).toBe('30'); // 20% of 150
      });

      it('should throw error when percentages do not equal 100%', async () => {
        const participants = [
          { userId: testUser1.id, percentage: 60 },
          { userId: testUser2.id, percentage: 30 }, // Total: 90%, should be 100%
        ];

        await expect(
          createExpenseSplits({
            expenseId: testExpense.id,
            splitType: SplitType.PERCENTAGE,
            participants,
          })
        ).rejects.toThrow('Split percentages must total 100%, got 90%');
      });

      it('should throw error for missing percentages', async () => {
        const participants = [
          { userId: testUser1.id, percentage: 60 },
          { userId: testUser2.id }, // Missing percentage
        ];

        await expect(
          createExpenseSplits({
            expenseId: testExpense.id,
            splitType: SplitType.PERCENTAGE,
            participants,
          })
        ).rejects.toThrow('All participants must have positive percentages for PERCENTAGE split');
      });

      it('should throw error for negative percentages', async () => {
        const participants = [
          { userId: testUser1.id, percentage: 110 },
          { userId: testUser2.id, percentage: -10 },
        ];

        await expect(
          createExpenseSplits({
            expenseId: testExpense.id,
            splitType: SplitType.PERCENTAGE,
            participants,
          })
        ).rejects.toThrow('All participants must have positive percentages for PERCENTAGE split');
      });
    });

    it('should throw error for non-existent expense', async () => {
      const participants = [{ userId: testUser1.id }];

      await expect(
        createExpenseSplits({
          expenseId: 99999,
          splitType: SplitType.EQUAL,
          participants,
        })
      ).rejects.toThrow('Expense not found');
    });
  });

  describe('getExpenseSplits', () => {
    it('should return all splits for an expense', async () => {
      // Create splits
      await createExpenseSplits({
        expenseId: testExpense.id,
        splitType: SplitType.EQUAL,
        participants: [{ userId: testUser1.id }, { userId: testUser2.id }],
      });

      const splits = await getExpenseSplits(testExpense.id);

      expect(splits).toHaveLength(2);
      expect(splits[0].user).toBeDefined();
      expect(splits[0].user.name).toBeDefined();
      expect(splits[0].user.email).toBeDefined();
    });

    it('should return empty array for expense with no splits', async () => {
      const splits = await getExpenseSplits(testExpense.id);
      expect(splits).toHaveLength(0);
    });
  });

  describe('getUserSplits', () => {
    it('should return all splits for a user', async () => {
      // Create splits for multiple expenses
      const expense2 = await prisma.expense.create({
        data: {
          title: 'Test Expense 2',
          amount: new Decimal('100.00'),
          userId: testUser2.id,
          groupId: testGroup.id,
        },
      });

      await createExpenseSplits({
        expenseId: testExpense.id,
        splitType: SplitType.EQUAL,
        participants: [{ userId: testUser1.id }, { userId: testUser2.id }],
      });

      await createExpenseSplits({
        expenseId: expense2.id,
        splitType: SplitType.EQUAL,
        participants: [{ userId: testUser1.id }, { userId: testUser2.id }],
      });

      const splits = await getUserSplits(testUser1.id);

      expect(splits).toHaveLength(2);
      expect(splits[0].expense).toBeDefined();
      expect(splits[0].expense.title).toBeDefined();
      expect(splits[0].expense.user.name).toBeDefined();
    });

    it('should return empty array for user with no splits', async () => {
      const splits = await getUserSplits(testUser3.id);
      expect(splits).toHaveLength(0);
    });
  });

  describe('markSplitAsPaid', () => {
    it('should mark a split as paid', async () => {
      // Create splits
      await createExpenseSplits({
        expenseId: testExpense.id,
        splitType: SplitType.EQUAL,
        participants: [{ userId: testUser1.id }, { userId: testUser2.id }],
      });

      const split = await markSplitAsPaid(testExpense.id, testUser2.id);

      expect(split.isPaid).toBe(true);
      expect(split.user).toBeDefined();
    });

    it('should throw error for non-existent split', async () => {
      await expect(markSplitAsPaid(testExpense.id, testUser2.id)).rejects.toThrow();
    });
  });

  describe('getUserBalanceSummary', () => {
    it('should calculate correct balance summary', async () => {
      // User1 pays $150, split with User2 equally
      // User1 should be owed $75 from User2
      await createExpenseSplits({
        expenseId: testExpense.id,
        splitType: SplitType.EQUAL,
        participants: [{ userId: testUser1.id }, { userId: testUser2.id }],
      });

      // Create another expense where User2 pays $100, split with User1
      const expense2 = await prisma.expense.create({
        data: {
          title: 'User2 Expense',
          amount: new Decimal('100.00'),
          userId: testUser2.id,
          groupId: testGroup.id,
        },
      });

      await createExpenseSplits({
        expenseId: expense2.id,
        splitType: SplitType.EQUAL,
        participants: [{ userId: testUser1.id }, { userId: testUser2.id }],
      });

      const user1Summary = await getUserBalanceSummary(testUser1.id);
      const user2Summary = await getUserBalanceSummary(testUser2.id);

      // User1: Owes $50 (from expense2), Owed $75 (from testExpense), Net: +$25
      expect(user1Summary.owes.toString()).toBe('50');
      expect(user1Summary.owed.toString()).toBe('75');
      expect(user1Summary.netBalance.toString()).toBe('25');

      // User2: Owes $75 (from testExpense), Owed $50 (from expense2), Net: -$25
      expect(user2Summary.owes.toString()).toBe('75');
      expect(user2Summary.owed.toString()).toBe('50');
      expect(user2Summary.netBalance.toString()).toBe('-25');
    });

    it('should handle zero balances', async () => {
      const summary = await getUserBalanceSummary(testUser3.id);

      expect(summary.owes.toString()).toBe('0');
      expect(summary.owed.toString()).toBe('0');
      expect(summary.netBalance.toString()).toBe('0');
    });

    it('should exclude paid splits from balance calculation', async () => {
      await createExpenseSplits({
        expenseId: testExpense.id,
        splitType: SplitType.EQUAL,
        participants: [{ userId: testUser1.id }, { userId: testUser2.id }],
      });

      // Mark User2's split as paid
      await markSplitAsPaid(testExpense.id, testUser2.id);

      const user1Summary = await getUserBalanceSummary(testUser1.id);
      const user2Summary = await getUserBalanceSummary(testUser2.id);

      // No unpaid splits should remain
      expect(user1Summary.owed.toString()).toBe('0');
      expect(user2Summary.owes.toString()).toBe('0');
    });
  });

  describe('deleteExpenseSplits', () => {
    it('should delete all splits for an expense', async () => {
      // Create splits
      await createExpenseSplits({
        expenseId: testExpense.id,
        splitType: SplitType.EQUAL,
        participants: [{ userId: testUser1.id }, { userId: testUser2.id }],
      });

      // Verify splits exist
      let splits = await getExpenseSplits(testExpense.id);
      expect(splits).toHaveLength(2);

      // Delete splits
      await deleteExpenseSplits(testExpense.id);

      // Verify splits are gone
      splits = await getExpenseSplits(testExpense.id);
      expect(splits).toHaveLength(0);
    });

    it('should not throw error when deleting splits for expense with no splits', async () => {
      await expect(deleteExpenseSplits(testExpense.id)).resolves.not.toThrow();
    });
  });
});
