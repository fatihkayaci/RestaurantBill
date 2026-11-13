using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RestaurantBill.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddStaffRegionsAndWaiterPermissions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "CanCancelAndDiscount",
                table: "UserBranches",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "CanTakeOrders",
                table: "UserBranches",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "CanTakePayment",
                table: "UserBranches",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "CanTransferAndReserve",
                table: "UserBranches",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<List<Guid>>(
                name: "RegionIds",
                table: "UserBranches",
                type: "uuid[]",
                nullable: false,
                defaultValueSql: "'{}'");

            // Yeni üyeliklerde varsayılan: yalnızca "Masa aç / sipariş al" açık (entity varsayılanıyla aynı).
            migrationBuilder.Sql("""UPDATE "UserBranches" SET "CanTakeOrders" = TRUE;""");

            // Mevcut garsonlar (Role = 2) bugün yapabildiklerini korur: sipariş almak, siparişi / bekleyen ürünü
            // iptal etmek, rezervasyon ve QR sipariş talepleri. Ödeme ekranları garsona hiç açık değildi, o kapalı kalır.
            migrationBuilder.Sql("""UPDATE "UserBranches" SET "CanCancelAndDiscount" = TRUE, "CanTransferAndReserve" = TRUE WHERE "Role" = 2;""");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CanCancelAndDiscount",
                table: "UserBranches");

            migrationBuilder.DropColumn(
                name: "CanTakeOrders",
                table: "UserBranches");

            migrationBuilder.DropColumn(
                name: "CanTakePayment",
                table: "UserBranches");

            migrationBuilder.DropColumn(
                name: "CanTransferAndReserve",
                table: "UserBranches");

            migrationBuilder.DropColumn(
                name: "RegionIds",
                table: "UserBranches");
        }
    }
}
