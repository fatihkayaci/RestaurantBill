using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RestaurantBill.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddRestaurantSiteContent : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Description",
                table: "Products",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<bool>(
                name: "IsFeatured",
                table: "Products",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<TimeOnly>(
                name: "ClosesAt",
                table: "Branches",
                type: "time without time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "HoursNote",
                table: "Branches",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "InstagramUrl",
                table: "Branches",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<TimeOnly>(
                name: "OpensAt",
                table: "Branches",
                type: "time without time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SiteAbout",
                table: "Branches",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "SiteAboutImage",
                table: "Branches",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "SiteAccentColor",
                table: "Branches",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "SiteCoverImage",
                table: "Branches",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "SiteHeadline",
                table: "Branches",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "SiteTagline",
                table: "Branches",
                type: "text",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Description",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "IsFeatured",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "ClosesAt",
                table: "Branches");

            migrationBuilder.DropColumn(
                name: "HoursNote",
                table: "Branches");

            migrationBuilder.DropColumn(
                name: "InstagramUrl",
                table: "Branches");

            migrationBuilder.DropColumn(
                name: "OpensAt",
                table: "Branches");

            migrationBuilder.DropColumn(
                name: "SiteAbout",
                table: "Branches");

            migrationBuilder.DropColumn(
                name: "SiteAboutImage",
                table: "Branches");

            migrationBuilder.DropColumn(
                name: "SiteAccentColor",
                table: "Branches");

            migrationBuilder.DropColumn(
                name: "SiteCoverImage",
                table: "Branches");

            migrationBuilder.DropColumn(
                name: "SiteHeadline",
                table: "Branches");

            migrationBuilder.DropColumn(
                name: "SiteTagline",
                table: "Branches");
        }
    }
}
