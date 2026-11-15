using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RestaurantBill.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddProductCostCashierPermsTableScopeSetMenus : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Kasiyer yetkileri: kasiyer bugüne kadar indirim ve masa aktarımı yapabiliyordu, mevcut satırlar
            // bunu korur (entity varsayılanıyla aynı: açık, indirim sınırı %100).
            migrationBuilder.AddColumn<bool>(
                name: "CanApplyDiscount",
                table: "UserBranches",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "CanTransferTables",
                table: "UserBranches",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<int>(
                name: "MaxDiscountPercent",
                table: "UserBranches",
                type: "integer",
                nullable: false,
                defaultValue: 100);

            // Mevcut garsonlarda masa kısıtı yok: boş dizi.
            migrationBuilder.AddColumn<List<Guid>>(
                name: "RestrictedRegionIds",
                table: "UserBranches",
                type: "uuid[]",
                nullable: false,
                defaultValueSql: "'{}'");

            migrationBuilder.AddColumn<List<Guid>>(
                name: "TableIds",
                table: "UserBranches",
                type: "uuid[]",
                nullable: false,
                defaultValueSql: "'{}'");

            migrationBuilder.AddColumn<decimal>(
                name: "Cost",
                table: "Products",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AlterColumn<Guid>(
                name: "ProductId",
                table: "PaymentLineItems",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AddColumn<Guid>(
                name: "SetMenuId",
                table: "PaymentLineItems",
                type: "uuid",
                nullable: true);

            migrationBuilder.AlterColumn<Guid>(
                name: "ProductId",
                table: "OrderItems",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AddColumn<Guid>(
                name: "ParentOrderItemId",
                table: "OrderItems",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "SetMenuId",
                table: "OrderItems",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "SetMenus",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    BranchId = table.Column<Guid>(type: "uuid", nullable: false),
                    CategoryId = table.Column<Guid>(type: "uuid", nullable: true),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false, defaultValue: ""),
                    Price = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    ImageUrl = table.Column<string>(type: "text", nullable: false, defaultValue: ""),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    CreatedUser = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SetMenus", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SetMenus_Branches_BranchId",
                        column: x => x.BranchId,
                        principalTable: "Branches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SetMenus_Categories_CategoryId",
                        column: x => x.CategoryId,
                        principalTable: "Categories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "SetMenuSlots",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SetMenuId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    CreatedUser = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SetMenuSlots", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SetMenuSlots_SetMenus_SetMenuId",
                        column: x => x.SetMenuId,
                        principalTable: "SetMenus",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SetMenuSlotOptions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SetMenuSlotId = table.Column<Guid>(type: "uuid", nullable: false),
                    ProductId = table.Column<Guid>(type: "uuid", nullable: false),
                    Surcharge = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    IsDefault = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedUser = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SetMenuSlotOptions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SetMenuSlotOptions_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_SetMenuSlotOptions_SetMenuSlots_SetMenuSlotId",
                        column: x => x.SetMenuSlotId,
                        principalTable: "SetMenuSlots",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PaymentLineItems_SetMenuId",
                table: "PaymentLineItems",
                column: "SetMenuId");

            migrationBuilder.CreateIndex(
                name: "IX_OrderItems_ParentOrderItemId",
                table: "OrderItems",
                column: "ParentOrderItemId");

            migrationBuilder.CreateIndex(
                name: "IX_OrderItems_SetMenuId",
                table: "OrderItems",
                column: "SetMenuId");

            migrationBuilder.AddCheckConstraint(
                name: "CK_OrderItems_ProductOrSetMenu",
                table: "OrderItems",
                sql: "(\"ProductId\" IS NULL) <> (\"SetMenuId\" IS NULL)");

            migrationBuilder.CreateIndex(
                name: "IX_SetMenus_BranchId",
                table: "SetMenus",
                column: "BranchId");

            migrationBuilder.CreateIndex(
                name: "IX_SetMenus_CategoryId",
                table: "SetMenus",
                column: "CategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_SetMenuSlotOptions_ProductId",
                table: "SetMenuSlotOptions",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_SetMenuSlotOptions_SetMenuSlotId",
                table: "SetMenuSlotOptions",
                column: "SetMenuSlotId");

            migrationBuilder.CreateIndex(
                name: "IX_SetMenuSlots_SetMenuId",
                table: "SetMenuSlots",
                column: "SetMenuId");

            migrationBuilder.AddForeignKey(
                name: "FK_OrderItems_OrderItems_ParentOrderItemId",
                table: "OrderItems",
                column: "ParentOrderItemId",
                principalTable: "OrderItems",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_OrderItems_SetMenus_SetMenuId",
                table: "OrderItems",
                column: "SetMenuId",
                principalTable: "SetMenus",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_OrderItems_OrderItems_ParentOrderItemId",
                table: "OrderItems");

            migrationBuilder.DropForeignKey(
                name: "FK_OrderItems_SetMenus_SetMenuId",
                table: "OrderItems");

            migrationBuilder.DropTable(
                name: "SetMenuSlotOptions");

            migrationBuilder.DropTable(
                name: "SetMenuSlots");

            migrationBuilder.DropTable(
                name: "SetMenus");

            migrationBuilder.DropIndex(
                name: "IX_PaymentLineItems_SetMenuId",
                table: "PaymentLineItems");

            migrationBuilder.DropIndex(
                name: "IX_OrderItems_ParentOrderItemId",
                table: "OrderItems");

            migrationBuilder.DropIndex(
                name: "IX_OrderItems_SetMenuId",
                table: "OrderItems");

            migrationBuilder.DropCheckConstraint(
                name: "CK_OrderItems_ProductOrSetMenu",
                table: "OrderItems");

            migrationBuilder.DropColumn(
                name: "CanApplyDiscount",
                table: "UserBranches");

            migrationBuilder.DropColumn(
                name: "CanTransferTables",
                table: "UserBranches");

            migrationBuilder.DropColumn(
                name: "MaxDiscountPercent",
                table: "UserBranches");

            migrationBuilder.DropColumn(
                name: "RestrictedRegionIds",
                table: "UserBranches");

            migrationBuilder.DropColumn(
                name: "TableIds",
                table: "UserBranches");

            migrationBuilder.DropColumn(
                name: "Cost",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "SetMenuId",
                table: "PaymentLineItems");

            migrationBuilder.DropColumn(
                name: "ParentOrderItemId",
                table: "OrderItems");

            migrationBuilder.DropColumn(
                name: "SetMenuId",
                table: "OrderItems");

            migrationBuilder.AlterColumn<Guid>(
                name: "ProductId",
                table: "PaymentLineItems",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AlterColumn<Guid>(
                name: "ProductId",
                table: "OrderItems",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);
        }
    }
}
