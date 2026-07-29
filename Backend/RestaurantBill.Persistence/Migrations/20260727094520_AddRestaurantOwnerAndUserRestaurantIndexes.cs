using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RestaurantBill.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddRestaurantOwnerAndUserRestaurantIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_UserRestaurants_RestaurantId",
                table: "UserRestaurants");

            migrationBuilder.DropIndex(
                name: "IX_UserRestaurants_UserId",
                table: "UserRestaurants");

            migrationBuilder.AddColumn<int>(
                name: "OwnerUserId",
                table: "Restaurants",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_UserRestaurants_RestaurantId_UserName",
                table: "UserRestaurants",
                columns: new[] { "RestaurantId", "UserName" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_UserRestaurants_UserId_RestaurantId",
                table: "UserRestaurants",
                columns: new[] { "UserId", "RestaurantId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Restaurants_OwnerUserId",
                table: "Restaurants",
                column: "OwnerUserId");

            migrationBuilder.AddForeignKey(
                name: "FK_Restaurants_Users_OwnerUserId",
                table: "Restaurants",
                column: "OwnerUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Restaurants_Users_OwnerUserId",
                table: "Restaurants");

            migrationBuilder.DropIndex(
                name: "IX_UserRestaurants_RestaurantId_UserName",
                table: "UserRestaurants");

            migrationBuilder.DropIndex(
                name: "IX_UserRestaurants_UserId_RestaurantId",
                table: "UserRestaurants");

            migrationBuilder.DropIndex(
                name: "IX_Restaurants_OwnerUserId",
                table: "Restaurants");

            migrationBuilder.DropColumn(
                name: "OwnerUserId",
                table: "Restaurants");

            migrationBuilder.CreateIndex(
                name: "IX_UserRestaurants_RestaurantId",
                table: "UserRestaurants",
                column: "RestaurantId");

            migrationBuilder.CreateIndex(
                name: "IX_UserRestaurants_UserId",
                table: "UserRestaurants",
                column: "UserId");
        }
    }
}
