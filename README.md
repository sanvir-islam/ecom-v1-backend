# The California Pickle — Backend API

REST API powering [thecaliforniapickle.com](https://thecaliforniapickle.com), a direct-to-consumer e-commerce store selling a performance electrolyte sports drink built for athletes.

## Tech Stack

- **Runtime**: Node.js + TypeScript (compiled via `tsc`)
- **Framework**: Express.js
- **Database**: MongoDB (Mongoose)
- **Auth**: JWT (access + refresh tokens, httpOnly cookies)
- **Payments**: Stripe (Checkout Sessions + Webhooks)
- **Shipping**: Shippo (live carrier rates, label purchase, tracking webhooks)
- **Email**: ZeptoMail via BullMQ job queue (Redis)
- **Images**: Cloudinary
- **Process Manager**: PM2 (cluster mode)

## Features

- Product catalog with variants (size, stock, images)
- Order lifecycle: pending → processing → shipped → delivered
- Stripe Checkout with coupon/discount support and fraud verification
- Auto-purchase Shippo shipping labels on payment confirmation
- Shippo webhook auto-updates order status on tracking events
- Admin authentication with protected routes
- Rate limiting, CORS preflight handling, global error handler

## Project Structure

```
src/
├── config/         # env validation, DB, Redis, queue
├── jobs/           # BullMQ email + reminder workers
├── middleware/     # auth guard, rate limiter
├── modules/        # auth, admin, product, order, payment, shipping, settings
└── server.ts       # Express app entry point
```

## Environment Variables

Create a `.env` file with the following:

```
NODE_ENV=
MONGODB_URI=
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
ZEPTOMAIL_API_KEY=
REDIS_URI=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
SHIPPO_API_KEY=
SHIPPO_WEBHOOK_SECRET=
FRONTEND_URL=
PORT=
```

## Development

```bash
npm install
npm run dev
```

## Production Build

```bash
npm ci
npm run build
npm start
```

Deployed via GitHub Actions on push to `main` — SSHes into VPS, pulls latest, builds, and reloads PM2.
