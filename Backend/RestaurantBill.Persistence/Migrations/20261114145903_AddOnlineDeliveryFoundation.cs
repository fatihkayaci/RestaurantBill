using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RestaurantBill.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddOnlineDeliveryFoundation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Rezervasyon erişim token'ı: önce boş geçilebilir eklenir, mevcut satırlara AccessToken.New() ile aynı
            // biçimde (32 küçük hex) rastgele değer verilir, sonra NOT NULL yapılır. Unique index aşağıda, doldurma
            // sonrasında oluşturulur.
            migrationBuilder.AddColumn<string>(
                name: "AccessToken",
                table: "Reservations",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.Sql(@"
UPDATE ""Reservations""
SET ""AccessToken"" = md5(gen_random_uuid()::text || gen_random_uuid()::text)
WHERE ""AccessToken"" IS NULL OR ""AccessToken"" = '';");

            migrationBuilder.Sql(@"ALTER TABLE ""Reservations"" ALTER COLUMN ""AccessToken"" SET NOT NULL;");

            migrationBuilder.AddColumn<DateTime>(
                name: "NoShowAt",
                table: "Reservations",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "SeatedAt",
                table: "Reservations",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsOutOfStock",
                table: "Products",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsDeliveryFee",
                table: "Payments",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AlterColumn<Guid>(
                name: "TableId",
                table: "Orders",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            // Orders.BranchId: önce boş geçilebilir eklenir, masa → bölge üzerinden doldurulur, boş kalan satır varsa
            // migration durur (satırlar sessizce silinmez), sonra NOT NULL yapılır. Index ve FK aşağıda, doldurma
            // sonrasında oluşturulur.
            migrationBuilder.AddColumn<Guid>(
                name: "BranchId",
                table: "Orders",
                type: "uuid",
                nullable: true);

            migrationBuilder.Sql(@"
UPDATE ""Orders"" AS o
SET ""BranchId"" = r.""BranchId""
FROM ""Tables"" AS t
JOIN ""Regions"" AS r ON r.""Id"" = t.""RegionId""
WHERE t.""Id"" = o.""TableId"" AND o.""BranchId"" IS NULL;");

            migrationBuilder.Sql(@"
DO $check$
DECLARE missing integer;
BEGIN
    SELECT COUNT(*) INTO missing FROM ""Orders"" WHERE ""BranchId"" IS NULL;
    IF missing > 0 THEN
        RAISE EXCEPTION 'AddOnlineDeliveryFoundation: % siparişin BranchId değeri masa/bölge üzerinden bulunamadı. Satırları inceleyin.', missing;
    END IF;
END
$check$;");

            migrationBuilder.Sql(@"ALTER TABLE ""Orders"" ALTER COLUMN ""BranchId"" SET NOT NULL;");

            migrationBuilder.AddColumn<decimal>(
                name: "DeliveryFee",
                table: "Orders",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<bool>(
                name: "DeliveryFeeSettled",
                table: "Orders",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "OrderType",
                table: "Orders",
                type: "integer",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<int>(
                name: "Kind",
                table: "OrderRequests",
                type: "integer",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<string>(
                name: "RejectReason",
                table: "OrderRequests",
                type: "character varying(300)",
                maxLength: 300,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<Guid>(
                name: "ReservationId",
                table: "OrderRequests",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "UnitPrice",
                table: "OrderRequestItems",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "OnlineOrderSettings",
                table: "Branches",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "OnlineOrdersPaused",
                table: "Branches",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "BlockedPhones",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    BranchId = table.Column<Guid>(type: "uuid", nullable: false),
                    Phone = table.Column<string>(type: "character varying(13)", maxLength: 13, nullable: false),
                    Reason = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    BlockedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedUser = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BlockedPhones", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BlockedPhones_Branches_BranchId",
                        column: x => x.BranchId,
                        principalTable: "Branches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CustomerPhoneVerifications",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    BranchId = table.Column<Guid>(type: "uuid", nullable: false),
                    Phone = table.Column<string>(type: "character varying(13)", maxLength: 13, nullable: false),
                    CodeHash = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Attempts = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    VerifiedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    VerificationTokenHash = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    TokenUsedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedUser = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CustomerPhoneVerifications", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CustomerPhoneVerifications_Branches_BranchId",
                        column: x => x.BranchId,
                        principalTable: "Branches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "DeliveryZones",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    BranchId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Fee = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    MinOrderAmount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    EstimatedMinutes = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    CreatedUser = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DeliveryZones", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DeliveryZones_Branches_BranchId",
                        column: x => x.BranchId,
                        principalTable: "Branches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "DeliveryOrders",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    BranchId = table.Column<Guid>(type: "uuid", nullable: false),
                    Number = table.Column<int>(type: "integer", nullable: false),
                    AccessToken = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    ClientRequestId = table.Column<Guid>(type: "uuid", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    CustomerName = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    CustomerPhone = table.Column<string>(type: "character varying(13)", maxLength: 13, nullable: false),
                    Address = table.Column<string>(type: "character varying(400)", maxLength: 400, nullable: false),
                    AddressDirections = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    Note = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    DeliveryZoneId = table.Column<Guid>(type: "uuid", nullable: true),
                    ZoneName = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Subtotal = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    DeliveryFee = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Total = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    PaymentPreference = table.Column<int>(type: "integer", nullable: false),
                    OrderId = table.Column<Guid>(type: "uuid", nullable: true),
                    EstimatedMinutes = table.Column<int>(type: "integer", nullable: true),
                    AcceptedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    AcceptedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    RejectedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    RejectedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    RejectReason = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    CancelledAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CancelledByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    CancelReason = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    CourierUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    DispatchedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DeliveredAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CollectedMethod = table.Column<int>(type: "integer", nullable: true),
                    CollectedAmount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    CollectedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    SettledAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    SettledByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    ClientIp = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    CreatedUser = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DeliveryOrders", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DeliveryOrders_Branches_BranchId",
                        column: x => x.BranchId,
                        principalTable: "Branches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DeliveryOrders_DeliveryZones_DeliveryZoneId",
                        column: x => x.DeliveryZoneId,
                        principalTable: "DeliveryZones",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_DeliveryOrders_Orders_OrderId",
                        column: x => x.OrderId,
                        principalTable: "Orders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "DeliveryOrderLines",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    DeliveryOrderId = table.Column<Guid>(type: "uuid", nullable: false),
                    Kind = table.Column<int>(type: "integer", nullable: false),
                    ProductId = table.Column<Guid>(type: "uuid", nullable: true),
                    SetMenuId = table.Column<Guid>(type: "uuid", nullable: true),
                    NameSnapshot = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    UnitPrice = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    TaxRate = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    Quantity = table.Column<int>(type: "integer", nullable: false),
                    Note = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    SelectionsJson = table.Column<string>(type: "jsonb", nullable: false),
                    CreatedUser = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DeliveryOrderLines", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DeliveryOrderLines_DeliveryOrders_DeliveryOrderId",
                        column: x => x.DeliveryOrderId,
                        principalTable: "DeliveryOrders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DeliveryOrderLines_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_DeliveryOrderLines_SetMenus_SetMenuId",
                        column: x => x.SetMenuId,
                        principalTable: "SetMenus",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Reservations_AccessToken",
                table: "Reservations",
                column: "AccessToken",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Orders_BranchId_Status",
                table: "Orders",
                columns: new[] { "BranchId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_OrderRequests_ReservationId_Status",
                table: "OrderRequests",
                columns: new[] { "ReservationId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_BlockedPhones_BranchId_Phone",
                table: "BlockedPhones",
                columns: new[] { "BranchId", "Phone" },
                unique: true,
                filter: "\"IsDeleted\" = false");

            migrationBuilder.CreateIndex(
                name: "IX_CustomerPhoneVerifications_BranchId_Phone_CreatedAt",
                table: "CustomerPhoneVerifications",
                columns: new[] { "BranchId", "Phone", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_CustomerPhoneVerifications_VerificationTokenHash",
                table: "CustomerPhoneVerifications",
                column: "VerificationTokenHash");

            migrationBuilder.CreateIndex(
                name: "IX_DeliveryOrderLines_DeliveryOrderId",
                table: "DeliveryOrderLines",
                column: "DeliveryOrderId");

            migrationBuilder.CreateIndex(
                name: "IX_DeliveryOrderLines_ProductId",
                table: "DeliveryOrderLines",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_DeliveryOrderLines_SetMenuId",
                table: "DeliveryOrderLines",
                column: "SetMenuId");

            migrationBuilder.CreateIndex(
                name: "IX_DeliveryOrders_AccessToken",
                table: "DeliveryOrders",
                column: "AccessToken",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DeliveryOrders_BranchId_ClientRequestId",
                table: "DeliveryOrders",
                columns: new[] { "BranchId", "ClientRequestId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DeliveryOrders_BranchId_CustomerPhone_CreatedAt",
                table: "DeliveryOrders",
                columns: new[] { "BranchId", "CustomerPhone", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_DeliveryOrders_BranchId_Number",
                table: "DeliveryOrders",
                columns: new[] { "BranchId", "Number" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DeliveryOrders_BranchId_Status",
                table: "DeliveryOrders",
                columns: new[] { "BranchId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_DeliveryOrders_CourierUserId_Status",
                table: "DeliveryOrders",
                columns: new[] { "CourierUserId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_DeliveryOrders_DeliveryZoneId",
                table: "DeliveryOrders",
                column: "DeliveryZoneId");

            migrationBuilder.CreateIndex(
                name: "IX_DeliveryOrders_OrderId",
                table: "DeliveryOrders",
                column: "OrderId");

            migrationBuilder.CreateIndex(
                name: "IX_DeliveryZones_BranchId_SortOrder",
                table: "DeliveryZones",
                columns: new[] { "BranchId", "SortOrder" });

            migrationBuilder.AddForeignKey(
                name: "FK_OrderRequests_Reservations_ReservationId",
                table: "OrderRequests",
                column: "ReservationId",
                principalTable: "Reservations",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Orders_Branches_BranchId",
                table: "Orders",
                column: "BranchId",
                principalTable: "Branches",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_OrderRequests_Reservations_ReservationId",
                table: "OrderRequests");

            migrationBuilder.DropForeignKey(
                name: "FK_Orders_Branches_BranchId",
                table: "Orders");

            migrationBuilder.DropTable(
                name: "BlockedPhones");

            migrationBuilder.DropTable(
                name: "CustomerPhoneVerifications");

            migrationBuilder.DropTable(
                name: "DeliveryOrderLines");

            migrationBuilder.DropTable(
                name: "DeliveryOrders");

            migrationBuilder.DropTable(
                name: "DeliveryZones");

            migrationBuilder.DropIndex(
                name: "IX_Reservations_AccessToken",
                table: "Reservations");

            migrationBuilder.DropIndex(
                name: "IX_Orders_BranchId_Status",
                table: "Orders");

            migrationBuilder.DropIndex(
                name: "IX_OrderRequests_ReservationId_Status",
                table: "OrderRequests");

            migrationBuilder.DropColumn(
                name: "AccessToken",
                table: "Reservations");

            migrationBuilder.DropColumn(
                name: "NoShowAt",
                table: "Reservations");

            migrationBuilder.DropColumn(
                name: "SeatedAt",
                table: "Reservations");

            migrationBuilder.DropColumn(
                name: "IsOutOfStock",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "IsDeliveryFee",
                table: "Payments");

            migrationBuilder.DropColumn(
                name: "BranchId",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "DeliveryFee",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "DeliveryFeeSettled",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "OrderType",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "Kind",
                table: "OrderRequests");

            migrationBuilder.DropColumn(
                name: "RejectReason",
                table: "OrderRequests");

            migrationBuilder.DropColumn(
                name: "ReservationId",
                table: "OrderRequests");

            migrationBuilder.DropColumn(
                name: "UnitPrice",
                table: "OrderRequestItems");

            migrationBuilder.DropColumn(
                name: "OnlineOrderSettings",
                table: "Branches");

            migrationBuilder.DropColumn(
                name: "OnlineOrdersPaused",
                table: "Branches");

            // Masasız (paket servis) sipariş varken TableId yeniden zorunlu yapılamaz. Sessizce silmek yerine dur.
            migrationBuilder.Sql(@"
DO $check$
DECLARE tableless integer;
BEGIN
    SELECT COUNT(*) INTO tableless FROM ""Orders"" WHERE ""TableId"" IS NULL;
    IF tableless > 0 THEN
        RAISE EXCEPTION 'AddOnlineDeliveryFoundation Down: % masasız sipariş var, TableId NOT NULL yapılamaz. Önce bu siparişleri ele alın.', tableless;
    END IF;
END
$check$;");

            migrationBuilder.AlterColumn<Guid>(
                name: "TableId",
                table: "Orders",
                type: "uuid",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);
        }
    }
}
