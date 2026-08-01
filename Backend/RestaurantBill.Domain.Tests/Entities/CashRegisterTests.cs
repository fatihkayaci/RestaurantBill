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
            Guid branchId = Guid.NewGuid();
            CashRegister cashRegister = CashRegister.Create("Ana Kasa", 500m, branchId);

            Assert.Equal("Ana Kasa", cashRegister.Name);
            Assert.Equal(500m, cashRegister.Balance);
            Assert.Equal(CashRegisterStatus.Open, cashRegister.Status);
            Assert.Equal(branchId, cashRegister.BranchId);
        }

        [Fact]
        public void WithZeroOpeningBalance_Succeeds()
        {
            CashRegister cashRegister = CashRegister.Create("Kasa", 0m, Guid.NewGuid());

            Assert.Equal(0m, cashRegister.Balance);
        }

        [Theory]
        [InlineData("")]
        [InlineData("   ")]
        public void WithEmptyName_ThrowsDomainException(string invalidName)
        {
            Assert.Throws<DomainException>(() =>
                CashRegister.Create(invalidName, 100m, Guid.NewGuid()));
        }

        [Fact]
        public void WithNegativeOpeningBalance_ThrowsDomainException()
        {
            Assert.Throws<DomainException>(() =>
                CashRegister.Create("Kasa", -1m, Guid.NewGuid()));
        }

        [Fact]
        public void WithInvalidBranchId_ThrowsDomainException()
        {
            Assert.Throws<DomainException>(() =>
                CashRegister.Create("Kasa", 100m, Guid.Empty));
        }
    }

    public class Update
    {
        [Fact]
        public void WithValidParameters_UpdatesFields()
        {
            CashRegister cashRegister = CashRegister.Create("Eski Ad", 100m, Guid.NewGuid());

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
            CashRegister cashRegister = CashRegister.Create("Kasa", 100m, Guid.NewGuid());

            Assert.Throws<DomainException>(() =>
                cashRegister.Update(invalidName, 100m, CashRegisterStatus.Open));
        }

        [Fact]
        public void WithNegativeBalance_ThrowsDomainException()
        {
            CashRegister cashRegister = CashRegister.Create("Kasa", 100m, Guid.NewGuid());

            Assert.Throws<DomainException>(() =>
                cashRegister.Update("Kasa", -50m, CashRegisterStatus.Open));
        }

        [Fact]
        public void WithZeroBalance_Succeeds()
        {
            CashRegister cashRegister = CashRegister.Create("Kasa", 100m, Guid.NewGuid());

            cashRegister.Update("Kasa", 0m, CashRegisterStatus.Open);

            Assert.Equal(0m, cashRegister.Balance);
        }
    }

    public class EnsureCanBeDeleted
    {
        [Fact]
        public void WithZeroBalance_DoesNotThrow()
        {
            CashRegister cashRegister = CashRegister.Create("Kasa", 0m, Guid.NewGuid());

            var exception = Record.Exception(() => cashRegister.EnsureCanBeDeleted());

            Assert.Null(exception);
        }

        [Fact]
        public void WithPositiveBalance_ThrowsDomainException()
        {
            CashRegister cashRegister = CashRegister.Create("Kasa", 100m, Guid.NewGuid());

            Assert.Throws<DomainException>(() => cashRegister.EnsureCanBeDeleted());
        }
    }

    public class AddTransaction
    {
        [Fact]
        public void InOnOpenRegister_IncreasesBalance()
        {
            CashRegister cashRegister = CashRegister.Create("Kasa", 200m, Guid.NewGuid());

            cashRegister.AddTransaction(CashTransactionType.In, 100m, Guid.NewGuid());

            Assert.Equal(300m, cashRegister.Balance);
        }

        [Fact]
        public void OutOnOpenRegister_DecreasesBalance()
        {
            CashRegister cashRegister = CashRegister.Create("Kasa", 200m, Guid.NewGuid());

            cashRegister.AddTransaction(CashTransactionType.Out, 80m, Guid.NewGuid());

            Assert.Equal(120m, cashRegister.Balance);
        }

        [Fact]
        public void OutWithExactBalance_Succeeds()
        {
            CashRegister cashRegister = CashRegister.Create("Kasa", 100m, Guid.NewGuid());

            cashRegister.AddTransaction(CashTransactionType.Out, 100m, Guid.NewGuid());

            Assert.Equal(0m, cashRegister.Balance);
        }

        [Fact]
        public void OutWithInsufficientBalance_ThrowsDomainException()
        {
            CashRegister cashRegister = CashRegister.Create("Kasa", 50m, Guid.NewGuid());

            Assert.Throws<DomainException>(() =>
                cashRegister.AddTransaction(CashTransactionType.Out, 100m, Guid.NewGuid()));
        }

        [Fact]
        public void OnClosedRegister_ThrowsDomainException()
        {
            CashRegister cashRegister = CashRegister.Create("Kasa", 200m, Guid.NewGuid());
            cashRegister.Update("Kasa", 200m, CashRegisterStatus.Closed);

            Assert.Throws<DomainException>(() =>
                cashRegister.AddTransaction(CashTransactionType.In, 50m, Guid.NewGuid()));
        }

        [Fact]
        public void ReturnsTransactionWithCorrectFields()
        {
            CashRegister cashRegister = CashRegister.Create("Kasa", 200m, Guid.NewGuid());
            Guid userId = Guid.NewGuid();

            CashTransaction transaction =
                cashRegister.AddTransaction(CashTransactionType.In, 75m, userId);

            Assert.Equal(CashTransactionType.In, transaction.Type);
            Assert.Equal(75m, transaction.Amount);
            Assert.Equal(userId, transaction.UserId);
        }
    }

    public class Transfer
    {
        private static void SetId(CashRegister register, Guid id)
        {
            typeof(BaseEntity).GetProperty(nameof(BaseEntity.Id))!.SetValue(register, id);
        }

        [Fact]
        public void WithValidParameters_MovesBalanceBetweenRegisters()
        {
            CashRegister source = CashRegister.Create("Kasa A", 300m, Guid.NewGuid());
            CashRegister destination = CashRegister.Create("Kasa B", 100m, Guid.NewGuid());
            Guid sourceId = Guid.NewGuid();
            Guid destinationId = Guid.NewGuid();
            SetId(source, sourceId);
            SetId(destination, destinationId);

            var (sourceTransaction, destinationTransaction) = CashRegister.Transfer(source, destination, 120m, Guid.NewGuid());

            Assert.Equal(180m, source.Balance);
            Assert.Equal(220m, destination.Balance);
            Assert.Equal(CashTransactionType.TransferOut, sourceTransaction.Type);
            Assert.Equal(destinationId, sourceTransaction.RelatedCashRegisterId);
            Assert.Equal(CashTransactionType.TransferIn, destinationTransaction.Type);
            Assert.Equal(sourceId, destinationTransaction.RelatedCashRegisterId);
        }

        [Fact]
        public void WithSameRegisterAsSourceAndDestination_ThrowsDomainException()
        {
            CashRegister register = CashRegister.Create("Kasa", 300m, Guid.NewGuid());
            SetId(register, Guid.NewGuid());

            Assert.Throws<DomainException>(() => CashRegister.Transfer(register, register, 50m, Guid.NewGuid()));
        }

        [Fact]
        public void WithInsufficientSourceBalance_ThrowsDomainException()
        {
            CashRegister source = CashRegister.Create("Kasa A", 50m, Guid.NewGuid());
            CashRegister destination = CashRegister.Create("Kasa B", 100m, Guid.NewGuid());
            SetId(source, Guid.NewGuid());
            SetId(destination, Guid.NewGuid());

            Assert.Throws<DomainException>(() => CashRegister.Transfer(source, destination, 100m, Guid.NewGuid()));
        }

        [Fact]
        public void WithClosedDestinationRegister_ThrowsDomainException()
        {
            CashRegister source = CashRegister.Create("Kasa A", 300m, Guid.NewGuid());
            CashRegister destination = CashRegister.Create("Kasa B", 100m, Guid.NewGuid());
            destination.Update("Kasa B", 100m, CashRegisterStatus.Closed);
            SetId(source, Guid.NewGuid());
            SetId(destination, Guid.NewGuid());

            Assert.Throws<DomainException>(() => CashRegister.Transfer(source, destination, 50m, Guid.NewGuid()));
        }
    }
}
