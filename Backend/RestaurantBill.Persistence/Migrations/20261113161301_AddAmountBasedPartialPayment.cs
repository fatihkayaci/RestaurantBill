using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RestaurantBill.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddAmountBasedPartialPayment : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsOnAccount",
                table: "Payments",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<decimal>(
                name: "PrepaidAmount",
                table: "Payments",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "TaxRate",
                table: "Payments",
                type: "numeric(5,2)",
                precision: 5,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "PaidOnAccount",
                table: "Orders",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            // Eski ödeme satırlarının KDV oranı matrah/KDV'den geri hesaplanır (vergi raporu artık satırın oranını kullanır).
            migrationBuilder.Sql(
                "UPDATE \"Payments\" SET \"TaxRate\" = ROUND(\"TaxAmount\" / \"Matrah\" * 100) WHERE \"Matrah\" > 0 AND \"TaxAmount\" > 0;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsOnAccount",
                table: "Payments");

            migrationBuilder.DropColumn(
                name: "PrepaidAmount",
                table: "Payments");

            migrationBuilder.DropColumn(
                name: "TaxRate",
                table: "Payments");

            migrationBuilder.DropColumn(
                name: "PaidOnAccount",
                table: "Orders");
        }
    }
}
