import { FastifyPluginAsync } from 'fastify';
import { SplitType } from '@prisma/client';
import { authenticate, authHeaderSchema } from '../utils/middleware.js';
import { isGroupMember } from '../repositories/groupRepo.js';
import {
  createExpenseSplits,
  getExpenseSplits,
  getUserSplits,
  markSplitAsPaid,
  getUserBalanceSummary,
  SplitParticipant,
} from '../repositories/expenseSplitRepo.js';
import { prisma } from '../app.js';

interface ExpenseParams {
  id: string;
}

interface CreateSplitBody {
  splitType: SplitType;
  participants: SplitParticipant[];
}

interface MarkPaidParams {
  expenseId: string;
  userId: string;
}

const expenseSplitsRoute: FastifyPluginAsync = async fastify => {
  // POST /expenses/:id/splits - Create splits for an expense
  fastify.post<{ Params: ExpenseParams; Body: CreateSplitBody }>(
    '/expenses/:id/splits',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['expense-splits'],
        summary: 'Create splits for an expense',
        description: 'Split an expense equally, by amount, or by percentage among participants',
        headers: authHeaderSchema,
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Expense ID' },
          },
          required: ['id'],
        },
        body: {
          type: 'object',
          properties: {
            splitType: {
              type: 'string',
              enum: ['EQUAL', 'AMOUNT', 'PERCENTAGE'],
              description: 'Type of split: EQUAL, AMOUNT, or PERCENTAGE',
            },
            participants: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  userId: { type: 'integer', description: 'User ID of participant' },
                  amount: { type: 'number', description: 'Amount for AMOUNT splits' },
                  percentage: {
                    type: 'number',
                    description: 'Percentage for PERCENTAGE splits (0-100)',
                  },
                },
                required: ['userId'],
              },
              minItems: 1,
              description: 'List of participants and their split details',
            },
          },
          required: ['splitType', 'participants'],
        },
        response: {
          201: {
            description: 'Splits created successfully',
            type: 'object',
            properties: {
              message: { type: 'string' },
              splits: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'integer' },
                    amount: { type: 'string' },
                    splitType: { type: 'string' },
                    percentage: { type: 'number' },
                    isPaid: { type: 'boolean' },
                    user: {
                      type: 'object',
                      properties: {
                        id: { type: 'integer' },
                        name: { type: 'string' },
                        email: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
          400: {
            description: 'Invalid request',
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
            description: 'Expense not found',
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
        const expenseId = parseInt(request.params.id, 10);
        const { splitType, participants } = request.body;

        if (isNaN(expenseId)) {
          return reply.code(400).send({
            message: 'Invalid expense ID',
            error: 'Bad Request',
            statusCode: 400,
          });
        }

        // Get the expense and validate ownership/access
        const expense = await prisma.expense.findUnique({
          where: { id: expenseId },
          include: { group: true },
        });

        if (!expense) {
          return reply.code(404).send({
            message: 'Expense not found',
            error: 'Not Found',
            statusCode: 404,
          });
        }

        // Check if user can create splits for this expense
        if (expense.groupId) {
          // For group expenses, user must be a group member
          const isMember = await isGroupMember(expense.groupId, request.user!.id);
          if (!isMember) {
            return reply.code(403).send({
              message: 'Access denied. You are not a member of this group.',
              error: 'Forbidden',
              statusCode: 403,
            });
          }
        } else {
          // For personal expenses, only the owner can create splits
          if (expense.userId !== request.user!.id) {
            return reply.code(403).send({
              message: 'Access denied. You can only split your own expenses.',
              error: 'Forbidden',
              statusCode: 403,
            });
          }
        }

        // Validate participants are group members (for group expenses)
        if (expense.groupId) {
          const groupMembers = await prisma.groupMember.findMany({
            where: { groupId: expense.groupId },
            select: { userId: true },
          });
          const memberIds = groupMembers.map(m => m.userId);

          for (const participant of participants) {
            if (!memberIds.includes(participant.userId)) {
              return reply.code(400).send({
                message: `User ${participant.userId} is not a member of this group`,
                error: 'Bad Request',
                statusCode: 400,
              });
            }
          }
        }

        // Check if splits already exist
        const existingSplits = await getExpenseSplits(expenseId);
        if (existingSplits.length > 0) {
          return reply.code(400).send({
            message: 'Splits already exist for this expense. Delete existing splits first.',
            error: 'Bad Request',
            statusCode: 400,
          });
        }

        // Create the splits
        const splits = await createExpenseSplits({
          expenseId,
          splitType,
          participants,
        });

        return reply.code(201).send({
          message: 'Splits created successfully',
          splits,
        });
      } catch (error) {
        fastify.log.error('Error creating expense splits:', error);

        // Handle specific validation errors
        if (error instanceof Error) {
          if (
            error.message.includes('must equal expense amount') ||
            error.message.includes('must total 100%') ||
            error.message.includes('positive amounts') ||
            error.message.includes('positive percentages') ||
            error.message.includes('At least one participant')
          ) {
            return reply.code(400).send({
              message: error.message,
              error: 'Bad Request',
              statusCode: 400,
            });
          }
        }

        return reply.code(500).send({
          message: 'Failed to create expense splits',
          error: 'Internal Server Error',
          statusCode: 500,
        });
      }
    }
  );

  // GET /expenses/:id/splits - Get splits for an expense
  fastify.get<{ Params: ExpenseParams }>(
    '/expenses/:id/splits',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['expense-splits'],
        summary: 'Get splits for an expense',
        description: 'Retrieve all splits for a specific expense',
        headers: authHeaderSchema,
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Expense ID' },
          },
          required: ['id'],
        },
        response: {
          200: {
            description: 'Expense splits',
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'integer' },
                amount: { type: 'string' },
                splitType: { type: 'string' },
                percentage: { type: 'number' },
                isPaid: { type: 'boolean' },
                user: {
                  type: 'object',
                  properties: {
                    id: { type: 'integer' },
                    name: { type: 'string' },
                    email: { type: 'string' },
                  },
                },
              },
            },
          },
          404: {
            description: 'Expense not found',
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
        const expenseId = parseInt(request.params.id, 10);

        if (isNaN(expenseId)) {
          return reply.code(400).send({
            message: 'Invalid expense ID',
            error: 'Bad Request',
            statusCode: 400,
          });
        }

        // Validate expense exists and user has access
        const expense = await prisma.expense.findUnique({
          where: { id: expenseId },
          include: { group: true },
        });

        if (!expense) {
          return reply.code(404).send({
            message: 'Expense not found',
            error: 'Not Found',
            statusCode: 404,
          });
        }

        // Check access permissions
        if (expense.groupId) {
          const isMember = await isGroupMember(expense.groupId, request.user!.id);
          if (!isMember) {
            return reply.code(403).send({
              message: 'Access denied. You are not a member of this group.',
              error: 'Forbidden',
              statusCode: 403,
            });
          }
        } else if (expense.userId !== request.user!.id) {
          return reply.code(403).send({
            message: 'Access denied. You can only view splits for your own expenses.',
            error: 'Forbidden',
            statusCode: 403,
          });
        }

        const splits = await getExpenseSplits(expenseId);
        return splits;
      } catch (error) {
        fastify.log.error('Error fetching expense splits:', error);
        return reply.code(500).send({
          message: 'Failed to fetch expense splits',
          error: 'Internal Server Error',
          statusCode: 500,
        });
      }
    }
  );

  // GET /splits/my-splits - Get current user's splits
  fastify.get(
    '/splits/my-splits',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['expense-splits'],
        summary: 'Get current user splits',
        description: 'Retrieve all expense splits for the authenticated user',
        headers: authHeaderSchema,
        response: {
          200: {
            description: 'User expense splits',
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'integer' },
                amount: { type: 'string' },
                splitType: { type: 'string' },
                percentage: { type: 'number' },
                isPaid: { type: 'boolean' },
                expense: {
                  type: 'object',
                  properties: {
                    id: { type: 'integer' },
                    title: { type: 'string' },
                    amount: { type: 'string' },
                    paidAt: { type: 'string', format: 'date-time' },
                    user: {
                      type: 'object',
                      properties: {
                        name: { type: 'string' },
                      },
                    },
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
        const splits = await getUserSplits(request.user!.id);
        return splits;
      } catch (error) {
        fastify.log.error('Error fetching user splits:', error);
        return reply.code(500).send({
          message: 'Failed to fetch user splits',
          error: 'Internal Server Error',
          statusCode: 500,
        });
      }
    }
  );

  // PUT /splits/:expenseId/:userId/mark-paid - Mark a split as paid
  fastify.put<{ Params: MarkPaidParams }>(
    '/splits/:expenseId/:userId/mark-paid',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['expense-splits'],
        summary: 'Mark split as paid',
        description: 'Mark a specific expense split as paid',
        headers: authHeaderSchema,
        params: {
          type: 'object',
          properties: {
            expenseId: { type: 'string', description: 'Expense ID' },
            userId: { type: 'string', description: 'User ID' },
          },
          required: ['expenseId', 'userId'],
        },
        response: {
          200: {
            description: 'Split marked as paid',
            type: 'object',
            properties: {
              message: { type: 'string' },
              split: {
                type: 'object',
                properties: {
                  id: { type: 'integer' },
                  amount: { type: 'string' },
                  isPaid: { type: 'boolean' },
                  user: {
                    type: 'object',
                    properties: {
                      id: { type: 'integer' },
                      name: { type: 'string' },
                      email: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
          404: {
            description: 'Split not found',
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
        const expenseId = parseInt(request.params.expenseId, 10);
        const userId = parseInt(request.params.userId, 10);

        if (isNaN(expenseId) || isNaN(userId)) {
          return reply.code(400).send({
            message: 'Invalid expense ID or user ID',
            error: 'Bad Request',
            statusCode: 400,
          });
        }

        // Only the expense owner can mark splits as paid
        const expense = await prisma.expense.findUnique({
          where: { id: expenseId },
        });

        if (!expense) {
          return reply.code(404).send({
            message: 'Expense not found',
            error: 'Not Found',
            statusCode: 404,
          });
        }

        if (expense.userId !== request.user!.id) {
          return reply.code(403).send({
            message: 'Access denied. Only the expense owner can mark splits as paid.',
            error: 'Forbidden',
            statusCode: 403,
          });
        }

        const split = await markSplitAsPaid(expenseId, userId);

        return reply.code(200).send({
          message: 'Split marked as paid successfully',
          split,
        });
      } catch (error) {
        fastify.log.error('Error marking split as paid:', error);
        return reply.code(500).send({
          message: 'Failed to mark split as paid',
          error: 'Internal Server Error',
          statusCode: 500,
        });
      }
    }
  );

  // GET /splits/balance-summary - Get user's balance summary
  fastify.get(
    '/splits/balance-summary',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['expense-splits'],
        summary: 'Get user balance summary',
        description: 'Get summary of what user owes and is owed',
        headers: authHeaderSchema,
        response: {
          200: {
            description: 'Balance summary',
            type: 'object',
            properties: {
              owes: { type: 'string', description: 'Amount user owes to others' },
              owed: { type: 'string', description: 'Amount others owe to user' },
              netBalance: {
                type: 'string',
                description: 'Net balance (positive = owed to user, negative = user owes)',
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const summary = await getUserBalanceSummary(request.user!.id);
        return {
          owes: summary.owes.toString(),
          owed: summary.owed.toString(),
          netBalance: summary.netBalance.toString(),
        };
      } catch (error) {
        fastify.log.error('Error fetching balance summary:', error);
        return reply.code(500).send({
          message: 'Failed to fetch balance summary',
          error: 'Internal Server Error',
          statusCode: 500,
        });
      }
    }
  );
};

export default expenseSplitsRoute;
