using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Exceptions;

namespace RestaurantBill.Domain.Tests.Entities;

public class CashRegisterTests
{
    public class Create
    {
        [Fact]
        public void WithValidParameters_ReturnsCashRegister()
        {
            CashRegister cashRegister = CashRegister.Create("Ana Kasa", 500m, CashRegisterStatus.Open, restaurantId: 1);

            Assert.Equal("Ana Kasa", cashRegister.Name);
            Assert.Equal(500m, cashRegister.Balance);
            Assert.Equal(CashRegisterStatus.Open, cashRegister.Status);
            Assert.Equal(1, cashRegister.RestaurantId);
        }

        [Fact]
        public void WithZeroOpeningBalance_Succeeds()
        {
            CashRegister cashRegister = CashRegister.Create("Kasa", 0m, CashRegisterStatus.Open, restaurantId: 1);

            Assert.Equal(0m, cashRegister.Balance);
        }

        [Theory]
        [InlineData("")]
        [InlineData("   ")]
        public void WithEmptyName_ThrowsDomainException(string invalidName)
        {
            Assert.Throws<DomainException>(() =>
                CashRegister.Create(invalidName, 100m, CashRegisterStatus.Open, restaurantId: 1));
        }

        [Fact]
        public void WithNegativeOpeningBalance_ThrowsDomainException()
        {
            Assert.Throws<DomainException>(() =>
                CashRegister.Create("Kasa", -1m, CashRegisterStatus.Open, restaurantId: 1));
        }
        
        [Theory]
        [InlineData(0)]
        [InlineData(-1)]
        public void WithInvalidRestaurantId_ThrowsDomainException(int invalidId)
        {
            Assert.Throws<DomainException>(() =>
                CashRegister.Create("Kasa", 100m, CashRegisterStatus.Open, invalidId));
        }
    }

    public class Update
    {
        [Fact]
        public void WithValidParameters_UpdatesFields()
        {
            CashRegister cashRegister = CashRegister.Create("Eski Ad", 100m, CashRegisterStatus.Open, restaurantId: 1);

            cashRegister.Update("Yeni Ad", 250m, CashRegisterStatus.Closed);

            Assert.Equal("Yeni Ad", cashRegister.Name);
            Assert.Equal(250m, cashRegister.Balance);
            Assert.Equal(CashRegisterStatus.Closed, cashRegister.Status);
        }

        [Theory]
        [InlineData("")]
        [InlineData("   ")]
        public void WithEmptyName_ThrowsDomainException(string invalidName)
        {
            CashRegister cashRegister = CashRegister.Create("Kasa", 100m, CashRegisterStatus.Open, restaurantId: 1);

            Assert.Throws<DomainException>(() =>
                cashRegister.Update(invalidName, 100m, CashRegisterStatus.Open));
        }

        [Fact]
        public void WithNegativeBalance_ThrowsDomainException()
        {
            CashRegister cashRegister = CashRegister.Create("Kasa", 100m, CashRegisterStatus.Open, restaurantId: 1);

            Assert.Throws<DomainException>(() =>
                cashRegister.Update("Kasa", -50m, CashRegisterStatus.Open));
        }

        [Fact]
        public void WithZeroBalance_Succeeds()
        {
            CashRegister cashRegister = CashRegister.Create("Kasa", 100m, CashRegisterStatus.Open, restaurantId: 1);

            cashRegister.Update("Kasa", 0m, CashRegisterStatus.Open);

            Assert.Equal(0m, cashRegister.Balance);
        }
    }

    public class EnsureCanBeDeleted
    {
        [Fact]
        public void WithZeroBalance_DoesNotThrow()
        {
            CashRegister cashRegister = CashRegister.Create("Kasa", 0m, CashRegisterStatus.Open, restaurantId: 1);

            var exception = Record.Exception(() => cashRegister.EnsureCanBeDeleted());

            Assert.Null(exception);
        }

        [Fact]
        public void WithPositiveBalance_ThrowsDomainException()
        {
            CashRegister cashRegister = CashRegister.Create("Kasa", 100m, CashRegisterStatus.Open, restaurantId: 1);

            Assert.Throws<DomainException>(() => cashRegister.EnsureCanBeDeleted());
        }
    }

    public class AddTransaction
    {
        [Fact]
        public void InOnOpenRegister_IncreasesBalance()
        {
            CashRegister cashRegister = CashRegister.Create("Kasa", 200m, CashRegisterStatus.Open, restaurantId: 1);

            cashRegister.AddTransaction(CashTransactionType.In, 100m, userId: 1);

            Assert.Equal(300m, cashRegister.Balance);
        }

        [Fact]
        public void OutOnOpenRegister_DecreasesBalance()
        {
            CashRegister cashRegister = CashRegister.Create("Kasa", 200m, CashRegisterStatus.Open, restaurantId: 1);

            cashRegister.AddTransaction(CashTransactionType.Out, 80m, userId: 1);

            Assert.Equal(120m, cashRegister.Balance);
        }

        [Fact]
        public void OutWithExactBalance_Succeeds()
        {
            CashRegister cashRegister = CashRegister.Create("Kasa", 100m, CashRegisterStatus.Open, restaurantId: 1);

            cashRegister.AddTransaction(CashTransactionType.Out, 100m, userId: 1);

            Assert.Equal(0m, cashRegister.Balance);
        }

        [Fact]
        public void OutWithInsufficientBalance_ThrowsDomainException()
        {
            CashRegister cashRegister = CashRegister.Create("Kasa", 50m, CashRegisterStatus.Open, restaurantId: 1);

            Assert.Throws<DomainException>(() =>
                cashRegister.AddTransaction(CashTransactionType.Out, 100m, userId: 1));
        }

        [Fact]
        public void OnClosedRegister_ThrowsDomainException()
        {
            CashRegister cashRegister = CashRegister.Create("Kasa", 200m, CashRegisterStatus.Closed, restaurantId: 1);

            Assert.Throws<DomainException>(() =>
                cashRegister.AddTransaction(CashTransactionType.In, 50m, userId: 1));
        }

        [Fact]
        public void ReturnsTransactionWithCorrectFields()
        {
            CashRegister cashRegister = CashRegister.Create("Kasa", 200m, CashRegisterStatus.Open, restaurantId: 1);

            CashRegister.CashTransaction transaction =
                cashRegister.AddTransaction(CashTransactionType.In, 75m, userId: 42);

            Assert.Equal(CashTransactionType.In, transaction.Type);
            Assert.Equal(75m, transaction.Amount);
            Assert.Equal(42, transaction.UserId);
        }
    }
}
