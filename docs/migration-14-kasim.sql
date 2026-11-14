START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261114141400_AddProductCostCashierPermsTableScopeSetMenus') THEN
    ALTER TABLE "UserBranches" ADD "CanApplyDiscount" boolean NOT NULL DEFAULT TRUE;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261114141400_AddProductCostCashierPermsTableScopeSetMenus') THEN
    ALTER TABLE "UserBranches" ADD "CanTransferTables" boolean NOT NULL DEFAULT TRUE;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261114141400_AddProductCostCashierPermsTableScopeSetMenus') THEN
    ALTER TABLE "UserBranches" ADD "MaxDiscountPercent" integer NOT NULL DEFAULT 100;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261114141400_AddProductCostCashierPermsTableScopeSetMenus') THEN
    ALTER TABLE "UserBranches" ADD "RestrictedRegionIds" uuid[] NOT NULL DEFAULT ('{}');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261114141400_AddProductCostCashierPermsTableScopeSetMenus') THEN
    ALTER TABLE "UserBranches" ADD "TableIds" uuid[] NOT NULL DEFAULT ('{}');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261114141400_AddProductCostCashierPermsTableScopeSetMenus') THEN
    ALTER TABLE "Products" ADD "Cost" numeric(18,2) NOT NULL DEFAULT 0.0;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261114141400_AddProductCostCashierPermsTableScopeSetMenus') THEN
    ALTER TABLE "PaymentLineItems" ALTER COLUMN "ProductId" DROP NOT NULL;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261114141400_AddProductCostCashierPermsTableScopeSetMenus') THEN
    ALTER TABLE "PaymentLineItems" ADD "SetMenuId" uuid;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261114141400_AddProductCostCashierPermsTableScopeSetMenus') THEN
    ALTER TABLE "OrderItems" ALTER COLUMN "ProductId" DROP NOT NULL;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261114141400_AddProductCostCashierPermsTableScopeSetMenus') THEN
    ALTER TABLE "OrderItems" ADD "ParentOrderItemId" uuid;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261114141400_AddProductCostCashierPermsTableScopeSetMenus') THEN
    ALTER TABLE "OrderItems" ADD "SetMenuId" uuid;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261114141400_AddProductCostCashierPermsTableScopeSetMenus') THEN
    CREATE TABLE "SetMenus" (
        "Id" uuid NOT NULL,
        "BranchId" uuid NOT NULL,
        "CategoryId" uuid,
        "Name" character varying(100) NOT NULL,
        "Description" character varying(160) NOT NULL DEFAULT '',
        "Price" numeric(18,2) NOT NULL,
        "ImageUrl" text NOT NULL DEFAULT '',
        "IsActive" boolean NOT NULL,
        "SortOrder" integer NOT NULL,
        "CreatedUser" uuid NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone,
        "IsDeleted" boolean NOT NULL,
        CONSTRAINT "PK_SetMenus" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_SetMenus_Branches_BranchId" FOREIGN KEY ("BranchId") REFERENCES "Branches" ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_SetMenus_Categories_CategoryId" FOREIGN KEY ("CategoryId") REFERENCES "Categories" ("Id") ON DELETE SET NULL
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261114141400_AddProductCostCashierPermsTableScopeSetMenus') THEN
    CREATE TABLE "SetMenuSlots" (
        "Id" uuid NOT NULL,
        "SetMenuId" uuid NOT NULL,
        "Name" character varying(60) NOT NULL,
        "SortOrder" integer NOT NULL,
        "CreatedUser" uuid NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone,
        "IsDeleted" boolean NOT NULL,
        CONSTRAINT "PK_SetMenuSlots" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_SetMenuSlots_SetMenus_SetMenuId" FOREIGN KEY ("SetMenuId") REFERENCES "SetMenus" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261114141400_AddProductCostCashierPermsTableScopeSetMenus') THEN
    CREATE TABLE "SetMenuSlotOptions" (
        "Id" uuid NOT NULL,
        "SetMenuSlotId" uuid NOT NULL,
        "ProductId" uuid NOT NULL,
        "Surcharge" numeric(18,2) NOT NULL,
        "IsDefault" boolean NOT NULL,
        "CreatedUser" uuid NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone,
        "IsDeleted" boolean NOT NULL,
        CONSTRAINT "PK_SetMenuSlotOptions" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_SetMenuSlotOptions_Products_ProductId" FOREIGN KEY ("ProductId") REFERENCES "Products" ("Id") ON DELETE RESTRICT,
        CONSTRAINT "FK_SetMenuSlotOptions_SetMenuSlots_SetMenuSlotId" FOREIGN KEY ("SetMenuSlotId") REFERENCES "SetMenuSlots" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261114141400_AddProductCostCashierPermsTableScopeSetMenus') THEN
    CREATE INDEX "IX_PaymentLineItems_SetMenuId" ON "PaymentLineItems" ("SetMenuId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261114141400_AddProductCostCashierPermsTableScopeSetMenus') THEN
    CREATE INDEX "IX_OrderItems_ParentOrderItemId" ON "OrderItems" ("ParentOrderItemId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261114141400_AddProductCostCashierPermsTableScopeSetMenus') THEN
    CREATE INDEX "IX_OrderItems_SetMenuId" ON "OrderItems" ("SetMenuId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261114141400_AddProductCostCashierPermsTableScopeSetMenus') THEN
    ALTER TABLE "OrderItems" ADD CONSTRAINT "CK_OrderItems_ProductOrSetMenu" CHECK (("ProductId" IS NULL) <> ("SetMenuId" IS NULL));
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261114141400_AddProductCostCashierPermsTableScopeSetMenus') THEN
    CREATE INDEX "IX_SetMenus_BranchId" ON "SetMenus" ("BranchId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261114141400_AddProductCostCashierPermsTableScopeSetMenus') THEN
    CREATE INDEX "IX_SetMenus_CategoryId" ON "SetMenus" ("CategoryId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261114141400_AddProductCostCashierPermsTableScopeSetMenus') THEN
    CREATE INDEX "IX_SetMenuSlotOptions_ProductId" ON "SetMenuSlotOptions" ("ProductId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261114141400_AddProductCostCashierPermsTableScopeSetMenus') THEN
    CREATE INDEX "IX_SetMenuSlotOptions_SetMenuSlotId" ON "SetMenuSlotOptions" ("SetMenuSlotId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261114141400_AddProductCostCashierPermsTableScopeSetMenus') THEN
    CREATE INDEX "IX_SetMenuSlots_SetMenuId" ON "SetMenuSlots" ("SetMenuId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261114141400_AddProductCostCashierPermsTableScopeSetMenus') THEN
    ALTER TABLE "OrderItems" ADD CONSTRAINT "FK_OrderItems_OrderItems_ParentOrderItemId" FOREIGN KEY ("ParentOrderItemId") REFERENCES "OrderItems" ("Id") ON DELETE CASCADE;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261114141400_AddProductCostCashierPermsTableScopeSetMenus') THEN
    ALTER TABLE "OrderItems" ADD CONSTRAINT "FK_OrderItems_SetMenus_SetMenuId" FOREIGN KEY ("SetMenuId") REFERENCES "SetMenus" ("Id") ON DELETE RESTRICT;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261114141400_AddProductCostCashierPermsTableScopeSetMenus') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20261114141400_AddProductCostCashierPermsTableScopeSetMenus', '9.0.9');
    END IF;
END $EF$;
COMMIT;

