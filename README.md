# Kigumo Bendera Dorms

Web-based boarding/dorm management system for Kigumo Bendera Senior School.
Replaces a legacy MS Access system. Built with Next.js 14, TiDB Serverless (MySQL), Prisma, Auth0, and Tailwind CSS.

## Prerequisites

- Node.js 18+
- npm
- [TiDB Serverless](https://tidbcloud.com) account (free tier)
- [Auth0](https://auth0.com) account (free tier) — create a **Regular Web Application**

## Local Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy environment template
cp .env.example .env.local

# 3. Fill in .env.local with your TiDB connection string and Auth0 credentials

# 4. Generate Prisma client
npx prisma generate

# 5. Push schema to TiDB (creates all tables)
npx prisma db push

# 6. Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | TiDB Serverless MySQL connection string |
| `AUTH0_SECRET` | Random secret — run `openssl rand -hex 32` |
| `AUTH0_BASE_URL` | App base URL (e.g. `http://localhost:3000`) |
| `AUTH0_ISSUER_BASE_URL` | Auth0 tenant URL (e.g. `https://dev-xxx.auth0.com`) |
| `AUTH0_CLIENT_ID` | Auth0 application client ID |
| `AUTH0_CLIENT_SECRET` | Auth0 application client secret |

## Stack

- **Framework:** Next.js 14 (App Router), TypeScript
- **Database:** TiDB Serverless via Prisma ORM
- **Auth:** Auth0 (`@auth0/nextjs-auth0`)
- **Styling:** Tailwind CSS
- **Hosting:** Vercel

## Deployment

Push to `main` → Vercel auto-deploys. Set all env vars in the Vercel project settings.
