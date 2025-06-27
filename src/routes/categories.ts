import { FastifyPluginAsync } from 'fastify';
import { authenticate, authHeaderSchema } from '../utils/middleware.js';
import {
  getUserCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  getDefaultCategories,
  getCategorySpendingSummary,
  getTopSpendingCategories,
  canUserAccessCategory,
} from '../repositories/categoryRepo.js';

interface CategoryParams {
  id: string;
}

interface CreateCategoryBody {
  name: string;
  description?: string;
  icon: string;
  color: string;
}

interface UpdateCategoryBody {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  isActive?: boolean;
}

interface CategoryAnalyticsQuery {
  fromDate?: string;
  toDate?: string;
  limit?: string;
}

const categoriesRoute: FastifyPluginAsync = async fastify => {
  // GET /categories - List user's categories (default + custom)
  fastify.get(
    '/categories',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['categories'],
        summary: "List user's available categories",
        description:
          'Retrieve all categories available to the authenticated user (default + custom)',
        headers: authHeaderSchema,
        querystring: {
          type: 'object',
          properties: {
            includeStats: { type: 'boolean', description: 'Include usage statistics' },
            orderBy: {
              type: 'string',
              enum: ['name', 'createdAt', 'totalAmount', 'expenseCount'],
              description: 'Sort field',
            },
            orderDirection: {
              type: 'string',
              enum: ['asc', 'desc'],
              description: 'Sort direction',
            },
            limit: { type: 'integer', minimum: 1, maximum: 100, description: 'Number of results' },
            offset: { type: 'integer', minimum: 0, description: 'Offset for pagination' },
          },
        },
        response: {
          200: {
            description: 'List of categories',
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'integer' },
                name: { type: 'string' },
                description: { type: 'string' },
                icon: { type: 'string' },
                color: { type: 'string' },
                isDefault: { type: 'boolean' },
                isActive: { type: 'boolean' },
                _count: {
                  type: 'object',
                  properties: {
                    expenses: { type: 'integer' },
                  },
                },
                totalAmount: { type: 'number' },
                averageAmount: { type: 'number' },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const query = request.query as any;
        const includeStats = query.includeStats === 'true';
        const orderBy = query.orderBy || 'name';
        const orderDirection = query.orderDirection || 'asc';
        const limit = query.limit ? parseInt(query.limit) : 50;
        const offset = query.offset ? parseInt(query.offset) : 0;

        const categories = await getUserCategories(request.user!.id, {
          includeStats,
          orderBy,
          orderDirection,
          limit,
          offset,
        });

        // Convert Decimal amounts to numbers for JSON response
        const formattedCategories = categories.map(category => ({
          ...category,
          totalAmount: category.totalAmount?.toNumber(),
          averageAmount: category.averageAmount?.toNumber(),
        }));

        return formattedCategories;
      } catch (error) {
        fastify.log.error('Error fetching categories:', error);
        return reply.code(500).send({
          message: 'Failed to fetch categories',
          error: 'Internal Server Error',
          statusCode: 500,
        });
      }
    }
  );

  // GET /categories/default - List default categories only
  fastify.get(
    '/categories/default',
    {
      schema: {
        tags: ['categories'],
        summary: 'List default categories',
        description: 'Retrieve all default system categories',
        response: {
          200: {
            description: 'List of default categories',
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'integer' },
                name: { type: 'string' },
                description: { type: 'string' },
                icon: { type: 'string' },
                color: { type: 'string' },
                isDefault: { type: 'boolean' },
                isActive: { type: 'boolean' },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const categories = await getDefaultCategories();
        return categories;
      } catch (error) {
        fastify.log.error('Error fetching default categories:', error);
        return reply.code(500).send({
          message: 'Failed to fetch default categories',
          error: 'Internal Server Error',
          statusCode: 500,
        });
      }
    }
  );

  // GET /categories/:id - Get category by ID
  fastify.get<{ Params: CategoryParams }>(
    '/categories/:id',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['categories'],
        summary: 'Get category by ID',
        description: 'Retrieve a specific category by its ID',
        headers: authHeaderSchema,
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Category ID' },
          },
          required: ['id'],
        },
        response: {
          200: {
            description: 'Category details',
            type: 'object',
            properties: {
              id: { type: 'integer' },
              name: { type: 'string' },
              description: { type: 'string' },
              icon: { type: 'string' },
              color: { type: 'string' },
              isDefault: { type: 'boolean' },
              isActive: { type: 'boolean' },
            },
          },
          403: {
            description: 'Access denied',
            type: 'object',
            properties: {
              message: { type: 'string' },
              error: { type: 'string' },
              statusCode: { type: 'integer' },
            },
          },
          404: {
            description: 'Category not found',
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
        const id = parseInt((request.params as CategoryParams).id, 10);

        if (isNaN(id)) {
          return reply.code(400).send({
            message: 'Invalid category ID',
            error: 'Bad Request',
            statusCode: 400,
          });
        }

        // Check if user can access this category
        const canAccess = await canUserAccessCategory(request.user!.id, id);
        if (!canAccess) {
          return reply.code(403).send({
            message: 'Access denied to this category',
            error: 'Forbidden',
            statusCode: 403,
          });
        }

        const category = await getCategoryById(id);

        if (!category) {
          return reply.code(404).send({
            message: 'Category not found',
            error: 'Not Found',
            statusCode: 404,
          });
        }

        return category;
      } catch (error) {
        fastify.log.error('Error fetching category:', error);
        return reply.code(500).send({
          message: 'Failed to fetch category',
          error: 'Internal Server Error',
          statusCode: 500,
        });
      }
    }
  );

  // POST /categories - Create new custom category
  fastify.post<{ Body: CreateCategoryBody }>(
    '/categories',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['categories'],
        summary: 'Create a custom category',
        description: 'Create a new custom category for the authenticated user',
        headers: authHeaderSchema,
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 50, description: 'Category name' },
            description: { type: 'string', maxLength: 200, description: 'Category description' },
            icon: { type: 'string', minLength: 1, description: 'Icon identifier' },
            color: {
              type: 'string',
              pattern: '^#[0-9A-Fa-f]{6}$',
              description: 'Hex color code (e.g., #FF5733)',
            },
          },
          required: ['name', 'icon', 'color'],
        },
        response: {
          201: {
            description: 'Category created successfully',
            type: 'object',
            properties: {
              id: { type: 'integer' },
              name: { type: 'string' },
              description: { type: 'string' },
              icon: { type: 'string' },
              color: { type: 'string' },
              isDefault: { type: 'boolean' },
              isActive: { type: 'boolean' },
              userId: { type: 'integer' },
            },
          },
          400: {
            description: 'Invalid input data',
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
        const body = request.body as CreateCategoryBody;

        const category = await createCategory({
          ...body,
          userId: request.user!.id,
        });

        return reply.code(201).send(category);
      } catch (error: any) {
        fastify.log.error('Error creating category:', error);

        // Handle unique constraint violations
        if (error.code === 'P2002') {
          return reply.code(400).send({
            message: 'A category with this name already exists',
            error: 'Bad Request',
            statusCode: 400,
          });
        }

        return reply.code(500).send({
          message: 'Failed to create category',
          error: 'Internal Server Error',
          statusCode: 500,
        });
      }
    }
  );

  // PUT /categories/:id - Update custom category
  fastify.put<{ Params: CategoryParams; Body: UpdateCategoryBody }>(
    '/categories/:id',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['categories'],
        summary: 'Update a custom category',
        description: 'Update a custom category (only owner can update)',
        headers: authHeaderSchema,
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Category ID' },
          },
          required: ['id'],
        },
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 50, description: 'Category name' },
            description: { type: 'string', maxLength: 200, description: 'Category description' },
            icon: { type: 'string', minLength: 1, description: 'Icon identifier' },
            color: {
              type: 'string',
              pattern: '^#[0-9A-Fa-f]{6}$',
              description: 'Hex color code (e.g., #FF5733)',
            },
            isActive: { type: 'boolean', description: 'Whether category is active' },
          },
        },
        response: {
          200: {
            description: 'Category updated successfully',
            type: 'object',
            properties: {
              id: { type: 'integer' },
              name: { type: 'string' },
              description: { type: 'string' },
              icon: { type: 'string' },
              color: { type: 'string' },
              isDefault: { type: 'boolean' },
              isActive: { type: 'boolean' },
              userId: { type: 'integer' },
            },
          },
          403: {
            description: 'Cannot update default category or not owned by user',
            type: 'object',
            properties: {
              message: { type: 'string' },
              error: { type: 'string' },
              statusCode: { type: 'integer' },
            },
          },
          404: {
            description: 'Category not found',
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
        const id = parseInt((request.params as CategoryParams).id, 10);
        const body = request.body as UpdateCategoryBody;

        if (isNaN(id)) {
          return reply.code(400).send({
            message: 'Invalid category ID',
            error: 'Bad Request',
            statusCode: 400,
          });
        }

        // Check if category exists and user owns it
        const existingCategory = await getCategoryById(id);
        if (!existingCategory) {
          return reply.code(404).send({
            message: 'Category not found',
            error: 'Not Found',
            statusCode: 404,
          });
        }

        // Only allow updates to custom categories owned by the user
        if (existingCategory.isDefault || existingCategory.userId !== request.user!.id) {
          return reply.code(403).send({
            message: 'Cannot update default categories or categories not owned by you',
            error: 'Forbidden',
            statusCode: 403,
          });
        }

        const updatedCategory = await updateCategory(id, body);
        return updatedCategory;
      } catch (error: any) {
        fastify.log.error('Error updating category:', error);

        if (error.code === 'P2002') {
          return reply.code(400).send({
            message: 'A category with this name already exists',
            error: 'Bad Request',
            statusCode: 400,
          });
        }

        return reply.code(500).send({
          message: 'Failed to update category',
          error: 'Internal Server Error',
          statusCode: 500,
        });
      }
    }
  );

  // DELETE /categories/:id - Delete (soft delete) custom category
  fastify.delete<{ Params: CategoryParams }>(
    '/categories/:id',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['categories'],
        summary: 'Delete a custom category',
        description: 'Soft delete a custom category (only owner can delete)',
        headers: authHeaderSchema,
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Category ID' },
          },
          required: ['id'],
        },
        response: {
          200: {
            description: 'Category deleted successfully',
            type: 'object',
            properties: {
              message: { type: 'string' },
              category: {
                type: 'object',
                properties: {
                  id: { type: 'integer' },
                  name: { type: 'string' },
                  isActive: { type: 'boolean' },
                },
              },
            },
          },
          403: {
            description: 'Cannot delete default category or not owned by user',
            type: 'object',
            properties: {
              message: { type: 'string' },
              error: { type: 'string' },
              statusCode: { type: 'integer' },
            },
          },
          404: {
            description: 'Category not found',
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
        const id = parseInt((request.params as CategoryParams).id, 10);

        if (isNaN(id)) {
          return reply.code(400).send({
            message: 'Invalid category ID',
            error: 'Bad Request',
            statusCode: 400,
          });
        }

        // Check if category exists and user owns it
        const existingCategory = await getCategoryById(id);
        if (!existingCategory) {
          return reply.code(404).send({
            message: 'Category not found',
            error: 'Not Found',
            statusCode: 404,
          });
        }

        // Only allow deletion of custom categories owned by the user
        if (existingCategory.isDefault || existingCategory.userId !== request.user!.id) {
          return reply.code(403).send({
            message: 'Cannot delete default categories or categories not owned by you',
            error: 'Forbidden',
            statusCode: 403,
          });
        }

        const deletedCategory = await deleteCategory(id);

        return {
          message: 'Category deleted successfully',
          category: {
            id: deletedCategory.id,
            name: deletedCategory.name,
            isActive: deletedCategory.isActive,
          },
        };
      } catch (error) {
        fastify.log.error('Error deleting category:', error);
        return reply.code(500).send({
          message: 'Failed to delete category',
          error: 'Internal Server Error',
          statusCode: 500,
        });
      }
    }
  );

  // GET /categories/analytics/spending - Get category spending analytics
  fastify.get<{ Querystring: CategoryAnalyticsQuery }>(
    '/categories/analytics/spending',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['categories', 'analytics'],
        summary: 'Get category spending analytics',
        description: 'Get spending breakdown by category with percentages',
        headers: authHeaderSchema,
        querystring: {
          type: 'object',
          properties: {
            fromDate: {
              type: 'string',
              format: 'date',
              description: 'Start date (YYYY-MM-DD)',
            },
            toDate: {
              type: 'string',
              format: 'date',
              description: 'End date (YYYY-MM-DD)',
            },
            limit: {
              type: 'string',
              pattern: '^[0-9]+$',
              description: 'Maximum number of categories to return',
            },
          },
        },
        response: {
          200: {
            description: 'Category spending analytics',
            type: 'array',
            items: {
              type: 'object',
              properties: {
                categoryId: { type: 'integer' },
                categoryName: { type: 'string' },
                categoryIcon: { type: 'string' },
                categoryColor: { type: 'string' },
                totalAmount: { type: 'number' },
                expenseCount: { type: 'integer' },
                averageAmount: { type: 'number' },
                percentage: { type: 'number' },
                lastExpenseDate: { type: 'string', format: 'date-time' },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const query = request.query as CategoryAnalyticsQuery;

        const fromDate = query.fromDate ? new Date(query.fromDate) : undefined;
        const toDate = query.toDate ? new Date(query.toDate) : undefined;
        const limit = query.limit ? parseInt(query.limit) : 10;

        const analytics = await getCategorySpendingSummary(request.user!.id, {
          fromDate,
          toDate,
          limit,
        });

        // Convert Decimal amounts to numbers for JSON response
        const formattedAnalytics = analytics.map(item => ({
          ...item,
          totalAmount: item.totalAmount.toNumber(),
          averageAmount: item.averageAmount.toNumber(),
        }));

        return formattedAnalytics;
      } catch (error) {
        fastify.log.error('Error fetching category analytics:', error);
        return reply.code(500).send({
          message: 'Failed to fetch category analytics',
          error: 'Internal Server Error',
          statusCode: 500,
        });
      }
    }
  );

  // GET /categories/analytics/top-spending - Get top spending categories
  fastify.get<{ Querystring: CategoryAnalyticsQuery }>(
    '/categories/analytics/top-spending',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['categories', 'analytics'],
        summary: 'Get top spending categories',
        description: 'Get the categories with the highest spending',
        headers: authHeaderSchema,
        querystring: {
          type: 'object',
          properties: {
            fromDate: {
              type: 'string',
              format: 'date',
              description: 'Start date (YYYY-MM-DD)',
            },
            toDate: {
              type: 'string',
              format: 'date',
              description: 'End date (YYYY-MM-DD)',
            },
            limit: {
              type: 'string',
              pattern: '^[0-9]+$',
              description: 'Maximum number of categories to return',
            },
          },
        },
        response: {
          200: {
            description: 'Top spending categories',
            type: 'array',
            items: {
              type: 'object',
              properties: {
                categoryId: { type: 'integer' },
                categoryName: { type: 'string' },
                categoryIcon: { type: 'string' },
                categoryColor: { type: 'string' },
                totalAmount: { type: 'number' },
                expenseCount: { type: 'integer' },
                averageAmount: { type: 'number' },
                percentage: { type: 'number' },
                lastExpenseDate: { type: 'string', format: 'date-time' },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const query = request.query as CategoryAnalyticsQuery;

        const fromDate = query.fromDate ? new Date(query.fromDate) : undefined;
        const toDate = query.toDate ? new Date(query.toDate) : undefined;
        const limit = query.limit ? parseInt(query.limit) : 5;

        const topCategories = await getTopSpendingCategories(
          request.user!.id,
          limit,
          fromDate,
          toDate
        );

        // Convert Decimal amounts to numbers for JSON response
        const formattedTopCategories = topCategories.map(item => ({
          ...item,
          totalAmount: item.totalAmount.toNumber(),
          averageAmount: item.averageAmount.toNumber(),
        }));

        return formattedTopCategories;
      } catch (error) {
        fastify.log.error('Error fetching top spending categories:', error);
        return reply.code(500).send({
          message: 'Failed to fetch top spending categories',
          error: 'Internal Server Error',
          statusCode: 500,
        });
      }
    }
  );
};

export default categoriesRoute;
