# 🍽️ Restaurant POS & Dynamic Order Management API

![.NET](https://img.shields.io/badge/.NET-9.0-5C2D91?style=for-the-badge&logo=dotnet)
![Clean Architecture](https://img.shields.io/badge/Clean_Architecture-Success-239120?style=for-the-badge)
![DDD](https://img.shields.io/badge/Domain_Driven_Design-Enabled-0052CC?style=for-the-badge)

A highly scalable, robust backend engine designed for restaurant table and order management. Built entirely on **Clean Architecture** and **Domain-Driven Design (DDD)** principles to ensure maximum maintainability and separation of concerns.

## 🚀 Enterprise-Grade Architecture

This project is not just a simple CRUD application; it's a demonstration of modern software engineering practices:
- **Domain-Driven Design (DDD):** Business logic is completely isolated in the Domain layer.
- **Clean Architecture:** Strict dependency rules (Domain -> Application -> Infrastructure -> Presentation).
- **Bulletproof Domain:** Entities are protected using custom `Guard Clauses` and highly encapsulated models. No "anemic domain models" allowed.
- **Validation Pipeline:** Incoming API requests are heavily secured and sanitized using `FluentValidation`.

## 💻 Tech Stack

- **Framework:** .NET 9 Web API
- **Architecture:** Clean Architecture, DDD
- **ORM:** Entity Framework Core
- **Validation:** FluentValidation
- **Design Patterns:** Repository Pattern, Dependency Injection, Custom Guard Clauses

## 📂 Project Structure

    RestaurantBill.Solution/
    ├── Core/
    │   └── RestaurantBill.Domain         # Entities, Value Objects, Guard Clauses
    ├── Application/
    │   └── RestaurantBill.Application    # Interfaces, DTOs, FluentValidation Rules
    ├── Infrastructure/
    │   ├── RestaurantBill.Infrastructure # Cross-cutting concerns (Caching, Auth)
    │   └── RestaurantBill.Persistence    # EF Core DbContext, Repositories
    ├── Presentation/
    │   └── RestaurantBill.API            # Controllers, Swagger, Middlewares

## 🗺️ Roadmap (Development Plan)

This project is actively being developed. Here is the architectural roadmap:

- [x] **Phase 1: Core Architecture** (Clean Architecture setup, DDD implementation)
- [x] **Phase 2: Order & Table Management** (Adding items, dynamic total price calculation, Guard clauses)
- [x] **Phase 3: Validation & Security** (FluentValidation integrations)
- [x] **Phase 4: Persistence & Infrastructure** (EF Core integration, Repository implementations)
- [ ] **Phase 5: CQRS Implementation** (Separating Read/Write operations using MediatR for performance)
- [ ] **Phase 6: Real-Time Notifications** (Integrating SignalR for instant kitchen/waiter communication)
- [ ] **Phase 7: Caching Strategy** (Implementing Redis for menu and active table caching)
- [ ] **Phase 8: Security** (JWT Authentication & Role-based Authorization)

## ⚙️ Getting Started

1. Clone the repository:
    git clone https://github.com/fatihkayaci/restaurantbill.git

2. Update the database connection string in appsettings.json.
3. Run Update-Database in the Package Manager Console to apply migrations.
4. Run the API project. The Swagger UI will open automatically.
