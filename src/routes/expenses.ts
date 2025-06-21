import { FastifyPluginAsync } from 'fastify'
import { prisma } from '../app.js'

interface ExpenseParams {
  id: string
}

interface CreateExpenseBody {
  title: string
  amount: number
  userId: number
}

interface UpdateExpenseBody {
  title?: string
  amount?: number
}

const expensesRoute: FastifyPluginAsync = async (fastify) => {
  // GET /expenses - List all expenses
  fastify.get('/expenses', {
    schema: {
      tags: ['expenses'],
      summary: 'List all expenses',
      description: 'Retrieve a list of all expenses',
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
  }, async (request, reply) => {
    try {
      const expenses = await prisma.expense.findMany({
        orderBy: { id: 'desc' }
      })
      return expenses
    } catch (error) {
      fastify.log.error('Error fetching expenses:', error)
      return reply.code(500).send({ error: 'Failed to fetch expenses' })
    }
  })

  // GET /expenses/:id - Get expense by ID
  fastify.get<{ Params: ExpenseParams }>('/expenses/:id', {
    schema: {
      tags: ['expenses'],
      summary: 'Get expense by ID',
      description: 'Retrieve a specific expense by its ID',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Expense ID' }
        },
        required: ['id']
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
            userId: { type: 'integer' }
          }
        },
        404: {
          description: 'Expense not found',
          type: 'object',
          properties: {
            message: { type: 'string' },
            error: { type: 'string' },
            statusCode: { type: 'integer' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const id = parseInt(request.params.id, 10)
      
      if (isNaN(id)) {
        return reply.code(400).send({
          message: 'Invalid expense ID',
          error: 'Bad Request',
          statusCode: 400
        })
      }

      const expense = await prisma.expense.findUnique({
        where: { id }
      })

      if (!expense) {
        return reply.code(404).send({
          message: 'Expense not found',
          error: 'Not Found',
          statusCode: 404
        })
      }

      return expense
    } catch (error) {
      fastify.log.error('Error fetching expense:', error)
      return reply.code(500).send({ error: 'Failed to fetch expense' })
    }
  })

  // POST /expenses - Create new expense
  fastify.post<{ Body: CreateExpenseBody }>('/expenses', {
    schema: {
      tags: ['expenses'],
      summary: 'Create a new expense',
      description: 'Create a new expense record',
      body: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Expense title' },
          amount: { type: 'number', description: 'Expense amount' },
          userId: { type: 'integer', description: 'User ID who made the expense' }
        },
        required: ['title', 'amount', 'userId']
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
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { title, amount, userId } = request.body

      const expense = await prisma.expense.create({
        data: { title, amount, userId }
      })

      return reply.code(201).send(expense)
    } catch (error) {
      fastify.log.error('Error creating expense:', error)
      return reply.code(500).send({ error: 'Failed to create expense' })
    }
  })

  // PATCH /expenses/:id - Update expense
  fastify.patch<{ Params: ExpenseParams; Body: UpdateExpenseBody }>('/expenses/:id', {
    schema: {
      tags: ['expenses'],
      summary: 'Update an expense',
      description: 'Update an existing expense by ID',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Expense ID' }
        },
        required: ['id']
      },
      body: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Expense title' },
          amount: { type: 'number', description: 'Expense amount' }
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
            message: { type: 'string' },
            error: { type: 'string' },
            statusCode: { type: 'integer' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const id = parseInt(request.params.id, 10)
      
      if (isNaN(id)) {
        return reply.code(400).send({
          message: 'Invalid expense ID',  
          error: 'Bad Request',
          statusCode: 400
        })
      }

      const updateData = request.body

      const expense = await prisma.expense.update({
        where: { id },
        data: updateData
      })

      return expense
    } catch (error: any) {
      if (error.code === 'P2025') {
        return reply.code(404).send({
          message: 'Expense not found',
          error: 'Not Found',
          statusCode: 404
        })
      }
      
      fastify.log.error('Error updating expense:', error)
      return reply.code(500).send({ error: 'Failed to update expense' })
    }
  })

  // DELETE /expenses/:id - Delete expense
  fastify.delete<{ Params: ExpenseParams }>('/expenses/:id', {
    schema: {
      tags: ['expenses'],
      summary: 'Delete an expense',
      description: 'Delete an existing expense by ID',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Expense ID' }
        },
        required: ['id']
      },
      response: {
        200: {
          description: 'Expense deleted successfully',
          type: 'object',
          properties: {
            message: { type: 'string' }
          }
        },
        404: {
          description: 'Expense not found',
          type: 'object',
          properties: {
            message: { type: 'string' },
            error: { type: 'string' },
            statusCode: { type: 'integer' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const id = parseInt(request.params.id, 10)
      
      if (isNaN(id)) {
        return reply.code(400).send({
          message: 'Invalid expense ID',
          error: 'Bad Request',
          statusCode: 400
        })
      }

      await prisma.expense.delete({
        where: { id }
      })

      return { message: 'Expense deleted successfully' }
    } catch (error: any) {
      if (error.code === 'P2025') {
        return reply.code(404).send({
          message: 'Expense not found',
          error: 'Not Found',
          statusCode: 404
        })
      }
      
      fastify.log.error('Error deleting expense:', error)
      return reply.code(500).send({ error: 'Failed to delete expense' })
    }
  })
}

export default expensesRoute 