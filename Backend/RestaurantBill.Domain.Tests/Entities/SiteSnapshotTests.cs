using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Exceptions;

namespace RestaurantBill.Domain.Tests.Entities;

// Site taslağı: değişen alanlar, alan bazında geri alma, fotoğraf anahtarları, yayınla / at.
public class SiteSnapshotTests
{
    private static Branch NewBranch()
    {
        Branch branch = Branch.Create(Guid.NewGuid(), "Merkez", "", "", "", "İstanbul", "Kadıköy", "", 10m);
        branch.UpdateSite("Başlık", "Alt başlık", "", "", null, null, "", "", "");
        branch.ReplaceSiteImage(SiteImageSlot.Cover, "site/kapak.webp");
        return branch;
    }

    [Fact]
    public void NoDraft_DraftEqualsPublished_NoChanges()
    {
        Branch branch = NewBranch();

        Assert.Null(branch.SiteDraft);
        Assert.Empty(branch.GetSiteDraft().ChangedFields(branch.GetPublishedSite()));
        Assert.Equal(0, branch.SiteDraftVersion);
    }

    [Fact]
    public void ChangedFields_ListsTextImageAndRegionChanges_InScreenOrder()
    {
        Branch branch = NewBranch();
        Guid region = Guid.NewGuid();

        SiteSnapshot draft = branch.GetSiteDraft()
            .WithImage(SiteImageSlot.Cover, "site/yeni.webp")
            .WithRegionPhoto(region, "site/salon.webp")
            with { Tagline = "Yeni" };

        Assert.Equal(["tagline", "coverImage", $"region:{region}"], draft.ChangedFields(branch.GetPublishedSite()));
    }

    [Fact]
    public void WithTexts_KeepsPhotos_AndNullSeoKeepsValue()
    {
        Branch branch = NewBranch();
        SiteSnapshot draft = branch.GetSiteDraft().WithTexts(new SiteTexts
        {
            Headline = "  Yeni başlık ",
            Content = new SiteContentTexts { SeoTitle = "Ocak Kadıköy" },
        }, 2026);

        SiteSnapshot again = draft.WithTexts(new SiteTexts { Headline = "Yeni başlık" }, 2026);

        Assert.Equal("Yeni başlık", draft.Headline);
        Assert.Equal("site/kapak.webp", draft.CoverImage);
        Assert.Equal("Ocak Kadıköy", again.Content.SeoTitle); // eski form SEO göndermez, korunur
        Assert.Throws<DomainException>(() => draft.WithTexts(new SiteTexts { Content = new SiteContentTexts { SeoTitle = new string('a', 101) } }, 2026));
    }

    [Fact]
    public void WithFieldFrom_RevertsOneField_UnknownFieldThrows()
    {
        Branch branch = NewBranch();
        SiteSnapshot published = branch.GetPublishedSite();
        SiteSnapshot draft = published.WithImage(SiteImageSlot.Cover, "site/yeni.webp") with { Tagline = "Yeni" };

        SiteSnapshot reverted = draft.WithFieldFrom(published, "coverImage");

        Assert.Equal("site/kapak.webp", reverted.CoverImage);
        Assert.Equal("Yeni", reverted.Tagline);
        Assert.Throws<DomainException>(() => draft.WithFieldFrom(published, "phone"));
    }

    [Fact]
    public void Publish_CopiesDraftToColumns_BumpsVersion_ClearsDraft()
    {
        Branch branch = NewBranch();
        branch.SaveSiteDraft(branch.GetSiteDraft().WithImage(SiteImageSlot.Share, "shared/stock/mangal.webp") with { Headline = "Taslak" }, DateTime.UtcNow);
        Assert.Equal(1, branch.SiteDraftVersion);
        Assert.Equal("Başlık", branch.SiteHeadline); // yayındaki değişmedi

        DateTime now = new(2026, 11, 17, 12, 0, 0, DateTimeKind.Utc);
        branch.PublishSiteDraft(now);

        Assert.Equal("Taslak", branch.SiteHeadline);
        Assert.Equal("shared/stock/mangal.webp", branch.GetSiteContent().ShareImage);
        Assert.Null(branch.SiteDraft);
        Assert.Equal(2, branch.SiteDraftVersion);
        Assert.Equal(now, branch.SitePublishedAt);
    }

    [Fact]
    public void Discard_RestoresPublished_KeysInUseCoverBoth()
    {
        Branch branch = NewBranch();
        branch.SaveSiteDraft(branch.GetSiteDraft().WithImage(SiteImageSlot.Cover, "site/yeni.webp"), DateTime.UtcNow);

        Assert.Equal(["site/kapak.webp", "site/yeni.webp"], branch.SiteImageKeysInUse().Order());

        branch.DiscardSiteDraft();

        Assert.Equal("site/kapak.webp", branch.GetSiteDraft().CoverImage);
        Assert.Equal(["site/kapak.webp"], branch.SiteImageKeysInUse());
        Assert.True(branch.IsSiteDraftStale(1));
        Assert.False(branch.IsSiteDraftStale(2));
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
}
