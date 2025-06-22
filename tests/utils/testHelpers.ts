// Test utility functions

export const createMockExpense = (overrides: Partial<any> = {}) => {
  return {
    id: 1,
    description: 'Test expense',
    amount: 25.0,
    category: 'Food',
    date: new Date('2024-01-01'),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
};

export const createMockExpenseData = (overrides: Partial<any> = {}) => {
  return {
    description: 'Test expense',
    amount: 25.0,
    category: 'Food',
    date: new Date('2024-01-01').toISOString(),
    ...overrides,
  };
};

export const waitForMs = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

export const generateRandomExpense = () => {
  const categories = ['Food', 'Transportation', 'Entertainment', 'Shopping', 'Utilities'];
  const descriptions = ['Lunch', 'Coffee', 'Movie', 'Groceries', 'Gas', 'Internet bill'];

  return {
    description: descriptions[Math.floor(Math.random() * descriptions.length)],
    amount: Math.round((Math.random() * 100 + 1) * 100) / 100, // Random amount between 1-100
    category: categories[Math.floor(Math.random() * categories.length)],
    date: new Date().toISOString(),
  };
};
