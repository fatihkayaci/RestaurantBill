# RestaurantBill — Architecture

A full-stack Restaurant POS (Point of Sale) application built with .NET 9 and React 19.
This document captures the architectural decisions, domain model, and use cases of the system.

---

## 1. Project Goals

- Build a practical, production-aware restaurant management system covering the full order lifecycle.
- Practice Clean Architecture and CQRS on the backend with a React SPA on the frontend.
- Implement real-time communication between different staff roles (waiter → kitchen → cashier).
- Keep the scope focfused: table management, order flow, kitchen display, cashier operations, and admin panel.

Out of scope for MVP: online reservations, customer-facing menus, loyalty programs, payment gateway integration.

---

## 2. Roles

| Role | Description |
|---|---|
| **Admin** | Full access; manages restaurant setup, users, products, categories, tables |
| **Waiter** | Opens tables, takes orders, adds/removes items from active orders |
| **Kitchen** | Views incoming order items, updates item status (Preparing → Ready) |
| **Cashier** | Views ready orders, closes orders, manages cash register |

---

## 3. Use Cases

### Authentication
1. As any user, I want to log in with my email and password and receive a JWT.
2. As an admin, I want to register new staff accounts (Waiter, Kitchen, Cashier).

### Restaurant Setup
3. As an admin, I want to set up the restaurant (name, description) on first run.

### Table Management
4. As an admin, I want to create and delete tables.
5. As a waiter, I want to see the current status of all tables (Available / Occupied / Reserved / OutOfService).
6. As a waiter, I want to open a table (mark it Occupied) to start taking orders.
7. As a waiter, I want to reserve a table.

### Order Management
8. As a waiter, I want to create an order for an occupied table.
9. As a waiter, I want to add products (with quantity) to an active order.
10. As a waiter, I want to remove a product from an active order.
11. As a waiter, I want to update the quantity of an item in an active order.
12. As a waiter, I want to cancel an entire order (returns the table to Available).
13. As a waiter, I want to see the active order for a given table.

### Kitchen Flow
14. As a kitchen staff, I want to see all pending and preparing order items across all tables.
15. As a kitchen staff, I want to update an order item's status: Pending → Preparing → Ready.
16. As a kitchen staff, I want to receive real-time updates when new items are added to any order (SignalR).

### Cashier Flow
17. As a cashier, I want to see all orders where at least one item is Ready.
18. As a cashier, I want to close an order (mark it Closed, return the table to Available, record payment).
19. As a cashier, I want to open and close a cash register.
20. As a cashier, I want to see the current balance of a cash register.

### Product & Category Management
21. As an admin, I want to create, update, and delete product categories.
22. As an admin, I want to create, update, and delete products (name, price, category, image).
23. As any authenticated user, I want to browse all products grouped by category.

### Admin Dashboard
24. As an admin, I want to see overview stats: total revenue, total orders, average order value, occupied tables, top-selling products.
25. As an admin, I want to manage staff accounts (create, update, delete users).

---

## 4. Domain Model

### Entities

| Entity | Description |
|---|---|
| `Restaurant` | Single restaurant record; all data is scoped to this entity |
| `Table` | A physical table; tracked by `TableStatus` |
| `Order` | An active order tied to a table; tracked by `OrderStatus` (Open / Closed) |
| `OrderItem` | A single product line within an order; tracked by `OrderItemStatus` |
| `Product` | A menu item; belongs to a `Category` |
| `Category` | Product grouping (e.g., Starters, Mains, Drinks) |
| `CashRegister` | A cash register; tracked by `CashRegisterStatus` (Open / Closed) |
| `CashTransaction` | A payment record linked to an order and a cash register |
| `User` | A staff member; role assigned via `UserRole` enum |

### Enums

**TableStatus**
- `Available` — empty, ready to seat guests
- `Occupied` — guests seated, active order may exist
- `Reserved` — held for upcoming guests
- `OutOfService` — unavailable (broken, closed section)

**OrderItemStatus**
- `Pending` — placed, not yet picked up by kitchen
- `Preparing` — kitchen acknowledged, in progress
- `Ready` — kitchen finished, waiting to be served
- `Delivered` — served to the guest

**UserRole**
- `Admin`, `Waiter`, `Kitchen`, `Cashier`

**CashRegisterStatus**
- `Open`, `Closed`

### Key Relationships

- A restaurant has many tables.
- A table can have at most one Open order at a time.
- An order has many order items; each item references a product.
- A product belongs to one category; a category has many products.
- A cash transaction references one order and one cash register.
- A user has exactly one role.

---

## 5. Architecture

### Backend — Clean Architecture

```
RestaurantBill.Domain          # Entities, Enums, domain exceptions — zero framework dependencies
RestaurantBill.Application     # CQRS handlers (MediatR), DTOs, Validators, Mapping, IAppDbContext
RestaurantBill.Infrastructure  # SignalR Hubs, external services
RestaurantBill.Persistence     # EF Core DbContext, entity configurations, Migrations
RestaurantBill.WebAPI          # Controllers, Middleware, DI extensions, Program.cs
```

**Request flow:**
```
HTTP Request
  → Controller
  → MediatR (Command or Query)
  → Handler (Application layer)
  → IAppDbContext (EF Core DbContext, injected directly — no repository layer)
  → PostgreSQL
```

**Cross-cutting behaviors (MediatR pipeline):**
- `LoggingBehavior` — logs every command/query with elapsed time
- `PerformanceBehavior` — warns when a handler exceeds a time threshold
- `ValidationBehavior` (FluentValidation) — validates input before the handler runs

### Frontend — React SPA

```
src/
├── api/           # Axios service layer (one file per domain)
├── components/    # Shared UI components (Header, MainLayout, PrivateRoute)
├── features/      # Domain-based types and components
│   ├── order/
│   ├── tables/
│   ├── products/
│   ├── categories/
│   └── Admin/
└── pages/         # Top-level page components (LoginPage, PosPage, KitchenPage, ...)
```

**Routing & Auth:**
- React Router v7 with `PrivateRoute` for role-based page protection.
- JWT stored in localStorage; attached to every request via Axios interceptor.

---

## 6. Real-Time Communication

SignalR is used for live updates between staff:

| Hub | Purpose |
|---|---|
| `KitchenHub` | Notifies kitchen screens when new order items arrive |
| `TableHub` | Notifies waiter screens when an order's status changes |

When a waiter adds an item to an order:
1. Command handler saves the item to the database.
2. Handler publishes an `OrderUpdatedNotification` (MediatR).
3. `NotifyTableOnOrderUpdatedHandler` broadcasts via `KitchenHub` and `TableHub`.
4. Kitchen and waiter screens update in real time — no polling required.

---

## 7. Key Sequence Diagrams

### 7.1 Waiter takes an order

```
Client (Waiter) → API : POST /orders {tableId}
API → Handler          : CreateOrderCommand
Handler → DB           : validate table is Occupied, no open order exists
Handler → DB           : save Order (status: Open)
API → Client           : 201 Created {orderId}

Client → API           : POST /orders/{id}/items {productId, quantity}
API → Handler          : AddProductToOrderCommand
Handler → DB           : save OrderItem (status: Pending)
Handler → SignalR      : broadcast OrderUpdated to KitchenHub
KitchenHub → Kitchen   : real-time update
API → Client           : 200 OK
```

### 7.2 Kitchen updates item status

```
Client (Kitchen) → API : PUT /orders/items/{id}/status {status: Preparing}
API → Handler          : UpdateOrderStatusCommand
Handler → DB           : update OrderItem status
Handler → SignalR      : broadcast OrderUpdated to TableHub
TableHub → Waiter      : real-time update
API → Client           : 200 OK
```

### 7.3 Cashier closes an order

```
Client (Cashier) → API : POST /orders/{id}/close
API → Handler          : CloseOrderCommand
Handler → DB           : set Order status = Closed
Handler → DB           : set Table status = Available
Handler → DB           : create CashTransaction record
API → Client           : 200 OK
```

---

## 8. Technology Stack

### Backend
- .NET 9 + ASP.NET Core
- Entity Framework Core + PostgreSQL
- MediatR (CQRS), FluentValidation, manual `ToDto()` mapping extensions
- Custom JWT authentication (`IPasswordHasher<User>` + `IAppDbContext`, no ASP.NET Identity)
- SignalR (real-time updates)
- Serilog (structured logging to console + daily rolling files)
- Built-in health check middleware (`/health`, DB connectivity)
- Built-in rate limiting middleware (fixed-window per IP on auth endpoints)

### Frontend
- React 19 + TypeScript + Vite
- Tailwind CSS v4
- React Router v7
- Axios
- shadcn/ui components

### Infrastructure
- Docker + Docker Compose
  - `api` — port 8080
  - `frontend` — port 3000
  - `database` — PostgreSQL on port 5432

---

## 9. Architectural Decisions

### ADR-001: Clean Architecture over layered MVC
Keeps domain logic framework-agnostic and makes the application layer independently testable. The cost is more boilerplate; the benefit is that swapping infrastructure (e.g., changing the ORM or message broker) does not touch business logic.

### ADR-002: CQRS with MediatR (no event sourcing)
Commands and queries are separated for clarity and pipeline flexibility (logging, validation). Event sourcing was excluded — it would add operational complexity with no benefit at this scale.

### ADR-003: SignalR for real-time instead of polling
Polling would increase backend load proportionally to the number of open screens. SignalR push keeps the connection open and delivers updates instantly at negligible overhead.

### ADR-004: Single PostgreSQL database (no database-per-service)
This is a single monolithic application, not microservices. One database is the correct choice here. Database-per-service belongs to a distributed architecture.

### ADR-005: JWT with role claims for authorization
Each endpoint is protected with `[Authorize(Roles = "...")]`. The token carries the user's role so no extra DB lookup is needed per request.

### ADR-006: FluentValidation over Data Annotations
Keeps validation logic out of the domain model, allows complex cross-field rules, and integrates naturally with the MediatR pipeline behavior.

### ADR-007: Pipeline Behaviors over Decorators
Cross-cutting concerns (validation, caching, idempotency, logging, performance) run as MediatR pipeline behaviors instead of decorator classes wrapping each handler. Handlers stay focused on business logic only, and new behaviors can be added globally without touching existing handlers.

### ADR-008: Domain exceptions instead of raw `throw`
All errors derive from `BaseException` (`BusinessException`, `NotFoundException`, `ValidationException`) and live in the Domain layer. A single global exception middleware maps them to consistent HTTP responses, so controllers never handle error formatting.

### ADR-009: Direct `IAppDbContext` over Generic Repository + Unit of Work (superseded)
Originally the Application layer went through `IGenericRepository<T>` + `IUnitOfWork` to keep persistence abstracted behind an interface. In practice this put a thinner, less capable layer on top of EF Core itself: no `IQueryable` composition, no projections, no paging, magic-string `Include`s, and a same-shaped `Update()` call on every save. It was reverted in favor of injecting `IAppDbContext` (an Application-layer interface exposing `DbSet<T>` per entity) directly into handlers, giving full LINQ/`IQueryable` access while keeping Application decoupled from the `Persistence` project — `RestaurantBillDbContext` is the only implementation, registered once in DI. Two narrowly-scoped query classes (`OrderQueries`, `ReservationQueries`) hold the handful of queries reused across handlers; there is no shared base class between them.

### ADR-010: ASP.NET Identity removed in favor of custom auth
ASP.NET Identity's `IdentityDbContext` and role/claim infrastructure added overhead the project didn't need — a single `User` entity with four fixed roles. Custom auth (`IPasswordHasher<User>` + manual JWT issuance via `IAppDbContext`) keeps the Domain layer free of framework dependencies and full control over the user model.

### ADR-011: Built-in health check over third-party solutions
ASP.NET Core's built-in `AddHealthChecks()` with `AddDbContextCheck<T>()` covers the only critical dependency (PostgreSQL). Third-party health check packages (e.g., AspNetCore.Diagnostics.HealthChecks) would add dependency overhead with no benefit at this scale. The `/health` endpoint is also wired into Docker Compose so the frontend container only starts after the API is confirmed healthy.

### ADR-012: Built-in rate limiting over middleware packages
ASP.NET Core 7+ includes a rate limiter middleware that covers the brute-force protection needed for auth endpoints. A fixed-window policy (10 requests / 1 minute per IP) is applied only to `/api/auth/*` — authenticated endpoints are already protected by JWT so rate limiting there would add overhead without meaningful security benefit.

---

## 10. Project Structure

```
RestaurantBill/
├── Backend/
│   ├── RestaurantBill.Domain/
│   ├── RestaurantBill.Application/
│   │   ├── Features/           # CQRS commands and queries
│   │   ├── DTOs/
│   │   ├── Behaviors/          # MediatR pipeline behaviors
│   │   ├── Exceptions/
│   │   └── Interfaces/
│   ├── RestaurantBill.Infrastructure/
│   │   ├── Hubs/               # SignalR hubs
│   │   └── Services/
│   ├── RestaurantBill.Persistence/
│   │   └── Configurations/     # EF Core Fluent API configs
│   ├── RestaurantBill.WebAPI/
│   │   ├── Controllers/
│   │   ├── Extensions/         # DI registration helpers
│   │   └── Middleware/
│   ├── RestaurantBill.Domain.Tests/         # xUnit — entity business logic
│   ├── RestaurantBill.Application.Tests/    # xUnit — command handlers (fake infra)
│   └── RestaurantBill.Integration.Tests/   # xUnit — query handlers (EF Core InMemory)
├── frontend/
│   └── src/
│       ├── api/
│       ├── components/
│       ├── features/
│       └── pages/
├── docs/
│   └── architecture.md         # this file
├── docker-compose.yml
└── .env
```
