using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Exceptions;

namespace RestaurantBill.Domain.Tests.Entities;

public class ProductTests
{
    public class Create
    {
        [Fact]
        public void WithValidParameters_ReturnsProduct()
        {
            Product product = Product.Create("Çay", 15m, true, "img.png", categoryId: 1);

            Assert.Equal("Çay", product.Name);
            Assert.Equal(15m, product.Price);
            Assert.True(product.IsActive);
            Assert.Equal("img.png", product.ImageUrl);
            Assert.Equal(1, product.CategoryId);
        }

        [Theory]
        [InlineData("")]
        [InlineData("   ")]
        public void WithEmptyName_ThrowsDomainException(string invalidName)
        {
            Assert.Throws<DomainException>(() =>
                Product.Create(invalidName, 10m, true, "img.png", categoryId: 1));
        }

        [Theory]
        [InlineData(0)]
        [InlineData(-1)]
        public void WithNonPositivePrice_ThrowsDomainException(decimal invalidPrice)
        {
            Assert.Throws<DomainException>(() =>
                Product.Create("Çay", invalidPrice, true, "img.png", categoryId: 1));
        }

        [Theory]
        [InlineData(0)]
        [InlineData(-1)]
        public void WithInvalidCategoryId_ThrowsDomainException(int invalidId)
        {
            Assert.Throws<DomainException>(() =>
                Product.Create("Çay", 10m, true, "img.png", invalidId));
        }
    }

    public class Update
    {
        [Fact]
        public void WithValidParameters_UpdatesFields()
        {
            Product product = Product.Create("Çay", 15m, true, "img.png", categoryId: 1);

            product.Update("Kahve", 25m, false, categoryId: 2);

            Assert.Equal("Kahve", product.Name);
            Assert.Equal(25m, product.Price);
            Assert.False(product.IsActive);
            Assert.Equal(2, product.CategoryId);
        }

        [Theory]
        [InlineData("")]
        [InlineData("   ")]
        public void WithEmptyName_ThrowsDomainException(string invalidName)
        {
            Product product = Product.Create("Çay", 15m, true, "img.png", categoryId: 1);

            Assert.Throws<DomainException>(() =>
                product.Update(invalidName, 10m, true, categoryId: 1));
        }

        [Theory]
        [InlineData(0)]
        [InlineData(-1)]
        public void WithNonPositivePrice_ThrowsDomainException(decimal invalidPrice)
        {
            Product product = Product.Create("Çay", 15m, true, "img.png", categoryId: 1);

            Assert.Throws<DomainException>(() =>
                product.Update("Çay", invalidPrice, true, categoryId: 1));
        }

        [Theory]
        [InlineData(0)]
        [InlineData(-1)]
        public void WithInvalidCategoryId_ThrowsDomainException(int invalidId)
        {
            Product product = Product.Create("Çay", 15m, true, "img.png", categoryId: 1);

            Assert.Throws<DomainException>(() =>
                product.Update("Çay", 10m, true, invalidId));
        }
    }

    public class EnsureCanBeDeleted
    {
        [Fact]
        public void WithNoLinkedOrderItems_DoesNotThrow()
        {
            Product product = Product.Create("Çay", 15m, true, "img.png", categoryId: 1);

            var exception = Record.Exception(() =>
                product.EnsureCanBeDeleted([]));

            Assert.Null(exception);
        }

        [Fact]
        public void WithLinkedOrderItems_ThrowsDomainException()
        {
            Product product = Product.Create("Çay", 15m, true, "img.png", categoryId: 1);
            typeof(BaseEntity).GetProperty(nameof(BaseEntity.Id))!.SetValue(product, 1);
            Order order = Order.Create(tableId: 1);
            order.AddItem(product, 1);

            Assert.Throws<DomainException>(() =>
                product.EnsureCanBeDeleted(order.OrderItems));
        }
    }
}
