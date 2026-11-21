using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RestaurantBill.Persistence.Migrations
{
    /// <summary>
    /// Yeni varsayılan site tasarımı "sophra": boş tasarım anahtarı artık Sophra demektir. Bu göçten önce boş değer "renkli"
    /// demekti (admin'de Renkli seçilince de boş kaydediliyordu); var olan sitelerin görünümü değişmesin diye yayındaki ve
    /// taslaktaki boş tasarım "renkli" yazılır. Sitesi hiç kaydedilmemiş (Site ve SiteDraft null) şirketler yeni varsayılanı
    /// (Sophra) alır. Şema değişmez (jsonb içeriği).
    /// </summary>
    public partial class BackfillExplicitSiteDesign : Migration
    {
        private static readonly string[] Columns = ["Site", "SiteDraft"];

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            foreach (string column in Columns)
            {
                // İçerik nesnesi var, tasarım boş ya da yok.
                migrationBuilder.Sql($@"
                    UPDATE ""Companies"" SET ""{column}"" = jsonb_set(""{column}"", '{{Content,Design}}', '""renkli""'::jsonb, true)
                    WHERE jsonb_typeof(""{column}"") = 'object'
                      AND jsonb_typeof(""{column}"" -> 'Content') = 'object'
                      AND COALESCE(""{column}"" -> 'Content' ->> 'Design', '') = '';");
                // İçerik hiç yok (null): yalnız tasarımla içerik nesnesi (eksik alanlar okunurken boş sayılır).
                migrationBuilder.Sql($@"
                    UPDATE ""Companies"" SET ""{column}"" = jsonb_set(""{column}"", '{{Content}}', '{{""Design"":""renkli""}}'::jsonb, true)
                    WHERE jsonb_typeof(""{column}"") = 'object'
                      AND COALESCE(jsonb_typeof(""{column}"" -> 'Content'), 'null') <> 'object';");
            }
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Eski şemada Renkli boş kaydedilirdi.
            foreach (string column in Columns)
            {
                migrationBuilder.Sql($@"
                    UPDATE ""Companies"" SET ""{column}"" = jsonb_set(""{column}"", '{{Content,Design}}', '""""'::jsonb, true)
                    WHERE jsonb_typeof(""{column}"" -> 'Content') = 'object'
                      AND ""{column}"" -> 'Content' ->> 'Design' = 'renkli';");
            }
        }
    }
}
