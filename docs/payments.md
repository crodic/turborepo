# Payment Architecture & Implementation Guide

This document details the end-to-end architecture, database schema, API workflows, security, and administrative management for the Payment Module integrated with **Polar.sh**.

---

## 1. Architectural Principles & Overview

The payment system follows a **Backend-Driven Architecture** with strict security and isolation guarantees:

1. **Zero Client Secrets**:
   - The frontend (`apps/client`) holds **no** payment provider credentials, webhook secrets, or Polar Product IDs.
   - All pricing tiers, plan metadata, and Polar gateway product IDs are stored and served dynamically from the backend database (`payment_products`).
2. **Catalog-Driven Checkout**:
   - The client application interacts solely using human-readable slugs and billing frequencies: `{ planSlug: 'pro', interval: 'monthly' }`.
   - The backend resolves the corresponding Polar Product ID and handles checkout generation.
3. **Modular Service Separation**:
   - [`ProductService`](file:///apps/api/src/api/payment/services/product.service.ts): Manages plan definitions, tier pricing, feature lists, and Polar Product ID mapping.
   - [`PaymentService`](file:///apps/api/src/api/payment/services/payment.service.ts): Handles checkout orchestration, webhook ingestion, subscription state machines, ledger transactions, and user billing summaries.
4. **Relational Data Integrity**:
   - All payment entities (`payment_orders`, `payment_subscriptions`, `payment_customers`, `payment_transactions`) are strictly linked to the core [`users`](file:///apps/api/src/api/user/entities/user.entity.ts) table via TypeORM `@ManyToOne` foreign keys with `ON DELETE SET NULL`.
5. **Idempotent Webhooks**:
   - Every incoming Polar webhook event is verified via HMAC SHA-256 and tracked in `payment_webhook_events` to prevent duplicate processing.
6. **Extensible Gateway Strategy Pattern (`IPaymentGateway`)**:
   - All gateway-specific communications are encapsulated in dedicated providers implementing [`IPaymentGateway`](file:///apps/api/src/api/payment/interfaces/payment-gateway.interface.ts).
   - Currently powered by [`PolarProvider`](file:///apps/api/src/api/payment/providers/polar.provider.ts) and orchestrated by [`PaymentGatewayFactory`](file:///apps/api/src/api/payment/factories/payment-gateway.factory.ts).
   - Allows seamless plug-and-play addition of future gateways (e.g., VNPAY, MoMo, Stripe) without database schema modifications.

---

## 2. High-Level System Architecture

```mermaid
flowchart TD
    subgraph Client ["Client Website (apps/client)"]
        UI[Pricing Page]
        Hook[usePricingProducts Hook]
        CheckoutBtn[Select Plan Button]
    end

    subgraph Backend ["Backend API (apps/api)"]
        Ctrl[PaymentController]
        AdminCtrl[AdminPaymentController]
        ProdSvc[ProductService]
        PaySvc[PaymentService]
        DB[(PostgreSQL Database)]
    end

    subgraph Polar ["Polar Payment Gateway"]
        PolarAPI[Polar REST API]
        PolarWH[Polar Webhook Dispatcher]
        PolarPortal[Polar Customer Portal]
    end

    subgraph Admin ["Admin Portal (apps/web)"]
        AdminPayments[Payments Management /payments]
        AdminProducts[Products Management /payment-products]
        AdminUserDetail[User Billing View /users/:id/show]
    end

    %% Client flows
    Hook -->|GET /api/v1/payments/products| Ctrl
    Ctrl -->|getActiveProducts| ProdSvc
    ProdSvc -->|Query active plans| DB
    CheckoutBtn -->|POST /api/v1/payments/checkout| Ctrl
    Ctrl -->|createCheckout| PaySvc
    PaySvc -->|Lookup planSlug + interval| ProdSvc
    PaySvc -->|Create Checkout Session| PolarAPI
    PolarAPI -->|Checkout URL| PaySvc
    PaySvc -->|Checkout URL| Ctrl
    Ctrl -->|Redirect URL| UI

    %% Webhook flows
    PolarWH -->|POST /api/v1/payments/webhook| Ctrl
    Ctrl -->|Verify & Process| PaySvc
    PaySvc -->|Persist Orders, Subscriptions, Ledger| DB

    %% Admin flows
    AdminProducts -->|CRUD /api/v1/admin/payments/products| AdminCtrl
    AdminPayments -->|Query Orders, Subs, Tx| AdminCtrl
    AdminUserDetail -->|GET /users/:userId/summary| AdminCtrl
    AdminCtrl --> PaySvc
    AdminCtrl --> ProdSvc
```

---

## 3. Database Schema & Data Models

### 3.1. Entity Relationship Diagram

```mermaid
erDiagram
    users ||--o{ payment_orders : "places"
    users ||--o{ payment_subscriptions : "owns"
    users ||--o{ payment_customers : "mapped to"
    users ||--o{ payment_transactions : "audited by"

    payment_products {
        bigint id PK
        varchar plan_slug "UK (plan_slug, interval)"
        varchar name
        varchar interval "monthly | yearly"
        integer price "in cents"
        varchar currency "usd"
        varchar polar_product_id "Polar Gateway ID"
        jsonb features "array of bullet points"
        boolean is_popular
        boolean is_free
        boolean is_active
        integer sort_order
    }

    users {
        bigint id PK
        varchar email UK
        varchar full_name
    }

    payment_customers {
        bigint id PK
        bigint user_id FK "REFERENCES users(id) ON DELETE SET NULL"
        varchar polar_customer_id UK
        varchar email
    }

    payment_orders {
        bigint id PK
        varchar order_number UK
        bigint user_id FK "REFERENCES users(id) ON DELETE SET NULL"
        varchar customer_email
        varchar product_id
        varchar product_title
        integer amount "in cents"
        varchar currency
        varchar status "pending | paid | refunded | failed | expired"
        varchar polar_order_id
        varchar polar_checkout_id
    }

    payment_subscriptions {
        bigint id PK
        bigint user_id FK "REFERENCES users(id) ON DELETE SET NULL"
        varchar polar_subscription_id UK
        varchar polar_customer_id
        varchar customer_email
        varchar product_id
        varchar status "active | canceled | past_due | trialing | unpaid"
        timestamp current_period_start
        timestamp current_period_end
        boolean cancel_at_period_end
    }

    payment_transactions {
        bigint id PK
        bigint user_id FK "REFERENCES users(id) ON DELETE SET NULL"
        bigint order_id FK
        bigint subscription_id FK
        varchar polar_payment_id UK
        varchar type "charge | refund | dispute"
        varchar status "succeeded | failed | pending"
        integer amount "gross in cents"
        integer fee_amount "fee in cents"
        integer net_amount "net in cents"
        varchar currency
        varchar card_brand
        varchar card_last4
    }

    payment_webhook_events {
        bigint id PK
        varchar polar_event_id UK
        varchar event_type
        varchar status "received | processing | processed | failed"
        jsonb payload
    }
```

### 3.2. Migration History

1. `1780192650000-create-payment-tables.ts`: Creates baseline tables (`payment_customers`, `payment_orders`, `payment_subscriptions`, `payment_transactions`, `payment_webhook_events`).
2. `1780192750000-create-payment-products-table.ts`: Creates `payment_products` catalog table and seeds default tier plans (`starter`, `pro`, `enterprise`).
3. `1780192850000-link-users-to-payment-tables.ts`: Converts `user_id` columns to `bigint` and creates Foreign Key constraints referencing `users(id)` with `ON DELETE SET NULL ON UPDATE NO ACTION`.

---

## 4. Key Workflows

### 4.1. Dynamic Pricing Display & Checkout Flow

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Client as Client (Next.js)
    participant API as Backend (NestJS)
    participant DB as PostgreSQL
    participant Polar as Polar Gateway

    User->>Client: Visits /pricing
    Client->>API: GET /v1/payments/products
    API->>DB: SELECT * FROM payment_products WHERE is_active = true ORDER BY sort_order ASC
    DB-->>API: Active pricing tiers
    API-->>Client: Product catalog (names, prices, intervals, features)
    Client-->>User: Renders pricing cards (No secrets exposed)

    User->>Client: Clicks "Upgrade to Pro" (Monthly)
    Client->>API: POST /v1/payments/checkout { planSlug: "pro", interval: "monthly" } (Bearer JWT)
    API->>DB: Query product by (planSlug, interval)
    DB-->>API: payment_product with polarProductId
    API->>Polar: Create Checkout Session (polarProductId, customerEmail, metadata: { userId })
    Polar-->>API: Checkout Session URL
    API->>DB: Insert pending payment_orders record
    API-->>Client: { checkoutUrl: "https://sandbox.polar.sh/..." }
    Client-->>User: Redirect to Polar Checkout
```

### 4.2. Webhook Ingestion & Fulfillment Flow

```mermaid
sequenceDiagram
    autonumber
    participant Polar as Polar Gateway
    participant API as Backend (NestJS)
    participant DB as PostgreSQL

    Polar->>API: POST /v1/payments/webhook (Signature Header)
    API->>API: Verify HMAC SHA-256 with POLAR_WEBHOOK_SECRET
    alt Invalid Signature
        API-->>Polar: 400 Bad Request
    end
    API->>DB: Check or Insert payment_webhook_events (idempotency check)
    alt Already processed
        API-->>Polar: 200 OK (Skip duplicate)
    end

    alt Event: order.created
        API->>DB: Find user by metadata.userId or customer email
        API->>DB: Upsert payment_orders (status = 'paid', userId = user.id)
        API->>DB: Insert payment_transactions (type = 'charge', netAmount, feeAmount)
    else Event: subscription.created / subscription.updated
        API->>DB: Find user by customer email or metadata
        API->>DB: Upsert payment_subscriptions (status, currentPeriodEnd, cancelAtPeriodEnd)
    else Event: refund.created
        API->>DB: Update payment_orders (status = 'refunded')
        API->>DB: Insert payment_transactions (type = 'refund')
    end

    API->>DB: Update webhook event status = 'processed'
    API-->>Polar: 200 OK
```

### 4.3. Customer Self-Service Portal Flow

Authenticated users can manage their payment methods, view invoices, or cancel subscriptions without contacting support:

1. User clicks **Manage Subscription** on Client portal.
2. Client requests `GET /api/v1/payments/customer-portal` with JWT.
3. Backend looks up user's Polar Customer ID from `payment_customers` (or resolves via email).
4. Backend calls Polar API to generate an authenticated Customer Portal session.
5. Client opens the Polar Customer Portal URL in a secure new tab.

---

## 5. Admin Portal Management (`apps/web`)

The Admin Portal provides full operational visibility and configuration controls for billing and payments:

### 5.1. Global Payment Management (`/payments`)

Accessible via the sidebar navigation under **Management -> Payments**:

- **Orders Tab** ([`orders-tab.tsx`](file:///apps/web/src/pages/payments/components/orders-tab.tsx)):
  - Real-time search across order number, customer email, and Polar order ID.
  - Status badges (`PAID`, `PENDING`, `REFUNDED`, `FAILED`, `EXPIRED`).
  - Direct links to associated user profiles (`User #ID`).
- **Subscriptions Tab** ([`subscriptions-tab.tsx`](file:///apps/web/src/pages/payments/components/subscriptions-tab.tsx)):
  - Monitoring of recurring SaaS subscriptions.
  - Active/Cancelled status indicators.
  - Renewal tracking (`Period End` and `Auto Renew` status).
- **Transactions Tab** ([`transactions-tab.tsx`](file:///apps/web/src/pages/payments/components/transactions-tab.tsx)):
  - Financial ledger auditing.
  - Breakdowns for Gross Amount, Platform Fee, and Net Settlement Amount.
  - Card brand and last 4 digits tracking.

### 5.2. Payment Products & Pricing Tier Manager (`/payment-products`)

Accessible under **Management -> Payment Products**:

- Add, update, or deprecate pricing plans dynamically.
- Modify Polar Product IDs for production or sandbox without redeploying code.
- Customize features list (JSON/array), promotional badges (`Popular`, `Free`), and call-to-action text.

### 5.3. User-Specific Payment Audit (`/users/:id/show`)

Integrated into the User Detail view ([`UserPaymentCard`](file:///apps/web/src/pages/users/show/components/user-payment-card.tsx)):

- **Lifetime Value (LTV)**: Total amount spent by the user across all completed orders.
- **Total Orders**: Count of successful purchases.
- **Active Subscription Status**: Summary of the user's active plan, expiry date, and cancellation schedule.
- **History Tables**: Direct view of all subscriptions and recent orders associated with the specific user account.

---

## 6. API Reference

### 6.1. Public / Client Endpoints (`/api/v1/payments`)

| Method | Endpoint            | Auth                       | Description                                                    |
| :----- | :------------------ | :------------------------- | :------------------------------------------------------------- |
| `GET`  | `/products`         | None                       | Retrieves all active pricing products for public pricing table |
| `POST` | `/checkout`         | Optional (JWT recommended) | Initiates checkout session by `planSlug` and `interval`        |
| `POST` | `/webhook`          | Webhook Signature          | Ingests Polar webhook events with idempotency                  |
| `GET`  | `/customer-portal`  | User JWT                   | Generates Polar customer self-service portal link              |
| `GET`  | `/my-orders`        | User JWT                   | Returns payment orders for current authenticated user          |
| `GET`  | `/my-subscriptions` | User JWT                   | Returns subscriptions for current authenticated user           |

### 6.2. Admin Endpoints (`/api/v1/admin/payments`)

| Method   | Endpoint                 | Auth      | Description                                                 |
| :------- | :----------------------- | :-------- | :---------------------------------------------------------- |
| `GET`    | `/orders`                | Admin JWT | Paginated list of all customer orders                       |
| `GET`    | `/subscriptions`         | Admin JWT | Paginated list of all SaaS subscriptions                    |
| `GET`    | `/transactions`          | Admin JWT | Paginated list of financial ledger transactions             |
| `GET`    | `/users/:userId/summary` | Admin JWT | Summary of LTV, active plan, and orders for a specific user |
| `GET`    | `/products`              | Admin JWT | Paginated list of payment products/tiers                    |
| `GET`    | `/products/:id`          | Admin JWT | Get product configuration by ID                             |
| `POST`   | `/products`              | Admin JWT | Create a new pricing tier / Polar product mapping           |
| `PUT`    | `/products/:id`          | Admin JWT | Update pricing tier or Polar product ID                     |
| `DELETE` | `/products/:id`          | Admin JWT | Soft/Hard remove a pricing tier                             |

---

## 7. Environment Variables

### Backend (`apps/api/.env`)

```env
# Polar Gateway Credentials
POLAR_ACCESS_TOKEN=polar_at_your_access_token_here
POLAR_ORGANIZATION_ID=your-organization-id
POLAR_WEBHOOK_SECRET=your_webhook_secret_here
POLAR_SERVER=sandbox # 'sandbox' for staging/dev, 'production' for live
```

### Client (`apps/client/.env`)

> [!NOTE]
> Client applications **no longer require** any `NEXT_PUBLIC_POLAR_PRODUCT_*` variables. Pricing is resolved automatically via backend API.

---

## 8. Development & Verification Guide

### 8.1. Running Type Checks & Unit Tests

```bash
# Check TypeScript across backend and admin portal
pnpm --filter api check-types
pnpm --filter web-portal check-types

# Run Payment Module Unit Tests
pnpm --filter api test -- payment
```

### 8.2. Verifying Database Schema Synchronization

Verify that TypeORM entities match PostgreSQL schema with zero diff:

```bash
pnpm --filter api migration:generate src/database/migrations/VerifySync
```

_(Should output: `No changes in database schema were found`)_
