using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Exceptions;

namespace RestaurantBill.Domain.Tests.Entities;

public class RegionTests
{
    public class Create
    {
        [Fact]
        public void WithValidParameters_ReturnsRegion()
        {
            Region region = Region.Create("Teras", restaurantId: 1);

            Assert.Equal("Teras", region.Name);
            Assert.Equal(1, region.RestaurantId);
        }

        [Theory]
        [InlineData("")]
        [InlineData("   ")]
        public void WithEmptyName_ThrowsDomainException(string invalidName)
        {
            Assert.Throws<DomainException>(() =>
                Region.Create(invalidName, restaurantId: 1));
        }

        [Theory]
        [InlineData(0)]
        [InlineData(-1)]
        public void WithInvalidRestaurantId_ThrowsDomainException(int invalidId)
        {
            Assert.Throws<DomainException>(() =>
                Region.Create("Teras", invalidId));
        }
    }

    public class Rename
    {
        [Fact]
        public void WithValidName_UpdatesName()
        {
            Region region = Region.Create("Eski Ad", restaurantId: 1);

            region.Rename("Yeni Ad");

            Assert.Equal("Yeni Ad", region.Name);
        }

        [Theory]
        [InlineData("")]
        [InlineData("   ")]
        public void WithEmptyName_ThrowsDomainException(string invalidName)
        {
            Region region = Region.Create("Teras", restaurantId: 1);

            Assert.Throws<DomainException>(() => region.Rename(invalidName));
        }
    }

    public class EnsureCanBeDeleted
    {
        [Fact]
        public void WithNoLinkedTables_DoesNotThrow()
        {
            Region region = Region.Create("Teras", restaurantId: 1);

            var exception = Record.Exception(() =>
                region.EnsureCanBeDeleted([]));

            Assert.Null(exception);
        }

        [Fact]
        public void WithLinkedTables_ThrowsDomainException()
        {
            Region region = Region.Create("Teras", restaurantId: 1);
            Table table = Table.Create("Masa 1", "", restaurantId: 1);

            Assert.Throws<DomainException>(() =>
                region.EnsureCanBeDeleted([table]));
        }
    }
}
