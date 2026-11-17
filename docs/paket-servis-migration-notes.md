# Paket servis: migration notes

All delivery chunks (C1 to C5) share one EF migration, created after the last chunk. This file lists the SQL that the
generated migration cannot write by itself. Each chunk adds its own section. Paste the SQL into the migration's `Up`
with `migrationBuilder.Sql(...)`, at the point given in each section.

## C1: Foundation

### 1. `Orders.BranchId` backfill

EF generates `AddColumn<Guid>("BranchId", "Orders", nullable: false, defaultValue: Guid.Empty)` and then the FK
`FK_Orders_Branches_BranchId`. Existing rows would get `00000000-...` and the FK would fail. Change the generated
steps to this order:

1. Add the column as **nullable**: edit the generated `AddColumn` to `nullable: true` and remove `defaultValue`.
2. Backfill from table → region:

   ```sql
   UPDATE "Orders" AS o
   SET "BranchId" = r."BranchId"
   FROM "Tables" AS t
   JOIN "Regions" AS r ON r."Id" = t."RegionId"
   WHERE t."Id" = o."TableId" AND o."BranchId" IS NULL;
   ```

3. Check the result. Every order has a table today, because `TableId` was required, so this must return 0. If it
   does not, stop and look at the rows; do not delete them silently.

   ```sql
   SELECT COUNT(*) FROM "Orders" WHERE "BranchId" IS NULL;
   ```

4. Make the column required:

   ```sql
   ALTER TABLE "Orders" ALTER COLUMN "BranchId" SET NOT NULL;
   ```

5. Then create the index `IX_Orders_BranchId_Status` and the FK `FK_Orders_Branches_BranchId` (ON DELETE CASCADE),
   as generated.

`TableId` becomes nullable through a plain `AlterColumn`. Its FK stays ON DELETE CASCADE, as before.

New columns whose database default does the backfill. No SQL is needed, but check that the generated migration has
these defaults:

| Column | Default |
| --- | --- |
| `Orders.OrderType` | `1` (DineIn) |
| `Orders.DeliveryFee` | `0` |
| `Orders.DeliveryFeeSettled` | `false` |
| `Payments.IsDeliveryFee` | `false` |
| `Products.IsOutOfStock` | `false` |
| `Branches.OnlineOrdersPaused` | `false` |
| `Branches.OnlineOrderSettings` | `NULL` (jsonb, which means default settings with online ordering off) |
| `OrderRequests.Kind` | `1` (TableQr) |
| `OrderRequests.RejectReason` | `''` |
| `OrderRequests.ReservationId` | `NULL` |
| `OrderRequestItems.UnitPrice` | `NULL` (QR requests use the current price at approval) |
| `Reservations.SeatedAt`, `Reservations.NoShowAt` | `NULL` |

### 2. `Reservations.AccessToken` backfill

**Decision:** existing reservations get a random token, and the column is NOT NULL with a unique index. We chose this
over allowing null for old rows because confirmed reservations made before the deploy still need a pre-order link in
C5. With null tokens they would need a second code path.

The format matches `AccessToken.New()` in the app: 32 lowercase hex characters. `gen_random_uuid()` is built into
PostgreSQL 13 and later, so no extension is needed. MD5 of two random v4 UUIDs (244 random bits) gives 128 bits of
output.

1. Add the column as **nullable** (edit the generated `AddColumn` to `nullable: true`, without the `''` default).
2. Backfill:

   ```sql
   UPDATE "Reservations"
   SET "AccessToken" = md5(gen_random_uuid()::text || gen_random_uuid()::text)
   WHERE "AccessToken" IS NULL OR "AccessToken" = '';
   ```

3. Make it required, then create the generated unique index `IX_Reservations_AccessToken`:

   ```sql
   ALTER TABLE "Reservations" ALTER COLUMN "AccessToken" SET NOT NULL;
   ```

### 3. New tables

`DeliveryOrders`, `DeliveryOrderLines`, `DeliveryZones`, `BlockedPhones` and `CustomerPhoneVerifications` are new.
They need no data. `BlockedPhones` has the filtered unique index `("BranchId", "Phone") WHERE "IsDeleted" = false`.

### 4. Demo seed

`DefaultData` now adds the demo courier `courier` / `Courier123*`. The seed only runs on an empty database (no
companies), so an existing development database does not get it. Add a Courier user from the Staff page instead.

## C2: Delivery backend

No schema changes and no SQL. C2 only reads and writes the tables C1 created. One non-schema domain change: `DeliveryOrder.AutoRejectReason` is now the owner's wording, "Restoran şu an yanıt veremedi.", and `DeliveryOrder.UnassignCourier()` was added.

## C5: Reservation pre-order

No schema changes and no SQL. C5 only reads and writes the columns C1 added (`Reservations.AccessToken/SeatedAt/NoShowAt`,
`OrderRequests.ReservationId/Kind`, `OrderRequestItems.UnitPrice`). One non-schema domain change: `OrderRequest.UpdateNote()`
was added so a customer can change the note when replacing a pending pre-order.

## C3: Courier and settlement

No schema changes and no SQL. The handover writes `Payments` (including the `IsDeliveryFee` row from C1),
`PaymentLineItems` and `CashTransactions`, and sets `DeliveryOrders.SettledAt` / `SettledByUserId` and
`Orders.DeliveryFeeSettled`, all of which C1 created.

## C4: Frontend

No schema changes and no SQL. Small backend additions only: `GET api/online-ordering/status` (`{ branchId, paused, enabled }`, Owner/Admin/Cashier, for the board's pause switch), `OnlineOrderingPauseDto.Enabled`, a guard that rejects adding products or set menus to a delivery order once it is OnTheWay or Delivered, and a courier hub notification when the kitchen makes an assigned delivery order Ready.

## Courier cash count and blocked-number attempts

Migration: `20261116182140_AddCourierCashCountAndBlockedAttempts`. Only additive columns, all nullable or with a
default; no SQL and no backfill. `dotnet ef migrations has-pending-model-changes` reports no changes.

| Column | Type | Default | Purpose |
| --- | --- | --- | --- |
| `DeliveryOrders.HandoverCountedCash` | `numeric(18,2)` | `NULL` | Cash the cashier counted at "Teslim al" |
| `DeliveryOrders.HandoverCashDifference` | `numeric(18,2)` | `NULL` | Counted − expected; negative means short |
| `BlockedPhones.BlockedAttemptCount` | `integer` NOT NULL | `0` | Order attempts rejected by the block |
| `BlockedPhones.LastBlockedAttemptAt` | `timestamptz` | `NULL` | Last rejected attempt |
| `BlockedPhones.SourceDeliveryOrderId` | `uuid` | `NULL` | The order the block came from (no FK) |

- There is no handover table. One handover is the set of delivery orders with the same `SettledAt`,
  `SettledByUserId` and `CourierUserId`; the handler writes them in one moment. The counted amount and the
  difference belong to the whole handover and are repeated on each of its orders. The history endpoint groups them.
- Handovers before this migration, card-only handovers and handovers sent without a count have `NULL` in both
  columns. The history shows "—" for them.
- The difference is recorded only. It does not add a cash transaction, so a shortage still shows up in the shift's
  own count at close.
- "Collected on a previous day" uses the existing `DeliveryOrders.CollectedAt` with the branch business day
  (`IBusinessDayResolver`). No new column was needed.
- Existing blocks keep `SourceDeliveryOrderId = NULL` and start counting from `0`.
