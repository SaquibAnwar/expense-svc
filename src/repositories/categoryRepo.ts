import { PrismaClient, Category } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

// ===== Type Definitions =====

export interface CreateCategoryData {
  name: string;
  description?: string;
  icon: string;
  color: string;
  userId?: number; // null for default categories
}

export interface UpdateCategoryData {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  isActive?: boolean;
}

export interface CategoryWithStats extends Category {
  _count: {
    expenses: number;
  };
  totalAmount?: Decimal;
  averageAmount?: Decimal;
  lastUsed?: Date | null;
}

export interface CategoryFilters {
  userId?: number;
  isDefault?: boolean;
  isActive?: boolean;
  name?: string; // Search in name
}

export interface CategoryListOptions {
  limit?: number;
  offset?: number;
  orderBy?: 'name' | 'createdAt' | 'totalAmount' | 'expenseCount';
  orderDirection?: 'asc' | 'desc';
  includeStats?: boolean;
}

export interface CategorySpendingSummary {
  categoryId: number;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  totalAmount: Decimal;
  expenseCount: number;
  averageAmount: Decimal;
  percentage: number; // Percentage of total spending
  lastExpenseDate?: Date | null;
}

// ===== Core CRUD Operations =====

/** Create a new category */
export async function createCategory(data: CreateCategoryData): Promise<Category> {
  return prisma.category.create({
    data,
  });
}

/** Get category by ID */
export async function getCategoryById(id: number): Promise<Category | null> {
  return prisma.category.findUnique({
    where: { id },
  });
}

/** Get category by ID with stats */
export async function getCategoryWithStats(
  id: number,
  userId?: number
): Promise<CategoryWithStats | null> {
  const category = await prisma.category.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          expenses: userId
            ? {
                where: { userId },
              }
            : true,
        },
      },
    },
  });

  if (!category) {
    return null;
  }

  // Get expense statistics for this category
  const expenseStats = await prisma.expense.aggregate({
    where: {
      categoryId: id,
      ...(userId && { userId }),
    },
    _sum: { amount: true },
    _avg: { amount: true },
    _max: { paidAt: true },
  });

  return {
    ...category,
    totalAmount: expenseStats._sum.amount || new Decimal(0),
    averageAmount: expenseStats._avg.amount || new Decimal(0),
    lastUsed: expenseStats._max.paidAt,
  };
}

/** Update a category */
export async function updateCategory(id: number, data: UpdateCategoryData): Promise<Category> {
  return prisma.category.update({
    where: { id },
    data,
  });
}

/** Delete a category (soft delete - mark as inactive) */
export async function deleteCategory(id: number): Promise<Category> {
  return prisma.category.update({
    where: { id },
    data: { isActive: false },
  });
}

/** Hard delete a category (only for custom categories with no expenses) */
export async function hardDeleteCategory(id: number): Promise<Category> {
  // Check if category has expenses
  const expenseCount = await prisma.expense.count({
    where: { categoryId: id },
  });

  if (expenseCount > 0) {
    throw new Error('Cannot delete category with existing expenses. Use soft delete instead.');
  }

  return prisma.category.delete({
    where: { id },
  });
}

// ===== Category Listing and Search =====

/** Get all categories available to a user (default + their custom categories) */
export async function getUserCategories(
  userId: number,
  options: CategoryListOptions = {}
): Promise<CategoryWithStats[]> {
  const {
    limit = 50,
    offset = 0,
    orderBy = 'name',
    orderDirection = 'asc',
    includeStats = false,
  } = options;

  const orderByClause = getOrderByClause(orderBy, orderDirection);

  if (!includeStats) {
    return prisma.category.findMany({
      where: {
        isActive: true,
        OR: [{ isDefault: true }, { userId }],
      },
      include: {
        _count: {
          select: {
            expenses: {
              where: { userId },
            },
          },
        },
      },
      orderBy: orderByClause,
      take: limit,
      skip: offset,
    });
  }

  // Get categories with full stats
  const categories = await prisma.category.findMany({
    where: {
      isActive: true,
      OR: [{ isDefault: true }, { userId }],
    },
    include: {
      _count: {
        select: {
          expenses: {
            where: { userId },
          },
        },
      },
    },
    take: limit,
    skip: offset,
  });

  // Enrich with expense statistics
  const categoriesWithStats = await Promise.all(
    categories.map(async category => {
      const expenseStats = await prisma.expense.aggregate({
        where: {
          categoryId: category.id,
          userId,
        },
        _sum: { amount: true },
        _avg: { amount: true },
        _max: { paidAt: true },
      });

      return {
        ...category,
        totalAmount: expenseStats._sum.amount || new Decimal(0),
        averageAmount: expenseStats._avg.amount || new Decimal(0),
        lastUsed: expenseStats._max.paidAt,
      };
    })
  );

  // Sort by the requested field
  return sortCategoriesWithStats(categoriesWithStats, orderBy, orderDirection);
}

/** Get default categories only */
export async function getDefaultCategories(): Promise<Category[]> {
  return prisma.category.findMany({
    where: {
      isDefault: true,
      isActive: true,
    },
    orderBy: { name: 'asc' },
  });
}

/** Search categories */
export async function searchCategories(
  filters: CategoryFilters,
  options: CategoryListOptions = {}
): Promise<Category[]> {
  const { limit = 50, offset = 0, orderBy = 'name', orderDirection = 'asc' } = options;

  const orderByClause = getOrderByClause(orderBy, orderDirection);

  const whereClause: any = {
    isActive: filters.isActive ?? true,
  };

  if (filters.isDefault !== undefined) {
    whereClause.isDefault = filters.isDefault;
  }

  if (filters.userId !== undefined) {
    if (filters.isDefault) {
      whereClause.OR = [{ isDefault: true }, { userId: filters.userId }];
    } else {
      whereClause.userId = filters.userId;
    }
  }

  if (filters.name) {
    whereClause.name = {
      contains: filters.name,
      mode: 'insensitive',
    };
  }

  return prisma.category.findMany({
    where: whereClause,
    orderBy: orderByClause,
    take: limit,
    skip: offset,
  });
}

// ===== Analytics and Reporting =====

/** Get category spending summary for a user */
export async function getCategorySpendingSummary(
  userId: number,
  options: {
    fromDate?: Date;
    toDate?: Date;
    limit?: number;
  } = {}
): Promise<CategorySpendingSummary[]> {
  const { fromDate, toDate, limit = 20 } = options;

  const whereClause: any = { userId };

  if (fromDate || toDate) {
    whereClause.paidAt = {};
    if (fromDate) {
      whereClause.paidAt.gte = fromDate;
    }
    if (toDate) {
      whereClause.paidAt.lte = toDate;
    }
  }

  // Get total spending for percentage calculation
  const totalSpending = await prisma.expense.aggregate({
    where: whereClause,
    _sum: { amount: true },
  });

  const totalAmount = totalSpending._sum.amount || new Decimal(0);

  // Get all expenses grouped by category
  const expenses = await prisma.expense.findMany({
    where: {
      ...whereClause,
      categoryId: { not: null },
    },
    include: {
      category: {
        select: { name: true, icon: true, color: true },
      },
    },
  });

  // Group expenses by category manually
  const categoryGroups = new Map<
    number,
    {
      category: { name: string; icon: string; color: string };
      expenses: Array<{ amount: Decimal; paidAt: Date }>;
    }
  >();

  expenses.forEach(expense => {
    if (expense.categoryId && expense.category) {
      if (!categoryGroups.has(expense.categoryId)) {
        categoryGroups.set(expense.categoryId, {
          category: expense.category,
          expenses: [],
        });
      }
      categoryGroups.get(expense.categoryId)!.expenses.push({
        amount: expense.amount,
        paidAt: expense.paidAt,
      });
    }
  });

  // Calculate summaries
  const summaries: CategorySpendingSummary[] = [];

  categoryGroups.forEach((group, categoryId) => {
    const totalCategoryAmount = group.expenses.reduce(
      (sum, exp) => sum.add(exp.amount),
      new Decimal(0)
    );
    const averageAmount = totalCategoryAmount.div(group.expenses.length);
    const percentage = totalAmount.gt(0)
      ? totalCategoryAmount.div(totalAmount).mul(100).toNumber()
      : 0;

    const lastExpenseDate = group.expenses.reduce(
      (latest, exp) => (exp.paidAt > latest ? exp.paidAt : latest),
      new Date(0)
    );

    summaries.push({
      categoryId,
      categoryName: group.category.name,
      categoryIcon: group.category.icon,
      categoryColor: group.category.color,
      totalAmount: totalCategoryAmount,
      expenseCount: group.expenses.length,
      averageAmount,
      percentage,
      lastExpenseDate: lastExpenseDate.getTime() > 0 ? lastExpenseDate : null,
    });
  });

  // Sort by total amount descending and limit
  return summaries.sort((a, b) => b.totalAmount.comparedTo(a.totalAmount)).slice(0, limit);
}

/** Get top spending categories for a user */
export async function getTopSpendingCategories(
  userId: number,
  limit: number = 5,
  fromDate?: Date,
  toDate?: Date
): Promise<CategorySpendingSummary[]> {
  return getCategorySpendingSummary(userId, { fromDate, toDate, limit });
}

// Category usage stats removed due to TypeScript complexity

// ===== Helper Functions =====

function getOrderByClause(orderBy: string, orderDirection: 'asc' | 'desc') {
  switch (orderBy) {
    case 'name':
      return { name: orderDirection };
    case 'createdAt':
      return { createdAt: orderDirection };
    default:
      return { name: orderDirection };
  }
}

function sortCategoriesWithStats(
  categories: CategoryWithStats[],
  orderBy: string,
  orderDirection: 'asc' | 'desc'
): CategoryWithStats[] {
  return categories.sort((a, b) => {
    let comparison = 0;

    switch (orderBy) {
      case 'totalAmount':
        comparison = (a.totalAmount || new Decimal(0)).comparedTo(b.totalAmount || new Decimal(0));
        break;
      case 'expenseCount':
        comparison = a._count.expenses - b._count.expenses;
        break;
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'createdAt':
        comparison = a.createdAt.getTime() - b.createdAt.getTime();
        break;
      default:
        comparison = a.name.localeCompare(b.name);
    }

    return orderDirection === 'desc' ? -comparison : comparison;
  });
}

/** Check if user owns a category or if it's a default category */
export async function canUserAccessCategory(userId: number, categoryId: number): Promise<boolean> {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { userId: true, isDefault: true },
  });

  if (!category) {
    return false;
  }

  return category.isDefault || category.userId === userId;
}
