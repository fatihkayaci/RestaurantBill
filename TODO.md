# 📋 Task List (TODO)

> **Last Updated:** May 2026
> *This file is actively maintained to track the ongoing development and future roadmap of the project.*

## 🎨 Frontend (React)
- [x] **UI/UX:** Fix responsive layout issues (overflow/clipping) for the Add and Edit modals in the Staff section.
- [x] **UI:** Add an Email input field to the User Add/Edit modals.
- [x] **UI:** Show a global confirmation dialog to the user before executing any delete operation.
- [x] **Feature:** Auto-generate and display a default `UserCode` when the User Modal opens (user can still override it).
- [x] **Cashier:** Apply the new design to the Cashier page.
- [ ] **Validation:** Implement client-side form validation to prevent sending invalid data and triggering 400/500 backend errors. (Completed => admin side { menu, categories, staff, tables, reports })
- [ ] **UI/UX:** Redesign the initial onboarding (Restaurant Creation) screen to match the current global UI design system.
- [ ] **UI:** Implement a global Error Handling mechanism (e.g., Toast notifications) to properly display API error messages across all pages.
- [ ] **Profile:** The profile section is missing; add a dedicated profile page.
- [ ] **Cash Register:** No cash register module exists yet; implement it.
- [ ] **Reports:** Fill in the contents of the Reports page.
- [ ] **PosPage:** Remove the payment-taking section from the page and integrate it with the new Cashier page.
- [ ] **PosPage:** The UI is not mobile-friendly; make the page fully responsive.
- [ ] **PosPage:** The trash icon under the "New" tab in the orders section does not work; fix it.
- [ ] **PosPage:** The "Back to Tables" icon is in an awkward position; review its placement.

## ⚙️ Backend (.NET Core)
- [x] **Feature [Category]:** Implement foreign key validation in the category deletion endpoint to prevent deleting categories with linked products.
- [x] **Feature [User]:** Implement the missing Update method for the User entity.
- [x] **Refactor [Auth]:** Update the CQRS Commands and Handlers to allow user login using either Email or Username.
- [ ] **Refactor [Auth]:** Remove manual `UserCode` input during Registration; implement auto-generation (Guid/Random) on the backend.
- [ ] **Validation:** Review and optimize all existing backend validation rules (FluentValidation); implement missing feature-specific validations.
- [ ] **Refactor:** Review and optimize all incoming Data Transfer Objects (DTOs) and AutoMapper configurations.
- [ ] **Refactor:** Rename the generic `Update` method within the Table entity/service to `UpdateTable` for better naming consistency.
- [ ] **Refactor [Category]:** Review and optimize the business logic inside `DeleteCategoryCommandHandler`.
- [ ] **Refactor:** Add caching to the admin side for products, categories, staff, and tables.
- [ ] **Create:** Implement the backend for the Cashier page (currently using mock data in the design).
