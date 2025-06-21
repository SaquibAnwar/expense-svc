# Test Structure

This directory contains all the test files for the expense service application.

## Directory Structure

```
tests/
├── README.md                          # This file
├── setup.ts                          # Global test setup and utilities
├── utils/
│   └── testHelpers.ts                # Test utility functions
├── integration/
│   └── app.test.ts                   # Integration tests for the entire app
├── routes/
│   └── v1/
│       └── expenses/
│           └── expenses.test.ts      # Route tests for expense endpoints
└── repositories/
    └── expenseRepo.test.ts           # Unit tests for expense repository
```

## Running Tests

Before running tests, make sure to install the dependencies:

```bash
npm install
```

### Available Test Commands

- `npm test` - Run all tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report

## Test Types

### Unit Tests
- Located in `repositories/` directory
- Test individual functions and methods in isolation
- Use mocked dependencies

### Integration Tests
- Located in `integration/` directory
- Test multiple components working together
- Test the entire application flow

### Route Tests
- Located in `routes/` directory
- Test API endpoints using Fastify's inject method
- Test request/response handling

## Test Setup

The `setup.ts` file contains:
- Global test configuration
- Helper functions for creating test app instances
- Common utilities used across tests

## Test Utilities

The `utils/testHelpers.ts` file provides:
- Mock data generators
- Common test utility functions
- Helper functions for test assertions

## Writing Tests

When writing new tests:

1. Place unit tests in the appropriate directory matching the source structure
2. Use descriptive test names that explain the expected behavior
3. Follow the AAA pattern (Arrange, Act, Assert)
4. Use the provided utilities for creating mock data
5. Clean up resources in `afterEach` or `afterAll` hooks

## Example Test Structure

```typescript
describe('Component Name', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  describe('specific functionality', () => {
    it('should do something specific', async () => {
      // Arrange
      const testData = createMockExpenseData();

      // Act
      const response = await app.inject({
        method: 'POST',
        url: '/v1/expenses',
        payload: testData
      });

      // Assert
      expect(response.statusCode).toBe(201);
    });
  });
});
```

## Notes

- The linter errors in test files are expected until Jest dependencies are installed
- Tests are configured to work with TypeScript using ts-jest
- Prisma client is mocked for repository tests
- Coverage reports are generated in the `coverage/` directory 