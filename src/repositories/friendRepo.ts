import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Define types that will be generated after schema migration
const FriendRequestStatus = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  DECLINED: 'DECLINED',
} as const;

type FriendRequestStatusType = typeof FriendRequestStatus[keyof typeof FriendRequestStatus];

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
  const existingRequest = await (prisma as any).friendRequest.findFirst({
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

  return (prisma as any).friendRequest.create({
    data: {
      senderId: data.senderId,
      receiverId: data.receiverId,
      message: data.message,
    },
  });
}

/** Get friend request by ID with user details */
export async function getFriendRequestById(id: number): Promise<FriendRequestWithUsers | null> {
  return (prisma as any).friendRequest.findUnique({
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
  return (prisma as any).friendRequest.findMany({
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
  return (prisma as any).friendRequest.findMany({
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
export async function acceptFriendRequest(requestId: number, userId: number): Promise<Friendship> {
  return prisma.$transaction(async tx => {
    // Get the friend request
    const request = await (tx as any).friendRequest.findUnique({
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
    await (tx as any).friendRequest.update({
      where: { id: requestId },
      data: {
        status: FriendRequestStatus.ACCEPTED,
        respondedAt: new Date(),
      },
    });

    // Create friendship (ensure user1Id < user2Id for consistency)
    const user1Id = Math.min(request.senderId, request.receiverId);
    const user2Id = Math.max(request.senderId, request.receiverId);

    return (tx as any).friendship.create({
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
  const request = await (prisma as any).friendRequest.findUnique({
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

  return (prisma as any).friendRequest.update({
    where: { id: requestId },
    data: {
      status: FriendRequestStatus.DECLINED,
      respondedAt: new Date(),
    },
  });
}

/** Cancel a sent friend request */
export async function cancelFriendRequest(requestId: number, userId: number): Promise<boolean> {
  const request = await (prisma as any).friendRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) {
    throw new Error('Friend request not found');
  }

  if (request.senderId !== userId) {
    throw new Error('Unauthorized: You can only cancel requests you sent');
  }

  if (request.status !== FriendRequestStatus.PENDING) {
    throw new Error('Friend request is not pending');
  }

  await (prisma as any).friendRequest.delete({
    where: { id: requestId },
  });

  return true;
}

// ===== Friendship Operations =====

/** Check if two users are friends */
export async function areFriends(user1Id: number, user2Id: number): Promise<boolean> {
  const minId = Math.min(user1Id, user2Id);
  const maxId = Math.max(user1Id, user2Id);

  const friendship = await (prisma as any).friendship.findUnique({
    where: {
      user1Id_user2Id: {
        user1Id: minId,
        user2Id: maxId,
      },
    },
  });

  return !!friendship;
}

/** Get user's friends list */
export async function getUserFriends(userId: number): Promise<FriendshipWithUser[]> {
  const friendships = await (prisma as any).friendship.findMany({
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
    orderBy: { createdAt: 'desc' },
  });

  // Transform to include the friend (not the current user)
  return friendships.map((friendship: any) => ({
    ...friendship,
    friend: friendship.user1Id === userId ? friendship.user2 : friendship.user1,
  }));
}

/** Remove a friendship */
export async function removeFriendship(user1Id: number, user2Id: number): Promise<boolean> {
  const minId = Math.min(user1Id, user2Id);
  const maxId = Math.max(user1Id, user2Id);

  const result = await (prisma as any).friendship.deleteMany({
    where: {
      user1Id: minId,
      user2Id: maxId,
    },
  });

  return result.count > 0;
}

/** Get friends count for a user */
export async function getFriendsCount(userId: number): Promise<number> {
  return (prisma as any).friendship.count({
    where: {
      OR: [{ user1Id: userId }, { user2Id: userId }],
    },
  });
}

// ===== Search and Discovery =====

/** Search for users to add as friends */
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
  // Search users by name, username, or email
  const users = await prisma.user.findMany({
    where: {
      AND: [
        { id: { not: currentUserId } }, // Exclude current user
        { isActive: true }, // Only active users
        {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { username: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
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
    orderBy: { name: 'asc' },
  });

  // Get existing friendships and pending requests for these users
  const userIds = users.map(user => user.id);

  const [friendships, pendingRequests] = await Promise.all([
    (prisma as any).friendship.findMany({
      where: {
        OR: [
          { user1Id: currentUserId, user2Id: { in: userIds } },
          { user2Id: currentUserId, user1Id: { in: userIds } },
        ],
      },
    }),
    (prisma as any).friendRequest.findMany({
      where: {
        OR: [
          { senderId: currentUserId, receiverId: { in: userIds } },
          { receiverId: currentUserId, senderId: { in: userIds } },
        ],
        status: FriendRequestStatus.PENDING,
      },
    }),
  ]);

  const friendIds = new Set(
    friendships.map((f: any) => (f.user1Id === currentUserId ? f.user2Id : f.user1Id))
  );

  const pendingRequestIds = new Set([
    ...pendingRequests.map((r: any) => r.senderId),
    ...pendingRequests.map((r: any) => r.receiverId),
  ]);

  return users.map(user => ({
    ...user,
    isFriend: friendIds.has(user.id),
    hasPendingRequest: pendingRequestIds.has(user.id),
  }));
}

/** Get friend suggestions for a user */
export async function getFriendSuggestions(
  userId: number,
  limit: number = 10
): Promise<FriendSuggestion[]> {
  // Get friends of friends who are not already friends
  const suggestions = await prisma.$queryRaw<FriendSuggestion[]>`
    SELECT DISTINCT 
      u.id,
      u.name,
      u.username,
      u.email,
      u.avatar,
      COUNT(DISTINCT f2.id) as "mutualFriends"
    FROM users u
    JOIN friendships f2 ON (u.id = f2."user1Id" OR u.id = f2."user2Id")
    JOIN friendships f1 ON (
      (f1."user1Id" = ${userId} AND (f1."user2Id" = f2."user1Id" OR f1."user2Id" = f2."user2Id"))
      OR
      (f1."user2Id" = ${userId} AND (f1."user1Id" = f2."user1Id" OR f1."user1Id" = f2."user2Id"))
    )
    WHERE u.id != ${userId}
      AND u."isActive" = true
      AND NOT EXISTS (
        SELECT 1 FROM friendships f3 
        WHERE (f3."user1Id" = ${userId} AND f3."user2Id" = u.id)
           OR (f3."user2Id" = ${userId} AND f3."user1Id" = u.id)
      )
      AND NOT EXISTS (
        SELECT 1 FROM friend_requests fr
        WHERE ((fr."senderId" = ${userId} AND fr."receiverId" = u.id)
           OR (fr."receiverId" = ${userId} AND fr."senderId" = u.id))
          AND fr.status = 'PENDING'
      )
    GROUP BY u.id, u.name, u.username, u.email, u.avatar
    ORDER BY "mutualFriends" DESC, u.name ASC
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
    FROM users u
    WHERE u.id IN (
      SELECT CASE 
        WHEN f1."user1Id" = ${user1Id} THEN f1."user2Id"
        ELSE f1."user1Id"
      END
      FROM friendships f1
      WHERE f1."user1Id" = ${user1Id} OR f1."user2Id" = ${user1Id}
    )
    AND u.id IN (
      SELECT CASE 
        WHEN f2."user1Id" = ${user2Id} THEN f2."user2Id"
        ELSE f2."user1Id"
      END
      FROM friendships f2
      WHERE f2."user1Id" = ${user2Id} OR f2."user2Id" = ${user2Id}
    )
    ORDER BY u.name ASC
  `;

  return mutualFriends;
}
