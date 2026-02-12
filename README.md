# FutTeam API ⚽

Backend API for the FutTeam management system. Built with Node.js, Express, Prisma, and PostgreSQL.

## Features

- **Authentication**: JWT-based login, registration, and Google OAuth.
- **Team Management**: Create teams, invite members, and manage roles (OWNER, ADMIN, MEMBER).
- **Match Management**: Schedule matches, record scores, and track locations.
- **Player Stats**: Track goals, hat-tricks, doubles, and attendance.
- **Caching**: Performance optimization using in-memory caching.
- **Error Tracking**: Integrated with Sentry for real-time error monitoring.

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT, Google OAuth
- **Logging**: Pino & Logtail
- **Monitoring**: Sentry
- **Validation**: Zod

## Getting Started

### Prerequisites

- Node.js (v18+)
- PostgreSQL database
- npm or yarn

### Installation

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   Copy `.env.example` to `.env` and fill in the required values (DATABASE_URL, JWT_SECRET, SENTRY_DSN, etc.).
4. Run Prisma migrations:
   ```bash
   npx prisma migrate dev
   ```
5. Seed the database (optional):
   ```bash
   npx prisma db seed
   ```

### Running the App

- **Development**:
  ```bash
  npm run dev
  ```
- **Production Build**:
  ```bash
  npm run build
  npm start
  ```

### Documentation

Once the app is running, you can access the Swagger documentation at:
`http://localhost:3333/api-docs`

## Project Structure

- `src/modules`: Domain-driven modules (Auth, Players, Matches, etc.)
- `src/lib`: Shared libraries (Prisma, Swagger, Cache)
- `src/middlewares`: Global and local middlewares (Auth, Error Handling, Request Logging)
- `prisma`: Database schema and migrations
