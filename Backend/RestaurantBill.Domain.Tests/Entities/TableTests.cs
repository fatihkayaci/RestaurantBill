using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Exceptions;

namespace RestaurantBill.Domain.Tests.Entities;

public class TableTests
{
    public class Create
    {
        [Fact]
        public void WithValidParameters_ReturnsTable()
        {
            Guid regionId = Guid.NewGuid();
            Table table = Table.Create("Masa 1", "Pencere kenarı", regionId);

            Assert.Equal("Masa 1", table.Name);
            Assert.Equal("Pencere kenarı", table.Note);
            Assert.Equal(regionId, table.RegionId);
            Assert.Equal(TableStatus.Available, table.Status);
        }

        [Theory]
        [InlineData("")]
        [InlineData("   ")]
        public void WithEmptyName_ThrowsDomainException(string invalidName)
        {
            Assert.Throws<DomainException>(() =>
                Table.Create(invalidName, "not", Guid.NewGuid()));
        }

        [Fact]
        public void WithInvalidRegionId_ThrowsDomainException()
        {
            Assert.Throws<DomainException>(() =>
                Table.Create("Masa 1", "not", Guid.Empty));
        }
    }

    public class Update
    {
        [Fact]
        public void WithValidParameters_UpdatesFields()
        {
            Table table = Table.Create("Eski Ad", "eski not", Guid.NewGuid());

            table.Update("Yeni Ad", "yeni not");

            Assert.Equal("Yeni Ad", table.Name);
            Assert.Equal("yeni not", table.Note);
        }

        [Theory]
        [InlineData("")]
        [InlineData("   ")]
        public void WithEmptyName_ThrowsDomainException(string invalidName)
        {
            Table table = Table.Create("Masa 1", "", Guid.NewGuid());

            Assert.Throws<DomainException>(() => table.Update(invalidName, ""));
        }
    }

    public class Occupy
    {
        [Fact]
        public void WhenAvailable_SetsStatusToOccupied()
        {
            Table table = Table.Create("Masa 1", "", Guid.NewGuid());

            table.Occupy();

            Assert.Equal(TableStatus.Occupied, table.Status);
        }

        [Fact]
        public void WhenAlreadyOccupied_ThrowsDomainException()
        {
            Table table = Table.Create("Masa 1", "", Guid.NewGuid());
            table.Occupy();

            Assert.Throws<DomainException>(() => table.Occupy());
        }

        [Fact]
        public void WhenReserved_ThrowsDomainException()
        {
            Table table = Table.Create("Masa 1", "", Guid.NewGuid());
            table.Reserve();

            Assert.Throws<DomainException>(() => table.Occupy());
        }
    }

    public class Release
    {
        [Fact]
        public void SetsStatusToAvailable()
        {
            Table table = Table.Create("Masa 1", "", Guid.NewGuid());
            table.Occupy();

            table.Release();

            Assert.Equal(TableStatus.Available, table.Status);
        }
    }

    public class Reserve
    {
        [Fact]
        public void SetsStatusToReserved()
        {
            Table table = Table.Create("Masa 1", "", Guid.NewGuid());

            table.Reserve();

            Assert.Equal(TableStatus.Reserved, table.Status);
        }
    }

    public class AssignRegion
    {
        [Fact]
        public void WithValidRegionId_SetsRegionId()
        {
            Table table = Table.Create("Masa 1", "", Guid.NewGuid());
            Guid newRegionId = Guid.NewGuid();

            table.AssignRegion(newRegionId);

            Assert.Equal(newRegionId, table.RegionId);
        }

        [Fact]
        public void WithInvalidRegionId_ThrowsDomainException()
        {
            Table table = Table.Create("Masa 1", "", Guid.NewGuid());

            Assert.Throws<DomainException>(() => table.AssignRegion(Guid.Empty));
        }
    }

    public class EnsureCanBeDeleted
    {
        [Fact]
        public void WithNoActiveOrders_DoesNotThrow()
        {
            Table table = Table.Create("Masa 1", "", Guid.NewGuid());

            var exception = Record.Exception(() =>
                table.EnsureCanBeDeleted([]));

            Assert.Null(exception);
        }

        [Fact]
        public void WithActiveOrders_ThrowsDomainException()
        {
            Table table = Table.Create("Masa 1", "", Guid.NewGuid());
            Order[] orders = [Order.Create(Guid.NewGuid())];

            Assert.Throws<DomainException>(() =>
                table.EnsureCanBeDeleted(orders));
        }
    }
}
