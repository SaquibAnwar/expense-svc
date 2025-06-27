import createApp from '../../src/app.js';
import { PrismaClient } from '@prisma/client';
import { createUser, verifyPassword } from '../../src/repositories/userRepo.js';
import { generateToken } from '../../src/utils/auth.js';

const prisma = new PrismaClient();

// Helper function for login in tests
async function loginUser(email: string, password: string) {
  const user = await verifyPassword(email, password);
  if (!user) {
    throw new Error('Invalid credentials');
  }
  return {
    user,
    token: generateToken(user),
  };
}

describe('Friends API Routes', () => {
  let app: any;
  let users: any[] = [];
  let authTokens: string[] = [];

  const testUsers = [
    {
      email: 'alice@friendtest.com',
      name: 'Alice Friend',
      username: 'alice_friend',
      password: 'password123',
    },
    {
      email: 'bob@friendtest.com',
      name: 'Bob Friend',
      username: 'bob_friend',
      password: 'password123',
    },
    {
      email: 'charlie@friendtest.com',
      name: 'Charlie Friend',
      username: 'charlie_friend',
      password: 'password123',
    },
    {
      email: 'diana@friendtest.com',
      name: 'Diana Friend',
      username: 'diana_friend',
      password: 'password123',
    },
  ];

  beforeAll(async () => {
    app = await createApp();
    await app.ready();
  });

  beforeEach(async () => {
    // Create test users and get auth tokens
    users = [];
    authTokens = [];

    for (const userData of testUsers) {
      const user = await createUser({ ...userData, provider: 'local' });
      users.push(user);

      const loginResult = await loginUser(userData.email, userData.password);
      authTokens.push(loginResult.token);
    }
  });

  afterEach(async () => {
    // Clean up test data
    await (prisma as any).friendRequest.deleteMany();
    await (prisma as any).friendship.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/friends/requests', () => {
    it('should send friend request by email', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/friends/requests',
        headers: {
          authorization: `Bearer ${authTokens[0]}`,
        },
        payload: {
          email: users[1].email,
          message: "Let's be friends!",
        },
      });

      expect(response.statusCode).toBe(201);
      const data = JSON.parse(response.payload);
      expect(data.id).toBeDefined();
      expect(data.message).toBe("Let's be friends!");
      expect(data.receiver.id).toBe(users[1].id);
      expect(data.receiver.name).toBe(users[1].name);
    });

    it('should send friend request by user ID', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/friends/requests',
        headers: {
          authorization: `Bearer ${authTokens[0]}`,
        },
        payload: {
          userId: users[1].id,
          message: 'Hello friend!',
        },
      });

      expect(response.statusCode).toBe(201);
      const data = JSON.parse(response.payload);
      expect(data.receiver.id).toBe(users[1].id);
    });

    it('should return 400 for sending request to yourself', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/friends/requests',
        headers: {
          authorization: `Bearer ${authTokens[0]}`,
        },
        payload: {
          userId: users[0].id,
        },
      });

      expect(response.statusCode).toBe(400);
      const data = JSON.parse(response.payload);
      expect(data.message).toContain('Cannot send friend request to yourself');
    });

    it('should return 404 for non-existent email', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/friends/requests',
        headers: {
          authorization: `Bearer ${authTokens[0]}`,
        },
        payload: {
          email: 'nonexistent@example.com',
        },
      });

      expect(response.statusCode).toBe(404);
      const data = JSON.parse(response.payload);
      expect(data.message).toBe('User not found');
    });

    it('should return 400 without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/friends/requests',
        payload: {
          email: users[1].email,
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should prevent duplicate friend requests', async () => {
      // Send first request
      await app.inject({
        method: 'POST',
        url: '/api/v1/friends/requests',
        headers: {
          authorization: `Bearer ${authTokens[0]}`,
        },
        payload: {
          userId: users[1].id,
        },
      });

      // Try to send duplicate
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/friends/requests',
        headers: {
          authorization: `Bearer ${authTokens[0]}`,
        },
        payload: {
          userId: users[1].id,
        },
      });

      expect(response.statusCode).toBe(400);
      const data = JSON.parse(response.payload);
      expect(data.message).toContain('Friend request already exists');
    });
  });

  describe('GET /api/v1/friends/requests/sent', () => {
    it('should return sent friend requests', async () => {
      // Send some friend requests
      await app.inject({
        method: 'POST',
        url: '/api/v1/friends/requests',
        headers: {
          authorization: `Bearer ${authTokens[0]}`,
        },
        payload: {
          userId: users[1].id,
          message: 'Request 1',
        },
      });

      await app.inject({
        method: 'POST',
        url: '/api/v1/friends/requests',
        headers: {
          authorization: `Bearer ${authTokens[0]}`,
        },
        payload: {
          userId: users[2].id,
          message: 'Request 2',
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/friends/requests/sent',
        headers: {
          authorization: `Bearer ${authTokens[0]}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data).toHaveLength(2);
      expect(data[0].receiver).toBeDefined();
      expect(data[1].receiver).toBeDefined();
    });

    it('should return empty array when no sent requests', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/friends/requests/sent',
        headers: {
          authorization: `Bearer ${authTokens[0]}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data).toHaveLength(0);
    });
  });

  describe('GET /api/v1/friends/requests/received', () => {
    it('should return received friend requests', async () => {
      // Send requests to user 1
      await app.inject({
        method: 'POST',
        url: '/api/v1/friends/requests',
        headers: {
          authorization: `Bearer ${authTokens[0]}`,
        },
        payload: {
          userId: users[1].id,
          message: 'From Alice',
        },
      });

      await app.inject({
        method: 'POST',
        url: '/api/v1/friends/requests',
        headers: {
          authorization: `Bearer ${authTokens[2]}`,
        },
        payload: {
          userId: users[1].id,
          message: 'From Charlie',
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/friends/requests/received',
        headers: {
          authorization: `Bearer ${authTokens[1]}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data).toHaveLength(2);
      expect(data[0].sender).toBeDefined();
      expect(data[1].sender).toBeDefined();
    });
  });

  describe('PATCH /api/v1/friends/requests/:id', () => {
    let friendRequestId: number;

    beforeEach(async () => {
      // Create a friend request
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/friends/requests',
        headers: {
          authorization: `Bearer ${authTokens[0]}`,
        },
        payload: {
          userId: users[1].id,
          message: 'Test request',
        },
      });

      const data = JSON.parse(response.payload);
      friendRequestId = data.id;
    });

    it('should accept friend request', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/friends/requests/${friendRequestId}`,
        headers: {
          authorization: `Bearer ${authTokens[1]}`,
        },
        payload: {
          accept: true,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.message).toBe('Friend request accepted');
      expect(data.friendship).toBeDefined();
      expect(data.friendship.id).toBeDefined();
    });

    it('should decline friend request', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/friends/requests/${friendRequestId}`,
        headers: {
          authorization: `Bearer ${authTokens[1]}`,
        },
        payload: {
          accept: false,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.message).toBe('Friend request declined');
    });

    it('should return 400 for invalid request ID', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/friends/requests/invalid',
        headers: {
          authorization: `Bearer ${authTokens[1]}`,
        },
        payload: {
          accept: true,
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 when trying to respond to someone else's request", async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/friends/requests/${friendRequestId}`,
        headers: {
          authorization: `Bearer ${authTokens[2]}`, // Wrong user
        },
        payload: {
          accept: true,
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('DELETE /api/v1/friends/requests/:id', () => {
    let friendRequestId: number;

    beforeEach(async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/friends/requests',
        headers: {
          authorization: `Bearer ${authTokens[0]}`,
        },
        payload: {
          userId: users[1].id,
        },
      });

      const data = JSON.parse(response.payload);
      friendRequestId = data.id;
    });

    it('should cancel sent friend request', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/friends/requests/${friendRequestId}`,
        headers: {
          authorization: `Bearer ${authTokens[0]}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.message).toBe('Friend request cancelled');
    });

    it("should return 400 when trying to cancel someone else's request", async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/friends/requests/${friendRequestId}`,
        headers: {
          authorization: `Bearer ${authTokens[1]}`,
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/v1/friends', () => {
    beforeEach(async () => {
      // Create some friendships
      const request1Response = await app.inject({
        method: 'POST',
        url: '/api/v1/friends/requests',
        headers: {
          authorization: `Bearer ${authTokens[0]}`,
        },
        payload: {
          userId: users[1].id,
        },
      });

      const request1Data = JSON.parse(request1Response.payload);
      await app.inject({
        method: 'PATCH',
        url: `/api/v1/friends/requests/${request1Data.id}`,
        headers: {
          authorization: `Bearer ${authTokens[1]}`,
        },
        payload: {
          accept: true,
        },
      });

      const request2Response = await app.inject({
        method: 'POST',
        url: '/api/v1/friends/requests',
        headers: {
          authorization: `Bearer ${authTokens[0]}`,
        },
        payload: {
          userId: users[2].id,
        },
      });

      const request2Data = JSON.parse(request2Response.payload);
      await app.inject({
        method: 'PATCH',
        url: `/api/v1/friends/requests/${request2Data.id}`,
        headers: {
          authorization: `Bearer ${authTokens[2]}`,
        },
        payload: {
          accept: true,
        },
      });
    });

    it("should return user's friends list", async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/friends',
        headers: {
          authorization: `Bearer ${authTokens[0]}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.friends).toHaveLength(2);
      expect(data.count).toBe(2);
      expect(data.friends[0].id).toBeDefined();
      expect(data.friends[0].name).toBeDefined();
      expect(data.friends[0].friendsSince).toBeDefined();
    });
  });

  describe('DELETE /api/v1/friends/:userId', () => {
    beforeEach(async () => {
      // Create a friendship
      const requestResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/friends/requests',
        headers: {
          authorization: `Bearer ${authTokens[0]}`,
        },
        payload: {
          userId: users[1].id,
        },
      });

      const requestData = JSON.parse(requestResponse.payload);
      await app.inject({
        method: 'PATCH',
        url: `/api/v1/friends/requests/${requestData.id}`,
        headers: {
          authorization: `Bearer ${authTokens[1]}`,
        },
        payload: {
          accept: true,
        },
      });
    });

    it('should remove friendship', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/friends/${users[1].id}`,
        headers: {
          authorization: `Bearer ${authTokens[0]}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.message).toBe('Friend removed successfully');
    });

    it("should return 404 when friendship doesn't exist", async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/friends/${users[3].id}`,
        headers: {
          authorization: `Bearer ${authTokens[0]}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /api/v1/friends/search', () => {
    it('should search for users', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/friends/search?q=Friend',
        headers: {
          authorization: `Bearer ${authTokens[0]}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.length).toBeGreaterThan(0);
      expect(data[0].id).toBeDefined();
      expect(data[0].name).toBeDefined();
      expect(data[0].isFriend).toBeDefined();
      expect(data[0].hasPendingRequest).toBeDefined();
    });

    it('should return 400 for short search query', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/friends/search?q=a',
        headers: {
          authorization: `Bearer ${authTokens[0]}`,
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should require search query', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/friends/search',
        headers: {
          authorization: `Bearer ${authTokens[0]}`,
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/v1/friends/suggestions', () => {
    it('should return friend suggestions', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/friends/suggestions',
        headers: {
          authorization: `Bearer ${authTokens[0]}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(Array.isArray(data)).toBe(true);
    });

    it('should accept limit parameter', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/friends/suggestions?limit=5',
        headers: {
          authorization: `Bearer ${authTokens[0]}`,
        },
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('GET /api/v1/friends/:userId/mutual', () => {
    it('should return mutual friends', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/friends/${users[1].id}/mutual`,
        headers: {
          authorization: `Bearer ${authTokens[0]}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.mutualFriends).toBeDefined();
      expect(data.count).toBeDefined();
      expect(Array.isArray(data.mutualFriends)).toBe(true);
    });

    it('should return 400 for invalid user ID', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/friends/invalid/mutual',
        headers: {
          authorization: `Bearer ${authTokens[0]}`,
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/v1/friends/:userId/status', () => {
    it('should return friendship status for non-friends', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/friends/${users[1].id}/status`,
        headers: {
          authorization: `Bearer ${authTokens[0]}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.isFriend).toBe(false);
      expect(data.hasPendingRequest).toBe(false);
      expect(data.requestDirection).toBe('none');
    });

    it('should return friendship status with pending request', async () => {
      // Send friend request
      await app.inject({
        method: 'POST',
        url: '/api/v1/friends/requests',
        headers: {
          authorization: `Bearer ${authTokens[0]}`,
        },
        payload: {
          userId: users[1].id,
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/friends/${users[1].id}/status`,
        headers: {
          authorization: `Bearer ${authTokens[0]}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.isFriend).toBe(false);
      expect(data.hasPendingRequest).toBe(true);
      expect(data.requestDirection).toBe('sent');
    });

    it('should return friendship status for existing friends', async () => {
      // Create friendship
      const requestResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/friends/requests',
        headers: {
          authorization: `Bearer ${authTokens[0]}`,
        },
        payload: {
          userId: users[1].id,
        },
      });

      const requestData = JSON.parse(requestResponse.payload);
      await app.inject({
        method: 'PATCH',
        url: `/api/v1/friends/requests/${requestData.id}`,
        headers: {
          authorization: `Bearer ${authTokens[1]}`,
        },
        payload: {
          accept: true,
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/friends/${users[1].id}/status`,
        headers: {
          authorization: `Bearer ${authTokens[0]}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.isFriend).toBe(true);
      expect(data.hasPendingRequest).toBe(false);
      expect(data.requestDirection).toBe('none');
    });
  });
});
