# 📋 Task List (TODO)

> **Last Updated:** May 2026
> *This file is actively maintained to track the ongoing development and future roadmap of the project.*

## 🎨 Frontend (React)
- [x] **UI/UX:** Fix responsive layout issues (overflow/clipping) for the Add and Edit modals in the Staff section.
- [x] **UI:** Add an Email input field to the User Add/Edit modals.
- [x] **UI:** Show a global confirmation dialog to the user before executing any delete operation.
- [x] **Feature:** Auto-generate and display a default `UserCode` when the User Modal opens (user can still override it).
- [ ] **UI/UX:** Redesign the initial onboarding (Restaurant Creation) screen to match the current global UI design system.
- [ ] **Validation:** Implement client-side form validation to prevent sending invalid data and triggering 400/500 backend errors.
- [ ] **UI:** Implement a global Error Handling mechanism (e.g., Toast notifications) to properly display API error messages across all pages.

## ⚙️ Backend (.NET Core)
- [x] **Feature [Category]:** Implement foreign key validation in the category deletion endpoint to prevent deleting categories with linked products.
- [x] **Feature [User]:** Implement the missing Update method for the User entity.
- [x] **Refactor [Auth]:** Update the CQRS Commands and Handlers to allow user login using either Email or Username.
- [ ] **Refactor [Auth]:** Remove manual `UserCode` input during Registration; implement auto-generation (Guid/Random) on the backend.
- [ ] **Validation:** Review and optimize all existing backend validation rules (FluentValidation); implement missing feature-specific validations.
- [ ] **Refactor:** Review and optimize all incoming Data Transfer Objects (DTOs) and AutoMapper configurations.
- [ ] **Refactor:** Rename the generic `Update` method within the Table entity/service to `UpdateTable` for better naming consistency.
- [ ] **Refactor [Category]:** Review and optimize the business logic inside `DeleteCategoryCommandHandler`.