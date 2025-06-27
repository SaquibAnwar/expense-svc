import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import createApp from '../../src/app.js';
import { generateToken } from '../../src/utils/auth.js';

const prisma = new PrismaClient();

describe('/api/v1/expense-splits', () => {
  let app: FastifyInstance;
  let testUsers: any[];
  let testGroup: any;
  let testExpense: any;
  let authHeaders: Record<string, string>;

  beforeAll(async () => {
    app = await createApp();
    await app.ready();

    // Create test users
    testUsers = await Promise.all([
      prisma.user.create({
        data: {
          email: 'splituser1@test.com',
          name: 'Split User 1',
          password: 'hashedpassword1',
        },
      }),
      prisma.user.create({
        data: {
          email: 'splituser2@test.com',
          name: 'Split User 2',
          password: 'hashedpassword2',
        },
      }),
      prisma.user.create({
        data: {
          email: 'splituser3@test.com',
          name: 'Split User 3',
          password: 'hashedpassword3',
        },
      }),
    ]);

    // Create test group
    testGroup = await prisma.group.create({
      data: {
        name: 'Test Split Group',
        description: 'Group for testing expense splits',
        createdBy: testUsers[0].id,
      },
    });

    // Add users to group
    await prisma.groupMember.createMany({
      data: [
        { groupId: testGroup.id, userId: testUsers[0].id, role: 'ADMIN' },
        { groupId: testGroup.id, userId: testUsers[1].id, role: 'MEMBER' },
        { groupId: testGroup.id, userId: testUsers[2].id, role: 'MEMBER' },
      ],
    });

    // Generate auth tokens
    authHeaders = {
      user1: generateToken(testUsers[0]),
      user2: generateToken(testUsers[1]),
      user3: generateToken(testUsers[2]),
    };
  });

  beforeEach(async () => {
    // Create a fresh expense for each test
    testExpense = await prisma.expense.create({
      data: {
        title: 'Test Split Expense',
        description: 'Expense for testing splits',
        amount: new Decimal('120.00'),
        userId: testUsers[0].id,
        groupId: testGroup.id,
      },
    });
  });

  afterEach(async () => {
    // Clean up after each test
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

  describe('POST /expenses/:id/splits', () => {
    describe('Authentication & Authorization', () => {
      it('should require authentication', async () => {
        const response = await app.inject({
          method: 'POST',
          url: `/api/v1/expenses/${testExpense.id}/splits`,
          payload: {
            splitType: 'EQUAL',
            participants: [{ userId: testUsers[0].id }],
          },
        });

        expect(response.statusCode).toBe(400);
      });

      it('should require group membership for group expenses', async () => {
        // Create user not in group
        const outsideUser = await prisma.user.create({
          data: {
            email: 'outside@test.com',
            name: 'Outside User',
            password: 'password',
          },
        });

        const outsideToken = generateToken(outsideUser);

        const response = await app.inject({
          method: 'POST',
          url: `/api/v1/expenses/${testExpense.id}/splits`,
          headers: { authorization: `Bearer ${outsideToken}` },
          payload: {
            splitType: 'EQUAL',
            participants: [{ userId: testUsers[0].id }],
          },
        });

        expect(response.statusCode).toBe(403);
        expect(JSON.parse(response.payload).message).toContain('not a member of this group');

        // Cleanup
        await prisma.user.delete({ where: { id: outsideUser.id } });
      });

      it('should allow expense owner to create splits on personal expenses', async () => {
        // Create personal expense
        const personalExpense = await prisma.expense.create({
          data: {
            title: 'Personal Expense',
            amount: new Decimal('50.00'),
            userId: testUsers[0].id,
            // No groupId = personal expense
          },
        });

        const response = await app.inject({
          method: 'POST',
          url: `/api/v1/expenses/${personalExpense.id}/splits`,
          headers: { authorization: `Bearer ${authHeaders.user1}` },
          payload: {
            splitType: 'EQUAL',
            participants: [{ userId: testUsers[0].id }, { userId: testUsers[1].id }],
          },
        });

        expect(response.statusCode).toBe(201);

        await prisma.expense.delete({ where: { id: personalExpense.id } });
      });
    });

    describe('EQUAL splits', () => {
      it('should create equal splits successfully', async () => {
        const response = await app.inject({
          method: 'POST',
          url: `/api/v1/expenses/${testExpense.id}/splits`,
          headers: { authorization: `Bearer ${authHeaders.user1}` },
          payload: {
            splitType: 'EQUAL',
            participants: [
              { userId: testUsers[0].id },
              { userId: testUsers[1].id },
              { userId: testUsers[2].id },
            ],
          },
        });

        expect(response.statusCode).toBe(201);
        const result = JSON.parse(response.payload);
        expect(result.message).toBe('Splits created successfully');
        expect(result.splits).toHaveLength(3);
        expect(result.splits[0].amount).toBe('40'); // 120 / 3
        expect(result.splits[0].splitType).toBe('EQUAL');
        expect(result.splits[0].user.name).toBeDefined();
      });

      it('should handle two-way equal split', async () => {
        const response = await app.inject({
          method: 'POST',
          url: `/api/v1/expenses/${testExpense.id}/splits`,
          headers: { authorization: `Bearer ${authHeaders.user1}` },
          payload: {
            splitType: 'EQUAL',
            participants: [{ userId: testUsers[0].id }, { userId: testUsers[1].id }],
          },
        });

        expect(response.statusCode).toBe(201);
        const result = JSON.parse(response.payload);
        expect(result.splits).toHaveLength(2);
        expect(result.splits[0].amount).toBe('60'); // 120 / 2
      });
    });

    describe('AMOUNT splits', () => {
      it('should create amount splits successfully', async () => {
        const response = await app.inject({
          method: 'POST',
          url: `/api/v1/expenses/${testExpense.id}/splits`,
          headers: { authorization: `Bearer ${authHeaders.user1}` },
          payload: {
            splitType: 'AMOUNT',
            participants: [
              { userId: testUsers[0].id, amount: 50 },
              { userId: testUsers[1].id, amount: 30 },
              { userId: testUsers[2].id, amount: 40 },
            ],
          },
        });

        expect(response.statusCode).toBe(201);
        const result = JSON.parse(response.payload);
        expect(result.splits).toHaveLength(3);
        expect(result.splits[0].amount).toBe('50');
        expect(result.splits[1].amount).toBe('30');
        expect(result.splits[2].amount).toBe('40');
        expect(result.splits[0].splitType).toBe('AMOUNT');
      });

      it('should reject amounts that do not total the expense amount', async () => {
        const response = await app.inject({
          method: 'POST',
          url: `/api/v1/expenses/${testExpense.id}/splits`,
          headers: { authorization: `Bearer ${authHeaders.user1}` },
          payload: {
            splitType: 'AMOUNT',
            participants: [
              { userId: testUsers[0].id, amount: 50 },
              { userId: testUsers[1].id, amount: 30 }, // Total: 80, should be 120
            ],
          },
        });

        expect(response.statusCode).toBe(400);
        expect(JSON.parse(response.payload).message).toContain('must equal expense amount');
      });

      it('should reject missing amounts', async () => {
        const response = await app.inject({
          method: 'POST',
          url: `/api/v1/expenses/${testExpense.id}/splits`,
          headers: { authorization: `Bearer ${authHeaders.user1}` },
          payload: {
            splitType: 'AMOUNT',
            participants: [
              { userId: testUsers[0].id, amount: 120 },
              { userId: testUsers[1].id }, // Missing amount
            ],
          },
        });

        expect(response.statusCode).toBe(400);
        expect(JSON.parse(response.payload).message).toContain('positive amounts');
      });
    });

    describe('PERCENTAGE splits', () => {
      it('should create percentage splits successfully', async () => {
        const response = await app.inject({
          method: 'POST',
          url: `/api/v1/expenses/${testExpense.id}/splits`,
          headers: { authorization: `Bearer ${authHeaders.user1}` },
          payload: {
            splitType: 'PERCENTAGE',
            participants: [
              { userId: testUsers[0].id, percentage: 50 },
              { userId: testUsers[1].id, percentage: 30 },
              { userId: testUsers[2].id, percentage: 20 },
            ],
          },
        });

        expect(response.statusCode).toBe(201);
        const result = JSON.parse(response.payload);
        expect(result.splits).toHaveLength(3);
        expect(result.splits[0].amount).toBe('60'); // 50% of 120
        expect(result.splits[1].amount).toBe('36'); // 30% of 120
        expect(result.splits[2].amount).toBe('24'); // 20% of 120
        expect(result.splits[0].percentage).toBe(50);
        expect(result.splits[0].splitType).toBe('PERCENTAGE');
      });

      it('should reject percentages that do not total 100%', async () => {
        const response = await app.inject({
          method: 'POST',
          url: `/api/v1/expenses/${testExpense.id}/splits`,
          headers: { authorization: `Bearer ${authHeaders.user1}` },
          payload: {
            splitType: 'PERCENTAGE',
            participants: [
              { userId: testUsers[0].id, percentage: 60 },
              { userId: testUsers[1].id, percentage: 30 }, // Total: 90%, should be 100%
            ],
          },
        });

        expect(response.statusCode).toBe(400);
        expect(JSON.parse(response.payload).message).toContain('must total 100%');
      });
    });

    describe('Validation', () => {
      it('should reject non-group members as participants', async () => {
        const outsideUser = await prisma.user.create({
          data: {
            email: 'outsider@test.com',
            name: 'Outsider',
            password: 'password',
          },
        });

        const response = await app.inject({
          method: 'POST',
          url: `/api/v1/expenses/${testExpense.id}/splits`,
          headers: { authorization: `Bearer ${authHeaders.user1}` },
          payload: {
            splitType: 'EQUAL',
            participants: [
              { userId: testUsers[0].id },
              { userId: outsideUser.id }, // Not a group member
            ],
          },
        });

        expect(response.statusCode).toBe(400);
        expect(JSON.parse(response.payload).message).toContain('not a member of this group');

        await prisma.user.delete({ where: { id: outsideUser.id } });
      });

      it('should reject creating splits when they already exist', async () => {
        // Create splits first
        await app.inject({
          method: 'POST',
          url: `/api/v1/expenses/${testExpense.id}/splits`,
          headers: { authorization: `Bearer ${authHeaders.user1}` },
          payload: {
            splitType: 'EQUAL',
            participants: [{ userId: testUsers[0].id }],
          },
        });

        // Try to create splits again
        const response = await app.inject({
          method: 'POST',
          url: `/api/v1/expenses/${testExpense.id}/splits`,
          headers: { authorization: `Bearer ${authHeaders.user1}` },
          payload: {
            splitType: 'EQUAL',
            participants: [{ userId: testUsers[1].id }],
          },
        });

        expect(response.statusCode).toBe(400);
        expect(JSON.parse(response.payload).message).toContain('Splits already exist');
      });

      it('should reject invalid expense ID', async () => {
        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/expenses/invalid/splits',
          headers: { authorization: `Bearer ${authHeaders.user1}` },
          payload: {
            splitType: 'EQUAL',
            participants: [{ userId: testUsers[0].id }],
          },
        });

        expect(response.statusCode).toBe(400);
        expect(JSON.parse(response.payload).message).toBe('Invalid expense ID');
      });

      it('should reject non-existent expense', async () => {
        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/expenses/99999/splits',
          headers: { authorization: `Bearer ${authHeaders.user1}` },
          payload: {
            splitType: 'EQUAL',
            participants: [{ userId: testUsers[0].id }],
          },
        });

        expect(response.statusCode).toBe(404);
        expect(JSON.parse(response.payload).message).toBe('Expense not found');
      });
    });
  });

  describe('GET /expenses/:id/splits', () => {
    beforeEach(async () => {
      // Create splits for testing
      await app.inject({
        method: 'POST',
        url: `/api/v1/expenses/${testExpense.id}/splits`,
        headers: { authorization: `Bearer ${authHeaders.user1}` },
        payload: {
          splitType: 'EQUAL',
          participants: [{ userId: testUsers[0].id }, { userId: testUsers[1].id }],
        },
      });
    });

    it('should return expense splits', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/expenses/${testExpense.id}/splits`,
        headers: { authorization: `Bearer ${authHeaders.user1}` },
      });

      expect(response.statusCode).toBe(200);
      const splits = JSON.parse(response.payload);
      expect(splits).toHaveLength(2);
      expect(splits[0].amount).toBe('60');
      expect(splits[0].user.name).toBeDefined();
    });

    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/expenses/${testExpense.id}/splits`,
      });

      expect(response.statusCode).toBe(400);
    });

    it('should require access to expense', async () => {
      const outsideUser = await prisma.user.create({
        data: {
          email: 'outside2@test.com',
          name: 'Outside User 2',
          password: 'password',
        },
      });

      const outsideToken = generateToken(outsideUser);

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/expenses/${testExpense.id}/splits`,
        headers: { authorization: `Bearer ${outsideToken}` },
      });

      expect(response.statusCode).toBe(403);

      await prisma.user.delete({ where: { id: outsideUser.id } });
    });
  });

  describe('GET /splits/my-splits', () => {
    beforeEach(async () => {
      // Create splits where user1 has some splits
      await app.inject({
        method: 'POST',
        url: `/api/v1/expenses/${testExpense.id}/splits`,
        headers: { authorization: `Bearer ${authHeaders.user1}` },
        payload: {
          splitType: 'EQUAL',
          participants: [{ userId: testUsers[0].id }, { userId: testUsers[1].id }],
        },
      });
    });

    it('should return user splits', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/splits/my-splits',
        headers: { authorization: `Bearer ${authHeaders.user1}` },
      });

      expect(response.statusCode).toBe(200);
      const splits = JSON.parse(response.payload);
      expect(splits).toHaveLength(1);
      expect(splits[0].expense.title).toBe('Test Split Expense');
    });

    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/splits/my-splits',
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /splits/balance-summary', () => {
    it('should return balance summary', async () => {
      // Create splits
      await app.inject({
        method: 'POST',
        url: `/api/v1/expenses/${testExpense.id}/splits`,
        headers: { authorization: `Bearer ${authHeaders.user1}` },
        payload: {
          splitType: 'EQUAL',
          participants: [{ userId: testUsers[0].id }, { userId: testUsers[1].id }],
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/splits/balance-summary',
        headers: { authorization: `Bearer ${authHeaders.user2}` },
      });

      expect(response.statusCode).toBe(200);
      const summary = JSON.parse(response.payload);
      expect(summary.owes).toBe('60'); // User2 owes 60 to User1
      expect(summary.owed).toBe('0');
      expect(summary.netBalance).toBe('-60');
    });

    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/splits/balance-summary',
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('PUT /splits/:expenseId/:userId/mark-paid', () => {
    beforeEach(async () => {
      // Create splits
      await app.inject({
        method: 'POST',
        url: `/api/v1/expenses/${testExpense.id}/splits`,
        headers: { authorization: `Bearer ${authHeaders.user1}` },
        payload: {
          splitType: 'EQUAL',
          participants: [{ userId: testUsers[0].id }, { userId: testUsers[1].id }],
        },
      });
    });

    it('should mark split as paid', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/v1/splits/${testExpense.id}/${testUsers[1].id}/mark-paid`,
        headers: { authorization: `Bearer ${authHeaders.user1}` },
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      expect(result.split.isPaid).toBe(true);
    });

    it('should require expense ownership to mark paid', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/v1/splits/${testExpense.id}/${testUsers[1].id}/mark-paid`,
        headers: { authorization: `Bearer ${authHeaders.user2}` }, // User2, not expense owner
      });

      expect(response.statusCode).toBe(403);
      expect(JSON.parse(response.payload).message).toContain('Only the expense owner');
    });

    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/v1/splits/${testExpense.id}/${testUsers[1].id}/mark-paid`,
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
