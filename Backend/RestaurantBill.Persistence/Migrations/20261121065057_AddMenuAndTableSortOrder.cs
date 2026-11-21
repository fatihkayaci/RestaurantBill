using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RestaurantBill.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddMenuAndTableSortOrder : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "SortOrder",
                table: "Tables",
                type: "integer",
                nullable: false,
                defaultValue: 0);

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

            // Mevcut veride görünen sıra korunur, bundan sonra sırayı yönetici belirler:
            // kategoriler sitedeki gibi eklenme sırasıyla, ürünler kategorileri içinde ad sırasıyla,
            // masalar bölgeleri içinde doğal ad sırasıyla ("Masa 2", "Masa 10"dan önce) numaralanır.
            // Bölge ve set menü sıraları da (eskiden sayıdan/formdan verildiği için çakışabiliyordu) 0'dan yeniden sıralanır.
            migrationBuilder.Sql("""
                UPDATE "Categories" c SET "SortOrder" = r.rn
                FROM (SELECT "Id", ROW_NUMBER() OVER (PARTITION BY "BranchId" ORDER BY "CreatedAt", "Name") - 1 AS rn
                      FROM "Categories") r
                WHERE c."Id" = r."Id";

                UPDATE "Products" p SET "SortOrder" = r.rn
                FROM (SELECT "Id", ROW_NUMBER() OVER (PARTITION BY "CategoryId" ORDER BY "Name") - 1 AS rn
                      FROM "Products") r
                WHERE p."Id" = r."Id";

                UPDATE "Tables" t SET "SortOrder" = r.rn
                FROM (SELECT "Id", ROW_NUMBER() OVER (
                          PARTITION BY "RegionId"
                          ORDER BY regexp_replace("Name", '[0-9]+', '', 'g'),
                                   NULLIF(substring("Name" from '[0-9]+'), '')::numeric NULLS FIRST,
                                   "Name") - 1 AS rn
                      FROM "Tables") r
                WHERE t."Id" = r."Id";

                UPDATE "Regions" g SET "SortOrder" = r.rn
                FROM (SELECT "Id", ROW_NUMBER() OVER (PARTITION BY "BranchId" ORDER BY "SortOrder", "Name") - 1 AS rn
                      FROM "Regions") r
                WHERE g."Id" = r."Id";

                UPDATE "SetMenus" s SET "SortOrder" = r.rn
                FROM (SELECT "Id", ROW_NUMBER() OVER (PARTITION BY "BranchId" ORDER BY "SortOrder", "Name") - 1 AS rn
                      FROM "SetMenus") r
                WHERE s."Id" = r."Id";
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SortOrder",
                table: "Tables");

            migrationBuilder.DropColumn(
                name: "SortOrder",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "SortOrder",
                table: "Categories");
        }
    }
}
