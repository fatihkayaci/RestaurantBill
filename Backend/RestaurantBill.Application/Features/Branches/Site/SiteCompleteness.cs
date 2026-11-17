using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.DTOs.CustomerSite;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Branches.Site;

// "Sitenizi güzelleştirin": sitenin ne kadar dolu olduğu ve görsel etkisine göre sıralı yapılacaklar.
// Fotoğraflarla dolu site çok güzel, boş site sönük görünür; admin'e en çok fark yaratan eksik önce gösterilir.

/// <summary>Sitenin dolulukla ilgili sayıları (ürün, bölüm); şubenin kendisi dışında kalan veri.</summary>
public sealed record SiteCompletenessFacts(int TotalProducts, int ProductsWithoutPhoto, int RegionCount, int RegionsWithPhoto);

public static class SiteCompleteness
{
    /// <summary>Yayındaki sitenin puanı.</summary>
    public static SiteCompletenessDto Evaluate(Branch branch, SiteCompletenessFacts facts) => Evaluate(branch.GetPublishedSite(), facts);

    /// <summary>Görsel etkisine göre büyükten küçüğe maddeler ve 0–100 puan (yayındaki ya da taslak hâl).</summary>
    public static SiteCompletenessDto Evaluate(SiteSnapshot site, SiteCompletenessFacts facts)
    {
        SiteContent c = site.Content;
        List<SiteChecklistItemDto> items = [];

        void Add(string key, string title, string reason, int weight, double progress, string detail = "")
        {
            progress = Math.Clamp(progress, 0, 1);
            items.Add(new SiteChecklistItemDto
            {
                Key = key, Title = title, Reason = reason, Weight = weight,
                Progress = Math.Round(progress, 2), Done = progress >= 1, Detail = detail,
            });
        }

        Add("cover", "Kapak fotoğrafı",
            "Kapak fotoğrafı ana sayfanın ilk izlenimidir; yoksa tabaklarınızdan kolaj yapılır.",
            20, site.CoverImage.Length > 0 ? 1 : 0);

        if (facts.TotalProducts == 0)
        {
            Add("productPhotos", "Menüye ürün ekleyin",
                "Menüsü boş bir sitede gösterilecek tabak yok; ürünler eklenince ana sayfa ve menü dolar.", 18, 0, "Menüde ürün yok");
        }
        else
        {
            int withPhoto = facts.TotalProducts - facts.ProductsWithoutPhoto;
            Add("productPhotos", "Ürün fotoğrafları",
                "Fotoğraflı tabak iştah açar; fotoğrafsız ürünler sitede sade metin kartı olarak görünür.",
                18, (double)withPhoto / facts.TotalProducts,
                facts.ProductsWithoutPhoto > 0 ? $"{facts.ProductsWithoutPhoto} ürün fotoğrafsız" : $"{facts.TotalProducts} ürünün hepsi fotoğraflı");
        }

        int gallery = c.GalleryImages.Count;
        Add("gallery", "Mekân fotoğrafları",
            "Salon, avlu, masa: Mekân sayfasını ve ana sayfadaki fotoğraf şeridini doldurur. En az 3 fotoğraf yükleyin.",
            15, gallery / 3.0, $"{gallery} / {SiteContent.GalleryMax} fotoğraf");

        bool title = site.StoryTitle.Length > 0, about = site.About.Length > 0;
        Add("story", "Hikâye metni",
            "Hikâye, Hakkımızda sayfasının ve ana sayfadaki hikâye kartının kalbidir; 2–3 cümle yeter.",
            10, (title ? 0.5 : 0) + (about ? 0.5 : 0));

        bool hasHours = c.WeeklyHours.Count > 0 || site.OpensAt is not null;
        Add("hours", "Çalışma saatleri",
            "Saatler her sayfada \"Şu an açık\" bilgisini gösterir; günlere göre farklıysa haftalık saat girin.",
            8, hasHours ? 1 : 0, c.WeeklyHours.Count > 0 ? "Haftalık saat girildi" : hasHours ? "Her gün aynı saat" : "");

        Add("aboutPhoto", "Hikâye fotoğrafı",
            "Hikâye kartının yanında durur; yoksa tabaklarınızdan kolaj yapılır.",
            6, site.AboutImage.Length > 0 ? 1 : 0);

        Add("rating", "Puan ve yorum sayısı",
            "Google puanınız ana sayfada güven veren bir kart olur.",
            6, c.Rating is not null ? 1 : 0);

        Add("whatsapp", "WhatsApp numarası",
            "Telefonda iletişimin en hızlı yolu; İletişim sayfasında \"Yaz\" düğmesi olur.",
            5, c.WhatsappPhone.Length > 0 ? 1 : 0);

        Add("founder", "Usta / kurucu bilgisi",
            "Bir yüz ve tek cümlelik söz, Hakkımızda'yı en güçlü hâline getirir.",
            5, (c.FounderName.Length > 0 ? 0.5 : 0) + (c.FounderPhoto.Length > 0 ? 0.5 : 0));

        Add("reviews", "Seçtiğiniz yorumlar",
            "Gerçek misafir yorumları (en çok 3) puan kartının yanında görünür.",
            4, c.FeaturedReviews.Count > 0 ? 1 : 0, c.FeaturedReviews.Count > 0 ? $"{c.FeaturedReviews.Count} yorum" : "");

        Add("directions", "Nasıl gelinir",
            "Metro, otobüs, otopark: misafirin yolu bulmasını kolaylaştırır.",
            3, c.DirectionsNote.Length > 0 ? 1 : 0);

        Add("amenities", "Olanaklar",
            "Avlu, otopark, çocuk dostu... Mekân sayfasında çip olarak görünür.",
            3, c.Amenities.Count > 0 ? 1 : 0);

        if (facts.RegionCount > 0)
        {
            Add("regions", "Bölüm fotoğrafları",
                "Salon mu, avlu mu? Her bölümün fotoğrafı misafirin seçimini kolaylaştırır.",
                3, (double)facts.RegionsWithPhoto / facts.RegionCount, $"{facts.RegionsWithPhoto} / {facts.RegionCount} bölüm");
        }

        Add("values", "Değerleriniz",
            "Uzun yazı yerine 3 kısa değer: \"Her sabah zırh\", \"Meşe kömürü\".",
            2, c.Values.Count > 0 ? 1 : 0);

        Add("history", "Kuruluş yılı ve kilometre taşları",
            "\"1987'den beri\" satırı ve zaman çizelgesi köklü bir yer duygusu verir.",
            2, c.FoundedYear is not null || c.Milestones.Count >= 2 ? 1 : 0);

        Add("instagram", "Instagram",
            "Ana sayfada Instagram kartı ve fotoğraf şeridinde bağlantı olur.",
            2, site.InstagramUrl.Length > 0 ? 1 : 0);

        double total = items.Sum(i => i.Weight);
        double earned = items.Sum(i => i.Weight * i.Progress);
        return new SiteCompletenessDto
        {
            Score = (int)Math.Round(earned / total * 100, MidpointRounding.AwayFromZero),
            TotalProducts = facts.TotalProducts,
            ProductsWithoutPhoto = facts.ProductsWithoutPhoto,
            Items = items.OrderByDescending(i => i.Weight).ToList(),
        };
    }
}

public class GetSiteCompletenessQuery : IRequest<Result<SiteCompletenessDto>>
{
    /// <summary>true: taslağı puanlar (site düzenleyicisi, düzenledikçe güncellenir); false: yayındaki site.</summary>
    public bool Draft { get; set; }
}

public class GetSiteCompletenessQueryHandler(IAppDbContext db, ICurrentUserService currentUser)
    : IRequestHandler<GetSiteCompletenessQuery, Result<SiteCompletenessDto>>
{
    public async Task<Result<SiteCompletenessDto>> Handle(GetSiteCompletenessQuery request, CancellationToken cancellationToken)
    {
        Branch? branch = await BranchSiteLoader.LoadAsync(db, currentUser, cancellationToken, tracking: false);
        if (branch is null) return Result<SiteCompletenessDto>.Failure("Şube bulunamadı.");

        // Sitede görünen ürünler: aktif olanlar.
        var products = await db.Products.AsNoTracking()
            .Where(p => p.Category.BranchId == branch.Id && p.IsActive)
            .Select(p => p.ImageUrl)
            .ToListAsync(cancellationToken);

        List<Guid> regionIds = await db.Regions.AsNoTracking()
            .Where(r => r.BranchId == branch.Id)
            .Select(r => r.Id)
            .ToListAsync(cancellationToken);
        SiteSnapshot site = request.Draft ? branch.GetSiteDraft() : branch.GetPublishedSite();
        HashSet<Guid> withPhoto = site.Content.RegionDetails.Where(d => d.PhotoKey.Length > 0).Select(d => d.RegionId).ToHashSet();

        var facts = new SiteCompletenessFacts(
            products.Count,
            products.Count(string.IsNullOrWhiteSpace),
            regionIds.Count,
            regionIds.Count(withPhoto.Contains));
        return Result<SiteCompletenessDto>.Success(SiteCompleteness.Evaluate(site, facts));
    }
}
