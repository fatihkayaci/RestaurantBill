using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Exceptions;

namespace RestaurantBill.Domain.Tests.Entities;

// Site taslağı (şirket geneli): değişen alanlar, alan bazında geri alma, fotoğraf anahtarları, yayınla / at.
public class SiteSnapshotTests
{
    private static readonly DateTime Now = new(2026, 11, 17, 12, 0, 0, DateTimeKind.Utc);

    /// <summary>Başlığı ve kapağı yayında bir şirket sitesi.</summary>
    private static Company NewCompany()
    {
        Company company = Company.Create("Ocak", User.Create("Sahip", "s@test.com", "5550000000"));
        company.SaveSiteDraft(SiteSnapshot.Empty.WithImage(SiteImageSlot.Cover, "site/kapak.webp") with { Headline = "Başlık", Tagline = "Alt başlık" }, Now);
        company.PublishSiteDraft(Now);
        return company;
    }

    [Fact]
    public void NoDraft_DraftEqualsPublished_NoChanges()
    {
        Company company = NewCompany();

        Assert.Null(company.SiteDraft);
        Assert.Empty(company.GetSiteDraft().ChangedFields(company.GetPublishedSite()));
        Assert.Equal(2, company.SiteDraftVersion);
    }

    [Fact]
    public void NeverPublished_IsEmptySite()
    {
        Company company = Company.Create("Ocak", User.Create("Sahip", "s@test.com", "5550000000"));

        Assert.Null(company.Site);
        Assert.Equal(string.Empty, company.GetPublishedSite().Headline);
        Assert.Empty(company.SiteImageKeysInUse());
    }

    [Fact]
    public void ChangedFields_ListsTextImageAndRegionChanges_InScreenOrder()
    {
        Company company = NewCompany();
        Guid region = Guid.NewGuid();

        SiteSnapshot draft = company.GetSiteDraft()
            .WithImage(SiteImageSlot.Cover, "site/yeni.webp")
            .WithRegionPhoto(region, "site/salon.webp")
            with { Tagline = "Yeni" };

        Assert.Equal(["tagline", "coverImage", $"region:{region}"], draft.ChangedFields(company.GetPublishedSite()));
    }

    [Fact]
    public void BranchInfo_IsNeverStored_OnCompanySite()
    {
        Company company = NewCompany();
        SiteSnapshot draft = company.GetSiteDraft() with
        {
            OpensAt = new TimeOnly(9, 0),
            ClosesAt = new TimeOnly(22, 0),
            HoursNote = "Not",
            Content = company.GetSiteDraft().Content with { WhatsappPhone = "0532 000 48 48", DirectionsNote = "Metro" },
        };

        company.SaveSiteDraft(draft, Now);

        SiteSnapshot stored = company.GetSiteDraft();
        Assert.Null(stored.OpensAt);
        Assert.Equal(string.Empty, stored.HoursNote);
        Assert.Equal(string.Empty, stored.Content.WhatsappPhone);
        Assert.Equal(string.Empty, stored.Content.DirectionsNote);
        Assert.Empty(stored.ChangedFields(company.GetPublishedSite()));
    }

    [Fact]
    public void WithTexts_KeepsPhotos_AndNullSeoKeepsValue()
    {
        Company company = NewCompany();
        SiteSnapshot draft = company.GetSiteDraft().WithTexts(new SiteTexts
        {
            Headline = "  Yeni başlık ",
            Content = new SiteContentTexts { SeoTitle = "Ocak Kadıköy" },
        }, 2026);

        SiteSnapshot again = draft.WithTexts(new SiteTexts { Headline = "Yeni başlık" }, 2026);

        Assert.Equal("Yeni başlık", draft.Headline);
        Assert.Equal("site/kapak.webp", draft.CoverImage);
        Assert.Equal("Ocak Kadıköy", again.Content.SeoTitle); // SEO gönderilmezse korunur
        Assert.Throws<DomainException>(() => draft.WithTexts(new SiteTexts { Content = new SiteContentTexts { SeoTitle = new string('a', 101) } }, 2026));
    }

    [Fact]
    public void WithFieldFrom_RevertsOneField_UnknownFieldThrows()
    {
        Company company = NewCompany();
        SiteSnapshot published = company.GetPublishedSite();
        SiteSnapshot draft = published.WithImage(SiteImageSlot.Cover, "site/yeni.webp") with { Tagline = "Yeni" };

        SiteSnapshot reverted = draft.WithFieldFrom(published, "coverImage");

        Assert.Equal("site/kapak.webp", reverted.CoverImage);
        Assert.Equal("Yeni", reverted.Tagline);
        Assert.Throws<DomainException>(() => draft.WithFieldFrom(published, "phone"));
    }

    [Fact]
    public void HomeSections_AreAChangedField_AndRevertable()
    {
        Company company = NewCompany();
        SiteSnapshot published = company.GetPublishedSite();
        SiteSnapshot draft = published with
        {
            Content = published.Content with { HomeSections = SiteContent.NormalizeHomeSections([new("reviews", false)]) },
        };

        Assert.Equal(["homeSections"], draft.ChangedFields(published));
        Assert.False(draft.Content.HomeSections[0].Enabled);

        SiteSnapshot reverted = draft.WithFieldFrom(published, "homeSections");
        Assert.Empty(reverted.Content.HomeSections);
        Assert.Empty(reverted.ChangedFields(published));
    }

    [Fact]
    public void Publish_CopiesDraftToSite_BumpsVersion_ClearsDraft()
    {
        Company company = NewCompany();
        company.SaveSiteDraft(company.GetSiteDraft().WithImage(SiteImageSlot.Share, "shared/stock/mangal.webp") with { Headline = "Taslak" }, Now);
        Assert.Equal(3, company.SiteDraftVersion);
        Assert.Equal("Başlık", company.GetPublishedSite().Headline); // yayındaki değişmedi

        DateTime later = Now.AddHours(1);
        company.PublishSiteDraft(later);

        Assert.Equal("Taslak", company.GetPublishedSite().Headline);
        Assert.Equal("shared/stock/mangal.webp", company.GetPublishedSite().Content.ShareImage);
        Assert.Null(company.SiteDraft);
        Assert.Equal(4, company.SiteDraftVersion);
        Assert.Equal(later, company.SitePublishedAt);
    }

    [Fact]
    public void Discard_RestoresPublished_KeysInUseCoverBoth()
    {
        Company company = NewCompany();
        company.SaveSiteDraft(company.GetSiteDraft().WithImage(SiteImageSlot.Cover, "site/yeni.webp"), Now);

        Assert.Equal(["site/kapak.webp", "site/yeni.webp"], company.SiteImageKeysInUse().Order());

        company.DiscardSiteDraft();

        Assert.Equal("site/kapak.webp", company.GetSiteDraft().CoverImage);
        Assert.Equal(["site/kapak.webp"], company.SiteImageKeysInUse());
        Assert.True(company.IsSiteDraftStale(3));
        Assert.False(company.IsSiteDraftStale(4));
    }

    [Fact]
    public void ResetSite_ClearsSiteAndDraft_ReturnsKeys()
    {
        Company company = NewCompany();
        company.SaveSiteDraft(company.GetSiteDraft().WithImage(SiteImageSlot.About, "site/hikaye.webp"), Now);

        IReadOnlyList<string> keys = company.ResetSite();

        Assert.Equal(["site/hikaye.webp", "site/kapak.webp"], keys.Order());
        Assert.Null(company.Site);
        Assert.Null(company.SiteDraft);
        Assert.Null(company.SitePublishedAt);
        Assert.Empty(company.SiteImageKeysInUse());
    }

    [Fact]
    public void HeroImages_AreKeysFields_AndRevertable()
    {
        SiteSnapshot published = new SiteSnapshot().WithImage(SiteImageSlot.AboutHero, "site/hakkimizda.webp");
        SiteSnapshot draft = published
            .WithImage(SiteImageSlot.AboutHero, "site/hakkimizda-2.webp")
            .WithImage(SiteImageSlot.ReservationHero, "shared/stock/mangal.webp");

        Assert.Equal(["heroAbout", "heroReservation"], draft.ChangedFields(published));
        Assert.Contains("site/hakkimizda-2.webp", draft.ImageKeys());
        Assert.Contains("shared/stock/mangal.webp", draft.ImageKeys());

        SiteSnapshot reverted = draft.WithFieldFrom(published, "heroAbout");
        Assert.Equal("site/hakkimizda.webp", reverted.Content.AboutHero);
        Assert.Equal(["heroReservation"], reverted.ChangedFields(published));
    }

    [Fact]
    public void Logo_IsKeyField_ImageKey_AndRevertable()
    {
        SiteSnapshot published = SiteSnapshot.Empty;
        SiteSnapshot draft = published.WithImage(SiteImageSlot.Logo, "site/logo.webp");

        Assert.Equal("site/logo.webp", draft.LogoImage);
        Assert.Equal(["logo"], draft.ChangedFields(published));
        Assert.Contains("site/logo.webp", draft.ImageKeys());

        SiteSnapshot reverted = draft.WithFieldFrom(published, "logo");
        Assert.Equal(string.Empty, reverted.LogoImage);
        Assert.Empty(reverted.ChangedFields(published));
    }

    [Fact]
    public void Logo_PublishedWithDraft_AndFreedOnReset()
    {
        Company company = Company.Create("Logo Restoran", User.Create("Sahip", "sahip@test.com", "5551234567"));
        company.SaveSiteDraft(company.GetSiteDraft().WithImage(SiteImageSlot.Logo, "site/logo.webp"), Now);
        Assert.Equal(string.Empty, company.GetPublishedSite().LogoImage);

        company.PublishSiteDraft(Now);
        Assert.Equal("site/logo.webp", company.GetPublishedSite().LogoImage);

        Assert.Contains("site/logo.webp", company.ResetSite());
    }
}
