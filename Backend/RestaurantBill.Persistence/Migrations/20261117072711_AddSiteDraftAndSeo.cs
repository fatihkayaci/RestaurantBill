using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RestaurantBill.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddSiteDraftAndSeo : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "SiteDraft",
                table: "Branches",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "SiteDraftUpdatedAt",
                table: "Branches",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SiteDraftVersion",
                table: "Branches",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "SitePublishedAt",
                table: "Branches",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SiteDraft",
                table: "Branches");

            migrationBuilder.DropColumn(
                name: "SiteDraftUpdatedAt",
                table: "Branches");

            migrationBuilder.DropColumn(
                name: "SiteDraftVersion",
                table: "Branches");

            migrationBuilder.DropColumn(
                name: "SitePublishedAt",
                table: "Branches");
        }
    }
}
