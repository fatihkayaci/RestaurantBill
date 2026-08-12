using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RestaurantBill.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class RenameShiftDifferenceApprovalToClosing : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "DifferenceApprovedByUserId",
                table: "Shifts",
                newName: "ClosingDifferenceApprovedByUserId");

            migrationBuilder.RenameColumn(
                name: "DifferenceApprovedAt",
                table: "Shifts",
                newName: "ClosingDifferenceApprovedAt");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "ClosingDifferenceApprovedByUserId",
                table: "Shifts",
                newName: "DifferenceApprovedByUserId");

            migrationBuilder.RenameColumn(
                name: "ClosingDifferenceApprovedAt",
                table: "Shifts",
                newName: "DifferenceApprovedAt");
        }
    }
}
