using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RestaurantBill.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddCourierCashCountAndBlockedAttempts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "HandoverCashDifference",
                table: "DeliveryOrders",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "HandoverCountedCash",
                table: "DeliveryOrders",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "BlockedAttemptCount",
                table: "BlockedPhones",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastBlockedAttemptAt",
                table: "BlockedPhones",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "SourceDeliveryOrderId",
                table: "BlockedPhones",
                type: "uuid",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "HandoverCashDifference",
                table: "DeliveryOrders");

            migrationBuilder.DropColumn(
                name: "HandoverCountedCash",
                table: "DeliveryOrders");

            migrationBuilder.DropColumn(
                name: "BlockedAttemptCount",
                table: "BlockedPhones");

            migrationBuilder.DropColumn(
                name: "LastBlockedAttemptAt",
                table: "BlockedPhones");

            migrationBuilder.DropColumn(
                name: "SourceDeliveryOrderId",
                table: "BlockedPhones");
        }
    }
}
