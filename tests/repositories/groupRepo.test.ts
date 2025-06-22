import { PrismaClient, GroupMemberRole } from '@prisma/client';
import {
  createGroup,
  getGroupById,
  getUserGroups,
  updateGroup,
  addGroupMember,
  removeGroupMember,
  updateMemberRole,
  isGroupMember,
  isGroupAdmin,
  getGroupMembers,
  getGroupStats,
} from '../../src/repositories/groupRepo.js';
import { createUser } from '../../src/repositories/userRepo.js';

const prisma = new PrismaClient();

describe('Group Repository', () => {
  let testUser1: any;
  let testUser2: any;
  let testGroup: any;

  beforeAll(async () => {
    // Create test users
    testUser1 = await createUser({
      email: 'testuser1@example.com',
      name: 'Test User 1',
      password: 'TestPassword123',
      provider: 'local',
    });

    testUser2 = await createUser({
      email: 'testuser2@example.com',
      name: 'Test User 2',
      password: 'TestPassword123',
      provider: 'local',
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.groupMember.deleteMany();
    await prisma.expense.deleteMany();
    await prisma.group.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up any existing test data
    await prisma.groupMember.deleteMany();
    await prisma.expense.deleteMany();
    await prisma.group.deleteMany();
  });

  describe('createGroup', () => {
    it('should create a new group with creator as admin', async () => {
      const groupData = {
        name: 'Test Group',
        description: 'A test group',
        createdBy: testUser1.id,
      };

      testGroup = await createGroup(groupData);

      expect(testGroup).toBeDefined();
      expect(testGroup.name).toBe(groupData.name);
      expect(testGroup.description).toBe(groupData.description);
      expect(testGroup.createdBy).toBe(testUser1.id);
      expect(testGroup.isActive).toBe(true);

      // Verify creator is added as admin member
      const isAdmin = await isGroupAdmin(testGroup.id, testUser1.id);
      expect(isAdmin).toBe(true);
    });

    it('should create a group without description', async () => {
      const groupData = {
        name: 'Simple Group',
        createdBy: testUser1.id,
      };

      const group = await createGroup(groupData);

      expect(group.name).toBe(groupData.name);
      expect(group.description).toBeNull();
    });
  });

  describe('getGroupById', () => {
    beforeEach(async () => {
      testGroup = await createGroup({
        name: 'Test Group',
        description: 'A test group',
        createdBy: testUser1.id,
      });
    });

    it('should return group with all relations', async () => {
      const group = await getGroupById(testGroup.id);

      expect(group).toBeDefined();
      expect(group!.id).toBe(testGroup.id);
      expect(group!.name).toBe('Test Group');
      expect(group!.creator).toBeDefined();
      expect(group!.creator.id).toBe(testUser1.id);
      expect(group!.members).toBeDefined();
      expect(group!.members.length).toBe(1); // Creator is a member
      expect(group!._count).toBeDefined();
    });

    it('should return null for non-existent group', async () => {
      const group = await getGroupById(99999);
      expect(group).toBeNull();
    });
  });

  describe('getUserGroups', () => {
    beforeEach(async () => {
      // Create multiple groups
      testGroup = await createGroup({
        name: 'User1 Group',
        createdBy: testUser1.id,
      });

      const group2 = await createGroup({
        name: 'User2 Group',
        createdBy: testUser2.id,
      });

      // Add user1 to group2
      await addGroupMember({
        groupId: group2.id,
        userId: testUser1.id,
        role: GroupMemberRole.MEMBER,
      });
    });

    it('should return all groups where user is a member', async () => {
      const groups = await getUserGroups(testUser1.id);

      expect(groups).toBeDefined();
      expect(groups.length).toBe(2);
      
      const groupNames = groups.map(g => g.name).sort();
      expect(groupNames).toEqual(['User1 Group', 'User2 Group']);
    });

    it('should return empty array for user with no groups', async () => {
      const newUser = await createUser({
        email: 'nogroups@example.com',
        name: 'No Groups User',
        password: 'TestPassword123',
        provider: 'local',
      });

      const groups = await getUserGroups(newUser.id);
      expect(groups).toEqual([]);

      // Clean up
      await prisma.user.delete({ where: { id: newUser.id } });
    });
  });

  describe('updateGroup', () => {
    beforeEach(async () => {
      testGroup = await createGroup({
        name: 'Original Name',
        description: 'Original description',
        createdBy: testUser1.id,
      });
    });

    it('should update group information', async () => {
      const updateData = {
        name: 'Updated Name',
        description: 'Updated description',
      };

      const updatedGroup = await updateGroup(testGroup.id, updateData);

      expect(updatedGroup.name).toBe(updateData.name);
      expect(updatedGroup.description).toBe(updateData.description);
      expect(updatedGroup.updatedAt.getTime()).toBeGreaterThan(testGroup.updatedAt.getTime());
    });

    it('should update partial information', async () => {
      const updateData = { name: 'New Name Only' };

      const updatedGroup = await updateGroup(testGroup.id, updateData);

      expect(updatedGroup.name).toBe(updateData.name);
      expect(updatedGroup.description).toBe(testGroup.description); // Unchanged
    });
  });

  describe('Group Member Operations', () => {
    beforeEach(async () => {
      testGroup = await createGroup({
        name: 'Member Test Group',
        createdBy: testUser1.id,
      });
    });

    describe('addGroupMember', () => {
      it('should add a member to the group', async () => {
        const memberData = {
          groupId: testGroup.id,
          userId: testUser2.id,
          role: GroupMemberRole.MEMBER,
        };

        const member = await addGroupMember(memberData);

        expect(member).toBeDefined();
        expect(member.groupId).toBe(testGroup.id);
        expect(member.userId).toBe(testUser2.id);
        expect(member.role).toBe(GroupMemberRole.MEMBER);

        // Verify membership
        const isMember = await isGroupMember(testGroup.id, testUser2.id);
        expect(isMember).toBe(true);
      });

      it('should add a member with admin role', async () => {
        const memberData = {
          groupId: testGroup.id,
          userId: testUser2.id,
          role: GroupMemberRole.ADMIN,
        };

        await addGroupMember(memberData);

        const isAdmin = await isGroupAdmin(testGroup.id, testUser2.id);
        expect(isAdmin).toBe(true);
      });
    });

    describe('removeGroupMember', () => {
      beforeEach(async () => {
        await addGroupMember({
          groupId: testGroup.id,
          userId: testUser2.id,
          role: GroupMemberRole.MEMBER,
        });
      });

      it('should remove a member from the group', async () => {
        const removedMember = await removeGroupMember(testGroup.id, testUser2.id);

        expect(removedMember).toBeDefined();

        // Verify membership removed
        const isMember = await isGroupMember(testGroup.id, testUser2.id);
        expect(isMember).toBe(false);
      });
    });

    describe('updateMemberRole', () => {
      beforeEach(async () => {
        await addGroupMember({
          groupId: testGroup.id,
          userId: testUser2.id,
          role: GroupMemberRole.MEMBER,
        });
      });

      it('should update member role from member to admin', async () => {
        const updateData = {
          groupId: testGroup.id,
          userId: testUser2.id,
          role: GroupMemberRole.ADMIN,
        };

        const updatedMember = await updateMemberRole(updateData);

        expect(updatedMember.role).toBe(GroupMemberRole.ADMIN);

        // Verify admin status
        const isAdmin = await isGroupAdmin(testGroup.id, testUser2.id);
        expect(isAdmin).toBe(true);
      });
    });

    describe('getGroupMembers', () => {
      beforeEach(async () => {
        await addGroupMember({
          groupId: testGroup.id,
          userId: testUser2.id,
          role: GroupMemberRole.MEMBER,
        });
      });

      it('should return all group members with user info', async () => {
        const members = await getGroupMembers(testGroup.id);

        expect(members).toBeDefined();
        expect(members.length).toBe(2); // Creator + added member

        // Check admin is first (sorted by role)
        expect(members[0].role).toBe(GroupMemberRole.ADMIN);
        expect(members[0].user.id).toBe(testUser1.id);

        expect(members[1].role).toBe(GroupMemberRole.MEMBER);
        expect(members[1].user.id).toBe(testUser2.id);
      });
    });
  });

  describe('getGroupStats', () => {
    beforeEach(async () => {
      testGroup = await createGroup({
        name: 'Stats Test Group',
        createdBy: testUser1.id,
      });

      // Add a member
      await addGroupMember({
        groupId: testGroup.id,
        userId: testUser2.id,
        role: GroupMemberRole.MEMBER,
      });

      // Add some expenses
      await prisma.expense.createMany({
        data: [
          {
            title: 'Test Expense 1',
            amount: 50.00,
            userId: testUser1.id,
            groupId: testGroup.id,
          },
          {
            title: 'Test Expense 2',
            amount: 75.50,
            userId: testUser2.id,
            groupId: testGroup.id,
          },
        ],
      });
    });

    it('should return correct group statistics', async () => {
      const stats = await getGroupStats(testGroup.id);

      expect(stats).toBeDefined();
      expect(stats!.membersCount).toBe(2);
      expect(stats!.expensesCount).toBe(2);
      expect(stats!.totalAmount).toBe(125.50);
    });

    it('should return null for non-existent group', async () => {
      const stats = await getGroupStats(99999);
      expect(stats).toBeNull();
    });
  });
}); 