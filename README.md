<h1 align="center">gateway-sms-api</h1>

<p align="center">
  Production SMS gateway stack. A REST API, a web dashboard, and an Android agent that turn a phone with a SIM card into a programmable SMS endpoint.
</p>

<p align="center">
  <a href="#quick-start"><b>Quick start</b></a> ·
  <a href="#api-overview"><b>API</b></a> ·
  <a href="#webhooks"><b>Webhooks</b></a> ·
  <a href="#deployment"><b>Deployment</b></a> ·
  <a href="#configuration"><b>Configuration</b></a> ·
  <a href="#development"><b>Development</b></a>
</p>

## Overview

gateway-sms-api is an SMS gateway that lets your applications send and receive text messages through an Android phone and its SIM card. Your code calls the HTTP API, the API pushes each message to a registered device over Firebase Cloud Messaging, and the device sends the SMS through the carrier network. Inbound messages travel the other way: the device reports them to the API, which stores them and delivers them to your webhook endpoints.

The repository contains every runtime component:

| Directory | Component | Stack |
|---|---|---|
| [`api/`](api) | HTTP API, device registry, send queue, webhook delivery, billing, email | NestJS, MongoDB, Redis with BullMQ, Firebase Cloud Messaging |
| [`web/`](web) | Dashboard for devices, API keys, messaging, history, and webhooks | Next.js, React, Tailwind CSS, NextAuth |
| [`android/`](android) | Gateway agent that sends and receives SMS and reports delivery status | Kotlin, Jetpack Compose, WorkManager |
| [`docker-compose.yaml`](docker-compose.yaml) | Single-command stack: MongoDB, Redis, API, web, optional Mongo Express | Docker Compose |

## Table of contents

- [Features](#features)
- [Architecture](#architecture)
- [Quick start](#quick-start)
- [API overview](#api-overview)
- [Webhooks](#webhooks)
- [Deployment](#deployment)
- [Configuration](#configuration)
- [Development](#development)
- [Testing](#testing)
- [Repository layout](#repository-layout)
- [Operations notes](#operations-notes)
- [Contributing](#contributing)
- [Security](#security)

## Features

**Outbound SMS**
- Send a single message or a bulk batch to a list of recipients from one API call.
- Choose the device per request, and the SIM on dual-SIM phones.
- Queue-backed sending with configurable batch size and per-device send delay so pushes never outrun the phone.
- Delivery status tracking: sent, delivered, failed, and unknown state.

**Inbound SMS**
- Every message received on the device is stored and exposed through the API and the dashboard.
- Poll for new messages or subscribe to webhooks.

**Devices and access**
- Register any number of Android devices and mark one as the default.
- Heartbeats report connectivity and SMS permission status.
- Scoped API keys that can be renamed and revoked without touching the account.

**Webhooks**
- Subscribe URLs to message events.
- Signed payloads, configurable delivery timeout, and automatic disabling of endpoints that keep failing.

**Platform**
- Email and Google sign-in, email verification, password reset.
- Subscription billing, usage notices, and account deletion flows.
- In-app notifications feed.
- OpenAPI export for the full API surface.

## Architecture

1. A client calls the API with an API key.
2. The API validates the request, stores the message, and enqueues a push for the target device.
3. The device receives the push, sends the SMS through the carrier, and reports status back.
4. Inbound SMS are posted by the device to the API, persisted, and fanned out to webhook subscriptions.

All API routes are served under `/api/v1`. Authentication is either a bearer JWT (dashboard sessions) or an API key passed in the `x-api-key` header (programmatic access).

## Quick start

Requirements: Docker and Docker Compose. A Firebase project is required for push delivery to devices.

```bash
git clone <your-remote-url> gateway-sms-api
cd gateway-sms-api

cp api/.env.example api/.env
cp web/.env.example web/.env
# Fill in JWT_SECRET, NEXTAUTH_SECRET, and the FIREBASE_* values at minimum

docker compose up -d
```

| Service | URL |
|---|---|
| Web dashboard | http://localhost:3000 |
| API | http://localhost:3001/api/v1 |
| Mongo Express (optional) | http://localhost:8081 |

Then:

1. Open the dashboard and create an account.
2. Build and install the Android agent from [`android/`](android) on a phone with an active SIM.
3. Register the device by scanning the QR code shown in the dashboard.
4. Create an API key and send your first message.

## API overview

Base URL: `http://<host>:3001/api/v1`

### Send an SMS

```bash
curl -X POST http://localhost:3001/api/v1/gateway/devices/<DEVICE_ID>/send-sms \
  -H "x-api-key: <API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": ["+15555550100"],
    "message": "Your verification code is 482913"
  }'
```

Optional fields: `simSubscriptionId` to pick the SIM on dual-SIM devices.

### Send a bulk batch

```bash
curl -X POST http://localhost:3001/api/v1/gateway/devices/<DEVICE_ID>/send-bulk-sms \
  -H "x-api-key: <API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      { "recipients": ["+15555550100"], "message": "Hello A" },
      { "recipients": ["+15555550101"], "message": "Hello B" }
    ]
  }'
```

### Read received messages

```bash
curl http://localhost:3001/api/v1/gateway/devices/<DEVICE_ID>/get-received-sms \
  -H "x-api-key: <API_KEY>"
```

### Core routes

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/gateway/devices` | List registered devices |
| `POST` | `/gateway/devices` | Register a device |
| `PATCH` | `/gateway/devices/:id` | Update device settings |
| `POST` | `/gateway/devices/:id/set-default` | Mark the default device |
| `POST` | `/gateway/devices/:id/send-sms` | Send one message |
| `POST` | `/gateway/devices/:id/send-bulk-sms` | Send a batch |
| `GET` | `/gateway/devices/:id/sms/:smsId` | Fetch a message and its status |
| `GET` | `/gateway/devices/:id/sms-batch/:smsBatchId` | Fetch a batch |
| `GET` | `/gateway/devices/:id/get-received-sms` | List inbound messages |
| `GET` | `/gateway/devices/:id/messages` | Combined message history |
| `GET` | `/gateway/stats` | Account usage statistics |
| `GET` | `/gateway/api-keys` | List API keys |
| `POST` | `/gateway/api-keys` | Create an API key |
| `POST` | `/gateway/api-keys/:id/revoke` | Revoke an API key |
| `GET` | `/webhooks` | List webhook subscriptions |
| `PATCH` | `/webhooks/:webhookId` | Update a subscription |
| `DELETE` | `/webhooks/:webhookId` | Remove a subscription |

Device-side routes such as `heartbeat`, `receive-sms`, and `sms-status` are called by the Android agent and are not meant for client use.

Export the full OpenAPI document:

```bash
cd api && pnpm export:openapi
```

## Webhooks

Subscribe a URL to one or more events from the dashboard or the `/webhooks` routes.

| Event | Fires when |
|---|---|
| `MESSAGE_RECEIVED` | An inbound SMS arrived on the device |
| `MESSAGE_SENT` | The device handed the message to the carrier |
| `MESSAGE_DELIVERED` | The carrier confirmed delivery |
| `MESSAGE_FAILED` | Sending failed |
| `UNKNOWN_STATE` | The device could not determine the final status |
| `SMS_STATUS_UPDATED` | Any status transition on an outbound message |

Each delivery is a `POST` with a JSON body and an `X-Signature` header containing an HMAC-SHA256 of the raw body, keyed with the subscription's signing secret. Verify the signature before trusting the payload.

Delivery behaviour is tuned with `WEBHOOK_DELIVERY_TIMEOUT_MS` and the `WEBHOOK_AUTO_DISABLE_*` variables. A daily job disables subscriptions whose failure count and failure rate both exceed the configured thresholds over the lookback window.

## Deployment

The compose file is the reference deployment. For production:

- Put the API and web containers behind a reverse proxy that terminates TLS.
- Set `USE_SMS_QUEUE=true` and point `REDIS_URL` at a durable Redis instance. The queue is what makes bulk sends resilient to device restarts.
- Use a managed MongoDB or back up the `mongodb_data` volume on a schedule.
- Generate strong values for `JWT_SECRET`, `NEXTAUTH_SECRET`, and `EMAIL_LINK_SECRET`.
- Set `API_PUBLIC_URL` and `APP_PUBLIC_URL` to the public hostnames so links in email resolve correctly.
- The Android agent has `dev` and `prod` build variants. Point the `prod` variant at your API hostname. See [android/BUILD_VARIANTS_SETUP.md](android/BUILD_VARIANTS_SETUP.md).

Two routes accept provider callbacks and are excluded from the JSON body parser so signatures can be verified against raw bytes: the billing webhook and the SES events endpoint.

## Configuration

All configuration is through environment variables. The example files document every key.

**API** ([`api/.env.example`](api/.env.example))

| Group | Keys |
|---|---|
| Core | `PORT`, `MONGO_URI`, `JWT_SECRET`, `JWT_EXPIRATION`, `FRONTEND_URL` |
| Push | `FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL`, and related `FIREBASE_*` |
| Queue | `USE_SMS_QUEUE`, `REDIS_URL`, `MAX_SMS_BATCH_SIZE` |
| Webhooks | `WEBHOOK_DELIVERY_TIMEOUT_MS`, `WEBHOOK_AUTO_DISABLE_FAILURE_THRESHOLD`, `WEBHOOK_AUTO_DISABLE_LOOKBACK_DAYS`, `WEBHOOK_AUTO_DISABLE_MIN_FAILURE_RATE` |
| Email | `MAIL_*`, `SES_CONFIGURATION_SET_NOTICES`, `SES_EVENTS_TOPIC_ARN`, `EMAIL_LINK_SECRET` |
| Public URLs | `API_PUBLIC_URL`, `APP_PUBLIC_URL`, `DEFAULT_BILLING_INTERVAL` |

**Web** ([`web/.env.example`](web/.env.example))

| Group | Keys |
|---|---|
| Core | `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_API_BASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL` |
| Auth | `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY` |
| App version gate | `NEXT_PUBLIC_LATEST_APP_VERSION_CODE`, `NEXT_PUBLIC_LATEST_APP_VERSION_NAME` |
| Analytics | `NEXT_PUBLIC_ANALYTICS_PROVIDERS`, `NEXT_PUBLIC_GA_MEASUREMENT_ID`, `NEXT_PUBLIC_CLARITY_PROJECT_ID`, `NEXT_PUBLIC_META_PIXEL_ID` |
| Optional | `NEXT_PUBLIC_SUPPORT_HQ_*`, `NEXT_PUBLIC_DISCOUNT_*`, `NEXT_PUBLIC_BULK_RECIPIENT_WARN_THRESHOLD` |

Values prefixed `NEXT_PUBLIC_` are read at build time. Rebuild the web image after changing them.

## Development

Requirements: Node.js 20 or newer, pnpm, a running MongoDB, and Android Studio for the agent.

```bash
# Start only the data services from compose
docker compose up -d gateway-db gateway-redis

# API with hot reload on :3001
cd api
cp .env.example .env
pnpm install
pnpm start:dev

# Web dashboard with hot reload on :3000
cd web
cp .env.example .env
pnpm install
pnpm dev
```

Open [`android/`](android) in Android Studio and run the `dev` variant against your local API.

Useful scripts:

| Location | Command | What it does |
|---|---|---|
| `api/` | `pnpm lint` | ESLint with autofix |
| `api/` | `pnpm format` | Prettier over `src` and `test` |
| `api/` | `pnpm build` | Compile to `dist/` |
| `api/` | `pnpm export:openapi` | Build and write the OpenAPI document |
| `web/` | `pnpm typecheck` | TypeScript check without emit |
| `web/` | `pnpm lint` | ESLint |
| `web/` | `pnpm build` | Production build |

## Testing

```bash
# API unit tests (Jest)
cd api && pnpm test
cd api && pnpm test:cov

# API end-to-end tests
cd api && pnpm test:e2e

# Web unit tests (Vitest)
cd web && pnpm test
cd web && pnpm coverage

# Web end-to-end tests (Playwright)
cd web && pnpm test:e2e
```


## Repository layout

```
.
├── api/                 NestJS service
│   └── src/
│       ├── auth/        Login, registration, Google sign-in, password reset
│       ├── gateway/     Devices, API keys, send and receive, status, stats
│       ├── webhook/     Subscriptions, signing, delivery, auto-disable job
│       ├── billing/     Plans, checkout, subscriptions
│       ├── mail/        Transactional email and SES event handling
│       ├── notifications/ In-app notification feed
│       ├── users/       Profiles, onboarding, account deletion
│       ├── support/     Customer support intake
│       ├── analytics/   Usage tracking
│       ├── openapi/     OpenAPI export
│       └── common/      Guards, filters, shared utilities
├── web/                 Next.js dashboard
├── android/             Kotlin gateway agent
├── docker-compose.yaml  Reference deployment
├── CONTRIBUTING.md
├── SECURITY.md
└── CONTRIBUTING.md
```

## Operations notes

- **Keep the phone awake.** The agent needs power, network, and exemption from battery optimization. A dedicated device on a charger is the reliable setup.
- **Carrier limits apply.** Carriers rate-limit and filter outbound SMS. Spread high volume across devices or SIMs and keep the per-device send delay realistic.
- **Multiple devices.** Pass the device id on every send. Use `set-default` for a fallback device.
- **Dual SIM.** Pass `simSubscriptionId` to choose the SIM.
- **iOS is not supported** as a gateway device. iOS does not permit apps to send SMS on behalf of a user. Clients on any platform can still call the API.
- **Compliance.** You are responsible for recipient consent and the messaging laws that apply in your jurisdiction.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

1. Create a branch from `main`.
2. Make the change with a clear commit message.
3. Run the relevant tests and lint.
4. Open a pull request against `main` describing what changed and why.

## Security

Do not open a public issue for a vulnerability. Follow the reporting process in [SECURITY.md](SECURITY.md).


