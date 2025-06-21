# Expense Service

A RESTful API service for managing expenses built with Fastify, TypeScript, and Prisma.

## Features

- ✅ RESTful API endpoints for expense management
- ✅ TypeScript for type safety
- ✅ Prisma ORM for database operations
- ✅ Fastify web framework for high performance
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

4. **Start development server:**
   ```bash
   npm run dev
   ```

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
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server

### Testing
- `npm test` - Run all tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report

### Database
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run database migrations
- `npm run db:setup` - Generate client and run migrations

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
  - Run test suite
  - Build application
  - Upload test coverage to Codecov

## API Endpoints

- `GET /health` - Health check endpoint
- `GET /v1/expenses` - Get all expenses
- `POST /v1/expenses` - Create new expense
- `GET /v1/expenses/:id` - Get expense by ID
- `PUT /v1/expenses/:id` - Update expense
- `DELETE /v1/expenses/:id` - Delete expense

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
