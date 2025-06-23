import { FastifyInstance } from 'fastify';
import { Decimal } from '@prisma/client/runtime/library';
import {
  getUserSettlements,
  getSettlementBetweenUsers,
  settleDebtBetweenUsers,
} from '../repositories/expenseSplitRepo.js';
import { authenticate } from '../utils/middleware.js';

export default async function settlementsRoute(fastify: FastifyInstance) {
  // All routes require authentication
  fastify.addHook('preHandler', authenticate);

  /**
   * Get all settlements for the authenticated user
   */
  fastify.get(
    '/settlements',
    {
      schema: {
        tags: ['settlements'],
        summary: 'Get user settlements',
        description:
          'Get all settlements for the authenticated user (who they owe and who owes them)',
        headers: {
          type: 'object',
          required: ['authorization'],
          properties: {
            authorization: { type: 'string', description: 'Bearer JWT token' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              settlements: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    userId: { type: 'integer', description: 'Other user ID' },
                    name: { type: 'string', description: 'Other user name' },
                    email: { type: 'string', description: 'Other user email' },
                    netAmount: {
                      type: 'string',
                      description: 'Net amount (positive = they owe you, negative = you owe them)',
                    },
                    owedByYou: { type: 'string', description: 'Total amount you owe them' },
                    owedToYou: { type: 'string', description: 'Total amount they owe you' },
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
        const userId = request.user!.id;
        const settlements = await getUserSettlements(userId);

        return reply.send({
          settlements: settlements.map(settlement => ({
            ...settlement,
            netAmount: settlement.netAmount.toString(),
            owedByYou: settlement.owedByYou.toString(),
            owedToYou: settlement.owedToYou.toString(),
          })),
        });
      } catch (error) {
        fastify.log.error('Error fetching user settlements:', error);
        return reply.code(500).send({
          message: 'Failed to fetch settlements',
          error: 'Internal server error',
        });
      }
    }
  );

  /**
   * Get detailed settlement between two users
   */
  fastify.get(
    '/settlements/:otherUserId',
    {
      schema: {
        tags: ['settlements'],
        summary: 'Get settlement with specific user',
        description:
          'Get detailed settlement information between authenticated user and another user',
        headers: {
          type: 'object',
          required: ['authorization'],
          properties: {
            authorization: { type: 'string', description: 'Bearer JWT token' },
          },
        },
        params: {
          type: 'object',
          required: ['otherUserId'],
          properties: {
            otherUserId: { type: 'integer', description: 'ID of the other user' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              user1: {
                type: 'object',
                properties: {
                  id: { type: 'integer' },
                  name: { type: 'string' },
                  email: { type: 'string' },
                },
              },
              user2: {
                type: 'object',
                properties: {
                  id: { type: 'integer' },
                  name: { type: 'string' },
                  email: { type: 'string' },
                },
              },
              user1OwesUser2: { type: 'string', description: 'Amount user1 owes user2' },
              user2OwesUser1: { type: 'string', description: 'Amount user2 owes user1' },
              netAmount: {
                type: 'string',
                description: 'Net amount (positive = user2 owes user1)',
              },
              splits: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    expenseId: { type: 'integer' },
                    expenseTitle: { type: 'string' },
                    amount: { type: 'string' },
                    splitType: { type: 'string', enum: ['EQUAL', 'AMOUNT', 'PERCENTAGE'] },
                    percentage: { type: 'number', nullable: true },
                    paidBy: { type: 'integer', description: 'User ID who paid for the expense' },
                    owedBy: { type: 'integer', description: 'User ID who owes the money' },
                  },
                },
              },
            },
          },
          404: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const userId = request.user!.id;
        const { otherUserId } = request.params as { otherUserId: number };

        const settlement = await getSettlementBetweenUsers(userId, otherUserId);

        return reply.send({
          ...settlement,
          user1OwesUser2: settlement.user1OwesUser2.toString(),
          user2OwesUser1: settlement.user2OwesUser1.toString(),
          netAmount: settlement.netAmount.toString(),
          splits: settlement.splits.map(split => ({
            ...split,
            amount: split.amount.toString(),
          })),
        });
      } catch (error) {
        if (error instanceof Error && error.message.includes('not found')) {
          return reply.code(404).send({
            message: 'User not found',
            error: 'Not found',
          });
        }

        fastify.log.error('Error fetching settlement details:', error);
        return reply.code(500).send({
          message: 'Failed to fetch settlement details',
          error: 'Internal server error',
        });
      }
    }
  );

  /**
   * Settle debt with another user
   */
  fastify.post(
    '/settlements/:otherUserId/settle',
    {
      schema: {
        tags: ['settlements'],
        summary: 'Settle debt with user',
        description: 'Settle debt owed to another user (mark splits as paid)',
        headers: {
          type: 'object',
          required: ['authorization'],
          properties: {
            authorization: { type: 'string', description: 'Bearer JWT token' },
          },
        },
        params: {
          type: 'object',
          required: ['otherUserId'],
          properties: {
            otherUserId: { type: 'integer', description: 'ID of the user you owe money to' },
          },
        },
        body: {
          type: 'object',
          properties: {
            amount: {
              type: 'number',
              description: 'Amount to settle (if not provided, settles all debts)',
              minimum: 0.01,
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              settledAmount: { type: 'string', description: 'Total amount settled' },
              settledSplits: { type: 'integer', description: 'Number of splits marked as paid' },
            },
          },
          400: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const payerId = request.user!.id;
        const { otherUserId: payeeId } = request.params as { otherUserId: number };
        const { amount } = request.body as { amount?: number };

        // Validate that user is settling their own debt
        if (payerId === payeeId) {
          return reply.code(400).send({
            message: 'Cannot settle debt with yourself',
            error: 'Invalid request',
          });
        }

        const settlementAmount = amount ? new Decimal(amount) : undefined;
        const result = await settleDebtBetweenUsers(payerId, payeeId, settlementAmount);

        if (result.settledSplits === 0) {
          return reply.code(400).send({
            message: 'No debts found to settle',
            error: 'No debts found',
          });
        }

        return reply.send({
          message: `Successfully settled ${result.settledAmount.toString()} with ${result.settledSplits} split(s)`,
          settledAmount: result.settledAmount.toString(),
          settledSplits: result.settledSplits,
        });
      } catch (error) {
        fastify.log.error('Error settling debt:', error);
        return reply.code(500).send({
          message: 'Failed to settle debt',
          error: 'Internal server error',
        });
      }
    }
  );
}
