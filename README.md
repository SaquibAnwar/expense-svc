# Expense Sharing Service

A comprehensive RESTful API service for managing shared expenses and splitting costs among users, built with Fastify, TypeScript, and Prisma. A fully-featured backend for expense sharing and group cost management applications.

## 🚀 Features

### ✅ **Completed Features**

#### **User Authentication & Management**
- Email/password registration and login with validation
- JWT token-based authentication with secure middleware
- Secure password hashing with bcrypt
- User profiles with avatars, usernames, and contact information
- Account status management (active/inactive users)
- Extensible architecture for OAuth providers

#### **Expense Management**
- Personal expense tracking with full CRUD operations
- Create, read, update, delete expenses with validation
- User-specific expense access control (users can only access their own expenses)
- Expense descriptions and categorization
- Decimal precision for accurate financial calculations

#### **Technical Excellence**
- **Clean Architecture**: Proper separation of concerns with dedicated SQL query layer
- **TypeScript**: Complete type safety throughout the application
- **Prisma ORM**: Robust data management with PostgreSQL
- **Fastify**: High-performance web framework
- **Comprehensive Testing**: 97 tests with excellent coverage
- **Swagger/OpenAPI**: Complete API documentation with detailed schemas
- **Docker Support**: Containerization for development and deployment
- **Database Migrations**: Managed schema evolution and seeding capabilities

#### **Code Quality & Architecture**
- **Repository Pattern**: Business logic separated from data access
- **Query Separation**: Complex SQL queries isolated in dedicated query files
- **Middleware Architecture**: Secure authentication and request processing
- **Error Handling**: Comprehensive error responses and logging
- **Input Validation**: Email, password, and username validation
- **Security**: SQL injection protection, password hashing, data sanitization

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

## Password Requirements

- Minimum 8 characters
- At least one lowercase letter
- At least one uppercase letter  
- At least one number

## 📋 Available Scripts

### Development & Build
- `npm run dev` - Development server with auto-reload
- `npm run build` - TypeScript compilation
- `npm start` - Production server
- `npm run watch` - Watch mode for development

### Testing & Quality
- `npm test` - Run comprehensive test suite (97+ tests)
- `npm run test:watch` - Tests in watch mode
- `npm run test:coverage` - Generate coverage report
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

## 🧪 Testing

Comprehensive test suite with **97 tests** and excellent coverage:

### Test Categories
- **Repository Tests**: Data layer testing with Prisma ORM
- **Route Tests**: API endpoint testing with authentication
- **Utility Tests**: Helper functions and middleware testing
- **Integration Tests**: End-to-end workflow testing

### Test Structure
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

## 🗺️ Future Roadmap

### 🔄 **Next Priority Items**

1. **Group Management** - Create and manage expense-sharing groups
   - Role-based access control (Admin/Member roles)
   - Group member management with invitations
   - Group avatars, descriptions, and metadata

2. **Expense Splitting & Settlement** - Multi-type expense splitting
   - Equal, amount-based, and percentage-based splits
   - Individual settlement tracking: Calculate who owes whom
   - Group settlement optimization: Minimize transactions
   - Balance summaries and payment tracking

3. **Friend System & Social Features** - Social networking for easier group creation
   - Friend requests: Send, accept, decline, and cancel
   - Friend discovery: Search users with friendship status
   - Smart suggestions: AI-powered friend recommendations
   - Social insights: Mutual friends and network understanding

4. **Expense Categories & Analytics** - Advanced expense organization
   - Comprehensive categorization system (Food, Travel, Utilities, etc.)
   - Category management: Create, update, delete categories
   - Spending analytics: Category-wise summaries and trends
   - Top spending insights and comparative analysis

5. **OAuth Integration** - Streamlined authentication
   - Google, Facebook, and other social media sign-in options
   - Provider-based user management

6. **Notifications & Communication** - Real-time updates
   - Email and push notifications for expenses and settlements
   - Activity feeds and user updates

7. **Advanced Features** - Enhanced functionality
   - Receipt upload with OCR for automatic expense entry
   - Recurring expenses and bill management
   - Multi-currency support for international use
   - Advanced analytics and detailed spending reports

8. **Mobile & Export** - Extended platform support
   - React Native companion app for iOS and Android
   - PDF reports and CSV export for accounting

## 🏗️ Project Structure

```
expense-svc/
├── src/
│   ├── app.ts                    # Fastify app configuration
│   ├── server.ts                 # Server entry point
│   ├── routes/
│   │   ├── health.ts             # Health check endpoints
│   │   ├── users.ts              # User authentication & profiles
│   │   └── expenses.ts           # Expense CRUD operations
│   ├── repositories/
│   │   ├── userRepo.ts           # User database operations
│   │   └── expenseRepo.ts        # Expense database operations
│   ├── queries/
│   │   └── userQueries.ts        # Complex SQL queries
│   └── utils/
│       ├── auth.ts               # JWT utilities & validation
│       └── middleware.ts         # Authentication middleware
├── prisma/
│   ├── schema.prisma             # Complete database schema
│   ├── migrations/               # Database migrations
│   └── seed.ts                   # Database seeding
├── tests/                        # Comprehensive test suite (97 tests)
│   ├── repositories/             # Repository layer tests
│   ├── routes/                   # API endpoint tests
│   ├── utils/                    # Utility function tests
│   └── integration/              # Integration tests
├── scripts/                      # Utility scripts
├── docker-compose.yml            # Docker services
├── Dockerfile                    # Container configuration
└── package.json                  # Dependencies and scripts
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

Complete interactive API documentation with detailed schemas:

- **Swagger UI**: http://localhost:3000/docs
- **OpenAPI JSON**: http://localhost:3000/docs/json

Features:
- Complete request/response schemas
- Authentication requirements
- Example requests and responses
- Interactive testing interface
- Error response documentation

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes with tests
4. Ensure all tests pass (`npm test`)
5. Ensure code quality (`npm run lint && npm run format`)
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

## License

ISC - See LICENSE file for details

---

**Built with ❤️ using TypeScript, Fastify, Prisma, and PostgreSQL**
