import { FastifyPluginAsync } from 'fastify';
import { GroupMemberRole } from '@prisma/client';
import {
  createGroup,
  getGroupById,
  getUserGroups,
  updateGroup,
  deactivateGroup,
  addGroupMember,
  removeGroupMember,
  updateMemberRole,
  getGroupMembers,
  getGroupStats,
  isGroupMember,
  isGroupAdmin,
} from '../repositories/groupRepo.js';
import { getUserByEmail } from '../repositories/userRepo.js';
import { authenticate, authHeaderSchema } from '../utils/middleware.js';

interface GroupParams {
  id: string;
}

interface MemberParams {
  id: string;
  userId: string;
}

interface CreateGroupBody {
  name: string;
  description?: string;
  avatar?: string;
}

interface UpdateGroupBody {
  name?: string;
  description?: string;
  avatar?: string;
}

interface AddMemberBody {
  email: string;
  role?: GroupMemberRole;
}

interface UpdateMemberRoleBody {
  role: GroupMemberRole;
}

const groupsRoute: FastifyPluginAsync = async fastify => {
  // GET /groups - List user's groups
  fastify.get(
    '/groups',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['groups'],
        summary: "List user's groups",
        description: 'Retrieve a list of groups where the user is a member',
        headers: authHeaderSchema,
        response: {
          200: {
            description: 'List of user groups',
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'integer' },
                name: { type: 'string' },
                description: { type: 'string' },
                avatar: { type: 'string' },
                isActive: { type: 'boolean' },
                createdAt: { type: 'string', format: 'date-time' },
                updatedAt: { type: 'string', format: 'date-time' },
                creator: {
                  type: 'object',
                  properties: {
                    id: { type: 'integer' },
                    name: { type: 'string' },
                    username: { type: 'string' },
                  },
                },
                members: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      role: { type: 'string', enum: ['ADMIN', 'MEMBER'] },
                      joinedAt: { type: 'string', format: 'date-time' },
                    },
                  },
                },
                _count: {
                  type: 'object',
                  properties: {
                    members: { type: 'integer' },
                    expenses: { type: 'integer' },
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
        const groups = await getUserGroups(request.user!.id);
        return groups;
      } catch (error) {
        fastify.log.error('Error fetching user groups:', error);
        return reply.code(500).send({
          message: 'Failed to fetch groups',
          error: 'Internal Server Error',
          statusCode: 500,
        });
      }
    }
  );

  // GET /groups/:id - Get group details
  fastify.get<{ Params: GroupParams }>(
    '/groups/:id',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['groups'],
        summary: 'Get group details',
        description: 'Retrieve detailed information about a specific group',
        headers: authHeaderSchema,
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Group ID' },
          },
          required: ['id'],
        },
        response: {
          200: {
            description: 'Group details',
            type: 'object',
            properties: {
              id: { type: 'integer', description: 'Group ID' },
              name: { type: 'string', description: 'Group name' },
              description: { type: 'string', nullable: true, description: 'Group description' },
              avatar: { type: 'string', nullable: true, description: 'Group avatar URL' },
              isActive: { type: 'boolean', description: 'Whether the group is active' },
              createdAt: {
                type: 'string',
                format: 'date-time',
                description: 'Group creation timestamp',
              },
              updatedAt: {
                type: 'string',
                format: 'date-time',
                description: 'Group last update timestamp',
              },
              createdBy: { type: 'integer', description: 'Creator user ID' },
              creator: {
                type: 'object',
                description: 'Group creator information',
                properties: {
                  id: { type: 'integer' },
                  name: { type: 'string' },
                  email: { type: 'string' },
                  username: { type: 'string', nullable: true },
                  avatar: { type: 'string', nullable: true },
                },
              },
              members: {
                type: 'array',
                description: 'Group members with their roles and user information',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'integer', description: 'Member relationship ID' },
                    role: { type: 'string', enum: ['ADMIN', 'MEMBER'], description: 'Member role' },
                    joinedAt: {
                      type: 'string',
                      format: 'date-time',
                      description: 'When the member joined',
                    },
                    groupId: { type: 'integer', description: 'Group ID' },
                    userId: { type: 'integer', description: 'User ID' },
                    user: {
                      type: 'object',
                      description: 'Member user information',
                      properties: {
                        id: { type: 'integer' },
                        name: { type: 'string' },
                        email: { type: 'string' },
                        username: { type: 'string', nullable: true },
                        avatar: { type: 'string', nullable: true },
                      },
                    },
                  },
                },
              },
              expenses: {
                type: 'array',
                description: 'Recent group expenses (last 10)',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'integer', description: 'Expense ID' },
                    title: { type: 'string', description: 'Expense title' },
                    description: {
                      type: 'string',
                      nullable: true,
                      description: 'Expense description',
                    },
                    amount: { type: 'string', description: 'Expense amount (decimal as string)' },
                    paidAt: {
                      type: 'string',
                      format: 'date-time',
                      description: 'When the expense was paid',
                    },
                    userId: { type: 'integer', description: 'User who paid the expense' },
                    groupId: {
                      type: 'integer',
                      nullable: true,
                      description: 'Group ID (if group expense)',
                    },
                    user: {
                      type: 'object',
                      description: 'User who paid the expense',
                      properties: {
                        id: { type: 'integer' },
                        name: { type: 'string' },
                        username: { type: 'string', nullable: true },
                      },
                    },
                  },
                },
              },
              _count: {
                type: 'object',
                description: 'Count of related records',
                properties: {
                  members: { type: 'integer', description: 'Total number of group members' },
                  expenses: { type: 'integer', description: 'Total number of group expenses' },
                },
              },
            },
          },
          400: {
            description: 'Invalid group ID',
            type: 'object',
            properties: {
              message: { type: 'string' },
              error: { type: 'string' },
              statusCode: { type: 'integer' },
            },
          },
          403: {
            description: 'Access denied',
            type: 'object',
            properties: {
              message: { type: 'string' },
              error: { type: 'string' },
              statusCode: { type: 'integer' },
            },
          },
          404: {
            description: 'Group not found',
            type: 'object',
            properties: {
              message: { type: 'string' },
              error: { type: 'string' },
              statusCode: { type: 'integer' },
            },
          },
          500: {
            description: 'Internal server error',
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
        const id = parseInt((request.params as GroupParams).id, 10);

        if (isNaN(id)) {
          return reply.code(400).send({
            message: 'Invalid group ID',
            error: 'Bad Request',
            statusCode: 400,
          });
        }

        // Check if user is a member of the group
        const isMember = await isGroupMember(id, request.user!.id);
        if (!isMember) {
          return reply.code(403).send({
            message: 'Access denied. You are not a member of this group.',
            error: 'Forbidden',
            statusCode: 403,
          });
        }

        const group = await getGroupById(id);
        if (!group) {
          return reply.code(404).send({
            message: 'Group not found',
            error: 'Not Found',
            statusCode: 404,
          });
        }

        return group;
      } catch (error) {
        fastify.log.error('Error fetching group:', error);
        return reply.code(500).send({
          message: 'Failed to fetch group',
          error: 'Internal Server Error',
          statusCode: 500,
        });
      }
    }
  );

  // POST /groups - Create new group
  fastify.post<{ Body: CreateGroupBody }>(
    '/groups',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['groups'],
        summary: 'Create a new group',
        description: 'Create a new group with the authenticated user as admin',
        headers: authHeaderSchema,
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 100, description: 'Group name' },
            description: { type: 'string', maxLength: 500, description: 'Group description' },
            avatar: { type: 'string', description: 'Group avatar URL' },
          },
          required: ['name'],
        },
        response: {
          201: {
            description: 'Group created successfully',
            type: 'object',
            properties: {
              id: { type: 'integer' },
              name: { type: 'string' },
              description: { type: 'string' },
              avatar: { type: 'string' },
              isActive: { type: 'boolean' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
              createdBy: { type: 'integer' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { name, description, avatar } = request.body as CreateGroupBody;

        const group = await createGroup({
          name: name.trim(),
          description: description?.trim(),
          avatar,
          createdBy: request.user!.id,
        });

        return reply.code(201).send(group);
      } catch (error) {
        fastify.log.error('Error creating group:', error);
        return reply.code(500).send({
          message: 'Failed to create group',
          error: 'Internal Server Error',
          statusCode: 500,
        });
      }
    }
  );

  // PUT /groups/:id - Update group
  fastify.put<{ Params: GroupParams; Body: UpdateGroupBody }>(
    '/groups/:id',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['groups'],
        summary: 'Update group information',
        description: 'Update group details (admin only)',
        headers: authHeaderSchema,
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Group ID' },
          },
          required: ['id'],
        },
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 100, description: 'Group name' },
            description: { type: 'string', maxLength: 500, description: 'Group description' },
            avatar: { type: 'string', description: 'Group avatar URL' },
          },
        },
        response: {
          200: {
            description: 'Group updated successfully',
            type: 'object',
            properties: {
              id: { type: 'integer' },
              name: { type: 'string' },
              description: { type: 'string' },
              avatar: { type: 'string' },
              isActive: { type: 'boolean' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
              createdBy: { type: 'integer' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const id = parseInt((request.params as GroupParams).id, 10);

        if (isNaN(id)) {
          return reply.code(400).send({
            message: 'Invalid group ID',
            error: 'Bad Request',
            statusCode: 400,
          });
        }

        // Check if user is admin
        const isAdmin = await isGroupAdmin(id, request.user!.id);
        if (!isAdmin) {
          return reply.code(403).send({
            message: 'Access denied. Only admins can update group information.',
            error: 'Forbidden',
            statusCode: 403,
          });
        }

        const { name, description, avatar } = request.body as UpdateGroupBody;
        const updateData: any = {};

        if (name !== undefined) {
          updateData.name = name.trim();
        }
        if (description !== undefined) {
          updateData.description = description.trim();
        }
        if (avatar !== undefined) {
          updateData.avatar = avatar;
        }

        const group = await updateGroup(id, updateData);
        return group;
      } catch (error) {
        fastify.log.error('Error updating group:', error);
        return reply.code(500).send({
          message: 'Failed to update group',
          error: 'Internal Server Error',
          statusCode: 500,
        });
      }
    }
  );

  // DELETE /groups/:id - Deactivate group
  fastify.delete<{ Params: GroupParams }>(
    '/groups/:id',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['groups'],
        summary: 'Deactivate group',
        description: 'Deactivate a group (admin only)',
        headers: authHeaderSchema,
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Group ID' },
          },
          required: ['id'],
        },
        response: {
          200: {
            description: 'Group deactivated successfully',
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
        const id = parseInt((request.params as GroupParams).id, 10);

        if (isNaN(id)) {
          return reply.code(400).send({
            message: 'Invalid group ID',
            error: 'Bad Request',
            statusCode: 400,
          });
        }

        // Check if user is admin
        const isAdmin = await isGroupAdmin(id, request.user!.id);
        if (!isAdmin) {
          return reply.code(403).send({
            message: 'Access denied. Only admins can deactivate groups.',
            error: 'Forbidden',
            statusCode: 403,
          });
        }

        await deactivateGroup(id);
        return { message: 'Group deactivated successfully' };
      } catch (error) {
        fastify.log.error('Error deactivating group:', error);
        return reply.code(500).send({
          message: 'Failed to deactivate group',
          error: 'Internal Server Error',
          statusCode: 500,
        });
      }
    }
  );

  // GET /groups/:id/members - Get group members
  fastify.get<{ Params: GroupParams }>(
    '/groups/:id/members',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['groups'],
        summary: 'Get group members',
        description: 'Retrieve list of group members',
        headers: authHeaderSchema,
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Group ID' },
          },
          required: ['id'],
        },
        response: {
          200: {
            description: 'List of group members',
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'integer' },
                role: { type: 'string', enum: ['ADMIN', 'MEMBER'] },
                joinedAt: { type: 'string', format: 'date-time' },
                user: {
                  type: 'object',
                  properties: {
                    id: { type: 'integer' },
                    name: { type: 'string' },
                    email: { type: 'string' },
                    username: { type: 'string' },
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
        const id = parseInt((request.params as GroupParams).id, 10);

        if (isNaN(id)) {
          return reply.code(400).send({
            message: 'Invalid group ID',
            error: 'Bad Request',
            statusCode: 400,
          });
        }

        // Check if user is a member
        const isMember = await isGroupMember(id, request.user!.id);
        if (!isMember) {
          return reply.code(403).send({
            message: 'Access denied. You are not a member of this group.',
            error: 'Forbidden',
            statusCode: 403,
          });
        }

        const members = await getGroupMembers(id);
        return members;
      } catch (error) {
        fastify.log.error('Error fetching group members:', error);
        return reply.code(500).send({
          message: 'Failed to fetch group members',
          error: 'Internal Server Error',
          statusCode: 500,
        });
      }
    }
  );

  // POST /groups/:id/members - Add member to group
  fastify.post<{ Params: GroupParams; Body: AddMemberBody }>(
    '/groups/:id/members',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['groups'],
        summary: 'Add member to group',
        description: 'Add a new member to the group (admin only)',
        headers: authHeaderSchema,
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Group ID' },
          },
          required: ['id'],
        },
        body: {
          type: 'object',
          properties: {
            email: { type: 'string', format: 'email', description: 'Email of user to add' },
            role: { type: 'string', enum: ['ADMIN', 'MEMBER'], description: 'Member role' },
          },
          required: ['email'],
        },
        response: {
          201: {
            description: 'Member added successfully',
            type: 'object',
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const id = parseInt((request.params as GroupParams).id, 10);

        if (isNaN(id)) {
          return reply.code(400).send({
            message: 'Invalid group ID',
            error: 'Bad Request',
            statusCode: 400,
          });
        }

        // Check if user is admin
        const isAdmin = await isGroupAdmin(id, request.user!.id);
        if (!isAdmin) {
          return reply.code(403).send({
            message: 'Access denied. Only admins can add members.',
            error: 'Forbidden',
            statusCode: 403,
          });
        }

        const { email, role } = request.body as AddMemberBody;

        // Find user by email
        const userToAdd = await getUserByEmail(email);
        if (!userToAdd) {
          return reply.code(404).send({
            message: 'User not found',
            error: 'Not Found',
            statusCode: 404,
          });
        }

        // Check if user is already a member
        const existingMember = await isGroupMember(id, userToAdd.id);
        if (existingMember) {
          return reply.code(400).send({
            message: 'User is already a member of this group',
            error: 'Bad Request',
            statusCode: 400,
          });
        }

        const member = await addGroupMember({
          groupId: id,
          userId: userToAdd.id,
          role: role || GroupMemberRole.MEMBER,
        });

        return reply.code(201).send(member);
      } catch (error) {
        fastify.log.error('Error adding group member:', error);
        return reply.code(500).send({
          message: 'Failed to add group member',
          error: 'Internal Server Error',
          statusCode: 500,
        });
      }
    }
  );

  // PUT /groups/:id/members/:userId - Update member role
  fastify.put<{ Params: MemberParams; Body: UpdateMemberRoleBody }>(
    '/groups/:id/members/:userId',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['groups'],
        summary: 'Update member role',
        description: 'Update a member role in the group (admin only)',
        headers: authHeaderSchema,
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Group ID' },
            userId: { type: 'string', description: 'User ID' },
          },
          required: ['id', 'userId'],
        },
        body: {
          type: 'object',
          properties: {
            role: { type: 'string', enum: ['ADMIN', 'MEMBER'], description: 'New member role' },
          },
          required: ['role'],
        },
        response: {
          200: {
            description: 'Member role updated successfully',
            type: 'object',
            properties: {
              id: { type: 'integer' },
              role: { type: 'string' },
              joinedAt: { type: 'string', format: 'date-time' },
              groupId: { type: 'integer' },
              userId: { type: 'integer' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const groupId = parseInt((request.params as MemberParams).id, 10);
        const userId = parseInt((request.params as MemberParams).userId, 10);

        if (isNaN(groupId) || isNaN(userId)) {
          return reply.code(400).send({
            message: 'Invalid group ID or user ID',
            error: 'Bad Request',
            statusCode: 400,
          });
        }

        // Check if requester is admin
        const isAdmin = await isGroupAdmin(groupId, request.user!.id);
        if (!isAdmin) {
          return reply.code(403).send({
            message: 'Access denied. Only admins can update member roles.',
            error: 'Forbidden',
            statusCode: 403,
          });
        }

        // Check if target user is a member
        const isMember = await isGroupMember(groupId, userId);
        if (!isMember) {
          return reply.code(404).send({
            message: 'User is not a member of this group',
            error: 'Not Found',
            statusCode: 404,
          });
        }

        const { role } = request.body as UpdateMemberRoleBody;

        const updatedMember = await updateMemberRole({
          groupId,
          userId,
          role,
        });

        return updatedMember;
      } catch (error) {
        fastify.log.error('Error updating member role:', error);
        return reply.code(500).send({
          message: 'Failed to update member role',
          error: 'Internal Server Error',
          statusCode: 500,
        });
      }
    }
  );

  // DELETE /groups/:id/members/:userId - Remove member from group
  fastify.delete<{ Params: MemberParams }>(
    '/groups/:id/members/:userId',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['groups'],
        summary: 'Remove member from group',
        description: 'Remove a member from the group (admin only, or user can remove themselves)',
        headers: authHeaderSchema,
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Group ID' },
            userId: { type: 'string', description: 'User ID' },
          },
          required: ['id', 'userId'],
        },
        response: {
          200: {
            description: 'Member removed successfully',
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
        const groupId = parseInt((request.params as MemberParams).id, 10);
        const userId = parseInt((request.params as MemberParams).userId, 10);

        if (isNaN(groupId) || isNaN(userId)) {
          return reply.code(400).send({
            message: 'Invalid group ID or user ID',
            error: 'Bad Request',
            statusCode: 400,
          });
        }

        // Check permissions: admin or removing self
        const isAdmin = await isGroupAdmin(groupId, request.user!.id);
        const isRemovingSelf = userId === request.user!.id;

        if (!isAdmin && !isRemovingSelf) {
          return reply.code(403).send({
            message: 'Access denied. Only admins can remove other members.',
            error: 'Forbidden',
            statusCode: 403,
          });
        }

        // Check if target user is a member
        const isMember = await isGroupMember(groupId, userId);
        if (!isMember) {
          return reply.code(404).send({
            message: 'User is not a member of this group',
            error: 'Not Found',
            statusCode: 404,
          });
        }

        await removeGroupMember(groupId, userId);
        return { message: 'Member removed successfully' };
      } catch (error) {
        fastify.log.error('Error removing group member:', error);
        return reply.code(500).send({
          message: 'Failed to remove group member',
          error: 'Internal Server Error',
          statusCode: 500,
        });
      }
    }
  );

  // GET /groups/:id/stats - Get group statistics
  fastify.get<{ Params: GroupParams }>(
    '/groups/:id/stats',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['groups'],
        summary: 'Get group statistics',
        description: 'Get statistics for a group (members count, expenses count, total amount)',
        headers: authHeaderSchema,
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Group ID' },
          },
          required: ['id'],
        },
        response: {
          200: {
            description: 'Group statistics',
            type: 'object',
            properties: {
              membersCount: { type: 'integer' },
              expensesCount: { type: 'integer' },
              totalAmount: { type: 'number' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const id = parseInt((request.params as GroupParams).id, 10);

        if (isNaN(id)) {
          return reply.code(400).send({
            message: 'Invalid group ID',
            error: 'Bad Request',
            statusCode: 400,
          });
        }

        // Check if user is a member
        const isMember = await isGroupMember(id, request.user!.id);
        if (!isMember) {
          return reply.code(403).send({
            message: 'Access denied. You are not a member of this group.',
            error: 'Forbidden',
            statusCode: 403,
          });
        }

        const stats = await getGroupStats(id);
        if (!stats) {
          return reply.code(404).send({
            message: 'Group not found',
            error: 'Not Found',
            statusCode: 404,
          });
        }

        return stats;
      } catch (error) {
        fastify.log.error('Error fetching group stats:', error);
        return reply.code(500).send({
          message: 'Failed to fetch group statistics',
          error: 'Internal Server Error',
          statusCode: 500,
        });
      }
    }
  );
};

export default groupsRoute;
