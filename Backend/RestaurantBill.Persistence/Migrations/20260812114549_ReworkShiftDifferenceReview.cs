using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RestaurantBill.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ReworkShiftDifferenceReview : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "LinkedClosingShiftId",
                table: "Shifts");

            migrationBuilder.RenameColumn(
                name: "OpeningDifferenceApprovedByUserId",
                table: "Shifts",
                newName: "OpeningDifferenceReviewedByUserId");

            migrationBuilder.RenameColumn(
                name: "OpeningDifferenceApprovedAt",
                table: "Shifts",
                newName: "OpeningDifferenceReviewedAt");

            migrationBuilder.RenameColumn(
                name: "ClosingDifferenceApprovedByUserId",
                table: "Shifts",
                newName: "ClosingDifferenceReviewedByUserId");

            migrationBuilder.RenameColumn(
                name: "ClosingDifferenceApprovedAt",
                table: "Shifts",
                newName: "ClosingDifferenceReviewedAt");

            migrationBuilder.AddColumn<string>(
                name: "ClosingDifferenceReviewNote",
                table: "Shifts",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ClosingDifferenceReviewStatus",
                table: "Shifts",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "OpeningDifferenceReviewNote",
                table: "Shifts",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "OpeningDifferenceReviewStatus",
                table: "Shifts",
                type: "integer",
                nullable: false,
                defaultValue: 1);

            // Backfill: eski model altında ApprovedAt dolu olan kayıtlar zaten onaylanmıştı (Approved=2),
            // boş olanlar hâlâ bekliyordu (Pending=1). Reddetme kavramı eski modelde yoktu.
            migrationBuilder.Sql(
                "UPDATE \"Shifts\" SET \"OpeningDifferenceReviewStatus\" = CASE WHEN \"OpeningDifferenceReviewedAt\" IS NOT NULL THEN 2 ELSE 1 END " +
                "WHERE \"OpeningDifference\" <> 0;");

            migrationBuilder.Sql(
                "UPDATE \"Shifts\" SET \"ClosingDifferenceReviewStatus\" = CASE WHEN \"ClosingDifferenceReviewedAt\" IS NOT NULL THEN 2 ELSE 1 END " +
                "WHERE \"Difference\" IS NOT NULL AND \"Difference\" <> 0;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ClosingDifferenceReviewNote",
                table: "Shifts");

            migrationBuilder.DropColumn(
                name: "ClosingDifferenceReviewStatus",
                table: "Shifts");

            migrationBuilder.DropColumn(
                name: "OpeningDifferenceReviewNote",
                table: "Shifts");

            migrationBuilder.DropColumn(
                name: "OpeningDifferenceReviewStatus",
                table: "Shifts");

            migrationBuilder.RenameColumn(
                name: "OpeningDifferenceReviewedByUserId",
                table: "Shifts",
                newName: "OpeningDifferenceApprovedByUserId");

            migrationBuilder.RenameColumn(
                name: "OpeningDifferenceReviewedAt",
                table: "Shifts",
                newName: "OpeningDifferenceApprovedAt");

            migrationBuilder.RenameColumn(
                name: "ClosingDifferenceReviewedByUserId",
                table: "Shifts",
                newName: "ClosingDifferenceApprovedByUserId");

            migrationBuilder.RenameColumn(
                name: "ClosingDifferenceReviewedAt",
                table: "Shifts",
                newName: "ClosingDifferenceApprovedAt");

            migrationBuilder.AddColumn<Guid>(
                name: "LinkedClosingShiftId",
                table: "Shifts",
                type: "uuid",
                nullable: true);
        }
    }
}
