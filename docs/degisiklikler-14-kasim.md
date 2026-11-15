# feat/waiter-ready-notify: uncommitted changes by feature (14 Nov 2026)

B = `Backend/RestaurantBill.`, F = `frontend/src/`. (M) modified, (A) new/untracked, (D) deleted.
Files that serve several features are listed under each one and marked *shared*.
Raw `git status --short -uall`: `status.txt`; `git diff --stat`: `diffstat.txt` (same folder).
Totals (final snapshot): 89 tracked files changed (+2749 / -1585), 65 untracked files.

## 1. Waiter ready notification (kitchen marks ready, waiter gets an alert + sound)
- (A) B/Application/DTOs/OrderItemDtos/ItemsReadyDto.cs
- (A) B/Application/Features/Orders/ItemsReady/ItemsReadyNotification.cs
- (A) B/Application/Features/Orders/Commands/UpdateOrderItemsStatus/{Command,CommandHandler,CommandValidator}.cs (bulk "ready")
- (M) B/Application/Features/Orders/Commands/UpdateOrderItemStatus/UpdateOrderItemStatusCommandHandler.cs
- (M) B/Application/Features/Orders/Commands/UpdateOrderStatus/UpdateOrderStatusCommandHandler.cs
- (M) B/Application/Interfaces/ITableNotificationService.cs
- (M) B/Infrastructure/Services/TableNotificationService.cs
- (M) B/Infrastructure/Hubs/HubGroups.cs *shared with waiter table assignment*
- (M) B/WebAPI/Controllers/OrderController.cs *shared with set menus*
- (M) B/Application.Tests/Fakes/FakeNotificationServices.cs
- (M) B/Application.Tests/Features/Orders/OrderCommandHandlerTests.cs
- (M) B/Application.Tests/Features/Users/StaffAccessTests.cs (bulk ready endpoint, category scope)
- (M) B/Integration.Tests/Features/Payments/AmountPaymentTests.cs (fake implements SendItemsReadyAsync)
- (A) F/components/layout/ItemReadyAlerts.tsx
- (A) F/lib/soundToggle.ts (shared kitchen/waiter sound helper)
- (A) F/pages/waiter/waiterSound.ts
- (A) F/pages/waiter/waiterEvents.ts
- (M) F/pages/kitchen/kitchenSound.ts (refactored onto soundToggle)
- (M) F/pages/kitchen/DashboardPage.tsx (one bulk request, one notification)
- (M) F/pages/kitchen/components/TicketCard.tsx *shared with set menus*
- (M) F/pages/waiter/Layout.tsx (sound button, alerts)
- (M) F/pages/waiter/TablesPage.tsx *shared with waiter flow speed-up*
- (M) F/pages/waiter/components/WaiterTableCard.tsx (ready highlight)
- (M) F/features/orders/types/index.ts *shared with set menus*

## 2. Product cost
- (M) B/Domain/Entities/Product.cs
- (M) B/Domain.Tests/Entities/ProductTests.cs
- (M) B/Persistence/Configurations/ProductConfiguration.cs (Cost precision 18,2)
- (M) B/Application/Features/Products/Commands/CreateProduct/{Command,CommandHandler,CommandValidator}.cs
- (M) B/Application/Features/Products/Commands/UpdateProduct/{Command,CommandHandler,CommandValidator}.cs
- (A) B/Application/DTOs/Product/ProductWithCostDto.cs
- (A) B/Application/Features/Products/Queries/GetAllProductWithCost/{Query,QueryHandler}.cs
- (M) B/WebAPI/Controllers/ProductController.cs
- (M) B/Application.Tests/Features/Products/ProductCommandHandlerTests.cs
- (M) F/features/products/api/productService.ts
- (M) F/features/products/types/index.ts *shared with set menus*
- (M) F/pages/admin/MenuPage.tsx *shared with set menus, suggestions*

## 3. Cashier permissions (CanApplyDiscount, MaxDiscountPercent, CanTransferTables)
- (M) B/Domain/Entities/UserBranch.cs *shared with waiter table assignment*
- (M) B/Application/Common/StaffAccess.cs *shared with waiter table assignment, set menus*
- (M) B/Application/Features/Users/StaffAssignment.cs *shared*
- (M) B/Application/Features/Users/Commands/CreateUser/CreateUserCommand.cs *shared*
- (M) B/Application/Features/Users/Commands/UpdateUser/UpdateUserCommand.cs *shared*
- (M) B/Application/DTOs/UserDtos/UserDto.cs *shared*
- (M) B/Application/Mappings/MappingExtensions.cs *shared with set menus*
- (M) B/Application/Features/Orders/Commands/TransferOrder/TransferOrderCommandHandler.cs
- (M) B/Application/Features/Payments/Commands/CreatePayment/CreatePaymentCommandHandler.cs *shared with set menus*
- (A) B/Application.Tests/Features/Users/CashierPermissionTests.cs
- (M) F/features/users/api/userService.ts *shared*
- (M) F/features/users/types/index.ts *shared*
- (M) F/pages/admin/StaffPage.tsx *shared with waiter table assignment, Çalışanlar rename*
- (M) F/pages/cashier/DashboardPage.tsx
- (M) F/pages/cashier/components/PaymentPanel.tsx (discount limit)

## 4. Bulk tables + suggestions
- (A) B/Application/Features/Tables/Commands/BulkCreateTables/{Command,CommandHandler,CommandValidator}.cs
- (A) B/Application/DTOs/Table/BulkCreateTablesResultDto.cs
- (M) B/WebAPI/Controllers/TableController.cs
- (M) B/Application.Tests/Features/Tables/TableCommandHandlerTests.cs
- (A) F/features/tables/components/BulkTableCreateModal.tsx
- (A) F/features/tables/tableNames.ts
- (M) F/features/tables/api/tableService.ts
- (M) F/features/tables/types/index.ts
- (M) F/pages/admin/TablesPage.tsx
- (A) F/components/ui/suggested-chips.tsx
- (M) F/components/ui/empty-state.tsx
- (A) F/features/categories/constants.ts (category name suggestions)
- (A) F/features/regions/constants.ts (region name suggestions)
- (M) F/pages/admin/MenuPage.tsx *shared*

## 5. Çalışanlar rename ("Kullanıcılar" -> "Çalışanlar" in UI and messages)
- (M) B/Application/Features/Users/Commands/CreateUser/CreateUserCommandHandler.cs
- (M) B/Application/Features/Users/Commands/UpdateUser/UpdateUserCommandHandler.cs
- (M) B/Application/Features/Users/Commands/DeleteUser/DeleteUserCommandHandler.cs
- (M) F/components/layout/AppShell.tsx *shared with set menus (Menüler nav, "Yemeklerimiz" label)*
- (M) F/components/layout/QuickAccessPanel.tsx
- (M) F/pages/admin/RestaurantPage.tsx
- (M) F/pages/reports/ReportsPage.tsx
- (M) F/pages/reports/tabs/DiscountsTab.tsx
- (M) F/pages/admin/StaffPage.tsx *shared*

## 6. QR page fix (customer stays on menu, "Siparişlerim" sheet)
- (M) F/pages/public/TableOrderPage.tsx
- (A) F/pages/public/components/MyOrdersSheet.tsx
- (A) F/pages/public/useTableOrderRequests.ts

## 7. Waiter flow speed-up (TablePanel split, cart/draft, menu cache, send bar)
- (D) F/pages/waiter/components/TablePanel.tsx
- (M) F/pages/waiter/components/AddItemsView.tsx
- (M) F/pages/waiter/components/TableWorkspace.tsx
- (M) F/pages/waiter/waiterUi.ts (note suggestions)
- (M) F/pages/waiter/TablesPage.tsx *shared* (menu prefetch, draft)
- (A) F/pages/waiter/components/{CategoryChips,LineNotesPanel,ProductRow,SendBar}.tsx
- (A) F/pages/waiter/{orderCart,orderDraft,productUsage,sendOrder,useKeyboardInset,useWaiterMenu}.ts
- (A) F/features/products/api/waiterMenuCache.ts
  (orderDraft, sendOrder, useWaiterMenu, waiterMenuCache also carry set-menu support)

## 8. Waiter table assignment (RestrictedRegionIds / TableIds)
- (M) B/Domain/Entities/UserBranch.cs *shared*
- (A) B/Application/Common/WaiterScope.cs
- (M) B/Application/Common/StaffAccess.cs *shared*
- (M) B/Application/Features/Users/StaffAssignment.cs, CreateUserCommand.cs, UpdateUserCommand.cs, UserDto.cs, MappingExtensions.cs *shared*
- (M) B/Infrastructure/Hubs/TableHub.cs
- (M) B/Infrastructure/Hubs/HubGroups.cs *shared*
- (A) B/Application.Tests/Features/Users/WaiterTableScopeTests.cs
- (A) B/Integration.Tests/Features/Hubs/WaiterHubGroupsTests.cs
- (M) F/features/users/api/userService.ts, F/features/users/types/index.ts, F/pages/admin/StaffPage.tsx *shared*

## 9. Set menus
Backend
- (A) B/Domain/Entities/SetMenu.cs (SetMenu, SetMenuSlot, SetMenuSlotOption)
- (M) B/Domain/Entities/Order.cs, OrderItem.cs, PaymentLineItem.cs
- (A) B/Persistence/Configurations/SetMenuConfiguration.cs
- (M) B/Persistence/Configurations/OrderItemConfiguration.cs, PaymentLineItemConfiguration.cs
- (M) B/Persistence/Context/RestaurantBillDbContext.cs, B/Application/Interfaces/IAppDbContext.cs
- (A) B/Application/DTOs/SetMenu/SetMenuDto.cs
- (A) B/Application/Features/SetMenus/{Create,Update,Delete,Get}SetMenu(s).cs, SetMenuInput.cs, UploadSetMenuImage.cs
- (A) B/Application/Features/Orders/Commands/AddSetMenuToOrder/{Command,CommandHandler,CommandValidator}.cs
- (M) B/Application/DTOs/OrderItemDtos/OrderItemDto.cs
- (M) B/Application/Features/Orders/Commands/RemoveProductFromOrder/{Command,CommandHandler,CommandValidator}.cs (remove by OrderItemId)
- (M) B/Application/Features/Orders/Commands/UpdateOrderItemQuantity/{Command,CommandHandler,CommandValidator}.cs (by OrderItemId)
- (M) B/Application/Features/Orders/Overdue/OverdueOrderItems.cs
- (M) B/Application/Features/Orders/Queries/OrderQueries.cs, GetAllOrdersToCashier/…Handler.cs, GetAllOrdersToKitchen/…Handler.cs
- (M) B/Application/Features/Payments/Commands/CreatePayment/CreatePaymentCommandHandler.cs *shared*
- (M) B/Application/Features/Products/Commands/DeleteProduct/DeleteProductCommandHandler.cs (block delete if used in a set menu)
- (M) B/Application/Features/Reports/Queries/GetProductReport/GetProductReportQueryHandler.cs
- (M) B/Application/Mappings/MappingExtensions.cs *shared*
- (A) B/WebAPI/Controllers/SetMenuController.cs; (M) B/WebAPI/Controllers/OrderController.cs *shared*
- (A) B/Domain.Tests/Entities/SetMenuOrderTests.cs, B/Application.Tests/Features/Orders/SetMenuOrderTests.cs, B/Integration.Tests/Features/Payments/SetMenuPaymentTests.cs
Frontend
- (M) F/App.tsx (route), F/components/layout/AppShell.tsx *shared*
- (A) F/features/setMenus/{api/setMenuService.ts, components/SetMenuEditorModal.tsx, setMenuCost.ts, types/index.ts}
- (A) F/pages/admin/SetMenusPage.tsx
- (A) F/pages/waiter/setMenuCart.ts, F/pages/waiter/components/SetMenuRow.tsx, F/pages/waiter/components/SetMenuSheet.tsx (waiter set-menu ordering; added by the parallel agent during this run)
- (M) F/features/orders/api/orderService.ts, F/features/orders/types/index.ts *shared*, F/features/products/types/index.ts *shared*
- (M) F/pages/kitchen/kitchenTickets.ts, F/pages/kitchen/components/TicketCard.tsx *shared*

## 10. Migration (combined; created in this run)
- (A) B/Persistence/Migrations/20261114141400_AddProductCostCashierPermsTableScopeSetMenus.cs
- (A) B/Persistence/Migrations/20261114141400_AddProductCostCashierPermsTableScopeSetMenus.Designer.cs
- (M) B/Persistence/Migrations/RestaurantBillDbContextModelSnapshot.cs

## 11. Docs
- (A) docs/paket-servis-tasarim.md (read-only design for delivery + reservation pre-order; nothing implemented)

## Unattributed / notes
- No file left fully unattributed. Shared files (StaffPage.tsx, MenuPage.tsx, StaffAccess.cs, MappingExtensions.cs,
  CreatePaymentCommandHandler.cs, waiter TablesPage.tsx, AppShell.tsx, OrderController.cs) mix several features
  and cannot be split into per-feature commits without `git add -p`.
- `.claude/worktrees/agent-aad339b801b545f75/` exists in the repo folder (an old agent worktree, not shown in git status).
