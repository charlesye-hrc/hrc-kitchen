# HRC Kitchen - Deployment Guide

**Version:** 1.0
**Last Updated:** November 12, 2025

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Prerequisites](#2-prerequisites)
3. [Environment Configuration](#3-environment-configuration)
4. [Backend Deployment](#4-backend-deployment)
5. [Frontend Deployments](#5-frontend-deployments)
6. [Database Setup](#6-database-setup)
7. [Domain Configuration](#7-domain-configuration)
8. [Post-Deployment Verification](#8-post-deployment-verification)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Architecture Overview

The HRC Kitchen system consists of **three separate deployable units**:

### Production Architecture

```
┌─────────────────────────────────────┐
│   Public Ordering App (Frontend)    │
│   Domain: order.hrc-kitchen.com     │
│   Port: 5173 (dev) / 80,443 (prod)  │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│      Backend API (Node.js)          │
│   Domain: api.hrc-kitchen.com       │
│   Port: 3000 (dev) / 80,443 (prod)  │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│   PostgreSQL Database (Neon)        │
│   Cloud-hosted                       │
└─────────────────────────────────────┘
               ▲
               │
┌──────────────┴──────────────────────┐
│  Internal Management App (Frontend) │
│  Domain: manage.hrc-kitchen.com     │
│  Port: 5174 (dev) / 80,443 (prod)   │
└─────────────────────────────────────┘
```

### Component Responsibilities

**Backend API:**
- Authentication & Authorization
- Domain validation
- Order processing
- Stripe payment integration
- Database operations

**Public Ordering App (frontend-public):**
- Customer-facing interface
- Menu browsing
- Guest checkout
- User registration
- Order placement

**Internal Management App (frontend-admin):**
- Domain-restricted access
- Kitchen Dashboard
- Admin Panel
- Finance Reports

---

## 2. Prerequisites

### Required Services

1. **Hosting Platform** (choose one):
   - Vercel (recommended for frontends)
   - Netlify
   - AWS (EC2/ECS)
   - DigitalOcean
   - Heroku

2. **PostgreSQL Database**:
   - Neon (currently used, recommended)
   - AWS RDS
   - Heroku Postgres
   - Self-hosted

3. **Domain Names**:
   - `api.hrc-kitchen.com` (Backend)
   - `order.hrc-kitchen.com` (Public frontend)
   - `manage.hrc-kitchen.com` (Admin frontend)

4. **External Services**:
   - Stripe account (payment processing)
   - Cloudinary account (image hosting)

### Required Tools

- Node.js 18+
- npm 9+
- Git
- Domain registrar access
- SSL certificates (Let's Encrypt recommended)

---

## 3. Environment Configuration

### Backend Environment Variables

Create `backend/.env.production`:

```bash
# Node Environment
NODE_ENV=production
PORT=3000

# Database (Neon PostgreSQL)
DATABASE_URL="postgresql://user:password@host.neon.tech/dbname?sslmode=require"

# JWT Authentication
JWT_SECRET="your-production-jwt-secret-min-32-chars"

# Stripe Payment Processing
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PUBLISHABLE_KEY="pk_live_..."

# Cloudinary Image Upload
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"

# CORS Configuration
PUBLIC_APP_URL=https://order.hrc-kitchen.com
ADMIN_APP_URL=https://manage.hrc-kitchen.com

# Email Domain Restriction (configured in Admin UI, stored in DB)
# Default: @huonregionalcare.org.au
```

### Public Frontend Environment Variables

Create `frontend-public/.env.production`:

```bash
# API Configuration
VITE_API_URL=https://api.hrc-kitchen.com/api/v1

# Stripe Configuration (Public Key)
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Application
VITE_APP_NAME=HRC Kitchen - Public Ordering
```

### Admin Frontend Environment Variables

Create `frontend-admin/.env.production`:

```bash
# API Configuration
VITE_API_URL=https://api.hrc-kitchen.com/api/v1

# Application
VITE_APP_NAME=HRC Kitchen - Management
VITE_PUBLIC_APP_URL=https://order.hrc-kitchen.com
```

---

## 4. Backend Deployment

### Option A: Vercel Deployment

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Configure vercel.json:**
   ```json
   {
     "version": 2,
     "builds": [
       {
         "src": "backend/src/index.ts",
         "use": "@vercel/node"
       }
     ],
     "routes": [
       {
         "src": "/(.*)",
         "dest": "backend/src/index.ts"
       }
     ],
     "env": {
       "NODE_ENV": "production"
     }
   }
   ```

3. **Deploy:**
   ```bash
   cd backend
   vercel --prod
   ```

### Option B: AWS EC2 / DigitalOcean

1. **Build the application:**
   ```bash
   cd backend
   npm ci
   npm run build
   ```

2. **Set up PM2 for process management:**
   ```bash
   npm install -g pm2
   pm2 start dist/index.js --name hrc-backend
   pm2 startup
   pm2 save
   ```

3. **Configure Nginx reverse proxy:**
   ```nginx
   server {
       listen 80;
       server_name api.hrc-kitchen.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

4. **Set up SSL with Let's Encrypt:**
   ```bash
   sudo certbot --nginx -d api.hrc-kitchen.com
   ```

---

## 5. Frontend Deployments

### Public Ordering App (frontend-public)

**Vercel Deployment:**

1. **Configure build settings:**
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm ci`
   - Root Directory: `frontend-public`

2. **Deploy:**
   ```bash
   cd frontend-public
   vercel --prod
   ```

3. **Configure domain:**
   - Add custom domain: `order.hrc-kitchen.com`
   - Vercel auto-provisions SSL certificate

**Environment Variables:**
- Add all variables from `.env.production` in Vercel dashboard

### Internal Management App (frontend-admin)

**Same process as Public App, but:**
- Root Directory: `frontend-admin`
- Custom Domain: `manage.hrc-kitchen.com`
- Use environment variables from `frontend-admin/.env.production`

---

## 6. Database Setup

### Using Neon (Recommended)

1. **Create production database:**
   - Go to https://neon.tech
   - Create new project: `hrc-kitchen-prod`
   - Copy connection string

2. **Run migrations:**
   ```bash
   cd backend
   DATABASE_URL="postgresql://..." npx prisma migrate deploy
   ```

3. **Seed initial data:**
   ```bash
   DATABASE_URL="postgresql://..." npm run db:seed
   ```

### Database Security

- Enable SSL connections (required)
- Whitelist application server IPs
- Use strong passwords
- Regular automated backups
- Set up monitoring alerts

---

## 7. Domain Configuration

### DNS Records

Configure the following DNS records with your domain registrar:

| Type  | Name    | Value                          | TTL  |
|-------|---------|--------------------------------|------|
| A     | api     | [Backend Server IP]            | 3600 |
| A     | order   | [Vercel IP / CNAME]            | 3600 |
| A     | manage  | [Vercel IP / CNAME]            | 3600 |

**For Vercel deployments:**
Use CNAME records pointing to `cname.vercel-dns.com`

### CORS Configuration

Verify backend CORS settings in `backend/src/index.ts`:

```typescript
const allowedOrigins = [
  'https://order.hrc-kitchen.com',
  'https://manage.hrc-kitchen.com'
];
```

---

## 8. Post-Deployment Verification

### Backend Health Check

```bash
curl https://api.hrc-kitchen.com/health
# Expected: {"status":"ok","timestamp":"..."}
```

### Public App Verification

1. Visit https://order.hrc-kitchen.com
2. Browse menu (no login required)
3. Add items to cart
4. Complete guest checkout
5. Verify Stripe payment
6. Check order confirmation

### Admin App Verification

1. Visit https://manage.hrc-kitchen.com
2. Login with admin account
3. Verify Kitchen Dashboard loads
4. Verify Admin Panel loads
5. Test domain restriction (try non-domain email)

### Integration Testing

1. **Place order from public app:**
   - Should appear in admin Kitchen Dashboard

2. **Update order status in Kitchen Dashboard:**
   - Should update in real-time

3. **Test Stripe webhooks:**
   - Configure webhook URL: `https://api.hrc-kitchen.com/api/v1/webhooks/stripe`
   - Test payment confirmation flow

---

## 9. Troubleshooting

### Common Issues

**CORS Errors:**
- Verify `allowedOrigins` in backend includes production domains
- Check browser console for exact error
- Ensure backend environment variables are set correctly

**Database Connection Failures:**
- Verify `DATABASE_URL` is correct
- Check SSL mode is enabled
- Verify IP whitelist includes server IP

**Stripe Webhook Not Working:**
- Verify webhook endpoint URL is correct
- Check webhook signing secret matches
- Review Stripe dashboard webhook logs

**Domain Validation Not Working:**
- Verify `restricted_role_domain` is set in database
- Check backend middleware is applied to correct routes
- Clear browser localStorage and try again

**Build Failures:**
- Check Node.js version (18+)
- Verify all environment variables are set
- Check for TypeScript errors: `npm run build`

### Monitoring

**Set up monitoring for:**
- Backend uptime and response times
- Database connection health
- Stripe payment success rate
- Error logs and exceptions
- User activity and order volume

**Recommended Tools:**
- Sentry (error tracking)
- LogRocket (session replay)
- DataDog / New Relic (APM)
- Stripe Dashboard (payment monitoring)

---

## Security Checklist

- [ ] All environment variables use production values
- [ ] JWT secret is strong and unique
- [ ] Database uses SSL connections
- [ ] CORS restricted to production domains
- [ ] Stripe uses live API keys (not test keys)
- [ ] HTTPS enforced on all domains
- [ ] Domain validation middleware active
- [ ] Rate limiting enabled
- [ ] Security headers configured (Helmet.js)
- [ ] Regular dependency updates scheduled
- [ ] Backup strategy in place

---

## Maintenance

### Regular Tasks

**Weekly:**
- Review error logs
- Check database performance
- Monitor payment success rate

**Monthly:**
- Update npm dependencies
- Review user feedback
- Check SSL certificate expiry

**Quarterly:**
- Security audit
- Performance optimization
- Backup restoration test

---

**Document Version History**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-12 | Claude | Initial deployment guide |

---

**End of Document**
