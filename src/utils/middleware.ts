import { FastifyRequest, FastifyReply } from 'fastify';
import { verifyToken } from './auth.js';
import { getUserById } from '../repositories/userRepo.js';

// Add user to the request type
declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: number;
      email: string;
      provider: string;
    };
  }
}

export interface AuthenticatedRequest extends FastifyRequest {
  user: {
    id: number;
    email: string;
    provider: string;
  };
}

/**
 * Authentication middleware that verifies JWT token and adds user to request
 */
export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
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

    // Verify user still exists and is active
    const user = await getUserById(payload.userId);
    if (!user || !user.isActive) {
      return reply.code(401).send({
        message: 'User not found or inactive',
        error: 'Unauthorized',
        statusCode: 401,
      });
    }

    // Add user info to request
    request.user = {
      id: payload.userId,
      email: payload.email,
      provider: payload.provider,
    };
  } catch {
    return reply.code(401).send({
      message: 'Authentication failed',
      error: 'Unauthorized',
      statusCode: 401,
    });
  }
}

/**
 * Schema for authorization header
 */
export const authHeaderSchema = {
  type: 'object',
  properties: {
    authorization: {
      type: 'string',
      description: 'Bearer token for authentication',
    },
  },
  required: ['authorization'],
};
