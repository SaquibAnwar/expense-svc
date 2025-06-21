import fastify from 'fastify'
import { PrismaClient } from '@prisma/client'
import healthRoute from './routes/health.js'
import expensesRoute from './routes/expenses.js'

// Initialize Prisma client
export const prisma = new PrismaClient()

async function createApp() {
  // Create Fastify app with options
  const app = fastify({
    logger: {
      level: 'info',
      transport: {
        target: 'pino-pretty'
      }
    }
  })

  // Register plugins
  await app.register(import('@fastify/swagger'), {
    openapi: {
      info: {
        title: 'Expense Service API',
        description: 'A RESTful API for managing expenses',
        version: '1.0.0'
      },
      servers: [{ url: 'http://localhost:3000' }],
      tags: [
        { name: 'health', description: 'Health check endpoints' },
        { name: 'expenses', description: 'Expense management endpoints' }
      ]
    }
  })

  await app.register(import('@fastify/swagger-ui'), {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false
    }
  })

  await app.register(import('@fastify/sensible'))

  // Register routes
  await app.register(healthRoute)
  await app.register(expensesRoute, { prefix: '/api/v1' })

  // Graceful shutdown
  const gracefulShutdown = async () => {
    await prisma.$disconnect()
    await app.close()
    process.exit(0)
  }

  process.on('SIGINT', gracefulShutdown)
  process.on('SIGTERM', gracefulShutdown)

  return app
}

export default createApp 