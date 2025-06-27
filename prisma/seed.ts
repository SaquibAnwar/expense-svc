import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seeding...')

  // Create default categories
  console.log('📂 Creating default categories...')
  
  const defaultCategories = [
    {
      name: 'Food & Dining',
      description: 'Restaurants, groceries, food delivery',
      icon: 'utensils',
      color: '#FF6B6B',
      isDefault: true,
    },
    {
      name: 'Transportation',
      description: 'Gas, public transport, car maintenance',
      icon: 'car',
      color: '#4ECDC4',
      isDefault: true,
    },
    {
      name: 'Entertainment',
      description: 'Movies, games, concerts, subscriptions',
      icon: 'gamepad',
      color: '#45B7D1',
      isDefault: true,
    },
    {
      name: 'Shopping',
      description: 'Clothing, electronics, general shopping',
      icon: 'shopping-bag',
      color: '#F7B731',
      isDefault: true,
    },
    {
      name: 'Utilities',
      description: 'Electricity, water, internet, phone',
      icon: 'home',
      color: '#5F27CD',
      isDefault: true,
    },
    {
      name: 'Health & Fitness',
      description: 'Medical expenses, gym, pharmacy',
      icon: 'heart',
      color: '#00D2D3',
      isDefault: true,
    },
    {
      name: 'Travel',
      description: 'Hotels, flights, vacation expenses',
      icon: 'plane',
      color: '#FF9FF3',
      isDefault: true,
    },
    {
      name: 'Education',
      description: 'Books, courses, training',
      icon: 'book',
      color: '#54A0FF',
      isDefault: true,
    },
    {
      name: 'Personal Care',
      description: 'Haircuts, cosmetics, personal items',
      icon: 'user',
      color: '#5F27CD',
      isDefault: true,
    },
    {
      name: 'Other',
      description: 'Miscellaneous expenses',
      icon: 'more-horizontal',
      color: '#6C5CE7',
      isDefault: true,
    },
  ]

  // Create default categories (skip if they already exist)
  for (const category of defaultCategories) {
    try {
      const existingCategory = await prisma.category.findFirst({
        where: {
          name: category.name,
          userId: null,
        },
      })

      if (existingCategory) {
        await prisma.category.update({
          where: { id: existingCategory.id },
          data: {
            description: category.description,
            icon: category.icon,
            color: category.color,
            isDefault: true,
            isActive: true,
          },
        })
        console.log(`✅ Updated existing category: ${category.name}`)
      } else {
        await prisma.category.create({
          data: category,
        })
        console.log(`✅ Created new category: ${category.name}`)
      }
    } catch (error: any) {
      console.error(`❌ Error processing category ${category.name}:`, error.message)
    }
  }

  console.log(`✅ Created ${defaultCategories.length} default categories`)

  // Create a demo user
  console.log('👤 Creating demo user...')
  
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {
      name: 'Demo User',
      username: 'demo',
      isEmailVerified: true,
    },
    create: {
      email: 'demo@example.com',
      name: 'Demo User',
      username: 'demo',
      password: '$2b$10$8K7Qz8k4DjYJyGXQKyJK4.ZQr4k4DjYJyGXQKyJK4.ZQr4k4DjYJyG', // "password"
      isEmailVerified: true,
    },
  })

  console.log('✅ Demo user created/updated')

  // Create some sample expenses with categories
  console.log('💰 Creating sample expenses...')
  
  const categories = await prisma.category.findMany({
    where: { isDefault: true },
  })

  const foodCategory = categories.find(c => c.name === 'Food & Dining')
  const transportCategory = categories.find(c => c.name === 'Transportation')
  const entertainmentCategory = categories.find(c => c.name === 'Entertainment')
  const utilitiesCategory = categories.find(c => c.name === 'Utilities')
  const travelCategory = categories.find(c => c.name === 'Travel')

  const sampleExpenses = [
    {
      title: 'Lunch at Italian Restaurant',
      description: 'Team lunch meeting',
      amount: 45.50,
      userId: demoUser.id,
      categoryId: foodCategory?.id,
    },
    {
      title: 'Gas Station Fill-up',
      description: 'Weekly gas refill',
      amount: 65.00,
      userId: demoUser.id,
      categoryId: transportCategory?.id,
    },
    {
      title: 'Netflix Subscription',
      description: 'Monthly subscription',
      amount: 15.99,
      userId: demoUser.id,
      categoryId: entertainmentCategory?.id,
    },
    {
      title: 'Electricity Bill',
      description: 'Monthly electricity payment',
      amount: 120.75,
      userId: demoUser.id,
      categoryId: utilitiesCategory?.id,
    },
    {
      title: 'Flight to New York',
      description: 'Business trip',
      amount: 350.00,
      userId: demoUser.id,
      categoryId: travelCategory?.id,
    },
  ]

  for (const expense of sampleExpenses) {
    await prisma.expense.create({
      data: expense,
    })
  }

  console.log(`✅ Created ${sampleExpenses.length} sample expenses`)

  console.log('🎉 Database seeding completed successfully!')
}

main()
  .catch(e => {
    console.error('❌ Error during seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 