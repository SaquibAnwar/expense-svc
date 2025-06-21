// src/repositories/expenseRepo.ts
import { PrismaClient, Prisma } from '../generated/prisma';

const prisma = new PrismaClient();

/** Create a new expense */
export async function createExpense(
  data: Prisma.ExpenseUncheckedCreateInput
) {
  return prisma.expense.create({ data });
}

/** Get one expense by primary key */
export async function getExpense(id: number) {
  return prisma.expense.findUnique({ where: { id } });
}

/** Update an expense (partial fields allowed) */
export async function updateExpense(
  id: number,
  data: Prisma.ExpenseUncheckedUpdateInput
) {
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