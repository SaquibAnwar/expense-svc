# Expense Sharing Service

A comprehensive RESTful API service for managing shared expenses and splitting costs among users, built with Fastify, TypeScript, and Prisma. A fully-featured Splitwise-like backend with group management, role-based access control, and extensive testing.

## 🚀 Features

### ✅ **User Management & Authentication**
- Email/password registration and login with strong validation
- JWT token-based authentication with secure middleware
- Secure password hashing with bcrypt
- User profiles with avatars, usernames, and contact information
- Account status management (active/inactive users)
- Extensible architecture for OAuth providers

### ✅ **Group Management**
- Create and manage expense-sharing groups
- Role-based access control (Admin/Member roles)
- Group member management with email invitations
- Group avatars, descriptions, and metadata
- Administrative controls (only admins can add/remove members)
- Group deactivation and management

### ✅ **Expense Management**
- Personal and group expense tracking
- Create, read, update, delete expenses with comprehensive validation
- Link expenses to groups for shared cost tracking
- Recent expense tracking per group (last 10 expenses)
- Expense descriptions and categorization
- Decimal precision for accurate financial calculations

### ✅ **Technical Excellence**
- **TypeScript** for complete type safety
- **Prisma ORM** with PostgreSQL for robust data management
- **Fastify** web framework for high performance
- **Comprehensive Swagger/OpenAPI** documentation with detailed schemas
- **98.61% test coverage** with Jest and 112+ test cases
- **CI/CD pipeline** with GitHub Actions
- **Docker support** for development and deployment
- **Database migrations** and seeding capabilities

## 🏗️ Architecture & Database Schema

### **Users Table**
- Authentication (email/password, OAuth ready)
- Profile information (name, username, avatar, phone)
- Account status and provider tracking
- Relationships to groups and expenses

### **Groups Table**
- Group metadata (name, description, avatar)
- Creator tracking and timestamps
- Active/inactive status management
- Member and expense relationships

### **Group Members Table**
- User-Group relationship with roles (ADMIN/MEMBER)
- Join timestamps and role management
- Cascade deletion for data integrity

### **Expenses Table**
- Personal and group expense support
- Financial precision with Decimal type
- User and optional group relationships
- Comprehensive expense metadata

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 15+
- Docker and Docker Compose (optional)

### Local Development

1. **Clone and setup:**
   ```bash
   git clone <repository-url>
   cd expense-svc
   npm install
   ```

2. **Environment configuration:**
   ```bash
   # Create .env file:
   DATABASE_URL="postgresql://expense_user:expense_pass@localhost:5432/expense_db"
   JWT_SECRET="your-super-secure-secret-key-here"
   NODE_ENV="development"
   PORT=3000
   ```

3. **Database setup:**
   ```bash
   # Start PostgreSQL database
   docker-compose up -d db
   
   # Run migrations
   npx prisma migrate deploy
   
   # Optional: Seed with sample data
   npm run db:seed
   ```

4. **Start development:**
   ```bash
   npm run dev
   ```

5. **Access services:**
   - **API**: http://localhost:3000
   - **Health Check**: http://localhost:3000/health
   - **Swagger Documentation**: http://localhost:3000/docs
   - **API Schema**: http://localhost:3000/docs/json

### Docker Development

```bash
# Start full development environment
docker-compose up

# Start only database
docker-compose up -d db

# Stop all services
docker-compose down
```

## 📋 Available Scripts

### Development & Build
- `npm run dev` - Development server with auto-reload
- `npm run build` - TypeScript compilation
- `npm start` - Production server
- `npm run watch` - Watch mode for development

### Testing & Quality
- `npm test` - Run comprehensive test suite (112+ tests)
- `npm run test:watch` - Tests in watch mode
- `npm run test:coverage` - Generate coverage report (98.61%)
- `npm run test:setup` - Setup test database
- `npm run lint` - ESLint code analysis
- `npm run format` - Prettier code formatting

### Database Management
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Create and apply migrations
- `npm run db:setup` - Setup database (generate + migrate)
- `npm run db:seed` - Seed with sample data
- `npm run db:reset` - Reset database

### Docker Operations
- `npm run docker:up` - Start development with database
- `npm run docker:down` - Stop all containers

## 🔐 Security & Validation

### Password Requirements
- Minimum 8 characters
- At least one lowercase letter
- At least one uppercase letter  
- At least one number
- Maximum 128 characters

### Security Features
- **Bcrypt password hashing** with salt rounds
- **JWT token authentication** with expiration
- **Input validation** for all endpoints
- **SQL injection protection** via Prisma ORM
- **XSS protection** with data sanitization
- **Rate limiting ready** architecture
- **CORS configuration** for cross-origin requests

## 📚 API Endpoints

### Authentication & Users
- `POST /api/v1/users/register` - User registration
- `POST /api/v1/users/login` - User authentication
- `GET /api/v1/users/profile` - Get user profile
- `PUT /api/v1/users/profile` - Update user profile

### Group Management
- `GET /api/v1/groups` - List user's groups
- `POST /api/v1/groups` - Create new group
- `GET /api/v1/groups/{id}` - Get group details (members only)
- `PUT /api/v1/groups/{id}` - Update group (admins only)
- `POST /api/v1/groups/{id}/members` - Add group member (admins only)
- `DELETE /api/v1/groups/{id}/members/{userId}` - Remove member
- `PUT /api/v1/groups/{id}/members/{userId}/role` - Update member role

### Expense Management
- `GET /api/v1/expenses` - List user expenses
- `POST /api/v1/expenses` - Create expense (personal or group)
- `GET /api/v1/expenses/{id}` - Get expense details
- `PUT /api/v1/expenses/{id}` - Update expense
- `DELETE /api/v1/expenses/{id}` - Delete expense

### System Health
- `GET /health` - Basic health check
- `GET /health/ready` - Readiness probe

## 🧪 Testing

Comprehensive test suite with **98.61% code coverage**:

- **Unit Tests**: Repository, utility, and middleware functions
- **Integration Tests**: API endpoints and database operations
- **Route Tests**: Complete API workflow testing
- **Authentication Tests**: JWT and security validation
- **Database Tests**: Prisma operations and constraints

### Test Categories
- `tests/repositories/` - Data layer tests
- `tests/routes/` - API endpoint tests
- `tests/utils/` - Utility function tests
- `tests/integration/` - End-to-end tests

### Running Tests
```bash
npm test                    # Full test suite
npm run test:coverage      # With coverage report
npm run test:watch         # Watch mode
```

## 🏗️ Project Structure

```
expense-svc/
├── src/
│   ├── app.ts                    # Fastify app configuration
│   ├── server.ts                 # Server entry point
│   ├── routes/
│   │   ├── health.ts             # Health check endpoints
│   │   ├── users.ts              # User authentication & profiles
│   │   ├── expenses.ts           # Expense CRUD operations
│   │   └── groups.ts             # Group management (NEW)
│   ├── repositories/
│   │   ├── userRepo.ts           # User database operations
│   │   ├── expenseRepo.ts        # Expense database operations
│   │   └── groupRepo.ts          # Group database operations (NEW)
│   └── utils/
│       ├── auth.ts               # JWT utilities & validation
│       └── middleware.ts         # Authentication middleware
├── prisma/
│   ├── schema.prisma             # Complete database schema
│   ├── migrations/               # Database migrations
│   └── seed.ts                   # Database seeding
├── tests/                        # Comprehensive test suite
│   ├── repositories/             # Repository layer tests
│   ├── routes/                   # API endpoint tests
│   ├── utils/                    # Utility function tests
│   └── integration/              # Integration tests
├── docs/                         # Documentation
├── scripts/                      # Utility scripts
├── .github/workflows/            # CI/CD configuration
├── docker-compose.yml            # Docker services
├── Dockerfile                    # Container configuration
└── package.json                  # Dependencies and scripts
```

## 🌐 Environment Variables

### Required
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT token signing

### Optional
- `NODE_ENV` - Environment (development, production, test)
- `PORT` - Server port (default: 3000)

### Example Configuration
```bash
DATABASE_URL="postgresql://expense_user:expense_pass@localhost:5432/expense_db"
JWT_SECRET="your-super-secure-secret-key-here"
NODE_ENV="development"
PORT=3000
```

## 📖 API Documentation

Interactive API documentation with complete schemas:

- **Swagger UI**: http://localhost:3000/docs
- **OpenAPI JSON**: http://localhost:3000/docs/json

Features:
- Complete request/response schemas
- Authentication requirements
- Example requests and responses  
- Interactive testing interface
- Error response documentation

## 🚀 CI/CD Pipeline

Automated testing and validation with GitHub Actions:

- **Code Quality**: ESLint and Prettier checks
- **Testing**: Comprehensive test suite with PostgreSQL
- **Coverage**: 98.61% code coverage validation
- **Database**: Automated migration testing
- **Docker**: Container build verification

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes with tests
4. Ensure all tests pass (`npm test`)
5. Ensure code quality (`npm run lint && npm run format`)
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

## 📄 License

ISC - See LICENSE file for details

---

**Built with ❤️ using TypeScript, Fastify, Prisma, and PostgreSQL**
