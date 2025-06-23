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
 * Settlement between two users
 */
export interface UserSettlement {
  userId: number;
  name: string;
  email: string;
  netAmount: Decimal; // Positive means they owe you, negative means you owe them
  owedByYou: Decimal; // Amount you owe them
  owedToYou: Decimal; // Amount they owe you
}

/**
 * Calculate settlements for a user (who they owe and who owes them)
 */
export async function getUserSettlements(userId: number): Promise<UserSettlement[]> {
  // Get all unpaid splits involving this user
  const userSplits = await prisma.expenseSplit.findMany({
    where: {
      OR: [
        { userId: userId, isPaid: false }, // Splits where user owes money
        {
          expense: { userId: userId }, // Expenses paid by user
          isPaid: false,
          userId: { not: userId }, // But split belongs to someone else
        },
      ],
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      expense: { select: { userId: true } },
    },
  });

  // Group splits by the other user involved
  const settlementMap = new Map<
    number,
    {
      user: { id: number; name: string; email: string };
      owedByUser: Decimal; // Amount user owes to this person
      owedToUser: Decimal; // Amount this person owes to user
    }
  >();

  for (const split of userSplits) {
    let otherUserId: number;
    let isUserOwing: boolean;

    if (split.userId === userId) {
      // User owes money for this split
      otherUserId = split.expense.userId;
      isUserOwing = true;
    } else {
      // Someone else owes money to user for this split
      otherUserId = split.userId;
      isUserOwing = false;
    }

    // Skip if no other user (shouldn't happen but safety check)
    if (!otherUserId || otherUserId === userId) {
      continue;
    }

    // Initialize settlement for this user if not exists
    if (!settlementMap.has(otherUserId)) {
      settlementMap.set(otherUserId, {
        user:
          split.userId === userId
            ? { id: otherUserId, name: '', email: '' } // We'll get this from another query
            : split.user,
        owedByUser: new Decimal(0),
        owedToUser: new Decimal(0),
      });
    }

    const settlement = settlementMap.get(otherUserId)!;

    if (isUserOwing) {
      settlement.owedByUser = settlement.owedByUser.plus(split.amount);
    } else {
      settlement.owedToUser = settlement.owedToUser.plus(split.amount);
    }
  }

  // Get user details for any missing user info
  const userIds = Array.from(settlementMap.keys()).filter(
    id => settlementMap.get(id)!.user.name === ''
  );

  if (userIds.length > 0) {
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true },
    });

    for (const user of users) {
      const settlement = settlementMap.get(user.id);
      if (settlement) {
        settlement.user = user;
      }
    }
  }

  // Convert to UserSettlement array with net calculations
  const settlements: UserSettlement[] = Array.from(settlementMap.entries())
    .map(([otherUserId, settlement]) => ({
      userId: otherUserId,
      name: settlement.user.name,
      email: settlement.user.email,
      owedByYou: settlement.owedByUser,
      owedToYou: settlement.owedToUser,
      netAmount: settlement.owedToUser.minus(settlement.owedByUser),
    }))
    .filter(
      settlement =>
        // Only include settlements where there's actually money involved
        !settlement.owedByYou.equals(0) || !settlement.owedToYou.equals(0)
    )
    .sort((a, b) =>
      // Sort by net amount descending (people who owe you most first)
      b.netAmount.minus(a.netAmount).toNumber()
    );

  return settlements;
}

/**
 * Get detailed settlement between two specific users
 */
export async function getSettlementBetweenUsers(
  user1Id: number,
  user2Id: number
): Promise<{
  user1: { id: number; name: string; email: string };
  user2: { id: number; name: string; email: string };
  user1OwesUser2: Decimal;
  user2OwesUser1: Decimal;
  netAmount: Decimal; // Positive means user2 owes user1, negative means user1 owes user2
  splits: Array<{
    expenseId: number;
    expenseTitle: string;
    amount: Decimal;
    splitType: SplitType;
    percentage: number | null;
    paidBy: number; // Who paid for the expense
    owedBy: number; // Who owes the money
  }>;
}> {
  // Get user details
  const [user1, user2] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user1Id },
      select: { id: true, name: true, email: true },
    }),
    prisma.user.findUnique({
      where: { id: user2Id },
      select: { id: true, name: true, email: true },
    }),
  ]);

  if (!user1 || !user2) {
    throw new Error('One or both users not found');
  }

  // Get all unpaid splits between these two users
  const splits = await prisma.expenseSplit.findMany({
    where: {
      isPaid: false,
      OR: [
        // User1 owes money on expenses paid by User2
        { userId: user1Id, expense: { userId: user2Id } },
        // User2 owes money on expenses paid by User1
        { userId: user2Id, expense: { userId: user1Id } },
      ],
    },
    include: {
      expense: {
        select: { id: true, title: true, userId: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  let user1OwesUser2 = new Decimal(0);
  let user2OwesUser1 = new Decimal(0);

  const splitDetails = splits.map(split => {
    const paidBy = split.expense.userId;
    const owedBy = split.userId;

    if (owedBy === user1Id) {
      user1OwesUser2 = user1OwesUser2.plus(split.amount);
    } else {
      user2OwesUser1 = user2OwesUser1.plus(split.amount);
    }

    return {
      expenseId: split.expense.id,
      expenseTitle: split.expense.title,
      amount: split.amount,
      splitType: split.splitType,
      percentage: split.percentage,
      paidBy,
      owedBy,
    };
  });

  return {
    user1,
    user2,
    user1OwesUser2,
    user2OwesUser1,
    netAmount: user2OwesUser1.minus(user1OwesUser2),
    splits: splitDetails,
  };
}

/**
 * Settle debt between two users (mark specific splits as paid)
 */
export async function settleDebtBetweenUsers(
  payerId: number,
  payeeId: number,
  amount?: Decimal // If not provided, settle all debts
): Promise<{
  settledAmount: Decimal;
  settledSplits: number; // Count of splits marked as paid
}> {
  // Get all unpaid splits where payer owes money to payee
  const unpaidSplits = await prisma.expenseSplit.findMany({
    where: {
      userId: payerId,
      expense: { userId: payeeId },
      isPaid: false,
    },
    orderBy: { createdAt: 'asc' }, // Settle oldest debts first
  });

  if (unpaidSplits.length === 0) {
    return { settledAmount: new Decimal(0), settledSplits: 0 };
  }

  let remainingAmount = amount || new Decimal(Number.MAX_SAFE_INTEGER);
  let settledAmount = new Decimal(0);
  let settledSplits = 0;

  // Mark splits as paid until we reach the settlement amount
  for (const split of unpaidSplits) {
    if (remainingAmount.lessThanOrEqualTo(0)) {
      break;
    }

    if (split.amount.lessThanOrEqualTo(remainingAmount)) {
      // Settle this split completely
      await prisma.expenseSplit.update({
        where: { id: split.id },
        data: { isPaid: true },
      });

      settledAmount = settledAmount.plus(split.amount);
      remainingAmount = remainingAmount.minus(split.amount);
      settledSplits++;
    } else if (!amount) {
      // If no specific amount provided, settle all remaining
      await prisma.expenseSplit.update({
        where: { id: split.id },
        data: { isPaid: true },
      });

      settledAmount = settledAmount.plus(split.amount);
      settledSplits++;
    }
    // If specific amount provided and split is larger, we can't partially settle
    // (this would require more complex partial payment tracking)
  }

  return { settledAmount, settledSplits };
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
