using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RestaurantBill.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AllowPickupWithoutPaymentPreference : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Gel al'da ödeme tercihi boş olabilir (restoranda ödenir, yöntem teslimde belli olur). Mevcut kayıtlar değişmez.
            migrationBuilder.AlterColumn<int>(
                name: "PaymentPreference",
                table: "DeliveryOrders",
                type: "integer",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Tercihsiz gel al siparişleri eski şemada "nakit" sayılır (Nakit = 2); yoksa NOT NULL'a dönülemez.
            migrationBuilder.Sql("UPDATE \"DeliveryOrders\" SET \"PaymentPreference\" = 2 WHERE \"PaymentPreference\" IS NULL;");

            migrationBuilder.AlterColumn<int>(
                name: "PaymentPreference",
                table: "DeliveryOrders",
                type: "integer",
                nullable: false,
                defaultValue: 2,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);
        }
    }
}
