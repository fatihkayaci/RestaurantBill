using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RestaurantBill.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddMenuSortOrder : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "SortOrder",
                table: "Products",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "SortOrder",
                table: "Categories",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            // Mevcut veride görünen sıra korunur: kategoriler sitedeki gibi eklenme sırasıyla,
            // ürünler kategorileri içinde ad sırasıyla numaralanır. Bundan sonra sırayı yönetici belirler.
            migrationBuilder.Sql("""
                UPDATE "Categories" c SET "SortOrder" = r.rn
                FROM (SELECT "Id", ROW_NUMBER() OVER (PARTITION BY "BranchId" ORDER BY "CreatedAt", "Name") - 1 AS rn
                      FROM "Categories") r
                WHERE c."Id" = r."Id";

                UPDATE "Products" p SET "SortOrder" = r.rn
                FROM (SELECT "Id", ROW_NUMBER() OVER (PARTITION BY "CategoryId" ORDER BY "Name") - 1 AS rn
                      FROM "Products") r
                WHERE p."Id" = r."Id";
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SortOrder",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "SortOrder",
                table: "Categories");
        }
    }
}
