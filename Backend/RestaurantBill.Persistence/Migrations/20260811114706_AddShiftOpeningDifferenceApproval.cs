using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RestaurantBill.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddShiftOpeningDifferenceApproval : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "OpeningDifferenceApprovedAt",
                table: "Shifts",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "OpeningDifferenceApprovedByUserId",
                table: "Shifts",
                type: "uuid",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "OpeningDifferenceApprovedAt",
                table: "Shifts");

            migrationBuilder.DropColumn(
                name: "OpeningDifferenceApprovedByUserId",
                table: "Shifts");
        }
    }
}
