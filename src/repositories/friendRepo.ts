import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Define types that will be generated after schema migration
const FriendRequestStatus = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  DECLINED: 'DECLINED',
} as const;

type FriendRequestStatusType = (typeof FriendRequestStatus)[keyof typeof FriendRequestStatus];

interface FriendRequest {
  id: number;
  status: FriendRequestStatusType;
  message: string | null;
  createdAt: Date;
  updatedAt: Date;
  respondedAt: Date | null;
  senderId: number;
  receiverId: number;
}

interface Friendship {
  id: number;
  createdAt: Date;
  user1Id: number;
  user2Id: number;
}

// Extended types for repository returns with includes
export interface FriendRequestWithUsers extends FriendRequest {
  sender: {
    id: number;
    name: string;
    username: string | null;
    email: string;
    avatar: string | null;
  };
  receiver: {
    id: number;
    name: string;
    username: string | null;
    email: string;
    avatar: string | null;
  };
}

export interface FriendshipWithUser extends Friendship {
  friend: {
    id: number;
    name: string;
    username: string | null;
    email: string;
    avatar: string | null;
  };
}

export interface CreateFriendRequestData {
  senderId: number;
  receiverId: number;
  message?: string;
}

export interface FriendSuggestion {
  id: number;
  name: string;
  username: string | null;
  email: string;
  avatar: string | null;
  mutualFriends: number;
}

// ===== Friend Request Operations =====

/** Send a friend request */
export async function sendFriendRequest(data: CreateFriendRequestData): Promise<FriendRequest> {
  // Prevent self-friend requests
  if (data.senderId === data.receiverId) {
    throw new Error('Cannot send friend request to yourself');
  }

  // Check if friendship already exists
  const existingFriendship = await areFriends(data.senderId, data.receiverId);
  if (existingFriendship) {
    throw new Error('Users are already friends');
  }

  // Check if pending request already exists
  const existingRequest = await prisma.friendRequest.findFirst({
    where: {
      OR: [
        { senderId: data.senderId, receiverId: data.receiverId },
        { senderId: data.receiverId, receiverId: data.senderId }, // Check reverse direction too
      ],
      status: FriendRequestStatus.PENDING,
    },
  });

  if (existingRequest) {
    throw new Error('Friend request already exists');
  }

  return prisma.friendRequest.create({
    data: {
      senderId: data.senderId,
      receiverId: data.receiverId,
      message: data.message,
    },
  });
}

/** Get friend request by ID with user details */
export async function getFriendRequestById(id: number): Promise<FriendRequestWithUsers | null> {
  return prisma.friendRequest.findUnique({
    where: { id },
    include: {
      sender: {
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          avatar: true,
        },
      },
      receiver: {
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          avatar: true,
        },
      },
    },
  });
}

/** Get pending friend requests sent by a user */
export async function getSentFriendRequests(userId: number): Promise<FriendRequestWithUsers[]> {
  return prisma.friendRequest.findMany({
    where: {
      senderId: userId,
      status: FriendRequestStatus.PENDING,
    },
    include: {
      sender: {
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          avatar: true,
        },
      },
      receiver: {
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          avatar: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/** Get pending friend requests received by a user */
export async function getReceivedFriendRequests(userId: number): Promise<FriendRequestWithUsers[]> {
  return prisma.friendRequest.findMany({
    where: {
      receiverId: userId,
      status: FriendRequestStatus.PENDING,
    },
    include: {
      sender: {
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          avatar: true,
        },
      },
      receiver: {
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          avatar: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/** Accept a friend request and create friendship */
export async function acceptFriendRequest(
  requestId: number,
  userId: number
): Promise<Friendship> {
  return prisma.$transaction(async tx => {
    // Get the friend request
    const request = await tx.friendRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new Error('Friend request not found');
    }

    if (request.receiverId !== userId) {
      throw new Error('Unauthorized: You can only accept requests sent to you');
    }

    if (request.status !== FriendRequestStatus.PENDING) {
      throw new Error('Friend request is not pending');
    }

    // Update friend request status
    await tx.friendRequest.update({
      where: { id: requestId },
      data: {
        status: FriendRequestStatus.ACCEPTED,
        respondedAt: new Date(),
      },
    });

    // Create friendship (ensure user1Id < user2Id for consistency)
    const user1Id = Math.min(request.senderId, request.receiverId);
    const user2Id = Math.max(request.senderId, request.receiverId);

    return tx.friendship.create({
      data: {
        user1Id,
        user2Id,
      },
    });
  });
}

/** Decline a friend request */
export async function declineFriendRequest(
  requestId: number,
  userId: number
): Promise<FriendRequest> {
  const request = await prisma.friendRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) {
    throw new Error('Friend request not found');
  }

  if (request.receiverId !== userId) {
    throw new Error('Unauthorized: You can only decline requests sent to you');
  }

  if (request.status !== FriendRequestStatus.PENDING) {
    throw new Error('Friend request is not pending');
  }

  return prisma.friendRequest.update({
    where: { id: requestId },
    data: {
      status: FriendRequestStatus.DECLINED,
      respondedAt: new Date(),
    },
  });
}

/** Cancel a sent friend request */
export async function cancelFriendRequest(requestId: number, userId: number): Promise<boolean> {
  const request = await prisma.friendRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) {
    return false;
  }

  if (request.senderId !== userId) {
    throw new Error('Unauthorized: You can only cancel requests you sent');
  }

  if (request.status !== FriendRequestStatus.PENDING) {
    throw new Error('Can only cancel pending requests');
  }

  await prisma.friendRequest.delete({
    where: { id: requestId },
  });

  return true;
}

// ===== Friendship Operations =====

/** Check if two users are friends */
export async function areFriends(user1Id: number, user2Id: number): Promise<boolean> {
  const minId = Math.min(user1Id, user2Id);
  const maxId = Math.max(user1Id, user2Id);

  const friendship = await prisma.friendship.findFirst({
    where: {
      user1Id: minId,
      user2Id: maxId,
    },
  });

  return !!friendship;
}

/** Get user's friends list */
export async function getUserFriends(userId: number): Promise<FriendshipWithUser[]> {
  const friendships = await prisma.friendship.findMany({
    where: {
      OR: [{ user1Id: userId }, { user2Id: userId }],
    },
    include: {
      user1: {
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          avatar: true,
        },
      },
      user2: {
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          avatar: true,
        },
      },
    },
  });

  // Transform to return the friend (not the current user)
  return friendships.map(friendship => ({
    id: friendship.id,
    createdAt: friendship.createdAt,
    user1Id: friendship.user1Id,
    user2Id: friendship.user2Id,
    friend: friendship.user1Id === userId ? friendship.user2 : friendship.user1,
  }));
}

/** Remove friendship between two users */
export async function removeFriendship(user1Id: number, user2Id: number): Promise<boolean> {
  const minId = Math.min(user1Id, user2Id);
  const maxId = Math.max(user1Id, user2Id);

  const result = await prisma.friendship.deleteMany({
    where: {
      user1Id: minId,
      user2Id: maxId,
    },
  });

  return result.count > 0;
}

/** Get count of user's friends */
export async function getFriendsCount(userId: number): Promise<number> {
  return prisma.friendship.count({
    where: {
      OR: [{ user1Id: userId }, { user2Id: userId }],
    },
  });
}

// ===== Search and Discovery =====

/** Search for users by name or username */
export async function searchUsers(
  currentUserId: number,
  query: string,
  limit: number = 20
): Promise<
  Array<{
    id: number;
    name: string;
    username: string | null;
    email: string;
    avatar: string | null;
    isFriend: boolean;
    hasPendingRequest: boolean;
  }>
> {
  // Search for users matching the query
  const users = await prisma.user.findMany({
    where: {
      AND: [
        { id: { not: currentUserId } }, // Exclude current user
        {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { username: { contains: query, mode: 'insensitive' } },
          ],
        },
      ],
    },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      avatar: true,
    },
    take: limit,
  });

  // Get friendship status for each user
  const userIds = users.map(u => u.id);

  // Get existing friendships
  const friendships = await prisma.friendship.findMany({
    where: {
      OR: [
        { user1Id: currentUserId, user2Id: { in: userIds } },
        { user2Id: currentUserId, user1Id: { in: userIds } },
      ],
    },
  });

  // Get pending friend requests
  const pendingRequests = await prisma.friendRequest.findMany({
    where: {
      OR: [
        { senderId: currentUserId, receiverId: { in: userIds } },
        { receiverId: currentUserId, senderId: { in: userIds } },
      ],
      status: FriendRequestStatus.PENDING,
    },
  });

  const friendIds = new Set(
    friendships.map(f => (f.user1Id === currentUserId ? f.user2Id : f.user1Id))
  );
  const pendingRequestIds = new Set([
    ...pendingRequests.map(r => r.senderId),
    ...pendingRequests.map(r => r.receiverId),
  ]);

  return users.map(user => ({
    ...user,
    isFriend: friendIds.has(user.id),
    hasPendingRequest: pendingRequestIds.has(user.id),
  }));
}

/** Get friend suggestions based on mutual friends */
export async function getFriendSuggestions(
  userId: number,
  limit: number = 10
): Promise<FriendSuggestion[]> {
  // Use parameterized query to prevent SQL injection
  const suggestions = await prisma.$queryRaw<FriendSuggestion[]>`
    SELECT DISTINCT
      u.id,
      u.name,
      u.username,
      u.email,
      u.avatar,
      COUNT(DISTINCT mutual_friend.id) as mutualFriends
    FROM 
      users u
    INNER JOIN friendships f ON (u.id = f."user1Id" OR u.id = f."user2Id")
    INNER JOIN friendships user_friends ON (
      (user_friends."user1Id" = ${userId} AND user_friends."user2Id" != u.id) OR
      (user_friends."user2Id" = ${userId} AND user_friends."user1Id" != u.id)
    )
    INNER JOIN users mutual_friend ON (
      (f."user1Id" = mutual_friend.id OR f."user2Id" = mutual_friend.id) AND
      (user_friends."user1Id" = mutual_friend.id OR user_friends."user2Id" = mutual_friend.id) AND
      mutual_friend.id != ${userId} AND
      mutual_friend.id != u.id
    )
    LEFT JOIN friendships existing_friendship ON (
      (existing_friendship."user1Id" = ${userId} AND existing_friendship."user2Id" = u.id) OR
      (existing_friendship."user2Id" = ${userId} AND existing_friendship."user1Id" = u.id)
    )
    LEFT JOIN friend_requests pending_request ON (
      (pending_request."senderId" = ${userId} AND pending_request."receiverId" = u.id) OR
      (pending_request."receiverId" = ${userId} AND pending_request."senderId" = u.id)
    ) AND pending_request.status = 'PENDING'
    WHERE 
      u.id != ${userId}
      AND existing_friendship.id IS NULL
      AND pending_request.id IS NULL
    GROUP BY u.id, u.name, u.username, u.email, u.avatar
    HAVING COUNT(DISTINCT mutual_friend.id) > 0
    ORDER BY mutualFriends DESC, u.name ASC
    LIMIT ${limit}
  `;

  return suggestions.map(suggestion => ({
    ...suggestion,
    mutualFriends: Number(suggestion.mutualFriends),
  }));
}

/** Get mutual friends between two users */
export async function getMutualFriends(
  user1Id: number,
  user2Id: number
): Promise<
  Array<{
    id: number;
    name: string;
    username: string | null;
    avatar: string | null;
  }>
> {
  // Use parameterized query to prevent SQL injection  
  const mutualFriends = await prisma.$queryRaw<
    Array<{
      id: number;
      name: string;
      username: string | null;
      avatar: string | null;
    }>
  >`
    SELECT DISTINCT
      u.id,
      u.name,
      u.username,
      u.avatar
    FROM 
      users u
    INNER JOIN friendships f1 ON (
      (f1."user1Id" = ${user1Id} AND f1."user2Id" = u.id) OR
      (f1."user2Id" = ${user1Id} AND f1."user1Id" = u.id)
    )
    INNER JOIN friendships f2 ON (
      (f2."user1Id" = ${user2Id} AND f2."user2Id" = u.id) OR
      (f2."user2Id" = ${user2Id} AND f2."user1Id" = u.id)
    )
    WHERE 
      u.id != ${user1Id} 
      AND u.id != ${user2Id}
    ORDER BY u.name ASC
  `;

  return mutualFriends;
}
