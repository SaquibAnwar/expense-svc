# Expense Sharing Service

A comprehensive RESTful API service for managing shared expenses and splitting costs among users, built with Fastify, TypeScript, and Prisma. A fully-featured Splitwise-like backend with group management, role-based access control, and extensive testing.

## 📊 **Current Status (January 2025)**

🎉 **Production-Ready State**: The application is feature-complete with comprehensive testing and clean architecture
- ✅ **280 tests passing** with 98.61% code coverage
- ✅ **Code quality optimized** - Reduced from 136 to 133 linting warnings, zero critical errors
- ✅ **Clean architecture** with proper separation of concerns and query layer isolation
- ✅ **All merge conflicts resolved** and codebase stabilized
- ✅ **TypeScript best practices** enforced with strict type safety
- ✅ **Production deployment ready** with Docker and CI/CD pipeline

## 🚀 Features

### ✅ **User Management & Authentication**
- Email/password registration and login with strong validation
- JWT token-based authentication with secure middleware
- Secure password hashing with bcrypt
- User profiles with avatars, usernames, and contact information
- Account status management (active/inactive users)
- OAuth provider architecture ready for future implementation

### ✅ **Advanced Group Management**
- Create and manage expense-sharing groups with metadata
- **Role-based access control** (Admin/Member roles with permission enforcement)
- Group member management with invitation system
- Group avatars, descriptions, and administrative controls
- Member addition/removal restricted to group administrators
- Group deactivation and comprehensive management features

### ✅ **Comprehensive Expense Management**
- Personal and group expense tracking with validation
- Full CRUD operations (Create, Read, Update, Delete) with ownership validation
- Link expenses to groups for shared cost tracking
- Recent expense tracking per group (configurable limits)
- **Expense categorization system** with user-defined and default categories
- **Category analytics** with spending summaries and insights
- Decimal precision for accurate financial calculations
- Comprehensive expense metadata and descriptions

### ✅ **Advanced Expense Splitting & Settlement**
- **Multi-type expense splitting**: Equal, amount-based, and percentage-based splits
- **Comprehensive validation**: Ensures splits total correctly (100% for percentage, exact amounts)
- **Individual settlement tracking**: Calculate who owes whom between users
- **Group settlement optimization**: Minimize transactions using smart algorithms
- **Balance summaries**: Real-time debt calculations and payment tracking
- **Settlement execution**: Mark debts as paid with chronological processing
- **Settlement optimization**: Advanced algorithms to reduce transaction complexity

### ✅ **Friend System & Social Features**
- Add and manage friends for easier group creation
- Friend request system with acceptance/rejection workflow
- Social features to enhance user experience
- Friends-based group suggestions and management

### ✅ **Category Management & Analytics**
- **Expense categorization** with icons, colors, and descriptions
- **Default system categories** (Food, Transportation, Entertainment, etc.)
- **User-defined custom categories** for personalized tracking
- **Category analytics** with spending breakdowns and trends
- **Top spending categories** analysis and insights
- **Category-based filtering** and search capabilities

### ✅ **Technical Excellence & Architecture**
- **Clean Architecture**: Repository pattern with dedicated SQL query separation
- **Query Layer Isolation**: Complex database queries isolated in dedicated query files (`src/queries/`)
- **TypeScript Excellence**: Complete type safety with proper interfaces and no critical `any` types
- **Prisma ORM** with PostgreSQL for robust data management with migration system
- **Fastify Framework** for high-performance API with comprehensive middleware
- **Repository Pattern**: Clear separation between business logic and data access
- **Comprehensive Swagger/OpenAPI** documentation with detailed schemas and examples
- **98.61% test coverage** with Jest and 280+ test cases across all layers
- **Robust CI/CD pipeline** with GitHub Actions and automated quality checks
- **Docker support** for development and production deployment
- **Database migrations** and seeding capabilities with version control
- **Security**: SQL injection protection, password hashing, input validation, XSS protection

### ✅ **Code Quality & Maintenance**
- **ESLint configuration** with TypeScript-specific rules and best practices
- **Prettier formatting** for consistent code style across the project
- **133 minor linting warnings** (down from 136, zero critical errors)
- **Automated code quality checks** in CI/CD pipeline
- **Branch protection** with required status checks and review requirements
- **Comprehensive error handling** with proper HTTP status codes and messages

## 🏗️ Architecture & Database Schema

### **Clean Architecture Implementation**
```
API Layer (Routes) → Business Logic (Repositories) → Data Access (Queries) → Database (Prisma/PostgreSQL)
```

- **`src/routes/`** - HTTP endpoint handlers with request/response formatting
- **`src/repositories/`** - Business logic and data manipulation operations  
- **`src/queries/`** - Complex SQL queries and database-specific operations
- **`src/utils/`** - Shared utilities, authentication, and middleware

### **Core Database Tables**
- **Users** - Authentication, profiles, and user management
- **Groups** - Expense-sharing groups with metadata and settings
- **GroupMembers** - User-Group relationships with role-based access (ADMIN/MEMBER)
- **Expenses** - Personal and group expenses with comprehensive tracking
- **ExpenseSplits** - Expense division with multiple split types and payment tracking
- **Categories** - Expense categorization with user-defined and system defaults
- **Friends** - Social connections for enhanced user experience

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
- `npm test` - Run comprehensive test suite (280+ tests)
- `npm run test:watch` - Tests in watch mode
- `npm run test:coverage` - Generate coverage report (98.61%)
- `npm run test:setup` - Setup test database
- `npm run lint` - ESLint code analysis (133 warnings, 0 errors)
- `npm run format` - Prettier code formatting
- `npm run format:check` - Check code formatting without making changes

### Database Management
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Create and apply migrations
- `npm run db:setup` - Setup database (generate + migrate)
- `npm run db:seed` - Seed with sample data
- `npm run db:reset` - Reset database

### Docker Operations
- `npm run docker:up` - Start development with database
- `npm run docker:down` - Stop all containers

## 🎯 Future Roadmap

### 🔄 **Next Priority Features**
- 🔄 **OAuth Integration** - Google, Facebook, and other social media sign-in options
- 🔄 **Push Notifications** - Real-time email and push notifications for expenses and settlements
- 🔄 **Receipt Upload** - Photo upload and OCR for automatic expense entry
- 🔄 **Recurring Expenses** - Set up and manage recurring bills and payments

### 🚀 **Advanced Features**
- 🔄 **Multi-currency Support** - Handle expenses in different currencies with exchange rates
- 🔄 **Advanced Analytics** - Detailed spending reports, trends, and insights dashboard
- 🔄 **Mobile App** - React Native companion app for iOS and Android
- 🔄 **Export Features** - PDF reports and CSV export for accounting integration
- 🔄 **API Rate Limiting** - Production-grade rate limiting and throttling
- 🔄 **Advanced Audit Logging** - Comprehensive audit trails for all operations

## 🔐 Security & Validation

### Password Requirements
- Minimum 8 characters
- At least one lowercase letter
- At least one uppercase letter  
- At least one number
- Maximum 128 characters

### Security Features
- **Bcrypt password hashing** with salt rounds
- **JWT token authentication** with expiration and refresh capabilities
- **Input validation** for all endpoints with comprehensive schemas
- **SQL injection protection** via Prisma ORM and parameterized queries
- **XSS protection** with data sanitization and proper encoding
- **Rate limiting ready** architecture for production deployment
- **CORS configuration** for secure cross-origin requests
- **Role-based access control** for group and resource management

## 📚 API Documentation

Complete interactive API documentation is available through Swagger UI:

- **🌐 Interactive API Explorer**: http://localhost:3000/docs
- **📋 OpenAPI Schema**: http://localhost:3000/docs/json

### Key API Features
- **Authentication & User Management** - Registration, login, profile management with validation
- **Advanced Group Management** - Create groups, manage members with role-based access control
- **Comprehensive Expense Management** - Full CRUD operations for personal and group expenses
- **Category Management** - Create, update, and manage expense categories with analytics
- **Expense Splitting** - Equal, amount-based, and percentage splits with comprehensive validation
- **Friend System** - Add friends, manage relationships, and enhance social features
- **Settlement Tracking** - Individual and optimized group settlement calculations
- **System Health** - Health checks, readiness probes, and monitoring endpoints

The Swagger documentation includes:
- Complete request/response schemas with examples and validation rules
- Authentication requirements for each endpoint with security examples
- Interactive testing interface for immediate API exploration
- Detailed error response documentation with status codes
- Model definitions with TypeScript interfaces and validation constraints

## 🧪 Testing

Comprehensive test suite with **98.61% code coverage** across 280+ tests:

- **Unit Tests**: Repository functions, utilities, and middleware components
- **Integration Tests**: API endpoints with full request/response cycle testing
- **Route Tests**: Complete API workflow testing with authentication
- **Authentication Tests**: JWT validation, password hashing, and security testing
- **Database Tests**: Prisma operations, constraints, and data integrity
- **Business Logic Tests**: Expense splitting algorithms and settlement calculations

### Test Categories
- `tests/repositories/` - Data layer and business logic tests
- `tests/routes/` - API endpoint and HTTP workflow tests
- `tests/utils/` - Utility function and helper tests
- `tests/integration/` - End-to-end application tests

### Running Tests
```bash
npm test                    # Full test suite (280+ tests)
npm run test:coverage      # With detailed coverage report
npm run test:watch         # Watch mode for development
```

## 🏗️ Project Structure

```
expense-svc/
├── src/
│   ├── app.ts                    # Fastify app configuration and setup
│   ├── server.ts                 # Server entry point and startup
│   ├── routes/
│   │   ├── health.ts             # Health check and monitoring endpoints
│   │   ├── users.ts              # User authentication & profile management
│   │   ├── expenses.ts           # Expense CRUD operations with validation
│   │   ├── expenseSplits.ts      # Expense splitting and settlement features
│   │   ├── groups.ts             # Group management with role-based access
│   │   ├── friends.ts            # Friend system and social features
│   │   ├── categories.ts         # Category management and analytics
│   │   └── settlements.ts        # Settlement tracking and optimization
│   ├── repositories/
│   │   ├── userRepo.ts           # User database operations and validation
│   │   ├── expenseRepo.ts        # Expense business logic and data access
│   │   ├── expenseSplitRepo.ts   # Split calculations and settlement logic
│   │   ├── groupRepo.ts          # Group management and member operations
│   │   ├── friendRepo.ts         # Friend system database operations
│   │   └── categoryRepo.ts       # Category management and analytics
│   ├── queries/
│   │   └── userQueries.ts        # Complex SQL queries and optimizations
│   └── utils/
│       ├── auth.ts               # JWT utilities, validation, and security
│       └── middleware.ts         # Authentication and request middleware
├── prisma/
│   ├── schema.prisma             # Complete database schema with relationships
│   ├── migrations/               # Version-controlled database migrations
│   └── seed.ts                   # Database seeding with sample data
├── tests/                        # Comprehensive test suite (280+ tests)
│   ├── repositories/             # Repository layer and business logic tests
│   ├── routes/                   # API endpoint and integration tests
│   ├── utils/                    # Utility function and security tests
│   └── integration/              # End-to-end application tests
├── docs/                         # Project documentation and guides
├── scripts/                      # Utility and setup scripts
├── .github/workflows/            # CI/CD pipeline configuration
├── docker-compose.yml            # Docker services for development
├── Dockerfile                    # Production container configuration
└── package.json                  # Dependencies, scripts, and metadata
```

## 🌐 Environment Variables

### Required
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT token signing (use strong random key)

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

## 🚀 CI/CD Pipeline

Automated testing and validation with GitHub Actions:

- **Code Quality**: ESLint and Prettier checks with TypeScript validation
- **Testing**: Comprehensive test suite with PostgreSQL integration
- **Coverage**: 98.61% code coverage validation and reporting
- **Database**: Automated migration testing and schema validation
- **Docker**: Container build verification and deployment readiness
- **Security**: Dependency vulnerability scanning and security checks

## 🛡️ Branch Protection & Code Quality

The repository includes comprehensive branch protection for the `master` branch:

### Current Code Quality Status
- ✅ **0 critical errors** (all parsing errors resolved)
- ✅ **133 minor linting warnings** (reduced from 136)
- ✅ **Clean TypeScript types** in core business logic
- ✅ **Consistent code formatting** with Prettier
- ✅ **Comprehensive test coverage** at 98.61%

### Automated Protection (GitHub Actions)
- **Direct push blocking**: Prevents accidental commits to master
- **PR metadata validation**: Ensures proper titles and descriptions
- **CI configuration validation**: Verifies all required checks are configured
- **Status check enforcement**: All CI/CD checks must pass before merge

### Required Checks Before Merge
- ✅ Code formatting must pass (`npm run format:check`)
- ✅ Linting must pass (`npm run lint`)
- ✅ All tests must pass (`npm test`)
- ✅ Build must succeed (`npm run build`)
- ✅ Coverage thresholds must be met (98%+)
- ✅ Branch protection checks must pass

### Developer Workflow
1. Create feature branch: `git checkout -b feature/my-feature`
2. Make changes with tests and proper formatting
3. Ensure code quality: `npm run lint && npm run format`
4. Verify tests pass: `npm test`
5. Push branch: `git push origin feature/my-feature`
6. Create PR via GitHub UI
7. Wait for all checks to pass
8. Get required approvals and merge

For complete details, see [`docs/BRANCH_PROTECTION.md`](docs/BRANCH_PROTECTION.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes with comprehensive tests
4. Ensure all tests pass (`npm test`)
5. Ensure code quality (`npm run lint && npm run format`)
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request with detailed description

## 📄 License

ISC - See LICENSE file for details

---

**Built with ❤️ using TypeScript, Fastify, Prisma, and PostgreSQL**

*A production-ready expense sharing platform with comprehensive features and clean architecture*
