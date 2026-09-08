using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RestaurantBill.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class BackfillBranchTimeZoneId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // AddBranchDayEndTimeAndShiftCountStatus migration'ı TimeZoneId için yanlışlıkla ""
            // varsayılan değeri kullanmıştı (entity'deki "Europe/Istanbul" varsayılanı sadece yeni
            // nesnelerde geçerli, migration backfill'ini etkilemiyordu). Bu, TimeZoneInfo lookup'ı
            // yapan her yerde TimeZoneNotFoundException'a yol açar.
            migrationBuilder.Sql("UPDATE \"Branches\" SET \"TimeZoneId\" = 'Europe/Istanbul' WHERE \"TimeZoneId\" = '';");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {

        }
    }
}
