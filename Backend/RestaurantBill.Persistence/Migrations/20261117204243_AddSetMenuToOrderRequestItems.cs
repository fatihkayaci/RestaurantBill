using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RestaurantBill.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddSetMenuToOrderRequestItems : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<Guid>(
                name: "ProductId",
                table: "OrderRequestItems",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AddColumn<string>(
                name: "SelectionsJson",
                table: "OrderRequestItems",
                type: "jsonb",
                nullable: false,
                defaultValue: "{}");

            migrationBuilder.AddColumn<Guid>(
                name: "SetMenuId",
                table: "OrderRequestItems",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_OrderRequestItems_SetMenuId",
                table: "OrderRequestItems",
                column: "SetMenuId");

            migrationBuilder.AddForeignKey(
                name: "FK_OrderRequestItems_SetMenus_SetMenuId",
                table: "OrderRequestItems",
                column: "SetMenuId",
                principalTable: "SetMenus",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Menü kalemlerinin ürünü yok; ProductId yeniden zorunlu olmadan önce silinir.
            migrationBuilder.Sql("DELETE FROM \"OrderRequestItems\" WHERE \"ProductId\" IS NULL;");

            migrationBuilder.DropForeignKey(
                name: "FK_OrderRequestItems_SetMenus_SetMenuId",
                table: "OrderRequestItems");

            migrationBuilder.DropIndex(
                name: "IX_OrderRequestItems_SetMenuId",
                table: "OrderRequestItems");

            migrationBuilder.DropColumn(
                name: "SelectionsJson",
                table: "OrderRequestItems");

            migrationBuilder.DropColumn(
                name: "SetMenuId",
                table: "OrderRequestItems");

            migrationBuilder.AlterColumn<Guid>(
                name: "ProductId",
                table: "OrderRequestItems",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);
        }
    }
}
