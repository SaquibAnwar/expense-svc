import { FastifyPluginAsync } from 'fastify'

const healthRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get('/health', {
    schema: {
      tags: ['health'],
      summary: 'Health check',
      description: 'Check if the service is running and healthy',
      response: {
        200: {
          description: 'Service is healthy',
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' },
            uptime: { type: 'number' },
            environment: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development'
    }
  })
}

export default healthRoute 