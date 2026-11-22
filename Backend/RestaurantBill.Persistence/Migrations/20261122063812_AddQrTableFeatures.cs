using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RestaurantBill.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddQrTableFeatures : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Allergens",
                table: "Products",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "DietTags",
                table: "Products",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "BillPaymentHint",
                table: "Orders",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "BillSplitCount",
                table: "Orders",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "ItemsLinked",
                table: "OrderRequests",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<Guid>(
                name: "OrderRequestId",
                table: "OrderItems",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "AvailableDays",
                table: "Categories",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<TimeOnly>(
                name: "AvailableFrom",
                table: "Categories",
                type: "time without time zone",
                nullable: true);

            migrationBuilder.AddColumn<TimeOnly>(
                name: "AvailableUntil",
                table: "Categories",
                type: "time without time zone",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_OrderItems_OrderRequestId",
                table: "OrderItems",
                column: "OrderRequestId",
                filter: "\"OrderRequestId\" IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_OrderItems_OrderRequestId",
                table: "OrderItems");

            migrationBuilder.DropColumn(
                name: "Allergens",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "DietTags",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "BillPaymentHint",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "BillSplitCount",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "ItemsLinked",
                table: "OrderRequests");

            migrationBuilder.DropColumn(
                name: "OrderRequestId",
                table: "OrderItems");

            migrationBuilder.DropColumn(
                name: "AvailableDays",
                table: "Categories");

            migrationBuilder.DropColumn(
                name: "AvailableFrom",
                table: "Categories");

            migrationBuilder.DropColumn(
                name: "AvailableUntil",
                table: "Categories");
        }
    }
}
