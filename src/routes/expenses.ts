import { FastifyPluginAsync } from 'fastify';
import { authenticate, authHeaderSchema } from '../utils/middleware.js';
import { isGroupMember } from '../repositories/groupRepo.js';
import {
  getUserExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
} from '../repositories/expenseRepo.js';

interface ExpenseParams {
  id: string;
}

interface CreateExpenseBody {
  title: string;
  description?: string;
  amount: number;
  groupId?: number;
  categoryId?: number;
}

interface UpdateExpenseBody {
  title?: string;
  amount?: number;
  categoryId?: number;
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
        const expenses = await getUserExpenses(request.user!.id, {
          orderBy: 'paidAt',
          orderDirection: 'desc',
          includeDetails: false, // For performance on list view
        });

        // Convert Decimal amounts to numbers for JSON response
        const formattedExpenses = expenses.map(expense => ({
          ...expense,
          amount: expense.amount.toNumber(),
        }));

        return formattedExpenses;
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

        const expense = await getExpenseById(id);

        if (!expense || expense.userId !== request.user!.id) {
          return reply.code(404).send({
            message: 'Expense not found',
            error: 'Not Found',
            statusCode: 404,
          });
        }

        // Convert Decimal amounts to numbers for JSON response
        return {
          ...expense,
          amount: expense.amount.toNumber(),
          splits: expense.splits.map(split => ({
            ...split,
            amount: split.amount.toNumber(),
          })),
        };
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
            categoryId: {
              type: 'integer',
              description: 'Category ID (optional, for categorized expenses)',
            },
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
          400: {
            description: 'Validation error',
            type: 'object',
            properties: {
              message: { type: 'string' },
              error: { type: 'string' },
              statusCode: { type: 'integer' },
            },
          },
          403: {
            description: 'Not authorized to add expense to group',
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
        const { title, description, amount, groupId, categoryId } =
          request.body as CreateExpenseBody;

        // Validate that user can add expense to group (if groupId provided)
        if (groupId) {
          const isMember = await isGroupMember(groupId, request.user!.id);
          if (!isMember) {
            return reply.code(403).send({
              message: 'You are not a member of this group',
              error: 'Forbidden',
              statusCode: 403,
            });
          }
        }

        const expense = await createExpense({
          title,
          description,
          amount,
          userId: request.user!.id,
          groupId,
          categoryId,
        });

        // Convert Decimal amounts to numbers for JSON response
        return reply.code(201).send({
          ...expense,
          amount: expense.amount.toNumber(),
          splits: expense.splits.map(split => ({
            ...split,
            amount: split.amount.toNumber(),
          })),
        });
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

  // PUT /expenses/:id - Update user's expense
  fastify.put<{ Params: ExpenseParams; Body: UpdateExpenseBody }>(
    '/expenses/:id',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['expenses'],
        summary: "Update user's expense",
        description: 'Update a specific expense (only accessible by the owner)',
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
            categoryId: {
              type: 'integer',
              description: 'Category ID (optional, for categorized expenses)',
            },
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

        // First check if expense exists and belongs to user
        const existingExpense = await getExpenseById(id);
        if (!existingExpense || existingExpense.userId !== request.user!.id) {
          return reply.code(404).send({
            message: 'Expense not found',
            error: 'Not Found',
            statusCode: 404,
          });
        }

        const updatedExpense = await updateExpense(id, request.body as UpdateExpenseBody);

        // Convert Decimal amounts to numbers for JSON response
        return {
          ...updatedExpense,
          amount: updatedExpense.amount.toNumber(),
          splits: updatedExpense.splits.map(split => ({
            ...split,
            amount: split.amount.toNumber(),
          })),
        };
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

  // DELETE /expenses/:id - Delete user's expense
  fastify.delete<{ Params: ExpenseParams }>(
    '/expenses/:id',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['expenses'],
        summary: "Delete user's expense",
        description: 'Delete a specific expense (only accessible by the owner)',
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

        // First check if expense exists and belongs to user
        const existingExpense = await getExpenseById(id);
        if (!existingExpense || existingExpense.userId !== request.user!.id) {
          return reply.code(404).send({
            message: 'Expense not found',
            error: 'Not Found',
            statusCode: 404,
          });
        }

        await deleteExpense(id);

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
