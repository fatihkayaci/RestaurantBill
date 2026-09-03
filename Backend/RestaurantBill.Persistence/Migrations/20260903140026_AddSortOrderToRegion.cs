using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RestaurantBill.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddSortOrderToRegion : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "SortOrder",
                table: "Regions",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SortOrder",
                table: "Regions");
        }
    }
}
