# Expense Service

A RESTful API service for managing expenses built with Fastify, TypeScript, and Prisma.

## Features

- ✅ **User Authentication System**
  - Email/password registration and login
  - JWT token-based authentication
  - Secure password hashing with bcrypt
- ✅ **Secure Expense Management**
  - User-specific expense tracking
  - All expense APIs require authentication
  - Users can only access their own data
- ✅ **Technical Features**
  - RESTful API endpoints
  - TypeScript for type safety
  - Prisma ORM for database operations
  - Fastify web framework for high performance
  - Swagger/OpenAPI documentation
  - Comprehensive test suite with Jest
  - Docker support for containerization

## Quick Start

### Local Development

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd expense-svc
   npm install
   ```

2. **Set up environment:**
   ```bash
   # Create .env file with the following variables:
   DATABASE_URL="postgresql://expense_user:expense_pass@localhost:5432/expense_db"
   JWT_SECRET="your-super-secure-secret-key-here"
   PORT=3000
   ```

3. **Set up database:**
   ```bash
   npm run db:setup
   ```

4. **Seed the database (optional):**
   ```bash
   npm run db:seed
   ```

5. **Start development server:**
   ```bash
   npm run dev
   ```

6. **Access the application:**
   - API: http://localhost:3000
   - Health check: http://localhost:3000/health
   - API Documentation: http://localhost:3000/docs

### Docker Development

1. **Start with Docker Compose:**
   ```bash
   npm run docker:up
   ```

2. **Stop services:**
   ```bash
   npm run docker:down
   ```

## Available Scripts

### Development
- `npm run dev` - Start development server
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run watch` - Watch TypeScript files for changes

### Testing
- `npm test` - Run all tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report

### Database
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run database migrations
- `npm run db:setup` - Generate client and run migrations
- `npm run db:seed` - Seed database with sample data

### Docker
- `npm run docker:up` - Start development environment with database
- `npm run docker:down` - Stop all containers

## CI/CD Pipeline

The project includes a GitHub Actions workflow that:

- ✅ **Tests on multiple Node.js versions** (18.x, 20.x)
- ✅ **Runs on every push and pull request**
- ✅ **Automated checks:**
  - Install dependencies
  - Generate Prisma client
  - Run linting (if configured)
  - Run test suite
  - Build application
  - Upload test coverage to Codecov

## API Documentation

For complete API documentation including all endpoints, authentication requirements, and usage examples, visit the interactive Swagger documentation:

- **Swagger UI**: `{baseUrl}/docs`
- **OpenAPI JSON**: `{baseUrl}/docs/json`

*In local development, you can use `http://localhost:3000/docs`*

The API includes:
- **Authentication endpoints** (registration, login)
- **User management** (profile management)
- **Expense management** (CRUD operations, user-specific)
- **Health check** endpoint

All expense endpoints require JWT authentication.

## Security Features

- **Password Requirements**: 8+ characters, uppercase, lowercase, number
- **JWT Authentication**: 7-day token expiration
- **Data Isolation**: Users can only access their own expenses
- **Password Hashing**: Bcrypt with salt rounds
- **Input Validation**: Email, password, and username validation

## Health Check

The application includes a health endpoint at `/health` that returns:

```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.456,
  "environment": "development"
}
```

## Project Structure

```
expense-svc/
├── src/
│   ├── app.ts                  # Fastify app configuration
│   ├── server.ts               # Server entry point
│   ├── routes/
│   │   ├── health.ts           # Health check routes
│   │   ├── users.ts            # User auth and profile routes
│   │   └── expenses.ts         # Authenticated expense CRUD routes
│   ├── repositories/
│   │   ├── userRepo.ts         # User database operations
│   │   └── expenseRepo.ts      # Expense database operations
│   └── utils/
│       ├── auth.ts             # JWT and validation utilities
│       └── middleware.ts       # Authentication middleware
├── prisma/
│   ├── schema.prisma           # Database schema (Users + Expenses)
│   ├── migrations/             # Database migrations
│   └── seed.ts                # Database seeding
├── tests/                      # Test suites
├── docker-compose.yml          # Docker services
├── Dockerfile                 # Container configuration
└── package.json               # Dependencies and scripts
```

## Environment Variables

- `NODE_ENV` - Environment (development, production, test)
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT token signing (required)
- `PORT` - Server port (default: 3000)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

ISC
