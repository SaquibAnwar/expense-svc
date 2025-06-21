import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Create a test user
  const user = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      name: 'Test User',
      username: 'testuser',
      provider: 'local',
      isEmailVerified: true,
      isActive: true
    },
  })

  // Create some test expenses
  const expense1 = await prisma.expense.upsert({
    where: { id: 1 },
    update: {},
    create: {
      title: 'Coffee',
      amount: 4.50,
      userId: user.id,
    },
  })

  const expense2 = await prisma.expense.upsert({
    where: { id: 2 },
    update: {},
    create: {
      title: 'Lunch',
      amount: 12.99,
      userId: user.id,
    },
  })

  console.log('Seed data created:', { user, expense1, expense2 })
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  }) 