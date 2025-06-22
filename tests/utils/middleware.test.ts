import { FastifyRequest, FastifyReply } from 'fastify';
import { authenticate } from '../../src/utils/middleware';
import { verifyToken } from '../../src/utils/auth';
import { getUserById } from '../../src/repositories/userRepo';

// Mock dependencies
jest.mock('../../src/utils/auth');
jest.mock('../../src/repositories/userRepo');

const mockedVerifyToken = verifyToken as jest.MockedFunction<typeof verifyToken>;
const mockedGetUserById = getUserById as jest.MockedFunction<typeof getUserById>;

describe('Middleware', () => {
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;

  beforeEach(() => {
    mockRequest = {
      headers: {}
    };
    mockReply = {
      code: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis()
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('authenticate', () => {
    it('should return 401 when authorization header is missing', async () => {
      mockRequest.headers = {};

      await authenticate(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.code).toHaveBeenCalledWith(401);
      expect(mockReply.send).toHaveBeenCalledWith({
        message: 'Authorization header is required',
        error: 'Unauthorized',
        statusCode: 401
      });
    });

    it('should return 401 when authorization header does not start with Bearer', async () => {
      mockRequest.headers = {
        authorization: 'Invalid token'
      };

      await authenticate(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.code).toHaveBeenCalledWith(401);
      expect(mockReply.send).toHaveBeenCalledWith({
        message: 'Authorization header is required',
        error: 'Unauthorized',
        statusCode: 401
      });
    });

    it('should return 401 when token is invalid', async () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid.token'
      };
      mockedVerifyToken.mockReturnValue(null);

      await authenticate(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockedVerifyToken).toHaveBeenCalledWith('invalid.token');
      expect(mockReply.code).toHaveBeenCalledWith(401);
      expect(mockReply.send).toHaveBeenCalledWith({
        message: 'Invalid or expired token',
        error: 'Unauthorized',
        statusCode: 401
      });
    });

    it('should return 401 when user does not exist', async () => {
      mockRequest.headers = {
        authorization: 'Bearer valid.token'
      };
      mockedVerifyToken.mockReturnValue({
        userId: 1,
        email: 'test@example.com',
        provider: 'local'
      });
      mockedGetUserById.mockResolvedValue(null);

      await authenticate(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockedGetUserById).toHaveBeenCalledWith(1);
      expect(mockReply.code).toHaveBeenCalledWith(401);
      expect(mockReply.send).toHaveBeenCalledWith({
        message: 'User not found or inactive',
        error: 'Unauthorized',
        statusCode: 401
      });
    });

    it('should return 401 when user is inactive', async () => {
      mockRequest.headers = {
        authorization: 'Bearer valid.token'
      };
      mockedVerifyToken.mockReturnValue({
        userId: 1,
        email: 'test@example.com',
        provider: 'local'
      });
      mockedGetUserById.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        username: null,
        password: null,
        avatar: null,
        phoneNumber: null,
        provider: 'local',
        providerId: null,
        isEmailVerified: false,
        isActive: false, // inactive user
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null
      });

      await authenticate(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.code).toHaveBeenCalledWith(401);
      expect(mockReply.send).toHaveBeenCalledWith({
        message: 'User not found or inactive',
        error: 'Unauthorized',
        statusCode: 401
      });
    });

    it('should add user to request when authentication is successful', async () => {
      mockRequest.headers = {
        authorization: 'Bearer valid.token'
      };
      const mockPayload = {
        userId: 1,
        email: 'test@example.com',
        provider: 'local'
      };
      mockedVerifyToken.mockReturnValue(mockPayload);
      mockedGetUserById.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        username: null,
        password: null,
        avatar: null,
        phoneNumber: null,
        provider: 'local',
        providerId: null,
        isEmailVerified: false,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null
      });

      await authenticate(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockRequest.user).toEqual({
        id: 1,
        email: 'test@example.com',
        provider: 'local'
      });
      expect(mockReply.code).not.toHaveBeenCalled();
      expect(mockReply.send).not.toHaveBeenCalled();
    });

    it('should return 401 when an error occurs during authentication', async () => {
      mockRequest.headers = {
        authorization: 'Bearer valid.token'
      };
      mockedVerifyToken.mockImplementation(() => {
        throw new Error('Database error');
      });

      await authenticate(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.code).toHaveBeenCalledWith(401);
      expect(mockReply.send).toHaveBeenCalledWith({
        message: 'Authentication failed',
        error: 'Unauthorized',
        statusCode: 401
      });
    });
  });
}); 