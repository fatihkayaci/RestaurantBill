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
            Table table = Table.Create("Masa 1", "Pencere kenarı", restaurantId: 1);

            Assert.Equal("Masa 1", table.Name);
            Assert.Equal("Pencere kenarı", table.Note);
            Assert.Equal(1, table.RestaurantId);
            Assert.Equal(TableStatus.Available, table.Status);
        }

        [Theory]
        [InlineData("")]
        [InlineData("   ")]
        public void WithEmptyName_ThrowsDomainException(string invalidName)
        {
            Assert.Throws<DomainException>(() =>
                Table.Create(invalidName, "not", restaurantId: 1));
        }

        [Theory]
        [InlineData(0)]
        [InlineData(-1)]
        public void WithInvalidRestaurantId_ThrowsDomainException(int invalidId)
        {
            Assert.Throws<DomainException>(() =>
                Table.Create("Masa 1", "not", invalidId));
        }
    }

    public class Update
    {
        [Fact]
        public void WithValidParameters_UpdatesFields()
        {
            Table table = Table.Create("Eski Ad", "eski not", restaurantId: 1);

            table.Update("Yeni Ad", "yeni not");

            Assert.Equal("Yeni Ad", table.Name);
            Assert.Equal("yeni not", table.Note);
        }

        [Theory]
        [InlineData("")]
        [InlineData("   ")]
        public void WithEmptyName_ThrowsDomainException(string invalidName)
        {
            Table table = Table.Create("Masa 1", "", restaurantId: 1);

            Assert.Throws<DomainException>(() => table.Update(invalidName, ""));
        }
    }

    public class Occupy
    {
        [Fact]
        public void WhenAvailable_SetsStatusToOccupied()
        {
            Table table = Table.Create("Masa 1", "", restaurantId: 1);

            table.Occupy();

            Assert.Equal(TableStatus.Occupied, table.Status);
        }

        [Fact]
        public void WhenAlreadyOccupied_ThrowsDomainException()
        {
            Table table = Table.Create("Masa 1", "", restaurantId: 1);
            table.Occupy();

            Assert.Throws<DomainException>(() => table.Occupy());
        }

        [Fact]
        public void WhenReserved_ThrowsDomainException()
        {
            Table table = Table.Create("Masa 1", "", restaurantId: 1);
            table.Reserve();

            Assert.Throws<DomainException>(() => table.Occupy());
        }
    }

    public class Release
    {
        [Fact]
        public void SetsStatusToAvailable()
        {
            Table table = Table.Create("Masa 1", "", restaurantId: 1);
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
            Table table = Table.Create("Masa 1", "", restaurantId: 1);

            table.Reserve();

            Assert.Equal(TableStatus.Reserved, table.Status);
        }
    }

    public class AssignRegion
    {
        [Fact]
        public void WithValidRegionId_SetsRegionId()
        {
            Table table = Table.Create("Masa 1", "", restaurantId: 1);

            table.AssignRegion(5);

            Assert.Equal(5, table.RegionId);
        }

        [Theory]
        [InlineData(0)]
        [InlineData(-1)]
        public void WithInvalidRegionId_ThrowsDomainException(int invalidRegionId)
        {
            Table table = Table.Create("Masa 1", "", restaurantId: 1);

            Assert.Throws<DomainException>(() => table.AssignRegion(invalidRegionId));
        }
    }

    public class EnsureCanBeDeleted
    {
        [Fact]
        public void WithNoActiveOrders_DoesNotThrow()
        {
            Table table = Table.Create("Masa 1", "", restaurantId: 1);

            var exception = Record.Exception(() =>
                table.EnsureCanBeDeleted([]));

            Assert.Null(exception);
        }

        [Fact]
        public void WithActiveOrders_ThrowsDomainException()
        {
            Table table = Table.Create("Masa 1", "", restaurantId: 1);
            Order[] orders = [Order.Create(tableId: 1)];

            Assert.Throws<DomainException>(() =>
                table.EnsureCanBeDeleted(orders));
        }
    }
}
