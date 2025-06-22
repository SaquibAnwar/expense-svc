# CI Database Setup Guide

## 🔧 **Problem**: PrismaClientInitializationError in GitHub Actions

The error occurs when tests try to connect to a database that doesn't exist in the CI environment.

## ✅ **Solution**: Configured CI with PostgreSQL Service

### **What We Fixed:**

1. **Added PostgreSQL Service** to GitHub Actions workflow
2. **Set Environment Variables** for database connection
3. **Added Database Migration** step before tests
4. **Enhanced Test Setup** with proper error handling

### **GitHub Actions Configuration**

The CI workflow now includes:

```yaml
services:
  postgres:
    image: postgres:13
    env:
      POSTGRES_USER: test_user
      POSTGRES_PASSWORD: test_password
      POSTGRES_DB: expense_test_db
    ports:
      - 5432:5432
    options: >-
      --health-cmd pg_isready
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5

env:
  DATABASE_URL: postgresql://test_user:test_password@localhost:5432/expense_test_db
  JWT_SECRET: test-jwt-secret-for-ci
  NODE_ENV: test
```

### **Test Environment Setup**

- **Test Setup File**: `tests/setup.ts` handles environment configuration
- **Jest Configuration**: Uses setup file for all tests
- **Environment Variables**: Automatically set with fallback values

### **Local Development**

#### **Option 1: Use Setup Script**
```bash
npm run test:setup  # Sets up test database in Docker
npm test           # Run tests
```

#### **Option 2: Use Docker Compose**
```bash
docker-compose up -d db  # Start main database
DATABASE_URL="postgresql://expense_user:expense_pass@localhost:5432/expense_db" npm test
```

#### **Option 3: Manual Setup**
```bash
# Start PostgreSQL container
docker run --name expense-test-db \
  -e POSTGRES_USER=test_user \
  -e POSTGRES_PASSWORD=test_password \
  -e POSTGRES_DB=expense_test_db \
  -p 5433:5432 \
  -d postgres:13

# Set environment variable
export DATABASE_URL="postgresql://test_user:test_password@localhost:5433/expense_test_db"

# Run migrations and tests
npx prisma migrate deploy
npm test
```

## 🚨 **Troubleshooting**

### **Error: "connect ECONNREFUSED ::1:5432"**
- Database service not running
- Wrong DATABASE_URL
- Port conflict

**Solution**: Check Docker container is running and port is correct

### **Error: "database does not exist"**
- Database not created
- Wrong database name in URL

**Solution**: Verify POSTGRES_DB matches DATABASE_URL database name

### **Error: "relation does not exist"**
- Migrations not run
- Schema out of sync

**Solution**: Run `npx prisma migrate deploy` before tests

### **Error: "Invalid `prisma.xxx.findMany()` invocation"**
- Prisma Client not generated
- Version mismatch

**Solution**: Run `npx prisma generate`

## 📝 **Environment Variables Required**

### **CI (GitHub Actions)**
```yaml
DATABASE_URL: postgresql://test_user:test_password@localhost:5432/expense_test_db
JWT_SECRET: test-jwt-secret-for-ci
NODE_ENV: test
```

### **Local Development**
```bash
DATABASE_URL="postgresql://test_user:test_password@localhost:5433/expense_test_db"
JWT_SECRET="test-jwt-secret-for-testing"
NODE_ENV="test"
```

## 🎯 **Best Practices**

1. **Use Different Ports**: Local test DB on 5433, main DB on 5432
2. **Isolated Test Data**: Each test cleans up after itself
3. **Health Checks**: CI waits for DB to be ready
4. **Environment Separation**: Different credentials for test/dev/prod
5. **Connection Pooling**: Tests disconnect properly

## 🔄 **CI Workflow Steps**

1. **Start PostgreSQL Service** (automatic)
2. **Install Dependencies** (`npm ci`)
3. **Generate Prisma Client** (`npx prisma generate`)
4. **Run Migrations** (`npx prisma migrate deploy`)
5. **Run Tests** (`npm run test:ci`)

This ensures a clean, isolated database for every CI run.

## 📊 **Expected CI Results**

- ✅ All tests pass (112/112)
- ✅ Coverage > 98%
- ✅ No database connection errors
- ✅ Clean shutdown 