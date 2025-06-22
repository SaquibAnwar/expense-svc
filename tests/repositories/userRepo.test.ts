// Mock Prisma client first
const mockPrisma = {
  user: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  }
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => mockPrisma)
}));

jest.mock('../../src/app', () => ({
  prisma: mockPrisma
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

import { User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import {
  createUser,
  getUserById,  
  getUserByEmail,
  getUserByUsername,
  getUserByProvider,
  updateUser,
  verifyPassword,
  isEmailTaken,
  isUsernameTaken,
  getUserProfile,
  listUsers,
  deactivateUser,
  reactivateUser
} from '../../src/repositories/userRepo';

const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('UserRepository', () => {

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
    lastLoginAt: null
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    it('should create a local user with hashed password', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        password: 'password123',
        provider: 'local'
      };

      const hashedPassword = 'hashedpassword123';
      (mockedBcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      mockPrisma.user.create.mockResolvedValue(mockUser);

      const result = await createUser(userData);

      expect(mockedBcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          email: 'test@example.com',
          name: 'Test User',
          username: undefined,
          phoneNumber: undefined,
          avatar: undefined,
          provider: 'local',
          providerId: undefined,
          isEmailVerified: false,
          password: hashedPassword
        }
      });
      expect(result).toEqual(mockUser);
    });

    it('should create OAuth user without password', async () => {
      const userData = {
        email: 'oauth@example.com',
        name: 'OAuth User',
        provider: 'google',
        providerId: 'google123',
        isEmailVerified: true
      };

      mockPrisma.user.create.mockResolvedValue(mockUser);

      const result = await createUser(userData);

      expect(mockedBcrypt.hash).not.toHaveBeenCalled();
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          email: 'oauth@example.com',
          name: 'OAuth User',
          username: undefined,
          phoneNumber: undefined,
          avatar: undefined,
          provider: 'google',
          providerId: 'google123',
          isEmailVerified: true
        }
      });
      expect(result).toEqual(mockUser);
    });

    it('should handle database errors', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        password: 'password123',
        provider: 'local'
      };

      mockPrisma.user.create.mockRejectedValue(new Error('Database error'));

      await expect(createUser(userData)).rejects.toThrow('Database error');
    });
  });

  describe('getUserById', () => {
    it('should get user by id with expenses', async () => {
      const userWithExpenses = {
        ...mockUser,
        expenses: [
          { id: 1, title: 'Test Expense', amount: 100, paidAt: new Date() }
        ]
      };

      mockPrisma.user.findUnique.mockResolvedValue(userWithExpenses);

      const result = await getUserById(1);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: {
          expenses: {
            orderBy: { paidAt: 'desc' },
            take: 10
          }
        }
      });
      expect(result).toEqual(userWithExpenses);
    });

    it('should return null when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await getUserById(999);

      expect(result).toBeNull();
    });
  });

  describe('getUserByEmail', () => {
    it('should get user by email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await getUserByEmail('test@example.com');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' }
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await getUserByEmail('notfound@example.com');

      expect(result).toBeNull();
    });
  });

  describe('getUserByUsername', () => {
    it('should get user by username', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await getUserByUsername('testuser');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { username: 'testuser' }
      });
      expect(result).toEqual(mockUser);
    });
  });

  describe('getUserByProvider', () => {
    it('should get user by provider and providerId', async () => {
      const oauthUser = { ...mockUser, provider: 'google', providerId: 'google123' };
      mockPrisma.user.findFirst.mockResolvedValue(oauthUser);

      const result = await getUserByProvider('google', 'google123');

      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          provider: 'google',
          providerId: 'google123'
        }
      });
      expect(result).toEqual(oauthUser);
    });
  });

  describe('updateUser', () => {
    it('should update user data', async () => {
      const updateData = {
        name: 'Updated Name',
        username: 'updateduser'
      };

      const updatedUser = { ...mockUser, ...updateData };
      mockPrisma.user.update.mockResolvedValue(updatedUser);

      const result = await updateUser(1, updateData);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          ...updateData,
          updatedAt: expect.any(Date)
        }
      });
      expect(result).toEqual(updatedUser);
    });
  });

  describe('verifyPassword', () => {
    it('should return user when password is correct', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockPrisma.user.update.mockResolvedValue(mockUser); // Return value doesn't matter since function doesn't use it

      const result = await verifyPassword('test@example.com', 'password123');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' }
      });
      expect(mockedBcrypt.compare).toHaveBeenCalledWith('password123', 'hashedpassword');
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { lastLoginAt: expect.any(Date) }
      });
      expect(result).toEqual(mockUser); // Function returns the original user, not the updated one
    });

    it('should return null when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await verifyPassword('notfound@example.com', 'password123');

      expect(result).toBeNull();
    });

    it('should return null when user has no password', async () => {
      const oauthUser = { ...mockUser, password: null };
      mockPrisma.user.findUnique.mockResolvedValue(oauthUser);

      const result = await verifyPassword('oauth@example.com', 'password123');

      expect(result).toBeNull();
    });

    it('should return null when password is incorrect', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await verifyPassword('test@example.com', 'wrongpassword');

      expect(mockedBcrypt.compare).toHaveBeenCalledWith('wrongpassword', 'hashedpassword');
      expect(result).toBeNull();
    });
  });

  describe('isEmailTaken', () => {
    it('should return true when email exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 1 });

      const result = await isEmailTaken('test@example.com');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        select: { id: true }
      });
      expect(result).toBe(true);
    });

    it('should return false when email does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await isEmailTaken('available@example.com');

      expect(result).toBe(false);
    });
  });

  describe('isUsernameTaken', () => {
    it('should return true when username exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 1 });

      const result = await isUsernameTaken('testuser');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { username: 'testuser' },
        select: { id: true }
      });
      expect(result).toBe(true);
    });

    it('should return false when username does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await isUsernameTaken('availableuser');

      expect(result).toBe(false);
    });
  });

  describe('getUserProfile', () => {
    it('should return user profile without sensitive data', async () => {
      const profileData = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        username: 'testuser',
        avatar: null,
        phoneNumber: null,
        provider: 'local',
        isEmailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
        expenses: []
      };

      mockPrisma.user.findUnique.mockResolvedValue(profileData);

      const result = await getUserProfile(1);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        select: {
          id: true,
          email: true,
          name: true,
          username: true,
          avatar: true,
          phoneNumber: true,
          provider: true,
          isEmailVerified: true,
          createdAt: true,
          updatedAt: true,
          lastLoginAt: true,
          expenses: {
            select: {
              id: true,
              title: true,
              amount: true,
              paidAt: true
            },
            orderBy: { paidAt: 'desc' },
            take: 5
          }
        }
      });
      expect(result).toEqual(profileData);
    });
  });

  describe('listUsers', () => {
    it('should return paginated list of users', async () => {
      const usersList = [mockUser];
      mockPrisma.user.findMany.mockResolvedValue(usersList);

      const result = await listUsers(0, 20);

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 20,
        select: {
          id: true,
          email: true,
          name: true,
          username: true,
          provider: true,
          isEmailVerified: true,
          isActive: true,
          createdAt: true,
          lastLoginAt: true
        },
        orderBy: { createdAt: 'desc' }
      });
      expect(result).toEqual(usersList);
    });

    it('should use default pagination values', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);

      await listUsers();

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 20,
        select: expect.any(Object),
        orderBy: { createdAt: 'desc' }
      });
    });
  });

  describe('deactivateUser', () => {
    it('should deactivate user', async () => {
      const deactivatedUser = { ...mockUser, isActive: false };
      mockPrisma.user.update.mockResolvedValue(deactivatedUser);

      const result = await deactivateUser(1);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          isActive: false,
          updatedAt: expect.any(Date)
        }
      });
      expect(result).toEqual(deactivatedUser);
    });
  });

  describe('reactivateUser', () => {
    it('should reactivate user', async () => {
      const reactivatedUser = { ...mockUser, isActive: true };
      mockPrisma.user.update.mockResolvedValue(reactivatedUser);

      const result = await reactivateUser(1);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          isActive: true,
          updatedAt: expect.any(Date)
        }
      });
      expect(result).toEqual(reactivatedUser);
    });
  });
}); 