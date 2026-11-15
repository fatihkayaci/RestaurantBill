using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RestaurantBill.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddSetMenuDiscountsAndSlotCategory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "CategoryId",
                table: "SetMenuSlots",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "DiscountType",
                table: "SetMenuSlotOptions",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<decimal>(
                name: "DiscountValue",
                table: "SetMenuSlotOptions",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<int>(
                name: "DiscountType",
                table: "SetMenus",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<decimal>(
                name: "DiscountValue",
                table: "SetMenus",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.CreateIndex(
                name: "IX_SetMenuSlots_CategoryId",
                table: "SetMenuSlots",
                column: "CategoryId");

            migrationBuilder.AddForeignKey(
                name: "FK_SetMenuSlots_Categories_CategoryId",
                table: "SetMenuSlots",
                column: "CategoryId",
                principalTable: "Categories",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_SetMenuSlots_Categories_CategoryId",
                table: "SetMenuSlots");

            migrationBuilder.DropIndex(
                name: "IX_SetMenuSlots_CategoryId",
                table: "SetMenuSlots");

            migrationBuilder.DropColumn(
                name: "CategoryId",
                table: "SetMenuSlots");

            migrationBuilder.DropColumn(
                name: "DiscountType",
                table: "SetMenuSlotOptions");

            migrationBuilder.DropColumn(
                name: "DiscountValue",
                table: "SetMenuSlotOptions");

            migrationBuilder.DropColumn(
                name: "DiscountType",
                table: "SetMenus");

            migrationBuilder.DropColumn(
                name: "DiscountValue",
                table: "SetMenus");
        }
    }
}
