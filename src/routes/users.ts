import { FastifyPluginAsync } from 'fastify';
import {
  createUser,
  verifyPassword,
  isEmailTaken,
  isUsernameTaken,
  getUserProfile,
  getUserById,
  updateUser,
} from '../repositories/userRepo.js';
import {
  createAuthResponse,
  isValidEmail,
  isValidPassword,
  isValidUsername,
  verifyToken,
} from '../utils/auth.js';

interface RegisterBody {
  email: string;
  password: string;
  name: string;
  username?: string;
  phoneNumber?: string;
}

interface LoginBody {
  email: string;
  password: string;
}

interface UpdateProfileBody {
  name?: string;
  username?: string;
  phoneNumber?: string;
  avatar?: string;
}

interface UserParams {
  id: string;
}

const usersRoute: FastifyPluginAsync = async fastify => {
  // POST /auth/register - Register new user
  fastify.post<{ Body: RegisterBody }>(
    '/auth/register',
    {
      schema: {
        tags: ['auth'],
        summary: 'Register a new user',
        description: 'Create a new user account with email and password',
        body: {
          type: 'object',
          properties: {
            email: { type: 'string', format: 'email', description: 'User email address' },
            password: {
              type: 'string',
              minLength: 8,
              description: 'User password (min 8 characters)',
            },
            name: { type: 'string', minLength: 1, description: 'User full name' },
            username: {
              type: 'string',
              minLength: 3,
              maxLength: 20,
              description: 'Optional username',
            },
            phoneNumber: { type: 'string', description: 'Optional phone number' },
          },
          required: ['email', 'password', 'name'],
        },
        response: {
          201: {
            description: 'User registered successfully',
            type: 'object',
            properties: {
              user: {
                type: 'object',
                properties: {
                  id: { type: 'integer' },
                  email: { type: 'string' },
                  name: { type: 'string' },
                  username: { type: 'string' },
                  provider: { type: 'string' },
                  isEmailVerified: { type: 'boolean' },
                  createdAt: { type: 'string', format: 'date-time' },
                },
              },
              token: { type: 'string' },
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
        },
      },
    },
    async (request, reply) => {
      try {
        const { email, password, name, username, phoneNumber } = request.body;

        // Validate input
        if (!isValidEmail(email)) {
          return reply.code(400).send({
            message: 'Invalid email format',
            error: 'Bad Request',
            statusCode: 400,
          });
        }

        const passwordValidation = isValidPassword(password);
        if (!passwordValidation.valid) {
          return reply.code(400).send({
            message: passwordValidation.message,
            error: 'Bad Request',
            statusCode: 400,
          });
        }

        if (username) {
          const usernameValidation = isValidUsername(username);
          if (!usernameValidation.valid) {
            return reply.code(400).send({
              message: usernameValidation.message,
              error: 'Bad Request',
              statusCode: 400,
            });
          }
        }

        // Check if email is already taken
        if (await isEmailTaken(email)) {
          return reply.code(400).send({
            message: 'Email is already registered',
            error: 'Bad Request',
            statusCode: 400,
          });
        }

        // Check if username is already taken (if provided)
        if (username && (await isUsernameTaken(username))) {
          return reply.code(400).send({
            message: 'Username is already taken',
            error: 'Bad Request',
            statusCode: 400,
          });
        }

        // Create user
        const user = await createUser({
          email,
          password,
          name,
          username,
          phoneNumber,
          provider: 'local',
        });

        const authResponse = createAuthResponse(user);
        return reply.code(201).send(authResponse);
      } catch (error) {
        fastify.log.error('Error registering user:', error);
        return reply.code(500).send({
          message: 'Failed to register user',
          error: 'Internal Server Error',
          statusCode: 500,
        });
      }
    }
  );

  // POST /auth/login - Login user
  fastify.post<{ Body: LoginBody }>(
    '/auth/login',
    {
      schema: {
        tags: ['auth'],
        summary: 'Login user',
        description: 'Authenticate user with email and password',
        body: {
          type: 'object',
          properties: {
            email: { type: 'string', format: 'email', description: 'User email address' },
            password: { type: 'string', description: 'User password' },
          },
          required: ['email', 'password'],
        },
        response: {
          200: {
            description: 'Login successful',
            type: 'object',
            properties: {
              user: {
                type: 'object',
                properties: {
                  id: { type: 'integer' },
                  email: { type: 'string' },
                  name: { type: 'string' },
                  username: { type: 'string' },
                  provider: { type: 'string' },
                  isEmailVerified: { type: 'boolean' },
                  createdAt: { type: 'string', format: 'date-time' },
                },
              },
              token: { type: 'string' },
            },
          },
          401: {
            description: 'Invalid credentials',
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
        const { email, password } = request.body;

        if (!isValidEmail(email)) {
          return reply.code(400).send({
            message: 'Invalid email format',
            error: 'Bad Request',
            statusCode: 400,
          });
        }

        const user = await verifyPassword(email, password);
        if (!user) {
          return reply.code(401).send({
            message: 'Invalid email or password',
            error: 'Unauthorized',
            statusCode: 401,
          });
        }

        if (!user.isActive) {
          return reply.code(401).send({
            message: 'Account is deactivated',
            error: 'Unauthorized',
            statusCode: 401,
          });
        }

        const authResponse = createAuthResponse(user);
        return reply.code(200).send(authResponse);
      } catch (error) {
        fastify.log.error('Error logging in user:', error);
        return reply.code(500).send({
          message: 'Failed to login',
          error: 'Internal Server Error',
          statusCode: 500,
        });
      }
    }
  );

  // GET /users/profile - Get current user profile
  fastify.get(
    '/users/profile',
    {
      schema: {
        tags: ['users'],
        summary: 'Get current user profile',
        description: "Get the authenticated user's profile information",
        headers: {
          type: 'object',
          properties: {
            authorization: { type: 'string', description: 'Bearer token' },
          },
          required: ['authorization'],
        },
        response: {
          200: {
            description: 'User profile',
            type: 'object',
            properties: {
              id: { type: 'integer' },
              email: { type: 'string' },
              name: { type: 'string' },
              username: { type: 'string' },
              avatar: { type: 'string' },
              phoneNumber: { type: 'string' },
              provider: { type: 'string' },
              isEmailVerified: { type: 'boolean' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
              lastLoginAt: { type: 'string', format: 'date-time' },
              expenses: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'integer' },
                    title: { type: 'string' },
                    amount: { type: 'number' },
                    paidAt: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return reply.code(401).send({
            message: 'Authorization header is required',
            error: 'Unauthorized',
            statusCode: 401,
          });
        }

        const token = authHeader.substring(7);
        const payload = verifyToken(token);
        if (!payload) {
          return reply.code(401).send({
            message: 'Invalid or expired token',
            error: 'Unauthorized',
            statusCode: 401,
          });
        }

        const userProfile = await getUserProfile(payload.userId);
        if (!userProfile) {
          return reply.code(404).send({
            message: 'User not found',
            error: 'Not Found',
            statusCode: 404,
          });
        }

        return userProfile;
      } catch (error) {
        fastify.log.error('Error fetching user profile:', error);
        return reply.code(500).send({
          message: 'Failed to fetch profile',
          error: 'Internal Server Error',
          statusCode: 500,
        });
      }
    }
  );

  // PATCH /users/profile - Update user profile
  fastify.patch<{ Body: UpdateProfileBody }>(
    '/users/profile',
    {
      schema: {
        tags: ['users'],
        summary: 'Update user profile',
        description: "Update the authenticated user's profile information",
        headers: {
          type: 'object',
          properties: {
            authorization: { type: 'string', description: 'Bearer token' },
          },
          required: ['authorization'],
        },
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 1, description: 'User full name' },
            username: { type: 'string', minLength: 3, maxLength: 20, description: 'Username' },
            phoneNumber: { type: 'string', description: 'Phone number' },
            avatar: { type: 'string', format: 'uri', description: 'Avatar URL' },
          },
        },
        response: {
          200: {
            description: 'Profile updated successfully',
            type: 'object',
            properties: {
              id: { type: 'integer' },
              email: { type: 'string' },
              name: { type: 'string' },
              username: { type: 'string' },
              avatar: { type: 'string' },
              phoneNumber: { type: 'string' },
              provider: { type: 'string' },
              isEmailVerified: { type: 'boolean' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return reply.code(401).send({
            message: 'Authorization header is required',
            error: 'Unauthorized',
            statusCode: 401,
          });
        }

        const token = authHeader.substring(7);
        const payload = verifyToken(token);
        if (!payload) {
          return reply.code(401).send({
            message: 'Invalid or expired token',
            error: 'Unauthorized',
            statusCode: 401,
          });
        }

        const { name, username, phoneNumber, avatar } = request.body;

        // Validate username if provided
        if (username) {
          const usernameValidation = isValidUsername(username);
          if (!usernameValidation.valid) {
            return reply.code(400).send({
              message: usernameValidation.message,
              error: 'Bad Request',
              statusCode: 400,
            });
          }

          // Check if username is taken by another user
          const existingUser = await getUserById(payload.userId);
          if (
            existingUser &&
            existingUser.username !== username &&
            (await isUsernameTaken(username))
          ) {
            return reply.code(400).send({
              message: 'Username is already taken',
              error: 'Bad Request',
              statusCode: 400,
            });
          }
        }

        const updatedUser = await updateUser(payload.userId, {
          name,
          username,
          phoneNumber,
          avatar,
        });

        // Return safe user data
        const { password, ...safeUser } = updatedUser; // eslint-disable-line @typescript-eslint/no-unused-vars, no-unused-vars
        return safeUser;
      } catch (error) {
        fastify.log.error('Error updating user profile:', error);
        return reply.code(500).send({
          message: 'Failed to update profile',
          error: 'Internal Server Error',
          statusCode: 500,
        });
      }
    }
  );

  // GET /users/:id - Get user by ID (public profile)
  fastify.get<{ Params: UserParams }>(
    '/users/:id',
    {
      schema: {
        tags: ['users'],
        summary: 'Get user by ID',
        description: 'Get public profile information for a specific user',
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'User ID' },
          },
          required: ['id'],
        },
        response: {
          200: {
            description: 'User public profile',
            type: 'object',
            properties: {
              id: { type: 'integer' },
              name: { type: 'string' },
              username: { type: 'string' },
              avatar: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const id = parseInt(request.params.id, 10);

        if (isNaN(id)) {
          return reply.code(400).send({
            message: 'Invalid user ID',
            error: 'Bad Request',
            statusCode: 400,
          });
        }

        const user = await getUserById(id);
        if (!user || !user.isActive) {
          return reply.code(404).send({
            message: 'User not found',
            error: 'Not Found',
            statusCode: 404,
          });
        }

        // Return only public information
        return {
          id: user.id,
          name: user.name,
          username: user.username,
          avatar: user.avatar,
          createdAt: user.createdAt,
        };
      } catch (error) {
        fastify.log.error('Error fetching user:', error);
        return reply.code(500).send({
          message: 'Failed to fetch user',
          error: 'Internal Server Error',
          statusCode: 500,
        });
      }
    }
  );
};

export default usersRoute;
