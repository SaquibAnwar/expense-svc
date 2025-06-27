// src/queries/userQueries.ts
// Complex SQL queries for user operations separated from business logic

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Get user profile with recent expenses
 * This query includes complex select and include clauses
 */
export async function getUserProfileQuery(userId: number) {
  return prisma.user.findUnique({
    where: { id: userId },
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
        take: 5, // Only include 5 most recent expenses
      },
    },
  });
}

/**
 * List users with pagination and admin-level information
 * This query is used for admin operations and includes specific field selection
 */
export async function listUsersQuery(skip: number = 0, take: number = 20) {
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

/**
 * Get user by ID with recent expenses included
 * This query includes a complex relationship with ordering and limiting
 */
export async function getUserWithExpensesQuery(userId: number) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      expenses: {
        orderBy: { paidAt: 'desc' },
        take: 10, // Include last 10 expenses
      },
    },
  });
}

/**
 * Get user by provider for OAuth operations
 * This query combines multiple WHERE conditions
 */
export async function getUserByProviderQuery(provider: string, providerId: string) {
  return prisma.user.findFirst({
    where: {
      provider,
      providerId,
    },
  });
} 