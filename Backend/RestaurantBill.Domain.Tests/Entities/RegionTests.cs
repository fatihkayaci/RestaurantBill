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
            Guid branchId = Guid.NewGuid();
            Region region = Region.Create("Teras", branchId);

            Assert.Equal("Teras", region.Name);
            Assert.Equal(branchId, region.BranchId);
        }

        [Theory]
        [InlineData("")]
        [InlineData("   ")]
        public void WithEmptyName_ThrowsDomainException(string invalidName)
        {
            Assert.Throws<DomainException>(() =>
                Region.Create(invalidName, Guid.NewGuid()));
        }

        [Fact]
        public void WithInvalidBranchId_ThrowsDomainException()
        {
            Assert.Throws<DomainException>(() =>
                Region.Create("Teras", Guid.Empty));
        }
    }

    public class Rename
    {
        [Fact]
        public void WithValidName_UpdatesName()
        {
            Region region = Region.Create("Eski Ad", Guid.NewGuid());

            region.Rename("Yeni Ad");

            Assert.Equal("Yeni Ad", region.Name);
        }

        [Theory]
        [InlineData("")]
        [InlineData("   ")]
        public void WithEmptyName_ThrowsDomainException(string invalidName)
        {
            Region region = Region.Create("Teras", Guid.NewGuid());

            Assert.Throws<DomainException>(() => region.Rename(invalidName));
        }
    }

    public class EnsureCanBeDeleted
    {
        [Fact]
        public void WithNoLinkedTables_DoesNotThrow()
        {
            Region region = Region.Create("Teras", Guid.NewGuid());

            var exception = Record.Exception(() =>
                region.EnsureCanBeDeleted([]));

            Assert.Null(exception);
        }

        [Fact]
        public void WithLinkedTables_ThrowsDomainException()
        {
            Region region = Region.Create("Teras", Guid.NewGuid());
            Table table = Table.Create("Masa 1", "", Guid.NewGuid());

            Assert.Throws<DomainException>(() =>
                region.EnsureCanBeDeleted([table]));
        }
    }
}
