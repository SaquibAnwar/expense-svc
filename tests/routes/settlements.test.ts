import { FastifyInstance } from 'fastify';
import { PrismaClient, SplitType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import buildApp from '../../src/app.js';
import { generateToken } from '../../src/utils/auth.js';
import { createExpenseSplits } from '../../src/repositories/expenseSplitRepo.js';

const prisma = new PrismaClient();

describe('Settlements API', () => {
  let app: FastifyInstance;
  let testUsers: any[];
  let testGroup: any;
  let authHeaders: any;

  beforeAll(async () => {
    app = await buildApp();

    // Create test users
    const userData = [
      { email: 'settlement-api1@test.com', name: 'Alice API', password: 'password123' },
      { email: 'settlement-api2@test.com', name: 'Bob API', password: 'password123' },
      { email: 'settlement-api3@test.com', name: 'Charlie API', password: 'password123' },
    ];

    testUsers = [];
    for (const user of userData) {
      const createdUser = await prisma.user.create({ data: user });
      testUsers.push(createdUser);
    }

    // Create test group
    testGroup = await prisma.group.create({
      data: {
        name: 'Settlement API Test Group',
        description: 'Test group for settlement API',
        createdBy: testUsers[0].id,
      },
    });

    // Add users to group
    await prisma.groupMember.createMany({
      data: testUsers.map((user, index) => ({
        groupId: testGroup.id,
        userId: user.id,
        role: index === 0 ? 'ADMIN' : 'MEMBER',
      })),
    });

    // Generate auth tokens
    authHeaders = {
      user1: generateToken(testUsers[0]),
      user2: generateToken(testUsers[1]),
      user3: generateToken(testUsers[2]),
    };
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
    await app.close();
  });

  describe('GET /api/v1/settlements', () => {
    it('should get user settlements', async () => {
      // Create expense paid by User1, split with User2
      const expense = await prisma.expense.create({
        data: {
          title: 'Dinner',
          amount: new Decimal('100.00'),
          userId: testUsers[0].id,
          groupId: testGroup.id,
        },
      });

      await createExpenseSplits({
        expenseId: expense.id,
        splitType: SplitType.EQUAL,
        participants: [{ userId: testUsers[0].id }, { userId: testUsers[1].id }],
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/settlements',
        headers: { authorization: `Bearer ${authHeaders.user1}` },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.settlements).toHaveLength(1);
      expect(data.settlements[0].userId).toBe(testUsers[1].id);
      expect(data.settlements[0].name).toBe('Bob API');
      expect(data.settlements[0].netAmount).toBe('50');
      expect(data.settlements[0].owedToYou).toBe('50');
      expect(data.settlements[0].owedByYou).toBe('0');
    });

    it('should return empty array when no settlements exist', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/settlements',
        headers: { authorization: `Bearer ${authHeaders.user1}` },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.settlements).toHaveLength(0);
    });

    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/settlements',
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/v1/settlements/:otherUserId', () => {
    it('should get detailed settlement between two users', async () => {
      // User1 pays $100, split 60-40 with User2
      const expense1 = await prisma.expense.create({
        data: {
          title: 'Dinner',
          amount: new Decimal('100.00'),
          userId: testUsers[0].id,
          groupId: testGroup.id,
        },
      });

      await createExpenseSplits({
        expenseId: expense1.id,
        splitType: SplitType.PERCENTAGE,
        participants: [
          { userId: testUsers[0].id, percentage: 40 },
          { userId: testUsers[1].id, percentage: 60 },
        ],
      });

      // User2 pays $50, split equally with User1
      const expense2 = await prisma.expense.create({
        data: {
          title: 'Lunch',
          amount: new Decimal('50.00'),
          userId: testUsers[1].id,
          groupId: testGroup.id,
        },
      });

      await createExpenseSplits({
        expenseId: expense2.id,
        splitType: SplitType.EQUAL,
        participants: [{ userId: testUsers[0].id }, { userId: testUsers[1].id }],
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/settlements/${testUsers[1].id}`,
        headers: { authorization: `Bearer ${authHeaders.user1}` },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.user1.name).toBe('Alice API');
      expect(data.user2.name).toBe('Bob API');
      expect(data.user1OwesUser2).toBe('25'); // $25 from lunch
      expect(data.user2OwesUser1).toBe('60'); // $60 from dinner
      expect(data.netAmount).toBe('35'); // User2 owes User1 $35 net
      expect(data.splits).toHaveLength(2);
    });

    it('should return 404 for non-existent user', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/settlements/99999',
        headers: { authorization: `Bearer ${authHeaders.user1}` },
      });

      expect(response.statusCode).toBe(404);
      const data = JSON.parse(response.body);
      expect(data.message).toBe('User not found');
    });

    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/settlements/${testUsers[1].id}`,
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /api/v1/settlements/:otherUserId/settle', () => {
    it('should settle all debts when no amount specified', async () => {
      // User1 pays $100, split equally with User2
      const expense = await prisma.expense.create({
        data: {
          title: 'Dinner',
          amount: new Decimal('100.00'),
          userId: testUsers[0].id,
          groupId: testGroup.id,
        },
      });

      await createExpenseSplits({
        expenseId: expense.id,
        splitType: SplitType.EQUAL,
        participants: [{ userId: testUsers[0].id }, { userId: testUsers[1].id }],
      });

      // User2 settles debt with User1
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/settlements/${testUsers[0].id}/settle`,
        headers: { authorization: `Bearer ${authHeaders.user2}` },
        payload: {},
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.settledAmount).toBe('50');
      expect(data.settledSplits).toBe(1);
      expect(data.message).toContain('Successfully settled 50');

      // Verify split is marked as paid
      const split = await prisma.expenseSplit.findFirst({
        where: { userId: testUsers[1].id, expenseId: expense.id },
      });
      expect(split?.isPaid).toBe(true);
    });

    it('should return 400 when trying to settle debt with yourself', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/settlements/${testUsers[0].id}/settle`,
        headers: { authorization: `Bearer ${authHeaders.user1}` },
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      const data = JSON.parse(response.body);
      expect(data.message).toBe('Cannot settle debt with yourself');
    });

    it('should return 400 when no debts exist to settle', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/settlements/${testUsers[0].id}/settle`,
        headers: { authorization: `Bearer ${authHeaders.user2}` },
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      const data = JSON.parse(response.body);
      expect(data.message).toBe('No debts found to settle');
    });

    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/settlements/${testUsers[0].id}/settle`,
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
