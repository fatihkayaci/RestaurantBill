START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261122063812_AddQrTableFeatures') THEN
    ALTER TABLE "Products" ADD "Allergens" integer NOT NULL DEFAULT 0;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261122063812_AddQrTableFeatures') THEN
    ALTER TABLE "Products" ADD "DietTags" integer NOT NULL DEFAULT 0;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261122063812_AddQrTableFeatures') THEN
    ALTER TABLE "Orders" ADD "BillPaymentHint" integer;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261122063812_AddQrTableFeatures') THEN
    ALTER TABLE "Orders" ADD "BillSplitCount" integer;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261122063812_AddQrTableFeatures') THEN
    ALTER TABLE "OrderRequests" ADD "ItemsLinked" boolean NOT NULL DEFAULT FALSE;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261122063812_AddQrTableFeatures') THEN
    ALTER TABLE "OrderItems" ADD "OrderRequestId" uuid;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261122063812_AddQrTableFeatures') THEN
    ALTER TABLE "Categories" ADD "AvailableDays" integer;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261122063812_AddQrTableFeatures') THEN
    ALTER TABLE "Categories" ADD "AvailableFrom" time without time zone;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261122063812_AddQrTableFeatures') THEN
    ALTER TABLE "Categories" ADD "AvailableUntil" time without time zone;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261122063812_AddQrTableFeatures') THEN
    CREATE INDEX "IX_OrderItems_OrderRequestId" ON "OrderItems" ("OrderRequestId") WHERE "OrderRequestId" IS NOT NULL;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261122063812_AddQrTableFeatures') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20261122063812_AddQrTableFeatures', '9.0.9');
    END IF;
END $EF$;
COMMIT;

