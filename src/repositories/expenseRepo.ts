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

/** Update an expense (partial fields allowed) */
export async function updateExpense(id: number, data: UpdateExpenseData) {
  return prisma.expense.update({ where: { id }, data });
}

/** Delete an expense */
export async function deleteExpense(id: number) {
  return prisma.expense.delete({ where: { id } });
}

/** List all expenses (latest first) */
export async function listExpenses() {
  return prisma.expense.findMany({ orderBy: { id: 'desc' } });
}
