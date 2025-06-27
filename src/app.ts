import fastify from 'fastify';
import { PrismaClient } from '@prisma/client';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUI from '@fastify/swagger-ui';
import fastifySensible from '@fastify/sensible';
import healthRoute from './routes/health.js';
import expensesRoute from './routes/expenses.js';
import expenseSplitsRoute from './routes/expenseSplits.js';
import settlementsRoute from './routes/settlements.js';
import usersRoute from './routes/users.js';
import groupsRoute from './routes/groups.js';
import friendsRoute from './routes/friends.js';
import categoriesRoute from './routes/categories.js';

// Initialize Prisma client
export const prisma = new PrismaClient();

async function createApp() {
  // Create Fastify app with options
  const app = fastify({
    logger: {
      level: 'info',
      transport: {
        target: 'pino-pretty',
      },
    },
  });

  // Register plugins
  await app.register(fastifySwagger, {
    openapi: {
      info: {
        title: 'Expense Service API',
        description: 'A RESTful API for managing expenses',
        version: '1.0.0',
      },
      servers: [{ url: 'http://localhost:3000' }],
      tags: [
        { name: 'health', description: 'Health check endpoints' },
        { name: 'auth', description: 'Authentication endpoints' },
        { name: 'users', description: 'User management endpoints' },
        { name: 'expenses', description: 'Expense management endpoints' },
        { name: 'expense-splits', description: 'Expense splitting endpoints' },
        { name: 'settlements', description: 'Settlement tracking endpoints' },
        { name: 'groups', description: 'Group management endpoints' },
        { name: 'friends', description: 'Friend system endpoints' },
        { name: 'categories', description: 'Expense category management endpoints' },
        { name: 'analytics', description: 'Analytics and reporting endpoints' },
      ],
    },
  });

  await app.register(fastifySwaggerUI, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
    },
  });

  await app.register(fastifySensible);

  // Register routes
  await app.register(healthRoute);
  await app.register(usersRoute, { prefix: '/api/v1' });
  await app.register(expensesRoute, { prefix: '/api/v1' });
  await app.register(expenseSplitsRoute, { prefix: '/api/v1' });
  await app.register(settlementsRoute, { prefix: '/api/v1' });
  await app.register(groupsRoute, { prefix: '/api/v1' });
  await app.register(friendsRoute, { prefix: '/api/v1' });
  await app.register(categoriesRoute, { prefix: '/api/v1' });

  // Graceful shutdown
  const gracefulShutdown = async () => {
    await prisma.$disconnect();
    await app.close();
    process.exit(0);
  };

  process.on('SIGINT', gracefulShutdown);
  process.on('SIGTERM', gracefulShutdown);

  return app;
}

export default createApp;
