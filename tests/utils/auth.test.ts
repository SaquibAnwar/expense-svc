import jwt from 'jsonwebtoken';
import { User } from '@prisma/client';
import {
  generateToken,
  verifyToken,
  toSafeUser,
  createAuthResponse,
  isValidEmail,
  isValidPassword,
  isValidUsername,
  JwtPayload,
} from '../../src/utils/auth';

// Mock jwt
jest.mock('jsonwebtoken');
const mockedJwt = jwt as jest.Mocked<typeof jwt>;

describe('Auth Utils', () => {
  const mockUser: User = {
    id: 1,
    email: 'test@example.com',
    name: 'Test User',
    username: 'testuser',
    password: 'hashedpassword',
    avatar: null,
    phoneNumber: null,
    provider: 'local',
    providerId: null,
    isEmailVerified: false,
    isActive: true,
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
    lastLoginAt: null,
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateToken', () => {
    it('should generate a JWT token with correct payload', () => {
      const mockToken = 'mock.jwt.token';
      mockedJwt.sign.mockReturnValue(mockToken as any);

      const token = generateToken(mockUser);

      expect(mockedJwt.sign).toHaveBeenCalledWith(
        {
          userId: mockUser.id,
          email: mockUser.email,
          provider: mockUser.provider,
        },
        expect.any(String),
        { expiresIn: '7d' }
      );
      expect(token).toBe(mockToken);
    });
  });

  describe('verifyToken', () => {
    it('should verify and return payload for valid token', () => {
      const mockPayload: JwtPayload = {
        userId: 1,
        email: 'test@example.com',
        provider: 'local',
      };
      mockedJwt.verify.mockReturnValue(mockPayload as any);

      const result = verifyToken('valid.token');

      expect(mockedJwt.verify).toHaveBeenCalledWith('valid.token', expect.any(String));
      expect(result).toEqual(mockPayload);
    });

    it('should return null for invalid token', () => {
      mockedJwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = verifyToken('invalid.token');

      expect(result).toBeNull();
    });
  });

  describe('toSafeUser', () => {
    it('should return user data without password', () => {
      const safeUser = toSafeUser(mockUser);

      expect(safeUser).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        username: mockUser.username,
        avatar: mockUser.avatar,
        provider: mockUser.provider,
        isEmailVerified: mockUser.isEmailVerified,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      });
      expect(safeUser).not.toHaveProperty('password');
    });
  });

  describe('createAuthResponse', () => {
    it('should create auth response with safe user and token', () => {
      const mockToken = 'mock.jwt.token';
      mockedJwt.sign.mockReturnValue(mockToken as any);

      const authResponse = createAuthResponse(mockUser);

      expect(authResponse).toHaveProperty('user');
      expect(authResponse).toHaveProperty('token');
      expect(authResponse.user).not.toHaveProperty('password');
      expect(authResponse.token).toBe(mockToken);
    });
  });

  describe('isValidEmail', () => {
    it('should return true for valid emails', () => {
      const validEmails = ['test@example.com', 'user.name@domain.co.uk', 'test+tag@example.org'];

      validEmails.forEach(email => {
        expect(isValidEmail(email)).toBe(true);
      });
    });

    it('should return false for invalid emails', () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'test@',
        'test@domain', // No TLD
        '',
      ];

      invalidEmails.forEach(email => {
        expect(isValidEmail(email)).toBe(false);
      });
    });
  });

  describe('isValidPassword', () => {
    it('should return valid for strong passwords', () => {
      const validPasswords = ['Password123', 'StrongP@ss1', 'MySecure123'];

      validPasswords.forEach(password => {
        const result = isValidPassword(password);
        expect(result.valid).toBe(true);
      });
    });

    it('should return invalid for weak passwords', () => {
      const testCases = [
        { password: 'short', expectedMessage: 'Password must be at least 8 characters long' },
        {
          password: 'nouppercase123',
          expectedMessage: 'Password must contain at least one uppercase letter',
        },
        {
          password: 'NOLOWERCASE123',
          expectedMessage: 'Password must contain at least one lowercase letter',
        },
        { password: 'NoNumbers', expectedMessage: 'Password must contain at least one number' },
      ];

      testCases.forEach(({ password, expectedMessage }) => {
        const result = isValidPassword(password);
        expect(result.valid).toBe(false);
        expect(result.message).toBe(expectedMessage);
      });
    });
  });

  describe('isValidUsername', () => {
    it('should return valid for good usernames', () => {
      const validUsernames = ['user123', 'test_user', 'user-name', 'TestUser'];

      validUsernames.forEach(username => {
        const result = isValidUsername(username);
        expect(result.valid).toBe(true);
      });
    });

    it('should return invalid for bad usernames', () => {
      const testCases = [
        { username: 'ab', expectedMessage: 'Username must be at least 3 characters long' },
        {
          username: 'a'.repeat(21),
          expectedMessage: 'Username must be less than 20 characters long',
        },
        {
          username: 'user@name',
          expectedMessage: 'Username can only contain letters, numbers, underscores, and hyphens',
        },
        {
          username: 'user space',
          expectedMessage: 'Username can only contain letters, numbers, underscores, and hyphens',
        },
      ];

      testCases.forEach(({ username, expectedMessage }) => {
        const result = isValidUsername(username);
        expect(result.valid).toBe(false);
        expect(result.message).toBe(expectedMessage);
      });
    });
  });
});
