# Expense Service API

A RESTful API service for managing expenses built with Fastify, TypeScript, and Prisma.

## Features

- ✅ RESTful API with CRUD operations for expenses
- ✅ TypeScript for type safety
- ✅ Prisma ORM for database management
- ✅ PostgreSQL database
- ✅ Swagger/OpenAPI documentation
- ✅ Auto-reload during development

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database
- Docker (optional, for database)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your database connection details
   ```

4. Start PostgreSQL (using Docker):
   ```bash
   docker-compose up -d
   ```

5. Set up the database:
   ```bash
   npm run db:setup
   ```

### Development

Start the development server:
```bash
npm run dev
```

The API will be available at:
- **API**: http://localhost:3000/v1/expenses
- **Swagger Docs**: http://localhost:3000/docs

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/expenses` | Get all expenses |
| POST | `/v1/expenses` | Create a new expense |
| PATCH | `/v1/expenses/:id` | Update an expense |
| DELETE | `/v1/expenses/:id` | Delete an expense |

### Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build the project
- `npm run start` - Start production server
- `npm run db:setup` - Set up database (generate Prisma client + run migrations)
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run database migrations

## Project Structure

```
src/
├── app.ts              # Main application file
├── plugins/            # Fastify plugins
│   ├── sensible.ts     # HTTP error utilities
│   └── swagger.ts      # API documentation
├── repositories/       # Data access layer
│   └── expenseRepo.ts  # Expense repository
└── routes/             # API routes
    └── v1/
        └── expenses/   # Expense endpoints
            └── index.ts
```

## Learn More

To learn Fastify, check out the [Fastify documentation](https://fastify.dev/docs/latest/).
