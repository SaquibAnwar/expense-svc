import { PrismaClient, User } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export interface CreateUserData {
  email: string;
  name: string;
  password?: string;
  username?: string;
  phoneNumber?: string;
  avatar?: string;
  provider?: string;
  providerId?: string;
  isEmailVerified?: boolean;
}

export interface UpdateUserData {
  name?: string;
  username?: string;
  phoneNumber?: string;
  avatar?: string;
  isEmailVerified?: boolean;
  lastLoginAt?: Date;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

/** Create a new user (for both local and OAuth registration) */
export async function createUser(data: CreateUserData): Promise<User> {
  const userData: any = {
    email: data.email,
    name: data.name,
    username: data.username,
    phoneNumber: data.phoneNumber,
    avatar: data.avatar,
    provider: data.provider || 'local',
    providerId: data.providerId,
    isEmailVerified: data.isEmailVerified || false,
  };

  // Hash password only for local authentication
  if (data.password && data.provider === 'local') {
    userData.password = await bcrypt.hash(data.password, 10);
  }

  return prisma.user.create({ data: userData });
}

/** Get user by ID */
export async function getUserById(id: number): Promise<User | null> {
  return prisma.user.findUnique({
    where: { id },
    include: {
      expenses: {
        orderBy: { paidAt: 'desc' },
        take: 10, // Only include recent expenses
      },
    },
  });
}

/** Get user by email */
export async function getUserByEmail(email: string): Promise<User | null> {
  return prisma.user.findUnique({
    where: { email },
  });
}

/** Get user by username */
export async function getUserByUsername(username: string): Promise<User | null> {
  return prisma.user.findUnique({
    where: { username },
  });
}

/** Get user by provider and provider ID (for OAuth) */
export async function getUserByProvider(
  provider: string,
  providerId: string
): Promise<User | null> {
  return prisma.user.findFirst({
    where: {
      provider,
      providerId,
    },
  });
}

/** Update user data */
export async function updateUser(id: number, data: UpdateUserData): Promise<User> {
  return prisma.user.update({
    where: { id },
    data: {
      ...data,
      updatedAt: new Date(),
    },
  });
}

/** Verify user password (for local authentication) */
export async function verifyPassword(email: string, password: string): Promise<User | null> {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user || !user.password) {
    return null;
  }

  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    return null;
  }

  // Update last login time
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  return user;
}

/** Check if email is already taken */
export async function isEmailTaken(email: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  return !!user;
}

/** Check if username is already taken */
export async function isUsernameTaken(username: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  });
  return !!user;
}

/** Get user profile (without sensitive data) */
export async function getUserProfile(id: number) {
  return prisma.user.findUnique({
    where: { id },
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
          paidAt: true,
        },
        orderBy: { paidAt: 'desc' },
        take: 5,
      },
    },
  });
}

/** List all users (for admin purposes) */
export async function listUsers(skip: number = 0, take: number = 20) {
  return prisma.user.findMany({
    skip,
    take,
    select: {
      id: true,
      email: true,
      name: true,
      username: true,
      provider: true,
      isEmailVerified: true,
      isActive: true,
      createdAt: true,
      lastLoginAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

/** Soft delete user (deactivate) */
export async function deactivateUser(id: number): Promise<User> {
  return prisma.user.update({
    where: { id },
    data: {
      isActive: false,
      updatedAt: new Date(),
    },
  });
}

/** Reactivate user */
export async function reactivateUser(id: number): Promise<User> {
  return prisma.user.update({
    where: { id },
    data: {
      isActive: true,
      updatedAt: new Date(),
    },
  });
}
