using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Exceptions;

namespace RestaurantBill.Domain.Tests.Entities;

public class CategoryTests
{
    public class Create
    {
        [Fact]
        public void WithValidParameters_ReturnsCategory()
        {
            Category category = Category.Create("İçecekler", restaurantId: 1);

            Assert.Equal("İçecekler", category.Name);
            Assert.Equal(1, category.RestaurantId);
        }

        [Theory]
        [InlineData("")]
        [InlineData("   ")]
        public void WithEmptyName_ThrowsDomainException(string invalidName)
        {
            Assert.Throws<DomainException>(() =>
                Category.Create(invalidName, restaurantId: 1));
        }

        [Theory]
        [InlineData(0)]
        [InlineData(-1)]
        public void WithInvalidRestaurantId_ThrowsDomainException(int invalidId)
        {
            Assert.Throws<DomainException>(() =>
                Category.Create("İçecekler", invalidId));
        }
    }

    public class Rename
    {
        [Fact]
        public void WithValidName_UpdatesName()
        {
            Category category = Category.Create("Eski Ad", restaurantId: 1);

            category.Rename("Yeni Ad");

            Assert.Equal("Yeni Ad", category.Name);
        }

        [Theory]
        [InlineData("")]
        [InlineData("   ")]
        public void WithEmptyName_ThrowsDomainException(string invalidName)
        {
            Category category = Category.Create("İçecekler", restaurantId: 1);

            Assert.Throws<DomainException>(() => category.Rename(invalidName));
        }
    }

    public class EnsureCanBeDeleted
    {
        [Fact]
        public void WithNoLinkedProducts_DoesNotThrow()
        {
            Category category = Category.Create("İçecekler", restaurantId: 1);

            var exception = Record.Exception(() =>
                category.EnsureCanBeDeleted([]));

            Assert.Null(exception);
        }

        [Fact]
        public void WithLinkedProducts_ThrowsDomainException()
        {
            Category category = Category.Create("İçecekler", restaurantId: 1);
            Product[] products = [Product.Create("Çay", 10m, true, "img.png", categoryId: 1)];

            Assert.Throws<DomainException>(() =>
                category.EnsureCanBeDeleted(products));
        }
    }
}
