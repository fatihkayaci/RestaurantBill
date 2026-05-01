# 📋 Task List (TODO)

## 🏷️ Category Management
- [ ] **UI:** Show a confirmation dialog to the user before executing any delete operation.
- [ ] **Backend:** Implement validation in the category deletion endpoint to check for associated products (Foreign Key relation check).
- [ ] **UI/UX:** Prevent category deletion if it has linked products and display a warning message: *"This category contains active products. Please reassign the products to another category before deleting."*

## 🎨 Frontend (React)
- [ ] **UI/UX:** Fix responsive layout issues (overflow/clipping) for the Add and Edit modals in the Staff section.
- [ ] **UI:** Implement global error handling to ensure error messages are properly displayed across all pages.
- [ ] **UI:** Add an Email input field to the User Add/Edit modals.

## ⚙️ Backend (.NET)
- [ ] **Feature:** Auto-generate a `UserCode` during user registration (the system will suggest a code, but the user can still override it).
- [ ] **Refactor:** Review and optimize the User Request DTOs (Data Transfer Objects).
- [x] **Feature:** Implement the missing Update method for the User entity.