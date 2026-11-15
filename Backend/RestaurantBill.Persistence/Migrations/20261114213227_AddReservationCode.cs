using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RestaurantBill.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddReservationCode : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Kısa rezervasyon kodu (ReservationCode): önce boş geçilebilir eklenir, mevcut satırlara uygulamadakiyle aynı
            // alfabeden (0/O/1/I/L yok) 6 karakterlik rastgele, çakışmasız kod verilir, sonra NOT NULL yapılır ve unique
            // index eklenir. Rastgelelik gen_random_bytes yerine gen_random_uuid() (pgcrypto gerekmez, PG13+ çekirdekte);
            // kodlar gizli değildir, tek başına rezervasyonu açmaz.
            migrationBuilder.AddColumn<string>(
                name: "Code",
                table: "Reservations",
                type: "character varying(6)",
                maxLength: 6,
                nullable: true);

            migrationBuilder.Sql(@"
DO $$
DECLARE
    alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    rec record;
    candidate text;
    bytes bytea;
    attempts int;
BEGIN
    FOR rec IN SELECT ""Id"" FROM ""Reservations"" WHERE ""Code"" IS NULL OR ""Code"" = '' LOOP
        attempts := 0;
        LOOP
            attempts := attempts + 1;
            IF attempts > 100 THEN
                RAISE EXCEPTION 'AddReservationCode: % için çakışmasız kod üretilemedi', rec.""Id"";
            END IF;
            -- UUIDv4'ün (0'dan sayınca) 6. ve 8. baytlarında sürüm/varyant bitleri sabit; onlar atlanır. 248 ve üstü baytlar
            -- atılır (248 = 8 × 31): mod 31 eşit dağılır. Yetmezse (çok seyrek) yeni UUID ile baştan.
            bytes := uuid_send(gen_random_uuid());
            candidate := '';
            FOR i IN 0..15 LOOP
                CONTINUE WHEN i IN (6, 8) OR get_byte(bytes, i) >= 248;
                candidate := candidate || substr(alphabet, (get_byte(bytes, i) % 31) + 1, 1);
                EXIT WHEN length(candidate) = 6;
            END LOOP;
            CONTINUE WHEN length(candidate) < 6;
            EXIT WHEN NOT EXISTS (SELECT 1 FROM ""Reservations"" WHERE ""Code"" = candidate);
        END LOOP;
        UPDATE ""Reservations"" SET ""Code"" = candidate WHERE ""Id"" = rec.""Id"";
    END LOOP;
END $$;");

            migrationBuilder.Sql(@"ALTER TABLE ""Reservations"" ALTER COLUMN ""Code"" SET NOT NULL;");

            migrationBuilder.CreateIndex(
                name: "IX_Reservations_Code",
                table: "Reservations",
                column: "Code",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Reservations_Code",
                table: "Reservations");

            migrationBuilder.DropColumn(
                name: "Code",
                table: "Reservations");
        }
    }
}
