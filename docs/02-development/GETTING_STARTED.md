# Getting Started with HRC Kitchen

This guide will help you set up and run the HRC Kitchen application for development.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18+ LTS ([Download](https://nodejs.org/))
- **PostgreSQL** 14+ ([Download](https://www.postgresql.org/download/))
- **npm** 9+ (comes with Node.js)
- **Git** ([Download](https://git-scm.com/))
- **Stripe Account** (for payment processing - [Sign up](https://stripe.com/))

### Optional (for Docker setup)
- **Docker Desktop** ([Download](https://www.docker.com/products/docker-desktop/))
- **Docker Compose** (included with Docker Desktop)

## Quick Start (Local Development)

### 1. Clone the Repository

```bash
cd hrc-kitchen
```

### 2. Install Dependencies

```bash
npm install
```

This will install dependencies for both backend and frontend workspaces.

### 3. Set Up PostgreSQL Database

#### Option A: Using Docker (Recommended)

```bash
docker run --name hrc-kitchen-db \
  -e POSTGRES_USER=hrc_kitchen \
  -e POSTGRES_PASSWORD=hrc_kitchen_password \
  -e POSTGRES_DB=hrc_kitchen \
  -p 5432:5432 \
  -d postgres:14-alpine
```

#### Option B: Using Local PostgreSQL

Create a new database:

```sql
CREATE DATABASE hrc_kitchen;
CREATE USER hrc_kitchen WITH PASSWORD 'hrc_kitchen_password';
GRANT ALL PRIVILEGES ON DATABASE hrc_kitchen TO hrc_kitchen;
```

### 4. Configure Environment Variables

#### Backend Configuration

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` and update the following:

```env
DATABASE_URL="postgresql://hrc_kitchen:hrc_kitchen_password@localhost:5432/hrc_kitchen?schema=public"
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
EMAIL_PASSWORD=your-sendgrid-api-key
```

#### Frontend Configuration

```bash
cd ../frontend
cp .env.example .env
```

Edit `frontend/.env` and update:

```env
VITE_API_URL=http://localhost:3000/api/v1
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key
```

### 5. Set Up Database Schema

```bash
cd ../backend
npm run db:generate  # Generate Prisma Client
npm run db:migrate   # Run migrations
npm run db:seed      # Seed initial data
```

### 6. Start Development Servers

From the root directory:

```bash
npm run dev
```

This will start both backend and frontend servers concurrently.

- **Backend API**: http://localhost:3000
- **Frontend App**: http://localhost:5173

### 7. Access the Application

Open your browser and navigate to:

```
http://localhost:5173
```

## Quick Start (Docker)

### 1. Configure Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` and add your Stripe keys:

```env
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key
JWT_SECRET=your-super-secret-jwt-key
```

### 2. Start All Services

```bash
docker-compose up -d
```

### 3. Run Database Migrations

```bash
docker-compose exec backend npm run db:migrate
docker-compose exec backend npm run db:seed
```

### 4. Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **Database**: localhost:5432

## Test Credentials

After seeding the database, you can log in with these test accounts:

### Administrator Account
- **Email**: admin@hrc-kitchen.com
- **Password**: Admin123!
- **Role**: ADMIN

### Kitchen Staff Account
- **Email**: kitchen@hrc-kitchen.com
- **Password**: Kitchen123!
- **Role**: KITCHEN

### Staff Account
- **Email**: staff@hrc-kitchen.com
- **Password**: Staff123!
- **Role**: STAFF

## Getting Stripe Test Keys

1. Sign up for a free Stripe account at https://stripe.com/
2. Navigate to **Developers** → **API keys**
3. Copy your **Publishable key** (starts with `pk_test_`)
4. Copy your **Secret key** (starts with `sk_test_`)
5. For webhooks:
   - Go to **Developers** → **Webhooks**
   - Click **Add endpoint**
   - Enter URL: `http://localhost:3000/api/v1/payment/webhook`
   - Select events: `payment_intent.succeeded`, `payment_intent.payment_failed`
   - Copy the **Signing secret** (starts with `whsec_`)

## Useful Commands

### Backend Commands

```bash
cd backend

# Development
npm run dev              # Start dev server with hot reload
npm run build            # Build for production
npm start                # Start production server

# Database
npm run db:migrate       # Run database migrations
npm run db:seed          # Seed database with test data
npm run db:studio        # Open Prisma Studio (database GUI)
npm run db:generate      # Generate Prisma Client

# Code Quality
npm run lint             # Lint code
npm run format           # Format code with Prettier
npm test                 # Run tests
```

### Frontend Commands

```bash
cd frontend

# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run preview          # Preview production build

# Code Quality
npm run lint             # Lint code
npm run format           # Format code with Prettier
```

### Docker Commands

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f

# Rebuild containers
docker-compose up -d --build

# Stop and remove all containers, networks, and volumes
docker-compose down -v
```

## Troubleshooting

### Database Connection Issues

If you see `ECONNREFUSED` errors:

1. Ensure PostgreSQL is running:
   ```bash
   # Docker
   docker ps | grep postgres

   # Local (Windows)
   sc query postgresql-x64-14

   # Local (Mac)
   brew services list | grep postgresql
   ```

2. Verify database credentials in `backend/.env`

3. Test connection:
   ```bash
   cd backend
   npx prisma studio
   ```

### Port Already in Use

If ports 3000 or 5173 are already in use:

1. Find and kill the process:
   ```bash
   # Windows
   netstat -ano | findstr :3000
   taskkill /PID <PID> /F

   # Mac/Linux
   lsof -ti:3000 | xargs kill -9
   ```

2. Or change the port in configuration files

### Stripe Webhook Testing

For local webhook testing, use Stripe CLI:

```bash
# Install Stripe CLI
# https://stripe.com/docs/stripe-cli

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/v1/payment/webhook
```

### Build Errors

If you encounter build errors:

1. Clear node_modules and reinstall:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. Clear Prisma client:
   ```bash
   cd backend
   rm -rf node_modules/.prisma
   npm run db:generate
   ```

## Next Steps

- Review the [Product Requirements Document](./PRD.md)
- Check the [Backend README](./backend/README.md)
- Check the [Frontend README](./frontend/README.md)
- Start implementing features from Phase 1 MVP

## Need Help?

- Check the documentation in the `docs/` folder
- Review the PRD for feature requirements
- Check GitHub Issues for known problems

## Development Workflow

1. Create a new branch for your feature
2. Make changes and test locally
3. Run linting and formatting
4. Commit changes with descriptive messages
5. Push to remote and create pull request
6. Wait for code review and CI/CD checks

Happy coding!
