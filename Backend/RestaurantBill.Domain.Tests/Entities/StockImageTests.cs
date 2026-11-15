using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Exceptions;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Domain.Tests.Entities;

public class StockImageTests
{
    [Fact]
    public void Create_TrimsFields_LowercasesKeywords_AndStartsActive()
    {
        StockImage image = StockImage.Create(" shared/stock/cay.webp ", "  Çay ", [" Sıcak İçecek", "ÇAY", "", "çay"], "  İçecek ", 3);

        Assert.Equal("shared/stock/cay.webp", image.StorageKey);
        Assert.Equal("Çay", image.Title);
        // Türkçe küçük harf (İ → i, I → ı), tekrar ve boş kelime atılır.
        Assert.Equal(new[] { "sıcak içecek", "çay" }, image.GetKeywords());
        Assert.Equal("İçecek", image.Group);
        Assert.Equal(3, image.SortOrder);
        Assert.True(image.IsActive);
    }

    [Fact]
    public void Create_WithoutKeywordsOrGroup_IsAllowed()
    {
        StockImage image = StockImage.Create("shared/stock/adana.webp", "Adana", null, "  ");

        Assert.Empty(image.GetKeywords());
        Assert.Null(image.Group);
    }

    [Theory]
    [InlineData("products/abc/adana.webp")]
    [InlineData("shared/adana.webp")]
    [InlineData("shared/stock/")]
    [InlineData("/shared/stock/adana.webp")]
    [InlineData("shared/stock/../products/x.webp")]
    [InlineData("shared/stock\\adana.webp")]
    [InlineData("shared/stock//adana.webp")]
    [InlineData("")]
    public void Create_WithKeyOutsideStockFolder_Throws(string key)
    {
        Assert.Throws<DomainException>(() => StockImage.Create(key, "Adana", null, null));
    }

    [Fact]
    public void Create_WithEmptyTitle_Throws()
    {
        Assert.Throws<DomainException>(() => StockImage.Create("shared/stock/adana.webp", "  ", null, null));
    }

    [Fact]
    public void Update_CanDeactivate_ButKeepsStorageKey()
    {
        StockImage image = StockImage.Create("shared/stock/adana.webp", "Adana", ["kebap"], "Ana yemek");

        image.Update("Adana Kebap", ["kebap", "acılı"], "Ana yemek", 5, isActive: false);

        Assert.Equal("shared/stock/adana.webp", image.StorageKey);
        Assert.Equal("Adana Kebap", image.Title);
        Assert.False(image.IsActive);
    }
}

public class StorageKeysTests
{
    [Theory]
    [InlineData("shared/stock/adana.webp", true)]
    [InlineData("shared/other.webp", true)]
    [InlineData("/shared/stock/adana.webp", true)]
    [InlineData("  SHARED/stock/adana.webp", true)]
    [InlineData("products/0f0e/abc.webp", false)]
    [InlineData("site/0f0e/cover.webp", false)]
    [InlineData("sharedx/abc.webp", false)]
    [InlineData("products/shared/abc.webp", false)]
    [InlineData("", false)]
    [InlineData(null, false)]
    public void IsShared_OnlyForKeysUnderSharedFolder(string? key, bool expected)
    {
        Assert.Equal(expected, StorageKeys.IsShared(key));
    }

    [Fact]
    public void StockPrefix_IsUnderSharedPrefix()
    {
        Assert.True(StorageKeys.IsShared(StorageKeys.StockPrefix + "x.webp"));
    }
}

public class SearchTextTests
{
    [Theory]
    [InlineData("Çay", "cay")]
    [InlineData("İSKENDER", "iskender")]
    [InlineData("Islak Hamburger", "islak hamburger")]
    [InlineData("ılık süt", "ilik sut")]
    [InlineData("  Şöbiyet   Güllaç ", "sobiyet gullac")]
    [InlineData("Kâşkek", "kaskek")]
    [InlineData("", "")]
    [InlineData(null, "")]
    public void Fold_LowercasesAndRemovesTurkishLettersAndAccents(string? input, string expected)
    {
        Assert.Equal(expected, SearchText.Fold(input));
    }
}
