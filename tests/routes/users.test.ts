import { FastifyInstance } from 'fastify';
import createApp from '../../src/app';

// Mock user repository
jest.mock('../../src/repositories/userRepo', () => ({
  createUser: jest.fn(),
  verifyPassword: jest.fn(),
  isEmailTaken: jest.fn(),
  isUsernameTaken: jest.fn(),
  getUserProfile: jest.fn(),
  getUserById: jest.fn(),
  updateUser: jest.fn(),
}));

// Mock auth utils
jest.mock('../../src/utils/auth', () => ({
  createAuthResponse: jest.fn(),
  isValidEmail: jest.fn(),
  isValidPassword: jest.fn(),
  isValidUsername: jest.fn(),
  verifyToken: jest.fn(),
}));

describe('User Routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await createApp();
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123',
        name: 'Test User',
        username: 'testuser'
      };

      const mockUser = {
        id: 1,
        email: userData.email,
        name: userData.name,
        username: userData.username,
        provider: 'local',
        isEmailVerified: false,
        createdAt: new Date()
      };

      const mockAuthResponse = {
        user: mockUser,
        token: 'jwt.token.here'
      };

      const {
        isValidEmail,
        isValidPassword,
        isValidUsername,
        createAuthResponse
      } = require('../../src/utils/auth');
      
      const {
        createUser,
        isEmailTaken,
        isUsernameTaken
      } = require('../../src/repositories/userRepo');

      isValidEmail.mockReturnValue(true);
      isValidPassword.mockReturnValue({ valid: true });
      isValidUsername.mockReturnValue({ valid: true });
      isEmailTaken.mockResolvedValue(false);
      isUsernameTaken.mockResolvedValue(false);
      createUser.mockResolvedValue(mockUser);
      createAuthResponse.mockReturnValue(mockAuthResponse);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        headers: {
          'content-type': 'application/json'
        },
        payload: userData
      });

      expect(response.statusCode).toBe(201);
      expect(JSON.parse(response.payload)).toEqual(mockAuthResponse);
      expect(createUser).toHaveBeenCalledWith({
        email: userData.email,
        password: userData.password,
        name: userData.name,
        username: userData.username,
        phoneNumber: undefined,
        provider: 'local'
      });
    });

    it('should return 400 for invalid email', async () => {
      const { isValidEmail } = require('../../src/utils/auth');
      isValidEmail.mockReturnValue(false);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        headers: {
          'content-type': 'application/json'
        },
        payload: {
          email: 'invalid-email',
          password: 'Password123',
          name: 'Test User'
        }
      });

      expect(response.statusCode).toBe(400);
      const payload = JSON.parse(response.payload);
      expect(payload.message).toBe('Invalid email format');
    });

    it('should return 400 for weak password', async () => {
      const { isValidEmail, isValidPassword } = require('../../src/utils/auth');
      isValidEmail.mockReturnValue(true);
      isValidPassword.mockReturnValue({ 
        valid: false, 
        message: 'Password must be at least 8 characters long' 
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        headers: {
          'content-type': 'application/json'
        },
        payload: {
          email: 'test@example.com',
          password: 'weak',
          name: 'Test User'
        }
      });

      expect(response.statusCode).toBe(400);
      const payload = JSON.parse(response.payload);
      expect(payload.message).toBe('Password must be at least 8 characters long');
    });

    it('should return 400 for existing email', async () => {
      const {
        isValidEmail,
        isValidPassword
      } = require('../../src/utils/auth.js');
      
      const { isEmailTaken } = require('../../src/repositories/userRepo');

      isValidEmail.mockReturnValue(true);
      isValidPassword.mockReturnValue({ valid: true });
      isEmailTaken.mockResolvedValue(true);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        headers: {
          'content-type': 'application/json'
        },
        payload: {
          email: 'existing@example.com',
          password: 'Password123',
          name: 'Test User'
        }
      });

      expect(response.statusCode).toBe(400);
      const payload = JSON.parse(response.payload);
      expect(payload.message).toBe('Email is already registered');
    });

    it('should return 400 for existing username', async () => {
      const {
        isValidEmail,
        isValidPassword,
        isValidUsername
      } = require('../../src/utils/auth.js');
      
      const { isEmailTaken, isUsernameTaken } = require('../../src/repositories/userRepo');

      isValidEmail.mockReturnValue(true);
      isValidPassword.mockReturnValue({ valid: true });
      isValidUsername.mockReturnValue({ valid: true });
      isEmailTaken.mockResolvedValue(false);
      isUsernameTaken.mockResolvedValue(true);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        headers: {
          'content-type': 'application/json'
        },
        payload: {
          email: 'test@example.com',
          password: 'Password123',
          name: 'Test User',
          username: 'existinguser'
        }
      });

      expect(response.statusCode).toBe(400);
      const payload = JSON.parse(response.payload);
      expect(payload.message).toBe('Username is already taken');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login user successfully', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      const mockUser = {
        id: 1,
        email: loginData.email,
        name: 'Test User',
        provider: 'local'
      };

      const mockAuthResponse = {
        user: mockUser,
        token: 'jwt.token.here'
      };

      const { createAuthResponse } = require('../../src/utils/auth');
      const { verifyPassword } = require('../../src/repositories/userRepo');

      verifyPassword.mockResolvedValue(mockUser);
      createAuthResponse.mockReturnValue(mockAuthResponse);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        headers: {
          'content-type': 'application/json'
        },
        payload: loginData
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.payload)).toEqual(mockAuthResponse);
      expect(verifyPassword).toHaveBeenCalledWith(loginData.email, loginData.password);
    });

    it('should return 401 for invalid credentials', async () => {
      const { verifyPassword } = require('../../src/repositories/userRepo');
      verifyPassword.mockResolvedValue(null);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        headers: {
          'content-type': 'application/json'
        },
        payload: {
          email: 'test@example.com',
          password: 'wrongpassword'
        }
      });

      expect(response.statusCode).toBe(401);
      const payload = JSON.parse(response.payload);
      expect(payload.message).toBe('Invalid credentials');
    });
  });

  describe('GET /api/v1/profile', () => {
    beforeEach(() => {
      // Mock the authenticate middleware
      jest.doMock('../../src/utils/middleware.js', () => ({
        authenticate: jest.fn().mockImplementation((req: any, reply: any) => {
          req.user = { id: 1, email: 'test@example.com', provider: 'local' };
        }),
        authHeaderSchema: {
          type: 'object',
          properties: {
            authorization: { type: 'string' }
          }
        }
      }));
    });

    it('should return user profile', async () => {
      const mockProfile = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        username: 'testuser',
        provider: 'local',
        isEmailVerified: false,
        createdAt: new Date(),
        expenses: []
      };

      const { getUserProfile } = require('../../src/repositories/userRepo');
      getUserProfile.mockResolvedValue(mockProfile);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/profile',
        headers: {
          authorization: 'Bearer valid-token'
        }
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.payload)).toEqual(mockProfile);
      expect(getUserProfile).toHaveBeenCalledWith(1);
    });

    it('should return 404 when user not found', async () => {
      const { getUserProfile } = require('../../src/repositories/userRepo');
      getUserProfile.mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/profile',
        headers: {
          authorization: 'Bearer valid-token'
        }
      });

      expect(response.statusCode).toBe(404);
      const payload = JSON.parse(response.payload);
      expect(payload.message).toBe('User not found');
    });
  });

  describe('PATCH /api/v1/profile', () => {
    beforeEach(() => {
      // Mock the authenticate middleware
      jest.doMock('../../src/utils/middleware.js', () => ({
        authenticate: jest.fn().mockImplementation((req: any, reply: any) => {
          req.user = { id: 1, email: 'test@example.com', provider: 'local' };
        }),
        authHeaderSchema: {
          type: 'object',
          properties: {
            authorization: { type: 'string' }
          }
        }
      }));
    });

    it('should update user profile', async () => {
      const updateData = {
        name: 'Updated Name',
        username: 'updateduser'
      };

      const updatedUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Updated Name',
        username: 'updateduser',
        provider: 'local'
      };

      const mockProfile = {
        ...updatedUser,
        isEmailVerified: false,
        createdAt: new Date(),
        expenses: []
      };

      const { 
        updateUser,
        getUserProfile,
        isUsernameTaken 
      } = require('../../src/repositories/userRepo');
      
      const { isValidUsername } = require('../../src/utils/auth');

      isValidUsername.mockReturnValue({ valid: true });
      isUsernameTaken.mockResolvedValue(false);
      updateUser.mockResolvedValue(updatedUser);
      getUserProfile.mockResolvedValue(mockProfile);

      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/profile',
        headers: {
          authorization: 'Bearer valid-token',
          'content-type': 'application/json'
        },
        payload: updateData
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.payload)).toEqual(mockProfile);
      expect(updateUser).toHaveBeenCalledWith(1, updateData);
    });

    it('should return 400 for invalid username', async () => {
      const { isValidUsername } = require('../../src/utils/auth');
      isValidUsername.mockReturnValue({ 
        valid: false, 
        message: 'Username must be at least 3 characters long' 
      });

      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/profile',
        headers: {
          authorization: 'Bearer valid-token',
          'content-type': 'application/json'
        },
        payload: {
          username: 'ab'
        }
      });

      expect(response.statusCode).toBe(400);
      const payload = JSON.parse(response.payload);
      expect(payload.message).toBe('Username must be at least 3 characters long');
    });

    it('should return 400 for existing username', async () => {
      const { isValidUsername } = require('../../src/utils/auth');
      const { isUsernameTaken } = require('../../src/repositories/userRepo');

      isValidUsername.mockReturnValue({ valid: true });
      isUsernameTaken.mockResolvedValue(true);

      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/profile',
        headers: {
          authorization: 'Bearer valid-token',
          'content-type': 'application/json'
        },
        payload: {
          username: 'existinguser'
        }
      });

      expect(response.statusCode).toBe(400);
      const payload = JSON.parse(response.payload);
      expect(payload.message).toBe('Username is already taken');
    });
  });
}); 