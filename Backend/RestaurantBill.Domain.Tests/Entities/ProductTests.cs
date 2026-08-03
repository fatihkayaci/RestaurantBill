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
            Guid categoryId = Guid.NewGuid();
            Product product = Product.Create("Çay", 15m, "img.png", categoryId);

            Assert.Equal("Çay", product.Name);
            Assert.Equal(15m, product.Price);
            Assert.True(product.IsActive);
            Assert.Equal("img.png", product.ImageUrl);
            Assert.Equal(categoryId, product.CategoryId);
        }

        [Theory]
        [InlineData("")]
        [InlineData("   ")]
        public void WithEmptyName_ThrowsDomainException(string invalidName)
        {
            Assert.Throws<DomainException>(() =>
                Product.Create(invalidName, 10m, "img.png", Guid.NewGuid()));
        }

        [Theory]
        [InlineData(0)]
        [InlineData(-1)]
        public void WithNonPositivePrice_ThrowsDomainException(decimal invalidPrice)
        {
            Assert.Throws<DomainException>(() =>
                Product.Create("Çay", invalidPrice, "img.png", Guid.NewGuid()));
        }

        [Fact]
        public void WithInvalidCategoryId_ThrowsDomainException()
        {
            Assert.Throws<DomainException>(() =>
                Product.Create("Çay", 10m, "img.png", Guid.Empty));
        }
    }

    public class Update
    {
        [Fact]
        public void WithValidParameters_UpdatesFields()
        {
            Product product = Product.Create("Çay", 15m, "img.png", Guid.NewGuid());
            Guid newCategoryId = Guid.NewGuid();

            product.Update("Kahve", 25m, false, newCategoryId);

            Assert.Equal("Kahve", product.Name);
            Assert.Equal(25m, product.Price);
            Assert.False(product.IsActive);
            Assert.Equal(newCategoryId, product.CategoryId);
        }

        [Theory]
        [InlineData("")]
        [InlineData("   ")]
        public void WithEmptyName_ThrowsDomainException(string invalidName)
        {
            Product product = Product.Create("Çay", 15m, "img.png", Guid.NewGuid());

            Assert.Throws<DomainException>(() =>
                product.Update(invalidName, 10m, true, Guid.NewGuid()));
        }

        [Theory]
        [InlineData(0)]
        [InlineData(-1)]
        public void WithNonPositivePrice_ThrowsDomainException(decimal invalidPrice)
        {
            Product product = Product.Create("Çay", 15m, "img.png", Guid.NewGuid());

            Assert.Throws<DomainException>(() =>
                product.Update("Çay", invalidPrice, true, Guid.NewGuid()));
        }

        [Fact]
        public void WithInvalidCategoryId_ThrowsDomainException()
        {
            Product product = Product.Create("Çay", 15m, "img.png", Guid.NewGuid());

            Assert.Throws<DomainException>(() =>
                product.Update("Çay", 10m, true, Guid.Empty));
        }
    }

    public class EnsureCanBeDeleted
    {
        [Fact]
        public void WithNoLinkedOrderItems_DoesNotThrow()
        {
            Product product = Product.Create("Çay", 15m, "img.png", Guid.NewGuid());

            var exception = Record.Exception(() =>
                product.EnsureCanBeDeleted([]));

            Assert.Null(exception);
        }

        [Fact]
        public void WithLinkedOrderItems_ThrowsDomainException()
        {
            Product product = Product.Create("Çay", 15m, "img.png", Guid.NewGuid());
            typeof(BaseEntity).GetProperty(nameof(BaseEntity.Id))!.SetValue(product, Guid.NewGuid());
            Order order = Order.Create(Guid.NewGuid());
            order.AddItem(product, 1);

            Assert.Throws<DomainException>(() =>
                product.EnsureCanBeDeleted(order.OrderItems));
        }
    }
}
