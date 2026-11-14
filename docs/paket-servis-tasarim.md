# Paket servis + rezervasyon ön sipariş — tasarım (14 Kasım 2026)

> Read-only design produced by a subagent. Nothing implemented yet. Paths: B = `Backend\`, F = `frontend\src\`.

## Owner decisions already made
- **Customer:** no account. Name, phone and address. SMS OTP comes later, through the `RequirePhoneVerification` setting (default off) and `ISmsSender.IsConfigured`.
- **Delivery area:** a neighbourhood list per branch, each with a fee, a minimum order and an ETA.
- **Order intake:** online orders need cashier or admin acceptance (with an ETA, sound alert) before they go to the kitchen. Rejections carry a reason the customer sees. The customer follows the order on a tracking page.
- **Courier:** new role `Courier`. The courier has a mobile screen. The cashier counts each courier's cash.
- **Payment:** at the door only, cash or card. No online payment.
- **Pre-orders:** a customer with a reservation can place an optional pre-order, starting 60 minutes before the reservation (configurable per branch).

## Existing code (key refs)
**Public site and tenancy**
- `B\RestaurantBill.WebAPI\Controllers\PublicController.cs`: anonymous `api/public`, rate policies `public-read` (120/min) and `public-write` (20/min) in `Extensions\RateLimitingExtensions.cs`.
- `...\CustomerSite\CustomerSiteScope.cs`: tenant from `X-Restaurant-Slug`. The branch comes from the query, or defaults to the oldest one.

**Ordering**
- QR ordering template: `Domain\Entities\OrderRequest.cs` and `...\CustomerSite\Public\CreateOrderRequest.cs`. The staff approve step is `...\CustomerSite\Staff\OrderRequests.cs:62-157`.
- Reservation: `Domain\Entities\Reservation.cs` (TableId, GuestName, Contact, ReservationTime, EndTime, PartySize, Status Active/Cancelled/Pending/Confirmed/Rejected). It has no Seated or NoShow status. Settings are the `ReservationSettings` JSON on Branch, which is the pattern to copy.
- `Order.cs`: `TableId` is required and there is no `BranchId`. Branch filters go through `Table.Region.BranchId` in `BranchScope.InBranches`, the kitchen, cashier, shift summary, dashboard, overdue and ItemsReady queries, `RequestBill`, `StaffAccess` and `MappingExtensions` `OrderDto.TableName`.

**Payment and reporting**
- `CreatePaymentCommandHandler`: needs the cashier's own shift. For waiters it uses any open shift with `UserId` set to the waiter. It writes one payment per tax rate, and a cash transaction In only for cash payments.
- `PaymentLineItem` requires a ProductId. Reports are built from payments and their line items.

**Other**
- `ISmsSender` exists, but the implementation only logs. `VerificationCode` requires a `UserId`, so it can't be reused for customer codes.
- Products have no out-of-stock flag.
- **Security:** the public status endpoints use the entity Guid (time-ordered) as their secret. New features should use a random token, and the old endpoints should be migrated later.

## Architecture
- **Keep `Order` for the kitchen, bills and payments. Add a `DeliveryOrder` for the customer lifecycle.**
  - When staff accept a `DeliveryOrder`, create an `Order` with `OrderType = Delivery`, `TableId = null`, `BranchId` and `DeliveryFee`, with lines at the snapshot prices.
  - Rejected orders never touch `Orders`.
- **`Order` changes:**
  - add `BranchId` (backfill from table → region) and switch every branch filter to it
  - make `TableId` nullable
  - add `OrderType` (DineIn = 1, Delivery = 2, Takeaway = 3), `DeliveryFee` and `DeliveryFeeSettled`
  - add `AddItemAtPrice(...)`
  - table-only actions (transfer, request bill, table release) return "Paket siparişte masa işlemi yapılamaz"
- **Delivery fee:** its own `Payment` row with `IsDeliveryFee = true` and no line items, so product reports stay unchanged. Online orders get no discount.
- **Pricing:** `IOrderPricingService.PriceCartAsync(branchId, lines)` is the single place prices are computed. The client sends ids and quantities plus an `expectedTotal`. If the total differs, return 409 "Fiyatlar güncellendi".
- **Cart line DTO:** polymorphic from day one, `kind: product | setMenu` with `selections`. It is ready for set menus.
- **Settings:**
  - `OnlineOrderSettings`: JSON on Branch with Enabled, weekly hours, LastOrderMinutesBeforeClose, DefaultEta, AutoRejectAfterMinutes, per-phone limits, AcceptCash/AcceptCard, RequirePhoneVerification, PreOrderEnabled and PreOrderLeadMinutes.
  - `Branch.OnlineOrdersPaused` is a separate bool.
- **Stock:** add `Product.IsOutOfStock` ("Tükendi").
- **Courier cash:**
  - The courier's "Teslim ettim · Nakit/Kart" only records `CollectedMethod/Amount/At`.
  - The cashier's "Teslim al" settles the collected orders into the cashier's own shift, with `Payment.UserId = courier`. For this, extract a `PaymentRecorder` from `CreatePaymentCommandHandler`.

## Schema (one combined migration)
1. **Orders:** add `BranchId` (backfill SQL, then NOT NULL), make `TableId` nullable, add `OrderType`, `DeliveryFee` and `DeliveryFeeSettled`.
2. **Payments:** add `IsDeliveryFee`.
3. **Products:** add `IsOutOfStock`.
4. **Branches:** add `OnlineOrderSettings` (json) and `OnlineOrdersPaused`.
5. **DeliveryZones:** BranchId, Name, Fee, MinOrderAmount, EstimatedMinutes, IsActive, SortOrder.
6. **BlockedPhones:** BranchId, Phone (+90 normalised), Reason, BlockedByUserId.
7. **DeliveryOrders:**
   - identity: Number (per branch), AccessToken (128-bit random), ClientRequestId (idempotency), Status
   - customer: name, phone, address, directions, note
   - zone snapshot; Subtotal, Fee, Total; PaymentPreference
   - OrderId?, ETA, accept and reject fields
   - CourierUserId?, dispatch and deliver timestamps, collection and settlement fields
   - ClientIp
8. **DeliveryOrderLines:** Kind, ProductId?, SetMenuId?, NameSnapshot, UnitPrice, TaxRate, Quantity, Note, SelectionsJson.
9. **CustomerPhoneVerifications:** the code is stored hashed. Expiry 5 minutes, at most 5 attempts. On success it issues a single-use verification token.
10. **Reservations:** add `AccessToken`, `SeatedAt` and `NoShowAt`. New statuses Seated = 6 and NoShow = 7.
11. **OrderRequests:** add `ReservationId?`, `Kind` (TableQr / PreOrder) and `RejectReason`. New statuses Cancelled = 4 and Expired = 5. OrderRequestItem gets a `UnitPrice` snapshot.
12. **UserRole:** add `Courier = 6`.

## API
**Public**
- `GET online-ordering`
- `POST delivery-orders/quote`
- `POST delivery-orders`, under the `delivery-write` policy (5 per 10 minutes per IP)
- `GET` and `POST cancel` on `delivery-orders/{token}`
- `phone-verification/send` and `phone-verification/verify`
- `reservations/by-token/{token}` and `PUT`/`DELETE reservations/{token}/pre-order`

**Staff** (`api/delivery-orders`; Owner, Admin, Cashier)
- list and get
- accept, reject, cancel, assign-courier, dispatch and deliver
- `couriers`, `couriers/{id}/handover`
- `online-ordering/pause`

**Courier** (`api/courier`)
- `orders`, dispatch and deliver

**Settings**
- `online-ordering/settings`, `delivery-zones`, `blocked-phones`
- `PATCH product/{id}/stock`

**Reservation**
- `{id}/seat`, `{id}/no-show` and `{id}/fire-pre-order`

## Frontend
- **Public delivery site:**
  - `/siparis` (pick the neighbourhood first, menu, cart, checkout with a honeypot field)
  - `/siparis/takip/:token` (stepper, polling every 15 seconds)
  - `/rezervasyon/:token`
- **Admin:** `/admin/online-ordering` with tabs Genel, Çalışma saatleri, Teslimat bölgeleri and Engelli numaralar.
- **Staff:**
  - `OnlineOrdersBoard`, as a cashier tab and as the `/admin/online-orders` page
  - `OnlineOrderAlerts`, a repeating sound and a badge
  - `CourierCashPanel`
- **Courier:** `/courier` with big cards, a `tel:` link, a Google Maps link and the dispatch/deliver buttons.
- **Role plumbing:** `auth.ts`, `App.tsx`, `StaffPage`, `ProfilePage` and the users types.

## Status machines
**DeliveryOrder**
- Received → Accepted (creates the Order) → Preparing (automatic, from kitchen status) → Ready (automatic) → OnTheWay (needs a courier) → Delivered.
- Received → Rejected, by staff or automatically after N minutes. Received → Cancelled by the customer. Accepted through OnTheWay → Cancelled by staff, with a reason.
- Settlement is not a status. It only sets `SettledAt` and closes the Order.

**Pre-order**
- The pre-order is an `OrderRequest` with Kind = PreOrder, held as Pending. The window runs from ReservationTime − lead time and is open only for Confirmed reservations.
- It is sent to the kitchen on staff "Geldi" (seat) or "Mutfağa şimdi gönder", reusing the approve logic extracted into `ApplyRequestToTableOrder`.
- It is cancelled when the reservation is cancelled, rejected or marked no-show. It expires after ReservationTime + 30 minutes if the guest is not seated.

## Security
- **Prices** are always computed on the server.
- **Limits:**
  - order total at most ₺20,000
  - quantity 1–50 per line, at most 50 lines
  - the zone and its minimum are checked, as are opening hours (in the branch time zone)
  - per phone: open-order and per-day limits; per IP: at most 3 orders waiting for acceptance
- **Abuse filters:** honeypot, blocked phones, idempotency through `ClientRequestId`.
- **Tokens:** random, never derived from Ids. The tracking page shows the phone and name masked.
- **Scoping and audit:** staff endpoints are limited to their branch. A courier sees only their own orders. Every transition is audit-logged.

## SignalR and kitchen
- **Groups:** `HubGroups.OnlineOrders(branchId)` in `CashierHub` sends `DeliveryOrdersChanged`. A new `CourierHub` at `/courier-hub` handles couriers.
- **Kitchen ticket:** `OrderDto` gets `OrderType`, `DeliveryNumber` and `ZoneName`. `TableName` becomes "PAKET #123 · Moda".
- **ItemsReady:** must skip delivery orders, or route them to `OnlineOrders`.

## Implementation chunks
Start these only after the current WIP branch is committed with its own migration.
- **C1: Foundation.** Domain and persistence, the `BranchId` backfill, every branch query switched to `BranchId`, role plumbing. Highest conflict risk.
- **C2: Delivery backend.** Public and staff endpoints, the pricing service, the OTP abstraction, rate policies, hub groups, the auto-reject background service, and Preparing/Ready derived from the kitchen.
- **C3: Courier and settlement.** `PaymentRecorder`, the courier endpoints and hub, the handover, and the courier UI and cash panel.
- **C4: Frontend.** Public ordering, admin settings, the orders board and alerts, and the stock toggle.
- **C5: Reservation pre-order, end to end.**

## Open questions (owner)
1. When the courier collects a card payment, does the order close immediately, or wait for the cashier's handover?
2. Which tax rate does the delivery fee use: the branch rate, or a separate one?
3. Takeaway (gel-al) now or later?
4. Blocked phone: show "Restoranı arayın", or return a silent fake success?
5. Auto-reject unanswered orders after 10 minutes? Configurable?
6. Pre-order: send to the kitchen only when the guest arrives ("Geldi"), plus a manual send? Can the customer change the pre-order until then?
7. One branch per public site, or a branch picker?
8. Are couriers tied to one branch or shared between branches?
