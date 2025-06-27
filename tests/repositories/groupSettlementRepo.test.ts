import { PrismaClient, SplitType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import {
  getGroupSettlements,
  getGroupMemberDebts,
  executeGroupSettlement,
  createExpenseSplits,
} from '../../src/repositories/expenseSplitRepo.js';

const prisma = new PrismaClient();

describe('Group Settlement Repository', () => {
  let testUser1: any;
  let testUser2: any;
  let testUser3: any;
  let testGroup: any;

  beforeAll(async () => {
    // Create test users
    testUser1 = await prisma.user.create({
      data: {
        name: 'Alice Test',
        email: 'alice.group@test.com',
        password: 'password123',
      },
    });

    testUser2 = await prisma.user.create({
      data: {
        name: 'Bob Test',
        email: 'bob.group@test.com',
        password: 'password123',
      },
    });

    testUser3 = await prisma.user.create({
      data: {
        name: 'Charlie Test',
        email: 'charlie.group@test.com',
        password: 'password123',
      },
    });

    // Create test group with all users
    testGroup = await prisma.group.create({
      data: {
        name: 'Test Group Settlement',
        createdBy: testUser1.id,
      },
    });

    // Add members to group
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

  describe('getGroupSettlements', () => {
    it('should calculate optimized settlements for simple case', async () => {
      // Alice pays $90, split equally among 3 users ($30 each)
      const expense1 = await prisma.expense.create({
        data: {
          title: 'Dinner',
          amount: new Decimal('90'),
          groupId: testGroup.id,
          userId: testUser1.id,
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

      const settlements = await getGroupSettlements(testGroup.id);

      expect(settlements.groupId).toBe(testGroup.id);
      expect(settlements.groupName).toBe('Test Group Settlement');
      expect(settlements.members).toHaveLength(3);

      // Alice should receive $60 (paid $90, owes $30)
      const alice = settlements.members.find(m => m.userId === testUser1.id);
      expect(alice?.netBalance.toString()).toBe('60');

      // Bob and Charlie should pay $30 each
      const bob = settlements.members.find(m => m.userId === testUser2.id);
      const charlie = settlements.members.find(m => m.userId === testUser3.id);
      expect(bob?.netBalance.toString()).toBe('-30');
      expect(charlie?.netBalance.toString()).toBe('-30');

      // Should have optimized transactions (2 payments to Alice)
      expect(settlements.optimizedTransactions).toHaveLength(2);
      expect(settlements.totalDebt.toString()).toBe('60');
    });

    it('should optimize complex multi-expense settlements', async () => {
      // Alice pays $150, split equally among 3 users ($50 each)
      const expense1 = await prisma.expense.create({
        data: {
          title: 'Groceries',
          amount: new Decimal('150'),
          groupId: testGroup.id,
          userId: testUser1.id,
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

      // Bob pays $90, split equally among 3 users ($30 each)
      const expense2 = await prisma.expense.create({
        data: {
          title: 'Gas',
          amount: new Decimal('90'),
          groupId: testGroup.id,
          userId: testUser2.id,
        },
      });

      await createExpenseSplits({
        expenseId: expense2.id,
        splitType: SplitType.EQUAL,
        participants: [
          { userId: testUser1.id },
          { userId: testUser2.id },
          { userId: testUser3.id },
        ],
      });

      // Charlie pays $60, split equally among 3 users ($20 each)
      const expense3 = await prisma.expense.create({
        data: {
          title: 'Lunch',
          amount: new Decimal('60'),
          groupId: testGroup.id,
          userId: testUser3.id,
        },
      });

      await createExpenseSplits({
        expenseId: expense3.id,
        splitType: SplitType.EQUAL,
        participants: [
          { userId: testUser1.id },
          { userId: testUser2.id },
          { userId: testUser3.id },
        ],
      });

      const settlements = await getGroupSettlements(testGroup.id);

      const alice = settlements.members.find(m => m.userId === testUser1.id);
      const bob = settlements.members.find(m => m.userId === testUser2.id);
      const charlie = settlements.members.find(m => m.userId === testUser3.id);

      // Calculate expected values:
      // Total paid: $150 + $90 + $60 = $300
      // Each person's share: $300 / 3 = $100
      // Alice: paid $150, owes $100, net = +$50
      // Bob: paid $90, owes $100, net = -$10
      // Charlie: paid $60, owes $100, net = -$40

      expect(alice?.netBalance.toString()).toBe('50');
      expect(bob?.netBalance.toString()).toBe('-10');
      expect(charlie?.netBalance.toString()).toBe('-40');

      // Should have optimized transactions (minimal number)
      expect(settlements.optimizedTransactions.length).toBeLessThanOrEqual(2);
      expect(settlements.totalDebt.toString()).toBe('50');
    });

    it('should handle group with no debts', async () => {
      const settlements = await getGroupSettlements(testGroup.id);

      expect(settlements.members).toHaveLength(3);
      settlements.members.forEach(member => {
        expect(member.netBalance.toString()).toBe('0');
      });
      expect(settlements.optimizedTransactions).toHaveLength(0);
      expect(settlements.totalDebt.toString()).toBe('0');
    });

    it('should throw error for non-existent group', async () => {
      await expect(getGroupSettlements(99999)).rejects.toThrow('Group not found');
    });
  });

  describe('getGroupMemberDebts', () => {
    it('should calculate individual member debt breakdown', async () => {
      // Alice pays $90, split equally
      const expense1 = await prisma.expense.create({
        data: {
          title: 'Dinner',
          amount: new Decimal('90'),
          groupId: testGroup.id,
          userId: testUser1.id,
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

      const memberDebts = await getGroupMemberDebts(testGroup.id);

      expect(memberDebts.groupId).toBe(testGroup.id);
      expect(memberDebts.memberDebts).toHaveLength(3);

      // Alice should have totalOwed = $60, totalOwes = $0, netBalance = $60
      const alice = memberDebts.memberDebts.find(m => m.member.id === testUser1.id);
      expect(alice?.totalOwed.toString()).toBe('60');
      expect(alice?.totalOwes.toString()).toBe('0');
      expect(alice?.netBalance.toString()).toBe('60');

      // Bob and Charlie should have totalOwed = $0, totalOwes = $30, netBalance = -$30
      const bob = memberDebts.memberDebts.find(m => m.member.id === testUser2.id);
      const charlie = memberDebts.memberDebts.find(m => m.member.id === testUser3.id);

      expect(bob?.totalOwed.toString()).toBe('0');
      expect(bob?.totalOwes.toString()).toBe('30');
      expect(bob?.netBalance.toString()).toBe('-30');

      expect(charlie?.totalOwed.toString()).toBe('0');
      expect(charlie?.totalOwes.toString()).toBe('30');
      expect(charlie?.netBalance.toString()).toBe('-30');
    });

    it('should sort members by net balance descending', async () => {
      // Create expenses with different amounts to create varied balances
      const expense1 = await prisma.expense.create({
        data: {
          title: 'Small expense',
          amount: new Decimal('30'),
          groupId: testGroup.id,
          userId: testUser3.id, // Charlie pays
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

      const expense2 = await prisma.expense.create({
        data: {
          title: 'Large expense',
          amount: new Decimal('120'),
          groupId: testGroup.id,
          userId: testUser1.id, // Alice pays
        },
      });

      await createExpenseSplits({
        expenseId: expense2.id,
        splitType: SplitType.EQUAL,
        participants: [
          { userId: testUser1.id },
          { userId: testUser2.id },
          { userId: testUser3.id },
        ],
      });

      const memberDebts = await getGroupMemberDebts(testGroup.id);

      // Members should be sorted by net balance descending
      // Alice: +$80, Charlie: +$20, Bob: -$50
      expect(memberDebts.memberDebts[0].member.id).toBe(testUser1.id); // Alice (highest)
      expect(memberDebts.memberDebts[1].member.id).toBe(testUser3.id); // Charlie
      expect(memberDebts.memberDebts[2].member.id).toBe(testUser2.id); // Bob (lowest)
    });
  });

  describe('executeGroupSettlement', () => {
    beforeEach(async () => {
      // Create a debt scenario for testing settlements
      const expense = await prisma.expense.create({
        data: {
          title: 'Test Expense',
          amount: new Decimal('90'),
          groupId: testGroup.id,
          userId: testUser1.id,
        },
      });

      await createExpenseSplits({
        expenseId: expense.id,
        splitType: SplitType.EQUAL,
        participants: [
          { userId: testUser1.id },
          { userId: testUser2.id },
          { userId: testUser3.id },
        ],
      });
    });

    it('should execute group settlement transactions', async () => {
      const transactions = [
        {
          fromUserId: testUser2.id,
          toUserId: testUser1.id,
          amount: new Decimal('30'),
        },
        {
          fromUserId: testUser3.id,
          toUserId: testUser1.id,
          amount: new Decimal('30'),
        },
      ];

      const result = await executeGroupSettlement(testGroup.id, transactions);

      expect(result.settledAmount.toString()).toBe('60');
      expect(result.settledSplits).toBe(2);
      expect(result.transactions).toBe(2);
    });

    it('should handle partial settlements (no splits settled when amount is less than split)', async () => {
      const transactions = [
        {
          fromUserId: testUser2.id,
          toUserId: testUser1.id,
          amount: new Decimal('15'), // Partial payment - less than $30 split
        },
      ];

      const result = await executeGroupSettlement(testGroup.id, transactions);

      // Since partial settlements aren't supported and the split is $30 but payment is $15,
      // no splits should be marked as paid
      expect(result.settledAmount.toString()).toBe('0');
      expect(result.settledSplits).toBe(0);
      expect(result.transactions).toBe(1); // Transaction count is always the input length
    });

    it('should handle zero transactions', async () => {
      const result = await executeGroupSettlement(testGroup.id, []);

      expect(result.settledAmount.toString()).toBe('0');
      expect(result.settledSplits).toBe(0);
      expect(result.transactions).toBe(0);
    });
  });
});
