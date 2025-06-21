import { FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'

const swaggerPlugin: FastifyPluginAsync = async (fastify) => {
  // Register swagger documentation
  await fastify.register(swagger, {
    openapi: {
      info: {
        title: 'Expense Service API',
        description: 'A RESTful API for managing expenses',
        version: '1.0.0',
        contact: {
          name: 'API Support',
          email: 'support@expense-service.com'
        }
      },
      servers: [{ url: 'http://localhost:3000' }],
      tags: [
        {
          name: 'expenses',
          description: 'Expense management endpoints'
        }
      ]
    }
  })

  // Register swagger UI
  await fastify.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false
    },
    staticCSP: true,
    transformStaticCSP: (header) => header
  })
}

export default fp(swaggerPlugin) 