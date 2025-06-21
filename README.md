# Expense Service

A RESTful API service for managing expenses built with Fastify, TypeScript, and Prisma.

## Features

- ✅ RESTful API endpoints for expense management
- ✅ TypeScript for type safety
- ✅ Prisma ORM for database operations
- ✅ Fastify web framework for high performance
- ✅ Swagger/OpenAPI documentation
- ✅ Comprehensive test suite with Jest
- ✅ Docker support for containerization
- ✅ CI/CD pipeline with GitHub Actions

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
   cp .env.example .env
   # Edit .env with your database configuration
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

The API includes interactive documentation powered by Swagger/OpenAPI:

- **Swagger UI**: http://localhost:3000/docs
- **OpenAPI JSON**: http://localhost:3000/docs/json

## API Endpoints

### Health
- `GET /health` - Health check endpoint

### Expenses
- `GET /api/v1/expenses` - Get all expenses
- `POST /api/v1/expenses` - Create new expense
- `GET /api/v1/expenses/:id` - Get expense by ID
- `PATCH /api/v1/expenses/:id` - Update expense (partial)
- `DELETE /api/v1/expenses/:id` - Delete expense

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
│   ├── app.ts              # Fastify app configuration
│   ├── server.ts           # Server entry point
│   ├── routes/
│   │   ├── health.ts       # Health check routes
│   │   └── expenses.ts     # Expense CRUD routes
│   └── repositories/
│       └── expenseRepo.ts  # Database operations
├── prisma/
│   ├── schema.prisma       # Database schema
│   ├── migrations/         # Database migrations
│   └── seed.ts            # Database seeding
├── tests/
│   ├── integration/        # Integration tests
│   ├── repositories/       # Repository tests
│   └── setup.ts           # Test configuration
├── docker-compose.yml      # Docker services
├── Dockerfile             # Container configuration
└── package.json           # Dependencies and scripts
```

## Environment Variables

- `NODE_ENV` - Environment (development, production, test)
- `DATABASE_URL` - PostgreSQL connection string
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
