import { FastifyInstance } from 'fastify';
import { PrismaClient, SplitType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { generateToken } from '../../src/utils/auth.js';
import buildApp from '../../src/app.js';

const prisma = new PrismaClient();
let app: FastifyInstance;

describe('Group Settlements API', () => {
  let testUser1: any;
  let testUser2: any;
  let testUser3: any;
  let testGroup: any;
  let authToken1: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

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

    // Create test group
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

    // Generate auth tokens
    authToken1 = generateToken(testUser1);

    // Create some expenses with splits for testing
    const expense1 = await prisma.expense.create({
      data: {
        title: 'Dinner',
        amount: new Decimal('90'),
        groupId: testGroup.id,
        userId: testUser1.id,
      },
    });

    // Create equal splits for the expense
    await prisma.expenseSplit.createMany({
      data: [
        {
          expenseId: expense1.id,
          userId: testUser1.id,
          amount: new Decimal('30'),
          splitType: SplitType.EQUAL,
          isPaid: false,
        },
        {
          expenseId: expense1.id,
          userId: testUser2.id,
          amount: new Decimal('30'),
          splitType: SplitType.EQUAL,
          isPaid: false,
        },
        {
          expenseId: expense1.id,
          userId: testUser3.id,
          amount: new Decimal('30'),
          splitType: SplitType.EQUAL,
          isPaid: false,
        },
      ],
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.expenseSplit.deleteMany({});
    await prisma.expense.deleteMany({});
    await prisma.groupMember.deleteMany({});
    await prisma.group.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
    await app.close();
  });

  describe('GET /api/v1/settlements/groups/:groupId', () => {
    it('should get optimized group settlements', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/settlements/groups/${testGroup.id}`,
        headers: {
          authorization: `Bearer ${authToken1}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);

      expect(data.groupId).toBe(testGroup.id);
      expect(data.groupName).toBe('Test Group Settlement');
      expect(data.members).toHaveLength(3);

      // Alice should have positive balance (she paid)
      const alice = data.members.find((m: any) => m.userId === testUser1.id);
      expect(parseFloat(alice.netBalance)).toBe(60); // paid 90, owes 30

      // Bob and Charlie should have negative balance (they owe)
      const bob = data.members.find((m: any) => m.userId === testUser2.id);
      const charlie = data.members.find((m: any) => m.userId === testUser3.id);
      expect(parseFloat(bob.netBalance)).toBe(-30);
      expect(parseFloat(charlie.netBalance)).toBe(-30);

      // Should have optimized transactions
      expect(data.optimizedTransactions).toHaveLength(2);
      expect(parseFloat(data.totalDebt)).toBe(60);
    });

    it('should return 403 for non-group member', async () => {
      // Create a user not in the group
      const outsideUser = await prisma.user.create({
        data: {
          name: 'Outsider',
          email: 'outsider@test.com',
          password: 'password123',
        },
      });

      const outsideToken = generateToken(outsideUser);

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/settlements/groups/${testGroup.id}`,
        headers: {
          authorization: `Bearer ${outsideToken}`,
        },
      });

      expect(response.statusCode).toBe(403);

      // Clean up
      await prisma.user.delete({ where: { id: outsideUser.id } });
    });

    it('should return 403 for non-existent group', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/settlements/groups/99999`,
        headers: {
          authorization: `Bearer ${authToken1}`,
        },
      });

      expect(response.statusCode).toBe(403); // User is not a member of non-existent group
    });
  });

  describe('GET /api/v1/settlements/groups/:groupId/debts', () => {
    it('should get group member debt breakdown', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/settlements/groups/${testGroup.id}/debts`,
        headers: {
          authorization: `Bearer ${authToken1}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);

      expect(data.groupId).toBe(testGroup.id);
      expect(data.memberDebts).toHaveLength(3);

      // Check debt breakdown
      const alice = data.memberDebts.find((m: any) => m.member.id === testUser1.id);
      expect(parseFloat(alice.totalOwed)).toBe(60); // Others owe Alice $60
      expect(parseFloat(alice.totalOwes)).toBe(0);
      expect(parseFloat(alice.netBalance)).toBe(60);

      const bob = data.memberDebts.find((m: any) => m.member.id === testUser2.id);
      expect(parseFloat(bob.totalOwed)).toBe(0);
      expect(parseFloat(bob.totalOwes)).toBe(30);
      expect(parseFloat(bob.netBalance)).toBe(-30);
    });
  });

  describe('POST /api/v1/settlements/groups/:groupId/settle', () => {
    it('should execute group settlement for admin', async () => {
      const transactions = [
        {
          fromUserId: testUser2.id,
          toUserId: testUser1.id,
          amount: 30,
        },
        {
          fromUserId: testUser3.id,
          toUserId: testUser1.id,
          amount: 30,
        },
      ];

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/settlements/groups/${testGroup.id}/settle`,
        headers: {
          authorization: `Bearer ${authToken1}`,
        },
        payload: { transactions },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);

      expect(parseFloat(data.settledAmount)).toBe(60);
      expect(data.settledSplits).toBe(2);
      expect(data.transactions).toBe(2);
      expect(data.message).toContain('Successfully executed group settlement');
    });

    it('should return 403 for non-admin user', async () => {
      const memberToken = generateToken(testUser2);

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/settlements/groups/${testGroup.id}/settle`,
        headers: {
          authorization: `Bearer ${memberToken}`,
        },
        payload: {
          transactions: [
            {
              fromUserId: testUser2.id,
              toUserId: testUser1.id,
              amount: 30,
            },
          ],
        },
      });

      expect(response.statusCode).toBe(403);
    });
  });
});
