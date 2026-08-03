<h1 align="center">🍽️ RestaurantBill</h1>

<p align="center">
  <strong>A Production-Ready, Multi-Tenant Restaurant POS & Kitchen Display System</strong><br/>
  Architected for scalability and real-time synchronization using .NET 9, Clean Architecture, CQRS (MediatR), and SignalR. Supports a Company → Branch hierarchy so a single owner can run multiple restaurant locations, each with its own staff, menu, tables, and cash registers — all synchronized in real time without data inconsistency.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/.NET-9.0-512BD4?style=for-the-badge&logo=dotnet&logoColor=white"/>
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black"/>
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white"/>
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white"/>
  <img src="https://img.shields.io/badge/SignalR-Real--time-512BD4?style=for-the-badge&logo=dotnet&logoColor=white"/>
  <img src="https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white"/>
</p>

<p align="center">
  <a href="https://github.com/fatihkayaci/RestaurantBill/actions/workflows/dotnet-ci.yml">
    <img src="https://github.com/fatihkayaci/RestaurantBill/actions/workflows/dotnet-ci.yml/badge.svg" alt=".NET Backend CI"/>
  </a>
</p>

<p align="center">
  <a href="https://bill.fatihkayaci.com">
    <img src="https://img.shields.io/badge/Live%20Demo-bill.fatihkayaci.com-brightgreen?style=for-the-badge&logo=vercel&logoColor=white"/>
  </a>
</p>

---

## 📸 Screenshots & Demo

### Owner Portal
![Owner Portal](docs/screenshots/owner-dark-mode.png#gh-dark-mode-only)
![Owner Portal](docs/screenshots/owner-light.png#gh-light-mode-only)

### Admin Panel
![Admin Panel](docs/screenshots/admin-dark-mode.png#gh-dark-mode-only)
![Admin Panel](docs/screenshots/admin-light-mode.png#gh-light-mode-only)

### Waiter (POS)
![Waiter POS](docs/screenshots/waiter-dark-mode.png#gh-dark-mode-only)
![Waiter POS](docs/screenshots/waiter-light-mode.png#gh-light-mode-only)

### Kitchen Display System
![Kitchen Display System](docs/screenshots/kitchen-dark.png#gh-dark-mode-only)
![Kitchen Display System](docs/screenshots/kitchen-light.png#gh-light-mode-only)

### Cashier
![Cashier](docs/screenshots/cashier-dark.png#gh-dark-mode-only)
![Cashier](docs/screenshots/cashier-light.png#gh-light-mode-only)

---

## 📋 Overview

RestaurantBill is a multi-tenant Point of Sale (POS) application built for restaurant operations. A **Company** (the account an Owner registers) can operate multiple **Branches** — each Branch is a self-contained restaurant location with its own staff, menu, tables, and cash registers. Within a Branch, waitstaff manage tables and orders, the kitchen tracks incoming items on a dedicated display, and cashiers handle payments through a register system. Order and status changes propagate to every screen in real time over SignalR — no manual communication needed between the floor, the kitchen, and the cashier.

### Key Highlights

- **Clean Architecture** — strict separation of Domain, Application, Infrastructure, Persistence, and Presentation layers
- **CQRS with MediatR** — Commands and Queries are fully decoupled, with cross-cutting concerns handled in the pipeline
- **Multi-tenant Company → Branch model** — one Owner account can manage several branches, each isolated by `BranchId`/`CompanyId`, with staff assigned per branch via `UserBranch`
- **Owner Portal** — a dedicated portal for branch management, admin assignment, membership/billing, branding (company name + slug/QR), financial reports, and audit log review
- **Audit Log** — every meaningful action (auth, orders, payments, staff, products, system) is recorded and reviewable by Owners
- **Phone Verification** — SMS-based verification step required after registration, before branch/slug setup
- **Real-time updates over SignalR** — dedicated hubs push live changes to the Kitchen, Tables, and Cashier screens, including the name of the staff member who created/updated an order
- **Role-Based Authorization** — JWT authentication with `Owner`, `Admin`, `Waiter`, `Cashier`, and `Kitchen` roles enforced per endpoint
- **Cashier & Cash Register** — payment processing with cash-register sessions, inter-register transfers, and transaction history
- **Admin Panel** — manage products, categories, regions, tables, staff, and view overview statistics (scoped to the admin's branch)
- **MediatR Pipeline Behaviors** — Validation, Caching, Idempotency, Logging, and Performance monitoring as cross-cutting concerns
- **`Result<T>` pattern** — handlers and controllers return a uniform `Result<T>` instead of throwing for expected failures
- **Modern UI** — responsive React frontend with Tailwind CSS

---

## 🏗️ Architecture

```
RestaurantBill/
├── Backend/
│   ├── RestaurantBill.Domain          # Entities, Enums, Domain Exceptions, Interfaces
│   ├── RestaurantBill.Application     # CQRS Handlers, DTOs, Validators, Pipeline Behaviors
│   ├── RestaurantBill.Infrastructure  # SignalR Hubs & Notification Services
│   ├── RestaurantBill.Persistence     # EF Core, Repositories, UnitOfWork, Migrations
│   └── RestaurantBill.WebAPI          # Controllers, Middleware, Program.cs
└── frontend/
    └── src/
        ├── pages/
        │   ├── owner/                 # Branches, Admins, Membership, Branding, Reports, Audit Log
        │   ├── admin/                 # Staff, Tables, Menu, Profile (branch-scoped)
        │   ├── waiter/ kitchen/ cashier/
        │   └── LoginPage, LandingPage, PhoneVerificationPage…
        ├── features/                  # Feature-sliced: order, tables, products, categories, stats…
        ├── components/                # Shared components (PrivateRoute…)
        └── api/                       # Axios service layer
```

### Backend Layer Responsibilities

| Layer | Responsibility |
|-------|---------------|
| **Domain** | Core business entities, enums, validation guards, and domain exceptions — zero framework dependencies |
| **Application** | Use cases via CQRS (MediatR), FluentValidation, manual DTO mapping, Pipeline Behaviors |
| **Infrastructure** | SignalR hubs and real-time notification services |
| **Persistence** | EF Core + PostgreSQL, Generic Repository, Unit of Work, migrations & seeding |
| **WebAPI** | HTTP endpoints, JWT auth, global exception middleware, hub mapping |

---

> 🧠 Architectural decisions (why Clean Architecture, why CQRS, why SignalR, etc.) live in **[docs/architecture.md](docs/architecture.md)**.

---

## 🧪 Testing

The project has three xUnit test projects covering Domain, Application, and Integration layers.

### Domain Tests (`RestaurantBill.Domain.Tests`)

Pure unit tests for domain entity business logic — no infrastructure dependencies.

| Entity | Tests |
|--------|-------|
| `CashRegister` | Create validation, Update validation, AddTransaction (balance, closed register) |
| `Category` | Create/Rename validation, EnsureCanBeDeleted |
| `Order` | Create, AddItem, RemoveItem, UpdateItemQuantity, UpdateStatus transitions, Cancel, Close |
| `Product` | Create/Update validation |
| `Table` | Create/Update validation, Occupy/Release/Reserve state transitions |
| `User` | Create/Update validation, SetPasswordHash |

### Application Tests (`RestaurantBill.Application.Tests`)

Command handler tests using hand-written fake implementations (`FakeUnitOfWork`, `FakeGenericRepository<T>`, `FakeCurrentUserService`, etc.) — no mocking libraries.

| Feature | Handlers Tested |
|---------|----------------|
| **CashRegister** | Create, Update, Delete, AddTransaction |
| **Category** | Create, Update, Delete (with linked-product guard) |
| **Order** | Create, Cancel, Close, AddProduct, RemoveProduct, UpdateItemQuantity, UpdateStatus, UpdateItemStatus |
| **Product** | Create, Update, Delete |
| **Table** | Create, Update, Delete, Open, Reserve, CancelReservation |
| **User** | Create (duplicate username guard), Update, Delete |

### Integration Tests (`RestaurantBill.Integration.Tests`)

Query handler tests using a real EF Core InMemory database with real `UnitOfWork` and `GenericRepository` implementations — verifying that LINQ filters, `Include()` chains, and ordering actually produce correct results end-to-end.

| Feature | Tests |
|---------|-------|
| **Categories** | Empty result, restaurant isolation, alphabetical ordering |
| **Products** | Empty result, restaurant isolation (via `Category.RestaurantId`), ordering, CategoryName included |
| **Tables** | Empty result, restaurant isolation, alphabetical ordering |
| **Orders (Kitchen)** | Excludes Paid/Cancelled, restaurant isolation via Table |
| **Orders (Cashier)** | Served-only filter, restaurant isolation via Table |
| **Orders (Active)** | Returns active order for the correct table |

```bash
# Run all tests
dotnet test Backend/RestaurantBill.sln
```

---

## 🚧 Technical Challenges Overcome

### Handling Realistic Concurrency & Table Contention
- **Challenge:** During initial k6 load testing with 20 concurrent virtual users, the p(95) response time spiked to 2.95s. The bottleneck wasn't the database speed, but a logical flaw in the test scenario: virtual users were occupying all available tables without freeing them, causing subsequent requests to fail or stall due to table exhaustion.
- **Solution:** I updated the load test lifecycle to mirror real-world restaurant operations by enforcing an order settlement (`POST /api/Order/close`) at the end of each user iteration. This freed up the tables dynamically, resolving the artificial contention and instantly dropping the p(95) response time down to 1.46s.

---

## ✨ Features

### Owner Portal & Multi-Branch Management
- Manage multiple **Branches** under a single **Company**, each with its own staff, menu, and cash registers
- Assign and move **Admins** across branches
- Company branding (name, slug/QR code) used for public ordering/login
- Membership/billing overview per branch
- Financial reports across the company

### Audit Log
- Every meaningful action across **Auth, Order, Payment, Staff, Product,** and **System** categories is recorded with actor, severity, and message
- Owners review the full activity trail for their branches from a dedicated Audit Log page

### Authentication & Onboarding
- Registration is followed by **SMS-based phone verification** before an Owner can set up their company slug
- JWT Bearer token authentication with a custom `User` entity (no ASP.NET Identity)
- Staff (`Waiter`/`Cashier`/`Kitchen`/`Admin`) log in per-branch via `UserBranch`, with username/usercode uniqueness enforced per company

### Table Management
- Visual salon view with real-time table status (Available / Occupied / Reserved / OutOfService)
- Open, close, reserve, and cancel reservation from the same interface
- Live status sync across all clients via the Table hub

### POS (Point of Sale)
- Dynamic category filtering for the product menu
- Add / remove order items with quantity control
- Order item status tracking: **Pending → Preparing → Ready → Delivered**
- Confirm and send orders to the kitchen, serve items, and cancel active orders

### Kitchen Display System (KDS)
- Dedicated kitchen view for the order queue
- Per-item status updates (Preparing / Ready)
- Real-time push of new orders and status changes via the Kitchen hub

### Cashier & Cash Register
- Open/close cash-register sessions
- Process payments and close orders from the cashier screen
- Record cash transactions (In / Out) and transfer balances between registers
- View recent transaction history

### Admin Panel (branch-scoped)
- Manage **Products** and **Categories** (create, update, delete with FK-safe deletion)
- Manage **Regions** and **Tables** (create, update, delete)
- Manage **Staff** (create, update, delete, role assignment within the branch)
- **Overview dashboard** with summary statistics and charts

### Security
- Password hashing via `IPasswordHasher<User>`
- Role-based access enforced per endpoint: `Owner`, `Admin`, `Waiter`, `Cashier`, `Kitchen`
- Rate limiting on auth endpoints (brute-force protection)

---

## 🛠️ Tech Stack

### Backend
| Technology | Purpose |
|-----------|---------|
| **.NET 9.0** | Web API framework |
| **Entity Framework Core 9** | ORM + migrations |
| **PostgreSQL 16** | Primary database |
| **MediatR** | CQRS mediator + pipeline behaviors |
| **FluentValidation** | Input validation pipeline |
| **SignalR** | Real-time push to Kitchen / Tables / Cashier |
| **JWT Bearer** | Stateless authentication (custom `User` entity, no ASP.NET Identity) |
| **Serilog** | Structured logging (console + rolling file) |
| **Swagger** | API documentation |

### Frontend
| Technology | Purpose |
|-----------|---------|
| **React 19** | UI framework |
| **TypeScript 5.9** | Type safety |
| **Vite 7** | Build tool & dev server |
| **React Router v7** | Client-side routing |
| **Tailwind CSS 4** | Utility-first styling |
| **Axios** | HTTP client |
| **@microsoft/signalr** | Real-time WebSocket connection |
| **Recharts** | Dashboard charts |

### Infrastructure
| Technology | Purpose |
|-----------|---------|
| **Docker Compose** | Orchestrates API, frontend, and PostgreSQL |
| **GitHub Actions** | CI build + deploy to Digital Ocean droplet |

---

## 🔌 Pipeline Behaviors

Cross-cutting concerns run as MediatR pipeline behaviors, applied around every command/query:

| Behavior | Responsibility |
|----------|---------------|
| **ValidationBehavior** | Runs FluentValidation validators before the handler |
| **CachingBehavior** | Caches query results for cacheable requests |
| **IdempotencyBehavior** | Prevents duplicate processing of idempotent commands |
| **LoggingBehavior** | Logs request/response flow |
| **PerformanceBehavior** | Measures and flags slow handlers |

---

## 📊 Performance & Load Testing

The system is stress-tested using **k6** to guarantee stability under production workloads. 

I deployed the application to different environments to measure the breaking points. Under a stress test of 100 concurrent users (simulating a highly active restaurant environment with continuous kitchen reads and POS writes):
- **1 vCPU / 512MB RAM:** The system struggled with memory pressure and connection pool exhaustion, resulting in a 25% failure rate and 29s response times.
- **2 vCPU / 4GB RAM:** The system scaled perfectly. It handled the 100 concurrent users with a **0% error rate** and a comfortable **p(95) response time of 3.7s**, proving the efficiency of the CQRS pipeline and EF Core connection management.

> 💡 *See the `load-tests/README.md` for full k6 scripts, setup instructions, and detailed metrics.*

---
## 🔑 Demo Credentials

After the API starts, the following demo accounts are seeded automatically into a "Demo Restoran" company with one branch, sample tables, categories, products, and cash registers:

| Role | Login | Password |
|------|-------|----------|
| **Owner** | email `owner@demo.com` (no slug/subdomain needed) | `Owner123*` |
| **Admin** | username `admin` (on the `demo` company slug) | `Admin123*` |
| **Waiter** | username `waiter` | `Waiter123*` |
| **Kitchen** | username `kitchen` | `Kitchen123*` |
| **Cashier** | username `cashier` | `Cashier123*` |

> Staff logins are scoped to the `demo` company slug — locally, either send an `X-Restaurant-Slug: demo` header, use a `demo.*` subdomain, or set `Tenancy:DevDefaultSlug` to `demo` in `appsettings.Development.json`. The Owner logs in with just email/password, no slug required.

---

## 🚀 Getting Started

### Option A — Docker Compose (recommended)

#### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop)

#### 1. Create a `.env` file in the root directory

```env
DB_NAME=RestaurantDb
DB_USER=your_db_user
DB_PASSWORD=your_db_password
JWT_SECRET_KEY=your_long_random_secret_key
VITE_API_URL=http://localhost:8080
```

#### 2. Build and start everything

```bash
docker compose up --build
```

This starts:
- **API** on `http://localhost:8080` (Swagger: `http://localhost:8080/swagger`)
- **Frontend** on `http://localhost:3000`
- **PostgreSQL** on `localhost:5432`

Database migrations and demo seeding run automatically on API startup (`MigrateAndSeedAsync`).

---

### Option B — Manual (local development)

#### Prerequisites
- [.NET 9 SDK](https://dotnet.microsoft.com/download)
- [Node.js 20+](https://nodejs.org)
- [PostgreSQL 16](https://www.postgresql.org/download/)

#### 1. Set up PostgreSQL

Install PostgreSQL, then create a database and a user for the app. Using `psql`:

```bash
# Connect as the default postgres superuser
psql -U postgres

# Inside the psql shell:
CREATE DATABASE "RestaurantDb";
CREATE USER fatih_admin WITH PASSWORD 'your_db_password';
GRANT ALL PRIVILEGES ON DATABASE "RestaurantDb" TO fatih_admin;
\q
```

> You don't need to create any tables manually — schema migrations and demo seeding run automatically on API startup (`MigrateAndSeedAsync`). Make sure the database name, user, and password here match the connection string in the next step.

#### 2. Configure the backend

Set sensitive values via .NET User Secrets:

```bash
cd Backend/RestaurantBill.WebAPI
dotnet user-secrets set "JwtSettings:SecretKey" "your_secret_key"
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Host=localhost;Port=5432;Database=RestaurantDb;Username=your_db_user;Password=your_db_password"
```

#### 3. Run the backend

```bash
cd Backend
dotnet run --project RestaurantBill.WebAPI
```

#### 4. Run the frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend dev server runs on `http://localhost:5173`.

---

## 📡 API Reference

> All endpoints (except auth) require a JWT Bearer token. Roles in brackets indicate the authorized roles.

### Authentication
| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| `POST` | `/api/Auth/login` | — | Login with username (staff) or email (owner), receive a JWT |
| `POST` | `/api/Auth/register` | — | Register a new Owner + Company |
| `POST` | `/api/Auth/send-verification-code` | — | Send an SMS/email verification code |
| `POST` | `/api/Auth/verify-code` | — | Verify a phone/email code |

### Company & Branch
| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| `GET` | `/api/company` | Owner | Get the current company |
| `POST` | `/api/company` | Owner | Update company name |
| `POST` | `/api/company/branches/{id}/slug` | Owner | Set the company's public slug/QR |
| `GET` | `/api/branch/branches` | Owner | List branches |
| `POST` | `/api/branch/branches` | Owner | Create a branch |
| `POST` | `/api/branch/branches/{id}` | Owner | Update a branch |

### Audit Log
| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| `GET` | `/api/AuditLog` | Owner | List activity across the owner's branches, newest first |

### Membership
| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| `GET` | `/api/Membership` | Any authenticated | Get the branch's membership/plan info |

### Orders
| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| `GET` | `/api/Order/kitchen` | Owner, Admin, Kitchen | Orders for the kitchen display |
| `GET` | `/api/Order/cashier` | Owner, Admin, Cashier | Orders for the cashier screen |
| `GET` | `/api/Order/table/{tableId}` | Owner, Admin, Waiter, Kitchen | Active order for a table |
| `POST` | `/api/Order` | Owner, Admin, Waiter | Create a new order |
| `POST` | `/api/Order/add-product` | Owner, Admin, Waiter | Add items to an order |
| `POST` | `/api/Order/item/quantity` | Owner, Admin, Waiter | Update an order item's quantity |
| `POST` | `/api/Order/item/remove` | Owner, Admin, Waiter | Remove an item from an order |
| `POST` | `/api/Order/cancel` | Owner, Admin, Waiter | Cancel an order |
| `POST` | `/api/Order/close` | Owner, Admin, Waiter, Cashier | Close/settle an order |
| `POST` | `/api/Order/{id}/status` | Owner, Admin, Kitchen, Waiter | Update order status |
| `POST` | `/api/Order/{orderId}/item/{itemId}/status` | Owner, Admin, Kitchen | Update an order item's status |

### Tables & Regions
| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| `GET` | `/api/Table` | Owner, Admin, Waiter, Kitchen | Get all tables |
| `POST` | `/api/Table` | Owner, Admin | Create a table |
| `POST` | `/api/Table/{id}` | Owner, Admin | Update a table |
| `POST` | `/api/Table/open` | Owner, Admin, Waiter | Open table (set Occupied) |
| `POST` | `/api/Table/reservation` | Owner, Admin, Waiter | Reserve a table |
| `POST` | `/api/Table/cancel-reservation` | Owner, Admin, Waiter | Cancel a reservation |
| `DELETE` | `/api/Table/{id}` | Owner, Admin | Delete a table |
| `GET` | `/api/Region` | Owner, Admin, Waiter, Kitchen, Cashier | Get all regions |
| `POST` | `/api/Region` | Owner, Admin | Create/update a region |
| `DELETE` | `/api/Region/{id}` | Owner, Admin | Delete a region (blocked if tables are assigned) |

### Products & Categories
| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| `GET` | `/api/Product` | Owner, Admin, Waiter, Kitchen | Get all products |
| `POST` | `/api/Product` | Owner, Admin, Kitchen | Create a product |
| `POST` | `/api/Product/{id}` | Owner, Admin, Kitchen | Update a product |
| `DELETE` | `/api/Product/{id}` | Owner, Admin, Kitchen | Delete a product |
| `GET` | `/api/Category` | Owner, Admin, Waiter, Kitchen | Get all categories |
| `POST` | `/api/Category` | Owner, Admin | Create/update a category |
| `DELETE` | `/api/Category/{id}` | Owner, Admin | Delete a category (FK-safe) |

### Cash Register
| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| `GET` | `/api/CashRegister` | Owner, Admin, Cashier | List cash registers |
| `GET` | `/api/CashRegister/transactions` | Owner, Admin, Cashier | List cash transactions |
| `POST` | `/api/CashRegister` | Owner, Admin | Create/update a cash register |
| `POST` | `/api/CashRegister/transaction` | Owner, Admin, Cashier | Record a cash transaction (In/Out) |
| `POST` | `/api/CashRegister/transfer` | Owner, Admin, Cashier | Transfer balance between registers |
| `DELETE` | `/api/CashRegister/{id}` | Owner, Admin | Delete a cash register (blocked if balance > 0) |

### Users & Stats
| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| `GET` | `/api/User/me` | Any authenticated | Get the current user |
| `GET` | `/api/User` | Owner, Admin | Get all staff for the branch |
| `POST` | `/api/User/create` | Owner, Admin | Create a staff user |
| `POST` | `/api/User/update` | Owner, Admin | Update a staff user |
| `DELETE` | `/api/User/{id}` | Owner, Admin | Delete a staff user |
| `GET` | `/api/Stats/overview` | Owner, Admin | Overview statistics for the dashboard |

### SignalR Hubs
| Hub | Path | Purpose |
|-----|------|---------|
| **KitchenHub** | `/kitchen-hub` | New orders & item status updates to the kitchen |
| **TableHub** | `/table-hub` | Table status changes; order-updated events include the acting staff member's name |
| **CashierHub** | `/cashier-hub` | Order/payment updates to the cashier |

> Clients join a `restaurant-{id}` SignalR group based on the `RestaurantId` claim in their JWT (`Company.Id` for an Owner, `Branch.Id` for staff), keeping real-time updates isolated per branch.

---

## 🔄 Order Flow

```
Waiter (POS)              Backend                  Kitchen (KDS)        Cashier
    │                        │                          │                  │
    ├── Add items ──────────►│                          │                  │
    ├── Confirm order ──────►│                          │                  │
    │                        ├── SignalR KitchenHub ───►│                  │
    │                        │   "new order"            ├── Prepare item   │
    │                        │◄── Update item status ───┤                  │
    │◄── Status update ──────┤── SignalR ───────────────┤                  │
    │                        │                          │                  │
    │                        │                          │   Settle order   │
    │                        │◄── Close / payment ──────┼──────────────────┤
    │                        ├── SignalR CashierHub ────┼─────────────────►│
    │                        ├── SignalR TableHub ──────┴── table freed ──►(all)
```

---

## 🗄️ Data Model

```
Company ............. (Slug for public login/QR, owned by a User via OwnerUserId)
  └── Branch .......... (a single restaurant location)
        ├── Regions
        │     └── Tables ........... (Available / Occupied / Reserved / OutOfService)
        │           └── Orders ..... (Active / Pending / Preparing / Ready / Served / Paid / Cancelled)
        │                 └── OrderItems (Pending / Preparing / Ready / Delivered)
        │                       └── Product ──► Category
        ├── CashRegisters ... (Open / Closed)
        │     └── CashTransactions (In / Out / Transfer)
        ├── Membership ...... (PlanType / Status)
        ├── AuditLog ........ (Auth / Order / Payment / Staff / Product / System)
        └── UserBranch ...... (links a User to this Branch with Role / UserCode / HireDate)
              └── User
```

A `User` can own a Company and/or be linked to one or more Branches through `UserBranch`, which carries the per-branch `Role` (`Owner` / `Admin` / `Waiter` / `Cashier` / `Kitchen`), username, and hire date. All entities extend `BaseEntity`, which provides `Id`, `CreatedAt`, `UpdatedAt`, `CreatedUser`, and `IsDeleted` (soft delete). Domain entities expose `Create` / `Update` factory methods with built-in validation guards.

---

## 🔐 Roles & Permissions

| Role | Access |
|------|--------|
| **Owner** | Company-level access — manage branches, assign admins, membership, branding, financial reports, and the audit log |
| **Admin** | Branch-scoped management — staff, products, categories, regions, tables, cash registers, overview stats |
| **Waiter** | Table & order management via POS |
| **Cashier** | Payments, cash register, order settlement |
| **Kitchen** | Order queue and item status updates |

> Roles are assigned per-branch via `UserBranch`, so the same person can hold different roles (or none) in different branches. A JWT's `RestaurantId` claim carries the `Company.Id` for an `Owner` or the `Branch.Id` for staff roles.

---

## 📦 Project Status

> Current version: `0.0.3-development`

**Completed:**
- [x] Clean Architecture + CQRS setup
- [x] Table lifecycle management
- [x] Full order & order-item status tracking
- [x] JWT authentication & role-based authorization
- [x] SignalR real-time updates (Kitchen / Table / Cashier hubs), including order-creator name broadcast
- [x] Cashier & cash register with payment/transaction flow, plus inter-register transfers
- [x] Admin panel (products, categories, regions, tables, staff)
- [x] Overview statistics dashboard
- [x] MediatR Pipeline Behaviors (Validation, Caching, Idempotency, Logging, Performance)
- [x] Domain exceptions & validation guards
- [x] Docker Compose infrastructure + GitHub Actions CI/CD (all branches)
- [x] Unit & Integration tests — Domain entity tests, Application command handler tests, EF Core InMemory integration tests (xUnit)
- [x] Health check endpoint (`/health`) with DB connectivity check
- [x] Rate limiting on auth endpoints (brute-force protection)
- [x] Multi-tenant Company/Branch domain model with Guid-based ids
- [x] Owner role & portal (branches, admin assignment, membership, branding, reports, audit log)
- [x] SMS-based phone verification after registration
- [x] Audit log system across Auth/Order/Payment/Staff/Product/System actions
- [x] `Result<T>` return pattern across handlers, controllers, and tests
- [x] Per-company unique username/usercode enforcement across branches

**Planned:** (see [TODO.md](TODO.md))
- [ ] Configurable VAT rate
- [ ] Detailed reservation management (customer name, time, party size)
- [ ] Reports page contents & richer analytics
- [ ] Mobile-responsive POS & KDS
- [ ] Client-side form validation polish (remaining non-admin pages)
- [ ] Move audit log search/filtering to the backend

---

## 🤝 Contributing

Pull requests are welcome! Please read **[CONTRIBUTING.md](CONTRIBUTING.md)** for setup, branch, and commit conventions.

- Browse the [open issues](https://github.com/fatihkayaci/RestaurantBill/issues) — look for the **`good first issue`** label to get started.
- See the [project roadmap](TODO.md) for planned and completed work.
- For major changes, please open an issue first to discuss what you'd like to change.

---

<p align="center">
  Built with ❤️ using .NET 9 & React 19
</p>
