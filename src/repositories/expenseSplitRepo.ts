import { PrismaClient, SplitType, ExpenseSplit } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

// Extended types for repository returns with includes
export interface ExpenseSplitWithUser extends ExpenseSplit {
  user: {
    id: number;
    name: string;
    email: string;
  };
}

export interface ExpenseSplitWithExpense extends ExpenseSplit {
  expense: {
    id: number;
    title: string;
    amount: Decimal;
    paidAt: Date | null;
    user: {
      name: string;
    };
  };
}

export interface CreateSplitData {
  expenseId: number;
  userId: number;
  amount: Decimal;
  splitType: SplitType;
  percentage?: number;
}

export interface SplitParticipant {
  userId: number;
  amount?: number; // For AMOUNT splits
  percentage?: number; // For PERCENTAGE splits
}

export interface CreateSplitsRequest {
  expenseId: number;
  splitType: SplitType;
  participants: SplitParticipant[];
}

/**
 * Create expense splits for an expense
 */
export async function createExpenseSplits(
  data: CreateSplitsRequest
): Promise<ExpenseSplitWithUser[]> {
  const { expenseId, splitType, participants } = data;

  // Get the expense to calculate splits
  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
  });

  if (!expense) {
    throw new Error('Expense not found');
  }

  // Validate and calculate split amounts
  const splitData = await calculateSplitAmounts(expense.amount, splitType, participants);

  // Create all splits
  const splits = await Promise.all(
    splitData.map(split =>
      prisma.expenseSplit.create({
        data: {
          expenseId,
          userId: split.userId,
          amount: split.amount,
          splitType,
          percentage: split.percentage,
        },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      })
    )
  );

  return splits;
}

/**
 * Calculate split amounts based on split type
 */
async function calculateSplitAmounts(
  totalAmount: Decimal,
  splitType: SplitType,
  participants: SplitParticipant[]
): Promise<Array<{ userId: number; amount: Decimal; percentage?: number }>> {
  const total = new Decimal(totalAmount.toString());

  switch (splitType) {
    case SplitType.EQUAL:
      return calculateEqualSplit(total, participants);

    case SplitType.AMOUNT:
      return calculateAmountSplit(total, participants);

    case SplitType.PERCENTAGE:
      return calculatePercentageSplit(total, participants);

    default:
      throw new Error(`Unsupported split type: ${splitType}`);
  }
}

/**
 * Calculate equal split among participants
 */
function calculateEqualSplit(
  totalAmount: Decimal,
  participants: SplitParticipant[]
): Array<{ userId: number; amount: Decimal; percentage?: number }> {
  if (participants.length === 0) {
    throw new Error('At least one participant is required');
  }

  const equalAmount = totalAmount.dividedBy(participants.length);

  return participants.map(participant => ({
    userId: participant.userId,
    amount: equalAmount,
  }));
}

/**
 * Calculate split based on specific amounts
 */
function calculateAmountSplit(
  totalAmount: Decimal,
  participants: SplitParticipant[]
): Array<{ userId: number; amount: Decimal; percentage?: number }> {
  // Validate all participants have amounts
  for (const participant of participants) {
    if (participant.amount === undefined || participant.amount <= 0) {
      throw new Error('All participants must have positive amounts for AMOUNT split');
    }
  }

  // Calculate total of specified amounts
  const specifiedTotal = participants.reduce(
    (sum, participant) => sum.plus(participant.amount!),
    new Decimal(0)
  );

  // Validate total matches expense amount
  if (!specifiedTotal.equals(totalAmount)) {
    throw new Error(
      `Split amounts total (${specifiedTotal}) must equal expense amount (${totalAmount})`
    );
  }

  return participants.map(participant => ({
    userId: participant.userId,
    amount: new Decimal(participant.amount!),
  }));
}

/**
 * Calculate split based on percentages
 */
function calculatePercentageSplit(
  totalAmount: Decimal,
  participants: SplitParticipant[]
): Array<{ userId: number; amount: Decimal; percentage: number }> {
  // Validate all participants have percentages
  for (const participant of participants) {
    if (participant.percentage === undefined || participant.percentage <= 0) {
      throw new Error('All participants must have positive percentages for PERCENTAGE split');
    }
  }

  // Calculate total percentage
  const totalPercentage = participants.reduce(
    (sum, participant) => sum + participant.percentage!,
    0
  );

  // Validate total percentage is 100%
  if (Math.abs(totalPercentage - 100) > 0.01) {
    // Allow small floating point differences
    throw new Error(`Split percentages must total 100%, got ${totalPercentage}%`);
  }

  return participants.map(participant => {
    const percentage = participant.percentage!;
    const amount = totalAmount.times(percentage).dividedBy(100);

    return {
      userId: participant.userId,
      amount,
      percentage,
    };
  });
}

/**
 * Get all splits for an expense
 */
export async function getExpenseSplits(expenseId: number): Promise<ExpenseSplitWithUser[]> {
  return prisma.expenseSplit.findMany({
    where: { expenseId },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  });
}

/**
 * Get splits for a specific user
 */
export async function getUserSplits(userId: number): Promise<ExpenseSplitWithExpense[]> {
  return prisma.expenseSplit.findMany({
    where: { userId },
    include: {
      expense: {
        select: {
          id: true,
          title: true,
          amount: true,
          paidAt: true,
          user: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Mark a split as paid
 */
export async function markSplitAsPaid(
  expenseId: number,
  userId: number
): Promise<ExpenseSplitWithUser> {
  return prisma.expenseSplit.update({
    where: {
      expenseId_userId: { expenseId, userId },
    },
    data: { isPaid: true },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  });
}

/**
 * Get balance summary for a user (what they owe and are owed)
 */
export async function getUserBalanceSummary(userId: number) {
  // Amount user owes to others (their splits on expenses they didn't pay)
  const userOwes = await prisma.expenseSplit.aggregate({
    where: {
      userId,
      isPaid: false,
      expense: {
        userId: { not: userId }, // Only splits on expenses paid by others
      },
    },
    _sum: { amount: true },
  });

  // Amount others owe to user (other people's splits on expenses paid by this user)
  const othersOwe = await prisma.expenseSplit.aggregate({
    where: {
      expense: { userId }, // Expenses paid by this user
      userId: { not: userId }, // But split with others
      isPaid: false,
    },
    _sum: { amount: true },
  });

  return {
    owes: userOwes._sum.amount || new Decimal(0),
    owed: othersOwe._sum.amount || new Decimal(0),
    netBalance: (othersOwe._sum.amount || new Decimal(0)).minus(
      userOwes._sum.amount || new Decimal(0)
    ),
  };
}

/**
 * Delete all splits for an expense
 */
export async function deleteExpenseSplits(expenseId: number): Promise<void> {
  await prisma.expenseSplit.deleteMany({
    where: { expenseId },
  });
}
