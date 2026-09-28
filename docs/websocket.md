# WebSocket Architecture & Boilerplate Guide

> **100% Production-Ready Realtime Infrastructure** for Monorepo applications with multi-pod clustering, Redis Sorted Set presence tracking, zero-exhaustion session validation, and decoupled TypeScript clients.

---

## 1. Overview & System Architecture

This monorepo utilizes a centralized, production-hardened WebSocket infrastructure based on **Socket.IO v4** and **Redis Pub/Sub**. The architecture strictly decouples realtime communication into two separate namespaces:

1. **`/ws` (Authenticated Namespace)**:
   - Dedicated to authorized users (`admin` and `user`).
   - Validates JWT tokens and verifies active database sessions during handshakes.
   - Enforces periodic O(1) Redis Blacklist sweeps to disconnect revoked sessions immediately.
   - Automatically tracks online presence across nodes using Redis Hashes and Sorted Sets.
   - Automatically joins users to private notification rooms (`admin:<id>`, `user:<id>`, `presence:admins`, `presence:users`).

2. **`/public` (Unauthenticated Namespace)**:
   - Designed for anonymous guests and open data streaming (e.g., live market tickers, public banner announcements, stream viewer counts).
   - Implements the **Topic Subscription Pattern** (`public:subscribe`, `public:unsubscribe`).
   - Zero authentication overhead, enabling high throughput for public readers.

```mermaid
flowchart TD
    subgraph Clients["Frontend Clients"]
        AdminWeb["Admin Portal (apps/web)<br/>React + Vite<br/>WsClient (admin)"]
        NextClient["Web Client (apps/client)<br/>Next.js App Router<br/>WsClient (user / guest)"]
    end

    subgraph LB["Load Balancer / Ingress"]
        Traefik["Nginx / Traefik / ALB<br/>Sticky Sessions (Cookie/IP)"]
    end

    subgraph BackendCluster["NestJS API Cluster (apps/api)"]
        Pod1["Pod 1<br/>/ws Gateway<br/>/public Gateway"]
        Pod2["Pod 2<br/>/ws Gateway<br/>/public Gateway"]
        PodN["Pod N<br/>/ws Gateway<br/>/public Gateway"]
    end

    subgraph SharedInfra["Shared Infrastructure"]
        RedisPubSub["Redis Pub/Sub<br/>(@socket.io/redis-adapter)"]
        RedisPresence["Redis Sorted Set & Hash<br/>presence:heartbeats & online"]
        Postgres["PostgreSQL DB<br/>(User & Session Persistence)"]
    end

    AdminWeb -->|WebSocket /ws| LB
    NextClient -->|WebSocket /ws or /public| LB
    LB --> Pod1
    LB --> Pod2
    LB --> PodN

    Pod1 <-->|Sync Rooms & Broadcasts| RedisPubSub
    Pod2 <-->|Sync Rooms & Broadcasts| RedisPubSub
    PodN <-->|Sync Rooms & Broadcasts| RedisPubSub

    Pod1 -->|Heartbeats & O(1) Blacklist| RedisPresence
    Pod2 -->|Heartbeats & O(1) Blacklist| RedisPresence
    PodN -->|Heartbeats & O(1) Blacklist| RedisPresence

    Pod1 -.->|Handshake Auth Only| Postgres
    Pod2 -.->|Handshake Auth Only| Postgres
    PodN -.->|Handshake Auth Only| Postgres
```

---

## 2. Production-Ready Features Checklist

| Production Requirement            | Solution & Implementation                                                                                                                                                              |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Multi-Node Clustering**         | Uses `@socket.io/redis-adapter` over Redis Pub/Sub. Messages emitted on Pod A seamlessly broadcast to sockets connected to Pod B or Pod N.                                             |
| **Cluster-Safe Presence**         | Heartbeats store `Date.now()` timestamps in a Redis Sorted Set (`presence:socket_heartbeats`). Any pod can run cleanup without pruning active sockets from other pods.                 |
| **Zero DB Connection Exhaustion** | Database lookup is **only** performed during initial socket handshake. Periodic sweeps check Redis `SESSION_BLACKLIST` (O(1)), protecting PostgreSQL from connection pool exhaustion.  |
| **Resilient Frontend Clients**    | Dedicated, framework-agnostic TypeScript `WsClient` classes in both frontends handle auto-reconnect backoff, silent token refresh on 401 Unauthorized, and page visibility throttling. |
| **Graceful Degradation**          | If Redis is unavailable during local development, `RedisIoAdapter` logs a warning and falls back to default in-memory `IoAdapter` without crashing the application.                    |
| **Safe Environment Defaults**     | Clients feature intelligent fallback resolution (stripping trailing slashes, defaulting to port 8000) so local developers can clone and run immediately without missing variables.     |

---

## 3. Quickstart: Monorepo Boilerplate Setup

### Step 1: Environment Configuration

Verify or copy the environment files across the monorepo:

#### `apps/api/.env`

```bash
# Redis Configuration (Required for multi-instance sync & presence)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=redispass
REDIS_TLS_ENABLED=false

# App Port & CORS
APP_PORT=8000
APP_CORS_ORIGIN=http://localhost:5173,http://localhost:3000
```

#### `apps/web/.env` (Admin Portal)

```bash
VITE_API_URL=http://localhost:8000/api/v1
VITE_SOCKET_URL=http://localhost:8000
```

#### `apps/client/.env` (Next.js Client)

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SOCKET_URL=http://localhost:8000
```

### Step 2: Spin Up Infrastructure & Start Dev Servers

```bash
# 1. Start PostgreSQL and Redis via Docker Compose
docker compose up -d postgres redis

# 2. Run database migrations and seeds
pnpm --filter api migration:run
pnpm --filter api seed:run

# 3. Start all workspaces in parallel
pnpm dev
```

---

## 4. Backend Architecture Guide (`apps/api`)

### Global Module Availability

`WebsocketModule` is marked as `@Global()`. You **never** need to import `WebsocketModule` into your feature modules. Simply inject `WebsocketService` directly into your services or controllers.

### `WebsocketService` API Reference

Located at [`apps/api/src/websocket/websocket.service.ts`](file:///home/hongphat/Documents/Personal/turborepo/apps/api/src/websocket/websocket.service.ts):

```typescript
export class WebsocketService {
  /**
   * Send a private event to a specific Admin user across all connected pods.
   */
  emitToAdmin(adminId: number | string, event: string, data: unknown): void;

  /**
   * Send a private event to a specific Customer / End-User across all connected pods.
   */
  emitToUser(userId: number | string, event: string, data: unknown): void;

  /**
   * Send an event to all sockets in a specific room (e.g. 'presence:admins', 'presence:users', or custom room).
   */
  emitToRoom(room: string, event: string, data: unknown): void;

  /**
   * Broadcast an event to all authenticated sockets connected to /ws.
   */
  broadcast(event: string, data: unknown): void;

  /**
   * Publish a message to a public topic on /public (Topic Subscription Pattern).
   */
  emitToPublicTopic(topic: string, event: string, data: unknown): void;

  /**
   * Broadcast an event to all anonymous sockets connected to /public.
   */
  broadcastPublic(event: string, data: unknown): void;
}
```

---

## 5. Frontend Integration Guide

### 5.1. Admin Portal (`apps/web` - React / Vite)

The Admin Portal uses [`getWsClient()`](file:///home/hongphat/Documents/Personal/turborepo/apps/web/src/lib/ws-client.ts) and exports the `useSocket()` hook from [`socket-context.tsx`](file:///home/hongphat/Documents/Personal/turborepo/apps/web/src/context/socket-context.tsx).

#### Listening to Realtime Events & Cache Invalidation:

```tsx
import { useEffect } from 'react';
import { useSocket } from '@/context/socket-context';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export function AdminUsersPage() {
  const socket = useSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket) return;

    const handleUserRegistered = (payload: {
      userId: number;
      email: string;
    }) => {
      toast.info(`New user registered: ${payload.email}`);
      // Invalidate TanStack query to fetch latest data without manual refresh
      queryClient.invalidateQueries({ queryKey: ['users'] });
    };

    socket.on('user:registered', handleUserRegistered);

    // CRITICAL: Always clean up listener on unmount
    return () => {
      socket.off('user:registered', handleUserRegistered);
    };
  }, [socket, queryClient]);

  return <div>Users Management</div>;
}
```

---

### 5.2. Web Client (`apps/client` - Next.js App Router)

The Next.js client uses `useSocket()` from [`socket-context.tsx`](file:///home/hongphat/Documents/Personal/turborepo/apps/client/src/context/socket-context.tsx):

```tsx
'use client';

import { useEffect } from 'react';
import { useSocket } from '@/context/socket-context';
import { toast } from 'sonner';

export function UserNotificationListener() {
  const { socket, isConnected } = usePresenceSocket();

  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleNotification = (data: { title: string; body: string }) => {
      toast.success(data.title, { description: data.body });
      window.dispatchEvent(new CustomEvent('notifications:refresh'));
    };

    socket.on('notification:received', handleNotification);

    return () => {
      socket.off('notification:received', handleNotification);
    };
  }, [socket, isConnected]);

  return null;
}
```

---

### 5.3. Public Data Streaming (`/public` Namespace)

For unauthenticated features (Landing page live stats, public price tickers, counters):

```typescript
import { getPublicWsClient } from '@/lib/ws-client'; // or getPublicClientWs() in apps/client
import { useEffect, useState } from 'react';

export function LiveBtcPrice() {
  const [price, setPrice] = useState<number | null>(null);

  useEffect(() => {
    const publicWs = getPublicWsClient();

    // Connect anonymously to /public
    void publicWs.connect().then(() => {
      publicWs.subscribeTopic('market:btc');
    });

    const handlePriceUpdate = (data: { price: number }) => {
      setPrice(data.price);
    };

    publicWs.on('price:update', handlePriceUpdate);

    return () => {
      publicWs.unsubscribeTopic('market:btc');
      publicWs.off('price:update', handlePriceUpdate);
    };
  }, []);

  return <div>BTC Price: {price ? `$${price.toLocaleString()}` : 'Loading...'}</div>;
}
```

---

## 6. End-to-End Recipe: Implementing a New Realtime Feature

Follow this 4-step checklist whenever building a feature that requires WebSocket updates:

### Scenario: Admin approves an order (`Order Approval`)

1. Admin clicks **"Approve"** on Admin Portal.
2. Backend updates database status to `APPROVED`.
3. Backend sends a realtime notification to the specific Customer.
4. Backend sends a notification to all other Admins to update their dashboard tables in real time.

---

### Step 1: Emit from NestJS Service (`apps/api`)

```typescript
// apps/api/src/api/order/order.service.ts
import { WebsocketService } from '@/websocket/websocket.service';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderEntity } from './entities/order.entity';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(OrderEntity)
    private readonly orderRepository: Repository<OrderEntity>,
    private readonly wsService: WebsocketService,
  ) {}

  async approveOrder(orderId: number, adminId: number) {
    const order = await this.orderRepository.findOneBy({ id: orderId });
    if (!order) throw new NotFoundException('Order not found');

    order.status = 'APPROVED';
    order.approvedBy = adminId;
    await this.orderRepository.save(order);

    // 1. Notify the individual user
    this.wsService.emitToUser(order.userId, 'order:status_changed', {
      orderId: order.id,
      status: 'APPROVED',
      message: 'Your order has been approved!',
      updatedAt: new Date().toISOString(),
    });

    // 2. Notify all connected Admins to refresh their views
    this.wsService.emitToRoom('presence:admins', 'admin:order_approved', {
      orderId: order.id,
      approvedBy: adminId,
      updatedAt: new Date().toISOString(),
    });

    return order;
  }
}
```

---

### Step 2: Listen in Next.js Client (`apps/client`)

```tsx
// apps/client/src/components/orders/order-status-listener.tsx
'use client';

import { useEffect } from 'react';
import { useSocket } from '@/context/socket-context';
import { toast } from 'sonner';

export function OrderStatusListener() {
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleStatusChanged = (payload: {
      orderId: number;
      message: string;
    }) => {
      toast.success(payload.message, {
        description: `Order #${payload.orderId}`,
      });
      // Optionally trigger client-side data refetch
      window.dispatchEvent(new CustomEvent('orders:refresh'));
    };

    socket.on('order:status_changed', handleStatusChanged);

    return () => {
      socket.off('order:status_changed', handleStatusChanged);
    };
  }, [socket, isConnected]);

  return null;
}
```

---

### Step 3: Listen in Admin Portal (`apps/web`)

```tsx
// apps/web/src/pages/orders/orders-table.tsx
import { useEffect } from 'react';
import { useSocket } from '@/context/socket-context';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export function OrdersTable() {
  const socket = useSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket) return;

    const handleOrderApproved = (payload: {
      orderId: number;
      approvedBy: number;
    }) => {
      toast.info(`Order #${payload.orderId} was approved.`);
      // Invalidate queries so TanStack Query refetches in background
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    };

    socket.on('admin:order_approved', handleOrderApproved);

    return () => {
      socket.off('admin:order_approved', handleOrderApproved);
    };
  }, [socket, queryClient]);

  return <div>{/* Orders table UI */}</div>;
}
```

---

### Step 4: Write Unit Test for Backend Service (`apps/api`)

Mocking `WebsocketService` in your Jest tests is straightforward:

```typescript
// apps/api/src/api/order/order.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OrderService } from './order.service';
import { OrderEntity } from './entities/order.entity';
import { WebsocketService } from '@/websocket/websocket.service';

describe('OrderService Realtime Integration', () => {
  let service: OrderService;
  const mockWsService = {
    emitToUser: jest.fn(),
    emitToAdmin: jest.fn(),
    emitToRoom: jest.fn(),
    broadcast: jest.fn(),
  };

  const mockOrderRepository = {
    findOneBy: jest
      .fn()
      .mockResolvedValue({ id: 101, userId: 5, status: 'PENDING' }),
    save: jest.fn().mockImplementation((val) => Promise.resolve(val)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        {
          provide: getRepositoryToken(OrderEntity),
          useValue: mockOrderRepository,
        },
        { provide: WebsocketService, useValue: mockWsService },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
  });

  it('should emit order:status_changed to user when order is approved', async () => {
    await service.approveOrder(101, 1);

    expect(mockWsService.emitToUser).toHaveBeenCalledWith(
      5,
      'order:status_changed',
      expect.objectContaining({ orderId: 101, status: 'APPROVED' }),
    );
    expect(mockWsService.emitToRoom).toHaveBeenCalledWith(
      'presence:admins',
      'admin:order_approved',
      expect.objectContaining({ orderId: 101, approvedBy: 1 }),
    );
  });
});
```

---

## 7. Production Best Practices & Rules

1. **Event Naming Convention**:
   - Always use the `<domain>:<action>` format.
   - Examples: `order:created`, `user:banned`, `notification:new`, `public:viewer_count`.
2. **Always Clean Up Listeners (`socket.off`)**:
   - In React, missing cleanup inside `useEffect` causes duplicate event triggers (2x, 4x, 8x...) on re-renders and leaks memory.
3. **The "Signal + React Query" Pattern**:
   - WebSocket events should carry lightweight signals (e.g. `{ id, status }`) rather than massive, deeply nested payloads.
   - Let TanStack React Query (`queryClient.invalidateQueries`) handle caching, deduplication, and fetching full details.
4. **Never Expose Sensitive Data on `/public`**:
   - The `/public` namespace is open to any internet client. Never emit personally identifiable information (PII), emails, or internal database IDs onto public topics.
5. **Horizontal Scaling / Sticky Sessions**:
   - If running behind a reverse proxy (Nginx, Traefik, AWS ALB) with multiple API pods, enable **Sticky Sessions** (Session Affinity via Cookie or IP) so the HTTP long-polling handshake always hits the same pod before upgrading to pure WebSocket.

---

## 8. Core Source Files Reference

| File Path                                                                                                                                                     | Description                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| [`apps/api/src/websocket/redis-io.adapter.ts`](file:///home/hongphat/Documents/Personal/turborepo/apps/api/src/websocket/redis-io.adapter.ts)                 | Socket.IO Redis Pub/Sub adapter for horizontal clustering.      |
| [`apps/api/src/websocket/websocket.gateway.ts`](file:///home/hongphat/Documents/Personal/turborepo/apps/api/src/websocket/websocket.gateway.ts)               | Private Gateway mounted at `/ws` (Auth, Presence, Room joins).  |
| [`apps/api/src/websocket/public-websocket.gateway.ts`](file:///home/hongphat/Documents/Personal/turborepo/apps/api/src/websocket/public-websocket.gateway.ts) | Public Gateway mounted at `/public` (Topic subscription).       |
| [`apps/api/src/websocket/websocket.service.ts`](file:///home/hongphat/Documents/Personal/turborepo/apps/api/src/websocket/websocket.service.ts)               | Centralized emitter service (`emitToUser`, `emitToRoom`, etc.). |
| [`apps/api/src/websocket/presence.service.ts`](file:///home/hongphat/Documents/Personal/turborepo/apps/api/src/websocket/presence.service.ts)                 | Redis Sorted Set & Hash presence tracking service.              |
| [`apps/api/src/websocket/websocket-auth.service.ts`](file:///home/hongphat/Documents/Personal/turborepo/apps/api/src/websocket/websocket-auth.service.ts)     | JWT + Session verification with O(1) Redis Blacklist checks.    |
| [`apps/web/src/lib/ws-client.ts`](file:///home/hongphat/Documents/Personal/turborepo/apps/web/src/lib/ws-client.ts)                                           | Pure TypeScript `WsClient` class for Admin Portal.              |
| [`apps/client/src/lib/ws-client.ts`](file:///home/hongphat/Documents/Personal/turborepo/apps/client/src/lib/ws-client.ts)                                     | Pure TypeScript `WsClient` class for Next.js Client.            |
