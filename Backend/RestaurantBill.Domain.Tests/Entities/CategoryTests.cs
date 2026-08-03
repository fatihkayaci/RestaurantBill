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
            Guid branchId = Guid.NewGuid();
            Category category = Category.Create("İçecekler", branchId);

            Assert.Equal("İçecekler", category.Name);
            Assert.Equal(branchId, category.BranchId);
        }

        [Theory]
        [InlineData("")]
        [InlineData("   ")]
        public void WithEmptyName_ThrowsDomainException(string invalidName)
        {
            Assert.Throws<DomainException>(() =>
                Category.Create(invalidName, Guid.NewGuid()));
        }

        [Fact]
        public void WithInvalidBranchId_ThrowsDomainException()
        {
            Assert.Throws<DomainException>(() =>
                Category.Create("İçecekler", Guid.Empty));
        }
    }

    public class Rename
    {
        [Fact]
        public void WithValidName_UpdatesName()
        {
            Category category = Category.Create("Eski Ad", Guid.NewGuid());

            category.Rename("Yeni Ad");

            Assert.Equal("Yeni Ad", category.Name);
        }

        [Theory]
        [InlineData("")]
        [InlineData("   ")]
        public void WithEmptyName_ThrowsDomainException(string invalidName)
        {
            Category category = Category.Create("İçecekler", Guid.NewGuid());

            Assert.Throws<DomainException>(() => category.Rename(invalidName));
        }
    }

    public class EnsureCanBeDeleted
    {
        [Fact]
        public void WithNoLinkedProducts_DoesNotThrow()
        {
            Category category = Category.Create("İçecekler", Guid.NewGuid());

            var exception = Record.Exception(() =>
                category.EnsureCanBeDeleted([]));

            Assert.Null(exception);
        }

        [Fact]
        public void WithLinkedProducts_ThrowsDomainException()
        {
            Category category = Category.Create("İçecekler", Guid.NewGuid());
            Product[] products = [Product.Create("Çay", 10m, "img.png", Guid.NewGuid())];

            Assert.Throws<DomainException>(() =>
                category.EnsureCanBeDeleted(products));
        }
    }
}
