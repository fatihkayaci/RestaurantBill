using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Exceptions;

namespace RestaurantBill.Domain.Tests.Entities;

// Admin'in "Yeni" etiketi (30 gün sonra kendiliğinden düşer) ve kategorinin menü görünümü.
public class ProductNewTagTests
{
    private static readonly DateTime Now = new(2026, 11, 21, 9, 0, 0, DateTimeKind.Utc);

    [Fact]
    public void NewProduct_IsNotNew_UntilMarked()
    {
        Product product = Product.Create("Künefe", 190m, "", Guid.NewGuid());
        Assert.Null(product.NewUntil);
        Assert.False(product.IsNewAt(Now));
    }

    [Fact]
    public void SetNew_LastsThirtyDays_ThenExpires_AndUnmarkClears()
    {
        Product product = Product.Create("Künefe", 190m, "", Guid.NewGuid());
        product.SetNew(true, Now);

        Assert.Equal(Now.AddDays(Product.NewDays), product.NewUntil);
        Assert.True(product.IsNewAt(Now.AddDays(29)));
        Assert.False(product.IsNewAt(Now.AddDays(30)));

        // Zaten yeniyken yeniden işaretlemek süreyi uzatmaz.
        product.SetNew(true, Now.AddDays(10));
        Assert.Equal(Now.AddDays(Product.NewDays), product.NewUntil);

        product.SetNew(false, Now);
        Assert.Null(product.NewUntil);
    }

    [Fact]
    public void SetNew_AfterExpiry_StartsAgain()
    {
        Product product = Product.Create("Künefe", 190m, "", Guid.NewGuid());
        product.SetNew(true, Now);
        product.SetNew(true, Now.AddDays(40));
        Assert.Equal(Now.AddDays(40 + Product.NewDays), product.NewUntil);
    }

    [Fact]
    public void Category_MenuDisplay_DefaultsToAuto_AndRejectsUnknown()
    {
        Category category = Category.Create("Tatlılar", Guid.NewGuid());
        Assert.Equal(CategoryMenuDisplay.Auto, category.MenuDisplay);
        category.SetMenuDisplay(CategoryMenuDisplay.List);
        Assert.Equal(CategoryMenuDisplay.List, category.MenuDisplay);
        Assert.Throws<DomainException>(() => category.SetMenuDisplay((CategoryMenuDisplay)7));
    }
}
