import { PrismaClient } from '@prisma/client';
import {
  sendFriendRequest,
  getFriendRequestById,
  getSentFriendRequests,
  getReceivedFriendRequests,
  acceptFriendRequest,
  declineFriendRequest,
  cancelFriendRequest,
  getUserFriends,
  removeFriendship,
  searchUsers,
  getMutualFriends,
  getFriendsCount,
  areFriends,
} from '../../src/repositories/friendRepo.js';
import { createUser } from '../../src/repositories/userRepo.js';

const prisma = new PrismaClient();

// Test data
const testUsers = [
  {
    email: 'alice@example.com',
    name: 'Alice Smith',
    username: 'alice_smith',
    password: 'password123',
  },
  {
    email: 'bob@example.com',
    name: 'Bob Johnson',
    username: 'bob_johnson',
    password: 'password123',
  },
  {
    email: 'charlie@example.com',
    name: 'Charlie Brown',
    username: 'charlie_brown',
    password: 'password123',
  },
  {
    email: 'diana@example.com',
    name: 'Diana Wilson',
    username: 'diana_wilson',
    password: 'password123',
  },
];

describe('Friend Repository', () => {
  let users: any[] = [];

  beforeEach(async () => {
    // Create test users
    users = [];
    for (const userData of testUsers) {
      const user = await createUser({ ...userData, provider: 'local' });
      users.push(user);
    }
  });

  afterEach(async () => {
    // Clean up test data
    await (prisma as any).friendRequest.deleteMany();
    await (prisma as any).friendship.deleteMany();
    await prisma.user.deleteMany();
  });

  describe('sendFriendRequest', () => {
    it('should send a friend request successfully', async () => {
      const request = await sendFriendRequest({
        senderId: users[0].id,
        receiverId: users[1].id,
        message: "Hi! Let's be friends!",
      });

      expect(request).toBeDefined();
      expect(request.senderId).toBe(users[0].id);
      expect(request.receiverId).toBe(users[1].id);
      expect(request.message).toBe("Hi! Let's be friends!");
      expect(request.status).toBe('PENDING');
    });

    it('should prevent sending friend request to yourself', async () => {
      await expect(
        sendFriendRequest({
          senderId: users[0].id,
          receiverId: users[0].id,
        })
      ).rejects.toThrow('Cannot send friend request to yourself');
    });

    it('should prevent duplicate friend requests', async () => {
      // Send first request
      await sendFriendRequest({
        senderId: users[0].id,
        receiverId: users[1].id,
      });

      // Try to send duplicate request
      await expect(
        sendFriendRequest({
          senderId: users[0].id,
          receiverId: users[1].id,
        })
      ).rejects.toThrow('Friend request already exists');
    });

    it('should prevent reverse friend requests when one already exists', async () => {
      // Send request from A to B
      await sendFriendRequest({
        senderId: users[0].id,
        receiverId: users[1].id,
      });

      // Try to send request from B to A
      await expect(
        sendFriendRequest({
          senderId: users[1].id,
          receiverId: users[0].id,
        })
      ).rejects.toThrow('Friend request already exists');
    });

    it('should prevent friend request to existing friends', async () => {
      // First, create a friendship
      const request = await sendFriendRequest({
        senderId: users[0].id,
        receiverId: users[1].id,
      });
      await acceptFriendRequest(request.id, users[1].id);

      // Try to send another friend request
      await expect(
        sendFriendRequest({
          senderId: users[0].id,
          receiverId: users[1].id,
        })
      ).rejects.toThrow('Users are already friends');
    });
  });

  describe('getFriendRequestById', () => {
    it('should retrieve friend request with user details', async () => {
      const request = await sendFriendRequest({
        senderId: users[0].id,
        receiverId: users[1].id,
        message: 'Test message',
      });

      const retrieved = await getFriendRequestById(request.id);

      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe(request.id);
      expect(retrieved!.sender.id).toBe(users[0].id);
      expect(retrieved!.sender.name).toBe(users[0].name);
      expect(retrieved!.receiver.id).toBe(users[1].id);
      expect(retrieved!.receiver.name).toBe(users[1].name);
      expect(retrieved!.message).toBe('Test message');
    });

    it('should return null for non-existent request', async () => {
      const retrieved = await getFriendRequestById(999);
      expect(retrieved).toBeNull();
    });
  });

  describe('getSentFriendRequests', () => {
    it('should retrieve sent friend requests', async () => {
      // Send requests from user 0 to users 1 and 2
      await sendFriendRequest({
        senderId: users[0].id,
        receiverId: users[1].id,
        message: 'Request 1',
      });
      await sendFriendRequest({
        senderId: users[0].id,
        receiverId: users[2].id,
        message: 'Request 2',
      });

      const sentRequests = await getSentFriendRequests(users[0].id);

      expect(sentRequests).toHaveLength(2);
      expect(sentRequests[0].sender.id).toBe(users[0].id);
      expect(sentRequests[1].sender.id).toBe(users[0].id);

      const receiverIds = sentRequests.map(req => req.receiver.id).sort();
      expect(receiverIds).toEqual([users[1].id, users[2].id].sort());
    });

    it('should return empty array when no sent requests exist', async () => {
      const sentRequests = await getSentFriendRequests(users[0].id);
      expect(sentRequests).toHaveLength(0);
    });
  });

  describe('getReceivedFriendRequests', () => {
    it('should retrieve received friend requests', async () => {
      // Send requests to user 1 from users 0 and 2
      await sendFriendRequest({
        senderId: users[0].id,
        receiverId: users[1].id,
        message: 'Request from user 0',
      });
      await sendFriendRequest({
        senderId: users[2].id,
        receiverId: users[1].id,
        message: 'Request from user 2',
      });

      const receivedRequests = await getReceivedFriendRequests(users[1].id);

      expect(receivedRequests).toHaveLength(2);
      expect(receivedRequests[0].receiver.id).toBe(users[1].id);
      expect(receivedRequests[1].receiver.id).toBe(users[1].id);

      const senderIds = receivedRequests.map(req => req.sender.id).sort();
      expect(senderIds).toEqual([users[0].id, users[2].id].sort());
    });
  });

  describe('acceptFriendRequest', () => {
    it('should accept friend request and create friendship', async () => {
      const request = await sendFriendRequest({
        senderId: users[0].id,
        receiverId: users[1].id,
      });

      const friendship = await acceptFriendRequest(request.id, users[1].id);

      expect(friendship).toBeDefined();
      expect(friendship.user1Id).toBe(Math.min(users[0].id, users[1].id));
      expect(friendship.user2Id).toBe(Math.max(users[0].id, users[1].id));

      // Verify request status updated
      const updatedRequest = await getFriendRequestById(request.id);
      expect(updatedRequest!.status).toBe('ACCEPTED');
      expect(updatedRequest!.respondedAt).toBeDefined();

      // Verify friendship exists
      const friendshipExists = await areFriends(users[0].id, users[1].id);
      expect(friendshipExists).toBe(true);
    });

    it('should prevent accepting non-existent request', async () => {
      await expect(acceptFriendRequest(999, users[1].id)).rejects.toThrow(
        'Friend request not found'
      );
    });

    it('should prevent accepting request not sent to you', async () => {
      const request = await sendFriendRequest({
        senderId: users[0].id,
        receiverId: users[1].id,
      });

      await expect(acceptFriendRequest(request.id, users[2].id)).rejects.toThrow(
        'Unauthorized: You can only accept requests sent to you'
      );
    });

    it('should prevent accepting already responded request', async () => {
      const request = await sendFriendRequest({
        senderId: users[0].id,
        receiverId: users[1].id,
      });

      // Accept once
      await acceptFriendRequest(request.id, users[1].id);

      // Try to accept again
      await expect(acceptFriendRequest(request.id, users[1].id)).rejects.toThrow(
        'Friend request is not pending'
      );
    });
  });

  describe('declineFriendRequest', () => {
    it('should decline friend request', async () => {
      const request = await sendFriendRequest({
        senderId: users[0].id,
        receiverId: users[1].id,
      });

      const declined = await declineFriendRequest(request.id, users[1].id);

      expect(declined.status).toBe('DECLINED');
      expect(declined.respondedAt).toBeDefined();

      // Verify no friendship created
      const friendshipExists = await areFriends(users[0].id, users[1].id);
      expect(friendshipExists).toBe(false);
    });
  });

  describe('cancelFriendRequest', () => {
    it('should cancel sent friend request', async () => {
      const request = await sendFriendRequest({
        senderId: users[0].id,
        receiverId: users[1].id,
      });

      const cancelled = await cancelFriendRequest(request.id, users[0].id);
      expect(cancelled).toBe(true);

      // Verify request is deleted
      const retrieved = await getFriendRequestById(request.id);
      expect(retrieved).toBeNull();
    });

    it('should prevent cancelling request not sent by you', async () => {
      const request = await sendFriendRequest({
        senderId: users[0].id,
        receiverId: users[1].id,
      });

      await expect(cancelFriendRequest(request.id, users[2].id)).rejects.toThrow(
        'Unauthorized: You can only cancel requests you sent'
      );
    });
  });

  describe('getUserFriends', () => {
    it("should retrieve user's friends list", async () => {
      // Create friendships: 0-1, 0-2
      const request1 = await sendFriendRequest({
        senderId: users[0].id,
        receiverId: users[1].id,
      });
      await acceptFriendRequest(request1.id, users[1].id);

      const request2 = await sendFriendRequest({
        senderId: users[0].id,
        receiverId: users[2].id,
      });
      await acceptFriendRequest(request2.id, users[2].id);

      const friends = await getUserFriends(users[0].id);

      expect(friends).toHaveLength(2);
      const friendIds = friends.map(f => f.friend.id).sort();
      expect(friendIds).toEqual([users[1].id, users[2].id].sort());
    });

    it('should return empty array when user has no friends', async () => {
      const friends = await getUserFriends(users[0].id);
      expect(friends).toHaveLength(0);
    });
  });

  describe('removeFriendship', () => {
    it('should remove friendship between users', async () => {
      // Create friendship
      const request = await sendFriendRequest({
        senderId: users[0].id,
        receiverId: users[1].id,
      });
      await acceptFriendRequest(request.id, users[1].id);

      // Verify friendship exists
      let friendshipExists = await areFriends(users[0].id, users[1].id);
      expect(friendshipExists).toBe(true);

      // Remove friendship
      const removed = await removeFriendship(users[0].id, users[1].id);
      expect(removed).toBe(true);

      // Verify friendship no longer exists
      friendshipExists = await areFriends(users[0].id, users[1].id);
      expect(friendshipExists).toBe(false);
    });

    it("should return false when friendship doesn't exist", async () => {
      const removed = await removeFriendship(users[0].id, users[1].id);
      expect(removed).toBe(false);
    });
  });

  describe('getFriendsCount', () => {
    it('should return correct friends count', async () => {
      // Initially no friends
      let count = await getFriendsCount(users[0].id);
      expect(count).toBe(0);

      // Add one friend
      const request1 = await sendFriendRequest({
        senderId: users[0].id,
        receiverId: users[1].id,
      });
      await acceptFriendRequest(request1.id, users[1].id);

      count = await getFriendsCount(users[0].id);
      expect(count).toBe(1);

      // Add another friend
      const request2 = await sendFriendRequest({
        senderId: users[0].id,
        receiverId: users[2].id,
      });
      await acceptFriendRequest(request2.id, users[2].id);

      count = await getFriendsCount(users[0].id);
      expect(count).toBe(2);
    });
  });

  describe('searchUsers', () => {
    it('should search users by name', async () => {
      const results = await searchUsers(users[1].id, 'Alice', 10);

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Alice Smith');
      expect(results[0].id).toBe(users[0].id);
      expect(results[0].isFriend).toBe(false);
      expect(results[0].hasPendingRequest).toBe(false);
    });

    it('should search users by username', async () => {
      const results = await searchUsers(users[0].id, 'bob_johnson', 10);

      expect(results).toHaveLength(1);
      expect(results[0].username).toBe('bob_johnson');
      expect(results[0].id).toBe(users[1].id);
    });

    it('should exclude current user from results', async () => {
      const results = await searchUsers(users[0].id, 'Alice', 10);

      // Since we're searching as Alice, she should not appear in results
      // (assuming there's no other Alice in test data)
      const currentUserInResults = results.some(user => user.id === users[0].id);
      expect(currentUserInResults).toBe(false);
    });

    it('should show friendship status in search results', async () => {
      // Create friendship between users 0 and 1
      const request = await sendFriendRequest({
        senderId: users[0].id,
        receiverId: users[1].id,
      });
      await acceptFriendRequest(request.id, users[1].id);

      // Create pending request between users 0 and 2
      await sendFriendRequest({
        senderId: users[0].id,
        receiverId: users[2].id,
      });

      const results = await searchUsers(users[0].id, 'o', 10); // Should match Bob and other names

      const bobResult = results.find(r => r.id === users[1].id);
      const charlieResult = results.find(r => r.id === users[2].id);

      expect(bobResult?.isFriend).toBe(true);
      expect(charlieResult?.hasPendingRequest).toBe(true);
    });
  });

  describe('getMutualFriends', () => {
    it('should return mutual friends between two users', async () => {
      // Create friendships: 0-2, 1-2 (2 is mutual friend of 0 and 1)
      const request1 = await sendFriendRequest({
        senderId: users[0].id,
        receiverId: users[2].id,
      });
      await acceptFriendRequest(request1.id, users[2].id);

      const request2 = await sendFriendRequest({
        senderId: users[1].id,
        receiverId: users[2].id,
      });
      await acceptFriendRequest(request2.id, users[2].id);

      const mutualFriends = await getMutualFriends(users[0].id, users[1].id);

      expect(mutualFriends).toHaveLength(1);
      expect(mutualFriends[0].id).toBe(users[2].id);
      expect(mutualFriends[0].name).toBe('Charlie Brown');
    });

    it('should return empty array when no mutual friends exist', async () => {
      const mutualFriends = await getMutualFriends(users[0].id, users[1].id);
      expect(mutualFriends).toHaveLength(0);
    });
  });

  describe('areFriends', () => {
    it('should return true for existing friendship', async () => {
      const request = await sendFriendRequest({
        senderId: users[0].id,
        receiverId: users[1].id,
      });
      await acceptFriendRequest(request.id, users[1].id);

      const friendship = await areFriends(users[0].id, users[1].id);
      expect(friendship).toBe(true);

      // Test reverse order
      const reverseCheck = await areFriends(users[1].id, users[0].id);
      expect(reverseCheck).toBe(true);
    });

    it('should return false for non-existing friendship', async () => {
      const friendship = await areFriends(users[0].id, users[1].id);
      expect(friendship).toBe(false);
    });
  });
});
