# Expense Sharing Service

A RESTful API service for managing shared expenses and splitting costs among users, built with Fastify, TypeScript, and Prisma. Designed for building expense sharing and group cost management applications.

## Features

- ✅ **User Authentication System**
  - Email/password registration and login
  - JWT token-based authentication
  - Secure password hashing with bcrypt
  - Extensible for OAuth providers (Google, Facebook, etc.)
- ✅ **User Management**
  - User profiles with avatars and contact info
  - Public and private user profiles
  - Account status management
- ✅ **Expense Management**
  - Create, read, update, delete expenses
  - Link expenses to users
  - Expense categorization and tracking
- ✅ **Technical Features**
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
   npm start
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

## Password Requirements

- Minimum 8 characters
- At least one lowercase letter
- At least one uppercase letter  
- At least one number

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

## Database Schema

### Users
- Authentication (email/password, OAuth ready)
- Profile information (name, username, avatar, phone)
- Account status and timestamps
- Provider tracking for future OAuth integration

### Expenses
- Basic expense tracking linked to users
- Amount, title, and date tracking
- Ready for expansion to support splitting

## Future Roadmap (Expense Sharing Features)

- 🔄 **Groups/Parties** - Create groups for shared expenses
- 🔄 **Expense Splitting** - Split expenses equally, by amount, or percentage
- 🔄 **Settlement Tracking** - Calculate who owes whom
- 🔄 **Friend System** - Add friends for easier group creation
- 🔄 **Categories** - Categorize expenses (food, travel, utilities)
- 🔄 **OAuth Integration** - Google, Facebook sign-in
- 🔄 **Notifications** - Email/push notifications for expenses and settlements

## Project Structure

```
expense-svc/
├── src/
│   ├── app.ts                  # Fastify app configuration
│   ├── server.ts               # Server entry point
│   ├── routes/
│   │   ├── health.ts           # Health check routes
│   │   ├── users.ts            # User auth and profile routes
│   │   └── expenses.ts         # Expense CRUD routes
│   ├── repositories/
│   │   ├── userRepo.ts         # User database operations
│   │   └── expenseRepo.ts      # Expense database operations
│   └── utils/
│       └── auth.ts             # JWT and validation utilities
├── prisma/
│   ├── schema.prisma           # Database schema
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
- `JWT_SECRET` - Secret key for JWT token signing
- `PORT` - Server port (default: 3000)

## Security Features

- **Password Hashing** - Bcrypt with salt rounds
- **JWT Authentication** - Secure token-based auth
- **Input Validation** - Email, password, and username validation
- **SQL Injection Protection** - Prisma ORM parameterized queries
- **Data Sanitization** - Safe user data responses (no password exposure)

## API Documentation

The API includes interactive documentation powered by Swagger/OpenAPI:

- **Swagger UI**: http://localhost:3000/docs
- **OpenAPI JSON**: http://localhost:3000/docs/json

All endpoints are documented with:
- Request/response schemas
- Authentication requirements
- Example requests and responses
- Error handling

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

ISC
