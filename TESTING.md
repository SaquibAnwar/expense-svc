# Testing Guidelines and Requirements

## Overview

This project enforces **mandatory unit testing** for all functionality. Every feature, bug fix, or enhancement must include comprehensive unit tests to ensure code quality, maintainability, and reliability.

## Testing Requirements

### 🎯 Coverage Thresholds

All code must meet the following minimum coverage requirements:

- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 80%
- **Statements**: 80%

### 📁 Test File Structure

Every source file must have a corresponding test file:

```
src/
├── repositories/
│   ├── userRepo.ts          → tests/repositories/userRepo.test.ts
│   └── expenseRepo.ts       → tests/repositories/expenseRepo.test.ts
├── routes/
│   ├── users.ts             → tests/routes/users.test.ts
│   ├── expenses.ts          → tests/routes/expenses.test.ts
│   └── health.ts            → tests/routes/health.test.ts
└── utils/
    ├── auth.ts              → tests/utils/auth.test.ts
    └── middleware.ts        → tests/utils/middleware.test.ts
```

## Running Tests

### Basic Commands

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode (development)
npm run test:watch

# Run tests in CI mode
npm run test:ci

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Check coverage thresholds
npm run test:required

# Validate test coverage
npm run validate:tests
```

### Pre-commit Validation

Before committing code, run:

```bash
npm run pre-commit
```

This will:
1. Run all unit tests
2. Validate test coverage
3. Ensure all source files have tests
4. Check coverage thresholds

## Testing Standards

### 🧪 Unit Test Requirements

Each test file must include:

1. **Comprehensive test coverage** for all functions/methods
2. **Error handling tests** for failure scenarios
3. **Edge case testing** for boundary conditions
4. **Mock dependencies** to isolate units under test
5. **Clear, descriptive test names** that explain what is being tested

### 📝 Test Structure

Follow this structure for all test files:

```typescript
import { functionToTest } from '../../src/module/file.js';

// Mock dependencies
jest.mock('dependency-module');

describe('ModuleName', () => {
  // Setup and teardown
  beforeEach(() => {
    // Setup logic
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('functionName', () => {
    it('should handle successful case', async () => {
      // Arrange
      const input = 'test-input';
      const expectedOutput = 'expected-result';

      // Act
      const result = await functionToTest(input);

      // Assert
      expect(result).toBe(expectedOutput);
    });

    it('should handle error case', async () => {
      // Test error scenarios
    });

    it('should handle edge cases', () => {
      // Test boundary conditions
    });
  });
});
```

### 🎭 Mocking Guidelines

- **Mock external dependencies** (databases, APIs, third-party libraries)
- **Mock internal modules** to isolate the unit under test
- **Use proper TypeScript types** for mocks
- **Reset mocks** between tests using `jest.clearAllMocks()`

### 📊 Repository Testing

Repository tests should cover:

- ✅ All CRUD operations
- ✅ Database error handling
- ✅ Data validation
- ✅ Query parameter handling
- ✅ Return value verification

### 🛣️ Route Testing

Route tests should cover:

- ✅ All HTTP methods (GET, POST, PUT, DELETE, PATCH)
- ✅ Request validation
- ✅ Authentication/authorization
- ✅ Response status codes
- ✅ Response body structure
- ✅ Error responses

### 🔧 Utility Testing

Utility tests should cover:

- ✅ All public functions
- ✅ Input validation
- ✅ Output verification
- ✅ Error conditions
- ✅ Edge cases

## CI/CD Integration

### 🚫 Merge Blocking

Pull requests will be **automatically blocked** if:

1. Any test fails
2. Coverage falls below 80% threshold
3. Source files lack corresponding test files
4. Tests are not properly structured

### ✅ Required Checks

All PRs must pass:

- [ ] Unit tests execution
- [ ] Coverage threshold validation
- [ ] Test file existence validation
- [ ] Build verification

## Development Workflow

### 🔄 Test-Driven Development (TDD)

We encourage TDD approach:

1. **Write failing test** for new functionality
2. **Implement minimum code** to make test pass
3. **Refactor** while keeping tests green
4. **Add more tests** for edge cases and error scenarios

### 🆕 Adding New Features

When adding new functionality:

1. Create test file first: `tests/<module>/<filename>.test.ts`
2. Write comprehensive unit tests
3. Implement the functionality
4. Ensure all tests pass
5. Verify coverage thresholds are met
6. Run `npm run validate:tests` before committing

### 🐛 Bug Fixes

When fixing bugs:

1. Write a test that reproduces the bug
2. Fix the bug
3. Ensure the test now passes
4. Add additional tests to prevent regression

## Testing Tools

### 🛠️ Tech Stack

- **Jest**: Testing framework
- **ts-jest**: TypeScript support for Jest
- **Fastify Testing**: Built-in testing utilities
- **Coverage**: Istanbul/NYC for coverage reporting

### 📈 Coverage Reports

Coverage reports are generated in multiple formats:

- **Text**: Console output during test runs
- **HTML**: `coverage/lcov-report/index.html`
- **LCOV**: `coverage/lcov.info` for CI/CD integration
- **JSON Summary**: `coverage/coverage-summary.json`

## Best Practices

### ✨ Writing Good Tests

1. **Test behavior, not implementation**
2. **Use descriptive test names** that explain the scenario
3. **Keep tests simple and focused**
4. **Avoid testing third-party code**
5. **Mock external dependencies properly**
6. **Test both happy and sad paths**

### 🚀 Performance

- Keep tests **fast** and **isolated**
- Use **beforeEach/afterEach** for setup/teardown
- Avoid **unnecessary async/await** when not needed
- **Parallel test execution** is enabled by default

### 🔍 Debugging Tests

```bash
# Run specific test file
npm test -- tests/utils/auth.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="should validate email"

# Run tests in debug mode
npm test -- --detectOpenHandles --forceExit

# Run with coverage for specific file
npm test -- --coverage --testPathPattern=auth.test.ts
```

## Continuous Improvement

### 📊 Monitoring

- Monitor test execution time
- Track coverage trends
- Review failed test patterns
- Identify flaky tests

### 🔄 Updates

This document will be updated as testing practices evolve. All team members should stay informed about testing requirements and best practices.

---

## Quick Reference

| Command | Purpose |
|---------|---------|
| `npm test` | Run all tests |
| `npm run test:coverage` | Run with coverage |
| `npm run test:watch` | Development mode |
| `npm run test:ci` | CI/CD mode |
| `npm run validate:tests` | Check test coverage |
| `npm run pre-commit` | Pre-commit validation |

**Remember**: Tests are not optional. They are a critical part of our development process and code quality assurance. 🚀 