import { FastifyPluginAsync } from 'fastify';
import * as repo from '../../../repositories/expenseRepo';

const expenseRoutes: FastifyPluginAsync = async (app) => {
  /* ───── List all expenses ───── */
  app.get('/', {
    schema: {
      tags: ['expenses'],
      summary: 'List all expenses',
      description: 'Retrieve a list of all expenses, ordered by most recent first',
      response: {
        200: {
          description: 'List of expenses',
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              title: { type: 'string' },
              amount: { type: 'number' },
              paidAt: { type: 'string', format: 'date-time' },
              userId: { type: 'integer' }
            }
          }
        }
      }
    }
  }, async () => repo.listExpenses());

  /* ───── Get one expense by ID ───── */
  app.get<{ Params: { id: string } }>('/:id', {
    schema: {
      tags: ['expenses'],
      summary: 'Get expense by ID',
      description: 'Retrieve a specific expense by its unique identifier',
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: {
            type: 'string',
            description: 'The expense ID'
          }
        }
      },
      response: {
        200: {
          description: 'Expense found',
          type: 'object',
          properties: {
            id: { type: 'integer' },
            title: { type: 'string' },
            amount: { type: 'number' },
            paidAt: { type: 'string', format: 'date-time' },
            userId: { type: 'integer' }
          }
        },
        404: {
          description: 'Expense not found',
          type: 'object',
          properties: {
            statusCode: { type: 'integer' },
            error: { type: 'string' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (req, reply) => {
    const exp = await repo.getExpense(Number(req.params.id));
    if (!exp) return reply.code(404).send({ 
      statusCode: 404,
      error: 'Not Found',
      message: 'Expense not found' 
    });
    return exp;
  });

  /* ───── Create a new expense ───── */
  app.post<{
    Body: { title: string; amount: number; userId: number };
  }>('/', {
    schema: {
      tags: ['expenses'],
      summary: 'Create a new expense',
      description: 'Create a new expense record',
      body: {
        type: 'object',
        required: ['title', 'amount', 'userId'],
        properties: {
          title: { type: 'string' },
          amount: { type: 'number' },
          userId: { type: 'integer' }
        }
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
            userId: { type: 'integer' }
          }
        },
        400: {
          description: 'Invalid request data',
          type: 'object',
          properties: {
            statusCode: { type: 'integer' },
            error: { type: 'string' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (req, reply) => {
    const exp = await repo.createExpense(req.body);
    reply.code(201).send(exp);
  });

  /* ───── Patch an expense ───── */
  app.patch<{
    Params: { id: string };
    Body: Partial<{ title: string; amount: number }>;
  }>('/:id', {
    schema: {
      tags: ['expenses'],
      summary: 'Update an expense',
      description: 'Partially update an existing expense record',
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: {
            type: 'string',
            description: 'The expense ID'
          }
        }
      },
      body: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          amount: { type: 'number' }
        }
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
            userId: { type: 'integer' }
          }
        },
        404: {
          description: 'Expense not found',
          type: 'object',
          properties: {
            statusCode: { type: 'integer' },
            error: { type: 'string' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (req, reply) => {
    const exp = await repo.updateExpense(Number(req.params.id), req.body);
    reply.send(exp);
  });

  /* ───── Delete an expense ───── */
  app.delete<{ Params: { id: string } }>('/:id', {
    schema: {
      tags: ['expenses'],
      summary: 'Delete an expense',
      description: 'Permanently delete an expense record',
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: {
            type: 'string',
            description: 'The expense ID'
          }
        }
      },
      response: {
        204: {
          description: 'Expense deleted successfully'
        },
        404: {
          description: 'Expense not found',
          type: 'object',
          properties: {
            statusCode: { type: 'integer' },
            error: { type: 'string' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (req, reply) => {
    await repo.deleteExpense(Number(req.params.id));
    reply.code(204).send();
  });
};

export default expenseRoutes;