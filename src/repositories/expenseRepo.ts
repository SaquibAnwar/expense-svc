// src/repositories/expenseRepo.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface CreateExpenseData {
  title: string;
  amount: number;
  userId: number;
  paidAt?: Date;
}

interface UpdateExpenseData {
  title?: string;
  amount?: number;
  paidAt?: Date;
}

/** Create a new expense */
export async function createExpense(data: CreateExpenseData) {
  return prisma.expense.create({ data });
}

/** Get one expense by primary key */
export async function getExpense(id: number) {
  return prisma.expense.findUnique({ where: { id } });
}

/** Get user's expense by id (ensures user ownership) */
export async function getUserExpense(expenseId: number, userId: number) {
  return prisma.expense.findFirst({
    where: {
      id: expenseId,
      userId: userId,
    },
  });
}

/** Get all expenses for a specific user */
export async function getUserExpenses(userId: number) {
  return prisma.expense.findMany({
    where: { userId },
    orderBy: { id: 'desc' },
  });
}

/** Update an expense (partial fields allowed) */
export async function updateExpense(id: number, data: UpdateExpenseData) {
  return prisma.expense.update({ where: { id }, data });
}

/** Update user's expense (ensures user ownership) */
export async function updateUserExpense(expenseId: number, userId: number, data: UpdateExpenseData) {
  const updateResult = await prisma.expense.updateMany({
    where: {
      id: expenseId,
      userId: userId,
    },
    data,
  });

  if (updateResult.count === 0) {
    return null; // Expense not found or doesn't belong to user
  }

  // Fetch and return the updated expense
  return prisma.expense.findFirst({
    where: { id: expenseId, userId },
  });
}

/** Delete an expense */
export async function deleteExpense(id: number) {
  return prisma.expense.delete({ where: { id } });
}

/** Delete user's expense (ensures user ownership) */
export async function deleteUserExpense(expenseId: number, userId: number) {
  return prisma.expense.deleteMany({
    where: {
      id: expenseId,
      userId: userId,
    },
  });
}

/** List all expenses (latest first) */
export async function listExpenses() {
  return prisma.expense.findMany({ orderBy: { id: 'desc' } });
}
