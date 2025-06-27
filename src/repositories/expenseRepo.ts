// src/repositories/expenseRepo.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface CreateExpenseData {
  title: string;
  amount: number;
  userId: number;
<<<<<<< Updated upstream
=======
  groupId?: number;
  categoryId?: number;
>>>>>>> Stashed changes
  paidAt?: Date;
}

interface UpdateExpenseData {
  title?: string;
<<<<<<< Updated upstream
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
=======
  description?: string;
  amount?: number | Decimal;
  categoryId?: number;
  paidAt?: Date;
}

export interface ExpenseWithDetails extends Expense {
  user: {
    id: number;
    name: string;
    email: string;
    username: string | null;
    avatar: string | null;
  };
  group?: {
    id: number;
    name: string;
    description: string | null;
    avatar: string | null;
  } | null;
  category?: {
    id: number;
    name: string;
    description: string | null;
    icon: string;
    color: string;
  } | null;
  splits: Array<{
    id: number;
    userId: number;
    amount: Decimal;
    splitType: SplitType;
    percentage: number | null;
    isPaid: boolean;
    user: {
      id: number;
      name: string;
      email: string;
    };
  }>;
  _count: {
    splits: number;
  };
}

export interface ExpenseFilters {
  userId?: number;
  groupId?: number;
  categoryId?: number;
  title?: string; // Search in title
  description?: string; // Search in description
  minAmount?: number;
  maxAmount?: number;
  fromDate?: Date;
  toDate?: Date;
  isPaid?: boolean; // Filter by split payment status
}

export interface ExpenseListOptions {
  limit?: number;
  offset?: number;
  orderBy?: 'paidAt' | 'amount' | 'createdAt';
  orderDirection?: 'asc' | 'desc';
  includeDetails?: boolean;
}

// ===== Core CRUD Operations =====

/** Create a new expense */
export async function createExpense(data: CreateExpenseData): Promise<ExpenseWithDetails> {
  const expenseData = {
    ...data,
    amount: typeof data.amount === 'number' ? new Decimal(data.amount) : data.amount,
  };

  return prisma.expense.create({
    data: expenseData,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          avatar: true,
        },
      },
      group: {
        select: {
          id: true,
          name: true,
          description: true,
          avatar: true,
        },
      },
      category: {
        select: {
          id: true,
          name: true,
          description: true,
          icon: true,
          color: true,
        },
      },
      splits: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
      _count: {
        select: {
          splits: true,
        },
      },
    },
  });
}

/** Get expense by ID with full details */
export async function getExpenseById(id: number): Promise<ExpenseWithDetails | null> {
  return prisma.expense.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          avatar: true,
        },
      },
      group: {
        select: {
          id: true,
          name: true,
          description: true,
          avatar: true,
        },
      },
      category: {
        select: {
          id: true,
          name: true,
          description: true,
          icon: true,
          color: true,
        },
      },
      splits: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
      _count: {
        select: {
          splits: true,
        },
      },
    },
  });
}

/** Get basic expense by ID (minimal data) */
export async function getExpense(id: number): Promise<Expense | null> {
  return prisma.expense.findUnique({
    where: { id },
  });
}

/** Update an expense */
export async function updateExpense(
  id: number,
  data: UpdateExpenseData
): Promise<ExpenseWithDetails> {
  const updateData = {
    ...data,
    amount: data.amount
      ? typeof data.amount === 'number'
        ? new Decimal(data.amount)
        : data.amount
      : undefined,
  };

  return prisma.expense.update({
    where: { id },
    data: updateData,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          avatar: true,
        },
      },
      group: {
        select: {
          id: true,
          name: true,
          description: true,
          avatar: true,
        },
      },
      category: {
        select: {
          id: true,
          name: true,
          description: true,
          icon: true,
          color: true,
        },
      },
      splits: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
      _count: {
        select: {
          splits: true,
        },
      },
    },
  });
>>>>>>> Stashed changes
}

/** Delete an expense */
export async function deleteExpense(id: number) {
  return prisma.expense.delete({ where: { id } });
}

/** List all expenses (latest first) */
export async function listExpenses() {
  return prisma.expense.findMany({ orderBy: { id: 'desc' } });
}
