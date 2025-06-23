import { PrismaClient, SplitType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import {
  createExpenseSplits,
  getUserSettlements,
  getSettlementBetweenUsers,
  settleDebtBetweenUsers,
} from '../../src/repositories/expenseSplitRepo.js';

const prisma = new PrismaClient();

// Test data
let testUser1: any, testUser2: any, testUser3: any;
let testGroup: any;

describe('Settlement Tracking', () => {
  beforeAll(async () => {
    // Create test users
    testUser1 = await prisma.user.create({
      data: {
        email: 'settlement1@test.com',
        name: 'Alice Settlement',
        password: 'hashedpassword1',
      },
    });

    testUser2 = await prisma.user.create({
      data: {
        email: 'settlement2@test.com',
        name: 'Bob Settlement',
        password: 'hashedpassword2',
      },
    });

    testUser3 = await prisma.user.create({
      data: {
        email: 'settlement3@test.com',
        name: 'Charlie Settlement',
        password: 'hashedpassword3',
      },
    });

    // Create test group
    testGroup = await prisma.group.create({
      data: {
        name: 'Settlement Test Group',
        description: 'Test group for settlement tracking',
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

  afterEach(async () => {
    // Clean up splits and expenses after each test
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

  describe('getUserSettlements', () => {
    it('should return empty array when no settlements exist', async () => {
      const settlements = await getUserSettlements(testUser1.id);
      expect(settlements).toHaveLength(0);
    });

    it('should calculate simple two-user settlement', async () => {
      // User1 pays $100, split equally with User2
      const expense = await prisma.expense.create({
        data: {
          title: 'Dinner',
          amount: new Decimal('100.00'),
          userId: testUser1.id,
          groupId: testGroup.id,
        },
      });

      await createExpenseSplits({
        expenseId: expense.id,
        splitType: SplitType.EQUAL,
        participants: [{ userId: testUser1.id }, { userId: testUser2.id }],
      });

      // User1 should be owed $50 from User2
      const user1Settlements = await getUserSettlements(testUser1.id);
      expect(user1Settlements).toHaveLength(1);
      expect(user1Settlements[0].userId).toBe(testUser2.id);
      expect(user1Settlements[0].name).toBe('Bob Settlement');
      expect(user1Settlements[0].netAmount.toString()).toBe('50');
      expect(user1Settlements[0].owedToYou.toString()).toBe('50');
      expect(user1Settlements[0].owedByYou.toString()).toBe('0');

      // User2 should owe $50 to User1
      const user2Settlements = await getUserSettlements(testUser2.id);
      expect(user2Settlements).toHaveLength(1);
      expect(user2Settlements[0].userId).toBe(testUser1.id);
      expect(user2Settlements[0].name).toBe('Alice Settlement');
      expect(user2Settlements[0].netAmount.toString()).toBe('-50');
      expect(user2Settlements[0].owedToYou.toString()).toBe('0');
      expect(user2Settlements[0].owedByYou.toString()).toBe('50');
    });

    it('should calculate net settlements between multiple expenses', async () => {
      // User1 pays $120, split equally with User2
      const expense1 = await prisma.expense.create({
        data: {
          title: 'Dinner',
          amount: new Decimal('120.00'),
          userId: testUser1.id,
          groupId: testGroup.id,
        },
      });

      await createExpenseSplits({
        expenseId: expense1.id,
        splitType: SplitType.EQUAL,
        participants: [{ userId: testUser1.id }, { userId: testUser2.id }],
      });

      // User2 pays $80, split equally with User1
      const expense2 = await prisma.expense.create({
        data: {
          title: 'Lunch',
          amount: new Decimal('80.00'),
          userId: testUser2.id,
          groupId: testGroup.id,
        },
      });

      await createExpenseSplits({
        expenseId: expense2.id,
        splitType: SplitType.EQUAL,
        participants: [{ userId: testUser1.id }, { userId: testUser2.id }],
      });

      // Net: User1 should be owed $20 from User2 (60 - 40)
      const user1Settlements = await getUserSettlements(testUser1.id);
      expect(user1Settlements).toHaveLength(1);
      expect(user1Settlements[0].netAmount.toString()).toBe('20');
      expect(user1Settlements[0].owedToYou.toString()).toBe('60');
      expect(user1Settlements[0].owedByYou.toString()).toBe('40');

      // User2 should owe $20 to User1
      const user2Settlements = await getUserSettlements(testUser2.id);
      expect(user2Settlements).toHaveLength(1);
      expect(user2Settlements[0].netAmount.toString()).toBe('-20');
      expect(user2Settlements[0].owedToYou.toString()).toBe('40');
      expect(user2Settlements[0].owedByYou.toString()).toBe('60');
    });

    it('should handle multiple users and show settlements sorted by net amount', async () => {
      // User1 pays $150, split with User2 and User3
      const expense1 = await prisma.expense.create({
        data: {
          title: 'Groceries',
          amount: new Decimal('150.00'),
          userId: testUser1.id,
          groupId: testGroup.id,
        },
      });

      await createExpenseSplits({
        expenseId: expense1.id,
        splitType: SplitType.EQUAL,
        participants: [
          { userId: testUser1.id },
          { userId: testUser2.id },
          { userId: testUser3.id },
        ],
      });

      // User2 pays $60, split with User1
      const expense2 = await prisma.expense.create({
        data: {
          title: 'Coffee',
          amount: new Decimal('60.00'),
          userId: testUser2.id,
          groupId: testGroup.id,
        },
      });

      await createExpenseSplits({
        expenseId: expense2.id,
        splitType: SplitType.EQUAL,
        participants: [{ userId: testUser1.id }, { userId: testUser2.id }],
      });

      const user1Settlements = await getUserSettlements(testUser1.id);
      expect(user1Settlements).toHaveLength(2);

      // Should be sorted by net amount descending (User3 owes more than User2)
      expect(user1Settlements[0].userId).toBe(testUser3.id);
      expect(user1Settlements[0].netAmount.toString()).toBe('50'); // User3 owes $50
      expect(user1Settlements[1].userId).toBe(testUser2.id);
      expect(user1Settlements[1].netAmount.toString()).toBe('20'); // User2 owes $20 net (50 - 30)
    });

    it('should exclude paid splits from calculations', async () => {
      // User1 pays $100, split with User2
      const expense = await prisma.expense.create({
        data: {
          title: 'Dinner',
          amount: new Decimal('100.00'),
          userId: testUser1.id,
          groupId: testGroup.id,
        },
      });

      await createExpenseSplits({
        expenseId: expense.id,
        splitType: SplitType.EQUAL,
        participants: [{ userId: testUser1.id }, { userId: testUser2.id }],
      });

      // Mark User2's split as paid
      await prisma.expenseSplit.update({
        where: {
          expenseId_userId: { expenseId: expense.id, userId: testUser2.id },
        },
        data: { isPaid: true },
      });

      // Should show no settlements since the split is paid
      const user1Settlements = await getUserSettlements(testUser1.id);
      expect(user1Settlements).toHaveLength(0);

      const user2Settlements = await getUserSettlements(testUser2.id);
      expect(user2Settlements).toHaveLength(0);
    });
  });

  describe('getSettlementBetweenUsers', () => {
    it('should get detailed settlement between two users', async () => {
      // User1 pays $100, split by percentage with User2
      const expense1 = await prisma.expense.create({
        data: {
          title: 'Dinner',
          amount: new Decimal('100.00'),
          userId: testUser1.id,
          groupId: testGroup.id,
        },
      });

      await createExpenseSplits({
        expenseId: expense1.id,
        splitType: SplitType.PERCENTAGE,
        participants: [
          { userId: testUser1.id, percentage: 40 },
          { userId: testUser2.id, percentage: 60 },
        ],
      });

      // User2 pays $50, split equally with User1
      const expense2 = await prisma.expense.create({
        data: {
          title: 'Lunch',
          amount: new Decimal('50.00'),
          userId: testUser2.id,
          groupId: testGroup.id,
        },
      });

      await createExpenseSplits({
        expenseId: expense2.id,
        splitType: SplitType.EQUAL,
        participants: [{ userId: testUser1.id }, { userId: testUser2.id }],
      });

      const settlement = await getSettlementBetweenUsers(testUser1.id, testUser2.id);

      expect(settlement.user1.name).toBe('Alice Settlement');
      expect(settlement.user2.name).toBe('Bob Settlement');
      expect(settlement.user1OwesUser2.toString()).toBe('25'); // $25 from lunch
      expect(settlement.user2OwesUser1.toString()).toBe('60'); // $60 from dinner
      expect(settlement.netAmount.toString()).toBe('35'); // User2 owes User1 $35 net

      expect(settlement.splits).toHaveLength(2);
      expect(settlement.splits[0].expenseTitle).toBe('Lunch');
      expect(settlement.splits[0].amount.toString()).toBe('25');
      expect(settlement.splits[0].paidBy).toBe(testUser2.id);
      expect(settlement.splits[0].owedBy).toBe(testUser1.id);

      expect(settlement.splits[1].expenseTitle).toBe('Dinner');
      expect(settlement.splits[1].amount.toString()).toBe('60');
      expect(settlement.splits[1].paidBy).toBe(testUser1.id);
      expect(settlement.splits[1].owedBy).toBe(testUser2.id);
    });

    it('should throw error for non-existent user', async () => {
      await expect(
        getSettlementBetweenUsers(testUser1.id, 99999)
      ).rejects.toThrow('One or both users not found');
    });
  });

  describe('settleDebtBetweenUsers', () => {
    it('should settle all debts when no amount specified', async () => {
      // User1 pays $120, split equally with User2
      const expense1 = await prisma.expense.create({
        data: {
          title: 'Dinner',
          amount: new Decimal('120.00'),
          userId: testUser1.id,
          groupId: testGroup.id,
        },
      });

      await createExpenseSplits({
        expenseId: expense1.id,
        splitType: SplitType.EQUAL,
        participants: [{ userId: testUser1.id }, { userId: testUser2.id }],
      });

      // User2 settles all debts with User1
      const result = await settleDebtBetweenUsers(testUser2.id, testUser1.id);

      expect(result.settledAmount.toString()).toBe('60');
      expect(result.settledSplits).toBe(1);

      // Verify split is marked as paid
      const splits = await prisma.expenseSplit.findMany({
        where: { userId: testUser2.id, isPaid: true },
      });
      expect(splits).toHaveLength(1);
    });

    it('should settle partial amount when specified', async () => {
      // User1 pays $150, split equally with User2
      const expense = await prisma.expense.create({
        data: {
          title: 'Expensive Dinner',
          amount: new Decimal('150.00'),
          userId: testUser1.id,
          groupId: testGroup.id,
        },
      });

      await createExpenseSplits({
        expenseId: expense.id,
        splitType: SplitType.EQUAL,
        participants: [{ userId: testUser1.id }, { userId: testUser2.id }],
      });

      // User2 settles only $50 of the $75 owed
      const result = await settleDebtBetweenUsers(
        testUser2.id,
        testUser1.id,
        new Decimal('50')
      );

      expect(result.settledAmount.toString()).toBe('0'); // Can't partially settle a single split
      expect(result.settledSplits).toBe(0);
    });

    it('should return zero when no debts exist', async () => {
      const result = await settleDebtBetweenUsers(testUser2.id, testUser1.id);

      expect(result.settledAmount.toString()).toBe('0');
      expect(result.settledSplits).toBe(0);
    });

    it('should settle oldest debts first', async () => {
      // Create multiple small expenses
      const expense1 = await prisma.expense.create({
        data: {
          title: 'Coffee 1',
          amount: new Decimal('30.00'),
          userId: testUser1.id,
          groupId: testGroup.id,
        },
      });

      await createExpenseSplits({
        expenseId: expense1.id,
        splitType: SplitType.EQUAL,
        participants: [{ userId: testUser1.id }, { userId: testUser2.id }],
      });

      // Wait a bit to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));

      const expense2 = await prisma.expense.create({
        data: {
          title: 'Coffee 2',
          amount: new Decimal('40.00'),
          userId: testUser1.id,
          groupId: testGroup.id,
        },
      });

      await createExpenseSplits({
        expenseId: expense2.id,
        splitType: SplitType.EQUAL,
        participants: [{ userId: testUser1.id }, { userId: testUser2.id }],
      });

      // Settle $30 (should pay off first expense completely)
      const result = await settleDebtBetweenUsers(
        testUser2.id,
        testUser1.id,
        new Decimal('30')
      );

      expect(result.settledAmount.toString()).toBe('15'); // Only first split ($15)
      expect(result.settledSplits).toBe(1);

      // Verify only the first split is paid
      const paidSplits = await prisma.expenseSplit.findMany({
        where: { userId: testUser2.id, isPaid: true },
        include: { expense: true },
      });
      expect(paidSplits).toHaveLength(1);
      expect(paidSplits[0].expense.title).toBe('Coffee 1');
    });
  });
}); 