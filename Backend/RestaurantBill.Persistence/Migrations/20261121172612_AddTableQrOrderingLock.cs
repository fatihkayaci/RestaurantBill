using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RestaurantBill.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddTableQrOrderingLock : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "QrOwnerTokenHash",
                table: "Orders");

            migrationBuilder.AddColumn<bool>(
                name: "CanLockQr",
                table: "UserBranches",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "QrOrderingLocked",
                table: "Tables",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<Guid>(
                name: "OrderId",
                table: "OrderRequests",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_OrderRequests_OrderId",
                table: "OrderRequests",
                column: "OrderId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_OrderRequests_OrderId",
                table: "OrderRequests");

            migrationBuilder.DropColumn(
                name: "CanLockQr",
                table: "UserBranches");

            migrationBuilder.DropColumn(
                name: "QrOrderingLocked",
                table: "Tables");

            migrationBuilder.DropColumn(
                name: "OrderId",
                table: "OrderRequests");

            migrationBuilder.AddColumn<string>(
                name: "QrOwnerTokenHash",
                table: "Orders",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);
        }
    }
}
