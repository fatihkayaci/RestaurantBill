using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RestaurantBill.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddBranchDayEndTimeAndShiftCountStatus : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "ClosedBySystem",
                table: "Shifts",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "CountStatus",
                table: "Shifts",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<TimeOnly>(
                name: "DayEndTime",
                table: "Branches",
                type: "time without time zone",
                nullable: false,
                defaultValue: new TimeOnly(0, 0, 0));

            migrationBuilder.AddColumn<string>(
                name: "TimeZoneId",
                table: "Branches",
                type: "text",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ClosedBySystem",
                table: "Shifts");

            migrationBuilder.DropColumn(
                name: "CountStatus",
                table: "Shifts");

            migrationBuilder.DropColumn(
                name: "DayEndTime",
                table: "Branches");

            migrationBuilder.DropColumn(
                name: "TimeZoneId",
                table: "Branches");
        }
    }
}
