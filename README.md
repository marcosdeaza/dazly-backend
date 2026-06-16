# dazly-backend

Backend API for [dazly.art](https://dazly.art). Node.js/Express service handling authentication, AI image generation via Google Vertex AI, subscription billing via Stripe, and project management.

---

## Architecture

```
Client → Nginx (443) → Express (8081) → PostgreSQL (Neon)
                                    ↓
                              Google Vertex AI (Gemini)
                                    ↓
                              Stripe (billing)
```

**Stack**

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js, Express |
| Database | PostgreSQL (Neon) via Prisma ORM |
| Auth | JWT + Google OAuth 2.0 |
| AI | Google Vertex AI (Gemini 2.5 Flash) |
| Payments | Stripe (subscriptions, webhooks) |
| Container | Docker / Railway |

---

## Infrastructure

- **Host**: Railway (containerized deployment)
- **Database**: Neon PostgreSQL (serverless, TLS enforced)
- **Domain**: `dazly.art`
- **AI**: Google Cloud Project `dazly-api`, region `europe-southwest1`

---

## Security

- JWT sessions with configurable expiration (default 7d)
- CORS restricted to production domain
- Stripe webhook signature verification
- Prisma ORM for parameterized queries (SQL injection prevention)
- Google OAuth 2.0 with custom callback handler

---

## Environment

```bash
cp .env.example .env
# Fill all variables

npm install
npm run db:generate
npm run db:migrate
npm run dev
```

Required variables:

```
DATABASE_URL
JWT_SECRET
FRONTEND_URL
CORS_ORIGIN
PORT
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_CALLBACK_URL
GOOGLE_CLOUD_PROJECT_ID
VERTEX_AI_LOCATION
GEMINI_MODEL
STRIPE_SECRET_KEY
STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_PULSE
STRIPE_PRICE_FLOW
STRIPE_PRICE_SUMMIT
STRIPE_PRICE_PEAK
STRIPE_PRICE_INFINITY
```

---

## Directory

```
src/
  routes/
    auth.js         # Registration, login, password change
    ai.js           # Image generation endpoint
    stripe.js       # Checkout, portal, webhook
    user.js         # Profile, projects, stats
  prisma/
    schema.prisma   # User, Project, Message, Generation models
  index.ts          # Express factory, middleware, CORS
```

---

## Endpoints

| Route | Method | Description |
|-------|--------|-------------|
| `/api/auth/register` | POST | Create account |
| `/api/auth/login` | POST | JWT login |
| `/api/auth/change-password` | PUT | Update password |
| `/api/ai/generate` | POST | Generate image (requires auth) |
| `/api/ai/generations` | GET | Generation history |
| `/api/stripe/create-session` | POST | Create checkout session |
| `/api/stripe/customer-portal` | POST | Stripe billing portal |
| `/api/stripe/webhook` | POST | Stripe event webhook |
| `/api/user/profile` | GET | User profile |
| `/api/user/projects` | GET/POST/PUT/DELETE | CRUD projects |
| `/api/user/stats` | GET | Usage statistics |

---

## License

MIT License — see [LICENSE](LICENSE)

**Proprietary deployment — dazly.art**
