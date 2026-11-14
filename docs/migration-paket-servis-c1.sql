START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261114145903_AddOnlineDeliveryFoundation') THEN
    ALTER TABLE "Reservations" ADD "AccessToken" character varying(64);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261114145903_AddOnlineDeliveryFoundation') THEN

    UPDATE "Reservations"
    SET "AccessToken" = md5(gen_random_uuid()::text || gen_random_uuid()::text)
    WHERE "AccessToken" IS NULL OR "AccessToken" = '';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261114145903_AddOnlineDeliveryFoundation') THEN
    ALTER TABLE "Reservations" ALTER COLUMN "AccessToken" SET NOT NULL;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261114145903_AddOnlineDeliveryFoundation') THEN
    ALTER TABLE "Reservations" ADD "NoShowAt" timestamp with time zone;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261114145903_AddOnlineDeliveryFoundation') THEN
    ALTER TABLE "Reservations" ADD "SeatedAt" timestamp with time zone;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261114145903_AddOnlineDeliveryFoundation') THEN
    ALTER TABLE "Products" ADD "IsOutOfStock" boolean NOT NULL DEFAULT FALSE;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261114145903_AddOnlineDeliveryFoundation') THEN
    ALTER TABLE "Payments" ADD "IsDeliveryFee" boolean NOT NULL DEFAULT FALSE;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261114145903_AddOnlineDeliveryFoundation') THEN
    ALTER TABLE "Orders" ALTER COLUMN "TableId" DROP NOT NULL;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261114145903_AddOnlineDeliveryFoundation') THEN
    ALTER TABLE "Orders" ADD "BranchId" uuid;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261114145903_AddOnlineDeliveryFoundation') THEN

    UPDATE "Orders" AS o
    SET "BranchId" = r."BranchId"
    FROM "Tables" AS t
    JOIN "Regions" AS r ON r."Id" = t."RegionId"
    WHERE t."Id" = o."TableId" AND o."BranchId" IS NULL;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261114145903_AddOnlineDeliveryFoundation') THEN

    DO $check$
    DECLARE missing integer;
    BEGIN
        SELECT COUNT(*) INTO missing FROM "Orders" WHERE "BranchId" IS NULL;
        IF missing > 0 THEN
            RAISE EXCEPTION 'AddOnlineDeliveryFoundation: % siparişin BranchId değeri masa/bölge üzerinden bulunamadı. Satırları inceleyin.', missing;
        END IF;
    END
    $check$;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261114145903_AddOnlineDeliveryFoundation') THEN
    ALTER TABLE "Orders" ALTER COLUMN "BranchId" SET NOT NULL;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261114145903_AddOnlineDeliveryFoundation') THEN
    ALTER TABLE "Orders" ADD "DeliveryFee" numeric(18,2) NOT NULL DEFAULT 0.0;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261114145903_AddOnlineDeliveryFoundation') THEN
    ALTER TABLE "Orders" ADD "DeliveryFeeSettled" boolean NOT NULL DEFAULT FALSE;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261114145903_AddOnlineDeliveryFoundation') THEN
    ALTER TABLE "Orders" ADD "OrderType" integer NOT NULL DEFAULT 1;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261114145903_AddOnlineDeliveryFoundation') THEN
    ALTER TABLE "OrderRequests" ADD "Kind" integer NOT NULL DEFAULT 1;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261114145903_AddOnlineDeliveryFoundation') THEN
    ALTER TABLE "OrderRequests" ADD "RejectReason" character varying(300) NOT NULL DEFAULT '';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261114145903_AddOnlineDeliveryFoundation') THEN
    ALTER TABLE "OrderRequests" ADD "ReservationId" uuid;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261114145903_AddOnlineDeliveryFoundation') THEN
    ALTER TABLE "OrderRequestItems" ADD "UnitPrice" numeric(18,2);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261114145903_AddOnlineDeliveryFoundation') THEN
    ALTER TABLE "Branches" ADD "OnlineOrderSettings" jsonb;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261114145903_AddOnlineDeliveryFoundation') THEN
    ALTER TABLE "Branches" ADD "OnlineOrdersPaused" boolean NOT NULL DEFAULT FALSE;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261114145903_AddOnlineDeliveryFoundation') THEN
    CREATE TABLE "BlockedPhones" (
        "Id" uuid NOT NULL,
        "BranchId" uuid NOT NULL,
        "Phone" character varying(13) NOT NULL,
        "Reason" character varying(200) NOT NULL,
        "BlockedByUserId" uuid NOT NULL,
        "CreatedUser" uuid NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone,
        "IsDeleted" boolean NOT NULL,
        CONSTRAINT "PK_BlockedPhones" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_BlockedPhones_Branches_BranchId" FOREIGN KEY ("BranchId") REFERENCES "Branches" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261114145903_AddOnlineDeliveryFoundation') THEN
    CREATE TABLE "CustomerPhoneVerifications" (
        "Id" uuid NOT NULL,
        "BranchId" uuid NOT NULL,
        "Phone" character varying(13) NOT NULL,
        "CodeHash" character varying(128) NOT NULL,
        "ExpiresAt" timestamp with time zone NOT NULL,
        "Attempts" integer NOT NULL,
        "Status" integer NOT NULL,
        "VerifiedAt" timestamp with time zone,
        "VerificationTokenHash" character varying(128),
        "TokenUsedAt" timestamp with time zone,
        "CreatedUser" uuid NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone,
        "IsDeleted" boolean NOT NULL,
        CONSTRAINT "PK_CustomerPhoneVerifications" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_CustomerPhoneVerifications_Branches_BranchId" FOREIGN KEY ("BranchId") REFERENCES "Branches" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261114145903_AddOnlineDeliveryFoundation') THEN
    CREATE TABLE "DeliveryZones" (
        "Id" uuid NOT NULL,
        "BranchId" uuid NOT NULL,
        "Name" character varying(80) NOT NULL,
        "Fee" numeric(18,2) NOT NULL,
        "MinOrderAmount" numeric(18,2) NOT NULL,
        "EstimatedMinutes" integer NOT NULL,
        "IsActive" boolean NOT NULL,
        "SortOrder" integer NOT NULL,
        "CreatedUser" uuid NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone,
        "IsDeleted" boolean NOT NULL,
        CONSTRAINT "PK_DeliveryZones" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_DeliveryZones_Branches_BranchId" FOREIGN KEY ("BranchId") REFERENCES "Branches" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261114145903_AddOnlineDeliveryFoundation') THEN
    CREATE TABLE "DeliveryOrders" (
        "Id" uuid NOT NULL,
        "BranchId" uuid NOT NULL,
        "Number" integer NOT NULL,
        "AccessToken" character varying(64) NOT NULL,
        "ClientRequestId" uuid NOT NULL,
        "Status" integer NOT NULL,
        "CustomerName" character varying(80) NOT NULL,
        "CustomerPhone" character varying(13) NOT NULL,
        "Address" character varying(400) NOT NULL,
        "AddressDirections" character varying(300) NOT NULL,
        "Note" character varying(500) NOT NULL,
        "DeliveryZoneId" uuid,
        "ZoneName" character varying(80) NOT NULL,
        "Subtotal" numeric(18,2) NOT NULL,
        "DeliveryFee" numeric(18,2) NOT NULL,
        "Total" numeric(18,2) NOT NULL,
        "PaymentPreference" integer NOT NULL,
        "OrderId" uuid,
        "EstimatedMinutes" integer,
        "AcceptedAt" timestamp with time zone,
        "AcceptedByUserId" uuid,
        "RejectedAt" timestamp with time zone,
        "RejectedByUserId" uuid,
        "RejectReason" character varying(300) NOT NULL,
        "CancelledAt" timestamp with time zone,
        "CancelledByUserId" uuid,
        "CancelReason" character varying(300) NOT NULL,
        "CourierUserId" uuid,
        "DispatchedAt" timestamp with time zone,
        "DeliveredAt" timestamp with time zone,
        "CollectedMethod" integer,
        "CollectedAmount" numeric(18,2),
        "CollectedAt" timestamp with time zone,
        "SettledAt" timestamp with time zone,
        "SettledByUserId" uuid,
        "ClientIp" character varying(64) NOT NULL,
        "CreatedUser" uuid NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone,
        "IsDeleted" boolean NOT NULL,
        CONSTRAINT "PK_DeliveryOrders" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_DeliveryOrders_Branches_BranchId" FOREIGN KEY ("BranchId") REFERENCES "Branches" ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_DeliveryOrders_DeliveryZones_DeliveryZoneId" FOREIGN KEY ("DeliveryZoneId") REFERENCES "DeliveryZones" ("Id") ON DELETE SET NULL,
        CONSTRAINT "FK_DeliveryOrders_Orders_OrderId" FOREIGN KEY ("OrderId") REFERENCES "Orders" ("Id") ON DELETE SET NULL
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261114145903_AddOnlineDeliveryFoundation') THEN
    CREATE TABLE "DeliveryOrderLines" (
        "Id" uuid NOT NULL,
        "DeliveryOrderId" uuid NOT NULL,
        "Kind" integer NOT NULL,
        "ProductId" uuid,
        "SetMenuId" uuid,
        "NameSnapshot" character varying(100) NOT NULL,
        "UnitPrice" numeric(18,2) NOT NULL,
        "TaxRate" numeric(5,2) NOT NULL,
        "Quantity" integer NOT NULL,
        "Note" character varying(300) NOT NULL,
        "SelectionsJson" jsonb NOT NULL,
        "CreatedUser" uuid NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone,
        "IsDeleted" boolean NOT NULL,
        CONSTRAINT "PK_DeliveryOrderLines" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_DeliveryOrderLines_DeliveryOrders_DeliveryOrderId" FOREIGN KEY ("DeliveryOrderId") REFERENCES "DeliveryOrders" ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_DeliveryOrderLines_Products_ProductId" FOREIGN KEY ("ProductId") REFERENCES "Products" ("Id") ON DELETE SET NULL,
        CONSTRAINT "FK_DeliveryOrderLines_SetMenus_SetMenuId" FOREIGN KEY ("SetMenuId") REFERENCES "SetMenus" ("Id") ON DELETE SET NULL
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261114145903_AddOnlineDeliveryFoundation') THEN
    CREATE UNIQUE INDEX "IX_Reservations_AccessToken" ON "Reservations" ("AccessToken");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261114145903_AddOnlineDeliveryFoundation') THEN
    CREATE INDEX "IX_Orders_BranchId_Status" ON "Orders" ("BranchId", "Status");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261114145903_AddOnlineDeliveryFoundation') THEN
    CREATE INDEX "IX_OrderRequests_ReservationId_Status" ON "OrderRequests" ("ReservationId", "Status");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261114145903_AddOnlineDeliveryFoundation') THEN
    CREATE UNIQUE INDEX "IX_BlockedPhones_BranchId_Phone" ON "BlockedPhones" ("BranchId", "Phone") WHERE "IsDeleted" = false;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261114145903_AddOnlineDeliveryFoundation') THEN
    CREATE INDEX "IX_CustomerPhoneVerifications_BranchId_Phone_CreatedAt" ON "CustomerPhoneVerifications" ("BranchId", "Phone", "CreatedAt");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261114145903_AddOnlineDeliveryFoundation') THEN
    CREATE INDEX "IX_CustomerPhoneVerifications_VerificationTokenHash" ON "CustomerPhoneVerifications" ("VerificationTokenHash");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261114145903_AddOnlineDeliveryFoundation') THEN
    CREATE INDEX "IX_DeliveryOrderLines_DeliveryOrderId" ON "DeliveryOrderLines" ("DeliveryOrderId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261114145903_AddOnlineDeliveryFoundation') THEN
    CREATE INDEX "IX_DeliveryOrderLines_ProductId" ON "DeliveryOrderLines" ("ProductId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261114145903_AddOnlineDeliveryFoundation') THEN
    CREATE INDEX "IX_DeliveryOrderLines_SetMenuId" ON "DeliveryOrderLines" ("SetMenuId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261114145903_AddOnlineDeliveryFoundation') THEN
    CREATE UNIQUE INDEX "IX_DeliveryOrders_AccessToken" ON "DeliveryOrders" ("AccessToken");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261114145903_AddOnlineDeliveryFoundation') THEN
    CREATE UNIQUE INDEX "IX_DeliveryOrders_BranchId_ClientRequestId" ON "DeliveryOrders" ("BranchId", "ClientRequestId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261114145903_AddOnlineDeliveryFoundation') THEN
    CREATE INDEX "IX_DeliveryOrders_BranchId_CustomerPhone_CreatedAt" ON "DeliveryOrders" ("BranchId", "CustomerPhone", "CreatedAt");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261114145903_AddOnlineDeliveryFoundation') THEN
    CREATE UNIQUE INDEX "IX_DeliveryOrders_BranchId_Number" ON "DeliveryOrders" ("BranchId", "Number");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261114145903_AddOnlineDeliveryFoundation') THEN
    CREATE INDEX "IX_DeliveryOrders_BranchId_Status" ON "DeliveryOrders" ("BranchId", "Status");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261114145903_AddOnlineDeliveryFoundation') THEN
    CREATE INDEX "IX_DeliveryOrders_CourierUserId_Status" ON "DeliveryOrders" ("CourierUserId", "Status");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261114145903_AddOnlineDeliveryFoundation') THEN
    CREATE INDEX "IX_DeliveryOrders_DeliveryZoneId" ON "DeliveryOrders" ("DeliveryZoneId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261114145903_AddOnlineDeliveryFoundation') THEN
    CREATE INDEX "IX_DeliveryOrders_OrderId" ON "DeliveryOrders" ("OrderId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261114145903_AddOnlineDeliveryFoundation') THEN
    CREATE INDEX "IX_DeliveryZones_BranchId_SortOrder" ON "DeliveryZones" ("BranchId", "SortOrder");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261114145903_AddOnlineDeliveryFoundation') THEN
    ALTER TABLE "OrderRequests" ADD CONSTRAINT "FK_OrderRequests_Reservations_ReservationId" FOREIGN KEY ("ReservationId") REFERENCES "Reservations" ("Id") ON DELETE CASCADE;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261114145903_AddOnlineDeliveryFoundation') THEN
    ALTER TABLE "Orders" ADD CONSTRAINT "FK_Orders_Branches_BranchId" FOREIGN KEY ("BranchId") REFERENCES "Branches" ("Id") ON DELETE CASCADE;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261114145903_AddOnlineDeliveryFoundation') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20261114145903_AddOnlineDeliveryFoundation', '9.0.9');
    END IF;
END $EF$;
COMMIT;

