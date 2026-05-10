# 📋 Task List (TODO)

> **Last Updated:** May 2026
> *This file is actively maintained to track the ongoing development and future roadmap of the project.*

## 🎨 Frontend (React)
- [x] **UI/UX:** Fix responsive layout issues (overflow/clipping) for the Add and Edit modals in the Staff section.
- [x] **UI:** Add an Email input field to the User Add/Edit modals.
- [x] **UI:** Show a global confirmation dialog before executing any delete operation.
- [x] **Feature:** Auto-generate and display a default `UserCode` when the User Modal opens (user can still override it).
- [x] **Cashier:** Apply the new design to the Cashier page.
- [x] **Waiter:** Add serve action to the PosPage.
- [x] **Waiter:** Add a Served tab to the PosPage.
- [x] **Cashier:** Replace mock data with real API data.
- [x] **Cashier:** Allow selecting a cash register as the payment destination.
- [x] **Cashier:** Wire the recent transactions list to real data.
- [ ] **Cashier:** Add SignalR support to the Cashier page.
- [ ] **Cashier:** Add a detailed transaction view section to the Cashier page.
- [ ] **Cashier:** Fix the stat cards on the Cashier page.
- [ ] **PosPage:** Fix action buttons (e.g. Confirm) on the PosPage.
- [ ] **Validation:** Implement client-side form validation to prevent sending invalid data to the backend. (Completed: admin side { menu, categories, staff, tables, reports })
- [ ] **UI/UX:** Redesign the initial onboarding (Restaurant Creation) screen to match the current global UI design system.
- [ ] **UI:** Implement a global Toast notification mechanism to properly display API error messages across all pages.
- [ ] **Profile:** The profile section is missing; add a dedicated profile page.
- [ ] **Reports:** Fill in the contents of the Reports page.
- [ ] **PosPage:** Remove the payment-taking section from PosPage and integrate it with the Cashier page.
- [ ] **PosPage:** The UI is not mobile-friendly; make the page fully responsive.
- [ ] **PosPage:** The trash icon under the "New" tab in the orders section does not work; fix it.
- [ ] **PosPage:** The "Back to Tables" icon is in an awkward position; review its placement.
- [ ] **Product:** Implement per-item status changes within an order.
- [ ] **VAT:** Add a configurable VAT rate setting.

## ⚙️ Backend (.NET Core)
- [x] **Feature [Category]:** Implement foreign key validation in the category deletion endpoint to prevent deleting categories with linked products.
- [x] **Feature [User]:** Implement the missing Update method for the User entity.
- [x] **Refactor [Auth]:** Update CQRS Commands and Handlers to allow login using either Email or Username.
- [x] **Feature [Cashier]:** Implement backend for the Cashier page; add payment processing and transaction listing endpoints.
- [x] **Refactor [Validation]:** Remove `AddFluentValidationAutoValidation`; validation now runs only through the MediatR pipeline.
- [ ] **Refactor [Auth]:** Remove manual `UserCode` input during Registration; implement auto-generation on the backend.
- [ ] **Validation:** Review and complete all backend validation rules (FluentValidation); implement missing business rules.
- [ ] **Refactor:** Review and optimize all incoming DTOs and AutoMapper configurations.
- [ ] **Refactor:** Rename the generic `Update` method in Table operations to `UpdateTable` for naming consistency.
- [ ] **Refactor [Category]:** Review and optimize the business logic inside `DeleteCategoryCommandHandler`.
- [ ] **Refactor:** Add caching to the admin side for products, categories, staff, and tables.
- [ ] **Cashier:** Handle tip as a separate field in the transaction model.
- [ ] **Product:** Validate per-item status changes on the backend as well.
