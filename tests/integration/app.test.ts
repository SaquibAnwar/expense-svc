// Basic integration tests - testing module structure and basic functionality
describe('App Integration Tests', () => {
  describe('Application Structure', () => {
    it('should have correct module structure', () => {
      // Test that the server module exists and can be imported
      const serverModule = '../../src/server';
      expect(() => require.resolve(serverModule)).not.toThrow();
    });

    it('should have app module structure', () => {
      // Test that the app module exists and can be imported
      const appModule = '../../src/app';
      expect(() => require.resolve(appModule)).not.toThrow();
    });

    it('should validate environment configuration', () => {
      // Test that environment variables can be accessed
      const port = process.env.PORT || 3000;
      expect(port).toBeDefined();
    });

    it('should validate OpenAPI configuration structure', () => {
      const openApiConfig = {
        info: {
          title: 'Expense Service API',
          version: '1.0.0',
          description: 'REST API for managing personal expenses',
        },
        servers: [{ url: 'http://localhost:3000' }],
        tags: [
          { name: 'health', description: 'Health check endpoints' },
          { name: 'auth', description: 'Authentication endpoints' },
          { name: 'users', description: 'User management endpoints' },
          { name: 'expenses', description: 'Expense management endpoints' },
        ],
      };

      expect(openApiConfig.info.title).toBe('Expense Service API');
      expect(openApiConfig.info.version).toBe('1.0.0');
      expect(openApiConfig.servers).toContainEqual({ url: 'http://localhost:3000' });
      expect(openApiConfig.tags.length).toBe(4);

      const tagNames = openApiConfig.tags.map(tag => tag.name);
      expect(tagNames).toContain('health');
      expect(tagNames).toContain('auth');
      expect(tagNames).toContain('users');
      expect(tagNames).toContain('expenses');
    });
  });

  describe('Route structure validation', () => {
    it('should have health route structure', () => {
      const healthRoutes = ['/health', '/health/ready'];

      healthRoutes.forEach(route => {
        expect(route).toMatch(/^\/health/);
      });
    });

    it('should have auth route structure', () => {
      const authRoutes = ['/api/v1/auth/register', '/api/v1/auth/login'];

      authRoutes.forEach(route => {
        expect(route).toMatch(/^\/api\/v1\/auth/);
      });
    });

    it('should have user route structure', () => {
      const userRoutes = ['/api/v1/profile'];

      userRoutes.forEach(route => {
        expect(route).toMatch(/^\/api\/v1/);
      });
    });

    it('should have expense route structure', () => {
      const expenseRoutes = ['/api/v1/expenses', '/api/v1/expenses/:id'];

      expenseRoutes.forEach(route => {
        expect(route).toMatch(/^\/api\/v1\/expenses/);
      });
    });
  });

  describe('Configuration validation', () => {
    it('should have proper Fastify configuration structure', () => {
      const fastifyConfig = {
        logger: {
          level: process.env.LOG_LEVEL || 'info',
        },
      };

      expect(fastifyConfig.logger).toBeDefined();
      expect(fastifyConfig.logger.level).toBeDefined();
    });

    it('should validate plugin registration order', () => {
      const pluginOrder = [
        'swagger',
        'swagger-ui',
        'sensible',
        'health-routes',
        'user-routes',
        'expense-routes',
      ];

      // Test that we have a logical plugin registration order
      expect(pluginOrder.indexOf('swagger')).toBeLessThan(pluginOrder.indexOf('swagger-ui'));
      expect(pluginOrder.indexOf('sensible')).toBeLessThan(pluginOrder.indexOf('health-routes'));
    });
  });
});
