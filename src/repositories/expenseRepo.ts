// src/repositories/expenseRepo.ts
import { PrismaClient, Expense, SplitType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

// ===== Type Definitions =====

export interface CreateExpenseData {
  title: string;
  description?: string;
  amount: number | Decimal;
  userId: number;
  groupId?: number;
  categoryId?: number;
  paidAt?: Date;
}

export interface UpdateExpenseData {
  title?: string;
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

// Type for dynamic where clause in search
interface ExpenseWhereClause {
  userId?: number;
  groupId?: number | null;
  title?: {
    contains: string;
    mode: 'insensitive';
  };
  description?: {
    contains: string;
    mode: 'insensitive';
  };
  amount?: {
    gte?: Decimal;
    lte?: Decimal;
  };
  paidAt?: {
    gte?: Date;
    lte?: Date;
  };
  splits?: {
    some: {
      isPaid: boolean;
    };
  };
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
}

/** Update user's expense (ensures user ownership) */
export async function updateUserExpense(
  expenseId: number,
  userId: number,
  data: UpdateExpenseData
) {
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
export async function deleteExpense(id: number): Promise<Expense> {
  // Note: Splits will be automatically deleted due to cascade delete in schema
  return prisma.expense.delete({
    where: { id },
  });
}

// ===== User-specific Queries =====

/** Get all expenses for a user */
export async function getUserExpenses(
  userId: number,
  options: ExpenseListOptions = {}
): Promise<ExpenseWithDetails[]> {
  const {
    limit = 50,
    offset = 0,
    orderBy = 'paidAt',
    orderDirection = 'desc',
    includeDetails = true,
  } = options;

  const orderConfig = { [orderBy]: orderDirection };

  if (!includeDetails) {
    // Return simple expense list for performance with empty splits array
    return prisma.expense.findMany({
      where: { userId },
      orderBy: orderConfig,
      take: limit,
      skip: offset,
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
          take: 0, // Don't actually fetch splits for performance
        },
        _count: {
          select: {
            splits: true,
          },
        },
      },
    }) as Promise<ExpenseWithDetails[]>;
  }

  return prisma.expense.findMany({
    where: { userId },
    orderBy: orderConfig,
    take: limit,
    skip: offset,
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

/** Get user's personal expenses (not group expenses) */
export async function getUserPersonalExpenses(
  userId: number,
  options: ExpenseListOptions = {}
): Promise<ExpenseWithDetails[]> {
  const { limit = 50, offset = 0, orderBy = 'paidAt', orderDirection = 'desc' } = options;

  return prisma.expense.findMany({
    where: {
      userId,
      groupId: null, // Personal expenses only
    },
    orderBy: { [orderBy]: orderDirection },
    take: limit,
    skip: offset,
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
      group: false, // No group for personal expenses
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

// ===== Group-specific Queries =====

/** Get all expenses for a group */
export async function getGroupExpenses(
  groupId: number,
  options: ExpenseListOptions = {}
): Promise<ExpenseWithDetails[]> {
  const { limit = 50, offset = 0, orderBy = 'paidAt', orderDirection = 'desc' } = options;

  return prisma.expense.findMany({
    where: { groupId },
    orderBy: { [orderBy]: orderDirection },
    take: limit,
    skip: offset,
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

/** Get recent expenses for a group (last N expenses) */
export async function getRecentGroupExpenses(
  groupId: number,
  limit: number = 10
): Promise<ExpenseWithDetails[]> {
  return prisma.expense.findMany({
    where: { groupId },
    orderBy: { paidAt: 'desc' },
    take: limit,
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

/** Get user's expenses within a specific group */
export async function getUserGroupExpenses(
  userId: number,
  groupId: number,
  options: ExpenseListOptions = {}
): Promise<ExpenseWithDetails[]> {
  const { limit = 50, offset = 0, orderBy = 'paidAt', orderDirection = 'desc' } = options;

  return prisma.expense.findMany({
    where: {
      userId,
      groupId,
    },
    orderBy: { [orderBy]: orderDirection },
    take: limit,
    skip: offset,
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

// ===== Advanced Search and Filtering =====

/** Search expenses with advanced filters */
export async function searchExpenses(
  filters: ExpenseFilters,
  options: ExpenseListOptions = {}
): Promise<ExpenseWithDetails[]> {
  const { limit = 50, offset = 0, orderBy = 'paidAt', orderDirection = 'desc' } = options;

  // Build where clause dynamically
  const whereClause: ExpenseWhereClause = {};

  if (filters.userId) {
    whereClause.userId = filters.userId;
  }

  if (filters.groupId !== undefined) {
    whereClause.groupId = filters.groupId;
  }

  if (filters.title) {
    whereClause.title = {
      contains: filters.title,
      mode: 'insensitive',
    };
  }

  if (filters.description) {
    whereClause.description = {
      contains: filters.description,
      mode: 'insensitive',
    };
  }

  if (
    (filters.minAmount !== null && filters.minAmount !== undefined) ||
    (filters.maxAmount !== null && filters.maxAmount !== undefined)
  ) {
    whereClause.amount = {};
    if (filters.minAmount !== null && filters.minAmount !== undefined) {
      whereClause.amount.gte = new Decimal(filters.minAmount);
    }
    if (filters.maxAmount !== null && filters.maxAmount !== undefined) {
      whereClause.amount.lte = new Decimal(filters.maxAmount);
    }
  }

  if (filters.fromDate || filters.toDate) {
    whereClause.paidAt = {};
    if (filters.fromDate) {
      whereClause.paidAt.gte = filters.fromDate;
    }
    if (filters.toDate) {
      whereClause.paidAt.lte = filters.toDate;
    }
  }

  // Filter by split payment status
  if (filters.isPaid !== undefined) {
    whereClause.splits = {
      some: {
        isPaid: filters.isPaid,
      },
    };
  }

  return prisma.expense.findMany({
    where: whereClause,
    orderBy: { [orderBy]: orderDirection },
    take: limit,
    skip: offset,
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

// ===== Statistics and Analytics =====

/** Get expense statistics for a user */
export async function getUserExpenseStats(userId: number): Promise<{
  totalExpenses: number;
  totalAmount: Decimal;
  personalExpenses: number;
  groupExpenses: number;
  averageAmount: Decimal;
  thisMonthTotal: Decimal;
  thisMonthCount: number;
}> {
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [totalStats, personalCount, groupCount, thisMonthStats] = await Promise.all([
    prisma.expense.aggregate({
      where: { userId },
      _count: true,
      _sum: { amount: true },
      _avg: { amount: true },
    }),
    prisma.expense.count({
      where: { userId, groupId: null },
    }),
    prisma.expense.count({
      where: { userId, groupId: { not: null } },
    }),
    prisma.expense.aggregate({
      where: {
        userId,
        paidAt: { gte: firstDayOfMonth },
      },
      _count: true,
      _sum: { amount: true },
    }),
  ]);

  return {
    totalExpenses: totalStats._count,
    totalAmount: totalStats._sum.amount || new Decimal(0),
    personalExpenses: personalCount,
    groupExpenses: groupCount,
    averageAmount: totalStats._avg.amount || new Decimal(0),
    thisMonthTotal: thisMonthStats._sum.amount || new Decimal(0),
    thisMonthCount: thisMonthStats._count,
  };
}

/** Get expense statistics for a group */
export async function getGroupExpenseStats(groupId: number): Promise<{
  totalExpenses: number;
  totalAmount: Decimal;
  averageAmount: Decimal;
  thisMonthTotal: Decimal;
  thisMonthCount: number;
  topSpender: { userId: number; name: string; amount: Decimal } | null;
}> {
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [totalStats, thisMonthStats, topSpenderData] = await Promise.all([
    prisma.expense.aggregate({
      where: { groupId },
      _count: true,
      _sum: { amount: true },
      _avg: { amount: true },
    }),
    prisma.expense.aggregate({
      where: {
        groupId,
        paidAt: { gte: firstDayOfMonth },
      },
      _count: true,
      _sum: { amount: true },
    }),
    prisma.expense.groupBy({
      by: ['userId'],
      where: { groupId },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: 1,
    }),
  ]);

  let topSpender = null;
  if (topSpenderData.length > 0) {
    const topSpenderUserId = topSpenderData[0].userId;
    const user = await prisma.user.findUnique({
      where: { id: topSpenderUserId },
      select: { id: true, name: true },
    });

    if (user) {
      topSpender = {
        userId: user.id,
        name: user.name,
        amount: topSpenderData[0]._sum.amount || new Decimal(0),
      };
    }
  }

  return {
    totalExpenses: totalStats._count,
    totalAmount: totalStats._sum.amount || new Decimal(0),
    averageAmount: totalStats._avg.amount || new Decimal(0),
    thisMonthTotal: thisMonthStats._sum.amount || new Decimal(0),
    thisMonthCount: thisMonthStats._count,
    topSpender,
  };
}

// ===== Legacy functions for backward compatibility =====

/** List all expenses (for backward compatibility) */
export async function listExpenses(): Promise<Expense[]> {
  return prisma.expense.findMany({
    orderBy: { id: 'desc' },
  });
}
