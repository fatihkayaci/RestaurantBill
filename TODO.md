# 📋 Project Roadmap (TODO)

> **Last updated:** June 2026
> This file tracks completed work and the remaining roadmap for RestaurantBill. The Turkish version is available in [TODO.tr.md](TODO.tr.md).

---

## 🎨 Frontend (React)

### ✅ Completed
- [x] **UI/UX:** Fix responsive overflow/clipping on the Staff add & edit modals.
- [x] **UI:** Add an email field to the user add & edit modals.
- [x] **UI:** Show a confirmation dialog before any delete operation.
- [x] **UI:** Add a global Toast mechanism to surface API error messages across all pages.
- [x] **Feature:** Auto-suggest a default `UserCode` when the user modal opens (still overridable).
- [x] **Staff:** Generate a random default password on staff creation (overridable).
- [x] **Onboarding:** Redesign the restaurant-creation screen to match the global design system.
- [x] **Cashier:** Apply the new page design.
- [x] **Cashier:** Replace mock data with real API data.
- [x] **Cashier:** Select a cash register as the payment destination.
- [x] **Cashier:** Wire the recent-transactions list to real data.
- [x] **Cashier:** Add real-time updates via SignalR.
- [x] **Waiter:** Add a serve action and a "Served" tab to the POS page.
- [x] **Order:** Support per-item status changes within an order.

### 🚧 Planned
- [ ] **Validation:** Add client-side form validation to stop invalid data from reaching the backend. *(Done: admin side — menu, categories, staff, tables, reports.)*
- [ ] **Cashier:** Add a detailed transactions view section.
- [ ] **Cashier:** Fix the statistics cards.
- [ ] **Reports:** Fill in the Reports page content.
- [ ] **Profile:** Add a dedicated profile page.
- [ ] **POS:** Fix action buttons (e.g. "Confirm").
- [ ] **POS:** Remove the payment section and integrate it with the Cashier page.
- [ ] **POS:** Make the page fully mobile-responsive.
- [ ] **POS:** Fix the non-working trash icon under the "New" tab.
- [ ] **POS:** Reposition the awkwardly placed "Back to Tables" icon.
- [ ] **UI:** Replace two-state status selects with on/off sliders.
- [ ] **VAT:** Add a configurable VAT-rate field.
- [ ] **Structure:** Review page/folder organization (e.g. single-file AdminPage vs. multi-file Kitchen).

---

## ⚙️ Backend (.NET)

### ✅ Completed
- [x] **Category:** Block deletion of categories that still have linked products (FK validation).
- [x] **User:** Implement the missing user update method.
- [x] **User:** Auto-generate `UserCode` on the backend instead of requiring it at registration.
- [x] **Auth:** Allow login with either username or email.
- [x] **Auth:** Assign `restaurantId` at registration time to avoid downstream scoping issues.
- [x] **Cashier:** Build the backend — payment processing and transaction-listing endpoints.
- [x] **Multi-tenancy:** Scope every create/update/delete by `restaurantId` so tenants stay isolated.
- [x] **Caching:** Add admin-side caching for products, categories, staff, and tables.
- [x] **Staff:** Exclude the current admin from the staff list.
- [x] **Validation:** Remove `AddFluentValidationAutoValidation`; validation now runs only through the MediatR pipeline.
- [x] **Refactor:** Clean up naming across the Application feature folders.

### 🚧 Planned
- [ ] **Validation:** Review and complete all backend validation rules; implement missing business rules.
- [ ] **Refactor:** Move from an anemic model toward a richer domain model.
- [ ] **Refactor:** Add more domain exception types and broaden coverage.
- [ ] **Refactor:** Review and optimize incoming DTOs and AutoMapper configurations.
- [ ] **Refactor:** Introduce a lightweight `RestaurantDto` for name-only needs (currently the full entity is sent just to render the header).
- [ ] **Refactor:** Rename the generic `Update` in table operations to `UpdateTable` for naming consistency.
- [ ] **Refactor [Category]:** Review and optimize the logic in `DeleteCategoryCommandHandler`.
- [ ] **Refactor [Query]:** Guarantee `restaurantId` via JWT middleware and remove `restaurantId <= 0` checks from query handlers.
- [ ] **Caching:** Review the overall caching strategy.
- [ ] **Cashier:** Model tip as a separate field on the transaction.
- [ ] **Order:** Validate per-item status changes on the backend as well.
- [ ] **Auth:** When an admin changes a logged-in user's role, notify and redirect that user to the login page.
