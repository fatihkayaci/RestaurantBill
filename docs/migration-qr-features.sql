START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261114151127_AddBranchQrFeatures') THEN
    ALTER TABLE "Branches" ADD "QrFeatures" jsonb;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261114151127_AddBranchQrFeatures') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20261114151127_AddBranchQrFeatures', '9.0.9');
    END IF;
END $EF$;
COMMIT;

