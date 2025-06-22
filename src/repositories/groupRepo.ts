import { PrismaClient, Group, GroupMember, GroupMemberRole } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateGroupData {
  name: string;
  description?: string;
  avatar?: string;
  createdBy: number;
}

export interface UpdateGroupData {
  name?: string;
  description?: string;
  avatar?: string;
}

export interface AddMemberData {
  groupId: number;
  userId: number;
  role?: GroupMemberRole;
}

export interface UpdateMemberRoleData {
  groupId: number;
  userId: number;
  role: GroupMemberRole;
}

// ===== Group CRUD Operations =====

/** Create a new group */
export async function createGroup(data: CreateGroupData): Promise<Group> {
  return prisma.$transaction(async tx => {
    // Create the group
    const group = await tx.group.create({
      data: {
        name: data.name,
        description: data.description,
        avatar: data.avatar,
        createdBy: data.createdBy,
      },
    });

    // Add creator as admin member
    await tx.groupMember.create({
      data: {
        groupId: group.id,
        userId: data.createdBy,
        role: GroupMemberRole.ADMIN,
      },
    });

    return group;
  });
}

/** Get group by ID with members */
export async function getGroupById(id: number) {
  return prisma.group.findUnique({
    where: { id },
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          avatar: true,
        },
      },
      members: {
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
        },
        orderBy: { joinedAt: 'asc' },
      },
      expenses: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
            },
          },
        },
        orderBy: { paidAt: 'desc' },
        take: 10, // Recent expenses
      },
      _count: {
        select: {
          members: true,
          expenses: true,
        },
      },
    },
  });
}

/** Get groups where user is a member */
export async function getUserGroups(userId: number) {
  return prisma.group.findMany({
    where: {
      members: {
        some: {
          userId: userId,
        },
      },
      isActive: true,
    },
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          username: true,
        },
      },
      members: {
        where: { userId: userId },
        select: {
          role: true,
          joinedAt: true,
        },
      },
      _count: {
        select: {
          members: true,
          expenses: true,
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });
}

/** Update group information */
export async function updateGroup(id: number, data: UpdateGroupData): Promise<Group> {
  return prisma.group.update({
    where: { id },
    data: {
      ...data,
      updatedAt: new Date(),
    },
  });
}

/** Soft delete group (deactivate) */
export async function deactivateGroup(id: number): Promise<Group> {
  return prisma.group.update({
    where: { id },
    data: {
      isActive: false,
      updatedAt: new Date(),
    },
  });
}

// ===== Group Member Operations =====

/** Add member to group */
export async function addGroupMember(data: AddMemberData): Promise<GroupMember> {
  return prisma.groupMember.create({
    data: {
      groupId: data.groupId,
      userId: data.userId,
      role: data.role || GroupMemberRole.MEMBER,
    },
  });
}

/** Remove member from group */
export async function removeGroupMember(groupId: number, userId: number): Promise<GroupMember> {
  return prisma.groupMember.delete({
    where: {
      groupId_userId: {
        groupId,
        userId,
      },
    },
  });
}

/** Update member role */
export async function updateMemberRole(data: UpdateMemberRoleData): Promise<GroupMember> {
  return prisma.groupMember.update({
    where: {
      groupId_userId: {
        groupId: data.groupId,
        userId: data.userId,
      },
    },
    data: {
      role: data.role,
    },
  });
}

/** Get group member */
export async function getGroupMember(groupId: number, userId: number) {
  return prisma.groupMember.findUnique({
    where: {
      groupId_userId: {
        groupId,
        userId,
      },
    },
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
    },
  });
}

/** Check if user is group member */
export async function isGroupMember(groupId: number, userId: number): Promise<boolean> {
  const member = await prisma.groupMember.findUnique({
    where: {
      groupId_userId: {
        groupId,
        userId,
      },
    },
  });
  return !!member;
}

/** Check if user is group admin */
export async function isGroupAdmin(groupId: number, userId: number): Promise<boolean> {
  const member = await prisma.groupMember.findUnique({
    where: {
      groupId_userId: {
        groupId,
        userId,
      },
    },
    select: {
      role: true,
    },
  });
  return member?.role === GroupMemberRole.ADMIN;
}

/** Get group members */
export async function getGroupMembers(groupId: number) {
  return prisma.groupMember.findMany({
    where: { groupId },
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
    },
    orderBy: [
      { role: 'asc' }, // Admins first
      { joinedAt: 'asc' },
    ],
  });
}

/** Get group statistics */
export async function getGroupStats(groupId: number) {
  const stats = await prisma.group.findUnique({
    where: { id: groupId },
    select: {
      _count: {
        select: {
          members: true,
          expenses: true,
        },
      },
      expenses: {
        select: {
          amount: true,
        },
      },
    },
  });

  if (!stats) {
    return null;
  }

  const totalAmount = stats.expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);

  return {
    membersCount: stats._count.members,
    expensesCount: stats._count.expenses,
    totalAmount,
  };
}
