using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RestaurantBill.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddReportIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Shifts_BranchId",
                table: "Shifts");

            migrationBuilder.DropIndex(
                name: "IX_Payments_CashRegisterId",
                table: "Payments");

            migrationBuilder.CreateIndex(
                name: "IX_Shifts_BranchId_OpenedAt",
                table: "Shifts",
                columns: new[] { "BranchId", "OpenedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Payments_CashRegisterId_CreatedAt",
                table: "Payments",
                columns: new[] { "CashRegisterId", "CreatedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Shifts_BranchId_OpenedAt",
                table: "Shifts");

            migrationBuilder.DropIndex(
                name: "IX_Payments_CashRegisterId_CreatedAt",
                table: "Payments");

            migrationBuilder.CreateIndex(
                name: "IX_Shifts_BranchId",
                table: "Shifts",
                column: "BranchId");

            migrationBuilder.CreateIndex(
                name: "IX_Payments_CashRegisterId",
                table: "Payments",
                column: "CashRegisterId");
        }
    }
}
