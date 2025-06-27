import { FastifyPluginAsync } from 'fastify';
import { authenticate, authHeaderSchema } from '../utils/middleware.js';
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
  getFriendSuggestions,
  getMutualFriends,
  getFriendsCount,
  areFriends,
} from '../repositories/friendRepo.js';
import { getUserByEmail } from '../repositories/userRepo.js';

interface FriendRequestParams {
  id: string;
}

interface UserParams {
  userId: string;
}

interface SendFriendRequestBody {
  email?: string;
  userId?: number;
  message?: string;
}

interface RespondToRequestBody {
  accept: boolean;
}

interface SearchUsersQuery {
  q: string;
  limit?: string;
}

const friendsRoute: FastifyPluginAsync = async fastify => {
  // POST /friends/requests - Send a friend request
  fastify.post<{ Body: SendFriendRequestBody }>(
    '/friends/requests',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['friends'],
        summary: 'Send a friend request',
        description: 'Send a friend request to another user by email or user ID',
        headers: authHeaderSchema,
        body: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'Email of user to add as friend',
            },
            userId: { type: 'integer', description: 'User ID to add as friend' },
            message: { type: 'string', description: 'Optional message to include with request' },
          },
          oneOf: [{ required: ['email'] }, { required: ['userId'] }],
        },
        response: {
          201: {
            description: 'Friend request sent successfully',
            type: 'object',
            properties: {
              id: { type: 'integer' },
              message: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' },
              receiver: {
                type: 'object',
                properties: {
                  id: { type: 'integer' },
                  name: { type: 'string' },
                  username: { type: 'string' },
                  email: { type: 'string' },
                },
              },
            },
          },
          400: {
            description: 'Bad request - validation error',
            type: 'object',
            properties: {
              message: { type: 'string' },
              error: { type: 'string' },
              statusCode: { type: 'integer' },
            },
          },
          404: {
            description: 'User not found',
            type: 'object',
            properties: {
              message: { type: 'string' },
              error: { type: 'string' },
              statusCode: { type: 'integer' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { email, userId, message } = request.body;
        const senderId = request.user!.id;

        let receiverId: number;

        if (email) {
          const receiver = await getUserByEmail(email);
          if (!receiver) {
            return reply.code(404).send({
              message: 'User not found',
              error: 'Not Found',
              statusCode: 404,
            });
          }
          receiverId = receiver.id;
        } else if (userId) {
          receiverId = userId;
        } else {
          return reply.code(400).send({
            message: 'Either email or userId must be provided',
            error: 'Bad Request',
            statusCode: 400,
          });
        }

        const friendRequest = await sendFriendRequest({
          senderId,
          receiverId,
          message,
        });

        const requestWithDetails = await getFriendRequestById(friendRequest.id);

        return reply.code(201).send({
          id: requestWithDetails!.id,
          message: requestWithDetails!.message,
          createdAt: requestWithDetails!.createdAt,
          receiver: requestWithDetails!.receiver,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        if (
          errorMessage.includes('Cannot send friend request to yourself') ||
          errorMessage.includes('Users are already friends') ||
          errorMessage.includes('Friend request already exists')
        ) {
          return reply.code(400).send({
            message: errorMessage,
            error: 'Bad Request',
            statusCode: 400,
          });
        }

        fastify.log.error('Error sending friend request:', error);
        return reply.code(500).send({
          message: 'Failed to send friend request',
          error: 'Internal Server Error',
          statusCode: 500,
        });
      }
    }
  );

  // GET /friends/requests/sent - Get sent friend requests
  fastify.get(
    '/friends/requests/sent',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['friends'],
        summary: 'Get sent friend requests',
        description: 'Get all pending friend requests sent by the authenticated user',
        headers: authHeaderSchema,
        response: {
          200: {
            description: 'List of sent friend requests',
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'integer' },
                message: { type: 'string' },
                createdAt: { type: 'string', format: 'date-time' },
                receiver: {
                  type: 'object',
                  properties: {
                    id: { type: 'integer' },
                    name: { type: 'string' },
                    username: { type: 'string' },
                    email: { type: 'string' },
                    avatar: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const sentRequests = await getSentFriendRequests(request.user!.id);
        return sentRequests.map(req => ({
          id: req.id,
          message: req.message,
          createdAt: req.createdAt,
          receiver: req.receiver,
        }));
      } catch (error) {
        fastify.log.error('Error fetching sent friend requests:', error);
        return reply.code(500).send({
          message: 'Failed to fetch sent friend requests',
          error: 'Internal Server Error',
          statusCode: 500,
        });
      }
    }
  );

  // GET /friends/requests/received - Get received friend requests
  fastify.get(
    '/friends/requests/received',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['friends'],
        summary: 'Get received friend requests',
        description: 'Get all pending friend requests received by the authenticated user',
        headers: authHeaderSchema,
        response: {
          200: {
            description: 'List of received friend requests',
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'integer' },
                message: { type: 'string' },
                createdAt: { type: 'string', format: 'date-time' },
                sender: {
                  type: 'object',
                  properties: {
                    id: { type: 'integer' },
                    name: { type: 'string' },
                    username: { type: 'string' },
                    email: { type: 'string' },
                    avatar: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const receivedRequests = await getReceivedFriendRequests(request.user!.id);
        return receivedRequests.map(req => ({
          id: req.id,
          message: req.message,
          createdAt: req.createdAt,
          sender: req.sender,
        }));
      } catch (error) {
        fastify.log.error('Error fetching received friend requests:', error);
        return reply.code(500).send({
          message: 'Failed to fetch received friend requests',
          error: 'Internal Server Error',
          statusCode: 500,
        });
      }
    }
  );

  // PATCH /friends/requests/:id - Accept or decline a friend request
  fastify.patch<{ Params: FriendRequestParams; Body: RespondToRequestBody }>(
    '/friends/requests/:id',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['friends'],
        summary: 'Respond to a friend request',
        description: 'Accept or decline a friend request',
        headers: authHeaderSchema,
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Friend request ID' },
          },
          required: ['id'],
        },
        body: {
          type: 'object',
          properties: {
            accept: { type: 'boolean', description: 'True to accept, false to decline' },
          },
          required: ['accept'],
        },
        response: {
          200: {
            description: 'Friend request response processed',
            type: 'object',
            properties: {
              message: { type: 'string' },
              friendship: {
                type: 'object',
                properties: {
                  id: { type: 'integer' },
                  createdAt: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
          400: {
            description: 'Bad request',
            type: 'object',
            properties: {
              message: { type: 'string' },
              error: { type: 'string' },
              statusCode: { type: 'integer' },
            },
          },
          404: {
            description: 'Friend request not found',
            type: 'object',
            properties: {
              message: { type: 'string' },
              error: { type: 'string' },
              statusCode: { type: 'integer' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const requestId = parseInt(request.params.id, 10);
        const { accept } = request.body;
        const userId = request.user!.id;

        if (isNaN(requestId)) {
          return reply.code(400).send({
            message: 'Invalid request ID',
            error: 'Bad Request',
            statusCode: 400,
          });
        }

        if (accept) {
          const friendship = await acceptFriendRequest(requestId, userId);
          return {
            message: 'Friend request accepted',
            friendship: {
              id: friendship.id,
              createdAt: friendship.createdAt,
            },
          };
        } else {
          await declineFriendRequest(requestId, userId);
          return {
            message: 'Friend request declined',
          };
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        if (errorMessage.includes('not found')) {
          return reply.code(404).send({
            message: errorMessage,
            error: 'Not Found',
            statusCode: 404,
          });
        }

        if (errorMessage.includes('Unauthorized') || errorMessage.includes('not pending')) {
          return reply.code(400).send({
            message: errorMessage,
            error: 'Bad Request',
            statusCode: 400,
          });
        }

        fastify.log.error('Error responding to friend request:', error);
        return reply.code(500).send({
          message: 'Failed to respond to friend request',
          error: 'Internal Server Error',
          statusCode: 500,
        });
      }
    }
  );

  // DELETE /friends/requests/:id - Cancel a sent friend request
  fastify.delete<{ Params: FriendRequestParams }>(
    '/friends/requests/:id',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['friends'],
        summary: 'Cancel a friend request',
        description: 'Cancel a sent friend request',
        headers: authHeaderSchema,
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Friend request ID' },
          },
          required: ['id'],
        },
        response: {
          200: {
            description: 'Friend request cancelled',
            type: 'object',
            properties: {
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const requestId = parseInt(request.params.id, 10);
        const userId = request.user!.id;

        if (isNaN(requestId)) {
          return reply.code(400).send({
            message: 'Invalid request ID',
            error: 'Bad Request',
            statusCode: 400,
          });
        }

        await cancelFriendRequest(requestId, userId);
        return { message: 'Friend request cancelled' };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        if (errorMessage.includes('not found')) {
          return reply.code(404).send({
            message: errorMessage,
            error: 'Not Found',
            statusCode: 404,
          });
        }

        if (errorMessage.includes('Unauthorized') || errorMessage.includes('not pending')) {
          return reply.code(400).send({
            message: errorMessage,
            error: 'Bad Request',
            statusCode: 400,
          });
        }

        fastify.log.error('Error cancelling friend request:', error);
        return reply.code(500).send({
          message: 'Failed to cancel friend request',
          error: 'Internal Server Error',
          statusCode: 500,
        });
      }
    }
  );

  // GET /friends - Get user's friends list
  fastify.get(
    '/friends',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['friends'],
        summary: 'Get friends list',
        description: "Get the authenticated user's friends list",
        headers: authHeaderSchema,
        response: {
          200: {
            description: 'List of friends',
            type: 'object',
            properties: {
              friends: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'integer' },
                    friendshipId: { type: 'integer' },
                    name: { type: 'string' },
                    username: { type: 'string' },
                    email: { type: 'string' },
                    avatar: { type: 'string' },
                    friendsSince: { type: 'string', format: 'date-time' },
                  },
                },
              },
              count: { type: 'integer' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const [friends, count] = await Promise.all([
          getUserFriends(request.user!.id),
          getFriendsCount(request.user!.id),
        ]);

        return {
          friends: friends.map(friendship => ({
            id: friendship.friend.id,
            friendshipId: friendship.id,
            name: friendship.friend.name,
            username: friendship.friend.username,
            email: friendship.friend.email,
            avatar: friendship.friend.avatar,
            friendsSince: friendship.createdAt,
          })),
          count,
        };
      } catch (error) {
        fastify.log.error('Error fetching friends list:', error);
        return reply.code(500).send({
          message: 'Failed to fetch friends list',
          error: 'Internal Server Error',
          statusCode: 500,
        });
      }
    }
  );

  // DELETE /friends/:userId - Remove a friend
  fastify.delete<{ Params: UserParams }>(
    '/friends/:userId',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['friends'],
        summary: 'Remove a friend',
        description: 'Remove a friendship',
        headers: authHeaderSchema,
        params: {
          type: 'object',
          properties: {
            userId: { type: 'string', description: "Friend's user ID" },
          },
          required: ['userId'],
        },
        response: {
          200: {
            description: 'Friend removed',
            type: 'object',
            properties: {
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const friendId = parseInt(request.params.userId, 10);
        const userId = request.user!.id;

        if (isNaN(friendId)) {
          return reply.code(400).send({
            message: 'Invalid user ID',
            error: 'Bad Request',
            statusCode: 400,
          });
        }

        const removed = await removeFriendship(userId, friendId);

        if (!removed) {
          return reply.code(404).send({
            message: 'Friendship not found',
            error: 'Not Found',
            statusCode: 404,
          });
        }

        return { message: 'Friend removed successfully' };
      } catch (error) {
        fastify.log.error('Error removing friend:', error);
        return reply.code(500).send({
          message: 'Failed to remove friend',
          error: 'Internal Server Error',
          statusCode: 500,
        });
      }
    }
  );

  // GET /friends/search - Search for users to add as friends
  fastify.get<{ Querystring: SearchUsersQuery }>(
    '/friends/search',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['friends'],
        summary: 'Search for users',
        description: 'Search for users to add as friends',
        headers: authHeaderSchema,
        querystring: {
          type: 'object',
          properties: {
            q: { type: 'string', description: 'Search query (name, username, or email)' },
            limit: { type: 'string', description: 'Maximum number of results (default: 20)' },
          },
          required: ['q'],
        },
        response: {
          200: {
            description: 'Search results',
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'integer' },
                name: { type: 'string' },
                username: { type: 'string' },
                email: { type: 'string' },
                avatar: { type: 'string' },
                isFriend: { type: 'boolean' },
                hasPendingRequest: { type: 'boolean' },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { q, limit } = request.query;
        const maxLimit = limit ? parseInt(limit, 10) : 20;

        if (!q || q.trim().length < 2) {
          return reply.code(400).send({
            message: 'Search query must be at least 2 characters long',
            error: 'Bad Request',
            statusCode: 400,
          });
        }

        const results = await searchUsers(request.user!.id, q.trim(), maxLimit);
        return results;
      } catch (error) {
        fastify.log.error('Error searching users:', error);
        return reply.code(500).send({
          message: 'Failed to search users',
          error: 'Internal Server Error',
          statusCode: 500,
        });
      }
    }
  );

  // GET /friends/suggestions - Get friend suggestions
  fastify.get(
    '/friends/suggestions',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['friends'],
        summary: 'Get friend suggestions',
        description: 'Get friend suggestions based on mutual friends',
        headers: authHeaderSchema,
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'string', description: 'Maximum number of suggestions (default: 10)' },
          },
        },
        response: {
          200: {
            description: 'Friend suggestions',
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'integer' },
                name: { type: 'string' },
                username: { type: 'string' },
                email: { type: 'string' },
                avatar: { type: 'string' },
                mutualFriends: { type: 'integer' },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const query = request.query as { limit?: string };
        const limit = query.limit ? parseInt(query.limit, 10) : 10;
        const suggestions = await getFriendSuggestions(request.user!.id, limit);
        return suggestions;
      } catch (error) {
        fastify.log.error('Error fetching friend suggestions:', error);
        return reply.code(500).send({
          message: 'Failed to fetch friend suggestions',
          error: 'Internal Server Error',
          statusCode: 500,
        });
      }
    }
  );

  // GET /friends/:userId/mutual - Get mutual friends with another user
  fastify.get<{ Params: UserParams }>(
    '/friends/:userId/mutual',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['friends'],
        summary: 'Get mutual friends',
        description: 'Get mutual friends with another user',
        headers: authHeaderSchema,
        params: {
          type: 'object',
          properties: {
            userId: { type: 'string', description: "Other user's ID" },
          },
          required: ['userId'],
        },
        response: {
          200: {
            description: 'Mutual friends',
            type: 'object',
            properties: {
              mutualFriends: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'integer' },
                    name: { type: 'string' },
                    username: { type: 'string' },
                    avatar: { type: 'string' },
                  },
                },
              },
              count: { type: 'integer' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const otherUserId = parseInt(request.params.userId, 10);
        const userId = request.user!.id;

        if (isNaN(otherUserId)) {
          return reply.code(400).send({
            message: 'Invalid user ID',
            error: 'Bad Request',
            statusCode: 400,
          });
        }

        const mutualFriends = await getMutualFriends(userId, otherUserId);
        return {
          mutualFriends,
          count: mutualFriends.length,
        };
      } catch (error) {
        fastify.log.error('Error fetching mutual friends:', error);
        return reply.code(500).send({
          message: 'Failed to fetch mutual friends',
          error: 'Internal Server Error',
          statusCode: 500,
        });
      }
    }
  );

  // GET /friends/:userId/status - Check friendship status with another user
  fastify.get<{ Params: UserParams }>(
    '/friends/:userId/status',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['friends'],
        summary: 'Check friendship status',
        description: 'Check if users are friends or have pending requests',
        headers: authHeaderSchema,
        params: {
          type: 'object',
          properties: {
            userId: { type: 'string', description: "Other user's ID" },
          },
          required: ['userId'],
        },
        response: {
          200: {
            description: 'Friendship status',
            type: 'object',
            properties: {
              isFriend: { type: 'boolean' },
              hasPendingRequest: { type: 'boolean' },
              requestDirection: { type: 'string', enum: ['sent', 'received', 'none'] },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const otherUserId = parseInt(request.params.userId, 10);
        const userId = request.user!.id;

        if (isNaN(otherUserId)) {
          return reply.code(400).send({
            message: 'Invalid user ID',
            error: 'Bad Request',
            statusCode: 400,
          });
        }

        const isFriend = await areFriends(userId, otherUserId);

        // Check for pending requests
        const sentRequests = await getSentFriendRequests(userId);
        const receivedRequests = await getReceivedFriendRequests(userId);

        const hasSentRequest = sentRequests.some(req => req.receiver.id === otherUserId);
        const hasReceivedRequest = receivedRequests.some(req => req.sender.id === otherUserId);

        let requestDirection = 'none';
        if (hasSentRequest) {
          requestDirection = 'sent';
        } else if (hasReceivedRequest) {
          requestDirection = 'received';
        }

        return {
          isFriend,
          hasPendingRequest: hasSentRequest || hasReceivedRequest,
          requestDirection,
        };
      } catch (error) {
        fastify.log.error('Error checking friendship status:', error);
        return reply.code(500).send({
          message: 'Failed to check friendship status',
          error: 'Internal Server Error',
          statusCode: 500,
        });
      }
    }
  );
};

export default friendsRoute;
