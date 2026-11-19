using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RestaurantBill.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class MoveSiteToCompany : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Site",
                table: "Companies",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SiteDraft",
                table: "Companies",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "SiteDraftUpdatedAt",
                table: "Companies",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SiteDraftVersion",
                table: "Companies",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "SitePublishedAt",
                table: "Companies",
                type: "timestamp with time zone",
                nullable: true);

            // Site artık şirket genelidir. Şu an müşteriye giden site, şirketin en eski (silinmemiş) şubesinin sitesidir:
            // onun yayındaki hâli, taslağı ve sürümü şirkete taşınır; böylece canlı site değişmez. Şubeye ait alanlar
            // (haftalık saat, nasıl gelinir, WhatsApp; OpensAt/ClosesAt/HoursNote sütunları) şubede kalır, şirketin
            // sitesinde boş tutulur. Bölüm fotoğrafları/açıklamaları bölüm kimliğiyle saklandığı için bütün şubelerinkiler
            // şirketin sitesinde birleştirilir (yayında ve taslakta). Diğer şubelerin başlık/hikâye/tema/fotoğraf gibi
            // içerikleri ve taslakları taşınmaz.
            migrationBuilder.Sql(@"
                WITH primary_branch AS (
                    SELECT DISTINCT ON (""CompanyId"") *
                    FROM ""Branches""
                    WHERE NOT ""IsDeleted""
                    ORDER BY ""CompanyId"", ""CreatedAt"", ""Id""
                ),
                other_regions AS (
                    SELECT b.""CompanyId"", jsonb_agg(r.value ORDER BY b.""CreatedAt"", r.ordinality) AS items
                    FROM ""Branches"" b
                    JOIN primary_branch p ON p.""CompanyId"" = b.""CompanyId"" AND p.""Id"" <> b.""Id""
                    CROSS JOIN LATERAL jsonb_array_elements(
                        CASE WHEN jsonb_typeof(b.""SiteContent"" -> 'Regions') = 'array' THEN b.""SiteContent"" -> 'Regions' ELSE '[]'::jsonb END
                    ) WITH ORDINALITY AS r(value, ordinality)
                    WHERE NOT b.""IsDeleted""
                    GROUP BY b.""CompanyId""
                ),
                source AS (
                    SELECT
                        p.*,
                        CASE WHEN jsonb_typeof(p.""SiteContent"") = 'object' THEN p.""SiteContent"" ELSE '{}'::jsonb END AS content,
                        CASE WHEN jsonb_typeof(p.""SiteDraft"" -> 'Content') = 'object' THEN p.""SiteDraft"" -> 'Content' ELSE '{}'::jsonb END AS draft_content,
                        COALESCE(o.items, '[]'::jsonb) AS extra_regions
                    FROM primary_branch p
                    LEFT JOIN other_regions o ON o.""CompanyId"" = p.""CompanyId""
                )
                UPDATE ""Companies"" c SET
                    ""Site"" = jsonb_build_object(
                        'Headline', s.""SiteHeadline"",
                        'Tagline', s.""SiteTagline"",
                        'StoryTitle', s.""SiteStoryTitle"",
                        'About', s.""SiteAbout"",
                        'Cover', s.""SiteCoverImage"",
                        'AboutImage', s.""SiteAboutImage"",
                        'Opens', NULL,
                        'Closes', NULL,
                        'HoursNote', '',
                        'Instagram', s.""InstagramUrl"",
                        'Accent', s.""SiteAccentColor"",
                        'Content', (s.content - 'Week' - 'Directions' - 'Whatsapp')
                            || jsonb_build_object('Regions',
                                (CASE WHEN jsonb_typeof(s.content -> 'Regions') = 'array' THEN s.content -> 'Regions' ELSE '[]'::jsonb END)
                                || s.extra_regions)),
                    ""SiteDraft"" = CASE WHEN jsonb_typeof(s.""SiteDraft"") = 'object' THEN
                        s.""SiteDraft"" || jsonb_build_object(
                            'Opens', NULL,
                            'Closes', NULL,
                            'HoursNote', '',
                            'Content', (s.draft_content - 'Week' - 'Directions' - 'Whatsapp')
                                || jsonb_build_object('Regions',
                                    (CASE WHEN jsonb_typeof(s.draft_content -> 'Regions') = 'array' THEN s.draft_content -> 'Regions' ELSE '[]'::jsonb END)
                                    || s.extra_regions))
                        ELSE NULL END,
                    ""SiteDraftVersion"" = s.""SiteDraftVersion"",
                    ""SiteDraftUpdatedAt"" = s.""SiteDraftUpdatedAt"",
                    ""SitePublishedAt"" = s.""SitePublishedAt""
                FROM source s
                WHERE s.""CompanyId"" = c.""Id"";
            ");

            // Şubenin SiteContent sütununda yalnız şubeye ait alanlar kalır.
            migrationBuilder.Sql(@"
                UPDATE ""Branches"" SET ""SiteContent"" = CASE WHEN jsonb_typeof(""SiteContent"") = 'object' THEN
                    jsonb_build_object(
                        'Week', COALESCE(""SiteContent"" -> 'Week', '[]'::jsonb),
                        'Directions', COALESCE(""SiteContent"" -> 'Directions', to_jsonb(''::text)),
                        'Whatsapp', COALESCE(""SiteContent"" -> 'Whatsapp', to_jsonb(''::text)))
                    ELSE NULL END
                WHERE ""SiteContent"" IS NOT NULL;
            ");

            migrationBuilder.DropColumn(
                name: "InstagramUrl",
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
                name: "SiteDraft",
                table: "Branches");

            migrationBuilder.DropColumn(
                name: "SiteDraftUpdatedAt",
                table: "Branches");

            migrationBuilder.DropColumn(
                name: "SiteDraftVersion",
                table: "Branches");

            migrationBuilder.DropColumn(
                name: "SiteHeadline",
                table: "Branches");

            migrationBuilder.DropColumn(
                name: "SitePublishedAt",
                table: "Branches");

            migrationBuilder.DropColumn(
                name: "SiteStoryTitle",
                table: "Branches");

            migrationBuilder.DropColumn(
                name: "SiteTagline",
                table: "Branches");

        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "InstagramUrl",
                table: "Branches",
                type: "text",
                nullable: false,
                defaultValue: "");

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

            migrationBuilder.AddColumn<string>(
                name: "SiteHeadline",
                table: "Branches",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTime>(
                name: "SitePublishedAt",
                table: "Branches",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SiteStoryTitle",
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

            // Geri dönüş: şirketin sitesi en eski şubeye yazılır (şubenin saatleri, WhatsApp'ı ve nasıl gelinir'i korunur).
            migrationBuilder.Sql(@"
                WITH primary_branch AS (
                    SELECT DISTINCT ON (""CompanyId"") ""Id"", ""CompanyId""
                    FROM ""Branches""
                    WHERE NOT ""IsDeleted""
                    ORDER BY ""CompanyId"", ""CreatedAt"", ""Id""
                )
                UPDATE ""Branches"" b SET
                    ""SiteHeadline"" = COALESCE(c.""Site"" ->> 'Headline', ''),
                    ""SiteTagline"" = COALESCE(c.""Site"" ->> 'Tagline', ''),
                    ""SiteStoryTitle"" = COALESCE(c.""Site"" ->> 'StoryTitle', ''),
                    ""SiteAbout"" = COALESCE(c.""Site"" ->> 'About', ''),
                    ""SiteCoverImage"" = COALESCE(c.""Site"" ->> 'Cover', ''),
                    ""SiteAboutImage"" = COALESCE(c.""Site"" ->> 'AboutImage', ''),
                    ""InstagramUrl"" = COALESCE(c.""Site"" ->> 'Instagram', ''),
                    ""SiteAccentColor"" = COALESCE(c.""Site"" ->> 'Accent', ''),
                    ""SiteContent"" = CASE WHEN jsonb_typeof(c.""Site"" -> 'Content') = 'object' THEN
                        (c.""Site"" -> 'Content') || jsonb_build_object(
                            'Week', COALESCE(b.""SiteContent"" -> 'Week', '[]'::jsonb),
                            'Directions', COALESCE(b.""SiteContent"" -> 'Directions', to_jsonb(''::text)),
                            'Whatsapp', COALESCE(b.""SiteContent"" -> 'Whatsapp', to_jsonb(''::text)))
                        ELSE b.""SiteContent"" END,
                    ""SiteDraft"" = c.""SiteDraft"",
                    ""SiteDraftVersion"" = c.""SiteDraftVersion"",
                    ""SiteDraftUpdatedAt"" = c.""SiteDraftUpdatedAt"",
                    ""SitePublishedAt"" = c.""SitePublishedAt""
                FROM primary_branch p
                JOIN ""Companies"" c ON c.""Id"" = p.""CompanyId""
                WHERE b.""Id"" = p.""Id"";
            ");

            migrationBuilder.DropColumn(
                name: "Site",
                table: "Companies");

            migrationBuilder.DropColumn(
                name: "SiteDraft",
                table: "Companies");

            migrationBuilder.DropColumn(
                name: "SiteDraftUpdatedAt",
                table: "Companies");

            migrationBuilder.DropColumn(
                name: "SiteDraftVersion",
                table: "Companies");

            migrationBuilder.DropColumn(
                name: "SitePublishedAt",
                table: "Companies");

        }
    }
}
