using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RestaurantBill.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddKitchenCategories : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<List<Guid>>(
                name: "CategoryIds",
                table: "UserBranches",
                type: "uuid[]",
                nullable: false,
                defaultValueSql: "'{}'");

            // Mutfak artık bölgeyle değil kategoriyle kısıtlanır; bölge yalnızca garsonda kalır (Role 4 = Kitchen).
            migrationBuilder.Sql("""UPDATE "UserBranches" SET "RegionIds" = '{}' WHERE "Role" = 4;""");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CategoryIds",
                table: "UserBranches");
        }
    }
}
