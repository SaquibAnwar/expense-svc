import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../app.js';
import { authenticate, authHeaderSchema } from '../utils/middleware.js';
import { isGroupMember } from '../repositories/groupRepo.js';

interface ExpenseParams {
  id: string;
}

interface CreateExpenseBody {
  title: string;
  description?: string;
  amount: number;
  groupId?: number;
}

interface UpdateExpenseBody {
  title?: string;
  amount?: number;
}

const expensesRoute: FastifyPluginAsync = async fastify => {
  // GET /expenses - List user's expenses
  fastify.get(
    '/expenses',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['expenses'],
        summary: "List authenticated user's expenses",
        description: 'Retrieve a list of expenses for the authenticated user',
        headers: authHeaderSchema,
        response: {
          200: {
            description: 'List of user expenses',
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'integer' },
                title: { type: 'string' },
                amount: { type: 'number' },
                paidAt: { type: 'string', format: 'date-time' },
                userId: { type: 'integer' },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const expenses = await prisma.expense.findMany({
          where: { userId: request.user!.id },
          orderBy: { id: 'desc' },
        });
        return expenses;
      } catch (error) {
        fastify.log.error('Error fetching expenses:', error);
        return reply.code(500).send({
          message: 'Failed to fetch expenses',
          error: 'Internal Server Error',
          statusCode: 500,
        });
      }
    }
  );

  // GET /expenses/:id - Get user's expense by ID
  fastify.get<{ Params: ExpenseParams }>(
    '/expenses/:id',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['expenses'],
        summary: "Get user's expense by ID",
        description: 'Retrieve a specific expense by its ID (only accessible by the owner)',
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
            description: 'Expense details',
            type: 'object',
            properties: {
              id: { type: 'integer' },
              title: { type: 'string' },
              amount: { type: 'number' },
              paidAt: { type: 'string', format: 'date-time' },
              userId: { type: 'integer' },
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
        const id = parseInt((request.params as ExpenseParams).id, 10);

        if (isNaN(id)) {
          return reply.code(400).send({
            message: 'Invalid expense ID',
            error: 'Bad Request',
            statusCode: 400,
          });
        }

        const expense = await prisma.expense.findFirst({
          where: {
            id,
            userId: request.user!.id, // Ensure user can only access their own expenses
          },
        });

        if (!expense) {
          return reply.code(404).send({
            message: 'Expense not found',
            error: 'Not Found',
            statusCode: 404,
          });
        }

        return expense;
      } catch (error) {
        fastify.log.error('Error fetching expense:', error);
        return reply.code(500).send({
          message: 'Failed to fetch expense',
          error: 'Internal Server Error',
          statusCode: 500,
        });
      }
    }
  );

  // POST /expenses - Create new expense
  fastify.post<{ Body: CreateExpenseBody }>(
    '/expenses',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['expenses'],
        summary: 'Create a new expense',
        description: 'Create a new expense record for the authenticated user',
        headers: authHeaderSchema,
        body: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Expense title' },
            description: { type: 'string', description: 'Expense description' },
            amount: { type: 'number', description: 'Expense amount' },
            groupId: { type: 'integer', description: 'Group ID (optional, for group expenses)' },
          },
          required: ['title', 'amount'],
        },
        response: {
          201: {
            description: 'Expense created successfully',
            type: 'object',
            properties: {
              id: { type: 'integer' },
              title: { type: 'string' },
              amount: { type: 'number' },
              paidAt: { type: 'string', format: 'date-time' },
              userId: { type: 'integer' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { title, description, amount, groupId } = request.body as CreateExpenseBody;

        // If groupId is provided, validate user is a member
        if (groupId) {
          const isMember = await isGroupMember(groupId, request.user!.id);
          if (!isMember) {
            return reply.code(403).send({
              message: 'Access denied. You are not a member of this group.',
              error: 'Forbidden',
              statusCode: 403,
            });
          }
        }

        const expense = await prisma.expense.create({
          data: {
            title,
            description,
            amount,
            userId: request.user!.id,
            groupId: groupId || null,
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
              },
            },
            group: groupId ? {
              select: {
                id: true,
                name: true,
              },
            } : false,
          },
        });

        return reply.code(201).send(expense);
      } catch (error) {
        fastify.log.error('Error creating expense:', error);
        return reply.code(500).send({
          message: 'Failed to create expense',
          error: 'Internal Server Error',
          statusCode: 500,
        });
      }
    }
  );

  // PATCH /expenses/:id - Update expense
  fastify.patch<{ Params: ExpenseParams; Body: UpdateExpenseBody }>(
    '/expenses/:id',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['expenses'],
        summary: 'Update an expense',
        description: 'Update an existing expense by ID (only accessible by the owner)',
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
            title: { type: 'string', description: 'Expense title' },
            amount: { type: 'number', description: 'Expense amount' },
          },
        },
        response: {
          200: {
            description: 'Expense updated successfully',
            type: 'object',
            properties: {
              id: { type: 'integer' },
              title: { type: 'string' },
              amount: { type: 'number' },
              paidAt: { type: 'string', format: 'date-time' },
              userId: { type: 'integer' },
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
        const id = parseInt((request.params as ExpenseParams).id, 10);

        if (isNaN(id)) {
          return reply.code(400).send({
            message: 'Invalid expense ID',
            error: 'Bad Request',
            statusCode: 400,
          });
        }

        const updateData = request.body as UpdateExpenseBody;

        const expense = await prisma.expense.updateMany({
          where: {
            id,
            userId: request.user!.id, // Ensure user can only update their own expenses
          },
          data: updateData,
        });

        if (expense.count === 0) {
          return reply.code(404).send({
            message: 'Expense not found',
            error: 'Not Found',
            statusCode: 404,
          });
        }

        // Fetch and return the updated expense
        const updatedExpense = await prisma.expense.findFirst({
          where: { id, userId: request.user!.id },
        });

        return updatedExpense;
      } catch (error) {
        fastify.log.error('Error updating expense:', error);
        return reply.code(500).send({
          message: 'Failed to update expense',
          error: 'Internal Server Error',
          statusCode: 500,
        });
      }
    }
  );

  // DELETE /expenses/:id - Delete expense
  fastify.delete<{ Params: ExpenseParams }>(
    '/expenses/:id',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['expenses'],
        summary: 'Delete an expense',
        description: 'Delete an existing expense by ID (only accessible by the owner)',
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
            description: 'Expense deleted successfully',
            type: 'object',
            properties: {
              message: { type: 'string' },
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
        const id = parseInt((request.params as ExpenseParams).id, 10);

        if (isNaN(id)) {
          return reply.code(400).send({
            message: 'Invalid expense ID',
            error: 'Bad Request',
            statusCode: 400,
          });
        }

        const deletedExpense = await prisma.expense.deleteMany({
          where: {
            id,
            userId: request.user!.id, // Ensure user can only delete their own expenses
          },
        });

        if (deletedExpense.count === 0) {
          return reply.code(404).send({
            message: 'Expense not found',
            error: 'Not Found',
            statusCode: 404,
          });
        }

        return { message: 'Expense deleted successfully' };
      } catch (error) {
        fastify.log.error('Error deleting expense:', error);
        return reply.code(500).send({
          message: 'Failed to delete expense',
          error: 'Internal Server Error',
          statusCode: 500,
        });
      }
    }
  );
};

export default expensesRoute;
